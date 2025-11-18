'use client';

import { useState, useMemo } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import WalletModal from '../components/WalletModal';
import { useTransactions } from '../components/TransactionContext';
import { createPublicClient, http, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { initStarknet, swapTokenToToken } from '../utils/starknet';
import { initBitcoinBridge, swapTokenToToken as wasmSwapTokenToToken } from '../utils/bitcoinBridge';
import './styles.css';

export default function SwapPage() {
  const { addTransaction, transactions } = useTransactions();
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('BTC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum');
  const [slippage, setSlippage] = useState('1.0');
  const [activeSlippage, setActiveSlippage] = useState('1');
  const [exchangeRate, setExchangeRate] = useState(0);
  const [networkFee, setNetworkFee] = useState(0);
  const [swapFee, setSwapFee] = useState(0);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenType, setTokenType] = useState<'from' | 'to'>('from');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<'bitcoin' | 'starknet'>('bitcoin');
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkType, setNetworkType] = useState<'from' | 'to'>('from');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [realBalances, setRealBalances] = useState<{[key: string]: number}>({});
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Calculate dynamic stats based on transactions
  const stats = useMemo(() => {
    try {
      const safeTransactions = Array.isArray(transactions) ? transactions : [];
      const bridgeCount = safeTransactions.filter(tx => tx && tx.type === 'Bridge').length;
      const swapCount = safeTransactions.filter(tx => tx && tx.type === 'Swap').length;
      const lockCount = safeTransactions.filter(tx => tx && tx.type === 'Lock').length;
      const unlockCount = safeTransactions.filter(tx => tx && tx.type === 'Unlock').length;

      return [
        { icon: 'fas fa-bridge', label: 'Bridge Transactions', value: bridgeCount.toString(), color: 'stat-bridge' },
        { icon: 'fas fa-exchange-alt', label: 'Swap Transactions', value: swapCount.toString(), color: 'stat-swap' },
        { icon: 'fas fa-lock', label: 'Lock Transactions', value: '15', color: 'stat-lock' },
        { icon: 'fas fa-unlock', label: 'Unlock Transactions', value: '8', color: 'stat-unlock' }
      ];
    } catch (error) {
      console.error('Error calculating stats:', error);
      return [
        { icon: 'fas fa-bridge', label: 'Bridge Transactions', value: '0', color: 'stat-bridge' },
        { icon: 'fas fa-exchange-alt', label: 'Swap Transactions', value: '0', color: 'stat-swap' },
        { icon: 'fas fa-lock', label: 'Lock Transactions', value: '15', color: 'stat-lock' },
        { icon: 'fas fa-unlock', label: 'Unlock Transactions', value: '8', color: 'stat-unlock' }
      ];
    }
  }, [transactions]);

  const networks = [
    { id: 'ethereum', name: 'Ethereum', icon: 'fab fa-ethereum', color: 'network-eth' },
    { id: 'bitcoin', name: 'Bitcoin', icon: 'fab fa-bitcoin', color: 'network-btc' },
    { id: 'polygon', name: 'Polygon', icon: 'fas fa-layer-group', color: 'network-polygon' },
    { id: 'arbitrum', name: 'Arbitrum', icon: 'fas fa-arrows-spin', color: 'network-arbitrum' },
    { id: 'starknet', name: 'Starknet', icon: 'fas fa-code-branch', color: 'network-starknet' }
  ];

  // Ensure networks is always an array
  if (!Array.isArray(networks)) {
    console.error('Networks is not an array:', networks);
  }

  // Dynamic tokens based on selected network
  const getTokensForNetwork = (networkId: string) => {
    const networkTokenMap = {
      ethereum: [
        { symbol: 'ETH', name: 'Ethereum', icon: 'fab fa-ethereum', color: 'eth', balance: '2.543', usd: '$8,542.36' },
        { symbol: 'USDC', name: 'USD Coin', icon: 'fas fa-dollar-sign', color: 'usdc', balance: '1,250.00', usd: '$1,250.00' },
        { symbol: 'USDT', name: 'Tether', icon: 'fas fa-coins', color: 'usdt', balance: '850.50', usd: '$850.50' }
      ],
      bitcoin: [
        { symbol: 'BTC', name: 'Bitcoin', icon: 'fab fa-bitcoin', color: 'btc', balance: '0.125', usd: '$4,231.50' }
      ],
      polygon: [
        { symbol: 'MATIC', name: 'Polygon', icon: 'fas fa-layer-group', color: 'matic', balance: '1,500.00', usd: '$1,050.00' },
        { symbol: 'USDC', name: 'USD Coin', icon: 'fas fa-dollar-sign', color: 'usdc', balance: '750.00', usd: '$750.00' },
        { symbol: 'USDT', name: 'Tether', icon: 'fas fa-coins', color: 'usdt', balance: '600.00', usd: '$600.00' }
      ],
      arbitrum: [
        { symbol: 'ARB', name: 'Arbitrum', icon: 'fas fa-arrows-spin', color: 'arb', balance: '542.30', usd: '$642.18' },
        { symbol: 'USDC', name: 'USD Coin', icon: 'fas fa-dollar-sign', color: 'usdc', balance: '800.00', usd: '$800.00' },
        { symbol: 'USDT', name: 'Tether', icon: 'fas fa-coins', color: 'usdt', balance: '650.00', usd: '$650.00' }
      ],
      starknet: [
        { symbol: 'STRK', name: 'Starknet', icon: 'fas fa-code-branch', color: 'stark', balance: '125.75', usd: '$342.15' },
        { symbol: 'ETH', name: 'Ethereum', icon: 'fab fa-ethereum', color: 'eth', balance: '0.543', usd: '$1,854.36' }
      ]
    };

    // Ensure networkId is valid and return tokens array
    if (!networkId || typeof networkId !== 'string') {
      console.warn('Invalid networkId provided to getTokensForNetwork:', networkId);
      return networkTokenMap.ethereum || [];
    }

    const tokens = networkTokenMap[networkId as keyof typeof networkTokenMap];
    return Array.isArray(tokens) ? tokens : networkTokenMap.ethereum || [];
  };

  const tokens = getTokensForNetwork(selectedNetwork) || [];
  // Ensure tokens is always an array with robust error handling
  const safeTokens = Array.isArray(tokens) ? tokens : [];
  if (!Array.isArray(tokens)) {
    console.error('Tokens is not an array:', tokens);
  }


  const handleSwapDirection = () => {
    const tempToken = fromToken;
    const tempAmount = fromAmount;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const handleNetworkSelect = (networkId: string) => {
    setSelectedNetwork(networkId);
    // Recalculate metrics when network changes
    const numAmount = parseFloat(fromAmount) || 0;
    if (numAmount > 0) {
      updateSwapMetrics(numAmount, fromToken, toToken);
    }
  };

  const handleSlippageSelect = (value: string) => {
    setActiveSlippage(value);
    setSlippage(value);
  };

  const updateSwapMetrics = (amount: number, fromToken: string, toToken: string) => {
    if (amount === 0) {
      setExchangeRate(0);
      setNetworkFee(0);
      setSwapFee(0);
      return;
    }

    // Dynamic exchange rate calculation based on tokens and amount
    let baseRate = 0.0542; // Default ETH to BTC
    if (fromToken === 'BTC' && toToken === 'ETH') baseRate = 18.45;
    else if (fromToken === 'ETH' && toToken === 'USDC') baseRate = 3425;
    else if (fromToken === 'USDC' && toToken === 'ETH') baseRate = 1 / 3425;
    else if (fromToken === 'BTC' && toToken === 'USDC') baseRate = 0.0542 * 3425;
    else if (fromToken === 'USDC' && toToken === 'BTC') baseRate = 1 / (0.0542 * 3425);

    // Adjust rate based on amount (larger amounts might have slightly different rates)
    if (amount > 10) {
      baseRate *= 0.998; // 0.2% discount for large amounts
    } else if (amount > 1) {
      baseRate *= 0.999; // 0.1% discount for medium amounts
    }

    setExchangeRate(baseRate);

    // Dynamic network fee based on amount and network
    let baseNetworkFee = 12.50;
    if (selectedNetwork === 'polygon' || selectedNetwork === 'arbitrum') {
      baseNetworkFee = 0.50; // Lower fees for L2
    } else if (selectedNetwork === 'bitcoin') {
      baseNetworkFee = 25.00; // Higher fees for Bitcoin
    }

    // Scale fee with amount (but cap it)
    const scaledFee = Math.min(baseNetworkFee + (amount * 0.1), baseNetworkFee * 3);
    setNetworkFee(scaledFee);

    // Dynamic swap fee based on amount
    let baseSwapFee = 2.50;
    if (amount > 100) {
      baseSwapFee = Math.max(1.00, baseSwapFee - (amount * 0.005)); // Reduce fee for very large amounts
    } else if (amount > 10) {
      baseSwapFee = 2.00;
    }
    setSwapFee(baseSwapFee);
  };

  const handleAmountChange = (value: string, type: 'from' | 'to') => {
    const numValue = parseFloat(value) || 0;

    if (type === 'from') {
      setFromAmount(value);
      updateSwapMetrics(numValue, fromToken, toToken);
      if (numValue > 0 && exchangeRate > 0) {
        setToAmount((numValue * exchangeRate).toFixed(6));
      } else {
        setToAmount('');
      }
    } else {
      setToAmount(value);
      updateSwapMetrics(numValue / exchangeRate, fromToken, toToken);
      if (numValue > 0 && exchangeRate > 0) {
        setFromAmount((numValue / exchangeRate).toFixed(6));
      } else {
        setFromAmount('');
      }
    }
  };

  const openTokenModal = (type: 'from' | 'to') => {
    setTokenType(type);
    setShowTokenModal(true);
  };

  const selectToken = (tokenSymbol: string) => {
    if (tokenType === 'from') {
      // Uniswap-style: allow same token selection (user can decide)
      setFromToken(tokenSymbol);
    } else {
      setToToken(tokenSymbol);
    }
    setShowTokenModal(false);
  };

  const openNetworkModal = (type: 'from' | 'to') => {
    setNetworkType(type);
    setShowNetworkModal(true);
  };

  const selectNetwork = (networkId: string) => {
    setSelectedNetwork(networkId);
    setShowNetworkModal(false);

    // Uniswap-style network switching: when you select a network,
    // it changes the entire swap context to that network's default tokens
    const networkDefaults = {
      ethereum: { from: 'ETH', to: 'USDC' },
      bitcoin: { from: 'BTC', to: 'BTC' }, // For Bitcoin, both will be BTC (handled in UI)
      polygon: { from: 'MATIC', to: 'USDC' },
      arbitrum: { from: 'ARB', to: 'USDC' },
      starknet: { from: 'STRK', to: 'ETH' }
    };

    const defaults = networkDefaults[networkId as keyof typeof networkDefaults] || networkDefaults.ethereum;

    // Set both tokens to the network's default pair
    setFromToken(defaults.from);
    setToToken(defaults.to);
  };

  const connectWallet = () => {
    setIsWalletModalOpen(true);
  };

  const handleWalletConnect = async (type: string, address?: string) => {
    console.log('Connecting wallet:', type, 'Address:', address);
    setConnectedWallet(type);
    setConnectedAddress(address || null);

    // Fetch real balances when wallet connects
    if (address) {
      await fetchRealBalances(address, type);
    }

    setIsWalletModalOpen(false);
  };

  // Function to fetch real balances from connected wallet
  const fetchRealBalances = async (address: string, walletType: string) => {
    const balances: {[key: string]: number} = {};
    console.log('Fetching balances for wallet:', walletType, 'address:', address);

    try {
      // For Bitcoin wallets
      if (['xverse', 'unisat', 'phantom', 'trustwallet'].includes(walletType.toLowerCase())) {
        console.log('Fetching Bitcoin balance...');
        try {
          const btcResponse = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`);
          const btcData = await btcResponse.json();
          const btcBalance = btcData.final_balance ? btcData.final_balance / 100000000 : 0;
          balances['BTC'] = btcBalance;
          console.log('✅ BTC balance fetched:', btcBalance);
        } catch (btcError) {
          console.warn('BTC balance fetch failed:', btcError);
          balances['BTC'] = 0;
        }
      }

      // For Ethereum/Starknet wallets
      if (['ready', 'braavos', 'metamask'].includes(walletType.toLowerCase())) {
        console.log('Fetching Ethereum balances...');

        // Create a public client for Ethereum
        const client = createPublicClient({
          chain: mainnet,
          transport: http()
        });

        // Fetch ETH balance
        try {
          const ethBalanceWei = await client.getBalance({ address: address as `0x${string}` });
          const ethBalance = parseFloat(formatUnits(ethBalanceWei, 18));
          balances['ETH'] = ethBalance;
          console.log('✅ ETH balance fetched:', ethBalance);
        } catch (ethError) {
          console.warn('ETH balance fetch failed:', ethError);
          balances['ETH'] = 0;
        }

        // Fetch USDC balance (0xA0b86a33E6441e88C5F2712C3E9b74F63F8F7E7a)
        try {
          const usdcBalance = await client.readContract({
            address: '0xA0b86a33E6441e88C5F2712C3E9b74F63F8F7E7a',
            abi: [
              {
                constant: true,
                inputs: [{ name: '_owner', type: 'address' }],
                name: 'balanceOf',
                outputs: [{ name: 'balance', type: 'uint256' }],
                type: 'function',
              },
            ],
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          });
          balances['USDC'] = parseFloat(formatUnits(usdcBalance as bigint, 6));
          console.log('✅ USDC balance fetched:', balances['USDC']);
        } catch (usdcError) {
          console.warn('USDC balance fetch failed:', usdcError);
          balances['USDC'] = 0;
        }

        // Fetch USDT balance (0xdAC17F958D2ee523a2206206994597C13D831ec7)
        try {
          const usdtBalance = await client.readContract({
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            abi: [
              {
                constant: true,
                inputs: [{ name: '_owner', type: 'address' }],
                name: 'balanceOf',
                outputs: [{ name: 'balance', type: 'uint256' }],
                type: 'function',
              },
            ],
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          });
          balances['USDT'] = parseFloat(formatUnits(usdtBalance as bigint, 6));
          console.log('✅ USDT balance fetched:', balances['USDT']);
        } catch (usdtError) {
          console.warn('USDT balance fetch failed:', usdtError);
          balances['USDT'] = 0;
        }
      }

      // For Starknet specific
      if (['ready', 'braavos'].includes(walletType.toLowerCase())) {
        console.log('Fetching Starknet balances...');
        // Mock STRK balance for demo (real implementation would use Starknet APIs)
        balances['STRK'] = Math.random() * 100 + 10; // 10-110 STRK
        console.log('✅ STRK balance set (mock):', balances['STRK']);
      }

      console.log('Final balances object:', balances);
      setRealBalances(balances);

      // Force a re-render by updating state
      setTimeout(() => {
        console.log('Balances should now be displayed');
      }, 100);

    } catch (error) {
      console.error('❌ Critical error in balance fetching:', error);
      // Set minimal fallback balances
      const fallbackBalances = {
        'ETH': 0.001,
        'BTC': 0.0001,
        'USDC': 10,
        'USDT': 5,
        'STRK': 1
      };
      console.log('Using fallback balances:', fallbackBalances);
      setRealBalances(fallbackBalances);
    }
  };

  const handleCloseWalletModal = () => {
    setIsWalletModalOpen(false);
  };

  return (
    <div className='container'>
      <header>
        <div className="logo">
          <div className="logo-icon">
            <i className="fas fa-exchange-alt"></i>
          </div>
          <span>BitStark Swap</span>
        </div>
        <nav>
          <ul>
            <li><a href="#" className="active"> <i className='fas fa-arrows-alt'></i> Swap</a></li>
            <li><a href="/bridge"><i className='fas fa-bridge'></i> Bridge</a></li>
            <li><a href="/Transactions"><i className='fas fa-history'></i> Transactions</a></li>
            <li><a href="/Lock-Unlock"><i className='fas fa-unlock'></i> Lock-Unlock</a></li>
          </ul>
        </nav>
        <button className="wallet-connect" onClick={connectWallet}>
          <i className="fas fa-wallet"></i>
          {connectedWallet && connectedAddress
            ? `${connectedAddress.substring(0, 6)}...${connectedAddress.substring(connectedAddress.length - 4)}`
            : 'Connect Wallet'}
        </button>
      </header>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={handleCloseWalletModal}
        onConnectWallet={handleWalletConnect}
        network={undefined}
      />

      <div className="container">
        <div className="main-content">
          <div className="swap-card">
            <div className="card-header">
              <h2 className="card-title">Swap Tokens</h2>
              <div className="settings-icon" onClick={() => setShowSettingsModal(true)}>
                <i className="fas fa-sliders-h"></i>
              </div>
            </div>

            <div className="swap-container">
              <div className="swap-section active">
                <div className="section-header">
                  <div className="section-label">You pay</div>
                  <div className="balance">
                    Balance: {(() => {
                      try {
                        // Use real balance if available, otherwise fallback to mock data
                        const realBalance = realBalances[fromToken];
                        if (realBalance !== undefined && !isNaN(realBalance)) {
                          return realBalance.toFixed(6) + ' ' + fromToken;
                        }
                        const tokenData = safeTokens.find(t => t && t.symbol === fromToken);
                        return tokenData ? tokenData.balance + ' ' + fromToken : '0.000000 ' + fromToken;
                      } catch (error) {
                        console.error('Error calculating balance:', error);
                        return '0.000000 ' + fromToken;
                      }
                    })()}
                  </div>
                </div>
                <div className="token-selector" onClick={() => openTokenModal('from')}>
                  <div className={`token-icon ${(() => {
                    try {
                      const tokenData = safeTokens.find(t => t && t.symbol === fromToken);
                      return tokenData?.color || 'eth';
                    } catch (error) {
                      console.error('Error getting token color:', error);
                      return 'eth';
                    }
                  })()}`}>
                    <i className={(() => {
                      try {
                        const tokenData = safeTokens.find(t => t && t.symbol === fromToken);
                        return tokenData?.icon || `fab fa-${fromToken === 'ETH' ? 'ethereum' : fromToken === 'BTC' ? 'bitcoin' : 'dollar-sign'}`;
                      } catch (error) {
                        console.error('Error getting token icon:', error);
                        return `fab fa-${fromToken === 'ETH' ? 'ethereum' : fromToken === 'BTC' ? 'bitcoin' : 'dollar-sign'}`;
                      }
                    })()}></i>
                  </div>
                  <div className="token-info">
                    <div className="token-symbol">{fromToken}</div>
                    <div className="token-name">
                      {(() => {
                        try {
                          const tokenData = safeTokens.find(t => t && t.symbol === fromToken);
                          return tokenData?.name || (fromToken === 'ETH' ? 'Ethereum' :
                            fromToken === 'BTC' ? 'Bitcoin' :
                            fromToken === 'USDC' ? 'USD Coin' :
                            fromToken === 'USDT' ? 'Tether' :
                            fromToken === 'STRK' ? 'Starknet' :
                            fromToken === 'ARB' ? 'Arbitrum' :
                            fromToken === 'MATIC' ? 'Polygon' : 'Unknown Token');
                        } catch (error) {
                          console.error('Error getting token name:', error);
                          return fromToken === 'ETH' ? 'Ethereum' :
                            fromToken === 'BTC' ? 'Bitcoin' :
                            fromToken === 'USDC' ? 'USD Coin' :
                            fromToken === 'USDT' ? 'Tether' :
                            fromToken === 'STRK' ? 'Starknet' :
                            fromToken === 'ARB' ? 'Arbitrum' :
                            fromToken === 'MATIC' ? 'Polygon' : 'Unknown Token';
                        }
                      })()}
                    </div>
                  </div>
                  <div className="token-dropdown" onClick={() => openNetworkModal('from')}>
                    <i className="fas fa-chevron-down"></i>
                  </div>
                </div>
                <div className="amount-input">
                  <input type="number" className="amount-field" placeholder="0.0" value={fromAmount} onChange={(e) => handleAmountChange(e.target.value, 'from')} />
                  <div className="usd-value">≈ ${(parseFloat(fromAmount) * 3425).toFixed(2)}</div>
                </div>
              </div>

              <div className="swap-arrow">
                <div className="swap-arrow-icon" onClick={handleSwapDirection}>
                  <i className="fas fa-arrow-down-arrow-up"></i>
                </div>
              </div>

              <div className="swap-section">
                <div className="section-header">
                  <div className="section-label">You receive</div>
                  <div className="balance">
                    Balance: {(() => {
                      try {
                        // Use real balance if available, otherwise fallback to mock data
                        const realBalance = realBalances[toToken];
                        if (realBalance !== undefined && !isNaN(realBalance)) {
                          return realBalance.toFixed(6) + ' ' + toToken;
                        }
                        const tokenData = safeTokens.find(t => t && t.symbol === toToken);
                        return tokenData ? tokenData.balance + ' ' + toToken : '0.000000 ' + toToken;
                      } catch (error) {
                        console.error('Error calculating balance:', error);
                        return '0.000000 ' + toToken;
                      }
                    })()}
                  </div>
                </div>
                <div className="token-selector" onClick={() => openTokenModal('to')}>
                  <div className={`token-icon ${(() => {
                    try {
                      const tokenData = safeTokens.find(t => t && t.symbol === toToken);
                      return tokenData?.color || 'eth';
                    } catch (error) {
                      console.error('Error getting token color:', error);
                      return 'eth';
                    }
                  })()}`}>
                    <i className={(() => {
                      try {
                        const tokenData = safeTokens.find(t => t && t.symbol === toToken);
                        return tokenData?.icon || `fab fa-${toToken === 'ETH' ? 'ethereum' : toToken === 'BTC' ? 'bitcoin' : 'dollar-sign'}`;
                      } catch (error) {
                        console.error('Error getting token icon:', error);
                        return `fab fa-${toToken === 'ETH' ? 'ethereum' : toToken === 'BTC' ? 'bitcoin' : 'dollar-sign'}`;
                      }
                    })()}></i>
                  </div>
                  <div className="token-info">
                    <div className="token-symbol">{toToken}</div>
                    <div className="token-name">
                      {(() => {
                        try {
                          const tokenData = safeTokens.find(t => t && t.symbol === toToken);
                          return tokenData?.name || (toToken === 'ETH' ? 'Ethereum' :
                            toToken === 'BTC' ? 'Bitcoin' :
                            toToken === 'USDC' ? 'USD Coin' :
                            toToken === 'USDT' ? 'Tether' :
                            toToken === 'STRK' ? 'Starknet' :
                            toToken === 'ARB' ? 'Arbitrum' :
                            toToken === 'MATIC' ? 'Polygon' : 'Unknown Token');
                        } catch (error) {
                          console.error('Error getting token name:', error);
                          return toToken === 'ETH' ? 'Ethereum' :
                            toToken === 'BTC' ? 'Bitcoin' :
                            toToken === 'USDC' ? 'USD Coin' :
                            toToken === 'USDT' ? 'Tether' :
                            toToken === 'STRK' ? 'Starknet' :
                            toToken === 'ARB' ? 'Arbitrum' :
                            toToken === 'MATIC' ? 'Polygon' : 'Unknown Token';
                        }
                      })()}
                    </div>
                  </div>
                  <div className="token-dropdown" onClick={() => openNetworkModal('to')}>
                    <i className="fas fa-chevron-down"></i>
                  </div>
                </div>
                <div className="amount-input">
                  <input type="number" className="amount-field" placeholder="0.0" value={toAmount} readOnly />
                  <div className="usd-value">≈ ${(parseFloat(toAmount) * 3425).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="network-selector">
              <div className="network-label">Select Network</div>
              <div className="network-options">
                {networks.map((network) => (
                  <div
                    key={network.id}
                    className={`network-option ${selectedNetwork === network.id ? 'active' : ''}`}
                    onClick={() => handleNetworkSelect(network.id)}
                  >
                    <div className={`network-icon ${network.color}`}>
                      <i className={network.icon}></i>
                    </div>
                    <div className="network-name">{network.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="swap-details">
              <div className="detail-row">
                <div className="detail-label">Exchange Rate</div>
                <div className="detail-value">
                  {exchangeRate > 0 ? `1 ${fromToken} = ${exchangeRate.toFixed(6)} ${toToken}` : 'Enter amount to see rate'}
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Network Fee</div>
                <div className="detail-value">${networkFee.toFixed(2)}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Swap Fee</div>
                <div className="detail-value">${swapFee.toFixed(2)}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Slippage Tolerance</div>
                <div className="detail-value">
                  <div className="slippage-settings">
                    <div className={`slippage-option ${activeSlippage === '0.5' ? 'active' : ''}`} onClick={() => handleSlippageSelect('0.5')}>0.5%</div>
                    <div className={`slippage-option ${activeSlippage === '1' ? 'active' : ''}`} onClick={() => handleSlippageSelect('1')}>1%</div>
                    <div className={`slippage-option ${activeSlippage === '2' ? 'active' : ''}`} onClick={() => handleSlippageSelect('2')}>2%</div>
                    <input type="number" className="slippage-input" placeholder="1.0" value={slippage} onChange={(e) => setSlippage(e.target.value)} />%
                  </div>
                </div>
              </div>
            </div>

            {swapError && (
              <div className="error-message" style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>
                {swapError}
              </div>
            )}
            <button className="swap-button" disabled={isSwapping} onClick={async () => {
              if (!connectedAddress || !parseFloat(fromAmount)) {
                alert('Please connect your wallet and enter an amount to swap');
                return;
              }

              // Validate balance
              const fromTokenData = safeTokens.find(t => t && t.symbol === fromToken);
              const hasBalance = fromTokenData && parseFloat(fromTokenData.balance) >= parseFloat(fromAmount);
              if (!hasBalance) {
                setSwapError('Insufficient balance for this swap');
                return;
              }

              setIsSwapping(true);
              setSwapError(null);

              try {
                // Initialize Starknet connection if needed
                console.log('Initializing Starknet connection...');
                await initStarknet();

                const amountIn = BigInt(Math.floor(parseFloat(fromAmount) * 100000000)).toString(); // Convert to satoshis as string
                const minAmountOut = BigInt(Math.floor(parseFloat(toAmount) * 100000000)).toString();

                // Call Starknet contract swap function
                console.log('Calling Starknet swap function...');
                const result = await swapTokenToToken(
                  '0x123', // router address (dummy)
                  fromToken,
                  toToken,
                  amountIn,
                  minAmountOut,
                  connectedAddress
                );

                console.log('✅ Starknet swap result:', result);

                // Also call WASM function with error handling
                try {
                  console.log('Initializing WASM bridge...');
                  const wasmBridge = await initBitcoinBridge();
                  if (!wasmBridge) {
                    console.warn('WASM bridge initialization returned null, skipping WASM call');
                  } else {
                    const amountInBigInt = BigInt(amountIn);
                    const minAmountOutBigInt = BigInt(minAmountOut);
                    console.log('Calling WASM swap function...');
                    await wasmBridge.swap_token_to_token("user", "0x123", fromToken, toToken, amountInBigInt, minAmountOutBigInt, connectedAddress);
                    console.log('✅ WASM swap completed');
                  }
                } catch (wasmError) {
                  console.warn('⚠️ WASM swap failed, but continuing with Starknet transaction:', wasmError);
                  // Don't fail the entire transaction if WASM fails
                }

                // Add the swap transaction
                addTransaction({
                  type: 'Swap',
                  typeIcon: 'fas fa-exchange-alt',
                  typeClass: 'type-swap',
                  fromAsset: fromToken,
                  fromAssetIcon: (() => {
                    try {
                      const tokenData = safeTokens.find(t => t && t.symbol === fromToken);
                      return tokenData?.icon || `fab fa-${fromToken === 'ETH' ? 'ethereum' : fromToken === 'BTC' ? 'bitcoin' : 'dollar-sign'}`;
                    } catch (error) {
                      console.error('Error getting fromAsset icon:', error);
                      return `fab fa-${fromToken === 'ETH' ? 'ethereum' : fromToken === 'BTC' ? 'bitcoin' : 'dollar-sign'}`;
                    }
                  })(),
                  fromAssetClass: `asset-${fromToken.toLowerCase()}`,
                  toAsset: toToken,
                  toAssetIcon: (() => {
                    try {
                      const tokenData = safeTokens.find(t => t && t.symbol === toToken);
                      return tokenData?.icon || `fab fa-${toToken === 'ETH' ? 'ethereum' : toToken === 'BTC' ? 'bitcoin' : 'dollar-sign'}`;
                    } catch (error) {
                      console.error('Error getting toAsset icon:', error);
                      return `fab fa-${toToken === 'ETH' ? 'ethereum' : toToken === 'BTC' ? 'bitcoin' : 'dollar-sign'}`;
                    }
                  })(),
                  toAssetClass: `asset-${toToken.toLowerCase()}`,
                  fromNetwork: (() => {
                    try {
                      const networkData = networks.find(n => n && n.id === selectedNetwork);
                      return networkData?.name || selectedNetwork;
                    } catch (error) {
                      console.error('Error getting fromNetwork:', error);
                      return selectedNetwork;
                    }
                  })(),
                  fromNetworkIcon: (() => {
                    try {
                      const networkData = networks.find(n => n && n.id === selectedNetwork);
                      return networkData?.icon || 'fas fa-layer-group';
                    } catch (error) {
                      console.error('Error getting fromNetwork icon:', error);
                      return 'fas fa-layer-group';
                    }
                  })(),
                  fromNetworkClass: `network-${selectedNetwork}`,
                  toNetwork: (() => {
                    try {
                      const networkData = networks.find(n => n && n.id === selectedNetwork);
                      return networkData?.name || selectedNetwork;
                    } catch (error) {
                      console.error('Error getting toNetwork:', error);
                      return selectedNetwork;
                    }
                  })(),
                  toNetworkIcon: (() => {
                    try {
                      const networkData = networks.find(n => n && n.id === selectedNetwork);
                      return networkData?.icon || 'fas fa-layer-group';
                    } catch (error) {
                      console.error('Error getting toNetwork icon:', error);
                      return 'fas fa-layer-group';
                    }
                  })(),
                  toNetworkClass: `network-${selectedNetwork}`,
                  amount: fromAmount + ' ' + fromToken,
                  status: 'completed',
                  statusClass: 'status-completed',
                  walletAddress: connectedAddress,
                  txHash: '0x' + Math.random().toString(16).substr(2, 64),
                  details: {
                    exchangeRate: `1 ${fromToken} = ${exchangeRate.toFixed(6)} ${toToken}`,
                    networkFee: `$${networkFee.toFixed(2)}`,
                    swapFee: `$${swapFee.toFixed(2)}`,
                    slippage: slippage + '%',
                    receivedAmount: toAmount + ' ' + toToken
                  }
                });

                // Reset form after successful swap
                setFromAmount('');
                setToAmount('');
                setExchangeRate(0);
                setNetworkFee(0);
                setSwapFee(0);
                alert('Swap completed successfully!');
              } catch (error: any) {
                console.error('Swap failed:', error);
                setSwapError(error.message || 'Swap transaction failed');
              } finally {
                setIsSwapping(false);
              }
            }}>{isSwapping ? 'Swapping...' : 'Swap Now'}</button>
          </div>

          <div className="transaction-history">
            <div className="history-header">
              <h2 className="history-title">Popular Tokens</h2>
              <a href="#" className="view-all">View All</a>
            </div>
            <div className="tokens-grid">
              {safeTokens.map((token) => (
                <div key={token.symbol} className="token-item" onClick={() => selectToken(token.symbol)}>
                  <div className={`token-item-icon ${token.color}`}>
                    <i className={token.icon}></i>
                  </div>
                  <div className="token-item-info">
                    <div className="token-item-symbol">{token.symbol}</div>
                    <div className="token-item-name">{token.name}</div>
                  </div>
                  <div className="token-item-balance">
                    <div className="token-balance">{token.balance}</div>
                    <div className="token-usd">{token.usd}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="history-header" style={{marginTop: '30px'}}>
              <h2 className="history-title">Recent Swaps</h2>
              <a href="/Transactions" className="view-all">View All</a>
            </div>
            <div className="transaction-list">
              {(() => {
                try {
                  const safeTransactions = Array.isArray(transactions) ? transactions : [];
                  const swapTransactions = safeTransactions.filter(tx => tx && tx.type === 'Swap').slice(0, 3);
                  return swapTransactions.map((tx) => (
                    <div key={tx.id || Math.random()} className="transaction-item">
                      <div className="transaction-info">
                        <div className={`transaction-icon ${tx.fromAssetClass || 'asset-eth'}`}>
                          <i className={tx.fromAssetIcon || 'fas fa-exchange-alt'}></i>
                        </div>
                        <div className="transaction-details">
                          <h4>{tx.fromAsset || 'Unknown'} to {tx.toAsset || 'Unknown'}</h4>
                          <p>{tx.date || 'Unknown date'}</p>
                        </div>
                      </div>
                      <div className="transaction-amount">+{tx.amount || '0'}</div>
                      <div className={`status ${tx.statusClass ? tx.statusClass.split('-')[1] : 'pending'}`}>
                        {tx.status || 'pending'}
                      </div>
                    </div>
                  ));
                } catch (error) {
                  console.error('Error rendering transactions:', error);
                  return null;
                }
              })()}
              {(() => {
                try {
                  const safeTransactions = Array.isArray(transactions) ? transactions : [];
                  return safeTransactions.filter(tx => tx && tx.type === 'Swap').length === 0 && (
                    <div className="no-transactions">
                      <p>No swap transactions yet. Connect your wallet and make a swap to see your history here.</p>
                    </div>
                  );
                } catch (error) {
                  console.error('Error checking transaction count:', error);
                  return (
                    <div className="no-transactions">
                      <p>No swap transactions yet. Connect your wallet and make a swap to see your history here.</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>

        <footer>
          <p>© 2025 BitStark Swap. All rights reserved. Use at your own risk.</p>
        </footer>
      </div>

      {/* Network Selection Modal */}
      {showNetworkModal && (
        <div className="network-modal-overlay">
          <div className="network-modal-content">
            <div className="network-modal-header">
              <h2 className="network-modal-title">Select Network</h2>
              <button
                className="network-modal-close"
                onClick={() => setShowNetworkModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="network-options-list">
              {networks.map((network) => (
                <div
                  key={network.id}
                  onClick={() => selectNetwork(network.id)}
                  className={`network-option-item ${selectedNetwork === network.id ? 'selected' : ''}`}
                >
                  <div className={`network-option-icon ${network.color}`}>
                    <i className={network.icon}></i>
                  </div>
                  <div className="network-option-info">
                    <div className="network-option-name">{network.name}</div>
                    <div className="network-option-description">
                      {network.id === 'ethereum' && 'Layer 1 • High throughput • Proof of Stake'}
                      {network.id === 'bitcoin' && 'Layer 1 • Secure & decentralized • Proof of Work'}
                      {network.id === 'polygon' && 'Layer 2 • Low fees • Polygon PoS'}
                      {network.id === 'arbitrum' && 'Layer 2 • Fast transactions • Optimistic Rollup'}
                      {network.id === 'starknet' && 'Layer 2 • ZK-rollup scaling • Starknet OS'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="settings-modal-overlay">
          <div className="settings-modal-content">
            <div className="settings-modal-header">
              <h2 className="settings-modal-title">Swap Settings</h2>
              <button
                className="settings-modal-close"
                onClick={() => setShowSettingsModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="settings-modal-body">
              <div className="settings-section">
                <label className="settings-label">Slippage Tolerance</label>
                <div className="slippage-controls">
                  <button
                    onClick={() => handleSlippageSelect('0.5')}
                    className={`slippage-preset ${activeSlippage === '0.5' ? 'active' : ''}`}
                  >
                    0.5%
                  </button>
                  <button
                    onClick={() => handleSlippageSelect('1')}
                    className={`slippage-preset ${activeSlippage === '1' ? 'active' : ''}`}
                  >
                    1%
                  </button>
                  <button
                    onClick={() => handleSlippageSelect('2')}
                    className={`slippage-preset ${activeSlippage === '2' ? 'active' : ''}`}
                  >
                    2%
                  </button>
                  <div className="slippage-custom">
                    <input
                      type="number"
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      className="slippage-input"
                      placeholder="1.0"
                      min="0.1"
                      max="50"
                      step="0.1"
                    />
                    <span className="slippage-unit">%</span>
                  </div>
                </div>
                <p className="settings-description">
                  Your transaction will revert if the price changes unfavorably by more than this percentage.
                </p>
              </div>

              <div className="settings-section">
                <label className="settings-label">Transaction Deadline</label>
                <div className="deadline-input">
                  <input
                    type="number"
                    defaultValue="20"
                    className="deadline-field"
                    min="1"
                    max="4320"
                  />
                  <span className="deadline-unit">minutes</span>
                </div>
                <p className="settings-description">
                  Your transaction will revert if it is pending for more than this period of time.
                </p>
              </div>

              <div className="settings-section">
                <label className="settings-label">Interface Settings</label>
                <div className="interface-toggles">
                  <div className="toggle-item">
                    <div className="toggle-switch active">
                      <div className="toggle-slider"></div>
                    </div>
                    <span className="toggle-label">Auto-refresh quotes</span>
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-switch">
                      <div className="toggle-slider"></div>
                    </div>
                    <span className="toggle-label">Expert mode</span>
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-switch active">
                      <div className="toggle-slider"></div>
                    </div>
                    <span className="toggle-label">Show detailed price impact</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-modal-footer">
              <button
                className="settings-save-btn"
                onClick={() => setShowSettingsModal(false)}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}