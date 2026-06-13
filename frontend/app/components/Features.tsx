export default function Features() {
  const features = [
    {
      icon: 'fas fa-shield-alt',
      title: 'Secure',
      description: 'Non-custodial bridge with audited smart contracts ensuring the highest security standards for your assets.'
    },
    {
      icon: 'fas fa-bolt',
      title: 'Fast',
      description: 'Quick transfers with optimized processes that minimize waiting time between Bitcoin and StarkNet.'
    },
    {
      icon: 'fas fa-dollar-sign',
      title: 'Low Fees',
      description: 'Save on gas costs with our efficient bridging mechanism that reduces transaction fees significantly.'
    }
  ];

  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Why Use Our Bridge?</h2>
          <p className="section-subtitle">Experience seamless cross-chain transfers with our advanced technology</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                <i className={feature.icon}></i>
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}