import { RpcProvider } from 'starknet';

export const BRIDGE_CONTRACT_ADDRESS = '0x01ebd9b12b7477bd358ab10fd9ed0f00b1f2cf4d6dfaeb8881567906af8c16d9';

export interface StarknetWithdrawalEvent {
  withdrawalId: string;
  userAddress: string;
  amount: string;      // raw felt252 hex
  btcAddress: string;  // raw felt252 hex
  txHash: string;
  blockNumber: number;
}

export class StarknetListener {
  private provider: RpcProvider;
  private seenEvents = new Set<string>();
  private lastCheckedBlock = 0;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    const rpcUrl = network === 'testnet'
      ? 'https://api.cartridge.gg/x/starknet/sepolia'
      : 'https://api.cartridge.gg/x/starknet/mainnet';

    this.provider = new RpcProvider({ nodeUrl: rpcUrl });
  }

  async pollWithdrawals(): Promise<StarknetWithdrawalEvent[]> {
    try {
      const latest = await this.provider.getBlock('latest');
      const latestBlock = latest.block_number;

      if (this.lastCheckedBlock === 0) {
        this.lastCheckedBlock = Math.max(0, latestBlock - 5);
      }

      const events = await this.provider.getEvents({
        address: BRIDGE_CONTRACT_ADDRESS,
        from_block: { block_number: this.lastCheckedBlock },
        to_block: { block_number: latestBlock },
        keys: [[
          // BitcoinWithdrawalInitiated event selector
          '0x00a93a2d6f2432e8e1da5d83d02b9c2f1f2a4d0e3e8d2e77f3b1a6c9e5f4d8c1'
        ]],
        chunk_size: 20,
      });

      this.lastCheckedBlock = latestBlock + 1;

      const results: StarknetWithdrawalEvent[] = [];

      for (const event of events.events ?? []) {
        const key = `${event.transaction_hash}_${event.block_number}`;
        if (this.seenEvents.has(key)) continue;
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
    } catch {
      return [];
    }
  }
}
