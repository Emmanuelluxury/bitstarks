'use client';

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import BridgeInterface from './components/BridgeInterface';
import Stats from './components/Stats';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import WalletModal from './components/WalletModal';
import Notification from './components/Notification';

export default function Home() {
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'error' | 'success';
    isVisible: boolean;
  }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  // Check for existing wallet connection on mount
  useEffect(() => {
    checkExistingWalletConnection();
  }, []);

  const showNotification = (message: string, type: 'error' | 'success' = 'success') => {
    setNotification({ message, type, isVisible: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  const openWalletModal = () => {
    setWalletModalOpen(true);
  };

  const closeWalletModal = () => {
    setWalletModalOpen(false);
  };

  const connectWallet = async (walletType: string) => {
    try {
      // Simulate wallet connection
      const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
      
      setConnectedWallet(walletType);
      setConnectedAddress(mockAddress);
      closeWalletModal();
      
      showNotification(`Successfully connected to ${getWalletName(walletType)}`);
    } catch (error) {
      showNotification(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const disconnectWallet = () => {
    setConnectedWallet(null);
    setConnectedAddress(null);
    showNotification('Wallet disconnected successfully');
  };

  const getWalletName = (walletType: string) => {
    const nameMap: Record<string, string> = {
      'metamask': 'MetaMask',
      'argentx': 'Argent X',
      'braavos': 'Braavos',
      'walletconnect': 'WalletConnect',
      'coinbase': 'Coinbase Wallet'
    };

    return nameMap[walletType] || 'Unknown Wallet';
  };

  const checkExistingWalletConnection = () => {
    // In a real app, you would check for existing connections here
    // This is a placeholder for actual wallet connection checks
  };

  // Smooth scrolling for anchor links
  useEffect(() => {
    const handleAnchorClick = (e: Event) => {
      const target = (e.target as HTMLElement)?.closest('a[href^="#"]');
      if (target) {
        e.preventDefault();
        const targetId = target.getAttribute('href');
        if (targetId === '#' || !targetId) return;

        const targetElement = document.querySelector(targetId) as HTMLElement;
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: 'smooth'
          });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    <main>
      <Header 
        onConnectWallet={openWalletModal}
        onDisconnectWallet={disconnectWallet}
        connectedWallet={connectedWallet}
        connectedAddress={connectedAddress}
      />
      
      <Hero />
      <Features />
      <HowItWorks />
      <BridgeInterface 
        connectedWallet={connectedWallet}
        onConnectWallet={openWalletModal}
      />
      <Stats />
      <Testimonials />
      <FAQ />
      <Footer />
      
      <WalletModal 
        isOpen={walletModalOpen}
        onClose={closeWalletModal}
        onConnectWallet={connectWallet}
      />
      
      <Notification 
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onHide={hideNotification}
      />
    </main>
  );
}