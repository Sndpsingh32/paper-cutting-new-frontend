import { useState, useEffect, useCallback, useRef } from "react";
import ReactPaginate from "react-paginate";

import { useNavigate } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import { postData, deleteWithConfirmationpost } from "../../../utility/utility";
import { PencilIcon, TrashBinIcon, FilterIcon, GridIcon, AngleLeftIcon, AngleRightIcon, DownloadIcon } from "../../../icons";
import CommonTable from "../../../components/common/CommonTable";
import { Reel, ReelStatus, PaperQuality } from "../../../types/reel";
import moment from "moment";
import DatePicker from "../../../components/form/date-picker";
import { toast } from "react-toastify";
import { downloadCsv } from "../../../utility/csvExport";
import { Resource, Action } from "../../../types/permission";
import ReadPermissionGuard from "../../../components/auth/ReadPermissionGuard";
import PermissionGate from "../../../components/common/PermissionGate";
import { usePermissions } from "../../../hooks/usePermissions";
import { filterTableActions } from "../../../utils/filterTableActions";

function ReelTable() {
    const navigate = useNavigate();
    const { can } = usePermissions();
    const [reels, setReels] = useState<Reel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const hasLoadedOnce = useRef(false);
    const [filters, setFilters] = useState({
        searchTerm: "",
        debouncedSearchTerm: "",
        quality: "",
        gsm: "",
        minWeight: "",
        maxWeight: "",
        startDate: "",
        endDate: "",
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

    const fetchReels = useCallback(
        async (page: number = filters.pagination.currentPage) => {
            try {
                if (hasLoadedOnce.current) {
                    setIsRefreshing(true);
                } else {
                    setIsLoading(true);
                }
                const response = await postData("/reels/list", {
                    page,
                    limit: filters.pagination.limit,
                    search: filters.debouncedSearchTerm,
                    quality: filters.quality,
                    gsm: filters.gsm ? Number(filters.gsm) : undefined,
                    minWeight: filters.minWeight ? Number(filters.minWeight) : undefined,
                    maxWeight: filters.maxWeight ? Number(filters.maxWeight) : undefined,
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                });
                if (response.success) {
                    hasLoadedOnce.current = true;
                    setReels(response.data.reels || []);
                    // Backend returns these fields directly in response.data
                    const { totalPages, total, totalCount, currentPage, page: responsePage } = response.data;
                    setFilters((prev) => ({
                        ...prev,
                        pagination: {
                            ...prev.pagination,
                            totalPages: totalPages || 1,
                            totalCount: totalCount || total || 0,
                            currentPage: currentPage || responsePage || page,
                        },
                    }));
                }
            } catch (error: unknown) {
                console.error("Error fetching reels:", error);
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [
            filters.pagination.limit,
            filters.debouncedSearchTerm,
            filters.quality,
            filters.gsm,
            filters.minWeight,
            filters.maxWeight,
            filters.startDate,
            filters.endDate,
        ]
    );

    useEffect(() => {
        fetchReels(filters.pagination.currentPage);
    }, [
        filters.pagination.currentPage,
        filters.quality,
        filters.gsm,
        filters.minWeight,
        filters.maxWeight,
        filters.startDate,
        filters.endDate,
        fetchReels,
    ]);

    const handlePageChange = (selectedItem: { selected: number }) => {
        const nextPage = selectedItem.selected + 1;
        setFilters((prev) => {
            if (prev.pagination.currentPage === nextPage) return prev;
            return {
                ...prev,
                pagination: { ...prev.pagination, currentPage: nextPage },
            };
        });
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters((prev) => ({ ...prev, searchTerm: e.target.value }));
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value,
            pagination: { ...prev.pagination, currentPage: 1 },
        }));
    };

    const clearSearch = () => {
        setFilters((prev) => ({ ...prev, searchTerm: "", debouncedSearchTerm: "" }));
    };

    const clearFilters = () => {
        setFilters((prev) => ({
            ...prev,
            searchTerm: "",
            debouncedSearchTerm: "",
            quality: "",
            gsm: "",
            minWeight: "",
            maxWeight: "",
            startDate: "",
            endDate: "",
            pagination: { ...prev.pagination, currentPage: 1 },
        }));
    };

    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLimit = Number(e.target.value);
        setFilters((prev) => ({
            ...prev,
            pagination: { ...prev.pagination, limit: newLimit, currentPage: 1 },
        }));
    };

    const handleEditReel = (row: Record<string, unknown>) => {
        navigate("/reel-management/add", { state: { reel: row } });
    };

    const handleDelete = async (reel: Record<string, unknown>) => {
        const reelData = reel as unknown as Reel;

        await deleteWithConfirmationpost(
            reelData.reelNo,
            `/reels/delete`,
            { reelId: reelData._id },
            () => fetchReels(filters.pagination.currentPage),
            "Roll deleted successfully!"
        );
    };

    const getCompanyName = (reel: Reel) => {
        if (typeof reel.companyId === "object" && reel.companyId !== null) {
            return reel.companyId.companyName || "N/A";
        }
        return "N/A";
    };

    const getVendorName = (reel: Reel) => {
        if (typeof reel.vendorId === "object" && reel.vendorId !== null) {
            return reel.vendorId.companyName || "N/A";
        }
        return "N/A";
    };

    const fetchAllReelsForExport = async (): Promise<Reel[]> => {
        const PAGE_SIZE = 100;
        const listParams = {
            limit: PAGE_SIZE,
            search: filters.debouncedSearchTerm,
            quality: filters.quality,
            gsm: filters.gsm ? Number(filters.gsm) : undefined,
            minWeight: filters.minWeight ? Number(filters.minWeight) : undefined,
            maxWeight: filters.maxWeight ? Number(filters.maxWeight) : undefined,
            startDate: filters.startDate,
            endDate: filters.endDate,
        };

        const firstResponse = await postData("/reels/list", { page: 1, ...listParams });
        if (!firstResponse.success) {
            throw new Error("Failed to fetch roll data.");
        }

        const allReels: Reel[] = [...(firstResponse.data.reels || [])];
        const totalPages = firstResponse.data.totalPages || 1;

        for (let page = 2; page <= totalPages; page++) {
            const response = await postData("/reels/list", { page, ...listParams });
            if (!response.success) {
                throw new Error("Failed to fetch roll data.");
            }
            allReels.push(...(response.data.reels || []));
        }

        return allReels;
    };

    const handleDownloadCsv = async () => {
        try {
            setIsExporting(true);
            const exportRows = await fetchAllReelsForExport();

            if (exportRows.length === 0) {
                toast.info("No roll data to export.");
                return;
            }

            downloadCsv(
                `roll-inventory-${moment().format("YYYY-MM-DD")}.csv`,
                [
                    { header: "Roll No", getValue: (r) => r.reelNo },
                    { header: "Quality", getValue: (r) => r.quality },
                    { header: "GSM", getValue: (r) => r.gsm },
                    { header: "Remaining Width", getValue: (r) => Number(r.width || 0).toFixed(1) },
                    { header: "Size Unit", getValue: (r) => r.sizeUnit },
                    { header: "Height", getValue: (r) => r.height },
                    { header: "Total Weight (kg)", getValue: (r) => r.totalWeightKg },
                    { header: "Price/kg (₹)", getValue: (r) => Number(r.purchasePricePerKg).toFixed(2) },
                    { header: "Used (kg)", getValue: (r) => Number(r.usedWeightKg || 0).toFixed(2) },
                    {
                        header: "Remaining (kg)",
                        getValue: (r) => Number(r.remainingWeightKg ?? r.currentBalanceKg ?? 0).toFixed(2),
                    },
                    {
                        header: "Remaining %",
                        getValue: (r) => {
                            const remaining = Number(r.remainingWeightKg ?? r.currentBalanceKg ?? 0);
                            const pct = r.totalWeightKg > 0 ? (remaining / r.totalWeightKg) * 100 : 0;
                            return pct.toFixed(1);
                        },
                    },
                    { header: "Stock Value (₹)", getValue: (r) => Number(r.stockValue || 0).toFixed(2) },
                    { header: "Company", getValue: getCompanyName },
                    { header: "Vendor", getValue: getVendorName },
                    { header: "Status", getValue: (r) => r.status },
                    {
                        header: "Entry Date",
                        getValue: (r) => (r.entryDate ? moment(r.entryDate).format("DD-MM-YYYY") : "N/A"),
                    },
                ],
                exportRows
            );
            toast.success(`Exported ${exportRows.length} roll(s) to CSV.`);
        } catch (error) {
            console.error("Error exporting rolls:", error);
            toast.error("Failed to export roll data.");
        } finally {
            setIsExporting(false);
        }
    };

    const columns = [
        {
            key: "reelNo",
            label: "Roll No",
            render: (value: unknown) => <span className="font-medium text-gray-900 dark:text-white break-all inline-block max-w-[150px]">{String(value)}</span>
        },
        {
            key: "quality",
            label: "Quality",
            render: (value: unknown) => (
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold dark:bg-blue-900/30 dark:text-blue-400">
                    {String(value)}
                </span>
            )
        },
        {
            key: "gsm",
            label: "GSM",
        },
        {
            key: "width",
            label: "Remaining Width",
            render: (value: unknown, row: Record<string, unknown>) => {
                const reel = row as unknown as Reel;
                const currentWidth = Number(value || 0);
                return (
                    <div className="flex flex-col">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                            {currentWidth.toFixed(1)} {reel.sizeUnit}
                        </span>
                        <span className="text-[10px] text-gray-400">Current Width</span>
                    </div>
                );
            }
        },
        {
            key: "height",
            label: "Height",
            render: (_value: unknown, row: Record<string, unknown>) => {
                const reel = row as unknown as Reel;
                return `${reel.height} ${reel.sizeUnit}`;
            }
        },
        {
            key: "totalWeightKg",
            label: "Total Wt (kg)",
        },
        {
            key: "purchasePricePerKg",
            label: "Price/kg (₹)",
            render: (value: unknown) => `₹${Number(value).toFixed(2)}`
        },
        {
            key: "usedWeightKg",
            label: "Used (kg)",
            render: (value: unknown) => (
                <span className="font-bold text-red-500">
                    {Number(value || 0).toFixed(2)}
                </span>
            )
        },
        {
            key: "remainingWeightKg",
            label: "Remaining (kg)",
            render: (value: unknown, row: Record<string, unknown>) => {
                const reel = row as unknown as Reel;
                const remaining = Number(value || 0);
                const percentage = (remaining / reel.totalWeightKg) * 100;

                let barColor = "bg-green-500";
                if (percentage < 20) barColor = "bg-red-500";
                else if (percentage < 50) barColor = "bg-yellow-500";

                return (
                    <div className="w-full min-w-[120px]">
                        <div className="flex justify-between items-center mb-1 text-[10px] font-bold uppercase">
                            <span className="text-gray-400">{percentage.toFixed(0)}% Left</span>
                            <span className="text-gray-900 dark:text-white">{remaining.toFixed(2)} kg</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                            ></div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: "stockValue",
            label: "Stock Value (₹)",
            render: (value: unknown) => (
                <span className="font-black text-brand-600">
                    ₹{Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            )
        },

        {
            key: "companyId",
            label: "Company",
            render: (value: unknown) => {
                if (typeof value === 'object' && value !== null) {
                    return (value as any).companyName || 'N/A';
                }
                return 'N/A';
            }
        },
        {
            key: "vendorId",
            label: "Vendor",
            render: (value: unknown) => {
                if (typeof value === 'object' && value !== null) {
                    return (value as any).companyName || 'N/A';
                }
                return 'N/A';
            }
        },
        {
            key: "status",
            label: "Status",
            render: (value: unknown) => {
                const status = value as ReelStatus;
                const colorMap = {
                    [ReelStatus.ACTIVE]: "bg-green-100 text-green-800",
                    [ReelStatus.FINISHED]: "bg-gray-100 text-gray-800",
                };
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[status] || "bg-blue-100 text-blue-800"}`}>
                        {status}
                    </span>
                );
            },
        },
        {
            key: "entryDate",
            label: "Entry Date",
            render: (value: unknown) => value ? moment(String(value)).format("DD-MM-YYYY") : "N/A"
        }
    ];

    const actions = filterTableActions(
        [
            {
                label: "Edit",
                onClick: handleEditReel,
                variant: "primary" as const,
                icon: <PencilIcon className="w-4 h-4" />,
                permission: { resource: Resource.REEL, action: Action.UPDATE },
            },
            {
                label: "Delete",
                onClick: handleDelete,
                variant: "danger" as const,
                icon: <TrashBinIcon className="w-4 h-4" />,
                permission: { resource: Resource.REEL, action: Action.DELETE },
            },
        ],
        can,
    );

    return (
        <>
            <div className="flex flex-col gap-4 mb-6">
                {/* Top Row: Search and Limit */}
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="w-full md:max-w-md">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                placeholder="Search by Roll Number..."
                                value={filters.searchTerm}
                                onChange={handleSearchChange}
                            />
                            {filters.searchTerm && (
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={clearSearch}
                                >
                                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Show:</label>
                            <select
                                id="itemsPerPage"
                                value={filters.pagination.limit}
                                onChange={handleLimitChange}
                                className="block w-20 pl-3 py-2 text-sm border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <PermissionGate resource={Resource.REEL} action={Action.EXPORT}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadCsv}
                                disabled={isExporting || isLoading}
                                startIcon={<DownloadIcon className="w-4 h-4" />}
                                className="text-gray-600 border-gray-300"
                            >
                                {isExporting ? "Exporting..." : "Download CSV"}
                            </Button>
                        </PermissionGate>
                        <Button variant="outline" size="sm" onClick={clearFilters} className="text-gray-600 border-gray-300">
                            Clear All
                        </Button>
                    </div>
                </div>

                {/* Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Quality</label>
                        <select
                            name="quality"
                            value={filters.quality}
                            onChange={handleFilterChange}
                            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        >
                            <option value="">All Qualities</option>
                            {Object.values(PaperQuality).map((q) => (
                                <option key={q} value={q}>{q}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">GSM</label>
                        <input
                            type="number"
                            name="gsm"
                            placeholder="Exact GSM"
                            value={filters.gsm}
                            onChange={handleFilterChange}
                            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Weight Range (KG)</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                name="minWeight"
                                placeholder="Min"
                                value={filters.minWeight}
                                onChange={handleFilterChange}
                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="number"
                                name="maxWeight"
                                placeholder="Max"
                                value={filters.maxWeight}
                                onChange={handleFilterChange}
                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Start Date</label>
                        <DatePicker
                            id="startDate"
                            placeholder="Select Start Date"
                            defaultDate={filters.startDate}
                            onChange={(_dates, dateStr) => {
                                setFilters((prev) => ({
                                    ...prev,
                                    startDate: dateStr,
                                    pagination: { ...prev.pagination, currentPage: 1 },
                                }));
                            }}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">End Date</label>
                        <DatePicker
                            id="endDate"
                            placeholder="Select End Date"
                            defaultDate={filters.endDate}
                            onChange={(_dates, dateStr) => {
                                setFilters((prev) => ({
                                    ...prev,
                                    endDate: dateStr,
                                    pagination: { ...prev.pagination, currentPage: 1 },
                                }));
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="hidden md:block">
                <CommonTable
                    columns={columns}
                    data={reels as unknown as Record<string, unknown>[]}
                    actions={actions}
                    loading={isLoading || isRefreshing}
                    emptyMessage="No reels found."
                    pagination={{
                        currentPage: filters.pagination.currentPage,
                        totalPages: filters.pagination.totalPages,
                        totalCount: filters.pagination.totalCount,
                        limit: filters.pagination.limit,
                        onPageChange: handlePageChange,
                    }}
                />
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 pb-4">
                {reels.map((reel) => {
                    const remaining = reel.remainingWeightKg ?? reel.currentBalanceKg;
                    const total = reel.totalWeightKg;
                    const percentage = Math.min(100, total > 0 ? (remaining / total) * 100 : 0);
                    const vendorName = typeof reel.vendorId === 'object' && reel.vendorId !== null ? (reel.vendorId as any).companyName : 'N/A';

                    return (
                        <div key={reel._id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm transition-all active:scale-[0.98]">
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <GridIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-lg break-all">Roll #{reel.reelNo}</h4>
                                        <div className="flex flex-col">
                                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{reel.quality} • {reel.gsm} GSM</p>
                                            {reel.companyId && typeof reel.companyId === 'object' && (
                                                <p className="text-brand-600 text-[10px] font-bold uppercase">Co: {(reel.companyId as any).companyName}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${reel.status === ReelStatus.ACTIVE ? 'bg-green-100/80 text-green-600 dark:bg-green-900/30' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${reel.status === ReelStatus.ACTIVE ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                    {reel.status}
                                </span>
                            </div>

                            {/* Stock Balance Section (ERP Style) */}
                            <div className="space-y-4 mb-6 pt-4 border-t border-gray-100 dark:border-white/5">
                                <div className="grid grid-cols-2 gap-4 mb-2">
                                    <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                                        <p className="font-black text-gray-900 dark:text-white">{reel.totalWeightKg} <span className="text-[10px] text-gray-400">KG</span></p>
                                    </div>
                                    <div className="p-3 bg-red-50/50 dark:bg-red-500/5 rounded-2xl border border-red-100/50 dark:border-red-500/10">
                                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Used</p>
                                        <p className="font-black text-red-600">{(reel.usedWeightKg || 0).toFixed(1)} <span className="text-[10px] text-red-400">KG</span></p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Remaining Stock</span>
                                            <span className="text-lg font-black text-gray-900 dark:text-white">{(reel.remainingWeightKg ?? reel.currentBalanceKg ?? 0).toFixed(2)} <span className="text-xs text-gray-400">KG</span></span>
                                        </div>
                                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${percentage < 20 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-white/5">
                                        <div
                                            className={`h-full transition-all duration-700 rounded-full ${percentage < 20 ? 'bg-red-500' : percentage < 50 ? 'bg-yellow-500' : 'bg-brand-500'
                                                }`}
                                            style={{ width: `${Math.min(100, percentage)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center p-3 bg-brand-50 dark:bg-brand-500/5 rounded-2xl border border-brand-100 dark:border-brand-500/10 mt-2">
                                    <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Current Value</span>
                                    <span className="text-sm font-black text-brand-600">₹{(reel.stockValue || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                                </div>
                            </div>

                            {/* Info Details Row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400 font-medium mb-6">
                                <div className="flex items-center gap-1.5">
                                    <FilterIcon className="w-4 h-4" />
                                    <span>
                                        <span className="text-blue-600 font-bold">W: {Number(reel.width || 0).toFixed(1)} {reel.sizeUnit}</span>
                                        {' '}•{' '}H: {reel.height} {reel.sizeUnit}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                                    <span className="italic">From:</span>
                                    <span className="text-gray-500 dark:text-gray-300 truncate">{vendorName}</span>
                                </div>
                            </div>

                            {/* Action Buttons Row */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEditReel(reel as any)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm border border-gray-100 dark:border-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <PencilIcon className="w-4 h-4 text-blue-500" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(reel as any)}
                                    className="w-12 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 transition-colors"
                                >
                                    <TrashBinIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Mobile Pagination (Proper) */}
                {filters.pagination && filters.pagination.totalPages > 1 && (
                    <div className="flex flex-col items-center gap-4 pt-6 pb-8 border-t border-gray-100 dark:border-white/5 mt-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                            Page {filters.pagination.currentPage} of {filters.pagination.totalPages}
                        </p>
                        <ReactPaginate
                            pageCount={filters.pagination.totalPages}
                            pageRangeDisplayed={2}
                            marginPagesDisplayed={1}
                            onPageChange={handlePageChange}
                            forcePage={filters.pagination.currentPage - 1}
                            containerClassName="flex items-center gap-2"
                            pageClassName="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 transition-all"
                            activeClassName="!bg-blue-600 !text-white !border-blue-600 shadow-lg shadow-blue-500/30"
                            previousClassName="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            nextClassName="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            previousLabel={<AngleLeftIcon className="w-5 h-5" />}
                            nextLabel={<AngleRightIcon className="w-5 h-5" />}
                            disabledClassName="opacity-30 pointer-events-none"
                            breakClassName="w-10 h-10 flex items-center justify-center text-gray-400"
                        />
                    </div>
                )}
            </div>
        </>
    );
}

export default function ReelManagementList() {
    const navigate = useNavigate();

    const handleAddReel = () => {
        navigate("/reel-management/add");
    };

    return (
        <ReadPermissionGuard resource={Resource.REEL}>
        <>
            <PageMeta
                title="Roll Management | Paper Cutting Service Dashboard"
                description="Manage paper reels stock and inventory"
            />
            <PageBreadcrumb pageTitle="Roll Management" />

            <div className="space-y-6 overflow-hidden">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            Roll Inventory
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Manage your SBS, FBB and Duplex paper reel stock
                        </p>
                    </div>
                    <PermissionGate resource={Resource.REEL} action={Action.CREATE}>
                        <Button onClick={handleAddReel} size="sm">
                            Add New Roll
                        </Button>
                    </PermissionGate>
                </div>

                <ComponentCard title="Roll Stock List">
                    <ReelTable />
                </ComponentCard>
            </div>
        </>
        </ReadPermissionGuard>
    );
}
