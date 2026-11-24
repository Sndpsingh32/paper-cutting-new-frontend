import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import { postData, deleteWithConfirmation } from "../../../utility/utility";
import { PencilIcon, TrashBinIcon } from "../../../icons";
import CommonTable from "../../../components/common/CommonTable";
import { Content, ContentListResponse } from "../../../types/content";
import moment from "moment";

// Content Table Component
function ContentTable() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchTerm: "",
    debouncedSearchTerm: "",
    type: "",
    isActive: "" as boolean | "",
    sortBy: "createdAt",
    sortOrder: "desc" as "asc" | "desc",
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      limit: 10,
    },
  });

  // Debounce search input
  useEffect(() => {
    const timerId = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        debouncedSearchTerm: prev.searchTerm,
        pagination: { ...prev.pagination, currentPage: 1 },
      }));
    }, 500);
    return () => clearTimeout(timerId);
  }, [filters.searchTerm]);

  const fetchContents = useCallback(
    async (page: number = filters.pagination.currentPage) => {
      try {
        setIsLoading(true);

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
        if (filters.type) {
          requestBody.type = filters.type;
        }
        if (filters.isActive !== "") {
          requestBody.isActive = filters.isActive;
        }

        const response: ContentListResponse = await postData(
          "/content/list",
          requestBody
        );

        if (response.success) {
          const apiContents = response.data?.contentList || [];
          const pagination = response.data?.pagination || {};

          setContents(apiContents);
          setFilters((prev) => ({
            ...prev,
            pagination: {
              ...prev.pagination,
              totalPages: pagination.totalPages || 1,
              totalCount: pagination.totalItems || 0,
              currentPage: pagination.currentPage || page,
            },
          }));
        }
      } catch (error) {
        console.error("Error fetching contents:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      filters.pagination.currentPage,
      filters.pagination.limit,
      filters.debouncedSearchTerm,
      filters.type,
      filters.isActive,
      filters.sortBy,
      filters.sortOrder,
    ]
  );

  useEffect(() => {
    fetchContents(filters.pagination.currentPage);
  }, [filters.pagination.currentPage, fetchContents]);

  const handlePageChange = (selectedItem: { selected: number }) => {
    setFilters((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        currentPage: selectedItem.selected + 1,
      },
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, searchTerm: e.target.value }));
  };

  const clearSearch = () => {
    setFilters((prev) => ({
      ...prev,
      searchTerm: "",
      debouncedSearchTerm: "",
    }));
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(e.target.value);
    setFilters((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, limit: newLimit, currentPage: 1 },
    }));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({
      ...prev,
      type: e.target.value,
      pagination: { ...prev.pagination, currentPage: 1 },
    }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({
      ...prev,
      isActive: e.target.value === "" ? "" : e.target.value === "true",
      pagination: { ...prev.pagination, currentPage: 1 },
    }));
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: e.target.value,
      pagination: { ...prev.pagination, currentPage: 1 },
    }));
  };

  const handleSortOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: e.target.value as "asc" | "desc",
      pagination: { ...prev.pagination, currentPage: 1 },
    }));
  };

  const handleEditContent = (row: Record<string, unknown>) => {
    navigate("/content-management/add", { state: { content: row } });
  };

  const handleDelete = async (content: Record<string, unknown>) => {
    const contentData = content as unknown as Content;

    await deleteWithConfirmation(
      contentData.type
        .replace("_", " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      `/content/delete`,
      { contentId: contentData._id },
      () => fetchContents(filters.pagination.currentPage),
      "Content deleted successfully!"
    );
  };

  const columns = [
    {
      key: "type",
      label: "Content Type",
      render: (value: unknown) => {
        const type = value as string;
        const typeColors = {
          privacy_policy:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          terms_conditions:
            "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
          about_us:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
          faq: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
          contact_info:
            "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
          other:
            "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
        };

        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              typeColors[type as keyof typeof typeColors] || typeColors.other
            }`}
          >
            {type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      render: (value: unknown) => {
        const isActive = Boolean(value);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Created Date",
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
    {
      key: "updatedAt",
      label: "Last Updated",
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
      label: "Edit",
      onClick: handleEditContent,
      variant: "primary" as const,
      icon: <PencilIcon className="w-4 h-4" />,
    },
    {
      label: "Delete",
      onClick: handleDelete,
      variant: "danger" as const,
      icon: <TrashBinIcon className="w-4 h-4" />,
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
              placeholder="Search by content type..."
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
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="typeFilter"
              className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
            >
              Type:
            </label>
            <select
              id="typeFilter"
              value={filters.type}
              onChange={handleTypeChange}
              className="block w-40 pl-3 pr-8 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="privacy_policy">Privacy Policy</option>
              <option value="terms_conditions">Terms Conditions</option>
              <option value="about_us">About Us</option>
              <option value="faq">FAQ</option>
              <option value="contact_info">Contact Info</option>
              <option value="other">Other</option>
            </select>
          </div>

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
              value={filters.isActive?.toString() || ""}
              onChange={handleStatusChange}
              className="block w-32 pl-3 pr-8 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
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
              <option value="type">Type</option>
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
              className="block w-28 pl-3 pr-8 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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
        data={contents as unknown as Record<string, unknown>[]}
        actions={actions}
        loading={isLoading}
        emptyMessage="No content found."
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

export default function ContentManagementList() {
  const navigate = useNavigate();

  const handleAddContent = () => {
    navigate("/content-management/add");
  };

  return (
    <>
      <PageMeta
        title="Content Management | Paper Cutting Service Dashboard"
        description="Manage website content - privacy policy, terms, about us, and more for Paper Cutting"
      />
      <PageBreadcrumb pageTitle="Content Management" />

      <div className="space-y-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Content Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage all website content including policies, terms, and
              informational pages
            </p>
          </div>
          <Button onClick={handleAddContent} size="sm">
            Add New Content
          </Button>
        </div>

        <ComponentCard title="Content List">
          <ContentTable />
        </ComponentCard>
      </div>
    </>
  );
}
