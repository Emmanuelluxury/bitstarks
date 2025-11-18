use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// Type aliases
pub type ContractAddress = String;
pub type Felt252 = u64;
pub type U256 = u128;

// Constants
pub mod constants {
    use super::U256;

    pub const MAX_BRIDGE_AMOUNT: U256 = u128::MAX; // Simplified
    pub const MIN_BRIDGE_AMOUNT: U256 = 1000;
    pub const MAX_BTC_ADDRESS_LENGTH: usize = 74; // Max Bitcoin address length
    pub const MAX_TRANSACTIONS_PER_USER: u32 = 100000000;
    pub const REWBITCOIN_TOKEN: &str = "rewbitcoin";
}

// Transaction types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum TransactionType {
    Deposit,
    Withdraw,
    Lock,
    Unlock,
    BridgeBTCToToken,
    BridgeTokenToBTC,
    SwapTokenToToken,
    Send,
    Receive,
}

// Transaction record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionRecord {
    pub transaction_type: TransactionType,
    pub token: ContractAddress,
    pub amount: U256,
    pub timestamp: String,
    pub dst_chain_id: Felt252,
    pub recipient: ContractAddress,
    pub btc_address: String,
    pub swap_id: U256,
}

// Simplified events for WASM
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimpleEvent {
    pub event_type: String,
    pub data: String,
}

// Errors
pub mod errors {
    pub const NOT_ADMIN: &str = "Bridge: Not admin";
    pub const NOT_AUTHORIZED: &str = "Bridge: Not authorized";
    pub const TOKEN_NOT_ALLOWED: &str = "Bridge: Token not allowed";
    pub const INVALID_TOKEN: &str = "Bridge: Invalid token";
    pub const TOKEN_NOT_REGISTERED: &str = "Bridge: Token not registered";
    pub const INVALID_AMOUNT: &str = "Bridge: Invalid amount";
    pub const AMOUNT_TOO_SMALL: &str = "Bridge: Amount too small";
    pub const AMOUNT_TOO_LARGE: &str = "Bridge: Amount too large";
    pub const INSUFFICIENT_BALANCE: &str = "Bridge: Insufficient balance";
    pub const INVALID_RECIPIENT: &str = "Bridge: Invalid recipient";
    pub const INVALID_BTC_ADDRESS: &str = "Bridge: Invalid BTC address";
    pub const INVALID_PUBLIC_KEY: &str = "Bridge: Invalid public key";
    pub const INVALID_BOND_AMOUNT: &str = "Bridge: Invalid bond amount";
    pub const BRIDGE_PAUSED: &str = "Bridge: Bridge is paused";
    pub const BRIDGE_NOT_PAUSED: &str = "Bridge: Bridge not paused";
    pub const CONTRACT_NOT_DEPLOYED: &str = "Bridge: Contract not deployed";
    pub const CALL_FAILED: &str = "Bridge: External call failed";
    pub const TRANSFER_FAILED: &str = "Bridge: Transfer failed";
    pub const APPROVE_FAILED: &str = "Bridge: Approve failed";
    pub const MINT_FAILED: &str = "Bridge: Mint failed";
    pub const INVALID_HEADER: &str = "Bridge: Invalid header";
    pub const HEADER_EXISTS: &str = "Bridge: Header exists";
    pub const INVALID_PROOF: &str = "Bridge: Invalid proof";
    pub const INVALID_LOCK_ADDRESS: &str = "Bridge: Invalid lock addr";
    pub const INVALID_UNLOCK_ADDRESS: &str = "Bridge: Invalid unlock addr";
    pub const INVALID_RECEIVE_CROSS_CHAIN_ADDRESS: &str = "Bridge: Invalid receive addr";
    pub const INVALID_BRIDGE_BTC_TO_TOKEN_ADDRESS: &str = "Bridge: Invalid btc-token addr";
    pub const INVALID_BRIDGE_TOKEN_TO_BTC_ADDRESS: &str = "Bridge: Invalid token-btc addr";
    pub const INVALID_SWAP_TOKEN_TO_TOKEN_ADDRESS: &str = "Bridge: Invalid swap addr";
    pub const INVALID_INITIATE_BITCOIN_DEPOSIT_ADDRESS: &str = "Bridge: Invalid deposit addr";
    pub const INVALID_INITIATE_BITCOIN_WITHDRAWAL_ADDRESS: &str = "Bridge: Invalid withdrawal addr";
    pub const INVALID_SEND_ADDRESS: &str = "Bridge: Invalid send addr";
    pub const INVALID_WITHDRAW_ADDRESS: &str = "Bridge: Invalid withdraw addr";
    pub const INVALID_DEPOSIT_ADDRESS: &str = "Bridge: Invalid deposit addr";
    pub const INVALID_TOKEN_OUT: &str = "Bridge: Invalid token out";
    pub const INVALID_TOKEN_IN: &str = "Bridge: Invalid token in";
    pub const INVALID_ROUTER: &str = "Bridge: Invalid router";
}

// Storage struct
#[derive(Debug, Clone)]
pub struct Storage {
    // Access control
    pub admin: ContractAddress,
    pub emergency_admin: ContractAddress,

    // Token management
    pub is_token_registered: HashMap<ContractAddress, bool>,
    pub is_wrapped_token: HashMap<ContractAddress, bool>,
    pub token_blacklist: HashMap<ContractAddress, bool>,

    // Bridge state
    pub bridge_paused: bool,
    pub emergency_paused: bool,
    pub pause_timestamp: String,

    // Security and limits
    pub daily_bridge_limit: U256,
    pub daily_bridge_used: U256,
    pub last_reset_timestamp: String,

    // Security features
    pub used_nonces: HashMap<Felt252, bool>,
    pub user_nonce: HashMap<ContractAddress, Felt252>,

    // Transaction history
    pub user_transaction_count: HashMap<ContractAddress, u32>,
    pub user_transactions: HashMap<(ContractAddress, u32), TransactionRecord>,

    // External contract addresses
    pub lock_address: ContractAddress,
    pub unlock_address: ContractAddress,
    pub receive_cross_chain_address: ContractAddress,
    pub bridge_btc_to_token_address: ContractAddress,
    pub bridge_token_to_btc_address: ContractAddress,
    pub swap_token_to_token_address: ContractAddress,
    pub initiate_bitcoin_deposit_address: ContractAddress,
    pub initiate_bitcoin_withdrawal_address: ContractAddress,
    pub send_address: ContractAddress,
    pub withdraw_address: ContractAddress,
    pub deposit_address: ContractAddress,
}

impl Default for Storage {
    fn default() -> Self {
        Self {
            admin: String::new(),
            emergency_admin: String::new(),
            is_token_registered: HashMap::new(),
            is_wrapped_token: HashMap::new(),
            token_blacklist: HashMap::new(),
            bridge_paused: false,
            emergency_paused: false,
            pause_timestamp: "".to_string(),
            daily_bridge_limit: 0,
            daily_bridge_used: 0,
            last_reset_timestamp: "".to_string(),
            used_nonces: HashMap::new(),
            user_nonce: HashMap::new(),
            user_transaction_count: HashMap::new(),
            user_transactions: HashMap::new(),
            lock_address: String::new(),
            unlock_address: String::new(),
            receive_cross_chain_address: String::new(),
            bridge_btc_to_token_address: String::new(),
            bridge_token_to_btc_address: String::new(),
            swap_token_to_token_address: String::new(),
            initiate_bitcoin_deposit_address: String::new(),
            initiate_bitcoin_withdrawal_address: String::new(),
            send_address: String::new(),
            withdraw_address: String::new(),
            deposit_address: String::new(),
        }
    }
}

// Bridge struct
#[wasm_bindgen]
pub struct Bridge {
    storage: Storage,
    events: Vec<SimpleEvent>,
}

#[wasm_bindgen]
impl Bridge {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Bridge {
        Bridge {
            storage: Storage::default(),
            events: Vec::new(),
        }
    }

    // Helper functions
    fn ensure(&self, cond: bool, error: &str) -> Result<(), String> {
        if !cond {
            Err(error.to_string())
        } else {
            Ok(())
        }
    }

    fn assert_admin(&self, caller: &ContractAddress) -> Result<(), String> {
        if caller != &self.storage.admin {
            Err(errors::NOT_ADMIN.to_string())
        } else {
            Ok(())
        }
    }

    fn assert_not_paused(&self) -> Result<(), String> {
        if self.storage.bridge_paused {
            Err(errors::BRIDGE_PAUSED.to_string())
        } else {
            Ok(())
        }
    }

    fn assert_contract_deployed(&self, address: &ContractAddress) -> Result<(), String> {
        if address.is_empty() {
            Err(errors::CONTRACT_NOT_DEPLOYED.to_string())
        } else {
            Ok(())
        }
    }

    fn validate_amount(&self, amount: U256) -> Result<(), String> {
        self.ensure(amount > 0, errors::INVALID_AMOUNT)?;
        self.ensure(amount >= constants::MIN_BRIDGE_AMOUNT, errors::AMOUNT_TOO_SMALL)?;
        self.ensure(amount <= constants::MAX_BRIDGE_AMOUNT, errors::AMOUNT_TOO_LARGE)?;
        // Skip suspicious check for now
        Ok(())
    }

    fn validate_address(&self, address: &ContractAddress, error: &str) -> Result<(), String> {
        self.ensure(!address.is_empty(), error)?;
        // Skip blacklist check
        Ok(())
    }

    fn validate_btc_address(&self, btc_address: &str) -> Result<(), String> {
        self.ensure(!btc_address.is_empty(), errors::INVALID_BTC_ADDRESS)?;
        self.ensure(btc_address.len() <= constants::MAX_BTC_ADDRESS_LENGTH, "BTC address too long")?;
        // Skip parsing for now, assume valid if length ok
        Ok(())
    }

    fn check_replay_protection(&mut self, user: &ContractAddress) -> Result<(), String> {
        let current_nonce = *self.storage.user_nonce.get(user).unwrap_or(&0);
        let next_nonce = current_nonce + 1;
        self.ensure(!self.storage.used_nonces.contains_key(&next_nonce), "NONCE_ALREADY_USED")?;
        self.storage.used_nonces.insert(next_nonce, true);
        self.storage.user_nonce.insert(user.clone(), next_nonce);
        Ok(())
    }

    fn record_transaction(
        &mut self,
        user: &ContractAddress,
        transaction_type: TransactionType,
        token: ContractAddress,
        amount: U256,
        dst_chain_id: Felt252,
        recipient: ContractAddress,
        btc_address: String,
        swap_id: U256,
    ) {
        let current_count = *self.storage.user_transaction_count.get(user).unwrap_or(&0);
        let new_count = current_count + 1;
        let index = if new_count > constants::MAX_TRANSACTIONS_PER_USER {
            (new_count - 1) % constants::MAX_TRANSACTIONS_PER_USER
        } else {
            current_count
        };
        let record = TransactionRecord {
            transaction_type,
            token,
            amount,
            timestamp: js_sys::Date::now().to_string(),
            dst_chain_id,
            recipient,
            btc_address,
            swap_id,
        };
        self.storage.user_transactions.insert((user.clone(), index), record);
        if new_count <= constants::MAX_TRANSACTIONS_PER_USER {
            self.storage.user_transaction_count.insert(user.clone(), new_count);
        }
    }

    fn check_daily_limit(&mut self, amount: U256) -> Result<(), String> {
        let current_time = js_sys::Date::now() as i64;
        let last_reset = self.storage.last_reset_timestamp.parse::<f64>().unwrap_or(0.0) as i64;
        if current_time >= last_reset + 86400000 { // 24 hours in milliseconds
            self.storage.daily_bridge_used = 0;
            self.storage.last_reset_timestamp = current_time.to_string();
        }
        let daily_used = self.storage.daily_bridge_used;
        let daily_limit = self.storage.daily_bridge_limit;
        self.ensure(daily_used + amount <= daily_limit, "DAILY_LIMIT_EXCEEDED")?;
        Ok(())
    }

    fn update_daily_usage(&mut self, amount: U256) {
        self.storage.daily_bridge_used += amount;
    }

    fn emit(&mut self, event: SimpleEvent) {
        self.events.push(event);
    }

    // Constructor/init
    #[wasm_bindgen]
    pub fn init(
        &mut self,
        admin: String,
        emergency_admin: String,
        daily_bridge_limit: U256,
        lock: String,
        unlock: String,
        receive_cross_chain: String,
        bridge_btc_to_token: String,
        bridge_token_to_btc: String,
        swap_token_to_token: String,
        initiate_bitcoin_deposit: String,
        initiate_bitcoin_withdrawal: String,
        send: String,
        withdraw: String,
        deposit: String,
    ) -> Result<(), JsValue> {
        self.validate_address(&admin, "INVALID_ADMIN").map_err(JsValue::from)?;
        self.validate_address(&emergency_admin, "INVALID_EMERGENCY_ADMIN").map_err(JsValue::from)?;
        self.assert_contract_deployed(&lock).map_err(JsValue::from)?;
        self.assert_contract_deployed(&unlock).map_err(JsValue::from)?;
        self.assert_contract_deployed(&receive_cross_chain).map_err(JsValue::from)?;
        self.assert_contract_deployed(&bridge_btc_to_token).map_err(JsValue::from)?;
        self.assert_contract_deployed(&bridge_token_to_btc).map_err(JsValue::from)?;
        self.assert_contract_deployed(&swap_token_to_token).map_err(JsValue::from)?;
        self.assert_contract_deployed(&initiate_bitcoin_deposit).map_err(JsValue::from)?;
        self.assert_contract_deployed(&initiate_bitcoin_withdrawal).map_err(JsValue::from)?;
        self.assert_contract_deployed(&send).map_err(JsValue::from)?;
        self.assert_contract_deployed(&withdraw).map_err(JsValue::from)?;
        self.assert_contract_deployed(&deposit).map_err(JsValue::from)?;

        self.storage.admin = admin;
        self.storage.emergency_admin = emergency_admin;
        self.storage.lock_address = lock;
        self.storage.unlock_address = unlock;
        self.storage.receive_cross_chain_address = receive_cross_chain;
        self.storage.bridge_btc_to_token_address = bridge_btc_to_token;
        self.storage.bridge_token_to_btc_address = bridge_token_to_btc;
        self.storage.swap_token_to_token_address = swap_token_to_token;
        self.storage.initiate_bitcoin_deposit_address = initiate_bitcoin_deposit;
        self.storage.initiate_bitcoin_withdrawal_address = initiate_bitcoin_withdrawal;
        self.storage.send_address = send;
        self.storage.withdraw_address = withdraw;
        self.storage.deposit_address = deposit;
        self.storage.bridge_paused = false;
        self.storage.emergency_paused = false;
        self.storage.pause_timestamp = js_sys::Date::now().to_string();
        self.storage.daily_bridge_limit = daily_bridge_limit;
        self.storage.daily_bridge_used = 0;
        self.storage.last_reset_timestamp = js_sys::Date::now().to_string();
        self.storage.is_wrapped_token.insert(constants::REWBITCOIN_TOKEN.to_string(), true);
        Ok(())
    }

    // Admin functions
    #[wasm_bindgen]
    pub fn set_admin(&mut self, caller: String, new_admin: String) -> Result<(), JsValue> {
        self.assert_admin(&caller).map_err(JsValue::from)?;
        let old = self.storage.admin.clone();
        self.storage.admin = new_admin.clone();
        self.emit(SimpleEvent { event_type: "AdminChanged".to_string(), data: format!("old:{},new:{}", old, new_admin) });
        Ok(())
    }

    #[wasm_bindgen]
    pub fn get_admin(&self) -> String {
        self.storage.admin.clone()
    }

    #[wasm_bindgen]
    pub fn set_wrapped_token(&mut self, caller: String, token: String, is_wrapped: bool) -> Result<(), JsValue> {
        self.assert_admin(&caller).map_err(JsValue::from)?;
        self.storage.is_wrapped_token.insert(token.clone(), is_wrapped);
        self.emit(SimpleEvent { event_type: "WrappedSet".to_string(), data: format!("token:{},wrapped:{}", token, is_wrapped) });
        Ok(())
    }

    #[wasm_bindgen]
    pub fn is_wrapped(&self, token: &str) -> bool {
        *self.storage.is_wrapped_token.get(token).unwrap_or(&false)
    }

    // Core bridge functions
    #[wasm_bindgen]
    pub fn deposit(
        &mut self,
        caller: String,
        token: String,
        amount: U256,
        dst_chain_id: Felt252,
        recipient: Felt252,
    ) -> Result<(), JsValue> {
        self.assert_not_paused().map_err(JsValue::from)?;
        self.ensure(!self.storage.emergency_paused, "EMERGENCY_PAUSED").map_err(JsValue::from)?;
        self.ensure(!*self.storage.token_blacklist.get(&token).unwrap_or(&false), "TOKEN_BLACKLISTED").map_err(JsValue::from)?;
        self.validate_amount(amount).map_err(JsValue::from)?;
        self.validate_address(&token, errors::INVALID_TOKEN).map_err(JsValue::from)?;
        self.ensure(recipient != 0, errors::INVALID_RECIPIENT).map_err(JsValue::from)?;
        self.ensure(dst_chain_id != 0, "INVALID_CHAIN_ID").map_err(JsValue::from)?;
        self.check_replay_protection(&caller).map_err(JsValue::from)?;
        self.check_daily_limit(amount).map_err(JsValue::from)?;
        self.update_daily_usage(amount);
        self.record_transaction(&caller, TransactionType::Deposit, token.clone(), amount, dst_chain_id, recipient.to_string(), String::new(), 0);
        self.emit(SimpleEvent { event_type: "Deposited".to_string(), data: format!("token:{},from:{},amount:{},dst_chain:{},recipient:{}", token, caller, amount, dst_chain_id, recipient) });
        Ok(())
    }

    #[wasm_bindgen]
    pub fn withdraw(&mut self, caller: String, token: String, to: String, amount: U256) -> Result<(), JsValue> {
        self.assert_admin(&caller).map_err(JsValue::from)?;
        self.ensure(amount > 0, errors::INVALID_AMOUNT).map_err(JsValue::from)?;
        self.validate_address(&to, errors::INVALID_RECIPIENT).map_err(JsValue::from)?;
        self.emit(SimpleEvent { event_type: "Withdrawn".to_string(), data: format!("token:{},to:{},amount:{}", token, to, amount) });
        Ok(())
    }

    #[wasm_bindgen]
    pub fn lock(
        &mut self,
        caller: String,
        token: String,
        amount: U256,
        dst_chain_id: Felt252,
        recipient: Felt252,
    ) -> Result<(), JsValue> {
        self.assert_not_paused().map_err(JsValue::from)?;
        self.ensure(!self.storage.emergency_paused, "EMERGENCY_PAUSED").map_err(JsValue::from)?;
        self.ensure(!*self.storage.token_blacklist.get(&token).unwrap_or(&false), "TOKEN_BLACKLISTED").map_err(JsValue::from)?;
        self.validate_amount(amount).map_err(JsValue::from)?;
        self.validate_address(&token, errors::INVALID_TOKEN).map_err(JsValue::from)?;
        self.ensure(recipient != 0, errors::INVALID_RECIPIENT).map_err(JsValue::from)?;
        self.ensure(dst_chain_id != 0, "INVALID_CHAIN_ID").map_err(JsValue::from)?;
        self.check_replay_protection(&caller).map_err(JsValue::from)?;
        self.check_daily_limit(amount).map_err(JsValue::from)?;
        self.update_daily_usage(amount);
        self.record_transaction(&caller, TransactionType::Lock, token.clone(), amount, dst_chain_id, recipient.to_string(), String::new(), 0);
        self.emit(SimpleEvent { event_type: "Locked".to_string(), data: format!("token:{},from:{},amount:{},dst_chain:{},recipient:{}", token, caller, amount, dst_chain_id, recipient) });
        Ok(())
    }

    #[wasm_bindgen]
    pub fn unlock(&mut self, caller: String, token: String, to: String, amount: U256) -> Result<(), JsValue> {
        self.assert_admin(&caller).map_err(JsValue::from)?;
        self.ensure(amount > 0, errors::INVALID_AMOUNT).map_err(JsValue::from)?;
        self.validate_address(&to, errors::INVALID_RECIPIENT).map_err(JsValue::from)?;
        self.emit(SimpleEvent { event_type: "Unlocked".to_string(), data: format!("token:{},to:{},amount:{}", token, to, amount) });
        Ok(())
    }

    #[wasm_bindgen]
    pub fn send(&mut self, _caller: String, dst_chain_id: Felt252, to_recipient: Felt252, data: Felt252) {
        self.emit(SimpleEvent { event_type: "Sent".to_string(), data: format!("dst_chain:{},to:{},data:{}", dst_chain_id, to_recipient, data) });
    }

    #[wasm_bindgen]
    pub fn receive_cross_chain(
        &mut self,
        caller: String,
        token: String,
        to: String,
        amount: U256,
        src_chain_id: Felt252,
        from_sender: Felt252,
        data: Felt252,
    ) -> Result<(), JsValue> {
        self.assert_admin(&caller).map_err(JsValue::from)?;
        let token = if src_chain_id == 0 { constants::REWBITCOIN_TOKEN.to_string() } else { token };
        let is_wrapped = self.is_wrapped(&token);
        if is_wrapped {
            // Simulate mint
            self.emit(SimpleEvent { event_type: "Received".to_string(), data: format!("src_chain:0,from:0,data:0") });
        } else {
            self.emit(SimpleEvent { event_type: "Unlocked".to_string(), data: format!("token:{},to:{},amount:{}", token, to, amount) });
        }
        self.emit(SimpleEvent { event_type: "Received".to_string(), data: format!("src_chain:{},from:{},data:{}", src_chain_id, from_sender, data) });
        Ok(())
    }

    // Swap functions
    #[wasm_bindgen]
    pub fn bridge_btc_to_token(
        &mut self,
        caller: String,
        amount: U256,
        btc_address: String,
        min_amount_out: U256,
        to: String,
    ) -> Result<U256, JsValue> {
        self.assert_not_paused().map_err(JsValue::from)?;
        self.ensure(!self.storage.emergency_paused, "EMERGENCY_PAUSED").map_err(JsValue::from)?;
        let token_out = constants::REWBITCOIN_TOKEN.to_string();
        self.ensure(!*self.storage.token_blacklist.get(&token_out).unwrap_or(&false), "TOKEN_BLACKLISTED").map_err(JsValue::from)?;
        self.validate_amount(amount).map_err(JsValue::from)?;
        self.validate_btc_address(&btc_address).map_err(JsValue::from)?;
        self.validate_address(&token_out, errors::INVALID_TOKEN_OUT).map_err(JsValue::from)?;
        self.validate_address(&to, errors::INVALID_RECIPIENT).map_err(JsValue::from)?;
        self.ensure(min_amount_out > 0, "INVALID_MIN_AMOUNT").map_err(JsValue::from)?;
        self.check_daily_limit(amount).map_err(JsValue::from)?;
        self.update_daily_usage(amount);
        let swap_id = (amount as u128).wrapping_add(btc_address.len() as u128);
        self.emit(SimpleEvent { event_type: "BitcoinDepositInitiated".to_string(), data: format!("deposit_id:{},user:{},amount:{},btc_address:{},timestamp:{}", swap_id, caller, amount, btc_address, js_sys::Date::now()) });
        self.record_transaction(&caller, TransactionType::BridgeBTCToToken, token_out.clone(), amount, 0, "0".to_string(), btc_address.clone(), swap_id);
        self.emit(SimpleEvent { event_type: "Swapped".to_string(), data: format!("router:,token_in:,token_out:{},amount_in:{},amount_out:0,to:{}", token_out, amount, to) });
        Ok(swap_id)
    }

    #[wasm_bindgen]
    pub fn bridge_token_to_btc(
        &mut self,
        caller: String,
        token_in: String,
        amount_in: U256,
        btc_address: String,
        min_btc_out: U256,
    ) -> Result<U256, JsValue> {
        self.assert_not_paused().map_err(JsValue::from)?;
        self.ensure(!self.storage.emergency_paused, "EMERGENCY_PAUSED").map_err(JsValue::from)?;
        self.ensure(!*self.storage.token_blacklist.get(&token_in).unwrap_or(&false), "TOKEN_BLACKLISTED").map_err(JsValue::from)?;
        self.validate_amount(amount_in).map_err(JsValue::from)?;
        self.validate_btc_address(&btc_address).map_err(JsValue::from)?;
        self.ensure(min_btc_out > 0, "INVALID_MIN_BTC_OUT").map_err(JsValue::from)?;
        self.check_daily_limit(amount_in).map_err(JsValue::from)?;
        self.update_daily_usage(amount_in);
        let swap_id = (amount_in as u128).wrapping_add(btc_address.len() as u128);
        self.emit(SimpleEvent { event_type: "BitcoinWithdrawalInitiated".to_string(), data: format!("withdrawal_id:{},user:{},amount:{},btc_address:{},timestamp:{}", swap_id, caller, min_btc_out, btc_address, js_sys::Date::now()) });
        self.record_transaction(&caller, TransactionType::BridgeTokenToBTC, token_in.clone(), amount_in, 0, "0".to_string(), btc_address.clone(), swap_id);
        self.emit(SimpleEvent { event_type: "Swapped".to_string(), data: format!("router:,token_in:{},token_out:,amount_in:{},amount_out:{},to:{}", token_in, amount_in, min_btc_out, caller) });
        Ok(swap_id)
    }

    #[wasm_bindgen]
    pub fn swap_token_to_token(
        &mut self,
        caller: String,
        router: String,
        token_in: String,
        token_out: String,
        amount_in: U256,
        min_amount_out: U256,
        to: String,
    ) -> Result<U256, JsValue> {
        self.assert_not_paused().map_err(JsValue::from)?;
        self.ensure(!self.storage.emergency_paused, "EMERGENCY_PAUSED").map_err(JsValue::from)?;
        self.ensure(!*self.storage.token_blacklist.get(&token_in).unwrap_or(&false), "TOKEN_BLACKLISTED").map_err(JsValue::from)?;
        self.ensure(!*self.storage.token_blacklist.get(&token_out).unwrap_or(&false), "TOKEN_BLACKLISTED").map_err(JsValue::from)?;
        self.validate_amount(amount_in).map_err(JsValue::from)?;
        self.validate_address(&token_in, errors::INVALID_TOKEN_IN).map_err(JsValue::from)?;
        self.validate_address(&token_out, errors::INVALID_TOKEN_OUT).map_err(JsValue::from)?;
        self.validate_address(&router, errors::INVALID_ROUTER).map_err(JsValue::from)?;
        self.validate_address(&to, errors::INVALID_RECIPIENT).map_err(JsValue::from)?;
        self.ensure(min_amount_out > 0, "INVALID_MIN_AMOUNT").map_err(JsValue::from)?;
        self.check_daily_limit(amount_in).map_err(JsValue::from)?;
        let fee_amount = amount_in / 200;
        let amount_out = amount_in - fee_amount;
        self.ensure(amount_out >= min_amount_out, "INSUFFICIENT_OUTPUT_AMOUNT").map_err(JsValue::from)?;
        self.update_daily_usage(amount_in);
        self.record_transaction(&caller, TransactionType::SwapTokenToToken, token_in.clone(), amount_in, 0, "0".to_string(), String::new(), 0);
        self.emit(SimpleEvent { event_type: "Swapped".to_string(), data: format!("router:{},token_in:{},token_out:{},amount_in:{},amount_out:{},to:{}", router, token_in, token_out, amount_in, amount_out, to) });
        Ok(amount_out)
    }

    // Bitcoin functions
    #[wasm_bindgen]
    pub fn initiate_bitcoin_deposit(
        &mut self,
        caller: String,
        amount: U256,
        btc_address: String,
        starknet_recipient: String,
    ) -> Result<U256, JsValue> {
        self.assert_not_paused().map_err(JsValue::from)?;
        self.ensure(!self.storage.emergency_paused, "EMERGENCY_PAUSED").map_err(JsValue::from)?;
        self.validate_amount(amount).map_err(JsValue::from)?;
        self.validate_btc_address(&btc_address).map_err(JsValue::from)?;
        self.validate_address(&starknet_recipient, errors::INVALID_RECIPIENT).map_err(JsValue::from)?;
        let deposit_id = (amount as u128).wrapping_add(btc_address.len() as u128);
        self.check_daily_limit(amount).map_err(JsValue::from)?;
        self.update_daily_usage(amount);
        self.emit(SimpleEvent { event_type: "BitcoinDepositInitiated".to_string(), data: format!("deposit_id:{},user:{},amount:{},btc_address:{},timestamp:{}", deposit_id, caller, amount, btc_address, js_sys::Date::now()) });
        self.record_transaction(&caller, TransactionType::Deposit, String::new(), amount, 0, starknet_recipient.into(), btc_address, deposit_id);
        Ok(deposit_id)
    }

    #[wasm_bindgen]
    pub fn initiate_bitcoin_withdrawal(
        &mut self,
        caller: String,
        amount: U256,
        btc_address: String,
    ) -> Result<U256, JsValue> {
        self.assert_not_paused().map_err(JsValue::from)?;
        self.ensure(!self.storage.emergency_paused, "EMERGENCY_PAUSED").map_err(JsValue::from)?;
        self.validate_amount(amount).map_err(JsValue::from)?;
        self.validate_btc_address(&btc_address).map_err(JsValue::from)?;
        let withdrawal_id = (amount as u128).wrapping_add(btc_address.len() as u128);
        self.check_daily_limit(amount).map_err(JsValue::from)?;
        self.update_daily_usage(amount);
        self.emit(SimpleEvent { event_type: "BitcoinWithdrawalInitiated".to_string(), data: format!("withdrawal_id:{},user:{},amount:{},btc_address:{},timestamp:{}", withdrawal_id, caller, amount, btc_address, js_sys::Date::now()) });
        self.record_transaction(&caller, TransactionType::Withdraw, String::new(), amount, 0, "0".to_string(), btc_address, withdrawal_id);
        Ok(withdrawal_id)
    }

    // Pause functions
    #[wasm_bindgen]
    pub fn pause_bridge(&mut self, caller: String) -> Result<(), JsValue> {
        self.assert_admin(&caller).map_err(JsValue::from)?;
        self.storage.bridge_paused = true;
        self.storage.pause_timestamp = js_sys::Date::now().to_string();
        self.emit(SimpleEvent { event_type: "BridgePaused".to_string(), data: format!("paused_by:{},paused_at:{}", caller, js_sys::Date::now()) });
        Ok(())
    }

    #[wasm_bindgen]
    pub fn unpause_bridge(&mut self, caller: String) -> Result<(), JsValue> {
        self.assert_admin(&caller).map_err(JsValue::from)?;
        self.storage.bridge_paused = false;
        self.emit(SimpleEvent { event_type: "BridgeUnpaused".to_string(), data: format!("unpaused_by:{},unpaused_at:{}", caller, js_sys::Date::now()) });
        Ok(())
    }

    // View functions
    #[wasm_bindgen]
    pub fn is_bridge_paused(&self) -> bool {
        self.storage.bridge_paused
    }

    #[wasm_bindgen]
    pub fn is_emergency_paused(&self) -> bool {
        self.storage.emergency_paused
    }

    #[wasm_bindgen]
    pub fn set_emergency_admin(&mut self, caller: String, new_emergency_admin: String) -> Result<(), JsValue> {
        self.assert_admin(&caller).map_err(JsValue::from)?;
        self.storage.emergency_admin = new_emergency_admin;
        Ok(())
    }

    #[wasm_bindgen]
    pub fn get_emergency_admin(&self) -> String {
        self.storage.emergency_admin.clone()
    }

    #[wasm_bindgen]
    pub fn set_daily_bridge_limit(&mut self, caller: String, limit: U256) -> Result<(), JsValue> {
        self.assert_admin(&caller).map_err(JsValue::from)?;
        self.storage.daily_bridge_limit = limit;
        Ok(())
    }

    #[wasm_bindgen]
    pub fn get_daily_bridge_limit(&self) -> U256 {
        self.storage.daily_bridge_limit
    }

    #[wasm_bindgen]
    pub fn get_daily_bridge_usage(&self) -> U256 {
        self.storage.daily_bridge_used
    }

    #[wasm_bindgen]
    pub fn get_pause_timestamp(&self) -> String {
        self.storage.pause_timestamp.clone()
    }

    #[wasm_bindgen]
    pub fn get_user_transaction_count(&self, user: String) -> u32 {
        *self.storage.user_transaction_count.get(&user).unwrap_or(&0)
    }

    #[wasm_bindgen]
    pub fn get_user_recent_transactions(&self, user: String, count: u32) -> JsValue {
        let total_count = self.get_user_transaction_count(user.clone());
        let max_count = count.min(total_count);
        let mut transactions = Vec::new();
        for i in 0..max_count {
            let index = if total_count > constants::MAX_TRANSACTIONS_PER_USER {
                (total_count - max_count + i) % constants::MAX_TRANSACTIONS_PER_USER
            } else {
                total_count - max_count + i
            };
            if let Some(record) = self.storage.user_transactions.get(&(user.clone(), index)) {
                transactions.push(record.clone());
            }
        }
        serde_wasm_bindgen::to_value(&transactions).unwrap()
    }
}