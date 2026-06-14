'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Transaction, TransactionContextType } from '../globals';

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
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
  // Skip the very first run of the save effect (initial empty state) so we
  // don't overwrite localStorage before the load effect has fired.
  const isInitialMount = useRef(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bitstarks_transactions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTransactions(parsed.filter((tx: any) => tx?.id && tx?.type));
        }
      }
    } catch (error) {
      console.error('Failed to load transactions from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem('bitstarks_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
    if (!transaction?.type || !transaction?.amount) {
      console.error('addTransaction: missing required fields', transaction);
      return;
    }
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
      date: new Date().toLocaleString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const updateTransaction = (txHash: string, updates: Partial<Pick<Transaction, 'status' | 'statusClass' | 'details'>>) => {
    setTransactions(prev => prev.map(tx =>
      tx.txHash === txHash ? { ...tx, ...updates } : tx
    ));
  };

  const getTransactionsByWallet = (walletAddress: string): Transaction[] => {
    return transactions.filter(tx => tx.walletAddress === walletAddress);
  };

  const clearTransactions = () => {
    setTransactions([]);
  };

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, updateTransaction, getTransactionsByWallet, clearTransactions }}>
      {children}
    </TransactionContext.Provider>
  );
};
