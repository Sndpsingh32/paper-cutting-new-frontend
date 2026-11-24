import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import CommonTable from "../../components/common/CommonTable";
import { postData } from "../../utility/utility";
import type { Wallet, WalletFilters, WalletListResponse } from "../../types/wallet";
import type { TableColumn } from "../../types/table";

// Wallet Table Component
function WalletTable() {
  const [state, setState] = useState({
    filters: {
      searchTerm: "",
      debouncedSearchTerm: "",
      balanceType: 'all' as 'all' | 'cash' | 'earning',
      sortBy: "totalBalance",
      sortOrder: "desc" as "asc" | "desc",
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10,
      },
    },
    wallets: [] as Wallet[],
    summary: null as any,
    isLoading: true,
  });

  const { filters, wallets, summary, isLoading } = state;

  useEffect(() => {
    const timerId = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        filters: {
          ...prev.filters,
          debouncedSearchTerm: prev.filters.searchTerm,
          pagination: {
            ...prev.filters.pagination,
            currentPage: 1, // Reset to first page on new search
          },
        },
      }));
    }, 500);

    return () => clearTimeout(timerId);
  }, [filters.searchTerm]);

  const fetchWallets = useCallback(
    async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        const requestBody: Record<string, unknown> = {};

        if (filters.debouncedSearchTerm) {
          requestBody.search = filters.debouncedSearchTerm;
        }
        if (filters.balanceType !== 'all') {
          requestBody.balanceType = filters.balanceType;
        }

        requestBody.sortBy = filters.sortBy;
        requestBody.sortOrder = filters.sortOrder;

        const response = await postData("/wallet/get", requestBody);

        if (response.success) {
          const walletData = response.data;
          
          if (walletData.walletId && walletData.userId) {
            const wallet = walletData as Wallet;
            setState((prev) => ({
              ...prev,
              wallets: [wallet],
              summary: {
                totalCash: wallet.cash,
                totalEarning: wallet.earning,
                grandTotal: wallet.totalBalance,
                walletCount: 1,
              },
              filters: {
                ...prev.filters,
                pagination: {
                  ...prev.filters.pagination,
                  totalPages: 1,
                  totalCount: 1,
                },
              },
            }));
          } else {
            const data = walletData as WalletListResponse['data'];
            setState((prev) => ({
              ...prev,
              wallets: data.wallets || [],
              summary: data.summary || {
                totalCash: 0,
                totalEarning: 0,
                grandTotal: 0,
                walletCount: 0,
              },
              filters: {
                ...prev.filters,
                pagination: {
                  ...prev.filters.pagination,
                  totalPages: data.pagination?.totalPages || 1,
                  totalCount: data.pagination?.totalCount || 0,
                },
              },
            }));
          }
        }
      } catch (error: unknown) {
        console.error("Error fetching wallets:", error);
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [filters.debouncedSearchTerm, filters.balanceType, filters.sortBy, filters.sortOrder]
  );

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleFilterChange = (key: keyof WalletFilters, value: unknown) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value,
      },
    }));
  };

  // const handlePageChange = (selectedItem: { selected: number }) => {
  //   setState((prev) => ({
  //     ...prev,
  //     filters: {
  //       ...prev.filters,
  //       pagination: {
  //         ...prev.filters.pagination,
  //         currentPage: selectedItem.selected + 1,
  //       },
  //     },
  //   }));
  // };

  const handleSortChange = (sortBy: string) => {
    const newSortOrder =
      filters.sortBy === sortBy && filters.sortOrder === "desc" ? "asc" : "desc";
    
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        sortBy,
        sortOrder: newSortOrder,
      },
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const columns: TableColumn[] = [
    {
      key: "walletId",
      label: "Wallet ID",
      className: "min-w-[120px]",
      render: (value: unknown) => (
        <span className="text-xs font-mono">{String(value).slice(-8)}</span>
      ),
    },
    {
      key: "userName",
      label: "User",
      className: "min-w-[200px]",
      render: (_: unknown, row?: Record<string, unknown>) => {
        const userName = (row as any)?.userName || 'N/A';
        const userEmail = (row as any)?.userEmail || '';
        return (
          <div>
            <div className="font-medium text-gray-800 dark:text-white/90">
              {userName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {userEmail}
            </div>
          </div>
        );
      },
    },
    {
      key: "cash",
      label: "Cash Balance",
      className: "min-w-[120px]",
      render: (value: unknown) => (
        <span className="font-medium text-blue-600">
          {formatCurrency(Number(value) || 0)}
        </span>
      ),
    },
    {
      key: "earning",
      label: "Earning Balance",
      className: "min-w-[140px]",
      render: (value: unknown) => (
        <span className="font-medium text-green-600">
          {formatCurrency(Number(value) || 0)}
        </span>
      ),
    },
    {
      key: "totalBalance",
      label: "Total Balance",
      className: "min-w-[140px]",
      render: (value: unknown) => (
        <span className="font-semibold text-purple-600">
          {formatCurrency(Number(value) || 0)}
        </span>
      ),
    },
    {
      key: "userId",
      label: "User ID",
      className: "min-w-[120px]",
      render: (value: unknown) => (
        <span className="text-xs font-mono text-gray-500">
          {String(value).slice(-8)}
        </span>
      ),
    },
  ];

  return (
    <>
      <ComponentCard title="Wallet Management">
        {/* Filters Section */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Search Users
            </label>
            <input
              type="text"
              placeholder="Search by name, email..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            />
          </div>
          
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Balance Type
            </label>
            <select
              value={filters.balanceType}
              onChange={(e) => handleFilterChange("balanceType", e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Balances</option>
              <option value="cash">Cash Balance</option>
              <option value="earning">Earning Balance</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sort By
            </label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, _sortOrder] = e.target.value.split('-');
                handleSortChange(sortBy);
              }}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="totalBalance-desc">Total Balance (High to Low)</option>
              <option value="totalBalance-asc">Total Balance (Low to High)</option>
              <option value="cash-desc">Cash Balance (High to Low)</option>
              <option value="cash-asc">Cash Balance (Low to High)</option>
              <option value="earning-desc">Earning Balance (High to Low)</option>
              <option value="earning-asc">Earning Balance (Low to High)</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Wallets
            </label>
            <div className="flex h-10 items-center rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {filters.pagination.totalCount}
              </span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Cash Balance
              </div>
              <div className="mt-1 text-xl font-semibold text-blue-600">
                {formatCurrency(summary.totalCash || 0)}
              </div>
            </div>
            
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Earning Balance
              </div>
              <div className="mt-1 text-xl font-semibold text-green-600">
                {formatCurrency(summary.totalEarning || 0)}
              </div>
            </div>
            
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Grand Total Balance
              </div>
              <div className="mt-1 text-xl font-semibold text-purple-600">
                {formatCurrency(summary.grandTotal || 0)}
              </div>
            </div>
            
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Wallets
              </div>
              <div className="mt-1 text-xl font-semibold text-gray-800 dark:text-white">
                {summary.walletCount || 0}
              </div>
            </div>
          </div>
        )}

        {/* Wallets Table */}
        <CommonTable
          columns={columns}
          data={wallets as unknown as Record<string, unknown>[]}
          loading={isLoading}
        />
      </ComponentCard>
    </>
  );
}

export default function WalletManagement() {
  return (
    <>
      <PageMeta
        title="Wallet Management | Paper Cutting - Service Management System"
        description="Manage and view all user wallets and balances"
      />
      <PageBreadcrumb pageTitle="Wallet Management" />
      <WalletTable />
    </>
  );
}
