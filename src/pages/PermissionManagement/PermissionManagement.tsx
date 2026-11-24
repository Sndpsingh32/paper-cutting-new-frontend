import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import CommonTable from "../../components/common/CommonTable";
import Button from "../../components/ui/button/Button";
// import Input from "../../components/form/input/InputField";
// import Label from "../../components/form/Label";
import { postData, deleteWithConfirmationpost } from "../../utility/utility";
import type { UserPermission, Permission } from "../../types/permission";
import type { TableColumn } from "../../types/table";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import { Resource, Action } from "../../types/permission";
import ReadPermissionGuard from "../../components/auth/ReadPermissionGuard";
import PermissionGate from "../../components/common/PermissionGate";
import { usePermissions } from "../../hooks/usePermissions";
import { filterTableActions } from "../../utils/filterTableActions";

function PermissionTable() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  // const location = useLocation();
  // const selectedUser = location.state?.user;

  // Single state for all filters and data
  const [state, setState] = useState({
    // Filter states
    filters: {
      searchTerm: "",
      debouncedSearchTerm: "",
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
      }
    },
    // Data states
    permissions: [] as UserPermission[],
    isLoading: true
  });

  // Destructure for easier access
  const { filters, permissions, isLoading } = state;

  // Debounce search input
  useEffect(() => {
    const timerId = setTimeout(() => {
      setState(prev => ({
        ...prev,
        filters: {
          ...prev.filters,
          debouncedSearchTerm: prev.filters.searchTerm,
          pagination: {
            ...prev.filters.pagination,
            currentPage: 1 // Reset to first page on new search
          }
        }
      }));
    }, 500);

    return () => clearTimeout(timerId);
  }, [filters.searchTerm]);

  const fetchPermissions = useCallback(
    async (page: number = filters.pagination.currentPage) => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));

        const response = await postData("/permissions/list", {
          page,
          limit: filters.pagination.limit,
          search: filters.debouncedSearchTerm,
        });

        if (response.success) {
          const apiPermissions = (response.data?.permissions || []) as UserPermission[];

          setState(prev => ({
            ...prev,
            permissions: apiPermissions,
            filters: {
              ...prev.filters,
              pagination: {
                ...prev.filters.pagination,
                totalPages: response.data?.totalPages || 1,
                totalCount: response.data?.total || 0,
                currentPage: response.data?.page || page
              }
            }
          }));
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    },
    [filters.pagination.limit, filters.debouncedSearchTerm]
  );

  useEffect(() => {
    fetchPermissions(filters.pagination.currentPage);
  }, [filters.pagination.currentPage, fetchPermissions]);

  const handlePageChange = (selectedItem: { selected: number }) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        pagination: {
          ...prev.filters.pagination,
          currentPage: selectedItem.selected + 1
        }
      }
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        searchTerm: e.target.value
      }
    }));
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        pagination: {
          ...prev.filters.pagination,
          limit: Number(e.target.value),
          currentPage: 1 // Reset to first page when changing limit
        }
      }
    }));
  };

  const clearSearch = () => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        searchTerm: "",
        debouncedSearchTerm: ""
      }
    }));
  };

  const handleEditPermission = (row: Record<string, unknown>) => {
    const permission = row as unknown as UserPermission;
    navigate('/permission-create', { state: { permission, isEdit: true } });
  };

  const handleDeletePermission = async (row: Record<string, unknown>) => {
    const permission = row as unknown as UserPermission;
    await deleteWithConfirmationpost(
      permission.userId,
      '/permissions/delete',
      { userId: permission.userId },
      () => fetchPermissions(filters.pagination.currentPage),
      'Permission deleted successfully!'
    );
  };

  const formatPermissions = (permissions: Permission[]) => {
    return permissions.map(perm => {
      const resource = perm.resource;
      const actions = Array.isArray(perm.action) ? perm.action.join(', ') : perm.action;
      return `${resource}: ${actions}`;
    }).join(' | ');
  };

  const columns: TableColumn[] = [
    {
      key: "userId",
      label: "Employee",
      render: (value: any) => {
        if (!value) return <span className="text-gray-400">N/A</span>;
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {value.fullName || 'N/A'}
            </div>
            <div className="text-xs text-gray-500 truncate w-32">
              {value._id || value}
            </div>
          </div>
        );
      },
    },
    {
      key: "permissions",
      label: "Permissions",
      render: (value: unknown) => {
        const permissions = value as Permission[];
        if (!permissions || permissions.length === 0) {
          return <span className="text-gray-400">No permissions</span>;
        }

        return (
          <div className="max-w-md">
            <div className="text-sm truncate" title={formatPermissions(permissions)}>
              {formatPermissions(permissions)}
            </div>
          </div>
        );
      },
    },
    {
      key: "createBy",
      label: "Created By",
      render: (value: any) => value?.fullName || value?._id || value || 'N/A',
    },
    {
      key: "updatedBy",
      label: "Updated By",
      render: (value: any) => value?.fullName || value?._id || value || 'N/A',
    },
    {
      key: "createdAt",
      label: "Created At",
      render: (value: unknown) => {
        if (!value) return <span className="text-gray-400">N/A</span>;
        return new Date(value as string).toLocaleDateString();
      },
    },
    {
      key: "updatedAt",
      label: "Updated At",
      render: (value: unknown) => {
        if (!value) return <span className="text-gray-400">N/A</span>;
        return new Date(value as string).toLocaleDateString();
      },
    },
  ];

  const actions = filterTableActions(
    [
      {
        label: "Edit",
        onClick: handleEditPermission,
        variant: "primary" as const,
        icon: <PencilIcon className="w-4 h-4" />,
        permission: { resource: Resource.PERMISSION, action: Action.UPDATE },
      },
      {
        label: "Delete",
        onClick: handleDeletePermission,
        variant: "danger" as const,
        icon: <TrashBinIcon className="w-4 h-4" />,
        permission: { resource: Resource.PERMISSION, action: Action.DELETE },
      },
    ],
    can,
  );

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
              placeholder="Search permissions by user ID..."
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
          <label htmlFor="itemsPerPage" className="text-sm text-gray-600 whitespace-nowrap">
            Show:
          </label>
          <select
            id="itemsPerPage"
            value={filters.pagination.limit}
            onChange={handleLimitChange}
            className="block w-20 pl-3  py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
        data={permissions as unknown as Record<string, unknown>[]}
        actions={actions}
        loading={isLoading}
        emptyMessage="No permissions found."
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

export default function PermissionManagement() {
  const navigate = useNavigate();

  return (
    <ReadPermissionGuard resource={Resource.PERMISSION}>
    <>
      <PageMeta
        title="Permission Management | Paper Cutting Service Dashboard"
        description="Manage user permissions for Paper Cutting service system"
      />
      <PageBreadcrumb pageTitle="Permission Management" />

      <div className="space-y-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Permission Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage user permissions and access control for your system
            </p>
          </div>
          <PermissionGate resource={Resource.PERMISSION} action={Action.CREATE}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/permission-create')}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Permission
            </Button>
          </PermissionGate>
        </div>

        <ComponentCard title="Permission List">
          <PermissionTable />
        </ComponentCard>
      </div>
    </>
    </ReadPermissionGuard>
  );
}
