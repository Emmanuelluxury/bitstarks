"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitcoinWatcher = exports.BITCOIN_POOL_ADDRESS = void 0;
const axios_1 = __importDefault(require("axios"));
exports.BITCOIN_POOL_ADDRESS = 'tb1q5x90tfa7acp3rtn826q2ndmqexudpgcaygga6j';
class BitcoinWatcher {
    constructor(network = 'testnet') {
        this.seenTxHashes = new Set();
        this.network = network;
    }
    // mempool.space supports testnet4; blockstream only supports testnet3
    get apiBase() {
        return this.network === 'testnet'
            ? 'https://mempool.space/testnet4/api'
            : 'https://mempool.space/api';
    }
    async getConfirmations(txHash) {
        const { data } = await axios_1.default.get(`${this.apiBase}/tx/${txHash}`, { timeout: 8000 });
        if (!data.status?.confirmed)
            return 0;
        const tipResp = await axios_1.default.get(`${this.apiBase}/blocks/tip/height`, { timeout: 5000 });
        return tipResp.data - data.status.block_height + 1;
    }
    async pollNewDeposits() {
        try {
            const { data } = await axios_1.default.get(`${this.apiBase}/address/${exports.BITCOIN_POOL_ADDRESS}/txs`, { timeout: 8000 });
            const rawTxs = data ?? [];
            const txs = [];
            for (const tx of rawTxs) {
                const txHash = tx.txid;
                if (!txHash || this.seenTxHashes.has(txHash))
                    continue;
                this.seenTxHashes.add(txHash);
                for (const output of tx.vout ?? []) {
                    if (output.scriptpubkey_address === exports.BITCOIN_POOL_ADDRESS) {
                        txs.push({
                            txHash,
                            amount: output.value / 1e8,
                            confirmations: tx.status?.confirmed ? 1 : 0,
                            fromAddress: tx.vin?.[0]?.prevout?.scriptpubkey_address ?? 'unknown',
                            toAddress: exports.BITCOIN_POOL_ADDRESS,
                            timestamp: tx.status?.block_time ? tx.status.block_time * 1000 : Date.now(),
                        });
                    }
                }
            }
            return txs;
        }
        catch {
            return [];
        }
    }
}
exports.BitcoinWatcher = BitcoinWatcher;
