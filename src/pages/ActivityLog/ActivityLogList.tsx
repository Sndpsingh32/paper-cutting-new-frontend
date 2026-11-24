import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import { postData } from "../../utility/utility";
import CommonTable from "../../components/common/CommonTable";
import moment from "moment";
import { Resource } from "../../types/permission";
import ReadPermissionGuard from "../../components/auth/ReadPermissionGuard";

function ActivityLogTable() {
  const [logs, setLogs] = useState<any[]>([]);
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

  const fetchLogs = useCallback(async (page: number = filters.pagination.currentPage) => {
    try {
      setIsLoading(true);
      const payload = {
        search: filters.debouncedSearchTerm || "",
        page: page,
        limit: filters.pagination.limit
      };
      
      const response = await postData("/activity-log/list", payload);
      
      if (response.success) {
        setLogs(response.data.logs || []);
        setFilters((prev) => ({
          ...prev,
          pagination: {
            ...prev.pagination,
            totalPages: response.data.totalPages || 1,
            totalCount: response.data.total || 0,
            currentPage: page,
          },
        }));
      }
    } catch (error: unknown) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters.debouncedSearchTerm, filters.pagination.limit]);

  useEffect(() => {
    fetchLogs(filters.pagination.currentPage);
  }, [filters.pagination.currentPage, filters.debouncedSearchTerm, fetchLogs]);

  const handlePageChange = (selectedItem: { selected: number }) => {
    setFilters((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, currentPage: selectedItem.selected + 1 },
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, searchTerm: e.target.value }));
  };

  const columns = [
    {
      key: "createdAt",
      label: "Date & Time",
      render: (value: any) => moment(value).format("DD MMM YYYY, hh:mm A")
    },
    {
      key: "employeeId",
      label: "Employee/User",
      render: (value: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-800">{value?.fullName || 'Guest'}</span>
          <span className="text-xs text-gray-500 uppercase">{value?.role || 'N/A'}</span>
          {value?.mobileNumber && <span className="text-[10px] text-gray-400">{value.mobileNumber}</span>}
        </div>
      )
    },
    {
      key: "action",
      label: "Action/API",
      render: (value: any, row: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-brand-600">{value}</span>
          <code className="text-[10px] text-gray-400">{row.method} {row.endpoint}</code>
        </div>
      )
    },
    {
      key: "deviceInfo",
      label: "Device Info",
      render: (value: any) => (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-gray-100 text-[10px] rounded font-bold uppercase">{value?.platform}</span>
            <span className="text-xs font-medium">{value?.brand} {value?.model}</span>
          </div>
          <div className="flex gap-2 text-[10px] text-gray-500">
             <span>RAM: {value?.ramTotal ? (Number(value.ramTotal) / (1024**3)).toFixed(1) + 'GB' : 'N/A'}</span>
             <span>Bat: {value?.battery}</span>
          </div>
          <span className="text-[10px] text-gray-400 truncate w-32" title={value?.processor}>{value?.processor}</span>
        </div>
      )
    },
    {
      key: "locationInfo",
      label: "Location",
      render: (value: any) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="text-xs font-bold text-gray-700">{value?.city || value?.district}, {value?.state}</span>
          <span className="text-[10px] text-gray-500 line-clamp-2" title={value?.address}>{value?.address}</span>
          {value?.pincode && <span className="text-[10px] text-gray-400">PIN: {value.pincode}</span>}
        </div>
      )
    },
    {
      key: "statusCode",
      label: "Status",
      render: (value: any) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          value >= 200 && value < 300 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: "_id",
      label: "View",
      render: (value: any) => (
        <Link 
          to={`/activity-logs/${value}`}
          className="px-3 py-1 bg-brand-50 text-brand-600 rounded-md text-xs font-bold hover:bg-brand-600 hover:text-white transition-colors"
        >
          Details
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <div className="w-full sm:max-w-md">
           <input
              type="text"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm"
              placeholder="Search by User, Action, City or Device..."
              value={filters.searchTerm}
              onChange={handleSearchChange}
            />
        </div>
      </div>

      <CommonTable
        columns={columns}
        data={logs}
        loading={isLoading}
        emptyMessage="No activity logs found."
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

export default function ActivityLogList() {
  return (
    <ReadPermissionGuard resource={Resource.EMPLOYEE}>
    <>
      <PageMeta
        title="Activity Logs | Admin Dashboard"
        description="Monitor user activities, devices, and locations"
      />
      <PageBreadcrumb pageTitle="Activity Logs" />

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
             User Activity Logs
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track who did what, from where, and using which device
          </p>
        </div>

        <ComponentCard title="Activity History">
          <ActivityLogTable />
        </ComponentCard>
      </div>
    </>
    </ReadPermissionGuard>
  );
}
