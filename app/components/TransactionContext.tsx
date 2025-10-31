'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, TransactionContextType } from '../globals';

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
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
    const storedTransactions = localStorage.getItem('bitstarks_transactions');
    if (storedTransactions) {
      try {
        const parsed = JSON.parse(storedTransactions);
        setTransactions(parsed);
      } catch (error) {
        console.error('Failed to parse stored transactions:', error);
      }
    }
  }, []);

  // Save transactions to localStorage whenever transactions change
  useEffect(() => {
    localStorage.setItem('bitstarks_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
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

  const clearTransactions = () => {
    setTransactions([]);
  };

  const value: TransactionContextType = {
    transactions,
    addTransaction,
    getTransactionsByWallet,
    clearTransactions,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};