// Wallet type definitions
export interface Wallet {
  walletId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  cash: number;
  earning: number;
  totalBalance: number;
}

export interface WalletResponse {
  success: boolean;
  message: string;
  data: Wallet;
}

export interface WalletListResponse {
  success: boolean;
  message: string;
  data: {
    wallets: Wallet[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
    };
    summary?: {
      totalCash: number;
      totalEarning: number;
      grandTotal: number;
      walletCount: number;
    };
  };
}

export interface WalletFilters {
  searchTerm: string;
  debouncedSearchTerm: string;
  balanceType: 'all' | 'cash' | 'earning';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
}
