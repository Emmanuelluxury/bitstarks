'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import WalletModal from '../components/WalletModal';
import './styles.css';

export default function LockUnlockPage() {
  const [mode, setMode] = useState<'lock' | 'unlock'>('lock');
  const [amount, setAmount] = useState('0.1');
  const [address, setAddress] = useState('0x1234...5678');
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<'bitcoin' | 'starknet'>('bitcoin');

  const stats = [
    { icon: 'fas fa-bridge', label: 'Bridge Transactions', value: '24', color: 'stat-bridge' },
    { icon: 'fas fa-exchange-alt', label: 'Swap Transactions', value: '42', color: 'stat-swap' },
    { icon: 'fas fa-lock', label: 'Lock Transactions', value: '15', color: 'stat-lock' },
    { icon: 'fas fa-unlock', label: 'Unlock Transactions', value: '8', color: 'stat-unlock' }
  ];

  const assets = [
    {
      id: 1,
      type: 'locked',
      name: 'Bitcoin (Locked)',
      network: 'On Bitcoin Network',
      amount: '0.7500 BTC',
      usdValue: '$28,450.50',
      status: 'locked'
    },
    {
      id: 2,
      type: 'unlocked',
      name: 'Bitcoin (Unlocked)',
      network: 'On Starknet',
      amount: '0.7450 tBTC',
      usdValue: '$28,250.75',
      status: 'unlocked'
    },
    {
      id: 3,
      type: 'locked',
      name: 'Bitcoin (Locking)',
      network: 'Processing',
      amount: '0.1000 BTC',
      usdValue: '$3,795.00',
      status: 'pending'
    }
  ];

  const handleModeToggle = (newMode: 'lock' | 'unlock') => {
    setMode(newMode);
  };

  const handleMaxClick = () => {
    setAmount('1.2543');
  };

  const handleAction = () => {
    // Mock action functionality
    console.log(`${mode === 'lock' ? 'Locking' : 'Unlocking'} ${amount} BTC`);
  };

  const connectWallet = () => {
    setIsWalletModalOpen(true);
  };

  const handleWalletConnect = (type: string) => {
    console.log('Connecting wallet:', type);
    setConnectedWallet(type);
    setIsWalletModalOpen(false);
  };

  const handleCloseWalletModal = () => {
    setIsWalletModalOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const refreshAssets = () => {
    // Mock refresh functionality
    console.log('Refreshing assets...');
  };

  return (
    <div className='container'>
      <header>
        <div className="logo">
          <div className="logo-icon">
            <i className="fas fa-lock"></i>
          </div>
          <span>BitStark Lock-Unlock</span>
        </div>
        <nav>
          <ul>
            <li><a href="#" className="active"><i className='fas fa-unlock'></i> Lock/Unlock</a></li>
            <li><a href="/bridge"><i className='fas fa-bridge'></i> Bridge</a></li>
            <li><a href="/Transactions"><i className="fas fa-history"></i> Transactions</a></li>
            <li><a href="/swap"><i className="fas fa-arrows-alt"></i> Swap</a></li>
          </ul>
        </nav>
        <button className="wallet-connect" onClick={connectWallet}>
          <i className="fas fa-wallet"></i> Connect Wallet
        </button>
      </header>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={handleCloseWalletModal}
        onConnectWallet={handleWalletConnect}
      />

      <div className="container">
        <div className="main-content">
          <div className="lock-card">
            <div className="card-header">
              <h2 className="card-title">Bitcoin Lock & Unlock</h2>
              <div className="mode-toggle">
                <div
                  className={`toggle-option ${mode === 'lock' ? 'toggle-active' : ''}`}
                  onClick={() => handleModeToggle('lock')}
                >
                  <i className="fas fa-lock"></i> Lock BTC
                </div>
                <div
                  className={`toggle-option ${mode === 'unlock' ? 'toggle-active' : ''}`}
                  onClick={() => handleModeToggle('unlock')}
                >
                  <i className="fas fa-unlock"></i> Unlock BTC
                </div>
              </div>
            </div>

            <div className="process-flow">
              <div className="process-connector"></div>
              <div className={`process-step ${mode === 'unlock' ? 'step-active' : 'step-completed'}`}>
                <div className="step-icon">
                  <i className="fab fa-bitcoin"></i>
                </div>
                <div className="step-label">Bitcoin Network</div>
              </div>
              <div className={`process-step ${mode === 'lock' ? 'step-active' : ''}`}>
                <div className="step-icon">
                  <i className="fas fa-lock"></i>
                </div>
                <div className="step-label">Lock BTC</div>
              </div>
              <div className={`process-step ${mode === 'unlock' ? 'step-completed' : ''}`}>
                <div className="step-icon">
                  <i className="fas fa-layer-group"></i>
                </div>
                <div className="step-label">Starknet</div>
              </div>
            </div>

            <div className="lock-form">
              <div className="form-section">
                <div className="section-title">
                  <i className="fas fa-coins"></i>
                  <span>Amount to {mode === 'lock' ? 'Lock' : 'Unlock'}</span>
                </div>
                <div className="input-group">
                  <div className="input-label">
                    <span>Bitcoin Amount</span>
                    <span>Balance: 1.2543 BTC</span>
                  </div>
                  <div className="input-container">
                    <input
                      type="number"
                      className="amount-field"
                      placeholder="0.0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <button className="max-button" onClick={handleMaxClick}>MAX</button>
                  </div>
                </div>
                <div className="input-group">
                  <div className="input-label">
                    <span>Starknet Address</span>
                    <span>Where to receive</span>
                  </div>
                  <div className="input-container">
                    <input
                      type="text"
                      className="address-field"
                      placeholder="0x..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="info-box">
                <div className="info-title">
                  <i className="fas fa-info-circle"></i>
                  <span>Locking Information</span>
                </div>
                <div className="info-text">
                  Locking your Bitcoin will create a representation of it on Starknet.
                  You'll be able to use your locked Bitcoin in Starknet DeFi applications.
                  The unlocking process will return your Bitcoin to your specified address.
                </div>
              </div>

              <button className={`action-button ${mode === 'unlock' ? 'unlock' : ''}`} onClick={handleAction}>
                <i className={`fas fa-${mode === 'lock' ? 'lock' : 'unlock'}`}></i> {mode === 'lock' ? 'Lock' : 'Unlock'} Bitcoin
              </button>

              <div className="lock-details">
                <div className="detail-row">
                  <div className="detail-label">You will receive</div>
                  <div className="detail-value">0.0995 tBTC</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Lock Fee</div>
                  <div className="detail-value">0.0005 BTC</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Transaction ID</div>
                  <div className="detail-value">
                    bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
                    <button className="copy-button" onClick={() => copyToClipboard('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')}>
                      <i className="far fa-copy"></i>
                    </button>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Estimated Time</div>
                  <div className="detail-value">~20 minutes</div>
                </div>
              </div>
            </div>
          </div>

          <div className="locked-assets">
            <div className="assets-header">
              <h2 className="assets-title">Your Assets</h2>
              <button className="refresh-button" onClick={refreshAssets}>
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>

            <div className="assets-list">
              {assets.map((asset) => (
                <div key={asset.id} className={`asset-item ${asset.type}`}>
                  <div className="asset-info">
                    <div className={`asset-icon ${asset.type === 'locked' ? 'btc-icon' : 'stark-icon'}`}>
                      <i className={asset.type === 'locked' ? 'fab fa-bitcoin' : 'fas fa-layer-group'}></i>
                    </div>
                    <div className="asset-details">
                      <h4>{asset.name}</h4>
                      <p>{asset.network}</p>
                      <div className={`asset-status status-${asset.status}`}>
                        {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                      </div>
                    </div>
                  </div>
                  <div className="asset-amount">
                    <div className="asset-value">{asset.amount}</div>
                    <div className="asset-usd">{asset.usdValue}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="empty-state" style={{ display: 'none' }}>
              <div className="empty-icon">
                <i className="fas fa-box-open"></i>
              </div>
              <div className="empty-text">No locked assets found</div>
            </div>
          </div>
        </div>

        <footer>
          <p>© 2025 Bitcoin Lock. All rights reserved. Use at your own risk.</p>
        </footer>
      </div>
    </div>
  );
}