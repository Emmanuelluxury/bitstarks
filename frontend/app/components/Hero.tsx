export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <div className="security-badge">
              <i className="fas fa-shield-alt"></i>
              Non-Custodial & Secure
            </div>
            <h1 className="hero-title">Seamlessly Bridge <span>Bitcoin</span> to <span>Starknet</span></h1>
            <p className="hero-subtitle">
              The most secure, fast, and cost-effective way to transfer your Bitcoin assets to Starknet and unlock the potential of Layer 2 scalability.
            </p>
            
            <div className="hero-cta">
              <a href="/bridge">
                <button className="btn btn-primary">
                  <i className="fas fa-bridge"></i>
                  Start Bridging
                </button>
              </a>
              <a href="/learn-more">
                <button className="btn btn-secondary">
                  <i className="fas fa-book"></i>
                  Learn More
                </button>
              </a>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="bridge-visual">
              <div className="bridge-animation">
                <div className="chains">
                  <div className="chain">
                    <i className="fab fa-bitcoin chain-icon bitcoin-icon"></i>
                    <div className="chain-name">Bitcoin</div>
                  </div>
                  <div className="chain">
                    <div className="starknet-icon">
                      <img src="/Starknet.png" alt="" className="starknet-logo-img" />
                    </div>
                    <div className="chain-name">Starknet</div>
                  </div>
                </div>
                
                <div className="bridge-path"></div>
                
                <div className="cubes">
                  <div className="cube"><i className="fas fa-coins"></i></div>
                  <div className="cube"><i className="fas fa-bolt"></i></div>
                  <div className="cube"><i className="fas fa-shield-alt"></i></div>
                  <div className="cube"><i className="fas fa-link"></i></div>
                  <div className="cube"><i className="fas fa-rocket"></i></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}