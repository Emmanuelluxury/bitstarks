'use client';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectWallet: (type: string) => void;
}

export default function WalletModal({ isOpen, onClose, onConnectWallet }: WalletModalProps) {
  const wallets = [
    {
      name: 'MetaMask',
      icon: 'fab fa-ethereum',
      type: 'metamask'
    },
    {
      name: 'Argent X',
      icon: 'fas fa-wallet',
      type: 'argentx'
    },
    {
      name: 'Braavos',
      icon: 'fas fa-wallet',
      type: 'braavos'
    },
    {
      name: 'WalletConnect',
      icon: 'fas fa-link',
      type: 'walletconnect'
    },
    {
      name: 'Coinbase Wallet',
      icon: 'fab fa-bitcoin',
      type: 'coinbase'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="modal active" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Connect Wallet</h3>
          <button className="close-modal" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="wallet-options">
          {wallets.map((wallet, index) => (
            <div 
              key={index} 
              className="wallet-option" 
              onClick={() => onConnectWallet(wallet.type)}
            >
              <div className="wallet-icon">
                <i className={wallet.icon}></i>
              </div>
              <div className="wallet-name">{wallet.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}