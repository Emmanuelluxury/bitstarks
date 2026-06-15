import { Account, RpcProvider, uint256 } from 'starknet';

// Bridge pool contract — holds STRK and releases it to users via release_strk()
export const BRIDGE_CONTRACT_ADDRESS = '0x003455ca2b0237c4dfc70091f221a6a374d0e186e32935f36c126536d1271a97';

const RPC_URL = 'https://starknet-sepolia-rpc.publicnode.com';

// 1 satoshi = 10^14 STRK wei (10,000 STRK per BTC)
const STRK_WEI_PER_SAT = BigInt('100000000000000');

export class StarknetMinter {
  private provider: RpcProvider;
  private account: Account | null = null;
  private ready = false;

  constructor(_network: 'mainnet' | 'testnet') {
    this.provider = new RpcProvider({ nodeUrl: RPC_URL });

    const adminAddress = process.env.ADMIN_STARKNET_ADDRESS;
    const privateKey   = process.env.ADMIN_PRIVATE_KEY;

    const isPlaceholder = (v: string) => !v || v.includes('YOUR_') || v.length < 10;

    if (adminAddress && privateKey && !isPlaceholder(adminAddress) && !isPlaceholder(privateKey)) {
      this.account = new Account(this.provider, adminAddress, privateKey);
      this.ready = true;
      console.log('[Minter] Ready — admin address:', adminAddress);
      console.log('[Minter] Bridge pool:', BRIDGE_CONTRACT_ADDRESS);
    } else {
      console.warn('[Minter] ⚠️  Real admin keys not set in .env — minting is disabled');
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async mintRawBtc(to: string, amountBtc: number, depositId: string): Promise<string> {
    if (!this.ready || !this.account) {
      throw new Error('Minter not initialised — set ADMIN_STARKNET_ADDRESS and ADMIN_PRIVATE_KEY in .env');
    }

    const amountSatoshis = BigInt(Math.round(amountBtc * 1e8));
    const strkWei = amountSatoshis * STRK_WEI_PER_SAT;
    const strkAmount = Number(strkWei) / 1e18;

    // u256 split into low/high 128-bit chunks for Cairo calldata
    const { low: strkLow, high: strkHigh } = uint256.bnToUint256(strkWei);

    // felt252 max is ~2^251; truncate 32-byte BTC hash to 31 bytes so it fits
    const txHashFelt = '0x' + depositId.replace(/^0x/, '').slice(0, 62).padStart(2, '0');

    console.log(`[Minter] deposit: ${depositId}`);
    console.log(`[Minter] Releasing ${strkAmount.toFixed(4)} STRK from pool → ${to}`);
    console.log(`[Minter] (${amountSatoshis} sats × rate = ${strkWei} wei)`);

    const { transaction_hash } = await this.account.execute({
      contractAddress: BRIDGE_CONTRACT_ADDRESS,
      entrypoint: 'release_strk',
      calldata: [to, strkLow, strkHigh, txHashFelt],
    });

    console.log(`[Minter] ✅ release_strk submitted: ${transaction_hash}`);

    await this.provider.waitForTransaction(transaction_hash);
    console.log(`[Minter] ✅ STRK released from pool: ${transaction_hash} — ${strkAmount.toFixed(4)} STRK → ${to}`);

    return transaction_hash;
  }
}
