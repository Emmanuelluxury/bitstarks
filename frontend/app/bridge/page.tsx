'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import WalletModal from '../components/WalletModal';
import { useTransactions } from '../components/TransactionContext';
import { initStarknet, bridgeBtcToToken, bridgeTokenToBtc } from '../utils/starknet';
import './styles.css';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

export default function BridgePage() {
    const { addTransaction, updateTransaction, transactions: rawTransactions } = useTransactions();
    const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];
    const [direction, setDirection] = useState<'btc-to-stark' | 'stark-to-btc'>('btc-to-stark');
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [fromAddress, setFromAddress] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [bitcoinWalletConnected, setBitcoinWalletConnected] = useState(false);
    const [starknetWalletConnected, setStarknetWalletConnected] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [bitcoinWalletAddress, setBitcoinWalletAddress] = useState<string | null>(null);
    const [starknetWalletAddress, setStarknetWalletAddress] = useState<string | null>(null);
    const [bitcoinBalance, setBitcoinBalance] = useState<number | null>(null);
    const [starknetBalance, setStarknetBalance] = useState<number | null>(null);
    const [rawBtcBalance, setRawBtcBalance] = useState<number | null>(null);
    const [bridgeFee, setBridgeFee] = useState<number>(0);
    const [bitcoinFee, setBitcoinFee] = useState<number>(0);
    const [starknetFee, setStarknetFee] = useState<number>(0);
    const [estimatedTime, setEstimatedTime] = useState<string>('~0 minutes');
    const [showFeeDropdown, setShowFeeDropdown] = useState(false);
    const [networkMode, setNetworkMode] = useState<'mainnet' | 'testnet'>('testnet');
    const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
    const [isBridging, setIsBridging] = useState(false);
    const [bridgeError, setBridgeError] = useState<string | null>(null);
    const [bridgeSuccess, setBridgeSuccess] = useState<string | null>(null);
    const [showTransactionPopup, setShowTransactionPopup] = useState(false);
    const [transactionDetails, setTransactionDetails] = useState<any>(null);
    const [bitcoinWalletType, setBitcoinWalletType] = useState<string | null>(null);
    const [starknetWalletType, setStarknetWalletType] = useState<string | null>(null);
    const networkSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle network mode changes with proper wallet disconnection
  const handleNetworkModeChange = async (newMode: 'mainnet' | 'testnet') => {
    if (newMode === networkMode) return; // No change needed

    console.log(`🔄 Switching network from ${networkMode} to ${newMode}`);
    console.log(`📊 Network mode before change:`, networkMode);
    setIsNetworkSwitching(true);

    // Clear any existing timeout
    if (networkSwitchTimeoutRef.current) {
      clearTimeout(networkSwitchTimeoutRef.current);
    }

    // Disconnect wallets when switching networks
    setBitcoinWalletConnected(false);
    setStarknetWalletConnected(false);
    setBitcoinWalletAddress(null);
    setStarknetWalletAddress(null);
    setBitcoinWalletType(null);
    setStarknetWalletType(null);
    setBitcoinBalance(null);
    setStarknetBalance(null);
    setFromAddress('');
    setToAddress('');

    // Set new network mode
    setNetworkMode(newMode);
    // Also update the Starknet utility network mode
    const { setNetworkMode: setStarknetNetworkMode } = await import('../utils/starknet');
    setStarknetNetworkMode(newMode);
    console.log(`✅ Network mode set to: ${newMode}`);
    console.log(`🔄 Network state updated, wallets disconnected`);

    // Show switching state for a brief moment
    networkSwitchTimeoutRef.current = setTimeout(() => {
      setIsNetworkSwitching(false);
      console.log(`🔄 Network switching completed, modal will re-render`);
    }, 1000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (networkSwitchTimeoutRef.current) {
        clearTimeout(networkSwitchTimeoutRef.current);
      }
    };
  }, []);

  // Poll backend coordinator for bridge status updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${BACKEND_URL}/bridges`);
        const pending = data.filter((b: any) => b.status !== 'completed' && b.status !== 'failed');
        if (pending.length > 0) {
          const latest = pending[pending.length - 1];
          setBridgeSuccess(`Bridge ${latest.id.slice(0, 10)}... — status: ${latest.status} (${latest.confirmations} confirmations)`);
        }
      } catch {
        // Backend not running — silent, it's optional
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDirectionToggle = (newDirection: 'btc-to-stark' | 'stark-to-btc') => {
    setDirection(newDirection);

    // Update bridge fee and estimated time based on direction
    updateBridgeMetrics(newDirection, fromAmount);

    // Clear address fields when switching directions to avoid confusion
    setFromAddress('');
    setToAddress('');

    // Auto-populate addresses based on connected wallets and new direction
    if (newDirection === 'btc-to-stark') {
      // BTC → Starknet: From = Bitcoin address, To = Starknet address
      if (bitcoinWalletAddress) {
        setFromAddress(bitcoinWalletAddress);
      }
      if (starknetWalletAddress) {
        setToAddress(starknetWalletAddress);
      }
    } else {
      // Starknet → BTC: From = Starknet address, To = Bitcoin address
      if (starknetWalletAddress) {
        setFromAddress(starknetWalletAddress);
      }
      // For Starknet → BTC, always show the connected Bitcoin wallet address if available
      if (bitcoinWalletAddress) {
        setToAddress(bitcoinWalletAddress);
      }
    }
  };

  const handleSwap = () => {
    const newDirection = direction === 'btc-to-stark' ? 'stark-to-btc' : 'btc-to-stark';
    setDirection(newDirection);
    updateBridgeMetrics(newDirection, fromAmount);
  };

  // Function to update bridge fee and estimated time based on direction and amount
  const updateBridgeMetrics = (bridgeDirection: 'btc-to-stark' | 'stark-to-btc', amount: string) => {
    const numAmount = parseFloat(amount) || 0;

    if (numAmount === 0) {
      setBridgeFee(0);
      setBitcoinFee(0);
      setStarknetFee(0);
      setEstimatedTime('~0 minutes');
      return;
    }

    // Dynamic fee calculation based on amount and direction
    let baseFee = 0.0005; // Base fee in BTC
    let bitcoinNetworkFee = 0.0001; // Bitcoin network fee
    let starknetNetworkFee = 0.0002; // Starknet network fee

    // Adjust fees based on amount (larger amounts get slightly lower percentage fees)
    if (numAmount > 1) {
      baseFee = Math.max(0.0003, baseFee - (numAmount * 0.0001));
      bitcoinNetworkFee = Math.max(0.00005, bitcoinNetworkFee - (numAmount * 0.00002));
      starknetNetworkFee = Math.max(0.0001, starknetNetworkFee - (numAmount * 0.00004));
    } else if (numAmount > 0.1) {
      baseFee = 0.0004;
      bitcoinNetworkFee = 0.00008;
      starknetNetworkFee = 0.00015;
    }

    // Different fees for different directions (Starknet → BTC might be slightly cheaper)
    if (bridgeDirection === 'stark-to-btc') {
      baseFee *= 0.9; // 10% discount for Starknet → BTC
      bitcoinNetworkFee *= 0.95;
      starknetNetworkFee *= 0.9;
    }

    setBridgeFee(baseFee);
    setBitcoinFee(bitcoinNetworkFee);
    setStarknetFee(starknetNetworkFee);

    // Dynamic time estimation based on amount and network congestion
    let baseTime = 15; // Base time in minutes

    // Larger amounts take longer to process
    if (numAmount > 1) {
      baseTime += 5;
    } else if (numAmount > 0.5) {
      baseTime += 3;
    }

    // Starknet → BTC might be faster due to less congestion
    if (bridgeDirection === 'stark-to-btc') {
      baseTime = Math.max(10, baseTime - 3);
    }

    // Add some randomness to simulate real-time network conditions
    const timeVariation = Math.floor(Math.random() * 6) - 3; // -3 to +3 minutes
    const finalTime = Math.max(8, baseTime + timeVariation);

    setEstimatedTime(`~${finalTime} minutes`);
  };

  const handleMax = () => {
    const maxAmount = direction === 'btc-to-stark'
      ? (bitcoinWalletConnected && bitcoinBalance !== null ? bitcoinBalance : 0.0020)
      : (starknetWalletConnected && starknetBalance !== null ? starknetBalance : 0.0030);
    const maxAmountStr = maxAmount.toFixed(6); // Use more precision for STRK
    setFromAmount(maxAmountStr);
    const toAmount = maxAmount - bridgeFee;
    setToAmount(toAmount.toFixed(6));
    updateBridgeMetrics(direction, maxAmountStr);
  };

  const handleConnectWallet = () => {
    setIsWalletModalOpen(true);
  };

  const handleWalletConnect = async (type: string, address?: string, detectedNetwork?: 'mainnet' | 'testnet') => {
    console.log(`🔗 Connecting ${type} wallet. Address:`, address, `Detected network:`, detectedNetwork);
    console.log(`📊 Current app network mode:`, networkMode);
    console.log(`🔑 Wallet type:`, type);

    // If we detected a network from the wallet connection, update the app's network mode
    if (detectedNetwork && detectedNetwork !== networkMode) {
      console.log(`🔄 Wallet is on ${detectedNetwork}, updating app network mode to match wallet`);
      setNetworkMode(detectedNetwork);
    } else if (detectedNetwork && detectedNetwork === networkMode) {
      console.log(`✅ Wallet network (${detectedNetwork}) matches app network mode (${networkMode})`);
    } else if (!detectedNetwork) {
      console.log(`⚠️ No network detected from wallet connection - wallet may not support network detection`);
    }

    // Determine wallet type based on the wallet name
    const isBitcoinWallet = ['xverse', 'unisat', 'phantom', 'trustwallet'].includes(type.toLowerCase());
    const isStarknetWallet = ['ready', 'braavos', 'metamask'].includes(type.toLowerCase());

    console.log('🔗 handleWalletConnect called:', { type, address, detectedNetwork });
    console.log('📊 Wallet categorization:', { isBitcoinWallet, isStarknetWallet });
    console.log('🔍 DEBUG: Wallet connection details:');
    console.log('  - Type:', type);
    console.log('  - Address:', address);
    console.log('  - Is Bitcoin wallet:', isBitcoinWallet);
    console.log('  - Is Starknet wallet:', isStarknetWallet);

    if (isBitcoinWallet) {
      console.log('💰 Setting Bitcoin wallet:', { type, address });
      setBitcoinWalletConnected(true);
      setBitcoinWalletAddress(address || null);
      setBitcoinWalletType(type);
      // Fetch real Bitcoin balance when wallet connects
      if (address) {
        fetchBitcoinBalance(address);
      }
      // Auto-fill the fromAddress field when Bitcoin wallet connects (for BTC→Starknet direction)
      if (direction === 'btc-to-stark' && address) {
        setFromAddress(address);
      }
      // Auto-fill the toAddress field when Bitcoin wallet connects (for Starknet→BTC direction)
      if (direction === 'stark-to-btc' && address) {
        setToAddress(address);
      }
    } else if (isStarknetWallet) {
      console.log('🌐 Setting Starknet wallet:', { type, address });
      setStarknetWalletConnected(true);
      setStarknetWalletAddress(address || null);
      setStarknetWalletType(type);

      // Initialize Starknet bridge system with wallet connection
      console.log('🔍 DEBUG: About to initialize Starknet with wallet connection...');
      try {
        const initResult = await initStarknet({ type, address: address || '' });
        console.log('✅ Starknet bridge system initialized with wallet');
        console.log('🔍 DEBUG: initStarknet result:', initResult);

        // Verify that the account was actually set
        const { getAccount } = await import('../utils/starknet');
        const account = getAccount();
        if (!account) {
          console.error('❌ DEBUG: initStarknet completed but no account was set!');
          throw new Error('Starknet wallet initialization failed - no account available');
        }
        console.log('✅ DEBUG: Account successfully set:', account.address);
      } catch (error) {
        console.error('❌ Failed to initialize Starknet with wallet:', error);
        console.log('🔍 DEBUG: This error might be causing the wallet connection issue');

        // If Starknet initialization fails, don't mark the wallet as connected
        console.log('🔄 DEBUG: Resetting Starknet wallet connection due to initialization failure');
        setStarknetWalletConnected(false);
        setStarknetWalletAddress(null);
        setStarknetWalletType(null);

        // Show error to user
        alert(`Failed to connect ${type} wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return; // Exit early
      }

      // Fetch real Starknet balance when wallet connects
      if (address) {
        fetchStarknetBalance(address);
        fetchRawBtcBalance(address);
      }
      // Auto-fill the toAddress field when Starknet wallet connects (for BTC→Starknet direction)
      if (direction === 'btc-to-stark' && address) {
        setToAddress(address);
      }
      // Auto-fill the fromAddress field when Starknet wallet connects (for Starknet→BTC direction)
      if (direction === 'stark-to-btc' && address) {
        setFromAddress(address);
      }
    }

    // Close modal when both wallets are connected
    if ((isBitcoinWallet && starknetWalletConnected) || (isStarknetWallet && bitcoinWalletConnected)) {
      setIsWalletModalOpen(false);
    }
  };

  // Function to fetch real Bitcoin balance using mempool.space (Testnet4 for testnet)
  const fetchBitcoinBalance = async (address: string) => {
    try {
      const apiBase = networkMode === 'testnet'
        ? 'https://mempool.space/testnet4/api'
        : 'https://mempool.space/api';
      const response = await axios.get(`${apiBase}/address/${address}`, { timeout: 8000 });
      const data = response.data;
      // mempool.space: chain_stats.funded_txo_sum - chain_stats.spent_txo_sum (satoshis)
      const funded = data?.chain_stats?.funded_txo_sum || 0;
      const spent  = data?.chain_stats?.spent_txo_sum  || 0;
      const balanceInBTC = (funded - spent) / 1e8;
      setBitcoinBalance(balanceInBTC);
      console.log(`✅ Bitcoin ${networkMode} balance (mempool.space):`, balanceInBTC, 'BTC');
    } catch (error: any) {
      console.error(`❌ Failed to fetch Bitcoin balance:`, error);
      setBitcoinBalance(0);
    }
  };

  // Fetch rawBTC balance from the bridge contract (ERC20 balanceOf)
  const fetchRawBtcBalance = async (address: string) => {
    try {
      const BRIDGE_CONTRACT = '0x01ebd9b12b7477bd358ab10fd9ed0f00b1f2cf4d6dfaeb8881567906af8c16d9';
      // sn_keccak("balanceOf") = 0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e
      const resp = await axios.post('https://starknet-sepolia-rpc.publicnode.com', {
        jsonrpc: '2.0', method: 'starknet_call',
        params: [{
          contract_address: BRIDGE_CONTRACT,
          entry_point_selector: '0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e',
          calldata: [address],
        }, 'latest'],
        id: 1,
      }, { timeout: 8000 });
      const result = resp.data?.result;
      if (result && result[0]) {
        const sats = parseInt(result[0], 16);
        setRawBtcBalance(sats / 1e8); // convert satoshis to BTC
      }
    } catch {
      // silent — rawBTC balance is bonus info
    }
  };

  // Function to fetch real Starknet balance using multiple APIs for speed
  const fetchStarknetBalance = async (address: string) => {
    console.log(`🚀 Starting parallel Starknet ${networkMode} balance fetch for address:`, address);

    // Choose API endpoints based on network mode
    const isTestnet = networkMode === 'testnet';
    const apiCalls = [
      // Primary: Starkscan API (supports both mainnet and testnet)
      axios.get(`https://api${isTestnet ? '-testnet' : ''}.starkscan.co/api/v0/accounts/${address}`, { timeout: 5000 })
        .then(response => ({ source: 'starkscan', data: response.data }))
        .catch(error => ({ source: 'starkscan', error })),

      // Secondary: BlastAPI RPC (different endpoints for mainnet/testnet)
      axios.post(isTestnet
        ? 'https://api.cartridge.gg/x/starknet/sepolia'
        : 'https://api.cartridge.gg/x/starknet/mainnet', {
        jsonrpc: '2.0',
        method: 'starknet_getBalance',
        params: [address],
        id: 1
      }, { timeout: 3000 })
        .then(response => ({ source: 'blastapi', data: response.data }))
        .catch(error => ({ source: 'blastapi', error })),

      // Tertiary: Alternative public RPC endpoint
      axios.post(isTestnet
        ? 'https://api.cartridge.gg/x/starknet/sepolia'
        : 'https://api.cartridge.gg/x/starknet/mainnet', {
        jsonrpc: '2.0',
        method: 'starknet_call',
        params: [{
          contract_address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK contract
          entry_point_selector: '0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54bceaa',
          calldata: [address]
        }, 'latest']
      }, { timeout: 3000 })
        .then(response => ({ source: 'blastapi2', data: response.data }))
        .catch(error => ({ source: 'blastapi2', error }))
    ];

    try {
      // Race all API calls - use the first one that succeeds
      const results = await Promise.allSettled(apiCalls);
      console.log('📊 API race results:', results);

      // Process results and find the first successful one
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const apiResult = result.value;

          // Check if this result has data (not error)
          if ('data' in apiResult) {
            const { source, data } = apiResult;

            try {
              let balance = 0;

              switch (source) {
                case 'starkscan':
                  // Starkscan API structure
                  const balances = data?.account?.balances;
                  if (!balances || !Array.isArray(balances)) {
                    console.warn(`Starknet ${networkMode} API returned invalid balances format from starkscan. Skipping.`);
                    continue;
                  }
                  const starkscanBalance = Array.isArray(balances) ? balances.find((b: any) => b && b.contract_address === '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d')?.balance || 0 : 0;
                  balance = typeof starkscanBalance === 'string' ? parseFloat(starkscanBalance) : starkscanBalance;
                  balance = balance / Math.pow(10, 18); // Convert from wei
                  break;

                case 'blastapi':
                  // BlastAPI RPC response
                  if (data?.result && Array.isArray(data.result)) {
                    balance = parseInt(data.result[0], 16) || 0; // Convert from hex
                    balance = balance / Math.pow(10, 18); // Convert from wei
                  }
                  break;

                case 'blastapi2':
                  // Secondary BlastAPI response structure
                  if (data?.result && Array.isArray(data.result)) {
                    balance = parseInt(data.result[0], 16) || 0;
                    balance = balance / Math.pow(10, 18);
                  }
                  break;
              }

              if (!isNaN(balance) && (balance > 0 || balance === 0)) {
                setStarknetBalance(balance);
                console.log(`✅ Real Starknet ${networkMode} balance fetched from ${source}:`, balance, 'STRK for address:', address);
                return; // Exit after first successful fetch
              }
            } catch (parseError) {
              console.warn(`⚠️ Failed to parse ${source} response:`, parseError);
              continue; // Try next API
            }
          }
        }
      }

      // If we get here, all APIs failed
      console.error(`❌ All Starknet ${networkMode} API calls failed`);
      setStarknetBalance(0);
      console.warn(`⚠️ Could not fetch real Starknet ${networkMode} balance from any API. Using 0 as fallback.`);

    } catch (error) {
      console.error('❌ Critical error in Starknet balance fetching:', error);
      setStarknetBalance(0);
    }
  };

  const handleCloseWalletModal = () => {
    setIsWalletModalOpen(false);
  };

  // Function to refresh balances after transactions
  const refreshBalances = async () => {
    if (bitcoinWalletConnected && bitcoinWalletAddress) {
      await fetchBitcoinBalance(bitcoinWalletAddress);
    }
    if (starknetWalletConnected && starknetWalletAddress) {
      await fetchStarknetBalance(starknetWalletAddress);
      await fetchRawBtcBalance(starknetWalletAddress);
    }
  };



  const handleBridge = async () => {
    if (!fromAddress || fromAddress.trim() === '') {
      setBridgeError(`Please enter a valid ${direction === 'btc-to-stark' ? 'Bitcoin' : 'Starknet'} address`);
      return;
    }
    if (!toAddress || toAddress.trim() === '') {
      setBridgeError(`Please enter a valid ${direction === 'btc-to-stark' ? 'Starknet' : 'Bitcoin'} address`);
      return;
    }
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setBridgeError('Please enter a valid amount');
      return;
    }

    if (direction === 'btc-to-stark') {
      if (!bitcoinWalletConnected || !bitcoinWalletType)  { setBridgeError('Please connect a Bitcoin wallet to send BTC');      return; }
      if (!starknetWalletConnected)                        { setBridgeError('Please connect a Starknet wallet to receive STRK'); return; }
    } else {
      if (!starknetWalletConnected || !starknetWalletType) { setBridgeError('Please connect a Starknet wallet to send STRK');   return; }
      if (!bitcoinWalletConnected)                         { setBridgeError('Please connect a Bitcoin wallet to receive BTC');  return; }
    }

    setIsBridging(true);
    setBridgeError(null);
    setBridgeSuccess(null);

    const directionText  = direction === 'btc-to-stark' ? 'Bitcoin → Starknet' : 'Starknet → Bitcoin';
    const assetSent      = direction === 'btc-to-stark' ? 'BTC' : 'STRK';
    const assetReceived  = direction === 'btc-to-stark' ? 'STRK' : 'BTC';

    try {
      let txResult: any;

      if (direction === 'btc-to-stark') {
        // ── Step 1: send BTC via user's Bitcoin wallet ─────────────────────
        txResult = await bridgeBtcToToken(
          fromAmount,
          fromAddress,
          '0x0565cb1e49269921c02d4e0b4ffb741750d4d8bdf11e88a8d87fc622103929c3',
          (parseFloat(fromAmount) * 0.999).toString(),
          toAddress,
          { type: bitcoinWalletType!, address: bitcoinWalletAddress! }
        );

        const btcTxHash = txResult.btc_tx_hash;

        // ── Step 2: record as "pending" immediately ─────────────────────────
        addTransaction({
          type: 'Bridge', typeIcon: 'fas fa-bridge', typeClass: 'type-bridge',
          fromAsset: 'BTC',  fromAssetIcon: 'fab fa-bitcoin',     fromAssetClass: 'asset-btc',
          toAsset:   'STRK', toAssetIcon:   'fab fa-ethereum',    toAssetClass:   'asset-stark',
          fromNetwork: 'Bitcoin',  fromNetworkIcon: 'fab fa-bitcoin',     fromNetworkClass: 'network-btc',
          toNetwork:   'Starknet', toNetworkIcon:   'fab fa-layer-group', toNetworkClass:   'network-stark',
          amount: fromAmount + ' BTC',
          status: 'pending', statusClass: 'status-pending',
          walletAddress: fromAddress,
          txHash: btcTxHash,
          details: { direction, fromAddress, toAddress, sentAmount: fromAmount,
                     receivedAmount: txResult.amount_bridged, network: networkMode,
                     btcTxHash, starknetTxHash: null }
        });

        setBridgeSuccess('BTC sent! Releasing STRK to your wallet…');

        // ── Step 3: immediately release STRK — no BTC confirmation wait ────
        const releaseResp = await axios.post(`${BACKEND_URL}/bridges/manual-release`, {
          btcTxHash,
          amountBtc: parseFloat(fromAmount),
          toAddress,
        });

        const strkReleased = (parseFloat(fromAmount) * 10000).toFixed(0);
        if (releaseResp.data.status === 'completed' && releaseResp.data.mintTxHash) {
          const snTx = releaseResp.data.mintTxHash;
          updateTransaction(btcTxHash, {
            status: 'completed',
            statusClass: 'status-completed',
            details: { direction, fromAddress, toAddress, sentAmount: fromAmount,
                       receivedAmount: strkReleased, network: networkMode,
                       btcTxHash, starknetTxHash: snTx },
          });
          setBridgeSuccess(`Bridge complete! ${strkReleased} STRK sent to your Starknet wallet.\n\nStarknet tx: ${snTx}`);
          await refreshBalances();
          setTransactionDetails({
            direction, directionText, fromAddress, toAddress,
            sentAmount: fromAmount, receivedAmount: strkReleased,
            actualFee: txResult.fee, bitcoinFee, starknetFee,
            totalFees: parseFloat(txResult.fee || '0') + bitcoinFee + starknetFee,
            estimatedTime, network: networkMode,
            btcTxHash, starknetTxHash: snTx,
            txHash: btcTxHash, assetSent, assetReceived,
          });
          setShowTransactionPopup(true);
        } else {
          setBridgeError(`BTC sent but STRK release failed: ${releaseResp.data.error ?? 'unknown'}. BTC txHash: ${btcTxHash}`);
        }

        setIsBridging(false);

      } else {
        // ── Starknet → BTC ──────────────────────────────────────────────────
        txResult = await bridgeTokenToBtc(
          '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
          fromAmount,
          toAddress,
          (parseFloat(fromAmount) * 0.998).toString(),
          { type: starknetWalletType!, address: starknetWalletAddress! }
        );

        const starknetTxHash = txResult.transaction_hash || txResult.starknet_tx_hash;
        const bridgeId       = `bridge_${starknetTxHash?.slice(0, 16) ?? Date.now()}`;
        const actualFee      = parseFloat(txResult.fee || '0');
        const receivedAmount = parseFloat(txResult.amount_bridged || (parseFloat(fromAmount) - actualFee).toString());

        addTransaction({
          type: 'Bridge', typeIcon: 'fas fa-bridge', typeClass: 'type-bridge',
          fromAsset: 'STRK', fromAssetIcon: 'fab fa-ethereum',    fromAssetClass: 'asset-stark',
          toAsset:   'BTC',  toAssetIcon:   'fab fa-bitcoin',     toAssetClass:   'asset-btc',
          fromNetwork: 'Starknet', fromNetworkIcon: 'fab fa-layer-group', fromNetworkClass: 'network-stark',
          toNetwork:   'Bitcoin',  toNetworkIcon:   'fab fa-bitcoin',     toNetworkClass:   'network-btc',
          amount: fromAmount + ' STRK',
          status: 'pending', statusClass: 'status-pending',
          walletAddress: fromAddress,
          txHash: starknetTxHash ?? bridgeId,
          details: { direction, fromAddress, toAddress, sentAmount: fromAmount,
                     receivedAmount: receivedAmount.toFixed(6), network: networkMode, starknetTxHash }
        });

        try {
          await axios.post(`${BACKEND_URL}/bridges`, {
            id: bridgeId, direction, amount: fromAmount,
            fromAddress, toAddress, starknetTxHash,
          });
        } catch {
          console.warn('Backend offline — bridge registered locally only');
        }

        setBridgeSuccess('STRK burn submitted. The relayer will release BTC to your address shortly.');
        setTransactionDetails({
          direction, directionText, fromAddress, toAddress,
          sentAmount: fromAmount, receivedAmount: receivedAmount.toFixed(6),
          actualFee: actualFee.toFixed(6), bitcoinFee, starknetFee,
          totalFees: actualFee + bitcoinFee,
          estimatedTime, network: networkMode,
          btcTxHash: null, starknetTxHash,
          txHash: starknetTxHash ?? bridgeId, assetSent, assetReceived,
        });
        setShowTransactionPopup(true);
      }

    } catch (error: any) {
      console.error('Bridge error:', error);
      let errorMessage = 'Bridge transaction failed';
      let isUserCancel = false;

      if (error.message?.includes('cancel') || error.message?.includes('cancelled by user')) {
        errorMessage = 'Transaction cancelled.';
        isUserCancel = true;
      } else if (error.message?.includes('rejected')) {
        errorMessage = 'Transaction rejected by wallet.';
      } else if (error.message?.includes('insufficient')) {
        errorMessage = 'Insufficient balance for this transaction.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setBridgeError(errorMessage);

      if (!isUserCancel) {
        addTransaction({
          type: 'Bridge', typeIcon: 'fas fa-bridge', typeClass: 'type-bridge',
          fromAsset: direction === 'btc-to-stark' ? 'BTC' : 'STRK',
          fromAssetIcon: `fab fa-${direction === 'btc-to-stark' ? 'bitcoin' : 'ethereum'}`,
          fromAssetClass: `asset-${direction === 'btc-to-stark' ? 'btc' : 'stark'}`,
          toAsset: direction === 'btc-to-stark' ? 'STRK' : 'BTC',
          toAssetIcon: `fab fa-${direction === 'btc-to-stark' ? 'ethereum' : 'bitcoin'}`,
          toAssetClass: `asset-${direction === 'btc-to-stark' ? 'stark' : 'btc'}`,
          fromNetwork: direction === 'btc-to-stark' ? 'Bitcoin' : 'Starknet',
          fromNetworkIcon: `fab fa-${direction === 'btc-to-stark' ? 'bitcoin' : 'layer-group'}`,
          fromNetworkClass: `network-${direction === 'btc-to-stark' ? 'btc' : 'stark'}`,
          toNetwork: direction === 'btc-to-stark' ? 'Starknet' : 'Bitcoin',
          toNetworkIcon: `fab fa-${direction === 'btc-to-stark' ? 'layer-group' : 'bitcoin'}`,
          toNetworkClass: `network-${direction === 'btc-to-stark' ? 'stark' : 'btc'}`,
          amount: fromAmount + ' ' + assetSent,
          status: 'failed', statusClass: 'status-failed',
          walletAddress: fromAddress, txHash: 'failed',
          details: { direction, fromAddress, toAddress, error: error.message, network: networkMode }
        });
      }
    } finally {
      setIsBridging(false);
    }
  };
  return (
    <div className="container">
      <header>
        <div className="logo">
                <div className="logo-icon">
                    {/* <i className="fas fa-bridge"></i> */}
                    <img src="/image.png" alt="BitStark Logo" className="bitstarks-logo" />
                </div>
                <span>BitStark Bridge</span>
            </div>
        <nav>
          <ul>
            <li><a href="#" className="active"><i className="fas fa-bridge"></i> Bridge</a></li>
            <li><a href="/Transactions"><i className="fas fa-history"></i> Transactions</a></li>
            {/* <li><a href="/swap"><i className="fas fa-arrows-alt"></i> Swap</a></li> */}
            {/* <li><a href="/Lock-Unlock"><i className="fas fa-unlock"></i> Lock-Unlock</a></li> */}
          </ul>
        </nav>
        <button className={`wallet-connect ${bitcoinWalletConnected && starknetWalletConnected ? 'connected' : ''}`} onClick={handleConnectWallet}>
          <i className={`fas ${bitcoinWalletConnected && starknetWalletConnected ? 'fa-check' : 'fa-wallet'}`}></i>
          {bitcoinWalletConnected && starknetWalletConnected
            ? 'Wallets Connected'
            : bitcoinWalletConnected || starknetWalletConnected
            ? 'Connect Second Wallet'
            : 'Connect Wallets'}
        </button>
      </header>


      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={handleCloseWalletModal}
        onConnectWallet={handleWalletConnect}
        network={undefined}
        showSections={true}
        bitcoinNetwork={networkMode}
        key={`wallet-modal-${networkMode}-${Date.now()}`} // Force re-render when network changes
      />

      {/* Transaction Success Popup */}
      {showTransactionPopup && transactionDetails && (
        <div className="transaction-popup-overlay" onClick={() => setShowTransactionPopup(false)}>
          <div className="transaction-popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="transaction-popup-header">
              <div className="success-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <h2>Bridge Transaction Successful!</h2>
              <button className="close-popup" onClick={() => setShowTransactionPopup(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="transaction-popup-body">
              <div className="transaction-summary">
                <div className="summary-item">
                  <span className="summary-label">Direction:</span>
                  <span className="summary-value">{transactionDetails.directionText}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Sent:</span>
                  <span className="summary-value">{transactionDetails.sentAmount} {transactionDetails.assetSent}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Received:</span>
                  <span className="summary-value">{transactionDetails.receivedAmount} {transactionDetails.assetReceived}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Fee:</span>
                  <span className="summary-value">{transactionDetails.actualFee} {transactionDetails.assetSent}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Estimated Time:</span>
                  <span className="summary-value">{transactionDetails.estimatedTime}</span>
                </div>
              </div>

              <div className="transaction-details">
                <h3>Transaction Details</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">From Address:</span>
                    <span className="detail-value address">{transactionDetails.fromAddress}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">To Address:</span>
                    <span className="detail-value address">{transactionDetails.toAddress}</span>
                  </div>
                  {transactionDetails.txHash && (
                    <div className="detail-item">
                      <span className="detail-label">Transaction Hash:</span>
                      <span className="detail-value hash">{transactionDetails.txHash}</span>
                    </div>
                  )}
                  {transactionDetails.btcTxHash && (
                    <div className="detail-item">
                      <span className="detail-label">Bitcoin TX Hash:</span>
                      <span className="detail-value hash">{transactionDetails.btcTxHash}</span>
                    </div>
                  )}
                  {transactionDetails.starknetTxHash && (
                    <div className="detail-item">
                      <span className="detail-label">Starknet TX Hash:</span>
                      <span className="detail-value hash">{transactionDetails.starknetTxHash}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Network:</span>
                    <span className="detail-value">{transactionDetails.network === 'mainnet' ? 'Mainnet' : 'Testnet'}</span>
                  </div>
                </div>
              </div>

              <div className="transaction-actions">
                <button className="view-transactions-btn" onClick={() => {
                  setShowTransactionPopup(false);
                  // Could navigate to transactions page here
                }}>
                  View All Transactions
                </button>
                <button className="close-success-btn" onClick={() => setShowTransactionPopup(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="main-content">
          <div className="bridge-card">
          <div className="card-header">
            <h2 className="card-title">Bridge Assets</h2>
            <div className="direction-toggle">
              <div
                className={`toggle-option ${direction === 'btc-to-stark' ? 'toggle-active' : ''}`}
                onClick={() => handleDirectionToggle('btc-to-stark')}
              >
                Bitcoin → Starknet
              </div>
              <div
                className={`toggle-option ${direction === 'stark-to-btc' ? 'toggle-active' : ''}`}
                onClick={() => handleDirectionToggle('stark-to-btc')}
              >
                Starknet → Bitcoin
              </div>
            </div>
            <div className="network-mode-selector">
              <div className="mode-toggle">
                <div
                  className={`toggle-option ${networkMode === 'mainnet' ? 'toggle-active' : ''} ${isNetworkSwitching ? 'switching' : ''}`}
                  onClick={() => handleNetworkModeChange('mainnet')}
                >
                  {isNetworkSwitching && networkMode === 'testnet' ? 'Switching...' : 'Mainnet'}
                </div>
                <div
                  className={`toggle-option ${networkMode === 'testnet' ? 'toggle-active' : ''} ${isNetworkSwitching ? 'switching' : ''}`}
                  onClick={() => handleNetworkModeChange('testnet')}
                >
                  {isNetworkSwitching && networkMode === 'mainnet' ? 'Switching...' : 'Testnet'}
                </div>
              </div>
              {/* Network status indicator */}
              <div className="network-status">
                <small className="network-indicator">
                  {bitcoinWalletConnected || starknetWalletConnected
                    ? `Connected to ${networkMode === 'mainnet' ? 'Mainnet' : 'Testnet'}`
                    : 'No wallet connected'
                  }
                </small>
              </div>
            </div>
          </div>

          <div className="network-selector">
            <div className={`network-card ${direction === 'btc-to-stark' ? 'active' : ''}`}>
              <div className="network-icon bitcoin-icon">
                <i className="fab fa-bitcoin"></i>
              </div>
              <div className="network-name">Bitcoin</div>
              <div className="network-balance">
                Balance: {bitcoinWalletConnected && bitcoinBalance !== null
                  ? `${bitcoinBalance.toFixed(4)} BTC`
                  : '0.0000 BTC'}
              </div>
            </div>
            <div className={`network-card ${direction === 'stark-to-btc' ? 'active' : ''}`}>
              <div className="network-icon starknet-icon">
                <img src="/Starknet.png" alt="" className="starknet-logo-img" />
              </div>
              <div className="network-name">Starknet</div>
              <div className="network-balance">
                Balance: {starknetWalletConnected && starknetBalance !== null
                  ? `${starknetBalance.toFixed(4)} STRK`
                  : '0.0000 STRK'}
              </div>
            </div>
          </div>

          <form className="bridge-form" id="bridgeForm">
            <div className="form-group">
              <label htmlFor="fromAddress">
                From Address {direction === 'btc-to-stark' ? '(Bitcoin)' : '(Starknet)'}
              </label>
              <div className="address-input-container">
                <input
                  type="text"
                  id="fromAddress"
                  placeholder={
                    direction === 'btc-to-stark'
                      ? (bitcoinWalletConnected ? 'Bitcoin wallet address auto-filled' : 'Enter your Bitcoin wallet address')
                      : (starknetWalletConnected ? 'Starknet wallet address auto-filled' : 'Enter your Starknet wallet address')
                  }
                  autoComplete="off"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  readOnly={direction === 'btc-to-stark' ? bitcoinWalletConnected : starknetWalletConnected}
                />
               
              </div>
            </div>

            <div className="swap-button">
              <div className="swap-icon" onClick={handleSwap}>
                <i className="fas fa-arrow-up-down"></i>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="toAddress">
                To Address {direction === 'btc-to-stark' ? '(Starknet)' : '(Bitcoin)'}
              </label>
              <div className="address-input-container">
                <input
                  type="text"
                  id="toAddress"
                  placeholder={
                    direction === 'btc-to-stark'
                      ? (starknetWalletConnected ? 'Starknet wallet address auto-filled' : 'Enter your Starknet wallet address')
                      : (bitcoinWalletConnected ? 'Bitcoin wallet address auto-filled' : 'Enter your Bitcoin wallet address')
                  }
                  autoComplete="off"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  readOnly={direction === 'btc-to-stark' ? starknetWalletConnected : (direction === 'stark-to-btc' ? bitcoinWalletConnected : false)}
                />

              </div>
              <div className="address-info">
                <small className="address-hint" id="toAddressHint">
                  {direction === 'btc-to-stark'
                    ? 'Enter a valid StarkNet address for Bitcoin→Starknet transfers'
                    : 'Enter a valid Bitcoin address for Starknet→Bitcoin transfers'
                  }
                </small>
                <div className="address-validation" id="toAddressValidation"></div>
              </div>
            </div>

            <div className="amount-input">
              <div className="input-label">
                <span>You send</span>
                <span>
                  Max: {direction === 'btc-to-stark'
                    ? (bitcoinWalletConnected && bitcoinBalance !== null
                        ? `${bitcoinBalance.toFixed(4)} BTC`
                        : '0.0000 BTC')
                    : (starknetWalletConnected && starknetBalance !== null
                        ? `${starknetBalance.toFixed(4)} STRK`
                        : '0.0000 STRK')}
                </span>
              </div>
              <div className="input-container">
                <input
                  type="number"
                  className="amount-field"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => {
                    setFromAmount(e.target.value);
                    updateBridgeMetrics(direction, e.target.value);
                  }}
                />
                <button className="max-button" onClick={handleMax}>MAX</button>
                {(bitcoinWalletConnected || starknetWalletConnected) && (
                  <div className="fee-dropdown-container">
                    <div
                      className={`fee-dropdown-toggle ${showFeeDropdown ? 'active' : ''}`}
                      onClick={() => setShowFeeDropdown(!showFeeDropdown)}
                    >
                      <i className="fas fa-chevron-down"></i>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {toAmount && parseFloat(toAmount) > 0 && (
              <div className="amount-input" style={{ marginTop: '8px' }}>
                <div className="input-label">
                  <span>You receive (estimated)</span>
                </div>
                <div className="input-container">
                  <input type="text" className="amount-field" value={toAmount} readOnly />
                  <span style={{ padding: '0 12px', alignSelf: 'center', fontWeight: 600 }}>
                    {direction === 'btc-to-stark' ? 'STRK' : 'BTC'}
                  </span>
                </div>
              </div>
            )}
          </form>

          {showFeeDropdown && (bitcoinWalletConnected || starknetWalletConnected) && (
            <div className="fee-dropdown-expanded">
              <div className="info-cards">
                <div className="info-card">
                  <div className="info-title">Bridge Fee</div>
                  <div className="info-value">{bridgeFee.toFixed(6)} BTC</div>
                </div>
                <div className="info-card">
                  <div className="info-title">Bitcoin Network Fee</div>
                  <div className="info-value">{bitcoinFee.toFixed(6)} BTC</div>
                </div>
                <div className="info-card">
                  <div className="info-title">Starknet Network Fee</div>
                  <div className="info-value">{starknetFee.toFixed(6)} STRK</div>
                </div>
                <div className="info-card">
                  <div className="info-title">Estimated Time</div>
                  <div className="info-value">{estimatedTime}</div>
                </div>
              </div>
            </div>
          )}

          {bridgeSuccess && (
            <div className="success-message" style={{ color: 'green', marginBottom: '10px', textAlign: 'center' }}>
              {bridgeSuccess}
            </div>
          )}
          {bridgeError && (
            <div className="error-message" style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>
              {bridgeError}
            </div>
          )}
          <button
            className="bridge-button"
            onClick={handleBridge}
            disabled={isBridging || !fromAddress || !toAddress || !fromAmount || parseFloat(fromAmount) <= 0}
          >
            {isBridging ? 'Bridging...' : 'Bridge Now'}
          </button>
        </div>

        <div className="transaction-history">
          <div className="history-header">
            <h2 className="history-title">Recent Transactions</h2>
            <a href="/Transactions" className="view-all">View All</a>
          </div>
          <div className="transaction-list">
            {(Array.isArray(transactions) ? transactions.slice(0, 4) : []).map((tx) => (
              <div key={tx.id} className="transaction-item">
                <div className="transaction-info">
                  <div className={`transaction-icon ${tx.fromNetworkClass || 'network-btc'}`}>
                    <i className={tx.fromNetworkIcon || 'fas fa-layer-group'}></i>
                  </div>
                  <div className="transaction-details">
                    <h4>{tx.fromNetwork || 'Unknown'} to {tx.toNetwork || 'Unknown'}</h4>
                    <p>{tx.date || 'Unknown date'}</p>
                  </div>
                </div>
                <div className="transaction-amount">
                  {tx.amount || '0'}
                </div>
                <div className={`status ${tx.statusClass ? tx.statusClass.split('-')[1] : 'pending'}`}>
                  {tx.status || 'pending'}
                </div>
              </div>
            ))}
            {(!Array.isArray(transactions) || transactions.length === 0) && (
              <div className="no-transactions">
                <p>No transactions yet. Connect your wallet and make a bridge transaction to see your history here.</p>
              </div>
            )}
          </div>
          </div>
        </div>

      <footer>
        <p>© 2025 BitStark Bridge. All rights reserved. Use at your own risk.</p>
      </footer>
    </div>
  );
}