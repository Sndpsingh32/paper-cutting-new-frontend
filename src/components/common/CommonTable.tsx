import React from "react";
import ReactPaginate from "react-paginate";
import Loader from "./Loader";

interface TableColumn {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface TableAction {
  label: string;
  onClick: (row: Record<string, unknown>) => void;
  variant?: "primary" | "danger" | "success" | "warning" | "outline";
  icon?: React.ReactNode;
  condition?: (row: Record<string, unknown>) => boolean;
  hidden?: (row: Record<string, unknown>) => boolean;
  className?: string;
}

interface CommonTableProps {
  columns: TableColumn[];
  data: Record<string, unknown>[];
  actions?: TableAction[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    onPageChange: (selectedItem: { selected: number }) => void;
  };
}

export default function CommonTable({
  columns,
  data,
  actions,
  loading = false,
  emptyMessage = "No data found",
  className = "",
  pagination,
}: CommonTableProps) {
  const handlePageChange = (selectedItem: { selected: number }) => {
    pagination?.onPageChange(selectedItem);
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 dark:bg-gray-800">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-white">
          No data found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  // Calculate row numbers based on pagination
  const getRowNumber = (index: number): number => {
    if (
      !pagination ||
      typeof pagination.currentPage !== "number" ||
      typeof pagination.limit !== "number"
    ) {
      return index + 1;
    }
    return (pagination.currentPage - 1) * pagination.limit + index + 1;
  };

  // Render table rows
  const renderTableRows = () => {
    return data.map((row, index) => {
      const rowNumber = getRowNumber(index);
      return (
        <tr
          key={(row._id as string) || index}
          className="hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-6 py-4 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-white">
            {rowNumber}
          </td>
          {columns.map((column) => (
            <td key={column.key} className="whitespace-nowrap px-6 py-4">
              {column.render ? (
                column.render((row as Record<string, unknown>)[column.key], row)
              ) : (
                <div className="text-sm text-gray-900 dark:text-white">
                  {String(
                    (row as Record<string, unknown>)[column.key] || "N/A"
                  )}
                </div>
              )}
            </td>
          ))}
          {actions && actions.length > 0 && (
            <td className="sticky right-0 z-10 whitespace-nowrap bg-white px-6 py-4 text-center text-sm font-medium dark:bg-gray-800">
              <div className="flex items-center justify-center gap-2">
                {actions
                  .filter(
                    (action) =>
                      (!action.condition || action.condition(row)) &&
                      (!action.hidden || !action.hidden(row))
                  )
                  .map((action, actionIndex) => (
                    <button
                      key={actionIndex}
                      onClick={() => action.onClick(row)}
                      title={action.label}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${action.variant === "danger"
                        ? "text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-300 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:focus:ring-red-700"
                        : action.variant === "success"
                          ? "text-green-700 bg-green-50 hover:bg-green-100 focus:ring-green-300 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:focus:ring-green-700"
                          : action.variant === "warning"
                            ? "text-amber-700 bg-amber-50 hover:bg-amber-100 focus:ring-amber-300 dark:text-amber-300 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:focus:ring-amber-700"
                            : action.variant === "outline"
                              ? "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700"
                              : "text-blue-700 bg-blue-50 hover:bg-blue-100 focus:ring-blue-300 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:focus:ring-blue-700"
                        } ${action.className || ""}`}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
              </div>
            </td>
          )}
        </tr>
      );
    });
  };


  return (
    <div className={`${className} flex flex-col`}>
      <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        {loading && data.length > 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-gray-900/60">
            <Loader size="lg" />
          </div>
        )}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-brand-50 dark:bg-brand-700">
                  <tr className="transition-colors">
                    <th className="sticky left-0 z-10 bg-brand-50 px-6 py-3 text-left text-xs font-medium text-brand-600 uppercase tracking-wider dark:bg-brand-700 dark:text-brand-200 transition-colors">
                      S.No
                    </th>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="px-6 py-3 text-left text-xs font-medium text-brand-600 uppercase tracking-wider dark:text-brand-200 whitespace-nowrap transition-colors"
                      >
                        {column.label}
                      </th>
                    ))}
                    {actions && actions.length > 0 && (
                      <th className="sticky right-0 z-10 bg-brand-50 px-6 py-3 text-center text-xs font-medium text-brand-600 uppercase tracking-wider dark:bg-brand-700 dark:text-brand-200 transition-colors">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {renderTableRows()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {pagination && pagination.totalCount > 0 && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-b-xl border-t border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {(pagination.currentPage - 1) * pagination.limit + 1}
            </span>
            {" "}–{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
            </span>
            {" "}of{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {pagination.totalCount}
            </span>
            {" "}results
          </div>
          {pagination.totalPages > 1 && (
            <ReactPaginate
              pageCount={pagination.totalPages}
              pageRangeDisplayed={5}
              marginPagesDisplayed={2}
              onPageChange={handlePageChange}
              forcePage={pagination.currentPage - 1}
              containerClassName="flex items-center space-x-1"
              pageClassName="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600 cursor-pointer"
              pageLinkClassName="block"
              activeClassName="!bg-gradient-to-r from-[#0084C1] to-[#005a84] !text-white !border-[#0084C1]"
              previousLabel={<span className="flex items-center gap-1">← Prev</span>}
              nextLabel={<span className="flex items-center gap-1">Next →</span>}
              previousClassName="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-brand-50 dark:border-gray-600 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
              nextClassName="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-brand-50 dark:border-gray-600 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
              disabledClassName="opacity-40 cursor-not-allowed"
              breakClassName="px-3 py-2 text-sm text-gray-500"
            />
          )}
        </div>
      )}
    </div>
  );
}
