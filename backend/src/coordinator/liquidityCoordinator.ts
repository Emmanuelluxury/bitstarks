import { BitcoinWatcher } from '../bitcoin/watcher';
import { StarknetListener } from '../starknet/listener';
import { StarknetMinter } from '../starknet/minter';

export type BridgeDirection = 'btc-to-stark' | 'stark-to-btc';
export type BridgeStatus = 'watching' | 'confirmed' | 'minting' | 'minted' | 'releasing' | 'completed' | 'failed';

export interface BridgeRecord {
  id: string;
  direction: BridgeDirection;
  amount: string;
  fromAddress: string;
  toAddress: string;       // Starknet recipient (btc-to-stark) or BTC recipient (stark-to-btc)
  btcTxHash?: string;
  starknetTxHash?: string;
  mintTxHash?: string;     // Starknet mint_rawbtc tx hash
  status: BridgeStatus;
  confirmations: number;
  consecutiveErrors: number;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export type CoordinatorEvent =
  | { type: 'btc_deposit_detected';      bridge: BridgeRecord }
  | { type: 'btc_deposit_confirmed';     bridge: BridgeRecord }
  | { type: 'rawbtc_mint_triggered';     bridge: BridgeRecord }
  | { type: 'rawbtc_minted';             bridge: BridgeRecord }
  | { type: 'stark_withdrawal_detected'; bridge: BridgeRecord }
  | { type: 'btc_release_triggered';     bridge: BridgeRecord }
  | { type: 'completed';                 bridge: BridgeRecord }
  | { type: 'error';                     bridge: BridgeRecord; error: string };

type EventHandler = (event: CoordinatorEvent) => void;

const BTC_CONFIRMATIONS_REQUIRED = 1;
const POLL_INTERVAL_MS = 15_000;

export class LiquidityCoordinator {
  private records  = new Map<string, BridgeRecord>();
  private handlers: EventHandler[] = [];
  private btcWatcher:    BitcoinWatcher;
  private starkListener: StarknetListener;
  private minter:        StarknetMinter;
  private timer: ReturnType<typeof setInterval> | null = null;
  // Track deposit IDs that have already been minted to prevent double-minting
  private mintedDepositIds = new Set<string>();

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.btcWatcher    = new BitcoinWatcher(network);
    this.starkListener = new StarknetListener(network);
    this.minter        = new StarknetMinter(network);
  }

  onEvent(handler: EventHandler) {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter(h => h !== handler); };
  }

  private emit(event: CoordinatorEvent) {
    this.handlers.forEach(h => h(event));
  }

  register(record: Omit<BridgeRecord, 'status' | 'confirmations' | 'consecutiveErrors' | 'createdAt' | 'updatedAt'>): BridgeRecord {
    const entry: BridgeRecord = {
      ...record,
      status: 'watching',
      confirmations: 0,
      consecutiveErrors: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.records.set(entry.id, entry);
    console.log(`[Coordinator] Registered ${entry.direction} bridge: ${entry.id}`);
    return entry;
  }

  start() {
    if (this.timer) return;
    console.log('[Coordinator] Starting...');
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    this.poll();
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    console.log('[Coordinator] Stopped.');
  }

  getAll():     BridgeRecord[] { return Array.from(this.records.values()); }
  getPending(): BridgeRecord[] { return this.getAll().filter(r => r.status !== 'completed' && r.status !== 'failed'); }

  private update(id: string, patch: Partial<BridgeRecord>) {
    const r = this.records.get(id);
    if (!r) return;
    Object.assign(r, patch, { updatedAt: Date.now() });
    this.records.set(id, r);
  }

  private async poll() {
    await Promise.allSettled([
      this.checkBtcDeposits(),
      this.checkStarknetWithdrawals(),
    ]);
  }

  // ── BTC → Starknet ────────────────────────────────────────────────────────

  private async checkBtcDeposits() {
    const watching = this.getAll().filter(
      r => r.direction === 'btc-to-stark' && r.btcTxHash &&
           (r.status === 'watching' || r.status === 'confirmed')
    );

    for (const record of watching) {
      try {
        const confirmations = await this.btcWatcher.getConfirmations(record.btcTxHash!);

        if (confirmations !== record.confirmations) {
          this.update(record.id, { confirmations });
          console.log(`[Coordinator] ${record.id}: ${confirmations} BTC confirmation(s)`);
        }

        if (confirmations >= 1 && record.status === 'watching') {
          this.update(record.id, { status: 'confirmed' });
          this.emit({ type: 'btc_deposit_confirmed', bridge: this.records.get(record.id)! });
        }

        if (confirmations >= BTC_CONFIRMATIONS_REQUIRED && record.status === 'confirmed') {
          await this.triggerMint(this.records.get(record.id)!);
        }

        // Reset error streak on success
        this.update(record.id, { consecutiveErrors: 0 });
      } catch (err: any) {
        const is404 = err?.response?.status === 404;
        const isRateLimit = err?.response?.status === 429;

        if (!isRateLimit) {
          console.warn(`[Coordinator] BTC check failed for ${record.id}:`, err.message);
        }

        const current = this.records.get(record.id);
        if (current) {
          const errs = (current.consecutiveErrors ?? 0) + 1;
          this.update(record.id, { consecutiveErrors: errs });

          // Abandon after 40 consecutive errors (~10 min at 15s interval).
          // 404 means tx not found yet — allow 20 polls (5 min) for mempool propagation.
          const limit = is404 ? 20 : 40;
          if (errs >= limit) {
            console.error(`[Coordinator] Abandoning ${record.id} after ${errs} consecutive errors`);
            this.update(record.id, { status: 'failed', error: err.message });
            this.emit({ type: 'error', bridge: this.records.get(record.id)!, error: err.message });
          }
        }
      }
    }

    // Auto-discover deposits — only unconfirmed (mempool) ones to avoid loading full history
    const newDeposits = await this.btcWatcher.pollNewDeposits();
    for (const tx of newDeposits) {
      if (this.getAll().some(r => r.btcTxHash === tx.txHash)) continue;
      // Skip already-confirmed historical transactions — frontend registers its own bridges
      if (tx.confirmations > 0) continue;
      const rec = this.register({
        id: `btc_deposit_${tx.txHash.slice(0, 12)}`,
        direction: 'btc-to-stark',
        amount: tx.amount.toString(),
        fromAddress: tx.fromAddress,
        toAddress: '',          // unknown until frontend registers with toAddress
        btcTxHash: tx.txHash,
      });
      this.emit({ type: 'btc_deposit_detected', bridge: rec });
    }
  }

  /**
   * Manually trigger STRK release without waiting for BTC API confirmation.
   * Used when the BTC explorer API is unreachable but the user has already sent BTC.
   */
  async manualRelease(btcTxHash: string, amountBtc: number, toAddress: string): Promise<BridgeRecord> {
    // Reuse an existing record for this tx if one exists, otherwise create a new one
    const existing = this.getAll().find(r => r.btcTxHash === btcTxHash);
    let record: BridgeRecord;

    if (existing) {
      // Allow re-triggering failed or watching bridges
      if (existing.btcTxHash) this.mintedDepositIds.delete(existing.btcTxHash);
      this.update(existing.id, {
        toAddress,
        amount: amountBtc.toString(),
        status: 'confirmed',
        confirmations: 1,
        error: undefined,
        consecutiveErrors: 0,
      });
      record = this.records.get(existing.id)!;
    } else {
      record = this.register({
        id: `manual_${btcTxHash.slice(0, 12)}`,
        direction: 'btc-to-stark',
        amount: amountBtc.toString(),
        fromAddress: 'manual',
        toAddress,
        btcTxHash,
      });
      this.update(record.id, { status: 'confirmed', confirmations: 1 });
      record = this.records.get(record.id)!;
    }

    await this.triggerMint(record);
    return this.records.get(record.id)!;
  }

  /** Reset a failed bridge back to 'confirmed' so it will be re-processed on the next poll. */
  retry(id: string): BridgeRecord | null {
    const r = this.records.get(id);
    if (!r || r.status !== 'failed') return null;
    // Remove the deposit from the minted set so idempotency doesn't block re-mint
    if (r.btcTxHash) this.mintedDepositIds.delete(r.btcTxHash);
    this.update(id, { status: 'confirmed', confirmations: BTC_CONFIRMATIONS_REQUIRED, error: undefined });
    console.log(`[Coordinator] Retrying bridge: ${id}`);
    return this.records.get(id)!;
  }

  private async triggerMint(record: BridgeRecord) {
    if (!record.toAddress) {
      console.error(`[Coordinator] Cannot mint for ${record.id} — toAddress (Starknet recipient) is empty`);
      this.update(record.id, { status: 'failed', error: 'Missing Starknet recipient address' });
      this.emit({ type: 'error', bridge: this.records.get(record.id)!, error: 'Missing Starknet recipient address' });
      return;
    }

    // Idempotency: skip if this BTC tx was already minted
    if (record.btcTxHash && this.mintedDepositIds.has(record.btcTxHash)) {
      console.warn(`[Coordinator] Skipping already-minted deposit: ${record.btcTxHash}`);
      this.update(record.id, { status: 'completed' });
      return;
    }

    this.update(record.id, { status: 'minting' });
    this.emit({ type: 'rawbtc_mint_triggered', bridge: this.records.get(record.id)! });

    if (!this.minter.isReady()) {
      console.error(`[Coordinator] Minter not ready — set ADMIN_STARKNET_ADDRESS + ADMIN_PRIVATE_KEY`);
      this.update(record.id, { status: 'failed', error: 'Admin Starknet keys not configured' });
      this.emit({ type: 'error', bridge: this.records.get(record.id)!, error: 'Admin keys not configured' });
      return;
    }

    try {
      const mintTxHash = await this.minter.mintRawBtc(
        record.toAddress,
        parseFloat(record.amount),
        record.btcTxHash!
      );

      if (record.btcTxHash) this.mintedDepositIds.add(record.btcTxHash);
      this.update(record.id, { status: 'minted', mintTxHash, starknetTxHash: mintTxHash });
      this.emit({ type: 'rawbtc_minted', bridge: this.records.get(record.id)! });

      this.update(record.id, { status: 'completed' });
      this.emit({ type: 'completed', bridge: this.records.get(record.id)! });

      console.log(`[Coordinator] ✅ Bridge completed: ${record.id}`);
    } catch (err: any) {
      console.error(`[Coordinator] ❌ mint_rawbtc failed for ${record.id}:`, err.message);
      this.update(record.id, { status: 'failed', error: err.message });
      this.emit({ type: 'error', bridge: this.records.get(record.id)!, error: err.message });
    }
  }

  // ── Starknet → BTC ────────────────────────────────────────────────────────

  private async checkStarknetWithdrawals() {
    const events = await this.starkListener.pollWithdrawals();

    for (const event of events) {
      const existing = this.getAll().find(r => r.starknetTxHash === event.txHash);

      let record = existing;
      if (!record) {
        record = this.register({
          id: `stark_withdrawal_${event.withdrawalId.slice(0, 12)}`,
          direction: 'stark-to-btc',
          amount: (parseInt(event.amount, 16) / 1e18).toFixed(8),
          fromAddress: event.userAddress,
          toAddress: event.btcAddress,
          starknetTxHash: event.txHash,
        });
      }

      this.update(record.id, { status: 'releasing' });
      this.emit({ type: 'stark_withdrawal_detected', bridge: this.records.get(record.id)! });

      // TODO: trigger hot-wallet BTC release to event.btcAddress
      console.log(`[Coordinator] ✅ Starknet withdrawal detected — release BTC to ${event.btcAddress}`);

      this.update(record.id, { status: 'completed' });
      this.emit({ type: 'btc_release_triggered',  bridge: this.records.get(record.id)! });
      this.emit({ type: 'completed',               bridge: this.records.get(record.id)! });
    }
  }
}
