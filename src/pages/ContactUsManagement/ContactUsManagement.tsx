import { useCallback, useEffect, useState } from "react";
import moment from "moment";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import CommonTable from "../../components/common/CommonTable";
import { postData } from "../../utility/utility";
import { EyeIcon, CheckCircleIcon } from "../../icons";
import { ContactUs, ContactUsListResponse } from "../../types/contactUs";
import type { TableColumn } from "../../types/table";
import Modal from "../../Modal/Modal";
import ResolutionModal from "../../Modal/ResolutionModal/ResolutionModal";

// Contact Us Table Component
function ContactUsTable() {
  // Single state for all filters and data
  const [state, setState] = useState({
    // Filter states
    filters: {
      searchTerm: "",
      debouncedSearchTerm: "",
      isResolved: "" as boolean | "",
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
    contactUsList: [] as ContactUs[],
    isLoading: true,
  });

  // Destructure for easier access
  const { filters, contactUsList, isLoading } = state;

  // Modal state
  const [selectedContact, setSelectedContact] = useState<ContactUs | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactToResolve, setContactToResolve] = useState<ContactUs | null>(
    null
  );
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

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

  const fetchContactUs = useCallback(
    async (page: number = filters.pagination.currentPage) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        const requestBody: Record<string, unknown> = {
          page,
          limit: filters.pagination.limit,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        };

        // Add optional filters
        if (filters.debouncedSearchTerm) {
          requestBody.search = filters.debouncedSearchTerm;
        }
        if (filters.isResolved !== "") {
          requestBody.isResolved = filters.isResolved;
        }

        const response: ContactUsListResponse = await postData(
          "/contact-us/list",
          requestBody
        );

        if (response.success) {
          const apiContactUs = response.data?.contactUsList || [];
          const pagination = response.data?.pagination || {};

          setState((prev) => ({
            ...prev,
            contactUsList: apiContactUs,
            filters: {
              ...prev.filters,
              pagination: {
                ...prev.filters.pagination,
                totalPages: pagination.totalPages || 1,
                totalCount: pagination.totalItems || 0,
                currentPage: pagination.currentPage || page,
              },
            },
          }));
        }
      } catch (error) {
        console.error("Error fetching contact us requests:", error);
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [
      filters.pagination.currentPage,
      filters.pagination.limit,
      filters.debouncedSearchTerm,
      filters.isResolved,
      filters.sortBy,
      filters.sortOrder,
    ]
  );

  useEffect(() => {
    fetchContactUs(filters.pagination.currentPage);
  }, [filters.pagination.currentPage, fetchContactUs]);

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
        isResolved: e.target.value === "" ? "" : e.target.value === "true",
        pagination: {
          ...prev.filters.pagination,
          currentPage: 1,
        },
      },
    }));
  };

  const handleViewDetails = (row: Record<string, unknown>) => {
    const contact = row as unknown as ContactUs;
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedContact(null);
  };

  const handleResolveModalOpen = (row: Record<string, unknown>) => {
    const contact = row as unknown as ContactUs;
    setContactToResolve(contact);
    setIsResolveModalOpen(true);
  };

  const handleResolveModalClose = () => {
    setIsResolveModalOpen(false);
    setContactToResolve(null);
  };

  const handleResolveSuccess = () => {
    // Refresh the contact list to show updated status
    fetchContactUs(filters.pagination.currentPage);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        sortBy: e.target.value,
        pagination: {
          ...prev.filters.pagination,
          currentPage: 1,
        },
      },
    }));
  };

  const handleSortOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        sortOrder: e.target.value as "asc" | "desc",
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

  const columns: TableColumn[] = [
    {
      key: "fullName",
      label: "Name",
      render: (value: unknown) => (
        <div className="font-medium text-gray-900 dark:text-white">
          {value as string}
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (value: unknown) => (
        <div className="text-gray-600 dark:text-gray-300">
          {value as string}
        </div>
      ),
    },
    {
      key: "phoneNumber",
      label: "Phone",
      render: (value: unknown) => (
        <div className="text-gray-600 dark:text-gray-300">
          {(value as string) || "N/A"}
        </div>
      ),
    },
    {
      key: "topic",
      label: "Topic",
      render: (value: unknown) => (
        <div className="text-gray-900 dark:text-white max-w-xs truncate">
          {value as string}
        </div>
      ),
    },
    {
      key: "isResolved",
      label: "Status",
      render: (value: unknown) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            (value as boolean)
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
          }`}
        >
          {(value as boolean) ? "Resolved" : "Pending"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
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

  const actions = [
    {
      label: "View",
      onClick: handleViewDetails,
      variant: "primary" as const,
      icon: <EyeIcon className="w-4 h-4" />,
    },
    {
      label: "Resolve",
      onClick: handleResolveModalOpen,
      variant: "success" as const,
      icon: <CheckCircleIcon className="w-4 h-4" />,
      condition: (row: Record<string, unknown>) => {
        const contact = row as unknown as ContactUs;
        return !contact.isResolved; // Only show for pending contacts
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Contact Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Contact Details"
        size="lg"
      >
        {selectedContact && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedContact.fullName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedContact.email}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedContact.phoneNumber || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedContact.isResolved
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                  }`}
                >
                  {selectedContact.isResolved ? "Resolved" : "Pending"}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Topic
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedContact.topic}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Submitted Date
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {moment(selectedContact.createdAt).format(
                    "DD MMM YYYY hh:mm A"
                  )}
                </p>
              </div>
            </div>

            {/* Resolved Information */}
            {selectedContact.isResolved && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Resolution Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Resolved At
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedContact.resolvedAt
                        ? moment(selectedContact.resolvedAt).format(
                            "DD MMM YYYY hh:mm A"
                          )
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Resolved By
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedContact.resolvedBy?.name || "N/A"}
                    </p>
                    {selectedContact.resolvedBy?.email && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedContact.resolvedBy.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Additional Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contact ID
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white font-mono">
                    {selectedContact._id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {moment(selectedContact.updatedAt).format(
                      "DD MMM YYYY hh:mm A"
                    )}
                  </p>
                </div>
                {selectedContact.updatedBy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Updated By
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedContact.updatedBy.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedContact.updatedBy.email}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deleted Status
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedContact.isDeleted
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                    }`}
                  >
                    {selectedContact.isDeleted ? "Deleted" : "Active"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedContact.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Resolution Modal */}
      <ResolutionModal
        isOpen={isResolveModalOpen}
        onClose={handleResolveModalClose}
        contact={contactToResolve}
        onSuccess={handleResolveSuccess}
      />
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
              placeholder="Search by name, email, or topic..."
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
              value={filters.isResolved?.toString() || ""}
              onChange={handleStatusChange}
              className="block w-40 pl-3 pr-8 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="false">Pending</option>
              <option value="true">Resolved</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="sortBy"
              className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
            >
              Sort:
            </label>
            <select
              id="sortBy"
              value={filters.sortBy}
              onChange={handleSortChange}
              className="block w-32 pl-3 pr-8 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="createdAt">Date</option>
              <option value="fullName">Name</option>
              <option value="topic">Topic</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="sortOrder"
              className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
            >
              Order:
            </label>
            <select
              id="sortOrder"
              value={filters.sortOrder}
              onChange={handleSortOrderChange}
              className="block w-32 pl-3 pr-8 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="desc">Newest</option>
              <option value="asc">Oldest</option>
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
        data={contactUsList as unknown as Record<string, unknown>[]}
        actions={actions}
        loading={isLoading}
        emptyMessage="No contact us requests found."
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

export default function ContactUsManagement() {
  return (
    <>
      <PageMeta
        title="Contact Us Management | Paper Cutting Service Dashboard"
        description="Manage all customer contact requests for Paper Cutting service"
      />
      <PageBreadcrumb pageTitle="Contact Us Management" />

      <div className="space-y-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Contact Us Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View and manage all customer contact requests in real-time
            </p>
          </div>
        </div>

        <ComponentCard title="Contact Requests">
          <ContactUsTable />
        </ComponentCard>
      </div>
    </>
  );
}
