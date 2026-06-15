import { Account, RpcProvider, uint256 } from 'starknet';

export const BRIDGE_CONTRACT_ADDRESS = '0x003455ca2b0237c4dfc70091f221a6a374d0e186e32935f36c126536d1271a97';

// Tried in order — first one that responds to getNonce wins
const RPC_URLS = [
  'https://free-rpc.nethermind.io/sepolia-juno/',
  'https://starknet-sepolia.public.blastapi.io',
  'https://starknet-sepolia-rpc.publicnode.com',
];

// 1 satoshi = 10^14 STRK wei  (10,000 STRK per BTC)
const STRK_WEI_PER_SAT = BigInt('100000000000000');

export class StarknetMinter {
  private adminAddress: string = '';
  private privateKey: string = '';
  private ready = false;

  constructor(_network: 'mainnet' | 'testnet') {
    const adminAddress = process.env.ADMIN_STARKNET_ADDRESS ?? '';
    const privateKey   = process.env.ADMIN_PRIVATE_KEY ?? '';

    const isPlaceholder = (v: string) => !v || v.includes('YOUR_') || v.length < 10;

    if (adminAddress && privateKey && !isPlaceholder(adminAddress) && !isPlaceholder(privateKey)) {
      this.adminAddress = adminAddress;
      this.privateKey   = privateKey;
      this.ready = true;
      console.log('[Minter] Ready — admin address:', adminAddress);
      console.log('[Minter] Bridge pool:', BRIDGE_CONTRACT_ADDRESS);
    } else {
      console.warn('[Minter] ⚠️  Real admin keys not set in .env — minting is disabled');
    }
  }

  isReady(): boolean { return this.ready; }

  async mintRawBtc(to: string, amountBtc: number, depositId: string): Promise<string> {
    if (!this.ready) {
      throw new Error('Minter not initialised — set ADMIN_STARKNET_ADDRESS and ADMIN_PRIVATE_KEY in .env');
    }

    const amountSatoshis = BigInt(Math.round(amountBtc * 1e8));
    const strkWei  = amountSatoshis * STRK_WEI_PER_SAT;
    const strkAmount = Number(strkWei) / 1e18;

    // u256 → low/high 128-bit chunks for Cairo calldata
    const { low: strkLow, high: strkHigh } = uint256.bnToUint256(strkWei);

    // felt252 max ~2^251 — truncate 32-byte BTC txid to 31 bytes
    const txHashFelt = '0x' + depositId.replace(/^0x/, '').slice(0, 62).padStart(2, '0');

    console.log(`[Minter] deposit: ${depositId}`);
    console.log(`[Minter] Releasing ${strkAmount.toFixed(4)} STRK from pool → ${to}`);
    console.log(`[Minter] (${amountSatoshis} sats × rate = ${strkWei} wei)`);

    // Try each RPC in order — use 'latest' for nonce to avoid providers that reject 'pending'
    let lastErr: Error = new Error('No RPC configured');

    for (const rpcUrl of RPC_URLS) {
      try {
        const provider = new RpcProvider({ nodeUrl: rpcUrl });
        const account  = new Account(provider, this.adminAddress, this.privateKey);

        const nonce = await provider.getNonceForAddress(this.adminAddress, 'latest');
        console.log(`[Minter] Using RPC: ${rpcUrl}  nonce: ${nonce}`);

        // Pass cairoVersion '1' → skips starknet_getClassAt(pending)
        // Pass nonce explicitly  → skips starknet_getNonce(pending)
        // Pass maxFee explicitly → skips starknet_estimateFee(pending)
        // This avoids ALL "unknown block tag 'pending'" errors from the RPC
        const accountV1 = new Account(provider, this.adminAddress, this.privateKey, '1');
        const { transaction_hash } = await accountV1.execute(
          {
            contractAddress: BRIDGE_CONTRACT_ADDRESS,
            entrypoint: 'release_strk',
            calldata: [to, strkLow, strkHigh, txHashFelt],
          },
          { nonce, maxFee: '2000000000000000' }, // 0.002 ETH — no estimation needed
        );

        console.log(`[Minter] ✅ release_strk submitted: ${transaction_hash}`);
        await provider.waitForTransaction(transaction_hash);
        console.log(`[Minter] ✅ STRK released: ${transaction_hash} — ${strkAmount.toFixed(4)} STRK → ${to}`);

        return transaction_hash;
      } catch (err: any) {
        lastErr = err;
        console.warn(`[Minter] RPC ${rpcUrl} failed: ${err.message}`);
      }
    }

    throw new Error(`All Starknet RPCs failed. Last error: ${lastErr.message}`);
  }
}
