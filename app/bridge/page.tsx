'use client';

import { useState, useMemo } from 'react';
import axios from 'axios';
import WalletModal from '../components/WalletModal';
import { useTransactions } from '../components/TransactionContext';
import './styles.css';

export default function BridgePage() {
    const { addTransaction, transactions } = useTransactions();
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
    const [activeTab, setActiveTab] = useState<'bridge' | 'liquidity'>('bridge');
    const [showLiquidityModal, setShowLiquidityModal] = useState(false);
    const [selectedPool, setSelectedPool] = useState<any>(null);
    const [liquidityAction, setLiquidityAction] = useState<'add' | 'remove'>('add');
    const [liquidityAmount, setLiquidityAmount] = useState('');
    const [token0Amount, setToken0Amount] = useState('');
    const [token1Amount, setToken1Amount] = useState('');

  // Calculate dynamic stats based on transactions
  const stats = useMemo(() => {
    const bridgeCount = transactions.filter(tx => tx.type === 'Bridge').length;
    const swapCount = transactions.filter(tx => tx.type === 'Swap').length;
    const lockCount = transactions.filter(tx => tx.type === 'Lock').length;
    const unlockCount = transactions.filter(tx => tx.type === 'Unlock').length;

    return [
      { icon: 'fas fa-bridge', label: 'Bridge Transactions', value: bridgeCount.toString(), color: 'stat-bridge' },
      { icon: 'fas fa-exchange-alt', label: 'Swap Transactions', value: swapCount.toString(), color: 'stat-swap' },
      { icon: 'fas fa-lock', label: 'Lock Transactions', value: lockCount.toString(), color: 'stat-lock' },
      { icon: 'fas fa-unlock', label: 'Unlock Transactions', value: unlockCount.toString(), color: 'stat-unlock' }
    ];
  }, [transactions]);

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
    const maxAmountStr = maxAmount.toFixed(4);
    setFromAmount(maxAmountStr);
    const toAmount = maxAmount - bridgeFee;
    setToAmount(toAmount.toFixed(4));
    updateBridgeMetrics(direction, maxAmountStr);
  };

  const handleConnectWallet = () => {
    setIsWalletModalOpen(true);
  };

  const handleWalletConnect = (type: string, address?: string) => {
    console.log('Connecting wallet:', type, 'Address:', address);

    // Determine wallet type based on the wallet name
    const isBitcoinWallet = ['xverse', 'unisat', 'phantom', 'trustwallet'].includes(type.toLowerCase());
    const isStarknetWallet = ['ready', 'braavos', 'metamask'].includes(type.toLowerCase());

    if (isBitcoinWallet) {
      setBitcoinWalletConnected(true);
      setBitcoinWalletAddress(address || null);
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
      setStarknetWalletConnected(true);
      setStarknetWalletAddress(address || null);
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
          contract_address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH contract
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
                  const starkscanBalance = data?.account?.balances?.find((b: any) => b.contract_address === '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7')?.balance || 0;
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
                console.log(`✅ Real Starknet ${networkMode} balance fetched from ${source}:`, balance, 'ETH for address:', address);
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

  const openLiquidityModal = (pool: any, action: 'add' | 'remove') => {
    setSelectedPool(pool);
    setLiquidityAction(action);
    setShowLiquidityModal(true);
    setLiquidityAmount('');
    setToken0Amount('');
    setToken1Amount('');
  };

  const closeLiquidityModal = () => {
    setShowLiquidityModal(false);
    setSelectedPool(null);
    setLiquidityAmount('');
    setToken0Amount('');
    setToken1Amount('');
  };

  const handleLiquidityAmountChange = (value: string) => {
    setLiquidityAmount(value);
    const numValue = parseFloat(value) || 0;

    if (selectedPool && liquidityAction === 'add') {
      // Calculate proportional token amounts for adding liquidity
      const totalLiquidity = 1000000; // Mock total liquidity
      const userShare = numValue / totalLiquidity;

      // Mock token ratios (in a real app, this would come from the pool contract)
      const token0Ratio = 0.6; // 60% of pool
      const token1Ratio = 0.4; // 40% of pool

      setToken0Amount((userShare * token0Ratio * totalLiquidity).toFixed(6));
      setToken1Amount((userShare * token1Ratio * totalLiquidity).toFixed(6));
    }
  };

  const handleTokenAmountChange = (tokenIndex: 0 | 1, value: string) => {
    const numValue = parseFloat(value) || 0;

    if (tokenIndex === 0) {
      setToken0Amount(value);
      // Calculate token1 amount based on pool ratio
      const ratio = 0.4 / 0.6; // token1/token0 ratio
      setToken1Amount((numValue * ratio).toFixed(6));
    } else {
      setToken1Amount(value);
      // Calculate token0 amount based on pool ratio
      const ratio = 0.6 / 0.4; // token0/token1 ratio
      setToken0Amount((numValue * ratio).toFixed(6));
    }
  };

  const handleLiquiditySubmit = () => {
    if (!selectedPool || (!bitcoinWalletConnected && !starknetWalletConnected)) {
      alert('Please connect your wallet first');
      return;
    }

    if (liquidityAction === 'add') {
      if (!token0Amount || !token1Amount) {
        alert('Please enter amounts for both tokens');
        return;
      }

      // Add liquidity transaction
      addTransaction({
        type: 'Bridge',
        typeIcon: 'fas fa-water',
        typeClass: 'type-bridge',
        fromAsset: selectedPool.token0,
        fromAssetIcon: selectedPool.token0Icon,
        fromAssetClass: `asset-${selectedPool.token0.toLowerCase()}`,
        toAsset: selectedPool.token1,
        toAssetIcon: selectedPool.token1Icon,
        toAssetClass: `asset-${selectedPool.token1.toLowerCase()}`,
        fromNetwork: 'Liquidity Pool',
        fromNetworkIcon: 'fas fa-water',
        fromNetworkClass: 'network-bridge',
        toNetwork: selectedPool.name,
        toNetworkIcon: 'fas fa-layer-group',
        toNetworkClass: 'network-bridge',
        amount: `${token0Amount} ${selectedPool.token0} + ${token1Amount} ${selectedPool.token1}`,
        status: 'completed',
        statusClass: 'status-completed',
        walletAddress: bitcoinWalletAddress || starknetWalletAddress || '0x' + Math.random().toString(16).substr(2, 40),
        txHash: '0x' + Math.random().toString(16).substr(2, 64),
        details: {
          action: 'add_liquidity',
          pool: selectedPool.name,
          token0Amount,
          token1Amount,
          lpTokens: (parseFloat(token0Amount) * 0.1).toString() // Mock LP tokens received
        }
      });

      alert(`Successfully added liquidity to ${selectedPool.name} pool!`);
    } else {
      // Remove liquidity logic would go here
      alert('Remove liquidity functionality coming soon!');
    }

    closeLiquidityModal();
  };

  const handleBridge = () => {
    if (!bitcoinWalletConnected || !starknetWalletConnected) {
      handleConnectWallet();
      return;
    }

    // Record the bridge transaction
    const walletAddress = direction === 'btc-to-stark' ? bitcoinWalletAddress : starknetWalletAddress;
    if (walletAddress) {
      addTransaction({
        type: 'Bridge',
        typeIcon: 'fas fa-bridge',
        typeClass: 'type-bridge',
        fromAsset: direction === 'btc-to-stark' ? 'BTC' : 'tBTC',
        fromAssetIcon: direction === 'btc-to-stark' ? 'fab fa-bitcoin' : 'fas fa-layer-group',
        fromAssetClass: direction === 'btc-to-stark' ? 'asset-btc' : 'asset-stark',
        toAsset: direction === 'btc-to-stark' ? 'tBTC' : 'BTC',
        toAssetIcon: direction === 'btc-to-stark' ? 'fas fa-layer-group' : 'fab fa-bitcoin',
        toAssetClass: direction === 'btc-to-stark' ? 'asset-stark' : 'asset-btc',
        fromNetwork: direction === 'btc-to-stark' ? 'Bitcoin' : 'Starknet',
        fromNetworkIcon: direction === 'btc-to-stark' ? 'fab fa-bitcoin' : 'fas fa-layer-group',
        fromNetworkClass: direction === 'btc-to-stark' ? 'network-btc' : 'network-stark',
        toNetwork: direction === 'btc-to-stark' ? 'Starknet' : 'Bitcoin',
        toNetworkIcon: direction === 'btc-to-stark' ? 'fas fa-layer-group' : 'fab fa-bitcoin',
        toNetworkClass: direction === 'btc-to-stark' ? 'network-stark' : 'network-btc',
        amount: fromAmount + ' ' + (direction === 'btc-to-stark' ? 'BTC' : 'tBTC'),
        status: 'completed',
        statusClass: 'status-completed',
        walletAddress,
        txHash: '0x' + Math.random().toString(16).substr(2, 64),
        details: {
          direction,
          fee: bridgeFee,
          bitcoinFee,
          starknetFee,
          totalFees: bridgeFee + bitcoinFee + (direction === 'btc-to-stark' ? starknetFee : 0),
          estimatedTime
        }
      });
    }

    // Bridge logic here
    console.log('Bridging:', fromAmount);
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

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'bridge' ? 'active' : ''}`}
          onClick={() => setActiveTab('bridge')}
        >
          <i className="fas fa-bridge"></i> Bridge
        </button>
        <button
          className={`tab-button ${activeTab === 'liquidity' ? 'active' : ''}`}
          onClick={() => setActiveTab('liquidity')}
        >
          <i className="fas fa-water"></i> Liquidity
        </button>
      </div>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={handleCloseWalletModal}
        onConnectWallet={handleWalletConnect}
        network={undefined}
        showSections={true}
      />

      {activeTab === 'bridge' && (
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
                  : '0.0020 BTC'}
              </div>
            </div>
            <div className={`network-card ${direction === 'stark-to-btc' ? 'active' : ''}`}>
              <div className="network-icon starknet-icon">
                <img src="/Starknet.png" alt="" className="starknet-logo-img" />
              </div>
              <div className="network-name">Starknet</div>
              <div className="network-balance">
                Balance: {starknetWalletConnected && starknetBalance !== null
                  ? `${starknetBalance.toFixed(4)} STAK`
                  : '0.0030 STAK'}
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
                        : '0.0020 BTC')
                    : (starknetWalletConnected && starknetBalance !== null
                        ? `${starknetBalance.toFixed(4)} STAK`
                        : '0.0030 STAK')}
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
                  <div className="info-value">{starknetFee.toFixed(6)} ETH</div>
                </div>
                <div className="info-card">
                  <div className="info-title">Estimated Time</div>
                  <div className="info-value">{estimatedTime}</div>
                </div>
              </div>
            </div>
          )}

          <button className="bridge-button" onClick={handleBridge} disabled={!bitcoinWalletConnected || !starknetWalletConnected}>
            Bridge Now
          </button>
        </div>

        <div className="transaction-history">
          <div className="history-header">
            <h2 className="history-title">Recent Transactions</h2>
            <a href="/Transactions" className="view-all">View All</a>
          </div>
          <div className="transaction-list">
            {transactions.slice(0, 4).map((tx) => (
              <div key={tx.id} className="transaction-item">
                <div className="transaction-info">
                  <div className={`transaction-icon ${tx.fromNetworkClass}`}>
                    <i className={tx.fromNetworkIcon}></i>
                  </div>
                  <div className="transaction-details">
                    <h4>{tx.fromNetwork} to {tx.toNetwork}</h4>
                    <p>{tx.date}</p>
                  </div>
                </div>
                <div className="transaction-amount">
                  {tx.amount}
                </div>
                <div className={`status ${tx.statusClass.split('-')[1]}`}>
                  {tx.status}
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="no-transactions">
                <p>No transactions yet. Connect your wallet and make a bridge transaction to see your history here.</p>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {activeTab === 'liquidity' && (
        <div className="liquidity-content">
          <div className="liquidity-header">
            <h1 className="liquidity-title">Liquidity Pools</h1>
            <p className="liquidity-subtitle">Provide liquidity and earn rewards across multiple chains</p>
          </div>

          <div className="liquidity-stats">
            <div className="stat-card">
              <div className="stat-icon stat-bridge">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="stat-value">$2.4M</div>
              <div className="stat-label">Total Value Locked</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-swap">
                <i className="fas fa-coins"></i>
              </div>
              <div className="stat-value">12</div>
              <div className="stat-label">Active Pools</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-lock">
                <i className="fas fa-percentage"></i>
              </div>
              <div className="stat-value">15-25%</div>
              <div className="stat-label">APR Range</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-unlock">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-value">1,247</div>
              <div className="stat-label">Liquidity Providers</div>
            </div>
          </div>

          <div className="pools-grid">
            <div className="pool-card">
              <div className="pool-header">
                <div className="pool-tokens">
                  <div className="token-icon-small btc-icon">
                    <i className="fab fa-bitcoin"></i>
                  </div>
                  <div className="token-icon-small stark-icon">
                    <i className="fas fa-layer-group"></i>
                  </div>
                </div>
                <div className="pool-name">
                  <h3>BTC/tBTC</h3>
                  <span className="pool-type">Bridge Pool</span>
                </div>
              </div>
              <div className="pool-stats">
                <div className="pool-stat">
                  <span className="stat-label">TVL</span>
                  <span className="stat-value">$2.1M</span>
                </div>
                <div className="pool-stat">
                  <span className="stat-label">Volume 24h</span>
                  <span className="stat-value">$89.4K</span>
                </div>
                <div className="pool-stat">
                  <span className="stat-label">APR</span>
                  <span className="stat-value">24.2%</span>
                </div>
              </div>
              <div className="pool-actions">
                <button className="add-liquidity-btn" onClick={() => openLiquidityModal({
                  name: 'BTC/tBTC',
                  token0: 'BTC',
                  token1: 'tBTC',
                  token0Icon: 'fab fa-bitcoin',
                  token1Icon: 'fas fa-layer-group'
                }, 'add')}>Add Liquidity</button>
                <button className="remove-liquidity-btn" onClick={() => openLiquidityModal({
                  name: 'BTC/tBTC',
                  token0: 'BTC',
                  token1: 'tBTC',
                  token0Icon: 'fab fa-bitcoin',
                  token1Icon: 'fas fa-layer-group'
                }, 'remove')}>Remove</button>
              </div>
            </div>

            <div className="pool-card">
              <div className="pool-header">
                <div className="pool-tokens">
                  <div className="token-icon-small stark-icon">
                    <i className="fas fa-layer-group"></i>
                  </div>
                  <div className="token-icon-small btc-icon">
                    <i className="fab fa-bitcoin"></i>
                  </div>
                </div>
                <div className="pool-name">
                  <h3>tBTC/BTC</h3>
                  <span className="pool-type">Reverse Bridge</span>
                </div>
              </div>
              <div className="pool-stats">
                <div className="pool-stat">
                  <span className="stat-label">TVL</span>
                  <span className="stat-value">$1.8M</span>
                </div>
                <div className="pool-stat">
                  <span className="stat-label">Volume 24h</span>
                  <span className="stat-value">$67.1K</span>
                </div>
                <div className="pool-stat">
                  <span className="stat-label">APR</span>
                  <span className="stat-value">21.8%</span>
                </div>
              </div>
              <div className="pool-actions">
                <button className="add-liquidity-btn" onClick={() => openLiquidityModal({
                  name: 'tBTC/BTC',
                  token0: 'tBTC',
                  token1: 'BTC',
                  token0Icon: 'fas fa-layer-group',
                  token1Icon: 'fab fa-bitcoin',
                  className: 'heal'
                }, 'add')}>Add Liquidity</button>
                <button className="remove-liquidity-btn" onClick={() => openLiquidityModal({
                  name: 'tBTC/BTC',
                  token0: 'tBTC',
                  token1: 'BTC',
                  token0Icon: 'fas fa-layer-group',
                  token1Icon: 'fab fa-bitcoin',
                  className: 'heal'
                }, 'remove')}>Remove</button>
              </div>
            </div>

            <div className="pool-card">
              <div className="pool-header">
                <div className="pool-tokens">
                  <div className="token-icon-small stark-icon">
                    <i className="fas fa-layer-group"></i>
                  </div>
                  <div className="token-icon-small eth-icon">
                    <i className="fab fa-ethereum"></i>
                  </div>
                </div>
                <div className="pool-name">
                  <h3>STRK/ETH</h3>
                  <span className="pool-type">Native Pool</span>
                </div>
              </div>
              <div className="pool-stats">
                <div className="pool-stat">
                  <span className="stat-label">TVL</span>
                  <span className="stat-value">$945K</span>
                </div>
                <div className="pool-stat">
                  <span className="stat-label">Volume 24h</span>
                  <span className="stat-value">$34.7K</span>
                </div>
                <div className="pool-stat">
                  <span className="stat-label">APR</span>
                  <span className="stat-value">19.5%</span>
                </div>
              </div>
              <div className="pool-actions">
                <button className="add-liquidity-btn" onClick={() => openLiquidityModal({
                  name: 'STRK/ETH',
                  token0: 'STRK',
                  token1: 'ETH',
                  token0Icon: 'fas fa-layer-group',
                  token1Icon: 'fab fa-ethereum'
                }, 'add')}>Add Liquidity</button>
                <button className="remove-liquidity-btn" onClick={() => openLiquidityModal({
                  name: 'STRK/ETH',
                  token0: 'STRK',
                  token1: 'ETH',
                  token0Icon: 'fas fa-layer-group',
                  token1Icon: 'fab fa-ethereum'
                }, 'remove')}>Remove</button>
              </div>
            </div>

            <div className="pool-card">
              <div className="pool-header">
                <div className="pool-tokens">
                  <div className="token-icon-small btc-icon">
                    <i className="fab fa-bitcoin"></i>
                  </div>
                  <div className="token-icon-small eth-icon">
                    <i className="fab fa-ethereum"></i>
                  </div>
                </div>
                <div className="pool-name">
                  <h3>BTC/ETH</h3>
                  <span className="pool-type">Cross-Chain</span>
                </div>
              </div>
              <div className="pool-stats">
                <div className="pool-stat">
                  <span className="stat-label">TVL</span>
                  <span className="stat-value">$1.3M</span>
                </div>
                <div className="pool-stat">
                  <span className="stat-label">Volume 24h</span>
                  <span className="stat-value">$52.9K</span>
                </div>
                <div className="pool-stat">
                  <span className="stat-label">APR</span>
                  <span className="stat-value">26.1%</span>
                </div>
              </div>
              <div className="pool-actions">
                <button className="add-liquidity-btn" onClick={() => openLiquidityModal({
                  name: 'BTC/ETH',
                  token0: 'BTC',
                  token1: 'ETH',
                  token0Icon: 'fab fa-bitcoin',
                  token1Icon: 'fab fa-ethereum'
                }, 'add')}>Add Liquidity</button>
                <button className="remove-liquidity-btn" onClick={() => openLiquidityModal({
                  name: 'BTC/ETH',
                  token0: 'BTC',
                  token1: 'ETH',
                  token0Icon: 'fab fa-bitcoin',
                  token1Icon: 'fab fa-ethereum'
                }, 'remove')}>Remove</button>
              </div>
            </div>
          </div>

          {/* Liquidity Modal */}
          {showLiquidityModal && selectedPool && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">
                    {liquidityAction === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
                  </h3>
                  <button
                    onClick={closeLiquidityModal}
                    className="text-gray-400 hover:text-white"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${selectedPool.token0.toLowerCase()}-icon`}>
                        <i className={selectedPool.token0Icon}></i>
                      </div>
                      <span className="text-white font-medium">{selectedPool.name}</span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${selectedPool.token1.toLowerCase()}-icon`}>
                        <i className={selectedPool.token1Icon}></i>
                      </div>
                    </div>
                  </div>

                  {liquidityAction === 'add' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {selectedPool.token0} Amount
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={token0Amount}
                            onChange={(e) => handleTokenAmountChange(0, e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                          />
                          <span className="absolute right-3 top-3 text-gray-400">{selectedPool.token0}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {selectedPool.token1} Amount
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={token1Amount}
                            onChange={(e) => handleTokenAmountChange(1, e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                          />
                          <span className="absolute right-3 top-3 text-gray-400">{selectedPool.token1}</span>
                        </div>
                      </div>

                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-300">Pool Share</span>
                          <span className="text-white">
                            {token0Amount && token1Amount ? '0.01%' : '0.00%'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">LP Tokens</span>
                          <span className="text-white">
                            {token0Amount && token1Amount ? (parseFloat(token0Amount) * 0.1).toFixed(4) : '0.0000'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {liquidityAction === 'remove' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        LP Tokens to Remove
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={liquidityAmount}
                          onChange={(e) => handleLiquidityAmountChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        />
                        <span className="absolute right-3 top-3 text-gray-400">LP</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        You will receive {token0Amount || '0.00'} {selectedPool.token0} and {token1Amount || '0.00'} {selectedPool.token1}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleLiquiditySubmit}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                  >
                    {liquidityAction === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="liquidity-info">
            <div className="info-section">
              <h3>How Liquidity Pools Work</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <i className="fas fa-plus-circle"></i>
                  </div>
                  <div className="info-content">
                    <h4>Add Liquidity</h4>
                    <p>Deposit equal values of both tokens to create a liquidity pool</p>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon">
                    <i className="fas fa-exchange-alt"></i>
                  </div>
                  <div className="info-content">
                    <h4>Earn Fees</h4>
                    <p>Receive a share of trading fees proportional to your liquidity contribution</p>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon">
                    <i className="fas fa-coins"></i>
                  </div>
                  <div className="info-content">
                    <h4>Earn Rewards</h4>
                    <p>Get additional token rewards for providing liquidity</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer>
        <p>© 2025 BitStark Bridge. All rights reserved. Use at your own risk.</p>
      </footer>
    </div>
  );
}
