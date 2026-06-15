"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StarknetMinter = exports.BRIDGE_CONTRACT_ADDRESS = void 0;
const starknet_1 = require("starknet");
exports.BRIDGE_CONTRACT_ADDRESS = '0x003455ca2b0237c4dfc70091f221a6a374d0e186e32935f36c126536d1271a97';
const RPC_URLS = [
    'https://free-rpc.nethermind.io/sepolia-juno/',
    'https://starknet-sepolia.public.blastapi.io',
    'https://starknet-sepolia-rpc.publicnode.com',
];
// 1 satoshi = 10^14 STRK wei  (10,000 STRK per BTC)
const STRK_WEI_PER_SAT = BigInt('100000000000000');
// Resource bounds for V3 tx — generous testnet limits, matches what sncast used
const RESOURCE_BOUNDS = {
    l1_gas: {
        max_amount: starknet_1.num.toHex(50000),
        max_price_per_unit: starknet_1.num.toHex(2000000000000000n), // 2e15 fri/gas
    },
    l2_gas: {
        max_amount: starknet_1.num.toHex(5000000),
        max_price_per_unit: starknet_1.num.toHex(100000000000n), // 1e11 fri/gas
    },
};
class StarknetMinter {
    constructor(_network) {
        this.adminAddress = '';
        this.privateKey = '';
        this.ready = false;
        const adminAddress = process.env.ADMIN_STARKNET_ADDRESS ?? '';
        const privateKey = process.env.ADMIN_PRIVATE_KEY ?? '';
        const isPlaceholder = (v) => !v || v.includes('YOUR_') || v.length < 10;
        if (adminAddress && privateKey && !isPlaceholder(adminAddress) && !isPlaceholder(privateKey)) {
            this.adminAddress = adminAddress;
            this.privateKey = privateKey;
            this.ready = true;
            console.log('[Minter] Ready — admin address:', adminAddress);
            console.log('[Minter] Bridge pool:', exports.BRIDGE_CONTRACT_ADDRESS);
        }
        else {
            console.warn('[Minter] ⚠️  Real admin keys not set in .env — minting is disabled');
        }
    }
    isReady() { return this.ready; }
    async mintRawBtc(to, amountBtc, depositId) {
        if (!this.ready) {
            throw new Error('Minter not initialised — set ADMIN_STARKNET_ADDRESS and ADMIN_PRIVATE_KEY in .env');
        }
        const amountSatoshis = BigInt(Math.round(amountBtc * 1e8));
        const strkWei = amountSatoshis * STRK_WEI_PER_SAT;
        const strkAmount = Number(strkWei) / 1e18;
        const { low: strkLow, high: strkHigh } = starknet_1.uint256.bnToUint256(strkWei);
        // felt252 max ~2^251 — truncate 32-byte BTC txid to 31 bytes
        const txHashFelt = '0x' + depositId.replace(/^0x/, '').slice(0, 62).padStart(2, '0');
        console.log(`[Minter] deposit: ${depositId}`);
        console.log(`[Minter] Releasing ${strkAmount.toFixed(4)} STRK from pool → ${to}`);
        let lastErr = new Error('No RPC configured');
        for (const rpcUrl of RPC_URLS) {
            try {
                // blockIdentifier:'latest' makes ALL internal calls (getNonce, getClassAt, estimateFee)
                // use 'latest' instead of 'pending' — fixes "unknown block tag 'pending'" errors
                const provider = new starknet_1.RpcProvider({ nodeUrl: rpcUrl, blockIdentifier: 'latest' });
                // Fetch nonce explicitly with 'latest' (belt-and-suspenders)
                const nonce = await provider.getNonceForAddress(this.adminAddress, 'latest');
                console.log(`[Minter] Using RPC: ${rpcUrl}  nonce: ${nonce}`);
                // cairoVersion '1' → skip starknet_getClassAt call
                // resourceBounds   → V3 tx with STRK fees, skip starknet_estimateFee call
                // nonce explicit   → skip starknet_getNonce call
                // Result: zero 'pending' block calls
                const account = new starknet_1.Account(provider, this.adminAddress, this.privateKey, '1');
                const { transaction_hash } = await account.execute({
                    contractAddress: exports.BRIDGE_CONTRACT_ADDRESS,
                    entrypoint: 'release_strk',
                    calldata: [to, strkLow, strkHigh, txHashFelt],
                }, { nonce, resourceBounds: RESOURCE_BOUNDS });
                console.log(`[Minter] ✅ release_strk submitted: ${transaction_hash}`);
                await provider.waitForTransaction(transaction_hash);
                console.log(`[Minter] ✅ STRK released: ${transaction_hash} — ${strkAmount.toFixed(4)} STRK → ${to}`);
                return transaction_hash;
            }
            catch (err) {
                lastErr = err;
                console.warn(`[Minter] RPC ${rpcUrl} failed: ${err.message}`);
            }
        }
        throw new Error(`All Starknet RPCs failed. Last error: ${lastErr.message}`);
    }
}
exports.StarknetMinter = StarknetMinter;
