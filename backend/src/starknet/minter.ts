import { execFile } from 'child_process';
import { promisify } from 'util';
import { RpcProvider } from 'starknet';

const execFileAsync = promisify(execFile);

// Bridge pool contract — holds STRK and releases it to users via release_strk()
// STRK flows: bridge_pool → user  (admin wallet balance is NOT touched)
export const BRIDGE_CONTRACT_ADDRESS = '0x003455ca2b0237c4dfc70091f221a6a374d0e186e32935f36c126536d1271a97';

const SNCAST  = '/home/blackghost/.local/bin/sncast';
const RPC_URL = 'https://starknet-sepolia-rpc.publicnode.com';
const ACCOUNT = 'myaccount';

// Testnet exchange rate: 1 satoshi = 10^14 STRK wei  (0.0001 STRK per sat → 10,000 STRK per BTC)
// 0.005 BTC = 500,000 sats → 50 STRK
const STRK_WEI_PER_SAT = BigInt('100000000000000');

export class StarknetMinter {
  private provider: RpcProvider;
  private ready = false;

  constructor(_network: 'mainnet' | 'testnet') {
    this.provider = new RpcProvider({ nodeUrl: RPC_URL });

    const adminAddress = process.env.ADMIN_STARKNET_ADDRESS;
    const privateKey   = process.env.ADMIN_PRIVATE_KEY;

    const isPlaceholder = (v: string) => !v || v.includes('YOUR_') || v.length < 10;

    if (adminAddress && privateKey && !isPlaceholder(adminAddress) && !isPlaceholder(privateKey)) {
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

  /**
   * Called when a BTC deposit is confirmed.
   * Calls release_strk() on the bridge pool contract so STRK flows:
   *   bridge_pool → user_starknet_address
   * The admin wallet signs the tx but its own STRK balance is NOT spent.
   */
  async mintRawBtc(to: string, amountBtc: number, depositId: string): Promise<string> {
    if (!this.ready) {
      throw new Error('Minter not initialised — set ADMIN_STARKNET_ADDRESS and ADMIN_PRIVATE_KEY in .env');
    }

    const amountSatoshis = BigInt(Math.round(amountBtc * 1e8));
    const strkWei  = amountSatoshis * STRK_WEI_PER_SAT;
    const strkLow  = (strkWei & BigInt('0xffffffffffffffffffffffffffffffff')).toString();
    const strkHigh = (strkWei >> BigInt(128)).toString();
    const strkAmount = Number(strkWei) / 1e18;

    console.log(`[Minter] deposit: ${depositId}`);
    console.log(`[Minter] Releasing ${strkAmount.toFixed(4)} STRK from pool → ${to}`);
    console.log(`[Minter] (${amountSatoshis} sats × rate = ${strkWei} wei)`);

    // felt252 max is ~2^251; BTC tx hashes are 32 bytes (256-bit) which can overflow.
    // Truncate to 31 bytes (62 hex chars) so it fits safely in felt252.
    const txHashFelt = '0x' + depositId.replace(/^0x/, '').slice(0, 62).padStart(2, '0');

    // Call bridge_pool.release_strk(to, amount_u256_low, amount_u256_high, btc_tx_hash_felt)
    const args = [
      '-a', ACCOUNT,
      'invoke',
      '--url', RPC_URL,
      '--contract-address', BRIDGE_CONTRACT_ADDRESS,
      '--function', 'release_strk',
      '--calldata', to, strkLow, strkHigh, txHashFelt,
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
      throw new Error(`sncast release_strk failed — stdout: ${stdout}\nstderr: ${stderr}`);
    }
    const txHash = match[1];
    console.log(`[Minter] ✅ release_strk submitted: ${txHash}`);

    await this.provider.waitForTransaction(txHash);
    console.log(`[Minter] ✅ STRK released from pool: ${txHash} — ${strkAmount.toFixed(4)} STRK → ${to}`);

    return txHash;
  }
}
