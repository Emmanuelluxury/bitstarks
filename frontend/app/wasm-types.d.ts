// Type declarations for WASM module
// Place this file in the root of your project or in a types directory

declare module '../lib/wasm/bitcoin_starknet_bridge.js' {
  export class Bridge {
    constructor();
    
    init(
      admin: string,
      emergency_admin: string,
      daily_bridge_limit: bigint,
      lock: string,
      unlock: string,
      receive_cross_chain: string,
      bridge_btc_to_token: string,
      bridge_token_to_btc: string,
      swap_token_to_token: string,
      initiate_bitcoin_deposit: string,
      initiate_bitcoin_withdrawal: string,
      send: string,
      withdraw: string,
      deposit: string
    ): void;

    is_wrapped(token: string): boolean;
    pause_bridge(caller: string): void;
    unpause_bridge(caller: string): void;
    is_bridge_paused(): boolean;
    set_wrapped_token(caller: string, token: string, is_wrapped: boolean): void;
    
    bridge_btc_to_token(
      caller: string,
      amount: bigint,
      btc_address: string,
      min_amount_out: bigint,
      to: string
    ): bigint;
    
    bridge_token_to_btc(
      caller: string,
      token_in: string,
      amount_in: bigint,
      btc_address: BigUint64Array,
      min_btc_out: bigint
    ): bigint;
    
    get_emergency_admin(): string;
    get_pause_timestamp(): string;
    is_emergency_paused(): boolean;
    
    receive_cross_chain(
      caller: string,
      token: string,
      to: string,
      amount: bigint,
      src_chain_id: bigint,
      from_sender: bigint,
      data: bigint
    ): void;
    
    set_emergency_admin(caller: string, new_emergency_admin: string): void;
    
    swap_token_to_token(
      caller: string,
      router: string,
      token_in: string,
      token_out: string,
      amount_in: bigint,
      min_amount_out: bigint,
      to: string
    ): bigint;
    
    get_daily_bridge_limit(): bigint;
    get_daily_bridge_usage(): bigint;
    set_daily_bridge_limit(caller: string, limit: bigint): void;
    
    initiate_bitcoin_deposit(
      caller: string,
      amount: bigint,
      btc_address: string,
      starknet_recipient: string
    ): bigint;
    
    get_user_transaction_count(user: string): number;
    
    initiate_bitcoin_withdrawal(
      caller: string,
      amount: bigint,
      btc_address: BigUint64Array
    ): bigint;
    
    get_user_recent_transactions(user: string, count: number): unknown;
    
    lock(
      caller: string,
      token: string,
      amount: bigint,
      dst_chain_id: bigint,
      recipient: bigint
    ): void;
    
    send(
      caller: string,
      dst_chain_id: bigint,
      to_recipient: bigint,
      data: bigint
    ): void;
    
    unlock(caller: string, token: string, to: string, amount: bigint): void;
    deposit(
      caller: string,
      token: string,
      amount: bigint,
      dst_chain_id: bigint,
      recipient: bigint
    ): void;
    
    withdraw(caller: string, token: string, to: string, amount: bigint): void;
    get_admin(): string;
    set_admin(caller: string, new_admin: string): void;
  }

  export enum TransactionType {
    Deposit = 0,
    Withdraw = 1,
    Lock = 2,
    Unlock = 3,
    BridgeBTCToToken = 4,
    BridgeTokenToBTC = 5,
    SwapTokenToToken = 6,
    Send = 7,
    Receive = 8,
  }

  export default function init(): Promise<void>;
  export function initSync(module: WebAssembly.Module): void;
}