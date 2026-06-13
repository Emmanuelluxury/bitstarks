"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const liquidityCoordinator_1 = require("./coordinator/liquidityCoordinator");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const network = process.env.NETWORK ?? 'testnet';
const coordinator = new liquidityCoordinator_1.LiquidityCoordinator(network);
coordinator.onEvent(event => {
    console.log(`[Event] ${event.type}:`, event.bridge.id, '— status:', event.bridge.status);
});
coordinator.start();
// Register a new bridge to be watched + minted once BTC confirms
app.post('/bridges', (req, res) => {
    const { id, direction, amount, fromAddress, toAddress, btcTxHash, starknetTxHash } = req.body;
    if (!id || !direction || !amount || !fromAddress || !toAddress) {
        res.status(400).json({ error: 'Missing required fields: id, direction, amount, fromAddress, toAddress' });
        return;
    }
    // If a bridge with this btcTxHash already exists, patch its toAddress and return it
    // (handles the case where auto-discovery found the deposit before the frontend registered)
    const existing = coordinator.getAll().find(r => r.btcTxHash === btcTxHash);
    if (existing) {
        console.log(`[Backend] Bridge already tracked (${existing.id}), updating toAddress`);
        // Update toAddress via coordinator internals — cast for now
        existing.toAddress = toAddress;
        res.json(existing);
        return;
    }
    const record = coordinator.register({ id, direction, amount, fromAddress, toAddress, btcTxHash, starknetTxHash });
    res.json(record);
});
// Get all tracked bridges
app.get('/bridges', (_req, res) => {
    res.json(coordinator.getAll());
});
// Get a specific bridge by id — frontend polls this for status
app.get('/bridges/:id', (req, res) => {
    const record = coordinator.getAll().find(r => r.id === req.params.id);
    if (!record) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json(record);
});
// Retry a failed bridge (re-queues it for minting)
app.post('/bridges/:id/retry', (req, res) => {
    const record = coordinator.retry(req.params.id);
    if (!record) {
        res.status(404).json({ error: 'Bridge not found or not in failed state' });
        return;
    }
    res.json(record);
});
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', network, pendingBridges: coordinator.getPending().length });
});
const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
    console.log(`[Backend] BitStarks relayer on port ${PORT} (${network})`);
});
