'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, TransactionContextType } from '../globals';

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    console.error('useTransactions must be used within a TransactionProvider');
    // Return a safe fallback to prevent crashes
    return {
      transactions: [],
      addTransaction: () => {},
      updateTransaction: () => {},
      getTransactionsByWallet: () => [],
      clearTransactions: () => {},
    };
  }
  return context;
};

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load transactions from localStorage on mount
  useEffect(() => {
    try {
      const storedTransactions = localStorage.getItem('bitstarks_transactions');
      if (storedTransactions) {
        const parsed = JSON.parse(storedTransactions);
        if (Array.isArray(parsed)) {
          // Validate that each transaction has required properties
          const validTransactions = parsed.filter(tx =>
            tx && typeof tx === 'object' && tx.id && tx.type
          );
          setTransactions(validTransactions);
        } else {
          console.warn('Stored transactions is not an array, resetting to empty');
          setTransactions([]);
        }
      }
    } catch (error) {
      console.error('Failed to parse stored transactions:', error);
      setTransactions([]);
    }
  }, []);

  // Save transactions to localStorage whenever transactions change
  useEffect(() => {
    localStorage.setItem('bitstarks_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
    // Validate required fields
    if (!transaction || typeof transaction !== 'object') {
      console.error('Invalid transaction object provided to addTransaction');
      return;
    }

    if (!transaction.type || !transaction.amount || !transaction.walletAddress) {
      console.error('Transaction missing required fields:', transaction);
      return;
    }

    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const getTransactionsByWallet = (walletAddress: string): Transaction[] => {
    return transactions.filter(tx => tx.walletAddress === walletAddress);
  };

  const updateTransaction = (txHash: string, updates: Partial<Pick<Transaction, 'status' | 'statusClass' | 'details'>>) => {
    setTransactions(prev => prev.map(tx =>
      tx.txHash === txHash ? { ...tx, ...updates } : tx
    ));
  };

  const clearTransactions = () => {
    setTransactions([]);
  };

  const value: TransactionContextType = {
    transactions,
    addTransaction,
    updateTransaction,
    getTransactionsByWallet,
    clearTransactions,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};