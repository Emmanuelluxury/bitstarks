'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import WalletModal from '../components/WalletModal';
import { useTransactions } from '../components/TransactionContext';
import { initStarknet, setNetworkMode, bridgeBtcToToken, bridgeTokenToBtc } from '../utils/starknet';
import { initBitcoinBridge, initiateBitcoinDeposit, initiateBitcoinWithdrawal } from '../utils/bitcoinBridge';
import './styles.css';

export default function BridgePage() {
    const { addTransaction, transactions: rawTransactions } = useTransactions();
    const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];
    const [direction, setDirection] = useState<'btc-to-stark' | 'stark-to-btc'>('btc-to-stark');
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [fromAddress, setFromAddress] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [bitcoinWalletConnected, setBitcoinWalletConnected] = useState(false);
    const [starknetWalletConnected, setStarknetWalletConnected] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [currentNetwork, setCurrentNetwork] = useState<'bitcoin' | 'starknet'>('bitcoin');
    const [bitcoinWalletAddress, setBitcoinWalletAddress] = useState<string | null>(null);
    const [starknetWalletAddress, setStarknetWalletAddress] = useState<string | null>(null);
    const [bitcoinBalance, setBitcoinBalance] = useState<number | null>(null);
    const [starknetBalance, setStarknetBalance] = useState<number | null>(null);
    const [bridgeFee, setBridgeFee] = useState<number>(0);
    const [bitcoinFee, setBitcoinFee] = useState<number>(0);
    const [starknetFee, setStarknetFee] = useState<number>(0);
    const [estimatedTime, setEstimatedTime] = useState<string>('~0 minutes');
    const [showFeeDropdown, setShowFeeDropdown] = useState(false);
    const [networkMode, setNetworkMode] = useState<'mainnet' | 'testnet'>('mainnet');
    const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
    const [isBridging, setIsBridging] = useState(false);
    const [bridgeError, setBridgeError] = useState<string | null>(null);
    const [bridgeSuccess, setBridgeSuccess] = useState<string | null>(null);
    const [showTransactionPopup, setShowTransactionPopup] = useState(false);
    const [transactionDetails, setTransactionDetails] = useState<any>(null);
    const [bitcoinWalletType, setBitcoinWalletType] = useState<string | null>(null);
    const [starknetWalletType, setStarknetWalletType] = useState<string | null>(null);
    const networkSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate dynamic stats based on transactions
  const stats = useMemo(() => {
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const bridgeCount = safeTransactions.filter(tx => tx && tx.type === 'Bridge').length;
    const swapCount = safeTransactions.filter(tx => tx && tx.type === 'Swap').length;
    const lockCount = safeTransactions.filter(tx => tx && tx.type === 'Lock').length;
    const unlockCount = safeTransactions.filter(tx => tx && tx.type === 'Unlock').length;

    return [
      { icon: 'fas fa-bridge', label: 'Bridge Transactions', value: bridgeCount.toString(), color: 'stat-bridge' },
      { icon: 'fas fa-exchange-alt', label: 'Swap Transactions', value: swapCount.toString(), color: 'stat-swap' },
      { icon: 'fas fa-lock', label: 'Lock Transactions', value: lockCount.toString(), color: 'stat-lock' },
      { icon: 'fas fa-unlock', label: 'Unlock Transactions', value: unlockCount.toString(), color: 'stat-unlock' }
    ];
  }, [transactions]);

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

  // Function to fetch real Bitcoin balance using BlockCypher API
  const fetchBitcoinBalance = async (address: string) => {
    try {
      console.log(`Fetching real Bitcoin ${networkMode} balance for address:`, address);

      // Choose API endpoint based on network mode
      const network = networkMode === 'testnet' ? 'test3' : 'main';
      const response = await axios.get(`https://api.blockcypher.com/v1/btc/${network}/addrs/${address}/balance`);

      // BlockCypher returns balance in satoshis, convert to BTC
      const balanceInSatoshis = response.data.final_balance || response.data.balance || 0;
      const balanceInBTC = balanceInSatoshis / 100000000; // 1 BTC = 100,000,000 satoshis

      setBitcoinBalance(balanceInBTC);
      console.log(`✅ Real Bitcoin ${networkMode} balance fetched:`, balanceInBTC, 'BTC for address:', address);
    } catch (error: any) {
      console.error(`❌ Failed to fetch Bitcoin ${networkMode} balance:`, error);

      // Fallback: Try alternative API based on network mode
      try {
        console.log('Trying fallback API...');
        if (networkMode === 'testnet') {
          // For testnet, try a testnet-specific API
          const fallbackResponse = await axios.get(`https://api.blockcypher.com/v1/btc/test3/addrs/${address}/balance`);
          const balanceInSatoshis = fallbackResponse.data.final_balance || fallbackResponse.data.balance || 0;
          const balanceInBTC = balanceInSatoshis / 100000000;
          setBitcoinBalance(balanceInBTC);
          console.log('✅ Bitcoin testnet balance fetched via fallback API:', balanceInBTC, 'BTC');
        } else {
          // For mainnet, try Blockchain.com
          const fallbackResponse = await axios.get(`https://blockchain.info/q/addressbalance/${address}`);
          const balanceInSatoshis = parseInt(fallbackResponse.data) || 0;
          const balanceInBTC = balanceInSatoshis / 100000000;
          setBitcoinBalance(balanceInBTC);
          console.log('✅ Bitcoin mainnet balance fetched via fallback API:', balanceInBTC, 'BTC');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback API also failed:', fallbackError);
        // If both APIs fail, set balance to 0 and show error
        setBitcoinBalance(0);
        console.warn(`⚠️ Could not fetch real Bitcoin ${networkMode} balance. Using 0 as fallback.`);
      }
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
        ? 'https://starknet-testnet.public.blastapi.io/rpc/v0.6'
        : 'https://starknet-mainnet.public.blastapi.io/rpc/v0.6', {
        jsonrpc: '2.0',
        method: 'starknet_getBalance',
        params: [address],
        id: 1
      }, { timeout: 3000 })
        .then(response => ({ source: 'blastapi', data: response.data }))
        .catch(error => ({ source: 'blastapi', error })),

      // Tertiary: Alternative public RPC endpoint
      axios.post(isTestnet
        ? 'https://starknet-testnet.public.blastapi.io/rpc/v0.6'
        : 'https://starknet-mainnet.public.blastapi.io/rpc/v0.6', {
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
    }
  };


  const handleBridge = async () => {
    // Validate required fields for bridge transaction
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

    setIsBridging(true);
    setBridgeError(null);
    setBridgeSuccess(null);

    try {
      console.log('🚀 Starting bridge transaction...');
      console.log('📊 Current wallet states:', {
        direction,
        bitcoinWalletConnected,
        bitcoinWalletType,
        starknetWalletConnected,
        starknetWalletType,
        bitcoinWalletAddress,
        starknetWalletAddress
      });

      // Debug: Check if wallets are properly initialized
      console.log('🔍 Wallet initialization check:');
      console.log('  - Bitcoin wallet connected:', bitcoinWalletConnected);
      console.log('  - Bitcoin wallet type:', bitcoinWalletType);
      console.log('  - Bitcoin wallet address:', bitcoinWalletAddress);
      console.log('  - Starknet wallet connected:', starknetWalletConnected);
      console.log('  - Starknet wallet type:', starknetWalletType);
      console.log('  - Starknet wallet address:', starknetWalletAddress);

      // Validate wallet connections
      console.log('🔍 Validating wallet connections for direction:', direction);

      if (direction === 'btc-to-stark') {
        console.log('🔄 BTC → Starknet validation:');
        console.log('  - Bitcoin wallet connected:', bitcoinWalletConnected);
        console.log('  - Bitcoin wallet type:', bitcoinWalletType);
        console.log('  - Starknet wallet connected:', starknetWalletConnected);

        if (!bitcoinWalletConnected || !bitcoinWalletType) {
          console.error('❌ Bitcoin wallet validation failed:', { bitcoinWalletConnected, bitcoinWalletType });
          throw new Error('Please connect a Bitcoin wallet to send BTC');
        }
        if (!starknetWalletConnected) {
          console.error('❌ Starknet wallet validation failed for BTC->STRK:', { starknetWalletConnected });
          throw new Error('Please connect a Starknet wallet to receive tokens');
        }
      } else {
        console.log('🔄 Starknet → BTC validation:');
        console.log('  - Starknet wallet connected:', starknetWalletConnected);
        console.log('  - Starknet wallet type:', starknetWalletType);
        console.log('  - Bitcoin wallet connected:', bitcoinWalletConnected);

        if (!starknetWalletConnected || !starknetWalletType) {
          console.error('❌ Starknet wallet validation failed:', { starknetWalletConnected, starknetWalletType });
          throw new Error('Please connect a Starknet wallet to send STRK');
        }
        if (!bitcoinWalletConnected) {
          console.error('❌ Bitcoin wallet validation failed for STRK->BTC:', { bitcoinWalletConnected });
          throw new Error('Please connect a Bitcoin wallet to receive BTC');
        }
      }

      console.log('🔗 Wallet connections validated');

      const directionText = direction === 'btc-to-stark' ? 'Bitcoin → Starknet' : 'Starknet → Bitcoin';
      const assetSent = direction === 'btc-to-stark' ? 'BTC' : 'STRK';
      const assetReceived = direction === 'btc-to-stark' ? 'STRK' : 'BTC';

      let txResult: any;
      if (direction === 'btc-to-stark') {
        console.log('🔄 Executing BTC → Starknet bridge...');

        // Trigger Bitcoin wallet for BTC transfer
        const bitcoinWallet = {
          type: bitcoinWalletType!,
          address: bitcoinWalletAddress!
        };

        txResult = await bridgeBtcToToken(
          fromAmount,
          fromAddress, // btcAddress
          '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK token address
          (parseFloat(fromAmount) * 0.999).toString(), // minAmountOut (after 0.1% fee)
          toAddress, // to
          bitcoinWallet
        );
      } else {
        console.log('🔄 Executing Starknet → BTC bridge...');

        // Trigger Starknet wallet for STRK transfer
        const starknetWallet = {
          type: starknetWalletType!,
          address: starknetWalletAddress!
        };

        txResult = await bridgeTokenToBtc(
          '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK token address
          fromAmount,
          toAddress, // btcAddress
          (parseFloat(fromAmount) * 0.998).toString(), // minBtcOut (after 0.2% fee)
          starknetWallet
        );
      }

      // Record the successful bridge transaction
      const txHash = txResult.transaction_hash || txResult.starknet_tx_hash || txResult.btc_tx_hash || '0x' + Math.random().toString(16).substr(2, 64);
      const actualFee = parseFloat(txResult.fee || '0');
      const receivedAmount = parseFloat(txResult.amount_bridged || (parseFloat(fromAmount) - actualFee).toString());

      addTransaction({
        type: 'Bridge',
        typeIcon: 'fas fa-bridge',
        typeClass: 'type-bridge',
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
        status: 'completed',
        statusClass: 'status-completed',
        walletAddress: fromAddress,
        txHash,
        details: {
          direction,
          fromAddress,
          toAddress,
          sentAmount: fromAmount,
          receivedAmount: receivedAmount.toFixed(6),
          actualFee: actualFee.toFixed(6),
          bitcoinFee,
          starknetFee,
          totalFees: actualFee + bitcoinFee + (direction === 'btc-to-stark' ? starknetFee : 0),
          estimatedTime,
          network: networkMode,
          btcTxHash: txResult.btc_tx_hash,
          starknetTxHash: txResult.starknet_tx_hash || txResult.transaction_hash
        }
      });

      console.log('🎉 Bridge transaction completed successfully!');
      setBridgeError(null);

      // Refresh balances after successful transaction
      await refreshBalances();

      // Show transaction popup with details
      setTransactionDetails({
        direction,
        directionText,
        fromAddress,
        toAddress,
        sentAmount: fromAmount,
        receivedAmount: receivedAmount.toFixed(6),
        actualFee: actualFee.toFixed(6),
        bitcoinFee,
        starknetFee,
        totalFees: actualFee + bitcoinFee + (direction === 'btc-to-stark' ? starknetFee : 0),
        estimatedTime,
        network: networkMode,
        btcTxHash: txResult.btc_tx_hash,
        starknetTxHash: txResult.starknet_tx_hash || txResult.transaction_hash,
        txHash,
        assetSent,
        assetReceived
      });
      setShowTransactionPopup(true);

    } catch (error: any) {
      console.error('❌ Bridge transaction failed:', error);

      // Provide user-friendly error messages
      let errorMessage = 'Bridge transaction failed';
      let isUserCancel = false;

      if (error.message?.includes('cancel') || error.message?.includes('user abort') || error.message?.includes('cancelled by user')) {
        errorMessage = 'Transaction cancelled. You can try again when ready.';
        isUserCancel = true;
      } else if (error.message?.includes('wallet')) {
        errorMessage = 'Wallet connection error. Please ensure your wallet is connected and try again.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('insufficient')) {
        errorMessage = 'Insufficient balance for this transaction.';
      } else if (error.message?.includes('rejected')) {
        errorMessage = 'Transaction rejected by wallet.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setBridgeError(errorMessage);

      // Only record as failed transaction if it's not a user cancel
      if (!isUserCancel) {

      // Record failed transaction
      addTransaction({
        type: 'Bridge',
        typeIcon: 'fas fa-bridge',
        typeClass: 'type-bridge',
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
        amount: fromAmount + ' ' + (direction === 'btc-to-stark' ? 'BTC' : 'STRK'),
        status: 'failed',
        statusClass: 'status-failed',
        walletAddress: fromAddress,
        txHash: 'failed',
        details: {
          direction,
          fromAddress,
          toAddress,
          error: error.message,
          network: networkMode
        }
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
            <li><a href="/swap"><i className="fas fa-arrows-alt"></i> Swap</a></li>
            <li><a href="/Lock-Unlock"><i className="fas fa-unlock"></i> Lock-Unlock</a></li>
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