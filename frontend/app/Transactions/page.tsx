'use client';

import { useState, useMemo, Suspense } from 'react';
import { useTransactions } from '../components/TransactionContext';
import { Transaction } from '../globals';
import './styles.css';

function TxDetailModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const isStarknet = tx.fromNetwork === 'Starknet' || tx.toNetwork === 'Starknet';
  const isBtc      = tx.fromNetwork === 'Bitcoin'  || tx.toNetwork === 'Bitcoin';

  const explorerLinks: { label: string; url: string }[] = [];
  if (tx.txHash && tx.txHash !== 'failed') {
    if (tx.fromNetwork === 'Bitcoin' || (tx.details?.btcTxHash && tx.details.btcTxHash === tx.txHash)) {
      explorerLinks.push({ label: 'View on Mempool', url: `https://mempool.space/testnet4/tx/${tx.txHash}` });
    }
    if (tx.fromNetwork === 'Starknet' || tx.txHash.startsWith('0x')) {
      explorerLinks.push({ label: 'View on Starkscan', url: `https://sepolia.starkscan.co/tx/${tx.txHash}` });
    }
  }
  if (tx.details?.btcTxHash && tx.details.btcTxHash !== tx.txHash && tx.details.btcTxHash !== 'failed') {
    explorerLinks.push({ label: 'Bitcoin TX on Mempool', url: `https://mempool.space/testnet4/tx/${tx.details.btcTxHash}` });
  }
  if (tx.details?.starknetTxHash && tx.details.starknetTxHash !== tx.txHash) {
    explorerLinks.push({ label: 'Starknet TX on Starkscan', url: `https://sepolia.starkscan.co/tx/${tx.details.starknetTxHash}` });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card-bg, #0f172a)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px', padding: '28px', maxWidth: '560px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Transaction Details</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: '20px' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Row label="Type"   value={tx.type} />
          <Row label="Status" value={<span className={`transaction-status ${tx.statusClass}`}>{tx.status}</span>} />
          <Row label="Amount" value={tx.amount} />
          <Row label="Date"   value={tx.date} />
          <Row label="From"   value={`${tx.fromAsset} (${tx.fromNetwork})`} />
          <Row label="To"     value={`${tx.toAsset} (${tx.toNetwork})`} />

          {tx.details?.fromAddress && (
            <Row label="Sender address" value={<Mono>{tx.details.fromAddress}</Mono>} />
          )}
          {tx.details?.toAddress && (
            <Row label="Recipient address" value={<Mono>{tx.details.toAddress}</Mono>} />
          )}
          {tx.txHash && tx.txHash !== 'failed' && (
            <Row label="Tx hash" value={<Mono>{tx.txHash}</Mono>} />
          )}
          {tx.details?.btcTxHash && tx.details.btcTxHash !== tx.txHash && tx.details.btcTxHash !== 'failed' && (
            <Row label="Bitcoin tx hash" value={<Mono>{tx.details.btcTxHash}</Mono>} />
          )}
          {tx.details?.starknetTxHash && tx.details.starknetTxHash !== tx.txHash && (
            <Row label="Starknet tx hash" value={<Mono>{tx.details.starknetTxHash}</Mono>} />
          )}
          {tx.details?.error && (
            <Row label="Error" value={<span style={{ color: 'var(--danger, #ef4444)' }}>{tx.details.error}</span>} />
          )}
        </div>

        {explorerLinks.length > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {explorerLinks.map(link => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                style={{ padding: '8px 16px', background: 'var(--primary, #7c3aed)', borderRadius: '8px',
                  color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                <i className="fas fa-external-link-alt" style={{ marginRight: '6px' }}></i>
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--gray, #64748b)', fontSize: '13px', minWidth: '140px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13px', wordBreak: 'break-all', flex: 1 }}>{value}</span>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{children}</span>;
}

function TransactionsContent() {
  const { transactions } = useTransactions();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const [activeTypeFilter, setActiveTypeFilter]     = useState('All');
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery]               = useState('');
  const [currentPage, setCurrentPage]               = useState(1);

  const typeFilters   = ['All', 'Bridge', 'Swap', 'Lock/Unlock'];
  const statusFilters = ['All', 'Completed', 'Pending', 'Failed'];

  const stats = useMemo(() => [
    { icon: 'fas fa-bridge',       label: 'Bridge Transactions', value: transactions.filter(t => t.type === 'Bridge').length,  color: 'stat-bridge'  },
    { icon: 'fas fa-exchange-alt', label: 'Swap Transactions',   value: transactions.filter(t => t.type === 'Swap').length,    color: 'stat-swap'    },
    { icon: 'fas fa-lock',         label: 'Lock Transactions',   value: transactions.filter(t => t.type === 'Lock').length,    color: 'stat-lock'    },
    { icon: 'fas fa-unlock',       label: 'Unlock Transactions', value: transactions.filter(t => t.type === 'Unlock').length,  color: 'stat-unlock'  },
  ], [transactions]);

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    if (activeTypeFilter !== 'All') {
      if (activeTypeFilter === 'Lock/Unlock') {
        list = list.filter(tx => tx.type === 'Lock' || tx.type === 'Unlock');
      } else {
        list = list.filter(tx => tx.type === activeTypeFilter);
      }
    }

    if (activeStatusFilter !== 'All') {
      const map: Record<string, string> = { Completed: 'completed', Pending: 'pending', Failed: 'failed' };
      list = list.filter(tx => tx.status === map[activeStatusFilter]);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(tx =>
        tx.type.toLowerCase().includes(q)        ||
        tx.fromAsset.toLowerCase().includes(q)   ||
        tx.toAsset.toLowerCase().includes(q)     ||
        tx.fromNetwork.toLowerCase().includes(q) ||
        tx.amount.toLowerCase().includes(q)      ||
        tx.status.toLowerCase().includes(q)      ||
        (tx.txHash ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [transactions, activeTypeFilter, activeStatusFilter, searchQuery]);

  const itemsPerPage = 10;
  const totalPages   = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const paginated    = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const exportCSV = () => {
    const rows = [
      ['Type', 'From', 'To', 'Amount', 'Date', 'Status', 'Tx Hash'],
      ...filteredTransactions.map(tx => [
        tx.type, tx.fromNetwork, tx.toNetwork, tx.amount, tx.date, tx.status, tx.txHash ?? '',
      ]),
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      {selectedTx && <TxDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}

      <header>
        <div className="logo">
          <div className="logo-icon"><i className="fas fa-exchange-alt"></i></div>
          <span>BitStark Transactions</span>
        </div>
        <nav>
          <ul>
            <li><a href="/bridge"><i className="fas fa-bridge"></i> Bridge</a></li>
            <li><a href="#" className="active"><i className="fas fa-history"></i> Transactions</a></li>
          </ul>
        </nav>
      </header>

      <div className="dashboard-header">
        <h1 className="dashboard-title">Transaction History</h1>
      </div>

      <div className="dashboard-stats">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.color}`}><i className={s.icon}></i></div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <div className="filter-label">Type:</div>
          <div className="filter-options">
            {typeFilters.map(f => (
              <div key={f} className={`filter-option ${activeTypeFilter === f ? 'active' : ''}`}
                onClick={() => { setActiveTypeFilter(f); setCurrentPage(1); }}>
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-label">Status:</div>
          <div className="filter-options">
            {statusFilters.map(f => (
              <div key={f} className={`filter-option ${activeStatusFilter === f ? 'active' : ''}`}
                onClick={() => { setActiveStatusFilter(f); setCurrentPage(1); }}>
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="search-box">
          <i className="fas fa-search search-icon"></i>
          <input type="text" className="search-input" placeholder="Search by asset, network, hash…"
            value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
        </div>
        <button className="export-button" onClick={exportCSV}>
          <i className="fas fa-download"></i> Export CSV
        </button>
      </div>

      <div className="transactions-container">
        <div className="transactions-header">
          <h2 className="transactions-title">Recent Transactions</h2>
          <div className="transactions-count">
            Showing {paginated.length} of {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </div>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
            <i className="fas fa-history" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', opacity: 0.4 }}></i>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No transactions yet</p>
            <p style={{ fontSize: '14px' }}>Bridge some BTC or STRK to see your history here.</p>
            <a href="/bridge" style={{ display: 'inline-block', marginTop: '20px', padding: '10px 24px',
              background: 'var(--primary)', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
              Go to Bridge
            </a>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)' }}>
            <i className="fas fa-filter" style={{ fontSize: '32px', marginBottom: '12px', display: 'block', opacity: 0.4 }}></i>
            <p>No transactions match your filter.</p>
          </div>
        ) : (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Assets</th>
                <th>Networks</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Tx Hash</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(tx => (
                <tr key={tx.id} className="transaction-row" style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedTx(tx)}>
                  <td>
                    <div className="transaction-type">
                      <div className={`type-icon ${tx.typeClass}`}><i className={tx.typeIcon}></i></div>
                      <div className="type-name">{tx.type}</div>
                    </div>
                  </td>
                  <td>
                    <div className="transaction-assets">
                      <div className="asset-from">
                        <div className={`asset-icon ${tx.fromAssetClass}`}><i className={tx.fromAssetIcon}></i></div>
                        <span>{tx.fromAsset}</span>
                      </div>
                      <i className="fas fa-arrow-right transaction-arrow"></i>
                      <div className="asset-to">
                        <div className={`asset-icon ${tx.toAssetClass}`}><i className={tx.toAssetIcon}></i></div>
                        <span>{tx.toAsset}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="transaction-networks">
                      <div className="network-from">
                        <div className={`network-icon ${tx.fromNetworkClass}`}><i className={tx.fromNetworkIcon}></i></div>
                        <span>{tx.fromNetwork}</span>
                      </div>
                      {tx.toNetwork && (
                        <>
                          <i className="fas fa-arrow-right transaction-arrow"></i>
                          <div className="network-to">
                            <div className={`network-icon ${tx.toNetworkClass}`}><i className={tx.toNetworkIcon}></i></div>
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
                    {tx.txHash && tx.txHash !== 'failed' ? (
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gray)' }}
                        title={tx.txHash}>
                        {tx.txHash.slice(0, 10)}…
                      </span>
                    ) : (
                      <span style={{ color: 'var(--gray)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span style={{ color: 'var(--primary)', fontSize: '13px' }}>
                      <i className="fas fa-chevron-right"></i>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">Page {currentPage} of {totalPages}</div>
            <div className="pagination-controls">
              <button className="pagination-button" disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                <i className="fas fa-chevron-left"></i>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button key={page}
                    className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}>
                    {page}
                  </button>
                );
              })}
              <button className="pagination-button" disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      <footer>
        <p>© 2025 BitStark Transactions. All rights reserved. Use at your own risk.</p>
      </footer>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
