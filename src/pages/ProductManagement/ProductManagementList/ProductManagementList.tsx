import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import { postData, deleteWithConfirmation } from "../../../utility/utility";
import { PencilIcon, TrashBinIcon } from "../../../icons";
import CommonTable from "../../../components/common/CommonTable";
import { Product } from "../../../types/product";

// Category Table Component
function ProductTable() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchTerm: "",
    debouncedSearchTerm: "",
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

  const fetchProducts = useCallback(
    async (page: number = filters.pagination.currentPage) => {
      try {
        setIsLoading(true);
        const response = await postData("/product/list", {
          page,
          limit: filters.pagination.limit,
          search: filters.debouncedSearchTerm,
        });
        if (response.success) {
          setProducts(response.data.products || []);
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
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [filters.pagination.limit, filters.debouncedSearchTerm, filters.pagination.currentPage]
  );

  useEffect(() => {
    fetchProducts(filters.pagination.currentPage);
  }, [filters.pagination.currentPage, fetchProducts]);

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

  const handleEditProduct = (row: Record<string, unknown>) => {
    navigate("/product-management/add", { state: { product: row } });
  };

  const handleDelete = async (product: Record<string, unknown>) => {
    const productData = product as unknown as Product;

    await deleteWithConfirmation(
      productData.name,
      `/product/delete`,
      { productId: productData._id },
      () => fetchProducts(filters.pagination.currentPage),
      "Product deleted successfully!"
    );
  };

  const columns = [
    {
      key: "image",
      label: "Product Image",
      render: (_value: unknown, row: Record<string, unknown>) => {
        const product = row as unknown as Product;
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-24">
              <img
                className="h-16 w-24 rounded-lg object-cover border border-gray-200"
                src={product.images[0]}
                alt={product.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/images/placeholder-category.jpg";
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
      key: "categoryId.name",
      label: "Category",
      render: (_value: unknown, row: Record<string, unknown>) => {
        const product = row as unknown as { categoryId?: { name: string } };
        return product.categoryId?.name || 'N/A';
      },
    },
    {
      key: "pricing",
      label: "Price",
      render: (value: unknown) => {
        const pricing = value as Product["pricing"];
        return pricing?.length > 0 ? `₹${pricing[0].price}` : "N/A";
      },
    },
  
    {
      key: "isAvailable",
      label: "Available",
      render: (value: unknown) => {
        const isAvailable = Boolean(value);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isAvailable
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isAvailable ? "Yes" : "No"}
          </span>
        );
      },
    },

  ];

  const actions = [
    {
      label: "Edit",
      onClick: handleEditProduct,
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
    <>
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
              placeholder="Search products..."
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
        data={products as unknown as Record<string, unknown>[]}
        actions={actions}
        loading={isLoading}
        emptyMessage="No products found."
        pagination={{
          currentPage: filters.pagination.currentPage,
          totalPages: filters.pagination.totalPages,
          totalCount: filters.pagination.totalCount,
          limit: filters.pagination.limit,
          onPageChange: handlePageChange,
        }}
      />
    </>
  );
}

export default function ProductManagementList() {
  const navigate = useNavigate();

  const handleAddProduct = () => {
    navigate("/product-management/add");
  };

  return (
    <>
      <PageMeta
        title="Category Management | Paper Cutting Service Dashboard"
        description="Manage service categories - see all service categories for Paper Cutting"
      />
      <PageBreadcrumb pageTitle="Product Management" />

      <div className="space-y-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Product Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage all menu products for your restaurant
            </p>
          </div>
          <Button onClick={handleAddProduct} size="sm">
            Add New Product
          </Button>
        </div>

        <ComponentCard title="Product List">
          <ProductTable />
        </ComponentCard>
      </div>
    </>
  );
}
