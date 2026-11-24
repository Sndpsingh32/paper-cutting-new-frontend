import { useState, useEffect, useCallback } from 'react';
import { postData } from '../../utility/utility';
import Modal from '../Modal';
import CommonTable from '../../components/common/CommonTable';
import { Product } from '../../types/product';
import moment from 'moment';

export default function ProductModal({
  isOpen,
  onClose,
  onSelect
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(10);

  const fetchProducts = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await postData("/product/list", { page, limit });
      if (response.success) {
        setProducts(response.data.products || []);
        setTotalPages(response.data.pagination.totalPages);
        setTotalCount(response.data.pagination.totalCount);
        setCurrentPage(response.data.pagination.currentPage);
      }
    } catch (error: unknown) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (isOpen) {
      fetchProducts(currentPage);
    }
  }, [isOpen, currentPage, fetchProducts]);

  const columns = [
    {
      key: "images",
      label: "Image",
      render: (_value: unknown, row: Record<string, unknown>) => {
        const product = row as unknown as Product;
        return (
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
        );
      }
    },
    {
      key: "name",
      label: "Name",
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
                ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
            }`}
          >
            {isAvailable ? "Yes" : "No"}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Created",
      render: (value: unknown) => {
        if (!value) return "N/A";
        return moment(String(value)).format("MMM DD, YYYY");
      },
    }
  ];

  const actions = [
    {
      label: "Select",
      onClick: (row: Record<string, unknown>) => onSelect(row as unknown as Product),
      variant: "primary" as const,
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Product" size="xl">
      <CommonTable
        columns={columns}
        data={products as unknown as Record<string, unknown>[]}
        actions={actions}
        loading={isLoading}
        emptyMessage="No products found"
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          limit,
          onPageChange: (selected: { selected: number }) => 
            setCurrentPage(selected.selected + 1)
        }}
      />
    </Modal>
  );
}