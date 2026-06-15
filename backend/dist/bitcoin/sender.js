"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BtcSender = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecc = __importStar(require("tiny-secp256k1"));
const ecpair_1 = require("ecpair");
const axios_1 = __importDefault(require("axios"));
const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
// Use testnet network parameters (compatible with both testnet3 and testnet4)
const NETWORK = bitcoin.networks.testnet;
// 1 STRK = 10,000 sats  (mirrors minter.ts: 1 sat = 10^14 STRK wei)
const SATS_PER_STRK = 10000;
// Fee in sats for a typical 1-in 2-out p2wpkh tx (~141 vbytes @ ~10 sat/vbyte)
const FEE_SATS = 1500;
// UTXO / broadcast API candidates for testnet4 (tried in order)
const TESTNET4_APIS = [
    'https://mempool.emzy.de/testnet4/api',
    'https://mempool.space/testnet4/api',
    'https://mempool.ninja/testnet4/api',
];
class BtcSender {
    constructor() {
        this.wif = process.env.BRIDGE_BTC_PRIVATE_KEY;
        if (this.wif) {
            console.log('[BtcSender] Ready — hot wallet configured');
        }
        else {
            console.warn('[BtcSender] ⚠️  BRIDGE_BTC_PRIVATE_KEY not set — BTC sending disabled');
        }
    }
    isReady() {
        return !!this.wif && this.wif.length > 10;
    }
    strkToSats(amountStrk) {
        return Math.round(amountStrk * SATS_PER_STRK);
    }
    async apiGet(path) {
        for (const base of TESTNET4_APIS) {
            try {
                const r = await axios_1.default.get(`${base}${path}`, { timeout: 5000 });
                return r.data;
            }
            catch {
                continue;
            }
        }
        throw new Error(`All testnet4 APIs failed for GET ${path}`);
    }
    async apiPost(path, body) {
        for (const base of TESTNET4_APIS) {
            try {
                const r = await axios_1.default.post(`${base}${path}`, body, {
                    headers: { 'Content-Type': 'text/plain' },
                    timeout: 8000,
                });
                return r.data;
            }
            catch {
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
    async sendBtc(toAddress, amountStrk) {
        if (!this.isReady()) {
            throw new Error('BTC hot wallet not configured — set BRIDGE_BTC_PRIVATE_KEY in .env');
        }
        const keyPair = ECPair.fromWIF(this.wif, NETWORK);
        const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey), network: NETWORK });
        const hotWallet = p2wpkh.address;
        const amountSats = this.strkToSats(amountStrk);
        console.log(`[BtcSender] Sending ${amountSats} sats (${amountStrk} STRK) from ${hotWallet} → ${toAddress}`);
        // Fetch UTXOs for the hot wallet
        const utxos = await this.apiGet(`/address/${hotWallet}/utxo`);
        if (!utxos || utxos.length === 0)
            throw new Error('No UTXOs in bridge hot wallet');
        // Sort largest first to minimise inputs
        utxos.sort((a, b) => b.value - a.value);
        const psbt = new bitcoin.Psbt({ network: NETWORK });
        let inputTotal = 0n;
        const needed = BigInt(amountSats + FEE_SATS);
        for (const utxo of utxos) {
            if (inputTotal >= needed)
                break;
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                witnessUtxo: {
                    script: p2wpkh.output,
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
        const txid = await this.apiPost('/tx', txHex);
        console.log(`[BtcSender] ✅ BTC sent: txid ${txid} — ${amountSats} sats → ${toAddress}`);
        return txid.trim();
    }
}
exports.BtcSender = BtcSender;
