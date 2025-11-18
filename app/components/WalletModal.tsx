'use client';

import { useState } from 'react';
import { getAddress, AddressPurpose, BitcoinNetworkType } from '@sats-connect/core';
import detectEthereumProvider from '@metamask/detect-provider';
import { createWalletClient, custom } from 'viem';

// Extend window interface for wallet extensions
declare global {
  interface Window {
    starknet_argentX?: any;
    starknet_braavos?: any;
    ethereum?: any;
    XverseWallet?: any;
    xverse?: any;
    Xverse?: any;
    unisat?: any;
    Unisat?: any;
    unisatWallet?: any;
    solana?: any;
    bitcoin?: any;
  }
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectWallet: (type: string, address?: string, network?: 'mainnet' | 'testnet') => void;
  network?: 'bitcoin' | 'starknet';
  showSections?: boolean;
  bitcoinNetwork?: 'mainnet' | 'testnet';
}

export default function WalletModal({ isOpen, onClose, onConnectWallet, network, showSections, bitcoinNetwork = 'mainnet' }: WalletModalProps) {
  const [connecting, setConnecting] = useState<string | null>(null);

  // Debug log when component mounts/updates
  console.log(`🔧 WalletModal rendered with bitcoinNetwork:`, bitcoinNetwork);
  console.log(`🔧 WalletModal props:`, { isOpen, network, showSections, bitcoinNetwork });

  const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const setupMetaMaskEventListeners = () => {
    if (!window.ethereum) return;

    // Handle account changes
    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 Accounts changed:', accounts);
      if (accounts && accounts.length > 0) {
        onConnectWallet('metamask', accounts[0]);
      } else {
        // User disconnected all accounts
        console.warn('⚠️ MetaMask disconnected');
      }
    };

    // Handle chain changes
    const handleChainChanged = (chainId: string) => {
      console.log('🔄 Chain changed:', chainId);
      // Reload to ensure UI consistency
      window.location.reload();
    };

    // Handle disconnect
    const handleDisconnect = (error: any) => {
      console.log('🔌 MetaMask disconnected:', error);
    };

    // Add event listeners
    (window.ethereum as any).on('accountsChanged', handleAccountsChanged);
    (window.ethereum as any).on('chainChanged', handleChainChanged);
    (window.ethereum as any).on('disconnect', handleDisconnect);
  };

  const allWallets = [
    {
      name: 'Xverse',
      logo: 'https://www.google.com/s2/favicons?domain=xverse.app&sz=128',
      type: 'xverse'
    },
    {
      name: 'Unisat',
      logo: 'https://www.google.com/s2/favicons?domain=unisat.io&sz=128',
      type: 'unisat'
    },
    {
      name: 'Ready',
      logo: 'https://www.google.com/s2/favicons?domain=argent.xyz&sz=128',
      type: 'ready'
    },
    {
      name: 'Braavos',
      logo: 'https://www.google.com/s2/favicons?domain=braavos.app&sz=128',
      type: 'braavos'
    },
    {
      name: 'MetaMask',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
      type: 'metamask'
    }
  ];

  const wallets = network ? (network === 'starknet' ? allWallets.slice(2) : allWallets.slice(0, 2)) : allWallets;

  const handleWalletClick = async (walletType: string) => {
    setConnecting(walletType);


    try {
      switch (walletType) {
        case 'ready':
          if (typeof window !== 'undefined' && window.starknet_argentX) {
            await window.starknet_argentX.enable();
            const address = window.starknet_argentX.selectedAddress;

            // Detect network from Ready wallet
            let detectedNetwork: 'mainnet' | 'testnet' = 'mainnet';
            try {
              const chainId = await window.starknet_argentX.provider.getChainId();
              console.log('Ready wallet chainId detected:', chainId);
              // Starknet mainnet: 0x534e5f4d41494e (SN_MAIN), testnet: 0x534e5f474f45524c49 (SN_GOERLI)
              if (chainId === '0x534e5f474f45524c49' || chainId === 'SN_GOERLI' || chainId === '0x534e5f5345504f4c4941') {
                detectedNetwork = 'testnet';
              } else if (chainId === '0x534e5f4d41494e' || chainId === 'SN_MAIN') {
                detectedNetwork = 'mainnet';
              } else {
                console.warn('Unknown Ready wallet chainId:', chainId);
              }
            } catch (networkError) {
              console.warn('Could not detect Ready wallet network, defaulting to mainnet:', networkError);
            }

            onConnectWallet(walletType, address, detectedNetwork);
          } else {
            throw new Error('Ready wallet not found');
          }
          break;

        case 'braavos':
          if (typeof window !== 'undefined' && window.starknet_braavos) {
            await window.starknet_braavos.enable();
            const address = window.starknet_braavos.selectedAddress;

            // Detect network from Braavos wallet
            let detectedNetwork: 'mainnet' | 'testnet' = 'mainnet';
            try {
              const chainId = await window.starknet_braavos.provider.getChainId();
              console.log('Braavos wallet chainId detected:', chainId);
              // Starknet mainnet: 0x534e5f4d41494e (SN_MAIN), testnet: 0x534e5f474f45524c49 (SN_GOERLI)
              if (chainId === '0x534e5f474f45524c49' || chainId === 'SN_GOERLI' || chainId === '0x534e5f5345504f4c4941') {
                detectedNetwork = 'testnet';
              } else if (chainId === '0x534e5f4d41494e' || chainId === 'SN_MAIN') {
                detectedNetwork = 'mainnet';
              } else {
                console.warn('Unknown Braavos wallet chainId:', chainId);
              }
            } catch (networkError) {
              console.warn('Could not detect Braavos wallet network, defaulting to mainnet:', networkError);
            }

            onConnectWallet(walletType, address, detectedNetwork);
          } else {
            throw new Error('Braavos wallet not found');
          }
          break;

        case 'metamask':
          try {
            console.log('🔍 Starting MetaMask connection...');

            // Check if we're in a browser environment
            if (typeof window === 'undefined') {
              throw new Error('Browser environment not available');
            }

            // Step 1: Use detectEthereumProvider to properly detect MetaMask
            console.log('🔍 Detecting MetaMask provider...');
            const metaMaskProvider = await detectEthereumProvider();

            if (!metaMaskProvider) {
              console.error('❌ MetaMask not detected');
              window.open('https://metamask.io/download/', '_blank');
              throw new Error('MetaMask not detected. Please install MetaMask and refresh the page.');
            }

            // Step 2: Verify it's actually MetaMask
            if (!metaMaskProvider.isMetaMask) {
              console.error('❌ Provider found but isMetaMask is false:', metaMaskProvider);
              throw new Error('Detected provider is not MetaMask. Please ensure MetaMask is your active Ethereum wallet.');
            }

            console.log('✅ MetaMask provider detected:', metaMaskProvider);

            // Step 3: Request accounts from MetaMask
            console.log('🔓 Requesting account access from MetaMask...');

            const accounts = await (metaMaskProvider as any).request({
              method: 'eth_requestAccounts'
            });

            console.log('📋 Accounts received:', accounts);

            if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
              throw new Error('No accounts received from MetaMask. Please unlock MetaMask and select an account.');
            }

            const address = accounts[0];

            // Step 4: Validate the address
            if (!address || typeof address !== 'string') {
              throw new Error('Invalid address received from MetaMask');
            }

            if (!isValidEthereumAddress(address)) {
              throw new Error('Received address is not a valid Ethereum address');
            }

            // Step 5: Detect network from MetaMask
            let detectedNetwork: 'mainnet' | 'testnet' = 'mainnet';
            try {
              const chainId = await (metaMaskProvider as any).request({ method: 'eth_chainId' });
              console.log('MetaMask chainId detected:', chainId);
              // Starknet mainnet: 0x534e5f4d41494e (SN_MAIN), testnet: 0x534e5f474f45524c49 (SN_GOERLI), sepolia: 0x534e5f5345504f4c4941
              if (chainId === '0x534e5f474f45524c49' || chainId === 'SN_GOERLI' || chainId === '0x534e5f5345504f4c4941') {
                detectedNetwork = 'testnet';
              } else if (chainId === '0x534e5f4d41494e' || chainId === 'SN_MAIN') {
                detectedNetwork = 'mainnet';
              } else {
                console.warn('Unknown MetaMask chainId:', chainId);
              }
            } catch (networkError) {
              console.warn('Could not detect MetaMask network, defaulting to mainnet:', networkError);
            }

            console.log('✅ Successfully connected to MetaMask with address:', address);

            // Step 6: Set up event listeners for account/chain changes
            setupMetaMaskEventListeners();

            onConnectWallet(walletType, address, detectedNetwork);

          } catch (error: any) {
            console.error('💥 MetaMask connection failed:', error);

            // Handle specific MetaMask error codes
            if (error.code === 4001) {
              throw new Error('Connection rejected. Please click "Connect" in MetaMask.');
            } else if (error.code === -32002) {
              throw new Error('Connection request already pending. Please check MetaMask for pending requests.');
            } else if (error.code === 4100) {
              throw new Error('MetaMask is not authorized. Please unlock MetaMask and try again.');
            } else if (error.message) {
              // Check for common error messages
              if (error.message.includes('User denied')) {
                throw new Error('Connection denied by user. Please approve the connection in MetaMask.');
              } else if (error.message.includes('MetaMask is not installed')) {
                throw new Error('MetaMask not found. Please install MetaMask browser extension.');
              } else {
                throw new Error(`MetaMask connection failed: ${error.message}`);
              }
            } else {
              throw new Error('Failed to connect to MetaMask. Please ensure MetaMask is installed and unlocked.');
            }
          }
          break;

        case 'xverse':
            // Use Sats Connect for proper Xverse integration - only try the app's current network
            try {
              console.log(`🔗 Connecting to Xverse, app network mode: ${bitcoinNetwork}`);
              console.log(`🔧 bitcoinNetwork prop value:`, bitcoinNetwork);
              console.log(`🔧 BitcoinNetworkType enum values:`, BitcoinNetworkType);

              // Only try the network that matches the app's current mode
              const targetNetwork = bitcoinNetwork === 'testnet' ? BitcoinNetworkType.Testnet : BitcoinNetworkType.Mainnet;
              const targetNetworkName = bitcoinNetwork === 'testnet' ? 'TESTNET' : 'MAINNET';

              console.log(`🎯 Connecting Xverse to ${targetNetworkName} network only`);
              console.log(`🎯 targetNetwork:`, targetNetwork, `targetNetworkName:`, targetNetworkName);
              console.log(`🎯 BitcoinNetworkType.Testnet:`, BitcoinNetworkType.Testnet);
              console.log(`🎯 BitcoinNetworkType.Mainnet:`, BitcoinNetworkType.Mainnet);

              // Try with enum first, if it fails, try with string values
              try {
                await getAddress({
                  payload: {
                    purposes: [AddressPurpose.Payment], // Only request Payment address for bridge transactions
                    message: `Connect your Xverse Wallet to this DApp (${targetNetworkName})`,
                    network: {
                      type: targetNetwork,
                    },
                  },
                  onFinish: (response) => {
                    console.log(`📋 getAddress onFinish called with response:`, response);
                    console.log(`📋 Full response structure:`, JSON.stringify(response, null, 2));
        
                    // Handle different possible response structures - prioritize Payment address
                    let address = null;
                    if (response && response.addresses && Array.isArray(response.addresses) && response.addresses.length > 0) {
                      // Find the Payment address specifically (not Ordinals)
                      const paymentAddress = Array.isArray(response.addresses) ? response.addresses.find((addr: any) =>
                        addr && typeof addr === 'object' && (
                        addr.purpose === AddressPurpose.Payment ||
                        addr.purpose === 'payment' ||
                        addr.addressType === 'p2pkh' ||
                        addr.addressType === 'p2sh' ||
                        addr.addressType === 'p2wpkh')
                      ) : null;

                      if (paymentAddress) {
                        address = paymentAddress.address || paymentAddress;
                        console.log(`💰 Found Payment address:`, paymentAddress);
                      } else {
                        // Fallback to first address if no Payment address found
                        const firstAddress = response.addresses[0];
                        address = firstAddress.address || firstAddress;
                        console.log(`⚠️ No Payment address found, using first address:`, firstAddress);
                      }
                    }
        
                    console.log(`✅ Connected Xverse Payment address on ${targetNetworkName}:`, address);
                    console.log(`🔍 Address type:`, typeof address, `Address value:`, address);
        
                    // If address is still not a string, try to extract it differently
                    if (typeof address !== 'string') {
                      if (Array.isArray(address) && address.length > 0) {
                        address = address[0];
                      } else if (typeof address === 'object' && address !== null) {
                        // Try common address field names
                        address = address.address || Object.values(address)[0];
                      }
                    }
        
                    console.log(`🔄 Final processed address:`, address);
                    console.log(`🔍 Final address type:`, typeof address, `Final address length:`, typeof address === 'string' ? address.length : 'N/A');
        
                    // Validate the address format
                    if (!address || typeof address !== 'string' || address.length < 20) {
                      console.error(`❌ Invalid Payment address received from Xverse:`, address);
                      console.error(`❌ Address validation failed. Type:`, typeof address, `Length:`, address?.length);
                      alert('Invalid Payment address received from Xverse wallet. Please ensure your wallet is properly connected and try again.');
                      setConnecting(null);
                      return;
                    }
        
                    const detectedNetwork = targetNetworkName.toLowerCase() as 'mainnet' | 'testnet';
                    onConnectWallet(walletType, address, detectedNetwork);
                    setConnecting(null);
                  },
                  onCancel: () => {
                    console.warn(`❌ User canceled Xverse connection on ${targetNetworkName}`);
                    alert('Connection canceled. Please try again.');
                    setConnecting(null);
                  },
                });
              } catch (enumError: any) {
                console.warn(`⚠️ Enum-based connection failed, trying string values:`, enumError);

                // Fallback: try with string values instead of enum
                const stringNetwork = bitcoinNetwork === 'testnet' ? 'testnet' : 'mainnet';
                console.log(`🔄 Trying with string network value:`, stringNetwork);

                await getAddress({
                  payload: {
                    purposes: [AddressPurpose.Payment], // Only request Payment address for bridge transactions
                    message: `Connect your Xverse Wallet to this DApp (${targetNetworkName})`,
                    network: {
                      type: stringNetwork as any,
                    },
                  },
                  onFinish: (response) => {
                    console.log(`📋 getAddress onFinish called with response (string fallback):`, response);
                    console.log(`📋 Full response structure (string fallback):`, JSON.stringify(response, null, 2));

                    // Handle different possible response structures for string fallback - prioritize Payment address
                    let address = null;
                    if (response && response.addresses && Array.isArray(response.addresses) && response.addresses.length > 0) {
                      // Find the Payment address specifically (not Ordinals)
                      const paymentAddress = Array.isArray(response.addresses) ? response.addresses.find((addr: any) =>
                        addr && typeof addr === 'object' && (
                        addr.purpose === AddressPurpose.Payment ||
                        addr.purpose === 'payment' ||
                        addr.addressType === 'p2pkh' ||
                        addr.addressType === 'p2sh' ||
                        addr.addressType === 'p2wpkh')
                      ) : null;

                      if (paymentAddress) {
                        address = paymentAddress.address || paymentAddress;
                        console.log(`💰 Found Payment address (string fallback):`, paymentAddress);
                      } else {
                        // Fallback to first address if no Payment address found
                        const firstAddress = response.addresses[0];
                        address = firstAddress.address || firstAddress;
                        console.log(`⚠️ No Payment address found (string fallback), using first address:`, firstAddress);
                      }
                    }

                    console.log(`✅ Connected Xverse Payment address on ${targetNetworkName} (string fallback):`, address);
                    console.log(`🔍 Address type (string fallback):`, typeof address, `Address value:`, address);

                    // If address is still not a string, try to extract it differently
                    if (typeof address !== 'string') {
                      if (Array.isArray(address) && address.length > 0) {
                        address = address[0];
                      } else if (typeof address === 'object' && address !== null) {
                        address = address.address || Object.values(address)[0];
                      }
                    }

                    console.log(`🔄 Final processed address (string fallback):`, address);
                    console.log(`🔍 Final address type (string fallback):`, typeof address, `Final address length:`, typeof address === 'string' ? address.length : 'N/A');

                    // Validate the address format
                    if (!address || typeof address !== 'string' || address.length < 20) {
                      console.error(`❌ Invalid Payment address received from Xverse (string fallback):`, address);
                      alert('Invalid Payment address received from Xverse wallet. Please ensure your wallet is properly connected and try again.');
                      setConnecting(null);
                      return;
                    }

                    const detectedNetwork = targetNetworkName.toLowerCase() as 'mainnet' | 'testnet';
                    onConnectWallet(walletType, address, detectedNetwork);
                    setConnecting(null);
                  },
                  onCancel: () => {
                    console.warn(`❌ User canceled Xverse connection on ${targetNetworkName} (string fallback)`);
                    alert('Connection canceled. Please try again.');
                    setConnecting(null);
                  },
                });
              }
            } catch (error: any) {
              console.error(`❌ Xverse connection failed on ${bitcoinNetwork}:`, error);
              console.error(`❌ Error details:`, error.message, error.code, error);

              // Provide specific error message for network mismatch
              if (error.message && error.message.includes('network')) {
                alert(`Network mismatch error. Please ensure your Xverse wallet is set to ${bitcoinNetwork} and try again.`);
              } else {
                alert(`Failed to connect to Xverse Wallet on ${bitcoinNetwork}. Please ensure your wallet is unlocked and set to the correct network.`);
              }
              setConnecting(null);
            }
            break;

        case 'unisat':
          // Unisat wallet integration - check for the wallet object
          if (typeof window !== 'undefined' && (window as any).unisat) {
            try {
              const unisat = (window as any).unisat;
              // Request accounts from Unisat
              const accounts = await unisat.requestAccounts();
              const address = accounts[0]; // Get the first account

              console.log(`✅ Connected Unisat address:`, address);
              console.log(`🔍 Unisat address type:`, typeof address, `Address length:`, address?.length);

              // Validate the address format
              if (!address || typeof address !== 'string' || address.length < 20) {
                console.error(`❌ Invalid address received from Unisat:`, address);
                alert('Invalid address received from Unisat wallet. Please try again.');
                setConnecting(null);
                return;
              }

              // Detect network from Unisat wallet
              let detectedNetwork: 'mainnet' | 'testnet' = 'mainnet';
              try {
                const network = await unisat.getNetwork();
                console.log('Unisat network detected:', network);
                // Unisat returns 'livenet' for mainnet, 'testnet' for testnet
                if (network === 'testnet' || network === 'regtest') {
                  detectedNetwork = 'testnet';
                } else if (network === 'livenet') {
                  detectedNetwork = 'mainnet';
                } else {
                  console.warn('Unknown Unisat network:', network);
                }
              } catch (networkError) {
                console.warn('Could not detect Unisat network, defaulting to mainnet:', networkError);
              }

              onConnectWallet(walletType, address, detectedNetwork);
            } catch (error) {
              console.error('Unisat connection failed:', error);
              throw new Error('Failed to connect to Unisat wallet. Please unlock your wallet and try again.');
            }
          } else {
            // If wallet not found, provide installation instructions
            window.open('https://unisat.io/', '_blank');
            throw new Error('Unisat wallet not installed. Please install the Unisat wallet extension and refresh the page.');
          }
          break;

        case 'trustwallet':
          // Trust Wallet integration - similar approach to Xverse
          console.log('=== TRUST WALLET DEBUG ===');

          // Check if Trust Wallet might be injected later or under a different name
          const checkForTrust = () => {
            const allKeys = Object.keys(window);
            return allKeys.filter(key =>
              key.toLowerCase().includes('trust') ||
              key.toLowerCase().includes('ethereum') ||
              (window[key as keyof Window] && typeof (window as any)[key] === 'object' && (window as any)[key]?.requestAccounts)
            );
          };

          const trustKeys = checkForTrust();
          console.log('Found potential Trust wallet keys:', trustKeys);

          // Try to find any object with requestAccounts method (Trust Wallet uses ethereum)
          let trustWallet = null;
          for (const key of Object.keys(window)) {
            const obj = (window as any)[key];
            if (obj && typeof obj === 'object' && typeof obj.requestAccounts === 'function') {
              console.log(`Found object with requestAccounts at window.${key}:`, obj);
              trustWallet = obj;
              break;
            }
          }

          if (trustWallet) {
            console.log('Attempting connection with found Trust wallet object...');
            try {
              const accounts = await trustWallet.requestAccounts();
              console.log('Trust wallet connection successful, accounts:', accounts);

              let address;
              if (Array.isArray(accounts) && accounts.length > 0) {
                address = accounts[0];
              } else if (accounts && typeof accounts === 'string') {
                address = accounts;
              } else if (accounts && typeof accounts === 'object') {
                address = accounts.address || accounts.account;
              }

              if (address) {
                console.log('Connected with Trust address:', address);
                onConnectWallet(walletType, address);
              } else {
                throw new Error('No address in Trust wallet response');
              }
            } catch (error) {
              console.error('Trust wallet connection failed:', error);
              throw new Error(`Trust wallet connection failed: ${(error as Error).message}`);
            }
          } else {
            console.log('No Trust wallet object with requestAccounts found');
            console.log('Available window properties:', Object.keys(window));

            // Provide mock connection for testing
            console.log('Providing mock Trust wallet connection for testing...');
            const mockAddress = '0x' + Math.random().toString(16).substring(2, 42);
            onConnectWallet(walletType, mockAddress);
          }
          break;

        case 'phantom':
          try {
            console.log('👻 Starting Phantom wallet connection...');

            // Check if we're in a browser environment
            if (typeof window === 'undefined') {
              throw new Error('Browser environment not available');
            }

            // Check if Phantom is installed
            if (!window.solana) {
              console.error('❌ window.solana not found');
              window.open('https://phantom.app/download', '_blank');
              throw new Error('Phantom wallet not detected. Please install Phantom browser extension and refresh the page.');
            }

            if (!window.solana.isPhantom) {
              console.error('❌ Solana object found but not Phantom');
              throw new Error('Detected Solana provider is not Phantom wallet.');
            }

            console.log('✅ Phantom wallet detected');

            // Connect to Phantom (like in your example)
            console.log('🔓 Requesting connection to Phantom...');
            const response = await window.solana.connect();

            console.log('📋 Connection response:', response);

            if (!response || !response.publicKey) {
              throw new Error('No public key received from Phantom wallet');
            }

            const address = response.publicKey.toString();

            // Basic validation
            if (!address || typeof address !== 'string') {
              throw new Error('Invalid address received from Phantom');
            }

            console.log('✅ Successfully connected to Phantom:', address);
            onConnectWallet(walletType, address);

            // Set up event listeners
            window.solana.on('connect', (publicKey: any) => {
              console.log('🔗 Phantom connected:', publicKey?.toString());
              if (publicKey) {
                onConnectWallet(walletType, publicKey.toString());
              }
            });

            window.solana.on('disconnect', () => {
              console.warn('⚠️ Phantom disconnected');
            });

            window.solana.on('accountChanged', (publicKey: any) => {
              console.log('🔄 Phantom account changed:', publicKey?.toString());
              if (publicKey) {
                onConnectWallet(walletType, publicKey.toString());
              }
            });

          } catch (error: any) {
            console.error('💥 Phantom connection failed:', error);

            // Handle specific Phantom error codes
            if (error.code === 4001) {
              throw new Error('Connection rejected by user. Please click "Connect" in Phantom.');
            } else if (error.message && error.message.includes('User rejected')) {
              throw new Error('Connection rejected by user. Please approve the connection in Phantom.');
            } else if (error.message) {
              throw new Error(`Phantom connection failed: ${error.message}`);
            } else {
              throw new Error('Failed to connect to Phantom. Please ensure Phantom is installed and unlocked.');
            }
          }
          break;

        default:
          throw new Error('Unsupported wallet type');
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);

      // Provide specific error messages based on error type
      let errorMessage = `Failed to connect ${walletType} wallet. `;

      if (error.code === 'WALLET_NOT_INSTALLED') {
        errorMessage += 'Please install the wallet extension and refresh the page.';
      } else if (error.code === 'WALLET_API_UNAVAILABLE') {
        errorMessage += 'Please update your wallet extension to the latest version.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please make sure the wallet extension is installed and try again.';
      }

      alert(errorMessage);
    } finally {
      setConnecting(null);
      // Don't close modal automatically - allow multiple connections
      // onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal active" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {showSections ? 'Connect Bitcoin & Starknet Wallets' : network ? `Connect ${network === 'bitcoin' ? 'Bitcoin' : 'Starknet'} Wallet` : 'Connect Wallet'}
          </h3>
          <button className="close-modal" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="wallet-options">
          {showSections ? (
            <>
              <div className="wallet-section">
                <h4 className="section-title">Bitcoin Wallets</h4>
                {wallets.slice(0, 2).map((wallet, index) => (
                  <div
                    key={index}
                    className={`wallet-option ${connecting === wallet.type ? 'connecting' : ''}`}
                    onClick={() => handleWalletClick(wallet.type)}
                  >
                    <div className="wallet-icon">
                      <img src={wallet.logo} alt={`${wallet.name} logo`} style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                    </div>
                    <div className="wallet-name">{wallet.name}</div>
                    {connecting === wallet.type && <div className="connecting-spinner">Connecting...</div>}
                  </div>
                ))}
              </div>
              <div className="wallet-section">
                <h4 className="section-title">Starknet Wallets</h4>
                {wallets.slice(2).map((wallet, index) => (
                  <div
                    key={index + 2}
                    className={`wallet-option ${connecting === wallet.type ? 'connecting' : ''}`}
                    onClick={() => handleWalletClick(wallet.type)}
                  >
                    <div className="wallet-icon">
                      <img src={wallet.logo} alt={`${wallet.name} logo`} style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                    </div>
                    <div className="wallet-name">{wallet.name}</div>
                    {connecting === wallet.type && <div className="connecting-spinner">Connecting...</div>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            wallets.map((wallet, index) => (
              <div
                key={index}
                className={`wallet-option ${connecting === wallet.type ? 'connecting' : ''}`}
                onClick={() => handleWalletClick(wallet.type)}
              >
                <div className="wallet-icon">
                  <img src={wallet.logo} alt={`${wallet.name} logo`} style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                </div>
                <div className="wallet-name">{wallet.name}</div>
                {connecting === wallet.type && <div className="connecting-spinner">Connecting...</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}