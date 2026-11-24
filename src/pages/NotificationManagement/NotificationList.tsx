import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import CommonTable from "../../components/common/CommonTable";
import Button from "../../components/ui/button/Button";
import { postData, deleteWithConfirmationpost } from "../../utility/utility";
import type { TableColumn } from "../../types/table";
import { PencilIcon, TrashBinIcon } from "../../icons";
import { Resource, Action } from "../../types/permission";
import ReadPermissionGuard from "../../components/auth/ReadPermissionGuard";
import PermissionGate from "../../components/common/PermissionGate";
import { usePermissions } from "../../hooks/usePermissions";
import { filterTableActions } from "../../utils/filterTableActions";

interface Notification {
    _id: string;
    title: string;
    description: string;
    targetGroup: string;
    receiverType: string;
    scheduledAt: string;
    isSent: boolean;
    createdAt: string;
}

function NotificationTable() {
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
        notifications: [] as Notification[],
        isLoading: true
    });

    const { filters, notifications, isLoading } = state;

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

    const fetchNotifications = useCallback(
        async (page: number = filters.pagination.currentPage) => {
            try {
                setState(prev => ({ ...prev, isLoading: true }));
                const response = await postData("/notifications-admin/list", {
                    page,
                    limit: filters.pagination.limit,
                    search: filters.debouncedSearchTerm
                });

                if (response.success) {
                    setState(prev => ({
                        ...prev,
                        notifications: response.data?.notifications || [],
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
                console.error("Error fetching notifications:", error);
            } finally {
                setState(prev => ({ ...prev, isLoading: false }));
            }
        },
        [filters.pagination.limit, filters.debouncedSearchTerm]
    );

    useEffect(() => {
        fetchNotifications(filters.pagination.currentPage);
    }, [filters.pagination.currentPage, fetchNotifications]);

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

    const handleDelete = async (notification: Notification) => {
        const success = await deleteWithConfirmationpost(
            "Notification",
            "/notifications-admin/delete",
            { notificationId: notification._id },
            () => fetchNotifications()
        );
        if (success) {
            // Toast is handled in deleteWithConfirmationpost
        }
    };

    const columns: TableColumn[] = [
        //Title
        {
            key: "title",
            label: "Title",
            render: (value: unknown, row?: Record<string, unknown>) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">{String(value)}</span>
                    <span className="text-xs text-gray-500 truncate max-w-[200px]">{String(row?.description || "")}</span>
                </div>
            )
        },
        //Target Group
        {
            key: "targetGroup",
            label: "Target Group",
            render: (value: unknown) => (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {String(value || "").toUpperCase()}
                </span>
            )
        },
        //Receiver Type
        {
            key: "receiverType",
            label: "Receiver Type",
            render: (value: unknown) => (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                    {String(value || "").toUpperCase()}
                </span>
            )
        },
        //Scheduled At
        {
            key: "scheduledAt",
            label: "Scheduled At",
            render: (value: unknown) => {
                const date = new Date(String(value));
                return (
                    <div>
                        <div className="text-sm text-gray-900 dark:text-white">
                            {date.toLocaleDateString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                dateStyle: "medium",
                            })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {date.toLocaleTimeString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                timeStyle: "short",
                            })}
                        </div>
                    </div>
                );
            }
        },
        //Status
        {
            key: "isSent",
            label: "Status",
            render: (value: unknown) => (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${value ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}>
                    {value ? "SENT" : "SCHEDULED"}
                </span>
            )
        },

        //Created At
        {
            key: "createdAt",
            label: "Created At",
            render: (value: unknown) => {
                const date = new Date(String(value));
                return (
                    <div>
                        <div className="text-sm text-gray-900 dark:text-white">
                            {date.toLocaleDateString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                dateStyle: "medium",
                            })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {date.toLocaleTimeString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                timeStyle: "short",
                            })}
                        </div>
                    </div>
                );
            }
        }

    ];

    const actions = filterTableActions(
        [
            {
                label: "Edit",
                onClick: (row: Record<string, unknown>) => navigate("/notification-create", { state: { notification: row } }),
                variant: "primary" as const,
                icon: <PencilIcon className="size-5" />,
                permission: { resource: Resource.NOTIFICATION, action: Action.UPDATE },
            },
            {
                label: "Delete",
                onClick: (row: Record<string, unknown>) => handleDelete(row as unknown as Notification),
                variant: "danger" as const,
                icon: <TrashBinIcon className="size-5" />,
                permission: { resource: Resource.NOTIFICATION, action: Action.DELETE },
            },
        ],
        can,
    );

    return (
        <ComponentCard
            title="Notification History"
            desc="Manage and track sent notifications"
        >
            <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:w-64">
                    <Input
                        type="text"
                        placeholder="Search notifications..."
                        value={filters.searchTerm}
                        onChange={(e) => setState(prev => ({
                            ...prev,
                            filters: { ...prev.filters, searchTerm: (e.target as HTMLInputElement).value }
                        }))}
                        className="pl-10"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
                <PermissionGate resource={Resource.NOTIFICATION} action={Action.CREATE}>
                    <Button
                        onClick={() => navigate("/notification-create")}
                        className="flex items-center gap-2"
                    >
                        <span>Send New Notification</span>
                    </Button>
                </PermissionGate>
            </div>

            <CommonTable
                columns={columns}
                data={notifications as any}
                loading={isLoading}
                actions={actions}
                pagination={{
                    currentPage: filters.pagination.currentPage,
                    totalPages: filters.pagination.totalPages,
                    totalCount: filters.pagination.totalCount,
                    limit: filters.pagination.limit,
                    onPageChange: handlePageChange
                }}
            />
        </ComponentCard>
    );
}

// Fixed Input import
import Input from "../../components/form/input/InputField";

export default function NotificationList() {
    return (
        <ReadPermissionGuard resource={Resource.NOTIFICATION}>
        <>
            <PageMeta
                title="Notifications | Paper Cutting Service Dashboard"
                description="Notification management for Paper Cutting service"
            />
            <PageBreadcrumb pageTitle="Notification Management" />
            <div className="space-y-6">
                <NotificationTable />
            </div>
        </>
        </ReadPermissionGuard>
    );
}
