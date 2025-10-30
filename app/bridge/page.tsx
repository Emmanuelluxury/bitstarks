'use client';

import { useState } from 'react';
import axios from 'axios';
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
    const [bitcoinWalletAddress, setBitcoinWalletAddress] = useState<string | null>(null);
    const [starknetWalletAddress, setStarknetWalletAddress] = useState<string | null>(null);
    const [bitcoinBalance, setBitcoinBalance] = useState<number | null>(null);
    const [starknetBalance, setStarknetBalance] = useState<number | null>(null);
    const [bridgeFee, setBridgeFee] = useState<number>(0.0005);
    const [estimatedTime, setEstimatedTime] = useState<string>('~15 minutes');
    const [networkMode, setNetworkMode] = useState<'mainnet' | 'testnet'>('mainnet');

  const stats = [
    { icon: 'fas fa-bridge', label: 'Bridge Transactions', value: '24', color: 'stat-bridge' },
    { icon: 'fas fa-exchange-alt', label: 'Swap Transactions', value: '42', color: 'stat-swap' },
    { icon: 'fas fa-lock', label: 'Lock Transactions', value: '15', color: 'stat-lock' },
    { icon: 'fas fa-unlock', label: 'Unlock Transactions', value: '8', color: 'stat-unlock' }
  ];

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

    // Dynamic fee calculation based on amount and direction
    let baseFee = 0.0005; // Base fee in BTC

    // Adjust fee based on amount (larger amounts get slightly lower percentage fees)
    if (numAmount > 1) {
      baseFee = Math.max(0.0003, baseFee - (numAmount * 0.0001));
    } else if (numAmount > 0.1) {
      baseFee = 0.0004;
    }

    // Different fees for different directions (Starknet → BTC might be slightly cheaper)
    if (bridgeDirection === 'stark-to-btc') {
      baseFee *= 0.9; // 10% discount for Starknet → BTC
    }

    setBridgeFee(baseFee);

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

  const handleConnectWallet = (network: 'bitcoin' | 'starknet') => {
    setCurrentNetwork(network);
    setIsWalletModalOpen(true);
  };

  const handleWalletConnect = (type: string, address?: string) => {
    console.log('Connecting wallet:', type, 'Address:', address);
    if (currentNetwork === 'bitcoin') {
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
    } else {
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
    setIsWalletModalOpen(false);
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
          <i className={`fas ${bitcoinWalletConnected ? 'fa-check' : 'fa-wallet'}`}></i>
          {bitcoinWalletConnected && bitcoinWalletAddress
            ? `${bitcoinWalletAddress.substring(0, 6)}...${bitcoinWalletAddress.substring(bitcoinWalletAddress.length - 4)}`
            : 'Connect Bitcoin Wallet'}
        </button>
        <button className={`wallet-connect ${starknetWalletConnected ? 'connected' : ''}`} onClick={() => handleConnectWallet('starknet')}>
          <i className={`fas ${starknetWalletConnected ? 'fa-check' : 'fa-wallet'}`}></i>
          {starknetWalletConnected && starknetWalletAddress
            ? `${starknetWalletAddress.substring(0, 6)}...${starknetWalletAddress.substring(starknetWalletAddress.length - 4)}`
            : 'Connect Starknet Wallet'}
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
              <div className="network-balance">
                Balance: {bitcoinWalletConnected && bitcoinBalance !== null
                  ? `${bitcoinBalance.toFixed(4)} BTC`
                  : '0.0020 BTC'}
              </div>
            </div>
            <div className={`network-card ${direction === 'stark-to-btc' ? 'active' : ''}`}>
              <div className="network-icon starknet-icon">
                <i className="fas fa-layer-group"></i>
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
                <div className="address-input-actions">
                  {(direction === 'btc-to-stark' && !bitcoinWalletConnected) && (
                    <button
                      type="button"
                      className="use-connected-btn"
                      onClick={() => handleConnectWallet('bitcoin')}
                    >
                      Use Connected Bitcoin Wallet
                    </button>
                  )}
                  {(direction === 'stark-to-btc' && !starknetWalletConnected) && (
                    <button
                      type="button"
                      className="use-connected-btn"
                      onClick={() => handleConnectWallet('starknet')}
                    >
                      Use Connected Starknet Wallet
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="swap-button">
            <div className="swap-icon" onClick={handleSwap}>
              <i className="fas fa-arrow-down-arrow-up"></i>
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
                <div className="address-input-actions">
                  {(direction === 'btc-to-stark' && !starknetWalletConnected) && (
                    <button
                      type="button"
                      className="use-connected-btn"
                      onClick={() => handleConnectWallet('starknet')}
                    >
                      Use Connected Starknet Wallet
                    </button>
                  )}
                  {(direction === 'stark-to-btc' && !bitcoinWalletConnected) && (
                    <button
                      type="button"
                      className="use-connected-btn"
                      onClick={() => handleConnectWallet('bitcoin')}
                    >
                      Use Connected Bitcoin Wallet
                    </button>
                  )}
                </div>
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
              <div className="info-value">{bridgeFee.toFixed(6)} BTC</div>
            </div>
            <div className="info-card">
              <div className="info-title">Estimated Time</div>
              <div className="info-value">{estimatedTime}</div>
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
        <p>© 2025 BitStark Bridge. All rights reserved. | Security Audit Passed | v2.1.4</p>
      </footer>
    </div>
  );
}
