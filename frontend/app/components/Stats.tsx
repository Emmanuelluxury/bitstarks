export default function Stats() {
  const stats = [
    {
      icon: 'fab fa-bitcoin',
      value: '$1.2B+',
      label: 'Total Volume Bridged',
      className: 'bitcoin-icon'
    },
    {
      icon: 'fas fa-layer-group',
      value: '65,412',
      label: 'Successful Transactions',
      className: 'starknet-icon'
    },
    {
      icon: 'fas fa-check-circle',
      value: '99.9%',
      label: 'Uptime & Reliability',
      className: 'proof-icon'
    },
    {
      icon: 'fas fa-server',
      value: '12',
      label: 'Active Operators',
      className: 'operator-icon'
    }
  ];

  return (
    <section className="stats" id="stats">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Network Statistics</h2>
          <p className="section-subtitle">Real-time data on bridge activity and performance</p>
        </div>
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className={`stat-icon ${stat.className}`}>
                <i className={stat.icon}></i>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}