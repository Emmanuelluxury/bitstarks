import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import axios from 'axios';
import https from 'https';

// Force IPv4 — mempool APIs time out when Node.js tries IPv6 first
const AGENT = new https.Agent({ family: 4 });

const ECPair = ECPairFactory(ecc);

// Use testnet network parameters (compatible with both testnet3 and testnet4)
const NETWORK = bitcoin.networks.testnet;

// 1 STRK = 10,000 sats  (mirrors minter.ts: 1 sat = 10^14 STRK wei)
const SATS_PER_STRK = 10_000;

// Fee in sats for a typical 1-in 2-out p2wpkh tx (~141 vbytes @ ~10 sat/vbyte)
const FEE_SATS = 1_500;

// UTXO / broadcast API candidates for testnet4 (tried in order)
const TESTNET4_APIS = [
  'https://mempool.emzy.de/testnet4/api',
  'https://mempool.space/testnet4/api',
  'https://mempool.ninja/testnet4/api',
];

export class BtcSender {
  private wif: string | undefined;

  constructor() {
    this.wif = process.env.BRIDGE_BTC_PRIVATE_KEY;
    if (this.wif) {
      console.log('[BtcSender] Ready — hot wallet configured');
    } else {
      console.warn('[BtcSender] ⚠️  BRIDGE_BTC_PRIVATE_KEY not set — BTC sending disabled');
    }
  }

  isReady(): boolean {
    return !!this.wif && this.wif.length > 10;
  }

  strkToSats(amountStrk: number): number {
    return Math.round(amountStrk * SATS_PER_STRK);
  }

  private async apiGet(path: string): Promise<any> {
    for (const base of TESTNET4_APIS) {
      try {
        const r = await axios.get(`${base}${path}`, { timeout: 5_000, httpsAgent: AGENT });
        return r.data;
      } catch {
        continue;
      }
    }
    throw new Error(`All testnet4 APIs failed for GET ${path}`);
  }

  private async apiPost(path: string, body: string): Promise<string> {
    for (const base of TESTNET4_APIS) {
      try {
        const r = await axios.post(`${base}${path}`, body, {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 8_000,
          httpsAgent: AGENT,
        });
        return r.data as string;
      } catch {
        continue;
      }
    }
    throw new Error(`All testnet4 APIs failed for POST ${path}`);
  }

  /**
   * Send BTC from the bridge hot wallet to a user's Bitcoin address.
   * amountStrk is the STRK amount the user deposited; converted to sats at 1 STRK = 10,000 sats.
   * Returns the on-chain Bitcoin txid.
   */
  async sendBtc(toAddress: string, amountStrk: number): Promise<string> {
    if (!this.isReady()) {
      throw new Error('BTC hot wallet not configured — set BRIDGE_BTC_PRIVATE_KEY in .env');
    }

    const keyPair  = ECPair.fromWIF(this.wif!, NETWORK);
    const p2wpkh   = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey), network: NETWORK });
    const hotWallet = p2wpkh.address!;

    const amountSats = this.strkToSats(amountStrk);
    console.log(`[BtcSender] Sending ${amountSats} sats (${amountStrk} STRK) from ${hotWallet} → ${toAddress}`);

    // Fetch UTXOs for the hot wallet
    const utxos: Array<{ txid: string; vout: number; value: number }> = await this.apiGet(`/address/${hotWallet}/utxo`);
    if (!utxos || utxos.length === 0) throw new Error('No UTXOs in bridge hot wallet');

    // Sort largest first to minimise inputs
    utxos.sort((a, b) => b.value - a.value);

    const psbt = new bitcoin.Psbt({ network: NETWORK });

    let inputTotal = 0n;
    const needed = BigInt(amountSats + FEE_SATS);
    for (const utxo of utxos) {
      if (inputTotal >= needed) break;
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: p2wpkh.output!,
          value: BigInt(utxo.value),
        },
      });
      inputTotal += BigInt(utxo.value);
    }

    if (inputTotal < needed) {
      throw new Error(`Insufficient hot wallet balance: have ${inputTotal} sats, need ${needed} sats`);
    }

    // Output to recipient
    psbt.addOutput({ address: toAddress, value: BigInt(amountSats) });

    // Change back to hot wallet (skip if dust)
    const change = inputTotal - BigInt(amountSats) - BigInt(FEE_SATS);
    if (change > 546n) {
      psbt.addOutput({ address: hotWallet, value: change });
    }

    // Sign and finalise
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();
    const txid  = await this.apiPost('/tx', txHex);

    console.log(`[BtcSender] ✅ BTC sent: txid ${txid} — ${amountSats} sats → ${toAddress}`);
    return txid.trim();
  }
}
