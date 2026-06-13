"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiquidityCoordinator = void 0;
const watcher_1 = require("../bitcoin/watcher");
const listener_1 = require("../starknet/listener");
const minter_1 = require("../starknet/minter");
const BTC_CONFIRMATIONS_REQUIRED = 1;
const POLL_INTERVAL_MS = 15000;
class LiquidityCoordinator {
    constructor(network = 'testnet') {
        this.records = new Map();
        this.handlers = [];
        this.timer = null;
        // Track deposit IDs that have already been minted to prevent double-minting
        this.mintedDepositIds = new Set();
        this.btcWatcher = new watcher_1.BitcoinWatcher(network);
        this.starkListener = new listener_1.StarknetListener(network);
        this.minter = new minter_1.StarknetMinter(network);
    }
    onEvent(handler) {
        this.handlers.push(handler);
        return () => { this.handlers = this.handlers.filter(h => h !== handler); };
    }
    emit(event) {
        this.handlers.forEach(h => h(event));
    }
    register(record) {
        const entry = {
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
        if (this.timer)
            return;
        console.log('[Coordinator] Starting...');
        this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
        this.poll();
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        console.log('[Coordinator] Stopped.');
    }
    getAll() { return Array.from(this.records.values()); }
    getPending() { return this.getAll().filter(r => r.status !== 'completed' && r.status !== 'failed'); }
    update(id, patch) {
        const r = this.records.get(id);
        if (!r)
            return;
        Object.assign(r, patch, { updatedAt: Date.now() });
        this.records.set(id, r);
    }
    async poll() {
        await Promise.allSettled([
            this.checkBtcDeposits(),
            this.checkStarknetWithdrawals(),
        ]);
    }
    // ── BTC → Starknet ────────────────────────────────────────────────────────
    async checkBtcDeposits() {
        const watching = this.getAll().filter(r => r.direction === 'btc-to-stark' && r.btcTxHash &&
            (r.status === 'watching' || r.status === 'confirmed'));
        for (const record of watching) {
            try {
                const confirmations = await this.btcWatcher.getConfirmations(record.btcTxHash);
                if (confirmations !== record.confirmations) {
                    this.update(record.id, { confirmations });
                    console.log(`[Coordinator] ${record.id}: ${confirmations} BTC confirmation(s)`);
                }
                if (confirmations >= 1 && record.status === 'watching') {
                    this.update(record.id, { status: 'confirmed' });
                    this.emit({ type: 'btc_deposit_confirmed', bridge: this.records.get(record.id) });
                }
                if (confirmations >= BTC_CONFIRMATIONS_REQUIRED && record.status === 'confirmed') {
                    await this.triggerMint(this.records.get(record.id));
                }
                // Reset error streak on success
                this.update(record.id, { consecutiveErrors: 0 });
            }
            catch (err) {
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
                        this.emit({ type: 'error', bridge: this.records.get(record.id), error: err.message });
                    }
                }
            }
        }
        // Auto-discover deposits — only unconfirmed (mempool) ones to avoid loading full history
        const newDeposits = await this.btcWatcher.pollNewDeposits();
        for (const tx of newDeposits) {
            if (this.getAll().some(r => r.btcTxHash === tx.txHash))
                continue;
            // Skip already-confirmed historical transactions — frontend registers its own bridges
            if (tx.confirmations > 0)
                continue;
            const rec = this.register({
                id: `btc_deposit_${tx.txHash.slice(0, 12)}`,
                direction: 'btc-to-stark',
                amount: tx.amount.toString(),
                fromAddress: tx.fromAddress,
                toAddress: '', // unknown until frontend registers with toAddress
                btcTxHash: tx.txHash,
            });
            this.emit({ type: 'btc_deposit_detected', bridge: rec });
        }
    }
    /** Reset a failed bridge back to 'confirmed' so it will be re-processed on the next poll. */
    retry(id) {
        const r = this.records.get(id);
        if (!r || r.status !== 'failed')
            return null;
        // Remove the deposit from the minted set so idempotency doesn't block re-mint
        if (r.btcTxHash)
            this.mintedDepositIds.delete(r.btcTxHash);
        this.update(id, { status: 'confirmed', confirmations: BTC_CONFIRMATIONS_REQUIRED, error: undefined });
        console.log(`[Coordinator] Retrying bridge: ${id}`);
        return this.records.get(id);
    }
    async triggerMint(record) {
        if (!record.toAddress) {
            console.error(`[Coordinator] Cannot mint for ${record.id} — toAddress (Starknet recipient) is empty`);
            this.update(record.id, { status: 'failed', error: 'Missing Starknet recipient address' });
            this.emit({ type: 'error', bridge: this.records.get(record.id), error: 'Missing Starknet recipient address' });
            return;
        }
        // Idempotency: skip if this BTC tx was already minted
        if (record.btcTxHash && this.mintedDepositIds.has(record.btcTxHash)) {
            console.warn(`[Coordinator] Skipping already-minted deposit: ${record.btcTxHash}`);
            this.update(record.id, { status: 'completed' });
            return;
        }
        this.update(record.id, { status: 'minting' });
        this.emit({ type: 'rawbtc_mint_triggered', bridge: this.records.get(record.id) });
        if (!this.minter.isReady()) {
            console.error(`[Coordinator] Minter not ready — set ADMIN_STARKNET_ADDRESS + ADMIN_PRIVATE_KEY`);
            this.update(record.id, { status: 'failed', error: 'Admin Starknet keys not configured' });
            this.emit({ type: 'error', bridge: this.records.get(record.id), error: 'Admin keys not configured' });
            return;
        }
        try {
            const mintTxHash = await this.minter.mintRawBtc(record.toAddress, parseFloat(record.amount), record.btcTxHash);
            if (record.btcTxHash)
                this.mintedDepositIds.add(record.btcTxHash);
            this.update(record.id, { status: 'minted', mintTxHash, starknetTxHash: mintTxHash });
            this.emit({ type: 'rawbtc_minted', bridge: this.records.get(record.id) });
            this.update(record.id, { status: 'completed' });
            this.emit({ type: 'completed', bridge: this.records.get(record.id) });
            console.log(`[Coordinator] ✅ Bridge completed: ${record.id}`);
        }
        catch (err) {
            console.error(`[Coordinator] ❌ mint_rawbtc failed for ${record.id}:`, err.message);
            this.update(record.id, { status: 'failed', error: err.message });
            this.emit({ type: 'error', bridge: this.records.get(record.id), error: err.message });
        }
    }
    // ── Starknet → BTC ────────────────────────────────────────────────────────
    async checkStarknetWithdrawals() {
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
            this.emit({ type: 'stark_withdrawal_detected', bridge: this.records.get(record.id) });
            // TODO: trigger hot-wallet BTC release to event.btcAddress
            console.log(`[Coordinator] ✅ Starknet withdrawal detected — release BTC to ${event.btcAddress}`);
            this.update(record.id, { status: 'completed' });
            this.emit({ type: 'btc_release_triggered', bridge: this.records.get(record.id) });
            this.emit({ type: 'completed', bridge: this.records.get(record.id) });
        }
    }
}
exports.LiquidityCoordinator = LiquidityCoordinator;
