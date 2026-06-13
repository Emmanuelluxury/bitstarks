'use client';

import { useState, useEffect } from 'react';

interface HeaderProps {
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  connectedWallet: string | null;
  connectedAddress: string | null;
}

export default function Header({ onConnectWallet, onDisconnectWallet, connectedWallet, connectedAddress }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMobileConnect = () => {
    onConnectWallet();
    setMobileMenuOpen(false);
  };

  const handleMobileDisconnect = () => {
    onDisconnectWallet();
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className={scrolled ? 'scrolled' : ''}>
        <div className="container">
          <nav>
            <a href="#" className="logo">
              <i className="fas fa-link logo-icon"></i>
              BTC→STARK
            </a>
            <ul className="nav-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#bridge">Bridge</a></li>
              <li><a href="#stats">Stats</a></li>
              <li><a href="#testimonials">Testimonials</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
            <div>
              <span className="live-status">Live</span>
              {connectedWallet ? (
                <button className="disconnect-wallet" onClick={onDisconnectWallet}>
                  <i className="fas fa-sign-out-alt"></i>
                  {connectedAddress && connectedAddress.length >= 10 ? `${connectedAddress.substring(0, 6)}...${connectedAddress.substring(connectedAddress.length - 4)}` : 'Connected'}
                </button>
              ) : (
                <button className="connect-wallet" onClick={onConnectWallet}>
                  <i className="fas fa-wallet"></i>
                  Connect Wallet
                </button>
              )}
            </div>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
            >
              <i className="fas fa-bars"></i>
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${mobileMenuOpen ? 'active' : ''}`}>
        <button className="close-menu" onClick={() => setMobileMenuOpen(false)}>
          <i className="fas fa-times"></i>
        </button>
        <ul className="mobile-nav-links">
          <li><a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a></li>
          <li><a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a></li>
          <li><a href="#bridge" onClick={() => setMobileMenuOpen(false)}>Bridge</a></li>
          <li><a href="#stats" onClick={() => setMobileMenuOpen(false)}>Stats</a></li>
          <li><a href="#testimonials" onClick={() => setMobileMenuOpen(false)}>Testimonials</a></li>
          <li><a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a></li>
          {connectedWallet ? (
            <li><a href="#" onClick={handleMobileDisconnect}>Disconnect Wallet</a></li>
          ) : (
            <li><a href="#" onClick={handleMobileConnect}>Connect Wallet</a></li>
          )}
        </ul>
      </div>
    </>
  );
}