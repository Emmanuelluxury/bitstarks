'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTransactions } from '../components/TransactionContext';
import { initStarknet, getUserRecentTransactions } from '../utils/starknet';
import './styles.css';

function TransactionsContent() {
    const { getTransactionsByWallet } = useTransactions();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');

    const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
    const [activeTypeFilter, setActiveTypeFilter] = useState('All');
    const [activeStatusFilter, setActiveStatusFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [userTransactions, setUserTransactions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'transactions' | 'tokens'>('transactions');
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [transactionError, setTransactionError] = useState<string | null>(null);

    // Handle URL parameter for tab switching
    useEffect(() => {
      if (tabParam === 'tokens') {
        setActiveTab('tokens');
      } else {
        setActiveTab('transactions');
      }
    }, [tabParam]);

  // Use user transactions from context, fallback to mock data if no wallet connected
  const transactions = connectedWallet && userTransactions.length > 0 ? userTransactions : [
    {
      id: 1,
      type: 'Bridge',
      typeIcon: 'fas fa-bridge',
      typeClass: 'type-bridge',
      fromAsset: 'BTC',
      fromAssetIcon: 'fab fa-bitcoin',
      fromAssetClass: 'asset-btc',
      toAsset: 'STRK',
      toAssetIcon: 'fab fa-ethereum',
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
      id: 6,
      type: 'Bridge',
      typeIcon: 'fas fa-bridge',
      typeClass: 'type-bridge',
      fromAsset: 'STRK',
      fromAssetIcon: 'fab fa-ethereum',
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
      amount: '0.3 STRK',
      date: '4 hours ago',
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

  const typeFilters = ['All', 'Bridge', 'Swap', 'Lock/Unlock'];
  const statusFilters = ['All', 'Completed', 'Pending', 'Failed'];

  // Helper functions for transaction mapping
  const mapTransactionType = (contractType: string) => {
    const typeMap: {[key: string]: string} = {
      'Deposit': 'Bridge',
      'Withdraw': 'Bridge',
      'Lock': 'Lock',
      'Unlock': 'Unlock',
      'BridgeBTCToToken': 'Bridge',
      'BridgeTokenToBTC': 'Bridge',
      'SwapTokenToToken': 'Swap',
      'Send': 'Bridge',
      'Receive': 'Bridge'
    };
    return typeMap[contractType] || 'Bridge';
  };

  const getTransactionTypeIcon = (contractType: string) => {
    const iconMap: {[key: string]: string} = {
      'Deposit': 'fas fa-bridge',
      'Withdraw': 'fas fa-bridge',
      'Lock': 'fas fa-lock',
      'Unlock': 'fas fa-unlock',
      'BridgeBTCToToken': 'fas fa-bridge',
      'BridgeTokenToBTC': 'fas fa-bridge',
      'SwapTokenToToken': 'fas fa-exchange-alt',
      'Send': 'fas fa-paper-plane',
      'Receive': 'fas fa-inbox'
    };
    return iconMap[contractType] || 'fas fa-bridge';
  };

  const handleTypeFilter = (filter: string) => {
    setActiveTypeFilter(filter);
  };

  const handleStatusFilter = (filter: string) => {
    setActiveStatusFilter(filter);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const connectWallet = () => {
    setConnectedWallet('MetaMask');
  };

  // Update user transactions when wallet connects
  useEffect(() => {
    const fetchContractTransactions = async () => {
      if (connectedWallet) {
        setIsLoadingTransactions(true);
        setTransactionError(null);

        try {
          // Initialize Starknet connection
          await initStarknet();

          // Mock wallet address for demo - in real app this would come from wallet connection
          const mockWalletAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

          // Try to fetch from contract first
          try {
            const contractTransactions = await getUserRecentTransactions(mockWalletAddress, 50);
            console.log('Fetched transactions from contract:', contractTransactions);

            // Convert contract transactions to app format
            const formattedTransactions = contractTransactions.map((tx: any, index: number) => ({
              id: index + 1,
              type: mapTransactionType(tx.transaction_type),
              typeIcon: getTransactionTypeIcon(tx.transaction_type),
              typeClass: `type-${tx.transaction_type.toLowerCase()}`,
              fromAsset: tx.token || 'BTC',
              fromAssetIcon: 'fab fa-bitcoin',
              fromAssetClass: 'asset-btc',
              toAsset: tx.token || 'tBTC',
              toAssetIcon: 'fas fa-layer-group',
              toAssetClass: 'asset-stark',
              fromNetwork: 'Bitcoin',
              fromNetworkIcon: 'fab fa-bitcoin',
              fromNetworkClass: 'network-btc',
              toNetwork: 'Starknet',
              toNetworkIcon: 'fas fa-layer-group',
              toNetworkClass: 'network-stark',
              amount: `${(Number(tx.amount) / 100000000).toFixed(8)} BTC`,
              date: new Date(tx.timestamp * 1000).toLocaleString(),
              status: 'completed',
              statusClass: 'status-completed',
              walletAddress: mockWalletAddress,
              txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
              details: {
                fee: '0.0001 BTC',
                receivedAmount: `${(Number(tx.amount) / 100000000).toFixed(8)} BTC`,
                estimatedTime: '~10 minutes'
              }
            }));

            setUserTransactions(formattedTransactions);
          } catch (contractError) {
            console.warn('Failed to fetch from contract, using context transactions:', contractError);
            // Fallback to context transactions
            const transactions = getTransactionsByWallet(mockWalletAddress);
            setUserTransactions(transactions);
          }
        } catch (error: any) {
          console.error('Failed to fetch transactions:', error);
          setTransactionError('Failed to load transactions from blockchain');
          // Fallback to context transactions
          const mockWalletAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
          const transactions = getTransactionsByWallet(mockWalletAddress);
          setUserTransactions(transactions);
        } finally {
          setIsLoadingTransactions(false);
        }
      } else {
        setUserTransactions([]);
        setTransactionError(null);
      }
    };

    fetchContractTransactions();
  }, [connectedWallet, getTransactionsByWallet]);

  // Filtered and searched transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply type filter
    if (activeTypeFilter !== 'All') {
      if (activeTypeFilter === 'Lock/Unlock') {
        filtered = filtered.filter(tx => tx.type === 'Lock' || tx.type === 'Unlock');
      } else {
        filtered = filtered.filter(tx => tx.type === activeTypeFilter);
      }
    }

    // Apply status filter
    if (activeStatusFilter !== 'All') {
      const statusMap = {
        'Completed': 'completed',
        'Pending': 'pending',
        'Failed': 'failed'
      };
      filtered = filtered.filter(tx => tx.status === statusMap[activeStatusFilter as keyof typeof statusMap]);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.type.toLowerCase().includes(query) ||
        tx.fromAsset.toLowerCase().includes(query) ||
        tx.toAsset.toLowerCase().includes(query) ||
        tx.fromNetwork.toLowerCase().includes(query) ||
        tx.toNetwork.toLowerCase().includes(query) ||
        tx.amount.toLowerCase().includes(query) ||
        tx.status.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [transactions, activeTypeFilter, activeStatusFilter, searchQuery]);

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

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
          <span>BitStark Transactions</span>
        </div>
        <nav>
          <ul>
            <li><a href="/bridge"><i className='fas fa-bridge'></i> Bridge</a></li>
            {/* <li><a href="/swap"><i className='fas fa-arrows-alt'></i> Swap</a></li> */}
            {/* <li><a href="/Lock-Unlock"><i className='fas fa-unlock'></i> Lock-Unlock</a></li> */}
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
            <div className="transactions-count">
              {isLoadingTransactions ? 'Loading transactions...' : `Showing ${paginatedTransactions.length} of ${filteredTransactions.length} transactions`}
            </div>
          </div>

          {transactionError && (
            <div className="error-message" style={{ color: 'red', marginBottom: '20px', textAlign: 'center', padding: '10px', backgroundColor: '#fee', borderRadius: '5px' }}>
              {transactionError}
            </div>
          )}

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
              {paginatedTransactions.map((tx) => (
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
            <div className="pagination-info">Page {currentPage} of {totalPages}</div>
            <div className="pagination-controls">
              <button
                className="pagination-button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={page}
                    className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                className="pagination-button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        <footer>
          <p>© 2025 BitStark Transactions. All rights reserved. Use at your own risk.</p>
        </footer>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}