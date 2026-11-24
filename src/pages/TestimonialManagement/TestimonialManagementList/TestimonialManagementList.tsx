import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import { postData, deleteWithConfirmationpost } from "../../../utility/utility";
import { PencilIcon, TrashBinIcon } from "../../../icons";
import CommonTable from "../../../components/common/CommonTable";
import { Testimonial } from "../../../types/testimonial";

function TestimonialTable() {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchTestimonials = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const payload: Record<string, unknown> = { page, limit };
      if (debouncedSearchTerm) payload.search = debouncedSearchTerm;
      if (statusFilter !== "all") payload.status = statusFilter;
      const response = await postData("/testimonial/list", payload);
      if (response.success) {
        setTestimonials(response.data.testimonials || []);
        const pg = response.data.pagination || {};
        setTotalPages(pg.totalPages || 1);
        setTotalCount(pg.totalCount || pg.total || 0);
        setCurrentPage(pg.currentPage || page);
      }
    } catch (error: unknown) {
      console.error("Error fetching testimonials:", error);
    } finally {
      setIsLoading(false);
    }
  }, [limit, statusFilter, debouncedSearchTerm]);

  useEffect(() => {
    fetchTestimonials(currentPage);
  }, [currentPage, fetchTestimonials]);

  const handlePageChange = (selectedItem: { selected: number }) => {
    setCurrentPage(selectedItem.selected + 1);
  };

  const handleEdit = (row: Record<string, unknown>) => {
    navigate("/testimonial-management/add", { state: { testimonial: row } });
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    const t = row as unknown as Testimonial;
    await deleteWithConfirmationpost(
      t.title,
      `/testimonial/delete`,
      { id: t._id },
      () => fetchTestimonials(currentPage),
      "Testimonial deleted successfully!"
    );
  };

  const columns = [
    {
      key: "image",
      label: "Image",
      render: (value: unknown, row: Record<string, unknown>) => {
        const item = row as unknown as Testimonial;
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-24">
              <img
                className="h-16 w-24 rounded-lg object-cover border border-gray-200"
                src={String(value)}
                alt={item.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/placeholder-banner.jpg";
                }}
              />
            </div>
          </div>
        );
      },
    },
    { key: "title", label: "Title" },

    {
      key: "status",
      label: "Status",
      render: (value: unknown) => {
        const isActive = String(value) === "active";
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive
            ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
            : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
            }`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
  ];

  const actions = [
    {
      label: "Edit",
      onClick: handleEdit,
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
              placeholder="Search testimonials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => { setSearchTerm(""); setDebouncedSearchTerm(""); }}
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
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setCurrentPage(1); }}
            className="block w-20 pl-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600 whitespace-nowrap">entries</span>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="statusFilter" className="text-sm text-gray-600 whitespace-nowrap">Status:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as "all" | "active" | "inactive"); setCurrentPage(1); }}
            className="block w-28 pl-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <CommonTable
        columns={columns}
        data={testimonials as unknown as Record<string, unknown>[]}
        actions={actions}
        loading={isLoading}
        emptyMessage="No testimonials found."
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          limit,
          onPageChange: handlePageChange,
        }}
      />
    </div>
  );
}

export default function TestimonialManagementList() {
  const navigate = useNavigate();

  const handleAdd = () => {
    navigate("/testimonial-management/add");
  };

  return (
    <>
      <PageMeta
        title="Testimonial Management | Paper Cutting Service Dashboard"
        description="Manage customer testimonials for Paper Cutting"
      />
      <PageBreadcrumb pageTitle="Testimonial Management" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Testimonial Management</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage all customer testimonials</p>
          </div>
          <Button onClick={handleAdd} size="sm">Add New Testimonial</Button>
        </div>

        <ComponentCard title="Testimonial List">
          <TestimonialTable />
        </ComponentCard>
      </div>
    </>
  );
}
