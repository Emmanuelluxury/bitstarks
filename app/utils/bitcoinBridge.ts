// Real Bitcoin bridge implementation using WASM

// @ts-ignore: Allow importing JS wasm module without type declarations
import init, { Bridge } from '../lib/wasm/bitcoin_starknet_bridge.js';

let bridgeInstance: Bridge | null = null;

export async function initBitcoinBridge(): Promise<Bridge> {
  try {
    if (bridgeInstance) {
      return bridgeInstance;
    }

    console.log('Initializing WASM Bitcoin bridge...');
    await init();
    bridgeInstance = new Bridge();

    console.log('Initializing bridge with configuration...');
    // Initialize with dummy values for testing
    await bridgeInstance.init(
      '0x123', // admin
      '0x456', // emergency_admin
      BigInt('1000000000000'), // daily_bridge_limit
      '0xlock', // lock
      '0xunlock', // unlock
      '0xreceive', // receive_cross_chain
      '0xbridge_btc_to_token', // bridge_btc_to_token
      '0xbridge_token_to_btc', // bridge_token_to_btc
      '0xswap_token_to_token', // swap_token_to_token
      '0xinitiate_bitcoin_deposit', // initiate_bitcoin_deposit
      '0xinitiate_bitcoin_withdrawal', // initiate_bitcoin_withdrawal
      '0xsend', // send
      '0xwithdraw', // withdraw
      '0xdeposit' // deposit
    );

    console.log('✅ WASM Bitcoin bridge initialized successfully');
    return bridgeInstance;
  } catch (error) {
    console.error('❌ Failed to initialize WASM Bitcoin bridge:', error);
    throw new Error(`Bridge initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Bridge instance is now managed internally

// Utility functions for Bitcoin bridge operations
export async function initiateBitcoinDeposit(
  amount: bigint,
  btcAddress: string,
  starknetRecipient: string
): Promise<bigint> {
  const bridge = await initBitcoinBridge();
  return bridge.initiate_bitcoin_deposit('user', amount, btcAddress, starknetRecipient);
}

export async function initiateBitcoinWithdrawal(
  amountIn: bigint,
  btcAddress: string
): Promise<bigint> {
  const bridge = await initBitcoinBridge();
  return bridge.initiate_bitcoin_withdrawal('user', amountIn, btcAddress);
}

export async function bridgeBtcToToken(
  tokenOut: string,
  amount: bigint,
  btcAddress: string,
  minAmountOut: bigint,
  to: string
): Promise<bigint> {
  const bridge = await initBitcoinBridge();
  return bridge.bridge_btc_to_token('user', amount, btcAddress, minAmountOut, to);
}

export async function bridgeTokenToBtc(
  tokenIn: string,
  amountIn: bigint,
  btcAddress: string,
  minBtcOut: bigint
): Promise<bigint> {
  const bridge = await initBitcoinBridge();
  return bridge.bridge_token_to_btc('user', tokenIn, amountIn, btcAddress, minBtcOut);
}

export async function swapTokenToToken(
  router: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  minAmountOut: bigint,
  to: string
): Promise<bigint> {
  const bridge = await initBitcoinBridge();
  return bridge.swap_token_to_token('user', router, tokenIn, tokenOut, amountIn, minAmountOut, to);
}

export async function getUserTransactionCount(user: string): Promise<number> {
  const bridge = await initBitcoinBridge();
  return bridge.get_user_transaction_count(user);
}

export async function getUserRecentTransactions(user: string, count: number): Promise<any> {
  const bridge = await initBitcoinBridge();
  return bridge.get_user_recent_transactions(user, count);
}

export async function isBridgePaused(): Promise<boolean> {
  const bridge = await initBitcoinBridge();
  return bridge.is_bridge_paused();
}