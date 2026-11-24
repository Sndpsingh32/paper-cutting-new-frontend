import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import { postData, deleteWithConfirmationpost } from "../../../utility/utility";
import { Banner } from "../../../types/banner";
import { PencilIcon, TrashBinIcon } from "../../../icons";
import CommonTable from "../../../components/common/CommonTable";
import moment from "moment";

function BannerTable() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchTerm: "",
    debouncedSearchTerm: "",
    status: "",
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      limit: 10,
    },
  });

 
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

  const fetchBanners = useCallback(async (page: number = filters.pagination.currentPage) => {
    try {
      setIsLoading(true);
      const payload: any = {
        page,
        limit: filters.pagination.limit,
        search: filters.debouncedSearchTerm,
      };
      
    
      if (filters.status) {
        payload.status = filters.status;
      }
      
      const response = await postData("/banner/list", payload);
      if (response.success) {
        setBanners(response.data.banners || []);
        const pg = response.data.pagination || {};
        setFilters((prev) => ({
          ...prev,
          pagination: {
            ...prev.pagination,
            totalPages: pg.totalPages || 1,
            totalCount: pg.totalCount || pg.total || 0,
            currentPage: pg.currentPage || page,
          },
        }));
      }
    } catch (error: unknown) {
      console.error("Error fetching banners:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters.pagination.limit, filters.debouncedSearchTerm, filters.status, filters.pagination.currentPage]);

  useEffect(() => {
    fetchBanners(filters.pagination.currentPage);
  }, [filters.pagination.currentPage, fetchBanners]);

  const handlePageChange = (selectedItem: { selected: number }) => {
    setFilters((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, currentPage: selectedItem.selected + 1 },
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, searchTerm: e.target.value }));
  };

  const clearSearch = () => {
    setFilters((prev) => ({ ...prev, searchTerm: "", debouncedSearchTerm: "" }));
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(e.target.value);
    setFilters((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, limit: newLimit, currentPage: 1 },
    }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({
      ...prev,
      status: e.target.value,
      pagination: { ...prev.pagination, currentPage: 1 },
    }));
  };

  const handleEditBanner = (row: Record<string, unknown>) => {
    navigate("/banner-management/add", { state: { banner: row } });
  };

  const handleDelete = async (banner: Record<string, unknown>) => {
    const bannerData = banner as unknown as Banner;

    await deleteWithConfirmationpost(
      bannerData.name,
      `/banner/delete`,
      { bannerId: bannerData._id },
      () => fetchBanners(filters.pagination.currentPage),
      "Banner deleted successfully!"
    );
  };

  const columns = [
    {
      key: "image",
      label: "Banner",
      render: (value: unknown, row: Record<string, unknown>) => {
        const banner = row as unknown as Banner;
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-24">
              <img
                className="h-16 w-24 rounded-lg object-cover border border-gray-200"
                src={String(value)}
                alt={banner.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/placeholder-banner.jpg";
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "name",
      label: "Name",
    },
    {
      key: "status",
      label: "Status",
      render: (value: unknown) => {
        const status = String(value || "").toLowerCase();
        const isActive = status === "active";
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isActive
              ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
              : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
          }`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Created Date",
      render: (value: unknown) => {
        if (!value) return "N/A";
        return moment(String(value)).format("MMM DD, YYYY");
      },
    },
    {
      key: "updatedAt",
      label: "Last Updated",
      render: (value: unknown) => {
        if (!value) return "N/A";
        return moment(String(value)).format("MMM DD, YYYY");
      },
    },
  ];

  const actions = [
    {
      label: "Edit",
      onClick: handleEditBanner,
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
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <div className="w-full sm:max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search banners..."
              value={filters.searchTerm}
              onChange={handleSearchChange}
            />
            {filters.searchTerm && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={clearSearch}
              >
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="statusFilter" className="text-sm text-gray-600 whitespace-nowrap">Status:</label>
          <select
            id="statusFilter"
            value={filters.status}
            onChange={handleStatusChange}
            className="block w-28 pl-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="itemsPerPage" className="text-sm text-gray-600 whitespace-nowrap">Show:</label>
          <select
            id="itemsPerPage"
            value={filters.pagination.limit}
            onChange={handleLimitChange}
            className="block w-20 pl-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600 whitespace-nowrap">entries</span>
        </div>
      </div>

      <CommonTable
        columns={columns}
        data={banners as unknown as Record<string, unknown>[]}
        actions={actions}
        loading={isLoading}
        emptyMessage="No banners found."
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

export default function BannerManagementList() {
  const navigate = useNavigate();

  const handleAddBanner = () => {
    navigate("/banner-management/add");
  };

  return (
    <>
      <PageMeta
        title="Banner Management | Paper Cutting Service Dashboard"
        description="Manage service banners with active status control - see all promotional banners for Paper Cutting"
      />
      <PageBreadcrumb pageTitle="Banner Management" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Banner Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage all promotional banners with active status control for your restaurant
            </p>
          </div>
          <Button onClick={handleAddBanner} size="sm">
            Add New Banner
          </Button>
        </div>

        <ComponentCard title="Banner List">
          <BannerTable />
        </ComponentCard>
      </div>
    </>
  );
}