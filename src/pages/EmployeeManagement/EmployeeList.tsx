import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import CommonTable from "../../components/common/CommonTable";
import Button from "../../components/ui/button/Button";
import { postData, deleteWithConfirmationpost } from "../../utility/utility";
import type { User } from "../../types/user";
import type { TableColumn } from "../../types/table";
import { PencilIcon, TrashBinIcon, LockIcon, TimeIcon } from "../../icons";
import { Resource, Action } from "../../types/permission";
import ReadPermissionGuard from "../../components/auth/ReadPermissionGuard";
import PermissionGate from "../../components/common/PermissionGate";
import { usePermissions } from "../../hooks/usePermissions";
import { filterTableActions } from "../../utils/filterTableActions";

function EmployeeTable() {
    const navigate = useNavigate();
    const { can } = usePermissions();
    const [state, setState] = useState({
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
        employees: [] as User[],
        isLoading: true
    });

    const { filters, employees, isLoading } = state;

    useEffect(() => {
        const timerId = setTimeout(() => {
            setState(prev => ({
                ...prev,
                filters: {
                    ...prev.filters,
                    debouncedSearchTerm: prev.filters.searchTerm,
                    pagination: {
                        ...prev.filters.pagination,
                        currentPage: 1
                    }
                }
            }));
        }, 500);

        return () => clearTimeout(timerId);
    }, [filters.searchTerm]);

    const fetchEmployees = useCallback(
        async (page: number = filters.pagination.currentPage) => {
            try {
                setState(prev => ({ ...prev, isLoading: true }));
                const response = await postData("/employees/list", {
                    page,
                    limit: filters.pagination.limit,
                    search: filters.debouncedSearchTerm
                });

                if (response.success) {
                    const apiEmployees = (response.data?.employees || []) as User[];
                    setState(prev => ({
                        ...prev,
                        employees: apiEmployees,
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
                console.error("Error fetching employees:", error);
            } finally {
                setState(prev => ({ ...prev, isLoading: false }));
            }
        },
        [filters.pagination.limit, filters.debouncedSearchTerm]
    );

    useEffect(() => {
        fetchEmployees(filters.pagination.currentPage);
    }, [filters.pagination.currentPage, fetchEmployees]);

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
                    currentPage: 1
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

    const handleEditEmployee = (row: Record<string, unknown>) => {
        const employee = row as unknown as User;
        navigate('/employee-registration', { state: { employee } });
    };

    const handlePermission = (row: Record<string, unknown>) => {
        const employee = row as unknown as User;
        navigate('/permission-create', { state: { user: employee } });
    };

    const handleTimeline = (row: Record<string, unknown>) => {
        const employee = row as unknown as User;
        navigate('/user-timeline', { state: { employee } });
    };

    const handleDeleteEmployee = async (row: Record<string, unknown>) => {
        const employee = row as unknown as User;
        await deleteWithConfirmationpost(
            employee.fullName,
            '/employees/delete',
            { employeeId: employee._id },
            () => fetchEmployees(filters.pagination.currentPage),
            'Employee deleted successfully!'
        );
    };

    const columns: TableColumn[] = [
        {
            key: "fullName",
            label: "Name",
        },
        {
            key: "email",
            label: "Email",
        },
        {
            key: "mobileNumber",
            label: "Phone",
        },
        {
            key: "role",
            label: "Role",
            render: (value: unknown) => {
                const role = String(value || 'admin').toUpperCase();
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {role}
                    </span>
                );
            },
        },
        {
            key: "isBlocked",
            label: "Status",
            render: (value: unknown) => {
                const isBlocked = Boolean(value);
                return (
                    <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isBlocked
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                            }`}
                    >
                        {isBlocked ? "Blocked" : "Active"}
                    </span>
                );
            },
        },
    ];

    const actions = filterTableActions(
        [
            {
                label: "Edit",
                onClick: handleEditEmployee,
                variant: "primary" as const,
                icon: <PencilIcon className="w-4 h-4" />,
                permission: { resource: Resource.EMPLOYEE, action: Action.UPDATE },
            },
            {
                label: "Timeline",
                onClick: handleTimeline,
                variant: "primary" as const,
                icon: <TimeIcon className="w-4 h-4" />,
                permission: { resource: Resource.EMPLOYEE, action: Action.READ },
            },
            {
                label: "Permissions",
                onClick: handlePermission,
                variant: "success" as const,
                icon: <LockIcon className="w-4 h-4" />,
                permission: { resource: Resource.PERMISSION, action: Action.UPDATE },
            },
            {
                label: "Delete",
                onClick: handleDeleteEmployee,
                variant: "danger" as const,
                icon: <TrashBinIcon className="w-4 h-4" />,
                permission: { resource: Resource.EMPLOYEE, action: Action.DELETE },
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
                            placeholder="Search employees..."
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
                data={employees as unknown as Record<string, unknown>[]}
                actions={actions}
                loading={isLoading}
                emptyMessage="No employees found."
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

export default function EmployeeList() {
    const navigate = useNavigate();

    return (
        <ReadPermissionGuard resource={Resource.EMPLOYEE}>
        <>
            <PageMeta
                title="Employee Management | Paper Cutting Service Dashboard"
                description="Manage superadmin and staff employees for Paper Cutting service system"
            />
            <PageBreadcrumb pageTitle="Employee Management" />

            <div className="space-y-6 overflow-hidden">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            Employee Management
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Manage all super admin and staff employees of your platform
                        </p>
                    </div>
                    <PermissionGate resource={Resource.EMPLOYEE} action={Action.CREATE}>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => navigate('/employee-registration')}
                        >
                            + Add Employee
                        </Button>
                    </PermissionGate>
                </div>
                <ComponentCard title="Employee List">
                    <EmployeeTable />
                </ComponentCard>
            </div>
        </>
        </ReadPermissionGuard>
    );
}
