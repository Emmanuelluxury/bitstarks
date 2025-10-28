export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-content">
          <div className="footer-info">
            <div className="footer-logo">
              <i className="fas fa-link"></i>
              BTC→STARK
            </div>
            <p className="footer-description">
              The most secure and efficient Bitcoin to StarkNet bridge on the market.
            </p>
            <div className="social-links">
              <a href="#"><i className="fab fa-twitter"></i></a>
              <a href="#"><i className="fab fa-discord"></i></a>
              <a href="#"><i className="fab fa-github"></i></a>
              <a href="#"><i className="fab fa-telegram"></i></a>
            </div>
          </div>
          <div className="footer-links">
            <h3>Product</h3>
            <ul>
              <li><a href="#">Bridge</a></li>
              <li><a href="#">Fees</a></li>
              <li><a href="#">Security</a></li>
              <li><a href="#">Status</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h3>Resources</h3>
            <ul>
              <li><a href="/documentation">Documentation</a></li>
              <li><a href="#">Tutorials</a></li>
              <li><a href="#">API</a></li>
              <li><a href="#">Support</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h3>Company</h3>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press</a></li>
            </ul>
          </div>
        </div>
        <div className="copyright">
          <p>&copy; 2025 Bitcoin-StarkNet Bridge. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}