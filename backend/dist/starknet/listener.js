"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StarknetListener = exports.BRIDGE_CONTRACT_ADDRESS = void 0;
const starknet_1 = require("starknet");
exports.BRIDGE_CONTRACT_ADDRESS = '0x01ebd9b12b7477bd358ab10fd9ed0f00b1f2cf4d6dfaeb8881567906af8c16d9';
class StarknetListener {
    constructor(network = 'testnet') {
        this.seenEvents = new Set();
        this.lastCheckedBlock = 0;
        const rpcUrl = network === 'testnet'
            ? 'https://api.cartridge.gg/x/starknet/sepolia'
            : 'https://api.cartridge.gg/x/starknet/mainnet';
        this.provider = new starknet_1.RpcProvider({ nodeUrl: rpcUrl });
    }
    async pollWithdrawals() {
        try {
            const latest = await this.provider.getBlock('latest');
            const latestBlock = latest.block_number;
            if (this.lastCheckedBlock === 0) {
                this.lastCheckedBlock = Math.max(0, latestBlock - 5);
            }
            const events = await this.provider.getEvents({
                address: exports.BRIDGE_CONTRACT_ADDRESS,
                from_block: { block_number: this.lastCheckedBlock },
                to_block: { block_number: latestBlock },
                keys: [[
                        // BitcoinWithdrawalInitiated event selector
                        '0x00a93a2d6f2432e8e1da5d83d02b9c2f1f2a4d0e3e8d2e77f3b1a6c9e5f4d8c1'
                    ]],
                chunk_size: 20,
            });
            this.lastCheckedBlock = latestBlock + 1;
            const results = [];
            for (const event of events.events ?? []) {
                const key = `${event.transaction_hash}_${event.block_number}`;
                if (this.seenEvents.has(key))
                    continue;
                this.seenEvents.add(key);
                results.push({
                    withdrawalId: event.keys?.[0] ?? '',
                    userAddress: event.keys?.[1] ?? '',
                    amount: event.data?.[0] ?? '0',
                    btcAddress: event.data?.[1] ?? '',
                    txHash: event.transaction_hash,
                    blockNumber: event.block_number ?? 0,
                });
            }
            return results;
        }
        catch {
            return [];
        }
    }
}
exports.StarknetListener = StarknetListener;
