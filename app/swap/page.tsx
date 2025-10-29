'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import WalletModal from '../components/WalletModal';
import './styles.css';

export default function SwapPage() {
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('BTC');
  const [fromAmount, setFromAmount] = useState('0.1');
  const [toAmount, setToAmount] = useState('0.00542');
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum');
  const [slippage, setSlippage] = useState('1.0');
  const [activeSlippage, setActiveSlippage] = useState('1');
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenType, setTokenType] = useState<'from' | 'to'>('from');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<'bitcoin' | 'starknet'>('bitcoin');
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkType, setNetworkType] = useState<'from' | 'to'>('from');

  const stats = [
    { icon: 'fas fa-bridge', label: 'Bridge Transactions', value: '24', color: 'stat-bridge' },
    { icon: 'fas fa-exchange-alt', label: 'Swap Transactions', value: '42', color: 'stat-swap' },
    { icon: 'fas fa-lock', label: 'Lock Transactions', value: '15', color: 'stat-lock' },
    { icon: 'fas fa-unlock', label: 'Unlock Transactions', value: '8', color: 'stat-unlock' }
  ];

  const networks = [
    { id: 'ethereum', name: 'Ethereum', icon: 'fab fa-ethereum', color: 'network-eth' },
    { id: 'bitcoin', name: 'Bitcoin', icon: 'fab fa-bitcoin', color: 'network-btc' },
    { id: 'polygon', name: 'Polygon', icon: 'fas fa-layer-group', color: 'network-polygon' },
    { id: 'arbitrum', name: 'Arbitrum', icon: 'fas fa-arrows-spin', color: 'network-arbitrum' },
    { id: 'starknet', name: 'Starknet', icon: 'fas fa-code-branch', color: 'network-starknet' }
  ];

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
    return networkTokenMap[networkId as keyof typeof networkTokenMap] || networkTokenMap.ethereum;
  };

  const tokens = getTokensForNetwork(selectedNetwork);

  const transactions = [
    { id: 1, type: 'ETH to BTC', amount: '+0.025 BTC', time: '2 hours ago', status: 'completed', icon: 'eth' },
    { id: 2, type: 'USDC to ETH', amount: '+0.42 ETH', time: '1 day ago', status: 'completed', icon: 'usdc' },
    { id: 3, type: 'BTC to STRK', amount: '+125.5 STRK', time: '2 days ago', status: 'completed', icon: 'btc' }
  ];

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
  };

  const handleSlippageSelect = (value: string) => {
    setActiveSlippage(value);
    setSlippage(value);
  };

  const handleAmountChange = (value: string, type: 'from' | 'to') => {
    const numValue = parseFloat(value) || 0;

    if (type === 'from') {
      setFromAmount(value);
      // Mock calculation for toAmount (in real app, this would use exchange rate API)
      const exchangeRate = 0.0542; // ETH to BTC
      setToAmount((numValue * exchangeRate).toFixed(6));
    } else {
      setToAmount(value);
      // Mock calculation for fromAmount
      const exchangeRate = 18.45; // BTC to ETH
      setFromAmount((numValue * exchangeRate).toFixed(6));
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

  const handleWalletConnect = (type: string, address?: string) => {
    console.log('Connecting wallet:', type, 'Address:', address);
    setConnectedWallet(type);
    setConnectedAddress(address || null);
    setIsWalletModalOpen(false);
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
      />

      <div className="container">
        <div className="main-content">
          <div className="swap-card">
            <div className="card-header">
              <h2 className="card-title">Swap Tokens</h2>
              <div className="settings-icon">
                <i className="fas fa-sliders-h"></i>
              </div>
            </div>

            <div className="swap-container">
              <div className="swap-section active">
                <div className="section-header">
                  <div className="section-label">You pay</div>
                  <div className="balance">
                    Balance: {(() => {
                      const tokenData = tokens.find(t => t.symbol === fromToken);
                      return tokenData ? tokenData.balance + ' ' + fromToken : '0.000 ' + fromToken;
                    })()}
                  </div>
                </div>
                <div className="token-selector" onClick={() => openTokenModal('from')}>
                  <div className={`token-icon ${tokens.find(t => t.symbol === fromToken)?.color || 'eth'}`}>
                    <i className={tokens.find(t => t.symbol === fromToken)?.icon ||
                      `fab fa-${fromToken === 'ETH' ? 'ethereum' : fromToken === 'BTC' ? 'bitcoin' : 'dollar-sign'}`}></i>
                  </div>
                  <div className="token-info">
                    <div className="token-symbol">{fromToken}</div>
                    <div className="token-name">
                      {tokens.find(t => t.symbol === fromToken)?.name ||
                       (fromToken === 'ETH' ? 'Ethereum' :
                        fromToken === 'BTC' ? 'Bitcoin' :
                        fromToken === 'USDC' ? 'USD Coin' :
                        fromToken === 'USDT' ? 'Tether' :
                        fromToken === 'STRK' ? 'Starknet' :
                        fromToken === 'ARB' ? 'Arbitrum' :
                        fromToken === 'MATIC' ? 'Polygon' : 'Unknown Token')}
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
                      const tokenData = tokens.find(t => t.symbol === toToken);
                      return tokenData ? tokenData.balance + ' ' + toToken : '0.000 ' + toToken;
                    })()}
                  </div>
                </div>
                <div className="token-selector" onClick={() => openTokenModal('to')}>
                  <div className={`token-icon ${tokens.find(t => t.symbol === toToken)?.color || 'eth'}`}>
                    <i className={tokens.find(t => t.symbol === toToken)?.icon ||
                      `fab fa-${toToken === 'ETH' ? 'ethereum' : toToken === 'BTC' ? 'bitcoin' : 'dollar-sign'}`}></i>
                  </div>
                  <div className="token-info">
                    <div className="token-symbol">{toToken}</div>
                    <div className="token-name">
                      {tokens.find(t => t.symbol === toToken)?.name ||
                       (toToken === 'ETH' ? 'Ethereum' :
                        toToken === 'BTC' ? 'Bitcoin' :
                        toToken === 'USDC' ? 'USD Coin' :
                        toToken === 'USDT' ? 'Tether' :
                        toToken === 'STRK' ? 'Starknet' :
                        toToken === 'ARB' ? 'Arbitrum' :
                        toToken === 'MATIC' ? 'Polygon' : 'Unknown Token')}
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
                <div className="detail-value">1 ETH = 0.0542 BTC</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Network Fee</div>
                <div className="detail-value">$12.50</div>
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

            <button className="swap-button">Swap Now</button>
          </div>

          <div className="transaction-history">
            <div className="history-header">
              <h2 className="history-title">Popular Tokens</h2>
              <a href="#" className="view-all">View All</a>
            </div>
            <div className="tokens-grid">
              {tokens.map((token) => (
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
              <a href="#" className="view-all">View All</a>
            </div>
            <div className="transaction-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="transaction-item">
                  <div className="transaction-info">
                    <div className={`transaction-icon ${tx.icon}`}>
                      <i className={`fab fa-${tx.icon === 'eth' ? 'ethereum' : tx.icon === 'btc' ? 'bitcoin' : 'dollar-sign'}`}></i>
                    </div>
                    <div className="transaction-details">
                      <h4>{tx.type}</h4>
                      <p>{tx.time}</p>
                    </div>
                  </div>
                  <div className="transaction-amount">{tx.amount}</div>
                  <div className={`status ${tx.status}`}>
                    {tx.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer>
          <p>© 2025 BitStark Swap. All rights reserved. | Security Audit Passed | v2.1.4</p>
        </footer>
      </div>

      {/* Token Selection Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Select Token</h3>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tokens.map((token) => (
                <div
                  key={token.symbol}
                  onClick={() => selectToken(token.symbol)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${token.color}`}>
                    <i className={token.icon}></i>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{token.symbol}</div>
                    <div className="text-sm text-gray-400">{token.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">{token.balance}</div>
                    <div className="text-sm text-gray-400">{token.usd}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}