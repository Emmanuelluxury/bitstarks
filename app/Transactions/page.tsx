'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './styles.css';

export default function TransactionsPage() {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState('All');
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const stats = [
    { icon: 'fas fa-bridge', label: 'Bridge Transactions', value: '24', color: 'stat-bridge' },
    { icon: 'fas fa-exchange-alt', label: 'Swap Transactions', value: '42', color: 'stat-swap' },
    { icon: 'fas fa-lock', label: 'Lock Transactions', value: '15', color: 'stat-lock' },
    { icon: 'fas fa-unlock', label: 'Unlock Transactions', value: '8', color: 'stat-unlock' }
  ];

  const transactions = [
    {
      id: 1,
      type: 'Bridge',
      typeIcon: 'fas fa-bridge',
      typeClass: 'type-bridge',
      fromAsset: 'BTC',
      fromAssetIcon: 'fab fa-bitcoin',
      fromAssetClass: 'asset-btc',
      toAsset: 'tBTC',
      toAssetIcon: 'fas fa-layer-group',
      toAssetClass: 'asset-stark',
      fromNetwork: 'Bitcoin',
      fromNetworkIcon: 'fab fa-bitcoin',
      fromNetworkClass: 'network-btc',
      toNetwork: 'Starknet',
      toNetworkIcon: 'fas fa-layer-group',
      toNetworkClass: 'network-stark',
      amount: '0.25 BTC',
      date: '2 hours ago',
      status: 'completed',
      statusClass: 'status-completed'
    },
    {
      id: 2,
      type: 'Swap',
      typeIcon: 'fas fa-exchange-alt',
      typeClass: 'type-swap',
      fromAsset: 'ETH',
      fromAssetIcon: 'fab fa-ethereum',
      fromAssetClass: 'asset-eth',
      toAsset: 'BTC',
      toAssetIcon: 'fab fa-bitcoin',
      toAssetClass: 'asset-btc',
      fromNetwork: 'Ethereum',
      fromNetworkIcon: 'fab fa-ethereum',
      fromNetworkClass: 'network-eth',
      toNetwork: '',
      toNetworkIcon: '',
      toNetworkClass: '',
      amount: '1.5 ETH',
      date: '5 hours ago',
      status: 'completed',
      statusClass: 'status-completed'
    },
    {
      id: 3,
      type: 'Lock',
      typeIcon: 'fas fa-lock',
      typeClass: 'type-lock',
      fromAsset: 'BTC',
      fromAssetIcon: 'fab fa-bitcoin',
      fromAssetClass: 'asset-btc',
      toAsset: 'tBTC',
      toAssetIcon: 'fas fa-layer-group',
      toAssetClass: 'asset-stark',
      fromNetwork: 'Bitcoin',
      fromNetworkIcon: 'fab fa-bitcoin',
      fromNetworkClass: 'network-btc',
      toNetwork: 'Starknet',
      toNetworkIcon: 'fas fa-layer-group',
      toNetworkClass: 'network-stark',
      amount: '0.1 BTC',
      date: '1 day ago',
      status: 'completed',
      statusClass: 'status-completed'
    },
    {
      id: 4,
      type: 'Unlock',
      typeIcon: 'fas fa-unlock',
      typeClass: 'type-unlock',
      fromAsset: 'tBTC',
      fromAssetIcon: 'fas fa-layer-group',
      fromAssetClass: 'asset-stark',
      toAsset: 'BTC',
      toAssetIcon: 'fab fa-bitcoin',
      toAssetClass: 'asset-btc',
      fromNetwork: 'Starknet',
      fromNetworkIcon: 'fas fa-layer-group',
      fromNetworkClass: 'network-stark',
      toNetwork: 'Bitcoin',
      toNetworkIcon: 'fab fa-bitcoin',
      toNetworkClass: 'network-btc',
      amount: '0.05 BTC',
      date: '2 days ago',
      status: 'completed',
      statusClass: 'status-completed'
    },
    {
      id: 5,
      type: 'Swap',
      typeIcon: 'fas fa-exchange-alt',
      typeClass: 'type-swap',
      fromAsset: 'USDC',
      fromAssetIcon: 'fas fa-dollar-sign',
      fromAssetClass: 'asset-usdc',
      toAsset: 'ETH',
      toAssetIcon: 'fab fa-ethereum',
      toAssetClass: 'asset-eth',
      fromNetwork: 'Polygon',
      fromNetworkIcon: 'fas fa-layer-group',
      fromNetworkClass: 'network-polygon',
      toNetwork: '',
      toNetworkIcon: '',
      toNetworkClass: '',
      amount: '500 USDC',
      date: '3 days ago',
      status: 'pending',
      statusClass: 'status-pending'
    }
  ];

  const typeFilters = ['All', 'Bridge', 'Swap', 'Lock/Unlock'];
  const statusFilters = ['All', 'Completed', 'Pending', 'Failed'];

  const handleTypeFilter = (filter: string) => {
    setActiveTypeFilter(filter);
  };

  const handleStatusFilter = (filter: string) => {
    setActiveStatusFilter(filter);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const connectWallet = () => {
    setConnectedWallet('MetaMask');
  };

  const exportCSV = () => {
    // Mock export functionality
    console.log('Exporting CSV...');
  };

  return (
    <div className="container">
      <header>
        <div className="logo">
          <div className="logo-icon">
            <i className="fas fa-exchange-alt"></i>
          </div>
          <span>CrossChain Dashboard</span>
        </div>
        <nav>
          <ul>
            <li><a href="/bridge"><i className='fas fa-bridge'></i> Bridge</a></li>
            <li><a href="/swap"><i className='fas fa-arrows-alt'></i> Swap</a></li>
            <li><a href="/Lock-Unlock"><i className='fas fa-unlock'></i> Lock-Unlock</a></li>
            <li><a href="#" className="active"><i className='fas fa-history'></i> Transactions</a></li>
          </ul>
        </nav>
        <button className="wallet-connect" onClick={connectWallet}>
          <i className="fas fa-wallet"></i> Connect Wallet
        </button>
      </header>

      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Transaction History</h1>
        </div>

        <div className="dashboard-stats">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className={`stat-icon ${stat.color}`}>
                <i className={stat.icon}></i>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="filters-bar">
          <div className="filter-group">
            <div className="filter-label">Transaction Type:</div>
            <div className="filter-options">
              {typeFilters.map((filter) => (
                <div
                  key={filter}
                  className={`filter-option ${activeTypeFilter === filter ? 'active' : ''}`}
                  onClick={() => handleTypeFilter(filter)}
                >
                  {filter}
                </div>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">Status:</div>
            <div className="filter-options">
              {statusFilters.map((filter) => (
                <div
                  key={filter}
                  className={`filter-option ${activeStatusFilter === filter ? 'active' : ''}`}
                  onClick={() => handleStatusFilter(filter)}
                >
                  {filter}
                </div>
              ))}
            </div>
          </div>
          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="export-button" onClick={exportCSV}>
            <i className="fas fa-download"></i> Export CSV
          </button>
        </div>

        <div className="transactions-container">
          <div className="transactions-header">
            <h2 className="transactions-title">Recent Transactions</h2>
            <div className="transactions-count">Showing {transactions.length} of 89 transactions</div>
          </div>

          <table className="transactions-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Assets</th>
                <th>Networks</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="transaction-row">
                  <td>
                    <div className="transaction-type">
                      <div className={`type-icon ${tx.typeClass}`}>
                        <i className={tx.typeIcon}></i>
                      </div>
                      <div className="type-name">{tx.type}</div>
                    </div>
                  </td>
                  <td>
                    <div className="transaction-assets">
                      <div className="asset-from">
                        <div className={`asset-icon ${tx.fromAssetClass}`}>
                          <i className={tx.fromAssetIcon}></i>
                        </div>
                        <span>{tx.fromAsset}</span>
                      </div>
                      <i className="fas fa-arrow-right transaction-arrow"></i>
                      <div className="asset-to">
                        <div className={`asset-icon ${tx.toAssetClass}`}>
                          <i className={tx.toAssetIcon}></i>
                        </div>
                        <span>{tx.toAsset}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="transaction-networks">
                      <div className="network-from">
                        <div className={`network-icon ${tx.fromNetworkClass}`}>
                          <i className={tx.fromNetworkIcon}></i>
                        </div>
                        <span>{tx.fromNetwork}</span>
                      </div>
                      {tx.toNetwork && (
                        <>
                          <i className="fas fa-arrow-right transaction-arrow"></i>
                          <div className="network-to">
                            <div className={`network-icon ${tx.toNetworkClass}`}>
                              <i className={tx.toNetworkIcon}></i>
                            </div>
                            <span>{tx.toNetwork}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="asset-amount">{tx.amount}</td>
                  <td className="transaction-date">{tx.date}</td>
                  <td>
                    <div className={`transaction-status ${tx.statusClass}`}>{tx.status}</div>
                  </td>
                  <td>
                    <div className="transaction-actions">
                      <button className="action-button">
                        <i className="fas fa-external-link-alt"></i>
                      </button>
                      <button className="action-button">
                        <i className="far fa-copy"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <div className="pagination-info">Page {currentPage} of 9</div>
            <div className="pagination-controls">
              <button
                className="pagination-button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              {[1, 2, 3, 4, 5].map((page) => (
                <button
                  key={page}
                  className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="pagination-button"
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        <footer>
          <p>© 2025 CrossChain Dashboard. All rights reserved. Use at your own risk.</p>
        </footer>
      </div>
    </div>
  );
}