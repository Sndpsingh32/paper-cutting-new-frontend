import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import { postData, deleteWithConfirmationpost, verifyWithConfirmation } from "../../utility/utility";
import { toast } from "react-toastify";
import CommonTable from "../../components/common/CommonTable";
import { PencilIcon, TrashBinIcon } from "../../icons";
import moment from "moment";

// Types for service data
interface ServiceLocation {
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  radius: number;
}

interface Service {
  _id: string;
  name: string;
  shortDescription: string;
  description: string;
  images: string[];
  location: ServiceLocation;
  categoryId: number;
  subcategoryId: number;
  basePrice: number;
  discountPrice: number;
  duration: number;
  tags: string[];
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  _id: string;
  name: string;
}

interface Subcategory {
  _id: string;
  name: string;
  categoryId: string;
}

// Service Table Component
function ServiceTable() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchTerm: "",
    debouncedSearchTerm: "",
    categoryId: "",
    subcategoryId: "",
    isActive: "",
    isVerified: "",
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

  // Fetch categories and subcategories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesRes = await postData("/category/list", {});
        if (categoriesRes.success) {
          setCategories(categoriesRes.data.categories || []);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (filters.categoryId) {
        try {
          const response = await postData("/subcategory/list", {
            categoryId: filters.categoryId,
            page: 1,
            limit: 10,
            isActive: true
          });
          if (response.success) {
            setSubcategories(response.data.subcategories || []);
          }
        } catch (error) {
          console.error("Error fetching subcategories:", error);
        }
      } else {
        setSubcategories([]);
      }
    };

    fetchSubcategories();
  }, [filters.categoryId]);

  const fetchServices = useCallback(
    async (page: number = filters.pagination.currentPage) => {
      try {
        setIsLoading(true);
        
        const payload = {
          page,
          limit: filters.pagination.limit,
          search: filters.debouncedSearchTerm,
          ...(filters.categoryId && { categoryId: filters.categoryId }),
          ...(filters.subcategoryId && { subcategoryId: filters.subcategoryId }),
          ...(filters.isActive && { isActive: filters.isActive === "true" }),
          ...(filters.isVerified && { isVerified: filters.isVerified === "true" }),
        };

        const response = await postData("/service/list", payload);
        
        if (response.success) {
          setServices(response.data.services || []);
          setFilters((prev) => ({
            ...prev,
            pagination: {
              ...prev.pagination,
              totalPages: response.data.pagination?.totalPages || 1,
              totalCount: response.data.pagination?.totalItems || 0,
              currentPage: page,
            },
          }));
        }
      } catch (error) {
        console.error("Error fetching services:", error);
        setServices([]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      filters.pagination.limit,
      filters.debouncedSearchTerm,
      filters.categoryId,
      filters.subcategoryId,
      filters.isActive,
      filters.isVerified,
    ]
  );

  useEffect(() => {
    fetchServices(filters.pagination.currentPage);
  }, [filters.pagination.currentPage, fetchServices]);

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

  const clearAllFilters = () => {
    setFilters({
      searchTerm: "",
      debouncedSearchTerm: "",
      categoryId: "",
      subcategoryId: "",
      isActive: "",
      isVerified: "",
      pagination: {
        ...filters.pagination,
        currentPage: 1,
      },
    });
  };

  const hasActiveFilters = filters.categoryId || filters.subcategoryId || filters.isActive || filters.isVerified || filters.searchTerm;

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(e.target.value);
    setFilters((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, limit: newLimit, currentPage: 1 },
    }));
  };

  const handleEditService = (row: Record<string, unknown>) => {
    const service = row as any;
    navigate(`/service-management/add`, { state: { service } });
  };

  const handleDeleteService = async (row: Record<string, unknown>) => {
    const service = row as any;

    await deleteWithConfirmationpost(
      service.name,
      "/service/delete",
      { serviceId: service._id },
      () => fetchServices(filters.pagination.currentPage),
      "Service deleted successfully!"
    );
  };

  const handleToggleStatus = async (row: Record<string, unknown>, field: 'isActive' | 'isVerified') => {
    const service = row as any;
    try {
      const response = await postData("/service/update", {
        serviceId: service._id,
        [field]: !service[field],
      });

      if (response.success) {
        toast.success(`Service ${field} updated successfully!`);
        fetchServices(filters.pagination.currentPage);
      } else {
        toast.error(response.message || `Failed to update ${field}`);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field}`);
    }
  };

  const handleVerifyService = async (row: Record<string, unknown>) => {
    const service = row as any;

    await verifyWithConfirmation(
      service.name,
      "/service/verify",
      { serviceId: service._id },
      () => fetchServices(filters.pagination.currentPage),
      "Service verified successfully!"
    );
  };

  const columns = [
    {
      key: "images",
      label: "Service Image",
      render: (_: unknown, row: Record<string, unknown>) => {
        const service = row as any;
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-24">
              <img
                className="h-16 w-24 rounded-lg object-cover border border-gray-200"
                src={service.images?.[0] || "/images/placeholder-service.jpg"}
                alt={service.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/placeholder-service.jpg";
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "name",
      label: "Service Name",
    },
    {
      key: "shortDescription",
      label: "Description",
      render: (value: unknown) => {
        const description = String(value || "");
        if (!description.trim()) {
          return <span className="text-gray-400 italic">No description</span>;
        }
        return (
          <div className="max-w-xs truncate" title={description}>
            {description}
          </div>
        );
      },
    },
    {
      key: "basePrice",
      label: "Price",
      render: (_value: unknown, row: Record<string, unknown>) => {
        const service = row as any;
        return (
          <div>
            <div className="font-medium">₹{service.basePrice}</div>
            {service.discountPrice > 0 && (
              <div className="text-sm text-green-600">₹{service.discountPrice}</div>
            )}
          </div>
        );
      },
    },
    {
      key: "location",
      label: "Location",
      render: (_value: unknown, row: Record<string, unknown>) => {
        const service = row as any;
        return `${service.location.city}, ${service.location.state}`;
      },
    },
    {
      key: "isActive",
      label: "Status",
      render: (value: unknown) => {
        const isActive = Boolean(value);
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
      key: "isVerified",
      label: "Verified",
      render: (value: unknown) => {
        const isVerified = Boolean(value);
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isVerified
              ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
          }`}>
            {isVerified ? "Verified" : "Not Verified"}
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
  ];

  const actions = [
    {
      label: "Edit",
      onClick: handleEditService,
      variant: "primary" as const,
      icon: <PencilIcon className="w-4 h-4" />,
    },
    {
      label: "Toggle Status",
      onClick: (row: Record<string, unknown>) => handleToggleStatus(row, 'isActive'),
      variant: "warning" as const,
    },
    {
      label: "Verify Service",
      onClick: handleVerifyService,
      variant: "success" as const,
    },
    {
      label: "Delete",
      onClick: handleDeleteService,
      variant: "danger" as const,
      icon: <TrashBinIcon className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Services</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                placeholder="Search by service name..."
                value={filters.searchTerm}
                onChange={handleSearchChange}
              />
              {filters.searchTerm && (
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  onClick={clearSearch}
                  title="Clear search"
                >
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Show:</label>
              <select
                id="itemsPerPage"
                value={filters.pagination.limit}
                onChange={handleLimitChange}
                className="block w-20 px-3 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">entries</span>
            </div>
            
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                title="Clear all filters"
              >
                <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Additional Filters */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
              <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Filters
            </h4>
            {hasActiveFilters && (
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {Object.values(filters).filter(v => v && v !== "" && typeof v !== "object").length} active
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value, subcategoryId: "" }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subcategory</label>
              <select
                value={filters.subcategoryId}
                onChange={(e) => setFilters(prev => ({ ...prev, subcategoryId: e.target.value }))}
                disabled={!filters.categoryId}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <option value="">All Subcategories</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory._id} value={subcategory._id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={filters.isActive}
                onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Verification</label>
              <select
                value={filters.isVerified}
                onChange={(e) => setFilters(prev => ({ ...prev, isVerified: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value="">All Verification</option>
                <option value="true">Verified</option>
                <option value="false">Not Verified</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <CommonTable
        columns={columns}
        data={services as unknown as Record<string, unknown>[]}
        actions={actions}
        loading={isLoading}
        emptyMessage="No services found."
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

export default function GetServiceManagement() {
  const navigate = useNavigate();

  const handleAddService = () => {
    navigate("/service-management/add");
  };

  return (
    <>
      <PageMeta
        title="Service Management | Paper Cutting Service Dashboard"
        description="Manage and monitor all services on the Paper Cutting platform"
      />
      <PageBreadcrumb pageTitle="Service Management" />

      <div className="space-y-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Service Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage and monitor all services on the platform
            </p>
          </div>
          <Button onClick={handleAddService} size="sm">
            Add New Service
          </Button>
        </div>

        <ComponentCard title="Service List">
          <ServiceTable />
        </ComponentCard>
      </div>
    </>
  );
}
