// Transaction types and interfaces
export interface Transaction {
  id: string;
  type: 'Bridge' | 'Swap' | 'Lock' | 'Unlock';
  typeIcon: string;
  typeClass: string;
  fromAsset: string;
  fromAssetIcon: string;
  fromAssetClass: string;
  toAsset: string;
  toAssetIcon: string;
  toAssetClass: string;
  fromNetwork: string;
  fromNetworkIcon: string;
  fromNetworkClass: string;
  toNetwork: string;
  toNetworkIcon: string;
  toNetworkClass: string;
  amount: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  statusClass: string;
  walletAddress?: string;
  txHash?: string;
  details?: any;
}

export interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  updateTransaction: (txHash: string, updates: Partial<Pick<Transaction, 'status' | 'statusClass' | 'details'>>) => void;
  getTransactionsByWallet: (walletAddress: string) => Transaction[];
  clearTransactions: () => void;
}