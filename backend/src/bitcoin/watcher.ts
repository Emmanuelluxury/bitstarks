import axios from 'axios';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const BITCOIN_POOL_ADDRESS = 'tb1q5x90tfa7acp3rtn826q2ndmqexudpgcaygga6j';

export interface BtcTransaction {
  txHash: string;
  amount: number; // in BTC
  confirmations: number;
  fromAddress: string;
  toAddress: string;
  timestamp: number;
}

// Fetch via curl --http1.1, bypassing Node.js HTTP/2 issues with certain hosts
async function curlGet(url: string): Promise<any> {
  const { stdout } = await execFileAsync(
    'curl',
    ['--http1.1', '--max-time', '10', '-s', '--fail', url],
    { timeout: 15_000 }
  );
  return JSON.parse(stdout);
}

export class BitcoinWatcher {
  private network: 'mainnet' | 'testnet';
  private seenTxHashes = new Set<string>();

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.network = network;
  }

  // Primary: mempool.space testnet4 (may be firewalled)
  // Fallback: blockstream.info testnet (testnet3 — only useful for testnet3 transactions)
  private get primaryBase() {
    return this.network === 'testnet'
      ? 'https://mempool.space/testnet4/api'
      : 'https://mempool.space/api';
  }

  private get fallbackBase() {
    return this.network === 'testnet'
      ? 'https://blockstream.info/testnet/api'
      : 'https://blockstream.info/api';
  }

  private async fetchJson(path: string): Promise<any> {
    // Try axios (Node.js native) first
    try {
      const { data } = await axios.get(`${this.primaryBase}${path}`, { timeout: 8000 });
      return data;
    } catch {
      // Primary unreachable — try curl HTTP/1.1 against fallback (blockstream testnet3)
      try {
        return await curlGet(`${this.fallbackBase}${path}`);
      } catch {
        throw new Error(`Both primary (mempool testnet4) and fallback (blockstream testnet3) APIs failed for ${path}`);
      }
    }
  }

  async getConfirmations(txHash: string): Promise<number> {
    const data = await this.fetchJson(`/tx/${txHash}`);
    // mempool.space format: data.status.confirmed / data.status.block_height
    // blockstream format:   data.status.confirmed / data.status.block_height
    if (!data.status?.confirmed) return 0;
    const tip = await this.fetchJson('/blocks/tip/height');
    const tipHeight = typeof tip === 'number' ? tip : parseInt(tip, 10);
    return tipHeight - data.status.block_height + 1;
  }

  async pollNewDeposits(): Promise<BtcTransaction[]> {
    try {
      const rawTxs: any[] = (await this.fetchJson(`/address/${BITCOIN_POOL_ADDRESS}/txs`)) ?? [];
      const txs: BtcTransaction[] = [];

      for (const tx of rawTxs) {
        const txHash: string = tx.txid;
        if (!txHash || this.seenTxHashes.has(txHash)) continue;
        this.seenTxHashes.add(txHash);

        for (const output of tx.vout ?? []) {
          if (output.scriptpubkey_address === BITCOIN_POOL_ADDRESS) {
            txs.push({
              txHash,
              amount: output.value / 1e8,
              confirmations: tx.status?.confirmed ? 1 : 0,
              fromAddress: tx.vin?.[0]?.prevout?.scriptpubkey_address ?? 'unknown',
              toAddress: BITCOIN_POOL_ADDRESS,
              timestamp: tx.status?.block_time ? tx.status.block_time * 1000 : Date.now(),
            });
          }
        }
      }

      return txs;
    } catch {
      return [];
    }
  }
}
