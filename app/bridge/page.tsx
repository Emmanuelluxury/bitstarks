'use client';

import { useState } from 'react';
import WalletModal from '../components/WalletModal';
import './styles.css';

export default function BridgePage() {
   const [direction, setDirection] = useState<'btc-to-stark' | 'stark-to-btc'>('btc-to-stark');
   const [fromAmount, setFromAmount] = useState('0.1');
   const [toAmount, setToAmount] = useState('0.0995');
   const [fromAddress, setFromAddress] = useState('');
   const [toAddress, setToAddress] = useState('');
   const [bitcoinWalletConnected, setBitcoinWalletConnected] = useState(false);
   const [starknetWalletConnected, setStarknetWalletConnected] = useState(false);
   const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
   const [currentNetwork, setCurrentNetwork] = useState<'bitcoin' | 'starknet'>('bitcoin');

  const stats = [
    { icon: 'fas fa-bridge', label: 'Bridge Transactions', value: '24', color: 'stat-bridge' },
    { icon: 'fas fa-exchange-alt', label: 'Swap Transactions', value: '42', color: 'stat-swap' },
    { icon: 'fas fa-lock', label: 'Lock Transactions', value: '15', color: 'stat-lock' },
    { icon: 'fas fa-unlock', label: 'Unlock Transactions', value: '8', color: 'stat-unlock' }
  ];

  const handleDirectionToggle = (newDirection: 'btc-to-stark' | 'stark-to-btc') => {
    setDirection(newDirection);
  };

  const handleSwap = () => {
    setDirection(direction === 'btc-to-stark' ? 'stark-to-btc' : 'btc-to-stark');
  };

  const handleMax = () => {
    setFromAmount('0.2543');
    setToAmount('0.2498'); // Assuming 0.99 fee
  };

  const handleConnectWallet = (network: 'bitcoin' | 'starknet') => {
    setCurrentNetwork(network);
    setIsWalletModalOpen(true);
  };

  const handleWalletConnect = (type: string) => {
    console.log('Connecting wallet:', type);
    if (currentNetwork === 'bitcoin') {
      setBitcoinWalletConnected(true);
    } else {
      setStarknetWalletConnected(true);
    }
    setIsWalletModalOpen(false);
  };

  const handleCloseWalletModal = () => {
    setIsWalletModalOpen(false);
  };

  const handleBridge = () => {
    if (!bitcoinWalletConnected || !starknetWalletConnected) {
      if (!bitcoinWalletConnected) {
        handleConnectWallet('bitcoin');
      } else if (!starknetWalletConnected) {
        handleConnectWallet('starknet');
      }
      return;
    }
    // Bridge logic here
    console.log('Bridging:', fromAmount);
  };

  return (
    <div className="container">
      <header>
        <div className="logo">
                <div className="logo-icon">
                    <i className="fas fa-bridge"></i>
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
        <button className={`wallet-connect ${bitcoinWalletConnected ? 'connected' : ''}`} onClick={() => handleConnectWallet('bitcoin')}>
          <i className={`fas ${bitcoinWalletConnected ? 'fa-check' : 'fa-wallet'}`}></i> {bitcoinWalletConnected ? 'Bitcoin Connected' : 'Connect Bitcoin Wallet'}
        </button>
        <button className={`wallet-connect ${starknetWalletConnected ? 'connected' : ''}`} onClick={() => handleConnectWallet('starknet')}>
          <i className={`fas ${starknetWalletConnected ? 'fa-check' : 'fa-wallet'}`}></i> {starknetWalletConnected ? 'Starknet Connected' : 'Connect Starknet Wallet'}
        </button>
      </header>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={handleCloseWalletModal}
        onConnectWallet={handleWalletConnect}
        network={currentNetwork}
      />

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
              <div className="network-balance">Balance: 0.2543 BTC</div>
            </div>
            <div className={`network-card ${direction === 'stark-to-btc' ? 'active' : ''}`}>
              <div className="network-icon starknet-icon">
                <i className="fas fa-layer-group"></i>
              </div>
              <div className="network-name">Starknet</div>
              <div className="network-balance">Balance: 1.8421 BTC</div>
            </div>
          </div>

          <form className="bridge-form" id="bridgeForm">
            <div className="form-group">
              <label htmlFor="fromAddress">From Address</label>
              <div className="address-input-container">
                <input
                  type="text"
                  id="fromAddress"
                  placeholder="Enter your wallet address or select from connected wallet"
                  autoComplete="off"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                />
                <div className="address-input-actions">
                </div>
              </div>
            </div>

            <div className="swap-button">
            <div className="swap-icon" onClick={handleSwap}>
              <i className="fas fa-arrow-down-arrow-up"></i>
            </div>
          </div>

            <div className="form-group">
              <label htmlFor="toAddress">To Address</label>
              <div className="address-input-container">
                <input
                  type="text"
                  id="toAddress"
                  placeholder="Enter your Starknet address or use connected wallet"
                  autoComplete="off"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                />
                <div className="address-input-actions">
                </div>
              </div>
              <div className="address-info">
                <small className="address-hint" id="toAddressHint">
                  Enter a valid StarkNet address for Bitcoin→Starknet transfers
                </small>
                <div className="address-validation" id="toAddressValidation"></div>
              </div>
            </div>

            <div className="amount-input">
              <div className="input-label">
                <span>You send</span>
                <span>Max: 0.2543 BTC</span>
              </div>
              <div className="input-container">
                <input
                  type="number"
                  className="amount-field"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                />
                <button className="max-button" onClick={handleMax}>MAX</button>
              </div>
            </div>
          </form>

          <button className="bridge-button" onClick={handleBridge} disabled={!bitcoinWalletConnected || !starknetWalletConnected}>
            Bridge Now
          </button>

          <div className="info-cards">
            <div className="info-card">
              <div className="info-title">Bridge Fee</div>
              <div className="info-value">0.0005 BTC</div>
            </div>
            <div className="info-card">
              <div className="info-title">Estimated Time</div>
              <div className="info-value">~15 minutes</div>
            </div>
          </div>
        </div>

        <div className="transaction-history">
          <div className="history-header">
            <h2 className="history-title">Recent Transactions</h2>
            <a href="#" className="view-all">View All</a>
          </div>
          <div className="transaction-list">
            <div className="transaction-item">
              <div className="transaction-info">
                <div className="transaction-icon bitcoin-icon">
                  <i className="fab fa-bitcoin"></i>
                </div>
                <div className="transaction-details">
                  <h4>Bitcoin to Starknet</h4>
                  <p>2 hours ago</p>
                </div>
              </div>
              <div className="transaction-amount">+0.25 BTC</div>
              <div className="status completed">Completed</div>
            </div>
            <div className="transaction-item">
              <div className="transaction-info">
                <div className="transaction-icon starknet-icon">
                  <i className="fas fa-layer-group"></i>
                </div>
                <div className="transaction-details">
                  <h4>Starknet to Bitcoin</h4>
                  <p>1 day ago</p>
                </div>
              </div>
              <div className="transaction-amount">-0.1 BTC</div>
              <div className="status completed">Completed</div>
            </div>
            <div className="transaction-item">
              <div className="transaction-info">
                <div className="transaction-icon bitcoin-icon">
                  <i className="fab fa-bitcoin"></i>
                </div>
                <div className="transaction-details">
                  <h4>Bitcoin to Starknet</h4>
                  <p>2 days ago</p>
                </div>
              </div>
              <div className="transaction-amount">+0.5 BTC</div>
              <div className="status completed">Completed</div>
            </div>
            <div className="transaction-item">
              <div className="transaction-info">
                <div className="transaction-icon starknet-icon">
                  <i className="fas fa-layer-group"></i>
                </div>
                <div className="transaction-details">
                  <h4>Starknet to Bitcoin</h4>
                  <p>Processing</p>
                </div>
              </div>
              <div className="transaction-amount">-0.75 BTC</div>
              <div className="status pending">Pending</div>
            </div>
          </div>
        </div>
      </div>

      <footer>
        <p>© 2025 Bitcoin-Starknet Bridge. All rights reserved. | Security Audit Passed | v2.1.4</p>
      </footer>
    </div>
  );
}