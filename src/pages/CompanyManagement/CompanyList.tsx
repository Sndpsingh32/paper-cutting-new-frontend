import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import { postData, deleteWithConfirmationpost } from "../../utility/utility";
import { PencilIcon, TrashBinIcon, CloseIcon } from "../../icons";
import CommonTable from "../../components/common/CommonTable";

const SearchIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

interface Company {
    _id: string;
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    type: "buyer" | "seller";
    website: string;
    city: string;
    state: string;
    logo?: string;
    isActive: boolean;
}

export default function CompanyList() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10,
    });

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchCompanies = useCallback(async (page: number, search: string) => {
        try {
            setIsLoading(true);
            const response = await postData("/company/list", {
                page,
                limit: pagination.limit,
                search,
            });
            if (response.success) {
                setCompanies(response.data.companies || []);
                setPagination(prev => ({
                    ...prev,
                    totalPages: response.data.totalPages || 1,
                    totalCount: response.data.total || 0,
                    currentPage: response.data.page || page,
                }));
            }
        } catch (error) {
            console.error("Error fetching companies:", error);
        } finally {
            setIsLoading(false);
        }
    }, [pagination.limit]);

    useEffect(() => {
        fetchCompanies(pagination.currentPage, debouncedSearch);
    }, [pagination.currentPage, debouncedSearch, fetchCompanies]);

    const handleEdit = (row: any) => {
        navigate("/company-registration", { state: { company: row } });
    };

    const handleDelete = async (row: any) => {
        await deleteWithConfirmationpost(
            row.companyName,
            "/company/delete",
            { companyId: row._id },
            () => fetchCompanies(pagination.currentPage, debouncedSearch),
            "Company deleted successfully!"
        );
    };

    const columns = [
        {
            key: "logo",
            label: "Logo",
            render: (value: unknown, row: Record<string, unknown>) => (
                <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700 shadow-sm">
                    {value ? (
                        <img src={value as string} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#811f13] to-[#a0321f] flex items-center justify-center">
                            <span className="text-white text-sm font-bold uppercase">
                                {String(row.companyName || 'C').charAt(0)}
                            </span>
                        </div>
                    )}
                </div>
            )
        },
        {
            key: "companyName",
            label: "Company",
            render: (value: unknown, _row: Record<string, unknown>) => <span className="font-medium text-gray-900 dark:text-gray-100">{String(value)}</span>
        },
        {
            key: "location",
            label: "Location",
            render: (_value: unknown, row: Record<string, unknown>) => <span className="text-[12px] text-gray-500 dark:text-gray-400">{String(row.city)}, {String(row.state)}</span>
        },
        {
            key: "contactPerson",
            label: "Contact Person",
            render: (value: unknown, _row: Record<string, unknown>) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-[13px]">{String(value)}</span>

                </div>
            )
        },
        {
            key: "phone",
            label: "Phone",
            render: (value: unknown, _row: Record<string, unknown>) => <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{String(value)}</span>
        },
        {
            key: "email",
            label: "Email",
            render: (value: unknown, _row: Record<string, unknown>) => <span className="text-[12px] text-gray-500 dark:text-gray-400">{String(value)}</span>
        },
        {
            key: "type",
            label: "Type",
            render: (value: unknown, _row: Record<string, unknown>) => (
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${String(value) === 'seller' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                    {String(value)}
                </span>
            )
        },
        {
            key: "isActive",
            label: "Status",
            render: (value: unknown, _row: Record<string, unknown>) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                    {value ? "Active" : "Inactive"}
                </span>
            )
        }
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
        <>
            <PageMeta title="Company Management | Admin Dashboard" description="Manage companies" />
            <PageBreadcrumb pageTitle="Company Management" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Companies</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">View and manage your registered companies</p>
                    </div>
                    <Button onClick={() => navigate("/company-registration")} size="sm" className="flex items-center gap-2">
                        Add New Company
                    </Button>
                </div>

                <ComponentCard title="Company Directory">
                    <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="relative w-full sm:max-w-xs">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <SearchIcon className="h-5 w-5 text-gray-400" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search companies..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-300 pl-10 pr-3 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <CloseIcon className="h-4 w-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    <CommonTable
                        columns={columns}
                        data={companies as any}
                        actions={actions}
                        loading={isLoading}
                        pagination={{
                            currentPage: pagination.currentPage,
                            totalPages: pagination.totalPages,
                            totalCount: pagination.totalCount,
                            limit: pagination.limit,
                            onPageChange: (item) => setPagination(prev => ({ ...prev, currentPage: item.selected + 1 })),
                        }}
                    />
                </ComponentCard>
            </div>
        </>
    );
}
