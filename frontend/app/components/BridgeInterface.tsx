'use client';

import { useState } from 'react';

interface BridgeInterfaceProps {
  connectedWallet: string | null;
  onConnectWallet: () => void;
}

export default function BridgeInterface({ connectedWallet, onConnectWallet }: BridgeInterfaceProps) {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromAmount(value);
    setToAmount(value ? (parseFloat(value) * 0.99).toFixed(8) : '');
  };

  const handleBridge = () => {
    if (!connectedWallet) {
      onConnectWallet();
      return;
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      // Show error notification
      return;
    }

    // Handle bridging logic here
    console.log('Bridging:', fromAmount);
  };

  return (
    <section className="bridge-interface" id="bridge">
      <div className="container">
        <div className="bridge-container">
          <div className="bridge-title">
            <h2>Bridge Your Assets</h2>
            <p>Transfer between Bitcoin and StarkNet seamlessly</p>
          </div>
          <div className="bridge-form">
            <div className="input-group">
              <label htmlFor="from-amount">From Bitcoin</label>
              <input 
                type="number" 
                id="from-amount" 
                placeholder="0.00" 
                min="0" 
                step="0.00000001"
                value={fromAmount}
                onChange={handleFromAmountChange}
              />
            </div>
            
            <div className="arrow">
              <i className="fas fa-exchange-alt"></i>
            </div>
            
            <div className="input-group">
              <label htmlFor="to-amount">To StarkNet</label>
              <input 
                type="number" 
                id="to-amount" 
                placeholder="0.00" 
                readOnly
                value={toAmount}
              />
            </div>
            
            <button className="bridge-button" onClick={handleBridge}>
              Bridge Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}