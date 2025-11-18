let wasm;

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
/**
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
 */
export const TransactionType = Object.freeze({
    Deposit: 0, "0": "Deposit",
    Withdraw: 1, "1": "Withdraw",
    Lock: 2, "2": "Lock",
    Unlock: 3, "3": "Unlock",
    BridgeBTCToToken: 4, "4": "BridgeBTCToToken",
    BridgeTokenToBTC: 5, "5": "BridgeTokenToBTC",
    SwapTokenToToken: 6, "6": "SwapTokenToToken",
    Send: 7, "7": "Send",
    Receive: 8, "8": "Receive",
});

const BridgeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_bridge_free(ptr >>> 0, 1));

export class Bridge {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BridgeFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bridge_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.bridge_new();
        this.__wbg_ptr = ret >>> 0;
        BridgeFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string} admin
     * @param {string} emergency_admin
     * @param {bigint} daily_bridge_limit
     * @param {string} lock
     * @param {string} unlock
     * @param {string} receive_cross_chain
     * @param {string} bridge_btc_to_token
     * @param {string} bridge_token_to_btc
     * @param {string} swap_token_to_token
     * @param {string} initiate_bitcoin_deposit
     * @param {string} initiate_bitcoin_withdrawal
     * @param {string} send
     * @param {string} withdraw
     * @param {string} deposit
     */
    init(admin, emergency_admin, daily_bridge_limit, lock, unlock, receive_cross_chain, bridge_btc_to_token, bridge_token_to_btc, swap_token_to_token, initiate_bitcoin_deposit, initiate_bitcoin_withdrawal, send, withdraw, deposit) {
        const ptr0 = passStringToWasm0(admin, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(emergency_admin, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(lock, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(unlock, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passStringToWasm0(receive_cross_chain, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passStringToWasm0(bridge_btc_to_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len5 = WASM_VECTOR_LEN;
        const ptr6 = passStringToWasm0(bridge_token_to_btc, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len6 = WASM_VECTOR_LEN;
        const ptr7 = passStringToWasm0(swap_token_to_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len7 = WASM_VECTOR_LEN;
        const ptr8 = passStringToWasm0(initiate_bitcoin_deposit, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len8 = WASM_VECTOR_LEN;
        const ptr9 = passStringToWasm0(initiate_bitcoin_withdrawal, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len9 = WASM_VECTOR_LEN;
        const ptr10 = passStringToWasm0(send, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len10 = WASM_VECTOR_LEN;
        const ptr11 = passStringToWasm0(withdraw, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len11 = WASM_VECTOR_LEN;
        const ptr12 = passStringToWasm0(deposit, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len12 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_init(this.__wbg_ptr, ptr0, len0, ptr1, len1, daily_bridge_limit, daily_bridge_limit >> BigInt(64), ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5, ptr6, len6, ptr7, len7, ptr8, len8, ptr9, len9, ptr10, len10, ptr11, len11, ptr12, len12);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} caller
     * @param {string} new_admin
     */
    set_admin(caller, new_admin) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(new_admin, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_set_admin(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {string}
     */
    get_admin() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.bridge_get_admin(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} caller
     * @param {string} token
     * @param {boolean} is_wrapped
     */
    set_wrapped_token(caller, token, is_wrapped) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_set_wrapped_token(this.__wbg_ptr, ptr0, len0, ptr1, len1, is_wrapped);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} token
     * @returns {boolean}
     */
    is_wrapped(token) {
        const ptr0 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_is_wrapped(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @param {string} caller
     * @param {string} token
     * @param {bigint} amount
     * @param {bigint} dst_chain_id
     * @param {bigint} recipient
     */
    deposit(caller, token, amount, dst_chain_id, recipient) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_deposit(this.__wbg_ptr, ptr0, len0, ptr1, len1, amount, amount >> BigInt(64), dst_chain_id, recipient);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} caller
     * @param {string} token
     * @param {string} to
     * @param {bigint} amount
     */
    withdraw(caller, token, to, amount) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_withdraw(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, amount, amount >> BigInt(64));
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} caller
     * @param {string} token
     * @param {bigint} amount
     * @param {bigint} dst_chain_id
     * @param {bigint} recipient
     */
    lock(caller, token, amount, dst_chain_id, recipient) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_lock(this.__wbg_ptr, ptr0, len0, ptr1, len1, amount, amount >> BigInt(64), dst_chain_id, recipient);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} caller
     * @param {string} token
     * @param {string} to
     * @param {bigint} amount
     */
    unlock(caller, token, to, amount) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_unlock(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, amount, amount >> BigInt(64));
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} _caller
     * @param {bigint} dst_chain_id
     * @param {bigint} to_recipient
     * @param {bigint} data
     */
    send(_caller, dst_chain_id, to_recipient, data) {
        const ptr0 = passStringToWasm0(_caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.bridge_send(this.__wbg_ptr, ptr0, len0, dst_chain_id, to_recipient, data);
    }
    /**
     * @param {string} caller
     * @param {string} token
     * @param {string} to
     * @param {bigint} amount
     * @param {bigint} src_chain_id
     * @param {bigint} from_sender
     * @param {bigint} data
     */
    receive_cross_chain(caller, token, to, amount, src_chain_id, from_sender, data) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_receive_cross_chain(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, amount, amount >> BigInt(64), src_chain_id, from_sender, data);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} caller
     * @param {bigint} amount
     * @param {string} btc_address
     * @param {bigint} min_amount_out
     * @param {string} to
     * @returns {bigint}
     */
    bridge_btc_to_token(caller, amount, btc_address, min_amount_out, to) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(btc_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_bridge_btc_to_token(this.__wbg_ptr, ptr0, len0, amount, amount >> BigInt(64), ptr1, len1, min_amount_out, min_amount_out >> BigInt(64), ptr2, len2);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * @param {string} caller
     * @param {string} token_in
     * @param {bigint} amount_in
     * @param {string} btc_address
     * @param {bigint} min_btc_out
     * @returns {bigint}
     */
    bridge_token_to_btc(caller, token_in, amount_in, btc_address, min_btc_out) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(token_in, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(btc_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_bridge_token_to_btc(this.__wbg_ptr, ptr0, len0, ptr1, len1, amount_in, amount_in >> BigInt(64), ptr2, len2, min_btc_out, min_btc_out >> BigInt(64));
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * @param {string} caller
     * @param {string} router
     * @param {string} token_in
     * @param {string} token_out
     * @param {bigint} amount_in
     * @param {bigint} min_amount_out
     * @param {string} to
     * @returns {bigint}
     */
    swap_token_to_token(caller, router, token_in, token_out, amount_in, min_amount_out, to) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(router, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(token_in, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(token_out, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_swap_token_to_token(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, amount_in, amount_in >> BigInt(64), min_amount_out, min_amount_out >> BigInt(64), ptr4, len4);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * @param {string} caller
     * @param {bigint} amount
     * @param {string} btc_address
     * @param {string} starknet_recipient
     * @returns {bigint}
     */
    initiate_bitcoin_deposit(caller, amount, btc_address, starknet_recipient) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(btc_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(starknet_recipient, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_initiate_bitcoin_deposit(this.__wbg_ptr, ptr0, len0, amount, amount >> BigInt(64), ptr1, len1, ptr2, len2);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * @param {string} caller
     * @param {bigint} amount
     * @param {string} btc_address
     * @returns {bigint}
     */
    initiate_bitcoin_withdrawal(caller, amount, btc_address) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(btc_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_initiate_bitcoin_withdrawal(this.__wbg_ptr, ptr0, len0, amount, amount >> BigInt(64), ptr1, len1);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * @param {string} caller
     */
    pause_bridge(caller) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_pause_bridge(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} caller
     */
    unpause_bridge(caller) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_unpause_bridge(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {boolean}
     */
    is_bridge_paused() {
        const ret = wasm.bridge_is_bridge_paused(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    is_emergency_paused() {
        const ret = wasm.bridge_is_emergency_paused(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {string} caller
     * @param {string} new_emergency_admin
     */
    set_emergency_admin(caller, new_emergency_admin) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(new_emergency_admin, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_set_emergency_admin(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {string}
     */
    get_emergency_admin() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.bridge_get_emergency_admin(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} caller
     * @param {bigint} limit
     */
    set_daily_bridge_limit(caller, limit) {
        const ptr0 = passStringToWasm0(caller, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_set_daily_bridge_limit(this.__wbg_ptr, ptr0, len0, limit, limit >> BigInt(64));
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {bigint}
     */
    get_daily_bridge_limit() {
        const ret = wasm.bridge_get_daily_bridge_limit(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * @returns {bigint}
     */
    get_daily_bridge_usage() {
        const ret = wasm.bridge_get_daily_bridge_usage(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * @returns {string}
     */
    get_pause_timestamp() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.bridge_get_pause_timestamp(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} user
     * @returns {number}
     */
    get_user_transaction_count(user) {
        const ptr0 = passStringToWasm0(user, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_get_user_transaction_count(this.__wbg_ptr, ptr0, len0);
        return ret >>> 0;
    }
    /**
     * @param {string} user
     * @param {number} count
     * @returns {any}
     */
    get_user_recent_transactions(user, count) {
        const ptr0 = passStringToWasm0(user, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bridge_get_user_recent_transactions(this.__wbg_ptr, ptr0, len0, count);
        return ret;
    }
}
if (Symbol.dispose) Bridge.prototype[Symbol.dispose] = Bridge.prototype.free;

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_Error_e83987f665cf5504 = function(arg0, arg1) {
        const ret = Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg___wbindgen_debug_string_df47ffb5e35e6763 = function(arg0, arg1) {
        const ret = debugString(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_throw_b855445ff6a94295 = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_new_1acc0b6eea89d040 = function() {
        const ret = new Object();
        return ret;
    };
    imports.wbg.__wbg_new_e17d9f43105b08be = function() {
        const ret = new Array();
        return ret;
    };
    imports.wbg.__wbg_now_793306c526e2e3b6 = function() {
        const ret = Date.now();
        return ret;
    };
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
        arg0[arg1] = arg2;
    };
    imports.wbg.__wbg_set_c213c871859d6500 = function(arg0, arg1, arg2) {
        arg0[arg1 >>> 0] = arg2;
    };
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(String) -> Externref`.
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_cast_4625c577ab2ec9ee = function(arg0) {
        // Cast intrinsic for `U64 -> Externref`.
        const ret = BigInt.asUintN(64, arg0);
        return ret;
    };
    imports.wbg.__wbindgen_cast_d6cd19b81560fd6e = function(arg0) {
        // Cast intrinsic for `F64 -> Externref`.
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_cast_e7b45dd881f38ce3 = function(arg0, arg1) {
        // Cast intrinsic for `U128 -> Externref`.
        const ret = (BigInt.asUintN(64, arg0) | (BigInt.asUintN(64, arg1) << BigInt(64)));
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
        ;
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = '/wasm/bitcoin_starknet_bridge_bg.wasm';
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;