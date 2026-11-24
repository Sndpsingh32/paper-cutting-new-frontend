import { useState, useEffect, useCallback } from 'react';
import { postData } from '../../utility/utility';
import Modal from '../Modal';
import CommonTable from '../../components/common/CommonTable';

type Category = {
  _id: string;
  name: string;
  image: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function CategoryModal({
  isOpen,
  onClose,
  onSelect
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(10);

  const fetchCategories = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await postData("/category/all", { page, limit });
      if (response.success) {
        setCategories(response.data.categories || []);
        setTotalPages(response.data.pagination.totalPages);
        setTotalCount(response.data.pagination.totalCount);
        setCurrentPage(response.data.pagination.currentPage);
      }
    } catch (error: unknown) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (isOpen) {
      fetchCategories(currentPage);
    }
  }, [isOpen, currentPage, fetchCategories]);

  const columns = [
    {
      key: "image",
      label: "Image",
      render: (value: unknown) => (
        <div className="flex-shrink-0 h-16 w-16">
          <img 
            className="h-16 w-16 rounded-lg object-cover" 
            src={String(value)} 
            alt="Category"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/placeholder-category.jpg';
            }}
          />
        </div>
      )
    },
    {
      key: "name",
      label: "Name",
    },
    {
      key: "isActive",
      label: "Status",
      render: (value: unknown) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          Boolean(value) 
            ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" 
            : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
        }`}>
          {Boolean(value) ? "Active" : "Inactive"}
        </span>
      )
    }
  ];

  const actions = [
    {
      label: "Select",
      onClick: (row: Record<string, unknown>) => onSelect(row as Category),
      variant: "primary" as const,
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Category" size="xl">
      <CommonTable
        columns={columns}
        data={categories}
        actions={actions}
        loading={isLoading}
        emptyMessage="No categories found"
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