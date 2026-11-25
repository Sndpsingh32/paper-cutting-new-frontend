import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import { postData, deleteWithConfirmationpost } from "../../../utility/utility";
import { TrashBinIcon, DownloadIcon } from "../../../icons";
import { exportSheetToCsv, exportSheetsToSeparateCsvs } from "../../../utility/sheetCsvExport";
import CommonTable from "../../../components/common/CommonTable";
import { Sheet, SheetStatus } from "../../../types/sheet";
import moment from "moment";
import { Modal } from "../../../components/ui/modal";
import { toast } from "react-toastify";
import { ShoppingCart } from "lucide-react";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Resource, Action } from "../../../types/permission";
import ReadPermissionGuard from "../../../components/auth/ReadPermissionGuard";
import PermissionGate from "../../../components/common/PermissionGate";
import { usePermissions } from "../../../hooks/usePermissions";
import { filterTableActions } from "../../../utils/filterTableActions";

const EyeIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
);

const PrinterIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.89l-4.47 4.47a.75.75 0 101.06 1.06l4.47-4.47H6.72zm0 0l4.47 4.47a.75.75 0 101.06-1.06l-4.47-4.47h4.47zm10.56 0l4.47 4.47a.75.75 0 101.06-1.06l-4.47-4.47h4.47zm0 0l-4.47 4.47a.75.75 0 10-1.06 1.06l4.47-4.47h-4.47zM18 9V6a3 3 0 00-3-3H9a3 3 0 00-3 3v3h12zm2 2h-1.334l-1.636 4.908A1 1 0 0116.082 17H7.918a1 1 0 01-.948-.656L5.334 11H4a2 2 0 00-2 2v3a2 2 0 002 2h16a2 2 0 002-2v-3a2 2 0 00-2-2z" />
    </svg>
);
function SheetTable() {
    const navigate = useNavigate();
    const { can } = usePermissions();
    const [sheets, setSheets] = useState<Sheet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const hasLoadedOnce = useRef(false);
    const [selectedSheet, setSelectedSheet] = useState<any>(null);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLossModalOpen, setIsLossModalOpen] = useState(false);
    const [lossValue, setLossValue] = useState<number>(0);
    const [filters, setFilters] = useState({
        searchTerm: "",
        debouncedSearchTerm: "",
        activeTab: "active" as "active" | "finished" | "pending" | "stock",
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

    const fetchSheets = useCallback(
        async (page: number = filters.pagination.currentPage) => {
            try {
                if (hasLoadedOnce.current) {
                    setIsRefreshing(true);
                } else {
                    setIsLoading(true);
                }
                const response = await postData("/sheet/list", {
                    page,
                    limit: filters.pagination.limit,
                    search: filters.debouncedSearchTerm,
                    status: filters.activeTab === 'pending' ? SheetStatus.PENDING_APPROVAL : (filters.activeTab === 'stock' ? 'active' : filters.activeTab),
                    clientName: filters.activeTab === 'stock' ? 'STOCK' : undefined
                });
                if (response.success) {
                    hasLoadedOnce.current = true;
                    setSheets(response.data.sheets || []);
                    setFilters((prev) => ({
                        ...prev,
                        pagination: {
                            ...prev.pagination,
                            totalPages: response.data.totalPages || 1,
                            totalCount: response.data.total || 0,
                            currentPage: response.data.page || page,
                        },
                    }));
                }
            } catch (error: unknown) {
                console.error("Error fetching sheets:", error);
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [filters.pagination.limit, filters.debouncedSearchTerm, filters.activeTab]
    );

    useEffect(() => {
        fetchSheets(filters.pagination.currentPage);
    }, [filters.pagination.currentPage, fetchSheets]);

    const handleTabChange = (tab: "active" | "finished" | "pending" | "stock") => {
        hasLoadedOnce.current = false;
        setSelectedRows([]);
        setFilters((prev) => ({
            ...prev,
            activeTab: tab,
            pagination: { ...prev.pagination, currentPage: 1 }
        }));
    };

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

    const clearSearch = () => {
        setFilters((prev) => ({ ...prev, searchTerm: "", debouncedSearchTerm: "" }));
    };

    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLimit = Number(e.target.value);
        setFilters((prev) => ({
            ...prev,
            pagination: { ...prev.pagination, limit: newLimit, currentPage: 1 },
        }));
    };

    const getListParams = () => ({
        limit: 100,
        search: filters.debouncedSearchTerm,
        status: filters.activeTab === 'pending' ? SheetStatus.PENDING_APPROVAL : (filters.activeTab === 'stock' ? 'active' : filters.activeTab),
        clientName: filters.activeTab === 'stock' ? 'STOCK' : undefined,
    });

    const fetchAllSheetsForExport = async (): Promise<Sheet[]> => {
        const listParams = getListParams();
        const firstResponse = await postData("/sheet/list", { page: 1, ...listParams });
        if (!firstResponse.success) {
            throw new Error("Failed to fetch sheet data.");
        }

        const allSheets: Sheet[] = [...(firstResponse.data.sheets || [])];
        const totalPages = firstResponse.data.totalPages || 1;

        for (let page = 2; page <= totalPages; page++) {
            const response = await postData("/sheet/list", { page, ...listParams });
            if (!response.success) {
                throw new Error("Failed to fetch sheet data.");
            }
            allSheets.push(...(response.data.sheets || []));
        }

        return allSheets;
    };

    const handleDownloadAllCsv = async () => {
        try {
            setIsExporting(true);
            const exportSheets = await fetchAllSheetsForExport();
            if (exportSheets.length === 0) {
                toast.info("No sheet data to export.");
                return;
            }
            await exportSheetsToSeparateCsvs(exportSheets as unknown as Record<string, unknown>[]);
            toast.success(`Downloaded ${exportSheets.length} separate CSV file(s).`);
        } catch (error) {
            console.error("Error exporting sheets:", error);
            toast.error("Failed to export sheet data.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadSelectedCsv = async () => {
        const selected = sheets.filter((s) => selectedRows.includes(s._id));
        if (selected.length === 0) {
            toast.info("Select at least one sheet to export.");
            return;
        }
        try {
            setIsExporting(true);
            await exportSheetsToSeparateCsvs(selected as unknown as Record<string, unknown>[]);
            toast.success(`Downloaded ${selected.length} separate CSV file(s).`);
        } catch (error) {
            console.error("Error exporting selected sheets:", error);
            toast.error("Failed to export sheet data.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadSheetCsv = (row: Record<string, unknown>) => {
        exportSheetToCsv(row);
        toast.success(`Downloaded ${String((row as unknown as Sheet).sheetNo)}.csv`);
    };

    const handleViewDetails = (row: Record<string, unknown>) => {
        setSelectedSheet(row);
        setIsModalOpen(true);
    };

    const handleDelete = async (sheet: Record<string, unknown>) => {
        const sheetData = sheet as unknown as Sheet;

        await deleteWithConfirmationpost(
            sheetData.sheetNo,
            `/sheet/delete`,
            { sheetId: sheetData._id },
            () => fetchSheets(filters.pagination.currentPage),
            "Sheet deleted successfully!"
        );
    };

    const handleApprove = async (sheet: any) => {
        try {
            const response = await postData("/sheet/update", {
                sheetId: sheet._id,
                status: SheetStatus.APPROVED
            });
            if (response.success) {
                toast.success("Sheet Lot Approved and Stock Deducted!");
                fetchSheets(filters.pagination.currentPage);
            }
        } catch (error) {
            console.error("Error approving sheet:", error);
        }
    };

    const handleOpenLossModal = (sheet: any) => {
        setSelectedSheet(sheet);
        setLossValue(sheet.machineLoss || 0);
        setIsLossModalOpen(true);
    };

    const handleUpdateLoss = async () => {
        try {
            const response = await postData("/sheet/update", {
                sheetId: selectedSheet._id,
                machineLoss: Number(lossValue)
            });
            if (response.success) {
                toast.success("Machine Loss updated successfully!");
                setIsLossModalOpen(false);
                fetchSheets(filters.pagination.currentPage);
            }
        } catch (error) {
            console.error("Error updating loss:", error);
            toast.error("Failed to update machine loss");
        }
    };

    const handlePrintInvoice = (sale: any, sheet: any) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const date = moment(sale.createdAt).format('DD MMM YYYY');
        const invoiceNo = `INV-${sale._id.toString().slice(-6).toUpperCase()}`;

        // Header
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("PAPER SHEET TRADE", 15, 20);
        doc.setFontSize(10);
        doc.text("TAX INVOICE", 15, 30);

        doc.setFontSize(12);
        doc.text(`Invoice #: ${invoiceNo}`, pageWidth - 15, 20, { align: "right" });
        doc.setFontSize(10);
        doc.text(`Date: ${date}`, pageWidth - 15, 30, { align: "right" });

        // Billed To
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(11);
        doc.text("Billed To:", 15, 50);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(sale.customerName || "Customer", 15, 60);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        let startY = 65;
        if (sale.customerCompany) { doc.text(`Company: ${sale.customerCompany}`, 15, startY); startY += 5; }
        if (sale.customerContact) { doc.text(`Contact: ${sale.customerContact}`, 15, startY); startY += 5; }
        if (sale.customerGst) { doc.text(`GSTIN: ${sale.customerGst}`, 15, startY); startY += 5; }

        // Batch Details
        doc.setFontSize(11);
        doc.text("Cutting Batch:", pageWidth - 15, 50, { align: "right" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(sheet.sheetNo || "", pageWidth - 15, 60, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.text(`Config: ${sheet.quality || ""} - ${sheet.gsm || ""} GSM`, pageWidth - 15, 65, { align: "right" });

        autoTable(doc, {
            startY: 85,
            head: [['Description', 'Size', 'Quantity', 'Weight (Kg)', 'Rate', 'Amount']],
            body: [
                [
                    `${sheet.quality || "Paper"} Board\nBatch #${sheet.sheetNo}`,
                    `${sale.size1 || ''}x${sale.size2 || ''}`,
                    `${sale.qtySold} Pcs`,
                    `${(sale.saleWeightKg || 0).toFixed(2)}`,
                    `Rs. ${(sale.pricePerSheet || 0).toFixed(2)}`,
                    `Rs. ${(sale.totalAmount || 0).toLocaleString()}`
                ]
            ],
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`Total Amount: Rs. ${(sale.totalAmount || 0).toLocaleString()}`, pageWidth - 15, finalY, { align: "right" });

        if (sale.paidAmount > 0) {
            doc.setFontSize(10);
            doc.setTextColor(34, 197, 94); // green
            doc.text(`Amount Paid: Rs. ${(sale.paidAmount || 0).toLocaleString()}`, pageWidth - 15, finalY + 8, { align: "right" });

            doc.setTextColor(239, 68, 68); // red
            doc.text(`Balance Due: Rs. ${(sale.pendingAmount || 0).toLocaleString()}`, pageWidth - 15, finalY + 16, { align: "right" });
        }

        doc.setTextColor(107, 114, 128);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Computer generated invoice. No signature required.", pageWidth / 2, 280, { align: "center" });

        doc.save(`${invoiceNo}_${sale.customerName}.pdf`);
        toast.success("PDF Invoice Downloaded Successfully!");
    };

    const baseColumns = [
        {
            key: "selection",
            label: "",
            render: (_: any, row: any) => (
                <input
                    type="checkbox"
                    checked={selectedRows.includes(row._id)}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setSelectedRows(prev => [...prev, row._id]);
                        } else {
                            setSelectedRows(prev => prev.filter(id => id !== row._id));
                        }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
            )
        },
        {
            key: "sheetNo",
            label: "Sheet No / Batch",
            render: (value: unknown) => <span className="font-medium text-gray-900 dark:text-white">{String(value)}</span>
        },
        {
            key: "clientName",
            label: "Party / Client",
            render: (value: unknown) => {
                const name = String(value || 'STOCK');
                const isStock = name === 'STOCK';
                return (
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${isStock ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit' : 'text-indigo-600'}`}>
                            {name}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                            {isStock ? 'Available Stock' : 'Production Intended'}
                        </span>
                    </div>
                );
            }
        },
        {
            key: "reelId",
            label: "Roll No",
            render: (value: unknown) => {
                if (typeof value === 'object' && value !== null) {
                    return (value as any).reelNo || 'N/A';
                }
                return 'N/A';
            }
        },
        {
            key: "quality",
            label: "Quality",
            render: (value: unknown) => (
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-semibold dark:bg-green-900/30 dark:text-green-400">
                    {String(value)}
                </span>
            )
        },
        {
            key: "gsm",
            label: "GSM",
        },

        {
            key: "sizes",
            label: "Cut Dimensions",
            render: (_value: unknown, row: Record<string, unknown>) => {
                const sheet = row as any;
                const unit = sheet.sizeUnit || 'cm';
                const items = sheet.items || [];

                if (items.length > 0) {
                    return (
                        <div className="flex flex-col gap-1 py-1">
                            {items.map((it: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                                        {Math.round(it.reelSize * 100) / 100} × {Math.round(it.cutSize * 100) / 100} <span className="text-[10px] text-gray-400 font-medium lowercase">{unit}</span>
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded text-[9px] font-black uppercase">
                                        {it.qtySold || it.sheets || 0} Pcs
                                    </span>
                                </div>
                            ))}
                        </div>
                    );
                }

                const sizes = (sheet.sizes || []) as any[];
                return (
                    <div className="flex flex-col gap-1 py-1">
                        {sizes.map((s: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                                    {Math.round(s.width * 100) / 100} × {Math.round(s.height * 100) / 100} <span className="text-[10px] text-gray-400 font-medium lowercase">{unit}</span>
                                </span>
                                {idx === 0 && (sheet.targetQty || 0) > 0 && (
                                    <span className="px-1.5 py-0.5 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded text-[9px] font-black uppercase">
                                        {sheet.targetQty} Pcs
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                );
            }
        },
        {
            key: "targetQty",
            label: "Total Sheets",
            render: (value: unknown, row: Record<string, unknown>) => {
                const sheet = row as any;
                let total = Number(sheet.totalQty || value) || 0;

                if (sheet.items && Array.isArray(sheet.items)) {
                    const itemsTotal = sheet.items.reduce((acc: number, it: any) => acc + (Number(it.qtySold) || 0), 0);
                    if (itemsTotal > 0) total = itemsTotal;
                }
                const isStock = sheet.clientName === 'STOCK' || sheet.clientName === 'Fresh Stock';

                return (
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-black ${isStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                {total.toLocaleString()} <span className="text-[10px] opacity-60 uppercase">Pcs</span>
                            </span>
                            {sheet.productionMode && (
                                <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase ${isStock ? 'bg-emerald-100 text-emerald-700' :
                                    sheet.productionMode === 'Full' ? 'bg-indigo-100 text-indigo-700' :
                                        sheet.productionMode === 'Skip' ? 'bg-red-100 text-red-700' :
                                            'bg-blue-100 text-blue-700'
                                    }`}>
                                    {isStock ? 'Stock' : sheet.productionMode}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col">
                            {sheet.targetQty > 0 && filters.activeTab !== 'finished' && (
                                <span className="text-[9px] font-bold text-gray-400">
                                    {isStock ? 'Original Req:' : 'Req:'} {sheet.targetQty.toLocaleString()}
                                </span>
                            )}

                            {isStock ? (
                                <span className="text-[9px] font-black text-emerald-500 uppercase mt-0.5">
                                    +{(total).toLocaleString()} Extra Produced
                                </span>
                            ) : (
                                total > (sheet.targetQty || 0) && (
                                    <span className={`text-[9px] font-black ${sheet.productionMode === 'Full' ? 'text-indigo-500' : 'text-amber-500'}`}>
                                        +{(total - (sheet.targetQty || 0)).toLocaleString()} Extra
                                    </span>
                                )
                            )}

                            {sheet.potentialQty > total && !isStock && filters.activeTab !== 'finished' && (
                                <div className="flex flex-col mt-0.5">
                                    <span className="text-[9px] font-bold text-gray-500 italic">
                                        (Possible: {sheet.potentialQty.toLocaleString()} Pcs)
                                    </span>
                                    {sheet.productionMode === 'Fixed' && (
                                        <span className="text-[9px] font-black text-emerald-500 uppercase">
                                            Remaining: {(sheet.potentialQty - total).toLocaleString()} Pcs
                                        </span>
                                    )}
                                </div>
                            )}

                            {isStock && sheet.potentialQty > 0 && (
                                <span className="text-[9px] font-bold text-gray-500 italic">
                                    (Part of {sheet.potentialQty.toLocaleString()} Strip)
                                </span>
                            )}
                        </div>
                        {sheet.machineLoss > 0 && filters.activeTab !== 'finished' && (
                            <span className="text-[10px] font-bold text-red-500">
                                -{sheet.machineLoss} loss = {total - sheet.machineLoss} net
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            key: "status",
            label: "Status",
            render: (value: unknown) => {
                const status = value as SheetStatus || SheetStatus.APPROVED;
                let colorClass = "bg-green-100 text-green-700";
                let text = "Approved";

                if (status === SheetStatus.PENDING_APPROVAL) {
                    colorClass = "bg-orange-100 text-orange-700 animate-pulse";
                    text = "Pending Approval";
                } else if (status === SheetStatus.REJECTED) {
                    colorClass = "bg-red-100 text-red-700";
                    text = "Rejected";
                }

                return (
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${colorClass}`}>
                        {text}
                    </span>
                );
            }
        },
        {
            key: "totalWeightKg",
            label: "Weight (kg)",
            render: (_value: unknown, row: Record<string, unknown>) => {
                const sheet = row as any;
                const unit = (sheet.sizeUnit || 'cm').toLowerCase();

                const size = sheet.sizes?.[0] || (sheet.items?.[0] ? { width: sheet.items[0].reelSize, height: sheet.items[0].cutSize } : null);

                let lossWeight = 0;
                if (size && sheet.machineLoss > 0) {
                    let effectiveUnit = unit;
                    // Auto-detect unit mismatch for legacy data
                    if (unit === 'cm' && (size.width > 150 || size.height > 150)) {
                        effectiveUnit = 'mm';
                    }

                    let mf = 0.01;
                    if (effectiveUnit === 'mm') mf = 0.001;
                    else if (effectiveUnit === 'inch' || effectiveUnit === 'in') mf = 0.0254;

                    lossWeight = (size.width * mf * size.height * mf * sheet.gsm * sheet.machineLoss) / 1000;
                }

                return (
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 dark:text-white">
                                {Number(sheet.currentBalanceKg || 0).toFixed(2)} / {Number(sheet.totalWeightKg || 0).toFixed(2)} kg
                            </span>
                        </div>
                        {lossWeight > 0 && filters.activeTab !== 'finished' && (
                            <span className="text-[10px] text-red-500 font-bold uppercase">
                                -{lossWeight.toFixed(2)} kg machine loss
                            </span>
                        )}
                        {filters.activeTab === 'finished' ? (
                            <span className="text-[10px] text-red-500 font-bold uppercase">Fully Sold</span>
                        ) : (
                            sheet.currentBalanceKg < (sheet.totalWeightKg - lossWeight - 0.1) && (
                                <span className="text-[10px] text-orange-500 font-bold uppercase">Partially Sold</span>
                            )
                        )}
                    </div>
                );
            }
        },
        {
            key: "entryDate",
            label: "Cut Date",
            render: (value: unknown) => value ? moment(String(value)).format("DD-MM-YYYY") : "N/A"
        },
        {
            key: "machineLoss",
            label: "Loss",
            render: (value: unknown, row: any) => (
                <div className="flex flex-col items-center">
                    <span className={`font-bold ${Number(value) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {Number(value) || 0}
                    </span>
                    {filters.activeTab !== 'pending' && (
                        <button
                            onClick={() => handleOpenLossModal(row)}
                            className="text-[10px] text-brand-600 font-bold hover:underline"
                        >
                            Edit Loss
                        </button>
                    )}
                </div>
            )
        }
    ];

    const salesColumn = {
        key: "sheetSales",
        label: "Sale Details",
        render: (_value: unknown, row: Record<string, unknown>) => {
            const sales = row.sheetSales as any[];
            if (!sales || sales.length === 0) return <span className="text-gray-400 text-[10px] italic font-medium uppercase tracking-tight">Available</span>;

            return (
                <div className="flex flex-col gap-1.5 min-w-[180px] py-1">
                    {sales.map((s: any, i: number) => (
                        <div key={i} className="bg-white dark:bg-gray-800/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase truncate max-w-[110px]">
                                        {s.customerName || 'Retail Customer'}
                                    </span>
                                    {s.customerContact && (
                                        <span className="text-[9px] font-bold text-gray-500">{s.customerContact}</span>
                                    )}
                                    {s.customerGst && (
                                        <span className="text-[8px] font-medium text-gray-400 uppercase tracking-tighter">GST: {s.customerGst}</span>
                                    )}
                                </div>
                                <span className="text-[9px] font-bold text-gray-400">
                                    {moment(s.saleDate).format('DD MMM')}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{s.qtySold?.toLocaleString()} SHT</span>
                                <span className="text-[10px] font-black text-gray-900 dark:text-white">₹{Number(s.totalAmount || 0).toLocaleString()}</span>
                            </div>

                            <div className="flex flex-wrap gap-1 mt-1">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${s.pendingAmount <= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {s.pendingAmount <= 1 ? 'Paid' : `Due: ₹${Number(s.pendingAmount).toLocaleString()}`}
                                </span>
                                {s.billNo && (
                                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-[8px] font-black uppercase">
                                        #{s.billNo.split('-')[1]?.slice(-4) || s.billNo}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
    };

    const stockColumns = [
        {
            key: "selection",
            label: "",
            render: (_: any, row: any) => (
                <input
                    type="checkbox"
                    checked={selectedRows.includes(row._id)}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setSelectedRows(prev => [...prev, row._id]);
                        } else {
                            setSelectedRows(prev => prev.filter(id => id !== row._id));
                        }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
            )
        },
        {
            key: "sizes",
            label: "Strip Width (Inch)",
            render: (_value: unknown, row: Record<string, unknown>) => {
                const sheet = row as any;
                const unit = (sheet.sizeUnit || 'mm').toLowerCase();
                const sizes = (sheet.sizes || []) as any[];
                return (
                    <div className="flex flex-col gap-1 py-1">
                        {sizes.map((s: any, idx: number) => {
                            let widthInInch = s.width;
                            if (unit === 'mm') widthInInch = s.width / 25.4;
                            else if (unit === 'cm') widthInInch = s.width / 2.54;

                            return (
                                <span key={idx} className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                    {widthInInch.toFixed(2)} <span className="text-[10px] text-gray-400 font-medium lowercase">inch</span>
                                </span>
                            );
                        })}
                    </div>
                );
            }
        },
        {
            key: "gsm",
            label: "GSM",
            render: (value: unknown) => <span className="font-bold text-gray-900 dark:text-white">{String(value)}</span>
        },
        {
            key: "totalWeightKg",
            label: "Weight (kg)",
            render: (_value: unknown, row: any) => (
                <div className="flex flex-col">
                    <span className="text-sm font-black text-indigo-600">
                        {Number(row.currentBalanceKg || 0).toFixed(2)} kg
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase italic">Stock Balance</span>
                </div>
            )
        },
        {
            key: "sheetNo",
            label: "Sheet No / Batch",
            render: (value: unknown) => <span className="font-medium text-gray-900 dark:text-white">{String(value)}</span>
        },
        {
            key: "reelId",
            label: "Roll No",
            render: (value: unknown) => {
                if (typeof value === 'object' && value !== null) {
                    return (value as any).reelNo || 'N/A';
                }
                return 'N/A';
            }
        },
        {
            key: "quality",
            label: "Quality",
            render: (value: unknown) => (
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-semibold dark:bg-green-900/30 dark:text-green-400">
                    {String(value)}
                </span>
            )
        },
    ];

    const rawColumns = filters.activeTab === 'finished'
        ? [...baseColumns.slice(0, 6), salesColumn, ...baseColumns.slice(6)]
        : (filters.activeTab === 'stock' ? stockColumns : baseColumns);

    const columns = rawColumns.filter(col => col.key !== 'selection' || (filters.activeTab !== 'finished' && filters.activeTab !== 'stock' && filters.activeTab !== 'pending'));

    const actions = filterTableActions(
        [
            {
                label: "Download CSV",
                onClick: handleDownloadSheetCsv,
                variant: "outline" as const,
                icon: <DownloadIcon className="w-4 h-4" />,
                permission: { resource: Resource.SHEET, action: Action.EXPORT },
            },
            {
                label: "View Details",
                onClick: handleViewDetails,
                variant: "success" as const,
                icon: <EyeIcon className="w-4 h-4" />,
                permission: { resource: Resource.SHEET, action: Action.READ },
            },
            {
                label: "Print Bill",
                onClick: (row: any) => {
                    const sales = row.sheetSales || [];
                    if (sales.length === 0) {
                        alert("No sales recorded for this batch yet.");
                    } else if (sales.length === 1) {
                        handlePrintInvoice(sales[0], row);
                    } else {
                        handleViewDetails(row);
                    }
                },
                variant: "primary" as const,
                icon: <PrinterIcon className="w-4 h-4" />,
                hidden: (row: any) => !(row.sheetSales && row.sheetSales.length > 0),
                permission: { resource: Resource.SHEET, action: Action.READ },
            },
            {
                label: "Approve Stock",
                onClick: handleApprove,
                variant: "success" as const,
                icon: <PrinterIcon className="w-4 h-4 rotate-180" />,
                hidden: (row: any) => row.status !== SheetStatus.PENDING_APPROVAL,
                permission: { resource: Resource.SHEET, action: Action.VERIFY },
            },
            {
                label: "Delete",
                onClick: handleDelete,
                variant: "danger" as const,
                icon: <TrashBinIcon className="w-4 h-4" />,
                permission: { resource: Resource.SHEET, action: Action.DELETE },
            },
        ],
        can,
    );

    return (
        <>
            {/* Custom Headers/Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6 space-x-8">
                <button
                    onClick={() => handleTabChange('active')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors ${filters.activeTab === 'active' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    In-Stock Sheet Lots
                </button>
                <button
                    onClick={() => handleTabChange('stock')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors ${filters.activeTab === 'stock' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Ready Strip Stock (Patti Stock)
                </button>
                <button
                    onClick={() => handleTabChange('finished')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors ${filters.activeTab === 'finished' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Sold / Completed Sheet Lots
                </button>
                <button
                    onClick={() => handleTabChange('pending')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors ${filters.activeTab === 'pending' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Quotations (Pending Approval)
                </button>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                <div className="w-full sm:max-w-md flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-900 dark:border-gray-700 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Search by Sheet No or Party Name..."
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
                    {selectedRows.length > 0 && filters.activeTab !== 'finished' && filters.activeTab !== 'stock' && filters.activeTab !== 'pending' && (
                        <PermissionGate resource={Resource.SHEET} action={Action.CREATE}>
                            <button
                                onClick={() => {
                                    const selectedData = sheets.filter(s => selectedRows.includes(s._id));
                                    navigate('/consolidated-sale', { state: { selectedSheets: selectedData } });
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-black uppercase hover:bg-indigo-700 transition-all shadow-lg animate-in slide-in-from-left duration-200"
                            >
                                <ShoppingCart className="w-4 h-4" />
                                Create Bill ({selectedRows.length})
                            </button>
                        </PermissionGate>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {selectedRows.length > 0 && (
                        <PermissionGate resource={Resource.SHEET} action={Action.EXPORT}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadSelectedCsv}
                                disabled={isExporting}
                                startIcon={<DownloadIcon className="w-4 h-4" />}
                            >
                                {isExporting ? "Exporting..." : `Download Selected (${selectedRows.length})`}
                            </Button>
                        </PermissionGate>
                    )}
                    <PermissionGate resource={Resource.SHEET} action={Action.EXPORT}>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadAllCsv}
                            disabled={isExporting || isLoading}
                            startIcon={<DownloadIcon className="w-4 h-4" />}
                        >
                            {isExporting ? "Exporting..." : "Download All CSV"}
                        </Button>
                    </PermissionGate>
                    <label htmlFor="itemsPerPage" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Show:</label>
                    <select
                        id="itemsPerPage"
                        value={filters.pagination.limit}
                        onChange={handleLimitChange}
                        className="block w-20 pl-3 py-2 text-base border border-gray-300 dark:bg-gray-900 dark:border-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">entries</span>
                </div>
            </div>

            <CommonTable
                columns={columns}
                data={sheets as unknown as Record<string, unknown>[]}
                actions={actions}
                loading={isLoading || isRefreshing}
                emptyMessage="No sheets found."
                pagination={{
                    currentPage: filters.pagination.currentPage,
                    totalPages: filters.pagination.totalPages,
                    totalCount: filters.pagination.totalCount,
                    limit: filters.pagination.limit,
                    onPageChange: handlePageChange,
                }}
            />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-3xl">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sale Detail History</h3>
                            <p className="text-sm text-gray-500">Lot: <span className="font-bold text-brand-600">{selectedSheet?.sheetNo}</span></p>
                        </div>
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-black uppercase tracking-wider">
                            Full Sale Report
                        </div>
                    </div>

                    {!selectedSheet?.sheetSales || selectedSheet.sheetSales.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <p className="text-gray-500">No sale records found for this lot.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {selectedSheet.sheetSales.map((sale: any, idx: number) => (
                                <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden">
                                    <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-bold">
                                                {sale.customerName?.charAt(0) || 'C'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white">{sale.customerName}</h4>
                                                <p className="text-[10px] text-gray-500">{moment(sale.saleDate).format('DD MMMM YYYY - hh:mm A')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Quantity</span>
                                            <p className="text-lg font-black text-brand-600 leading-none">{sale.qtySold} <span className="text-xs font-normal">sheets</span></p>
                                        </div>
                                    </div>
                                    <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase">Weight Sold</label>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{Number(sale.saleWeightKg || 0).toFixed(2)} kg</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase">Rate (Per Kg)</label>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">₹{Number(sale.pricePerKg || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#0084C1]">Total Amount</label>
                                            <p className="text-base font-black text-[#0084C1]">₹{Number(sale.totalAmount || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-red-400 uppercase">Pending</label>
                                            <p className="text-base font-black text-red-500">₹{Number(sale.pendingAmount || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="px-5 py-3 bg-blue-50/30 dark:bg-blue-900/10 border-t border-blue-50/50 dark:border-blue-900/20 flex justify-between items-center text-[11px]">
                                        <div className="flex items-center gap-4">
                                            <span className="text-gray-500 font-medium italic">Payment status will update in Sales ledger</span>
                                            <button
                                                onClick={() => handlePrintInvoice(sale, selectedSheet)}
                                                className="flex items-center gap-2 px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-black uppercase tracking-widest transition-all shadow-sm shadow-brand-500/20"
                                            >
                                                <PrinterIcon className="w-3.5 h-3.5" />
                                                Generate Bill
                                            </button>
                                        </div>
                                        <span className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-800 rounded text-blue-600 font-bold uppercase">
                                            {sale.pendingAmount > 0 ? 'Partial / Pending' : 'Paid'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 flex justify-end">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="px-8">
                            Close Report
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Machine Loss Modal */}
            <Modal isOpen={isLossModalOpen} onClose={() => setIsLossModalOpen(false)} className="max-w-md">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Update Machine Loss</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Enter the number of sheets damaged or wasted during the cutting process for lot <span className="font-bold text-brand-600">{selectedSheet?.sheetNo}</span>.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Damaged Sheets (Loss)
                            </label>
                            <input
                                type="number"
                                value={lossValue}
                                onChange={(e) => setLossValue(Number(e.target.value))}
                                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white font-bold text-lg"
                                placeholder="0"
                            />
                        </div>

                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-orange-700 dark:text-orange-400 font-medium">Original Sheets:</span>
                                <span className="font-bold text-orange-900 dark:text-orange-200">
                                    {(selectedSheet?.targetQty || selectedSheet?.items?.reduce((acc: number, it: any) => acc + (Number(it.qtySold) || 0), 0) || 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-orange-200 dark:border-orange-800">
                                <span className="text-brand-700 dark:text-brand-400 font-bold">Net Usable Sheets:</span>
                                <span className="font-black text-brand-900 dark:text-brand-100">
                                    {((selectedSheet?.targetQty || selectedSheet?.items?.reduce((acc: number, it: any) => acc + (Number(it.qtySold) || 0), 0) || 0) - lossValue).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <Button variant="outline" onClick={() => setIsLossModalOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateLoss} className="flex-1">
                            Save Loss
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export default function SheetManagementList() {

    return (
        <ReadPermissionGuard resource={Resource.SHEET}>
        <>
            <PageMeta
                title="Sheet Management | Paper Cutting Service Dashboard"
                description="Manage paper sheets cut from reels"
            />
            <PageBreadcrumb pageTitle="Sheet Management" />

            <div className="space-y-6 overflow-hidden">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            Sheet Inventory (Lot Wise)
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Track sheets cut from active paper reels
                        </p>
                    </div>

                </div>

                <ComponentCard title="Sheet Stock List">
                    <SheetTable />
                </ComponentCard>
            </div>
        </>
        </ReadPermissionGuard>
    );
}
