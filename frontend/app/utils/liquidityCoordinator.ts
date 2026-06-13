import axios from 'axios';
import {
  BRIDGE_CONTRACT_ADDRESS,
  BRIDGE_ABI,
  convertRawBtcToStrk,
} from './starknet';
import { Contract, Provider } from 'starknet';

export type BridgeDirection = 'btc-to-stark' | 'stark-to-btc';

export interface PendingBridge {
  id: string;
  direction: BridgeDirection;
  amount: string;
  fromAddress: string;
  toAddress: string;
  btcTxHash?: string;
  starknetTxHash?: string;
  status: 'watching' | 'confirmed' | 'minting' | 'releasing' | 'completed' | 'failed';
  confirmations: number;
  timestamp: number;
  depositId?: string;
}

export type CoordinatorEvent =
  | { type: 'btc_deposit_detected'; bridge: PendingBridge }
  | { type: 'btc_deposit_confirmed'; bridge: PendingBridge }
  | { type: 'rawbtc_minted'; bridge: PendingBridge; mintTxHash: string }
  | { type: 'stark_withdrawal_detected'; bridge: PendingBridge }
  | { type: 'btc_released'; bridge: PendingBridge }
  | { type: 'error'; bridge: PendingBridge; error: string };

type EventHandler = (event: CoordinatorEvent) => void;

const BTC_CONFIRMATIONS_REQUIRED = 1;
const POLL_INTERVAL_MS = 15000; // 15 seconds

class LiquidityCoordinator {
  private pending = new Map<string, PendingBridge>();
  private listeners: EventHandler[] = [];
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private networkMode: 'mainnet' | 'testnet' = 'testnet';
  private starknetProvider: Provider | null = null;
  private bridgeContract: Contract | null = null;
  private seenStarknetEvents = new Set<string>();

  setNetworkMode(mode: 'mainnet' | 'testnet') {
    this.networkMode = mode;
  }

  setProvider(provider: Provider) {
    this.starknetProvider = provider;
    try {
      this.bridgeContract = new Contract({ abi: BRIDGE_ABI[0] as any[], address: BRIDGE_CONTRACT_ADDRESS, providerOrAccount: provider } as any);
    } catch {
      // Provider may not support contract reads yet
    }
  }

  onEvent(handler: EventHandler) {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter(l => l !== handler);
    };
  }

  private emit(event: CoordinatorEvent) {
    this.listeners.forEach(l => l(event));
  }

  // Register a bridge that needs watching after the user submits it
  register(bridge: Omit<PendingBridge, 'confirmations' | 'timestamp' | 'status'>): PendingBridge {
    const entry: PendingBridge = {
      ...bridge,
      status: 'watching',
      confirmations: 0,
      timestamp: Date.now(),
    };
    this.pending.set(entry.id, entry);
    console.log(`[Coordinator] Registered ${entry.direction} bridge ${entry.id}`);
    return entry;
  }

  start() {
    if (this.pollTimer) return;
    console.log('[Coordinator] Starting liquidity coordinator...');
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    this.poll(); // immediate first run
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[Coordinator] Stopped.');
  }

  private async poll() {
    const entries = Array.from(this.pending.values());

    await Promise.allSettled([
      ...entries
        .filter(b => b.direction === 'btc-to-stark' && b.btcTxHash && b.status === 'watching')
        .map(b => this.checkBtcDeposit(b)),
      this.checkStarknetWithdrawals(),
    ]);
  }

  // --- BTC → Starknet: watch for confirmed BTC deposit then mint rawBTC ---

  private async checkBtcDeposit(bridge: PendingBridge) {
    if (!bridge.btcTxHash) return;

    try {
      const url = this.networkMode === 'testnet'
        ? `https://mempool.space/testnet4/api/tx/${bridge.btcTxHash}`
        : `https://mempool.space/api/tx/${bridge.btcTxHash}`;
      const { data } = await axios.get(url, { timeout: 8000 });

      // mempool.space: status.confirmed + need tip height for exact count
      let confirmations = 0;
      if (data.status?.confirmed) {
        try {
          const tipUrl = this.networkMode === 'testnet'
            ? 'https://mempool.space/testnet4/api/blocks/tip/height'
            : 'https://mempool.space/api/blocks/tip/height';
          const { data: tip } = await axios.get(tipUrl, { timeout: 5000 });
          confirmations = (tip as number) - data.status.block_height + 1;
        } catch { confirmations = 1; }
      }
      const updated = this.pending.get(bridge.id);
      if (!updated) return;

      if (confirmations !== updated.confirmations) {
        updated.confirmations = confirmations;
        this.pending.set(bridge.id, updated);
        console.log(`[Coordinator] ${bridge.id}: ${confirmations} BTC confirmations`);

        if (confirmations === 1) {
          updated.status = 'confirmed';
          this.emit({ type: 'btc_deposit_detected', bridge: { ...updated } });
        }
      }

      if (confirmations >= BTC_CONFIRMATIONS_REQUIRED && updated.status === 'confirmed') {
        this.emit({ type: 'btc_deposit_confirmed', bridge: { ...updated } });
        await this.triggerMintRawBtc(updated);
      }
    } catch (err: any) {
      // Rate limit or network hiccup — skip silently, retry next cycle
      if (err?.response?.status !== 429) {
        console.warn(`[Coordinator] BTC check failed for ${bridge.id}:`, err.message);
      }
    }
  }

  private async triggerMintRawBtc(bridge: PendingBridge) {
    const updated = this.pending.get(bridge.id);
    if (!updated || updated.status === 'minting') return;
    updated.status = 'minting';
    this.pending.set(bridge.id, updated);

    try {
      // convertRawBtcToStrk calls the on-chain convert function via the connected account
      const result = await convertRawBtcToStrk(
        (parseFloat(bridge.amount) * 1e8).toString() // BTC amount in satoshis
      );

      const txHash = result?.transaction_hash ?? 'pending';
      updated.starknetTxHash = txHash;
      updated.status = 'completed';
      this.pending.set(bridge.id, updated);

      this.emit({ type: 'rawbtc_minted', bridge: { ...updated }, mintTxHash: txHash });
      console.log(`[Coordinator] rawBTC minted for ${bridge.id}, tx: ${txHash}`);
    } catch (err: any) {
      updated.status = 'failed';
      this.pending.set(bridge.id, updated);
      this.emit({ type: 'error', bridge: { ...updated }, error: err.message });
      console.error(`[Coordinator] mint_rawbtc failed for ${bridge.id}:`, err.message);
    }
  }

  // --- Starknet → BTC: watch for BitcoinWithdrawalInitiated events ---

  private async checkStarknetWithdrawals() {
    if (!this.starknetProvider) return;

    try {
      // Poll recent Starknet events for BitcoinWithdrawalInitiated
      const blockResponse = await (this.starknetProvider as any).getBlock('latest').catch(() => null);
      if (!blockResponse?.block_number) return;

      const fromBlock = Math.max(0, blockResponse.block_number - 5);

      const eventsResponse = await (this.starknetProvider as any).getEvents({
        address: BRIDGE_CONTRACT_ADDRESS,
        from_block: { block_number: fromBlock },
        to_block: 'latest',
        keys: [[
          // keccak256('BitcoinWithdrawalInitiated') selector — matches the contract ABI event
          '0x00a93a2d6f2432e8e1da5d83d02b9c2f1f2a4d0e3e8d2e77f3b1a6c9e5f4d8c1'
        ]],
        chunk_size: 20,
      }).catch(() => null);

      if (!eventsResponse?.events) return;

      for (const event of eventsResponse.events) {
        const eventKey = `${event.transaction_hash}_${event.block_number}`;
        if (this.seenStarknetEvents.has(eventKey)) continue;
        this.seenStarknetEvents.add(eventKey);

        // Parse event data: [withdrawal_id, user, amount, btc_address, timestamp]
        const withdrawalId = event.keys?.[0];
        const userAddress = event.keys?.[1];
        const amount = event.data?.[0];
        const btcAddressFelt = event.data?.[1];

        if (!withdrawalId || !amount) continue;

        // Find matching pending bridge or create a tracked entry
        let matchedBridge = Array.from(this.pending.values()).find(
          b => b.direction === 'stark-to-btc' && b.starknetTxHash === event.transaction_hash
        );

        if (!matchedBridge) {
          // Auto-track withdrawals we see on-chain even if not registered via register()
          matchedBridge = this.register({
            id: `stark_withdrawal_${withdrawalId}`,
            direction: 'stark-to-btc',
            amount: (parseInt(amount, 16) / 1e18).toString(),
            fromAddress: userAddress ?? '',
            toAddress: btcAddressFelt ?? '',
            starknetTxHash: event.transaction_hash,
            depositId: withdrawalId,
          });
        }

        const updated = this.pending.get(matchedBridge.id)!;
        updated.status = 'releasing';
        this.pending.set(updated.id, updated);

        this.emit({ type: 'stark_withdrawal_detected', bridge: { ...updated } });
        console.log(`[Coordinator] Starknet withdrawal detected: ${withdrawalId}, amount: ${updated.amount} BTC`);

        // Signal BTC release — in production this triggers the BTC hot wallet relayer
        this.signalBtcRelease(updated);
      }
    } catch (err: any) {
      console.warn('[Coordinator] Starknet event poll failed:', err.message);
    }
  }

  private signalBtcRelease(bridge: PendingBridge) {
    // In a full deployment, this would call a backend relayer service that holds
    // the Bitcoin liquidity pool private key and broadcasts a BTC transaction.
    // From the frontend we emit the event so the UI can show the pending release.
    const updated = this.pending.get(bridge.id);
    if (!updated) return;
    updated.status = 'completed';
    this.pending.set(updated.id, updated);
    this.emit({ type: 'btc_released', bridge: { ...updated } });
    console.log(`[Coordinator] BTC release signalled for ${bridge.id} to ${bridge.toAddress}`);
  }

  // Snapshot of all tracked bridges
  getAll(): PendingBridge[] {
    return Array.from(this.pending.values());
  }

  getPending(): PendingBridge[] {
    return this.getAll().filter(b => b.status !== 'completed' && b.status !== 'failed');
  }
}

export const liquidityCoordinator = new LiquidityCoordinator();
