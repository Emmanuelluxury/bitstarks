"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StarknetMinter = exports.BRIDGE_CONTRACT_ADDRESS = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const starknet_1 = require("starknet");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
exports.BRIDGE_CONTRACT_ADDRESS = '0x01ebd9b12b7477bd358ab10fd9ed0f00b1f2cf4d6dfaeb8881567906af8c16d9';
// STRK ERC20 on Starknet Sepolia (18 decimals)
const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const SNCAST = '/home/blackghost/.local/bin/sncast';
const RPC_URL = 'https://starknet-sepolia-rpc.publicnode.com';
const ACCOUNT = 'myaccount';
// Testnet exchange rate: 1 satoshi = 100,000 STRK wei (= 0.0001 STRK per sat = 10,000 STRK per BTC)
const STRK_WEI_PER_SAT = BigInt('100000000000000'); // 10^14 STRK wei per satoshi
class StarknetMinter {
    constructor(_network) {
        this.ready = false;
        this.provider = new starknet_1.RpcProvider({ nodeUrl: RPC_URL });
        const adminAddress = process.env.ADMIN_STARKNET_ADDRESS;
        const privateKey = process.env.ADMIN_PRIVATE_KEY;
        const isPlaceholder = (v) => !v || v.includes('YOUR_') || v.length < 10;
        if (adminAddress && privateKey && !isPlaceholder(adminAddress) && !isPlaceholder(privateKey)) {
            this.ready = true;
            console.log('[Minter] Ready — admin address:', adminAddress);
        }
        else {
            console.warn('[Minter] ⚠️  Real admin keys not set in .env — minting is disabled');
        }
    }
    isReady() {
        return this.ready;
    }
    /**
     * Called when a BTC deposit is confirmed.
     * Transfers STRK from the admin wallet to the recipient's Starknet address.
     *
     * Exchange rate (testnet): 1 sat = 0.0001 STRK  →  0.005 BTC ≈ 50 STRK
     */
    async mintRawBtc(to, amountBtc, depositId) {
        if (!this.ready) {
            throw new Error('Minter not initialised — set ADMIN_STARKNET_ADDRESS and ADMIN_PRIVATE_KEY in .env');
        }
        const amountSatoshis = BigInt(Math.round(amountBtc * 1e8));
        console.log(`[Minter] deposit: ${depositId}`);
        // Calculate STRK amount in wei (18 decimals)
        const strkWei = amountSatoshis * STRK_WEI_PER_SAT;
        // u256 serialization: low, high
        const strkLow = (strkWei & BigInt('0xffffffffffffffffffffffffffffffff')).toString();
        const strkHigh = (strkWei >> BigInt(128)).toString();
        const strkAmount = Number(strkWei) / 1e18;
        console.log(`[Minter] Sending ${strkAmount.toFixed(4)} STRK → ${to}`);
        console.log(`[Minter] (${amountSatoshis} sats × rate = ${strkWei} wei)`);
        const args = [
            '-a', ACCOUNT,
            'invoke',
            '--url', RPC_URL,
            '--contract-address', STRK_TOKEN,
            '--function', 'transfer',
            '--calldata', to, strkLow, strkHigh,
            '--l1-gas', '20000',
            '--l1-gas-price', '2000000000000000',
            '--l1-data-gas', '20000',
            '--l1-data-gas-price', '20000000000000',
            '--l2-gas', '5000000',
            '--l2-gas-price', '100000000000',
        ];
        const { stdout, stderr } = await execFileAsync(SNCAST, args, { timeout: 60000 });
        const match = stdout.match(/Transaction Hash:\s*(0x[0-9a-fA-F]+)/);
        if (!match) {
            throw new Error(`sncast transfer failed — stdout: ${stdout}\nstderr: ${stderr}`);
        }
        const txHash = match[1];
        console.log(`[Minter] ✅ STRK transfer submitted: ${txHash}`);
        await this.provider.waitForTransaction(txHash);
        console.log(`[Minter] ✅ STRK transfer confirmed: ${txHash} — ${strkAmount.toFixed(4)} STRK → ${to}`);
        return txHash;
    }
}
exports.StarknetMinter = StarknetMinter;
