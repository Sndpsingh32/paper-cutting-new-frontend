import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import {
    GridIcon,
    BoxCubeIcon,
    ScissorsIcon,
    FilterIcon,
    XCircleIcon
} from "../../icons";
import Badge from "../../components/ui/badge/Badge";
import { getData, postData } from "../../utility/utility";
import DatePicker from "../../components/form/date-picker";
import CommonTable from "../../components/common/CommonTable";
import { Layers } from "lucide-react";

const QUALITY_TYPES = ["SBS", "FBB", "W/B", "G/B"];

const fmt = (n: number) => n?.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) || "0";
const curr = (n: number) => "₹" + fmt(n);

export default function InventorySystem() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [sheets, setSheets] = useState<any[]>([]);
    const [reels, setReels] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [dueSales, setDueSales] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Reset page 1 on filter or tab change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, startDate, endDate]);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const body: any = { page: 1, limit: 100 }; // Backend caps limit at 100

            const [reelsRes, sheetsRes, salesRes, dueRes] = await Promise.all([
                postData("/reels/list", body).catch(() => ({ success: false, data: [] })),
                postData("/sheet/list", body).catch(() => ({ success: false, data: [] })),
                getData("/sale").catch(() => ({ success: false, data: [] })),
                getData("/sale/due-today").catch(() => ({ success: false, data: [] }))
            ]);

            console.log("Reels Response:", reelsRes);
            console.log("Sheets Response:", sheetsRes);

            // Robust Reels Extraction
            if (reelsRes.success) {
                const reelsData = reelsRes.data?.reels || (Array.isArray(reelsRes.data) ? reelsRes.data : []);
                setReels(reelsData);
            }

            // Robust Sheets Extraction
            if (sheetsRes.success) {
                const sheetsData = sheetsRes.data?.sheets || (Array.isArray(sheetsRes.data) ? sheetsRes.data : []);
                setSheets(sheetsData);
            }

            // Robust Due Sales Extraction
            if (dueRes.success) {
                const dueData = Array.isArray(dueRes.data) ? dueRes.data : dueRes.data?.dueSales || [];
                setDueSales(dueData);
            }

            // Robust Sales History Extraction
            if (salesRes.success) {
                let salesData = Array.isArray(salesRes.data) ? salesRes.data : salesRes.data?.sales || [];

                if (startDate || endDate) {
                    salesData = salesData.filter((s: any) => {
                        const d = new Date(s.saleDate || s.createdAt);
                        const start = startDate ? new Date(startDate) : null;
                        const end = endDate ? new Date(endDate) : null;
                        if (end) end.setHours(23, 59, 59, 999);
                        if (start && d < start) return false;
                        if (end && d > end) return false;
                        return true;
                    });
                }
                setSales(salesData);
            }
        } catch (error) {
            console.error("Critical Inventory Error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate]); // Trigger fetch when date changes

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Smart Suggestion Logic ---
    const [suggestQty, setSuggestQty] = useState("");
    const [suggestQuality, setSuggestQuality] = useState("");

    const suggestions = useMemo(() => {
        if (!suggestQty) return null;
        let pool = sheets.filter(s => (s.balanceCount || s.totalWeightKg || 0) > 0);
        if (suggestQuality) pool = pool.filter(s => s.quality === suggestQuality);

        pool = [...pool].sort((a, b) => {
            const percentA = (a.balanceCount || a.totalWeightKg || 0) / 1000;
            const percentB = (b.balanceCount || b.totalWeightKg || 0) / 1000;
            return percentA - percentB;
        });

        let remaining = Number(suggestQty);
        const plan = [];
        for (const sheet of pool) {
            if (remaining <= 0) break;
            const bal = sheet.balanceCount || sheet.totalWeightKg || 0;
            const use = Math.min(remaining, bal);
            plan.push({ sheet, use, finish: use === bal });
            remaining -= use;
        }
        return { plan, shortBy: remaining };
    }, [sheets, suggestQty, suggestQuality]);

    const renderDueAlerts = () => {
        if (dueSales.length === 0) return null;
        return (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl animate-pulse">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-widest mb-3">
                    <span className="flex h-2 w-2 rounded-full bg-red-600"></span>
                    ⚠ Payment Due Today
                </div>
                <div className="space-y-3">
                    {dueSales.map(s => (
                        <div key={s._id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-red-50 dark:border-red-900/10">
                            <div>
                                <div className="font-bold text-gray-900 dark:text-white">{s.customerName}</div>
                                <div className="text-[10px] text-gray-500">{s.customerContact}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-black text-red-600">₹{fmt(s.pendingAmount)}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase">Pending</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderLowStockAlerts = () => {
        const lowReels = reels.filter(r => (r.currentBalanceKg || r.balance || 0) < 200);
        const lowSheets = sheets.filter(s => (s.balanceCount || s.totalWeightKg || 0) < 100);

        if (lowReels.length === 0 && lowSheets.length === 0) return null;

        return (
            <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400 font-black text-xs uppercase tracking-[0.2em] mb-5">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Low Stock Alerts
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lowReels.map(r => (
                        <div key={r._id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-3xl border border-amber-100 dark:border-amber-900/10 shadow-sm group hover:border-amber-300 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                                    <BoxCubeIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors tracking-tight">{r.reelNo}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{r.quality} • {r.gsm} GSM</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-black text-amber-600 text-sm">{fmt(r.currentBalanceKg || r.balance || 0)} <small className="text-[10px] opacity-70">KG</small></div>
                                <div className="text-[8px] text-amber-400 font-black uppercase tracking-[0.1em] mt-0.5">Critical</div>
                            </div>
                        </div>
                    ))}
                    {lowSheets.map(s => (
                        <div key={s._id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-3xl border border-amber-100 dark:border-amber-900/10 shadow-sm group hover:border-amber-300 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                                    <ScissorsIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors tracking-tight">
                                        {s.width && s.height ? `${s.width}x${s.height}` : s.sizes?.[0] ? `${s.sizes[0].width}x${s.sizes[0].height}` : 'N/A'}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.quality} • {s.gsm} GSM</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-black text-amber-600 text-sm">{fmt(s.balanceCount || s.totalWeightKg || 0)} <small className="text-[10px] opacity-70">KG</small></div>
                                <div className="text-[8px] text-amber-400 font-black uppercase tracking-[0.1em] mt-0.5">Low Stock</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const reelColumns = [
        {
            key: "reelNo",
            label: "Roll No",
            render: (value: any) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-900 dark:text-white tracking-tight">{value}</span>
                    <span className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">Roll ID</span>
                </div>
            )
        },
        {
            key: "quality",
            label: "Quality",
            render: (value: any) => (
                <Badge color={value === 'SBS' ? 'warning' : 'info'} size="sm" className="font-semibold">
                    {value}
                </Badge>
            )
        },
        {
            key: "gsm",
            label: "GSM",
            render: (value: any) => (
                <span className="font-semibold text-gray-700 dark:text-gray-300">{value} <small className="text-[10px] text-gray-400 font-normal">GSM</small></span>
            )
        },
        {
            key: "stockValue",
            label: "Stock Value",
            render: (value: any) => <span className="font-bold text-gray-900 dark:text-white">{value ? curr(value) : 'N/A'}</span>
        },
        {
            key: "currentBalanceKg",
            label: "Stock (kg)",
            render: (value: any, row: any) => {
                const bal = value || row.balance || 0;
                const isLow = bal < 200;
                return (
                    <div className="flex flex-col">
                        <span className={`font-bold text-sm ${isLow ? 'text-red-500' : 'text-green-600'}`}>
                            {fmt(bal)} kg
                        </span>
                        <span className={`text-[10px] font-semibold uppercase mt-0.5 tracking-wider inline-flex items-center gap-1 ${isLow ? 'text-red-500' : 'text-green-600'}`}>
                            <span className={`w-1 h-1 rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            {isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                    </div>
                );
            }
        },
        {
            key: "entryDate",
            label: "Entry Date",
            render: (value: any, row: any) => (
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {new Date(value || row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            )
        }
    ];

    const sheetColumns = [
        {
            key: "sheetNo",
            label: "Sheet No / Batch",
            render: (value: any) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-900 dark:text-white tracking-tight">{value || "Manual Lot"}</span>
                    <span className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">Lot ID</span>
                </div>
            )
        },
        {
            key: "reelId",
            label: "From Roll",
            render: (value: any) => {
                if (typeof value === 'object' && value !== null) {
                    return <span className="font-medium text-gray-600 dark:text-gray-400">{value.reelNo || 'N/A'}</span>;
                }
                return <span className="font-medium text-gray-600 dark:text-gray-400">{value || 'N/A'}</span>;
            }
        },
        {
            key: "quality",
            label: "Quality",
            render: (value: any) => (
                <Badge color={value === 'SBS' ? 'warning' : 'info'} size="sm" className="font-semibold">
                    {value}
                </Badge>
            )
        },
        {
            key: "gsm",
            label: "GSM",
            render: (value: any) => (
                <span className="font-semibold text-gray-700 dark:text-gray-300">{value} <small className="text-[10px] text-gray-400 font-normal">GSM</small></span>
            )
        },
        {
            key: "dimensions",
            label: "Dimensions",
            render: (_: any, row: any) => (
                <span className="font-semibold text-gray-900 dark:text-white">
                    {row.width && row.height ? `${row.width}x${row.height}` : (row.sizes?.map((sz: any) => `${sz.width}x${sz.height}`).join(", ") || "N/A")}
                </span>
            )
        },
        {
            key: "currentBalanceKg",
            label: "Stock (kg)",
            render: (value: any, row: any) => {
                const balCount = value || row.balanceCount || row.totalWeightKg || 0;
                const isLow = balCount < 100;
                return (
                    <div className="flex flex-col">
                        <span className={`font-bold text-sm ${isLow ? 'text-red-500' : 'text-green-600'}`}>
                            {fmt(balCount)} kg
                        </span>
                        <span className={`text-[10px] font-semibold uppercase mt-0.5 tracking-wider inline-flex items-center gap-1 ${isLow ? 'text-red-500' : 'text-green-600'}`}>
                            <span className={`w-1 h-1 rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            {isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                    </div>
                );
            }
        }
    ];

    const saleColumns = [
        {
            key: "saleNo",
            label: "Sale Record",
            render: (value: any, row: any) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-900 dark:text-white tracking-tight">{value || 'SR-000'}</span>
                    <span className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">
                        {row.saleDate ? new Date(row.saleDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : "Date N/A"}
                    </span>
                </div>
            )
        },
        {
            key: "customerName",
            label: "Customer",
            render: (value: any, row: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xs">
                        {value?.charAt(0)}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{value}</div>
                        <div className="text-[10px] text-gray-500 font-medium">{row.customerContact}</div>
                    </div>
                </div>
            )
        },
        {
            key: "details",
            label: "Order Details",
            render: (_: any, row: any) => (
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{row.size1}x{row.size2}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">{row.quality}</span>
                        <span className="text-[10px] text-gray-400 font-bold">• {fmt(row.qtySold)} PCS</span>
                    </div>
                </div>
            )
        },
        {
            key: "totalAmount",
            label: "Amount",
            render: (value: any, row: any) => (
                <div className="flex flex-col">
                    <span className="font-bold text-green-600">{curr(value)}</span>
                    <Badge
                        color={row.paymentStatus === 'paid' ? 'success' : row.paymentStatus === 'partial' ? 'warning' : 'error'}
                        size="sm"
                        className="mt-1 w-fit font-medium"
                    >
                        {row.paymentStatus || 'pending'}
                    </Badge>
                </div>
            )
        },
        {
            key: "pendingAmount",
            label: "Outstanding",
            render: (value: any) => {
                const isPending = value > 0;
                return (
                    <div className="flex flex-col">
                        <span className={`font-bold text-sm ${isPending ? 'text-red-500' : 'text-green-600'}`}>
                            {curr(value || 0)}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase mt-0.5 tracking-wider inline-flex items-center gap-1 ${isPending ? 'text-red-500' : 'text-green-600'}`}>
                            <span className={`w-1 h-1 rounded-full ${isPending ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            {isPending ? 'Pending' : 'Settled'}
                        </span>
                    </div>
                );
            }
        }
    ];

    // --- Computed Data for Tables ---
    const filteredReels = useMemo(() => {
        return reels.filter(r => {
            const matchesSearch = r.reelNo?.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;
            const d = new Date(r.entryDate || r.createdAt);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
        });
    }, [reels, searchQuery, startDate, endDate]);

    const filteredSheets = useMemo(() => {
        return sheets.filter(s => {
            const sizeStr = s.width && s.height ? `${s.width}x${s.height}` : s.sizes?.map((sz: any) => `${sz.width}x${sz.height}`).join(" ");
            const matchesSearch = sizeStr?.includes(searchQuery) || s.sheetNo?.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;
            const d = new Date(s.entryDate || s.createdAt || s.purchaseDate);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
        });
    }, [sheets, searchQuery, startDate, endDate]);

    const filteredSales = useMemo(() => {
        return sales.filter(s => s.customerName?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [sales, searchQuery]);

    const paginatedReels = useMemo(() => filteredReels.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredReels, currentPage]);
    const paginatedSheets = useMemo(() => filteredSheets.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredSheets, currentPage]);
    const paginatedSales = useMemo(() => filteredSales.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredSales, currentPage]);

    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <div>
                    {renderDueAlerts()}
                    {renderLowStockAlerts()}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Reels" value={reels.length.toString()} icon={<BoxCubeIcon />} color="text-blue-600" />
                <StatCard title="Sheet Stock" value={`${fmt(sheets.reduce((acc, s) => acc + (s.currentBalanceKg || 0), 0))} kg`} icon={<Layers />} color="text-green-600" />
                <StatCard title="Total Sales" value={curr(sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0))} icon={<GridIcon />} color="text-brand-600" />
                <StatCard
                    title="Low Stock Alert"
                    value={(reels.filter(r => (r.currentBalanceKg || r.balance || 0) < 200).length + sheets.filter(s => (s.balanceCount || s.totalWeightKg || 0) < 100).length).toString()}
                    icon={<FilterIcon />}
                    color="text-amber-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ComponentCard title="Smart Suggestion Engine">
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Required Quantity</label>
                                <input
                                    type="number"
                                    value={suggestQty}
                                    onChange={(e) => setSuggestQty(e.target.value)}
                                    placeholder="e.g. 500"
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quality</label>
                                <select
                                    value={suggestQuality}
                                    onChange={(e) => setSuggestQuality(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                >
                                    <option value="">All Qualities</option>
                                    {QUALITY_TYPES.map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            </div>
                        </div>

                        {suggestions && (
                            <div className="p-4 bg-brand-50/50 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-900/30">
                                <h4 className="text-sm font-bold text-brand-700 dark:text-brand-400 mb-3 flex items-center gap-2">
                                    💡 Optimized Usage Plan
                                </h4>
                                {suggestions.plan.length > 0 ? (
                                    <div className="space-y-2">
                                        {suggestions.plan.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Use <b className="text-gray-900 dark:text-white">{fmt(p.use)}</b> sheets of {p.sheet.sizes?.[0]?.width}x{p.sheet.sizes?.[0]?.height} ({p.sheet.quality})
                                                </span>
                                                {p.finish && <Badge color="success" size="sm">Finish Stock</Badge>}
                                            </div>
                                        ))}
                                        {suggestions.shortBy > 0 && (
                                            <div className="text-red-500 text-xs font-bold mt-2">
                                                ⚠️ Short by {fmt(suggestions.shortBy)} sheets!
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-gray-500 text-sm">No matching stock found.</div>
                                )}
                            </div>
                        )}
                    </div>
                </ComponentCard>

                <ComponentCard title="Recent Transactions">
                    <CommonTable
                        columns={[
                            {
                                key: "customerName",
                                label: "Customer",
                                render: (value: any, row: any) => (
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-gray-900 dark:text-white text-xs tracking-tight">{value}</span>
                                        <span className="text-[9px] text-gray-400 font-medium uppercase mt-0.5">{row.saleNo}</span>
                                    </div>
                                )
                            },
                            {
                                key: "qtySold",
                                label: "Qty",
                                render: (value: any) => <span className="font-bold text-gray-900 dark:text-white text-xs">{fmt(value)}</span>
                            },
                            {
                                key: "totalAmount",
                                label: "Amount",
                                render: (value: any) => <span className="font-bold text-green-600 text-xs">{curr(value)}</span>
                            }
                        ]}
                        data={sales.slice(0, 5) as any}
                        loading={isLoading}
                        emptyMessage="No sales yet"
                        className="min-h-[150px]"
                    />
                </ComponentCard>
            </div>
        </div>
    );

    return (
        <div className="pb-10">
            <PageMeta title="Inventory Intelligence" description="Smart Stock Management" />
            <PageBreadcrumb pageTitle="Inventory Intel" />

            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl w-fit">
                        <TabButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} label="Dashboard" />
                        <TabButton active={activeTab === "reels"} onClick={() => setActiveTab("reels")} label="Reel Stock" />
                        <TabButton active={activeTab === "sheets"} onClick={() => setActiveTab("sheets")} label="Sheet Stock" />
                        <TabButton active={activeTab === "sales"} onClick={() => setActiveTab("sales")} label="Sales History" />
                    </div>
                    {activeTab === "sales" && (
                        <Button onClick={() => navigate("/new-sale")} size="sm">
                            + New Sale
                        </Button>
                    )}
                </div>

                {/* Filter and Search Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5 ml-1">Search Stock</label>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Reel No / Sheet Size..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none group-hover:bg-white dark:group-hover:bg-gray-800"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-1" key={startDate || 'start-empty'}>
                        <DatePicker
                            id="start-date"
                            label="From Date"
                            placeholder="Select start date"
                            defaultDate={startDate}
                            onChange={([date]) => setStartDate(date ? date.toISOString().split('T')[0] : "")}
                        />
                    </div>
                    <div className="md:col-span-1" key={endDate || 'end-empty'}>
                        <DatePicker
                            id="end-date"
                            label="To Date"
                            placeholder="Select end date"
                            defaultDate={endDate}
                            onChange={([date]) => setEndDate(date ? date.toISOString().split('T')[0] : "")}
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <Button
                            variant="primary"
                            className="flex-1 rounded-xl h-11 font-black tracking-wider uppercase text-[10px]"
                            onClick={fetchData}
                        >
                            <FilterIcon className="w-4 h-4 mr-1" /> Apply Filters
                        </Button>
                        {(startDate || endDate || searchQuery) && (
                            <button
                                onClick={() => { setStartDate(""); setEndDate(""); setSearchQuery(""); }}
                                className="h-11 px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                                title="Clear Filters"
                            >
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === "dashboard" && renderDashboard()}
                        {activeTab === "reels" && (
                            <ComponentCard title="Reel Inventory">
                                <CommonTable
                                    columns={reelColumns}
                                    data={paginatedReels as any}
                                    loading={isLoading}
                                    emptyMessage="No reels found in inventory."
                                    pagination={{
                                        currentPage: currentPage,
                                        totalPages: Math.ceil(filteredReels.length / pageSize),
                                        totalCount: filteredReels.length,
                                        limit: pageSize,
                                        onPageChange: (item) => setCurrentPage(item.selected + 1),
                                    }}
                                />
                            </ComponentCard>
                        )}
                        {activeTab === "sheets" && (
                            <ComponentCard title="Sheet Stock">
                                <CommonTable
                                    columns={sheetColumns}
                                    data={paginatedSheets as any}
                                    loading={isLoading}
                                    emptyMessage="No sheets found in inventory."
                                    pagination={{
                                        currentPage: currentPage,
                                        totalPages: Math.ceil(filteredSheets.length / pageSize),
                                        totalCount: filteredSheets.length,
                                        limit: pageSize,
                                        onPageChange: (item) => setCurrentPage(item.selected + 1),
                                    }}
                                />
                            </ComponentCard>
                        )}
                        {activeTab === "sales" && (
                            <ComponentCard title="Sales History">
                                <CommonTable
                                    columns={saleColumns}
                                    data={paginatedSales as any}
                                    loading={isLoading}
                                    emptyMessage="No sales records found."
                                    pagination={{
                                        currentPage: currentPage,
                                        totalPages: Math.ceil(filteredSales.length / pageSize),
                                        totalCount: filteredSales.length,
                                        limit: pageSize,
                                        onPageChange: (item) => setCurrentPage(item.selected + 1),
                                    }}
                                />
                            </ComponentCard>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:translate-y-[-4px] transition-all duration-300">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 ${color}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</p>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</h2>
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${active
                ? "bg-white dark:bg-gray-700 text-brand-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
        >
            {label}
        </button>
    );
}
