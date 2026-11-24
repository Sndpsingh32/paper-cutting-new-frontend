import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import moment from "moment";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import CommonTable from "../../components/common/CommonTable";
import { postData } from "../../utility/utility";
import type { Order, OrderStatus } from "../../types/order";
import type { TableColumn } from "../../types/table";
import { EyeIcon } from "../../icons";

function OrderTable() {
  const navigate = useNavigate();

  // Single state for all filters and data
  const [state, setState] = useState({
    // Filter states
    filters: {
      searchTerm: "",
      debouncedSearchTerm: "",
      orderStatus: "" as OrderStatus | "",
      sortBy: "createdAt",
      sortOrder: "desc" as "asc" | "desc",
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10,
      },
    },
    // Data states
    orders: [] as Order[],
    isLoading: true,
  });

  // Destructure for easier access
  const { filters, orders, isLoading } = state;

  // Debounce search input
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

  const fetchOrders = useCallback(
    async (page: number = filters.pagination.currentPage) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        const requestBody: any = {
          page,
          limit: filters.pagination.limit,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        };

        // Add optional filters
        if (filters.debouncedSearchTerm) {
          requestBody.search = filters.debouncedSearchTerm;
        }
        if (filters.orderStatus) {
          requestBody.orderStatus = filters.orderStatus;
        }

        const response = await postData("/order/admin/all-orders", requestBody);

        if (response.success) {
          const apiOrders = (response.data?.orders || []) as Order[];
          const pagination = response.data?.pagination || {};

          setState((prev) => ({
            ...prev,
            orders: apiOrders,
            filters: {
              ...prev.filters,
              pagination: {
                ...prev.filters.pagination,
                totalPages: pagination.pages || pagination.totalPages || 1,
                totalCount: pagination.total || pagination.totalCount || 0,
                currentPage: pagination.page || pagination.currentPage || page,
              },
            },
          }));
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [
      filters.pagination.limit,
      filters.debouncedSearchTerm,
      filters.orderStatus,
      filters.sortBy,
      filters.sortOrder,
    ]
  );

  useEffect(() => {
    fetchOrders(filters.pagination.currentPage);
  }, [filters.pagination.currentPage, fetchOrders]);

  const handlePageChange = (selectedItem: { selected: number }) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        pagination: {
          ...prev.filters.pagination,
          currentPage: selectedItem.selected + 1,
        },
      },
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        searchTerm: e.target.value,
      },
    }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        orderStatus: e.target.value as OrderStatus | "",
        pagination: {
          ...prev.filters.pagination,
          currentPage: 1,
        },
      },
    }));
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        pagination: {
          ...prev.filters.pagination,
          limit: Number(e.target.value),
          currentPage: 1, // Reset to first page when changing limit
        },
      },
    }));
  };

  const clearSearch = () => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        searchTerm: "",
        debouncedSearchTerm: "",
      },
    }));
  };

  const handleViewOrder = (row: Record<string, unknown>) => {
    navigate("/order-management/details", { state: { order: row } });
  };

  // Status badge color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "confirmed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "preparing":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "ready":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "out_for_delivery":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "rejected":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "refunded":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const columns: TableColumn[] = [
    {
      key: "orderId",
      label: "Order #",
      render: (value: unknown) => (
        <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
          {String(value)}
        </span>
      ),
    },
    {
      key: "userId",
      label: "Customer",
      render: (value: unknown) => {
        const user = value as Order["userId"];
        return (
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {user.email}
            </div>
            {user.phone && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {user.phone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "items",
      label: "Items",
      render: (value: unknown) => {
        const items = value as Order["items"];
        return (
          <span className="text-sm text-gray-900 dark:text-white">
            {items.length} item{items.length > 1 ? "s" : ""}
          </span>
        );
      },
    },
    {
      key: "totalAmount",
      label: "Amount",
      render: (value: unknown) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          ₹{Number(value).toFixed(2)}
        </span>
      ),
    },
    {
      key: "orderStatus",
      label: "Order Status",
      render: (value: unknown) => {
        const status = String(value);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              status
            )}`}
          >
            {status.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      key: "paymentStatus",
      label: "Payment",
      render: (value: unknown) => {
        const status = String(value);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
              status
            )}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      render: (value: unknown) => (
        <span className="text-sm text-gray-900 dark:text-white uppercase">
          {String(value)}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Order Date",
      render: (value: unknown) => {
        return (
          <div>
            <div className="text-sm text-gray-900 dark:text-white">
              {moment(String(value)).format("DD MMM YYYY")}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {moment(String(value)).format("hh:mm A")}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-4">
        {/* Search Bar */}
        <div className="w-full lg:max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              placeholder="Search by order number, customer..."
              value={filters.searchTerm}
              onChange={handleSearchChange}
            />
            {filters.searchTerm && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={clearSearch}
              >
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="statusFilter"
              className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
            >
              Status:
            </label>
            <select
              id="statusFilter"
              value={filters.orderStatus}
              onChange={handleStatusChange}
              className="block w-40 pl-3 pr-8 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">All Orders</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PREPARING">Preparing</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Entries per page */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="itemsPerPage"
              className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
            >
              Show:
            </label>
            <select
              id="itemsPerPage"
              value={filters.pagination.limit}
              onChange={handleLimitChange}
              className="block w-20 pl-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              entries
            </span>
          </div>
        </div>
      </div>

      <CommonTable
        columns={columns}
        data={orders as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage="No orders found."
        actions={[
          {
            label: "View",
            onClick: handleViewOrder,
            variant: "primary",
            icon: <EyeIcon className="w-4 h-4" />,
          },
        ]}
        pagination={{
          currentPage: filters.pagination.currentPage,
          totalPages: filters.pagination.totalPages,
          totalCount: filters.pagination.totalCount,
          limit: filters.pagination.limit,
          onPageChange: handlePageChange,
        }}
      />
    </div>
  );
}

export default function OrderManagementList() {
  return (
    <>
      <PageMeta
        title="Order Management | Paper Cutting Service Dashboard"
        description="Manage all customer orders for Paper Cutting service"
      />
      <PageBreadcrumb pageTitle="Order Management" />

      <div className="space-y-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Order Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View and manage all customer orders in real-time
            </p>
          </div>
        </div>

        <ComponentCard title="Order List">
          <OrderTable />
        </ComponentCard>
      </div>
    </>
  );
}
