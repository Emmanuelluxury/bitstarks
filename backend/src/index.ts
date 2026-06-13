import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { LiquidityCoordinator } from './coordinator/liquidityCoordinator';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const network = (process.env.NETWORK as 'mainnet' | 'testnet') ?? 'testnet';
const coordinator = new LiquidityCoordinator(network);

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
    (existing as any).toAddress = toAddress;
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
  if (!record) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(record);
});

// Manually trigger STRK release (bypasses BTC watcher — use when explorer API is unreachable)
app.post('/bridges/manual-release', async (req, res) => {
  const { btcTxHash, amountBtc, toAddress } = req.body;
  if (!btcTxHash || !amountBtc || !toAddress) {
    res.status(400).json({ error: 'Missing required fields: btcTxHash, amountBtc, toAddress' });
    return;
  }
  try {
    const record = await coordinator.manualRelease(btcTxHash, parseFloat(amountBtc), toAddress);
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manually mark a Starknet→BTC bridge as completed (called immediately after user's STRK tx confirms)
app.post('/bridges/manual-release-btc', async (req, res) => {
  const { starknetTxHash, amountStrk, toBtcAddress } = req.body;
  if (!starknetTxHash || !amountStrk || !toBtcAddress) {
    res.status(400).json({ error: 'Missing required fields: starknetTxHash, amountStrk, toBtcAddress' });
    return;
  }
  try {
    const record = await coordinator.manualReleaseBtc(starknetTxHash, parseFloat(amountStrk), toBtcAddress);
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
