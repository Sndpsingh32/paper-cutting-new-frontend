import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Label from "../../../components/form/Label";
import DatePicker from "../../../components/form/date-picker";
import { postData, formatDateToYYYYMMDD, convertUnit } from "../../../utility/utility";
import { calcTotalWeightKgBackendFirst, calcReelStatsBackendFirst } from "../../../utility/calcApi";
import { toast } from "react-toastify";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sheet } from "../../../types/sheet";
import { Reel, SizeUnit } from "../../../types/reel";
import { TrashBinIcon, AngleLeftIcon, AngleRightIcon } from "../../../icons";
import Select from "../../../components/form/Select";
import { Modal } from "../../../components/ui/modal";
import { useCallback, useMemo } from "react";
import { PaperQuality } from "../../../types/reel";
import { Scissors, Info, ArrowUpRight } from "lucide-react";

const SearchIcon = ({ className }: { className?: string }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
    </svg>
);

export default function AddandUpdateSheet() {
    const navigate = useNavigate();
    const location = useLocation();
    const editData = location.state?.sheet as Sheet | undefined;
    const preSelectedReel = location.state?.reel as Reel | undefined;
    const targetWidth = location.state?.targetWidth as number | undefined;
    const targetHeight = location.state?.targetHeight as number | undefined;
    const targetUnit = location.state?.targetUnit as SizeUnit | undefined;
    const targetQty = location.state?.targetQty as number | undefined;
    const targetGsm = location.state?.targetGsm as number | undefined;
    const targetQuality = location.state?.targetQuality as string | undefined;

    const [isLoading, setIsLoading] = useState(false);
    const [reels, setReels] = useState<Reel[]>([]);

    const [formData, setFormData] = useState({
        sheetNo: "",
        reelId: "",
        totalWeightKg: "" as any,
        targetQty: "" as any,
        sizes: [{ width: "" as any, height: "" as any, grain: "No issue" }],
        sizeUnit: SizeUnit.CM,
        entryDate: formatDateToYYYYMMDD(new Date()),
        notes: "",
        clientName: "",
        gsm: "" as any,
        quality: "" as any,
    });

    // ── Smart Requirement Wizard State ────────────────────────────────
    const [req, setReq] = useState({
        quality: targetQuality || "",
        gsm: targetGsm || "",
        width: targetWidth || "",
        height: targetHeight || "",
        targetQty: targetQty || "",
        widthUnit: targetUnit || SizeUnit.CM,
        heightUnit: targetUnit || SizeUnit.CM,
        sheetsPerPacket: "100", // Default to 100 as requested
        totalPackets: ""
    });
    const [showWizard, setShowWizard] = useState(!editData && !preSelectedReel); // Hide wizard if we already have a direct selection
    // ──────────────────────────────────────────────────────────────────

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
    const [reelStatsMap, setReelStatsMap] = useState<Record<string, any>>({});
    const [reelPagination, setReelPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        limit: 10,
    });

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setReelPagination(prev => ({ ...prev, currentPage: 1 }));
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchReels = useCallback(async (page: number = 1, search: string = "") => {
        try {
            const response = await postData("/reels/list", {
                limit: reelPagination.limit,
                page,
                search
            });
            if (response.success) {
                setReels(response.data.reels || []);
                setReelPagination(prev => ({
                    ...prev,
                    totalPages: response.data.pagination?.totalPages || 1,
                    currentPage: response.data.pagination?.currentPage || page,
                }));
            }
        } catch (error) {
            console.error("Error fetching reels:", error);
        }
    }, [reelPagination.limit]);


    useEffect(() => {
        if (isModalOpen) {
            fetchReels(reelPagination.currentPage, debouncedSearch);
        }
    }, [isModalOpen, reelPagination.currentPage, debouncedSearch, fetchReels]);

    useEffect(() => {
        // Initial fetch logic
        fetchReels(1, "");
        if (editData) {
            setFormData({
                sheetNo: editData.sheetNo,
                reelId: typeof editData.reelId === 'string' ? editData.reelId : (editData.reelId as any)?._id || "",
                totalWeightKg: editData.totalWeightKg,
                targetQty: (editData as any).targetQty || "",
                sizes: editData.sizes.length > 0 ? editData.sizes.map((s: any) => ({ ...s, grain: s.grain || "No issue" })) : [{ width: 0, height: 0, grain: "No issue" }],
                sizeUnit: editData.sizeUnit || SizeUnit.CM,
                entryDate: editData.entryDate ? formatDateToYYYYMMDD(new Date(editData.entryDate)) : formatDateToYYYYMMDD(new Date()),
                notes: editData.notes || "",
                clientName: editData.clientName || "",
                gsm: editData.gsm || "",
                quality: editData.quality || "",
            });
            if (editData.reelId && typeof editData.reelId !== 'string') {
                setSelectedReel(editData.reelId as any);
            }
        } else if (preSelectedReel) {
            const initialUnit = targetUnit || preSelectedReel.sizeUnit || SizeUnit.CM;

            // Calculate initial weight using helper
            const stats = getReelStats(preSelectedReel, Number(targetWidth || preSelectedReel.width), Number(targetHeight || 0), Number(targetGsm || preSelectedReel.gsm), initialUnit, initialUnit);
            const initialWeight = (targetQty && stats) ? Number((stats.weightPerSheet * targetQty).toFixed(3)) : preSelectedReel.currentBalanceKg;

            setFormData(prev => ({
                ...prev,
                reelId: preSelectedReel._id,
                sizeUnit: initialUnit,
                totalWeightKg: initialWeight,
                targetQty: targetQty || "",
                sizes: [{
                    width: targetWidth || preSelectedReel.width,
                    height: targetHeight || "" as any,
                    grain: "No issue"
                }]
            }));
            setSelectedReel(preSelectedReel);
            if (targetQty) {
                toast.info(`Pre-filled for ${targetQty} sheets (${initialWeight} Kg)`);
            }
        }
    }, [editData, preSelectedReel]);

    // Real-time weight calculation based on current form inputs
    useEffect(() => {
        if (!selectedReel) return;

        const w = Number(formData.sizes[0]?.width) || 0;
        const h = Number(formData.sizes[0]?.height) || 0;
        const gsm = selectedReel.gsm || 0;
        const qty = Number(formData.targetQty) || 0;
        const unit = formData.sizeUnit || SizeUnit.CM;

        if (w > 0 && h > 0 && gsm > 0 && qty > 0) {
            void calcTotalWeightKgBackendFirst({ width: w, height: h, unit, gsm, sheets: qty, roundingMode: 'admin_ream_ceil' }).then((calc) => {
                const finalW = Number(calc.totalWeightKg || 0);
                setFormData(prev => (Math.abs(Number(prev.totalWeightKg) - finalW) > 0.001 ? { ...prev, totalWeightKg: finalW } : prev));
            });
        }
    }, [formData.sizes, formData.sizeUnit, formData.targetQty, selectedReel]);

    useEffect(() => {
        if (!selectedReel && (formData.reelId || editData)) {
            const reel = formData.reelId ? reels.find(r => r._id === formData.reelId) : null;
            if (reel) {
                setSelectedReel(reel);
            } else if (editData) {
                // If it's a Patti Stock or the reel has been deleted, provide a fallback mock reel
                const isPatti = editData.sheetNo?.includes('STK') || editData.clientName === 'STOCK';
                const parentReelData = typeof editData.reelId === 'object' ? editData.reelId : null;

                setSelectedReel({
                    _id: formData.reelId,
                    reelNo: parentReelData?.reelNo || (isPatti ? `Source Sheet: ${editData.sheetNo}` : "Unknown Roll"),
                    quality: editData.quality || parentReelData?.quality || "Unknown",
                    gsm: editData.gsm || parentReelData?.gsm || 0,
                    width: parentReelData?.width || editData.sizes?.[0]?.width || 0,
                    sizeUnit: editData.sizeUnit || SizeUnit.CM,
                    currentBalanceKg: editData.totalWeightKg,
                    totalWeightKg: editData.totalWeightKg
                } as any);
            }
        }
    }, [reels, formData.reelId, selectedReel, editData]);

    useEffect(() => {
        if (!isModalOpen) {
            setSearchTerm("");
        }
    }, [isModalOpen]);

    // ── Smart Suggestion Logic ──────────────────────────────────────────
    const getReelStatsLocal = (reel: Reel, rWidth: number, rHeight: number, rGsm: number, wUnit: string, hUnit: string) => {
        const toCmVal = (val: number, unit: string) => { if (unit === SizeUnit.MM) return val / 10; if (unit === SizeUnit.INCH) return val * 2.54; return val; };
        const cutW = toCmVal(rWidth, wUnit); const cutH = toCmVal(rHeight, hUnit); const rollW = toCmVal(reel.width, reel.sizeUnit); const gsm = rGsm || reel.gsm;
        const ups1 = Math.floor((rollW + 0.001) / cutW); const ups2 = Math.floor((rollW + 0.001) / cutH);
        const ups = Math.max(ups1, ups2); const bestCutW = (ups1 >= ups2) ? cutW : cutH; const bestCutL = (ups1 >= ups2) ? cutH : cutW;
        if (ups === 0 || gsm === 0) return null;
        const weightPerSheet = (cutW * 0.01 * cutH * 0.01 * gsm) / 1000;
        const availableLengthCm = ((reel.currentBalanceKg * 1000) / ((rollW * 0.01) * gsm)) * 100;
        const sheetsPerPiece = Math.floor(availableLengthCm / bestCutL); const totalSheets = sheetsPerPiece * ups;
        const trimWaste = ((rollW - (bestCutW * ups)) / rollW) * 100;
        const targetQ = Number(req.targetQty) || 0; let stripsUsed = 0, pieceWiseWaste = 0, pieceWiseWastePercentage = 0, safeStrips = ups;
        if (targetQ > 0 && sheetsPerPiece > 0) { if (totalSheets < targetQ) { stripsUsed = ups; pieceWiseWaste = 0; pieceWiseWastePercentage = 0; safeStrips = 0; } else { stripsUsed = Math.ceil(targetQ / sheetsPerPiece); pieceWiseWaste = (stripsUsed * sheetsPerPiece) - targetQ; pieceWiseWastePercentage = (pieceWiseWaste / (stripsUsed * sheetsPerPiece)) * 100; safeStrips = Math.max(0, ups - stripsUsed); } }
        return { ups, totalSheets, sheetsPerPiece, trimWaste, stripsUsed, pieceWiseWaste, pieceWiseWastePercentage, safeStrips, orientation: (ups1 >= ups2) ? 'Normal' : 'Rotated', weightPerSheet };
    };

    const getReelStats = (reel: Reel, rWidth: number, rHeight: number, rGsm: number, wUnit: string, hUnit: string) => {
        const key = JSON.stringify([reel?._id, reel?.width, reel?.sizeUnit, reel?.currentBalanceKg, rWidth, rHeight, rGsm, wUnit, hUnit, req.targetQty || 0]);
        const cached = reelStatsMap[key];
        if (cached) return cached;
        const local = getReelStatsLocal(reel, rWidth, rHeight, rGsm, wUnit, hUnit);
        void calcReelStatsBackendFirst({ reel, rWidth, rHeight, rGsm, rWidthUnit: wUnit, rHeightUnit: hUnit, targetQty: Number(req.targetQty || 0) }).then((remote) => {
            if (!remote) return;
            setReelStatsMap(prev => prev[key] ? prev : { ...prev, [key]: remote });
        });
        return local;
    };

    const handleDownloadPDF = () => {
        if (!selectedReel) {
            toast.error("Please select a reel first");
            return;
        }

        const stats = getReelStats(selectedReel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit);
        if (!stats) {
            toast.error("Could not generate report. Check input values.");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Title & Branding
        doc.setFillColor(37, 99, 235); // brand-600
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("PAPER SHEET TRADE", 15, 20);
        doc.setFontSize(10);
        doc.text("WASTE ANALYSIS & ORDER REPORT", 15, 30);
        doc.text(new Date().toLocaleDateString(), pageWidth - 45, 20);

        // Section: Order Details
        doc.setTextColor(31, 41, 55); // gray-800
        doc.setFontSize(14);
        doc.text("Order Information", 15, 55);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        autoTable(doc, {
            startY: 60,
            head: [['Requirement', 'Details']],
            body: [
                ['Quality', selectedReel.quality || 'N/A'],
                ['Target GSM', `${req.gsm} GSM`],
                ['Sheet Size (Width x Height)', `${req.width} x ${req.height} ${req.widthUnit}`],
                ['Requested Quantity', `${req.targetQty} Sheets`],
                [`Total Lot Capacity`, `${stats.totalSheets.toLocaleString()} Sheets`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [243, 244, 246], textColor: [75, 85, 99], fontStyle: 'bold' }
        });

        // Section: Analysis
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Waste (Nuksaan) Analysis", 15, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Analysis Metric', 'Value', 'Status']],
            body: [
                ['Pieces Per Cut (Ups)', stats.ups.toString(), 'Optimal'],
                ['Total Wasted Sheets', stats.pieceWiseWaste.toString(), stats.pieceWiseWaste > 0 ? 'Warning' : 'Excellent'],
                ['Waste Percentage (%)', `${stats.pieceWiseWastePercentage.toFixed(1)}%`, stats.pieceWiseWastePercentage > 5 ? 'High' : 'Normal'],
                ['Trim Waste (Side Margin)', `${stats.trimWaste.toFixed(1)}%`, 'N/A'],
                ['Safe Strips (Unused)', stats.safeStrips.toString(), 'Ready for Next Order']
            ],
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
            bodyStyles: { fontStyle: 'bold' }
        });

        const lastY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(107, 114, 128); // gray-500
        doc.text("Note: This report is for analysis purpose before production start.", 15, lastY);
        doc.text("Production will begin only after customer approval.", 15, lastY + 5);

        // Footer Branding
        doc.text("Generated by PAPER SHEET TRADE SMART SYSTEM", pageWidth / 2, 285, { align: "center" });

        doc.save(`${selectedReel.reelNo}_Waste_Report.pdf`);
        toast.success("PDF Report Generated successfully!");
    };

    const suggestedReels = useMemo(() => {
        if (!req.quality && !req.gsm && !req.width && !req.height) return [];

        return reels
            .map(reel => {
                let score = 0;
                const stats = (req.width && req.height) ? getReelStats(reel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit) : null;

                // ── REEL SIZE SCORING (PRIORITY): Compare input Reel Size with available reels ────
                if (req.width) {
                    const toCmVal = (val: number, unit: string) => {
                        if (unit === SizeUnit.MM) return val / 10;
                        if (unit === SizeUnit.INCH) return val * 2.54;
                        return val;
                    };
                    const targetRollInCm = toCmVal(Number(req.width), req.widthUnit);
                    const reelInCm = toCmVal(Number(reel.width), reel.sizeUnit);

                    const diff = Math.abs(targetRollInCm - reelInCm);
                    if (diff < 0.1) score += 5000; // Exact match gets huge priority
                    else if (diff <= 2) score += 500; // Close match gets good priority
                    else {
                        score += 50; // Still show it, but at the end
                    }
                }

                // ── GSM FILTER: GSM must match within 5 tolerance ─────────────────
                if (req.gsm) {
                    const targetGsm = Number(req.gsm);
                    const reelGsm = Number(reel.gsm || 0);
                    const gsmDiff = Math.abs(reelGsm - targetGsm);

                    if (reelGsm === targetGsm) score += 500;
                    else if (gsmDiff <= 5) score += 200;
                    else {
                        return { ...reel, score: -1, stats }; // Exclude if gap > 5
                    }
                }

                // ── HARD FILTER: Quality must match if specified ───────────────────
                if (req.quality) {
                    if (reel.quality?.toLowerCase() !== req.quality.toLowerCase()) {
                        return { ...reel, score: -1, stats };
                    }
                    score += 500;
                }

                // ── PRIORITY BONUS: Prefer partially-used (already-cut) reels ─────
                const availableKg = reel.currentBalanceKg ?? 0;
                const totalKg = reel.totalWeightKg ?? 0;
                const isPartiallyUsed = availableKg < totalKg && totalKg > 0;
                if (isPartiallyUsed) {
                    score += 5000; // Force partially used rolls to the front
                }

                if (stats && stats.ups > 0) Math.floor(score += 200 + (stats.ups * 20)); // Yield score
                else if (req.width || req.height) return { ...reel, score: -1, stats, isPartiallyUsed }; // Skip if it doesn't fit width/height

                return { ...reel, score, stats, isPartiallyUsed };
            })
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);
    }, [reels, req]);

    const handleApplyRequirement = (reel: Reel) => {
        const stats = getReelStats(reel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit);
        const targetQ = Number(req.targetQty) || 0;

        // Calculate weight based on target qty if specified, otherwise take full balance

        let estimatedWeight = reel.currentBalanceKg;
        if (targetQ > 0 && stats) {
            // immediate fallback estimate; backend-first calc below will refine
            const weightPerSheetG = (stats.weightPerSheet * 1000);
            const reamWeightK = Math.ceil(weightPerSheetG);
            estimatedWeight = (reamWeightK * targetQ) / 1000;
        }

        setFormData(prev => ({
            ...prev,
            reelId: reel._id,
            totalWeightKg: estimatedWeight,
            sizeUnit: req.heightUnit, // Sheet cutting unit
            targetQty: req.targetQty,
            sizes: [{
                width: Number(req.width),
                height: Number(req.height),
                grain: "No issue"
            }]
        }));
        if (targetQ > 0) {
            void calcTotalWeightKgBackendFirst({ width: Number(req.width), height: Number(req.height), unit: req.widthUnit || 'cm', gsm: Number(req.gsm || reel.gsm || 0), sheets: targetQ, roundingMode: 'admin_ream_ceil' }).then((calc) => {
                setFormData(prev => ({ ...prev, totalWeightKg: Number(calc.totalWeightKg || prev.totalWeightKg || 0) }));
            });
        }
        setSelectedReel(reel);
        toast.info(`Configured for Roll #${reel.reelNo} (${estimatedWeight} Kg planned)`);
    };
    // ──────────────────────────────────────────────────────────────────



    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
        }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSizeChange = (index: number, field: 'width' | 'height' | 'grain', value: string | number) => {
        const newSizes = [...formData.sizes];
        if (field === 'grain') {
            (newSizes[index] as any)[field] = value;
        } else {
            (newSizes[index] as any)[field] = value === "" ? "" : Number(value);
        }
        setFormData(prev => ({ ...prev, sizes: newSizes }));
    };

    const addSizeRow = () => {
        setFormData(prev => ({
            ...prev,
            sizes: [...prev.sizes, { width: selectedReel?.width || "" as any, height: "" as any, grain: "No issue" }]
        }));
    };

    const removeSizeRow = (index: number) => {
        if (formData.sizes.length === 1) return;
        setFormData(prev => ({
            ...prev,
            sizes: prev.sizes.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Frontend Validation
        if (!formData.reelId) {
            toast.error("Please select a source reel");
            return;
        }

        if (!formData.totalWeightKg || formData.totalWeightKg <= 0) {
            toast.error("Total weight cut is required and must be greater than 0");
            return;
        }

        const convertToMm = (val: number, unit: SizeUnit): number => {
            if (!val) return 0;
            switch (unit) {
                case SizeUnit.MM: return val;
                case SizeUnit.CM: return val * 10;
                case SizeUnit.INCH: return val * 25.4;
                default: return Number(val);
            }
        };

        const invalidSize = formData.sizes.find(s => !s.width || s.width <= 0 || !s.height || s.height <= 0);
        if (invalidSize) {
            toast.error("All cut sizes must have a width and height greater than 0");
            return;
        }

        if (selectedReel) {
            const reelWidthMm = convertToMm(selectedReel.width, selectedReel.sizeUnit);
            const oversizedSize = formData.sizes.find(s => {
                const cutWidthMm = convertToMm(s.width, formData.sizeUnit as SizeUnit);
                // Return true if cut is wider than roll (allowing for slight floating point diff with 0.1mm margin)
                return cutWidthMm > (reelWidthMm + 0.1);
            });

            if (oversizedSize) {
                toast.error(`Cut Width (${oversizedSize.width} ${formData.sizeUnit}) is greater than Source Roll Width (${selectedReel.width} ${selectedReel.sizeUnit}). Please check your sizes.`);
                return;
            }
        }

        try {
            setIsLoading(true);
            const { targetQty, ...cleanFormData } = formData;
            const url = editData ? "/sheet/update" : "/sheet/create";
            const payload = editData ? { ...cleanFormData, sheetId: editData._id } : cleanFormData;

            const response = await postData(url, payload);

            if (response.success) {
                toast.success(editData ? "Sheet lot updated successfully!" : "Sheet lot created successfully!");
                navigate("/sheet-management");
            } else {
                toast.error(response.message || "Something went wrong");
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message
                ? (Array.isArray(error.response.data.message) ? error.response.data.message[0] : error.response.data.message)
                : (error.message || "Failed to save sheet lot");
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectReel = (reel: Reel) => {
        setFormData(prev => ({
            ...prev,
            reelId: reel._id,
            sizeUnit: reel.sizeUnit || SizeUnit.CM,
            sizes: prev.sizes.map(size => ({ ...size, width: reel.width }))
        }));
        setSelectedReel(reel);
        setIsModalOpen(false);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= reelPagination.totalPages) {
            setReelPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    return (
        <>
            <PageMeta
                title={editData ? "Update Sheet Lot | Paper Cutting" : "Add New Sheet Lot | Paper Cutting"}
                description="Sheet inventory management"
            />
            <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between py-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 transition-all duration-200 bg-white border border-gray-200 rounded-xl dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md active:scale-95 group shadow-sm shrink-0"
                    >
                        <AngleLeftIcon className="w-5 h-5 text-gray-500 transition-colors group-hover:text-brand-600 dark:text-gray-400 group-hover:scale-110" />
                    </button>
                    <div>
                        <h4 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            {editData ? "Edit Sheet Lot" : "New Sheet Entry"}
                        </h4>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                            {editData ? "Update existing record" : "Create new sheet inventory"}
                        </p>
                    </div>
                </div>
                <div className="hidden sm:block">
                    <PageBreadcrumb pageTitle={editData ? "Update Sheet Lot" : "Add New Sheet Lot"} />
                </div>
            </div>

            {!showWizard && !editData && !selectedReel && !preSelectedReel && (
                <div className="mb-6">
                    <button
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-600 transition-all shadow-lg shadow-brand-200"
                    >
                        <Scissors className="w-4 h-4" />
                        Open Smart Reel Selector
                    </button>
                </div>
            )}

            {showWizard && (
                <div className="mb-8 space-y-6">
                    <div className="bg-white dark:bg-gray-900 border-2 border-brand-100 dark:border-brand-900/40 rounded-[2.5rem] overflow-hidden shadow-xl shadow-brand-500/5">
                        {/* Header */}
                        <div className="bg-brand-500 p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                                    <Scissors className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white leading-tight">Smart Reel Selector</h3>
                                    <p className="text-xs font-bold text-brand-100 uppercase tracking-widest">Identify optimal stock for your cut</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedReel && !editData && (
                                    <button
                                        onClick={() => {
                                            setSelectedReel(null);
                                            setFormData(prev => ({ ...prev, reelId: "" }));
                                            setShowWizard(true);
                                        }}
                                        className="px-4 py-2 bg-white text-brand-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-50 transition-all shadow-lg"
                                    >
                                        Change Selected Roll
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowWizard(false)}
                                    className="text-white/60 hover:text-white transition-colors text-xs font-bold"
                                >
                                    Hide Wizard
                                </button>
                            </div>
                        </div>

                        <div className="p-8">
                            {/* Inputs Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="flex flex-col">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Quality</Label>
                                    <select
                                        className="h-12 w-full rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all shadow-sm"
                                        value={req.quality}
                                        onChange={e => setReq({ ...req, quality: e.target.value })}
                                    >
                                        <option value="">Any Quality</option>
                                        {Object.values(PaperQuality).map(q => <option key={q} value={q}>{q}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Target GSM</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 230"
                                        value={req.gsm}
                                        onChange={e => setReq({ ...req, gsm: e.target.value })}
                                        className="h-12 bg-white dark:bg-gray-800/50 font-bold shadow-sm"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Reel Size</Label>
                                    <div className="flex bg-white dark:bg-gray-800/50 rounded-xl border-2 border-gray-100 dark:border-gray-800 focus-within:border-brand-500 transition-all h-12 overflow-hidden shadow-sm">
                                        <input
                                            type="number"
                                            className="min-w-0 flex-1 bg-transparent px-4 text-sm font-bold outline-none border-none text-gray-900 dark:text-white"
                                            placeholder="Roll Size"
                                            value={req.width}
                                            onChange={e => setReq({ ...req, width: e.target.value })}
                                        />
                                        <div className="bg-gray-50 dark:bg-gray-900 px-3 flex items-center border-l border-gray-100 dark:border-gray-800">
                                            <select
                                                className="bg-transparent text-[11px] font-black uppercase text-brand-600 outline-none cursor-pointer"
                                                value={req.widthUnit}
                                                onChange={e => setReq({ ...req, widthUnit: e.target.value as SizeUnit })}
                                            >
                                                {Object.values(SizeUnit).map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Cutting Size</Label>
                                    <div className="flex bg-white dark:bg-gray-800/50 rounded-xl border-2 border-gray-100 dark:border-gray-800 focus-within:border-brand-500 transition-all h-12 overflow-hidden shadow-sm">
                                        <input
                                            type="number"
                                            className="min-w-0 flex-1 bg-transparent px-4 text-sm font-bold outline-none border-none text-gray-900 dark:text-white"
                                            placeholder="Sheet Size"
                                            value={req.height}
                                            onChange={e => setReq({ ...req, height: e.target.value })}
                                        />
                                        <div className="bg-gray-50 dark:bg-gray-900 px-3 flex items-center border-l border-gray-100 dark:border-gray-800">
                                            <select
                                                className="bg-transparent text-[11px] font-black uppercase text-brand-600 outline-none cursor-pointer"
                                                value={req.heightUnit}
                                                onChange={e => setReq({ ...req, heightUnit: e.target.value as SizeUnit })}
                                            >
                                                {Object.values(SizeUnit).map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Sht/Pkt</Label>
                                    <Input
                                        type="number"
                                        placeholder="100"
                                        value={req.sheetsPerPacket}
                                        onChange={e => {
                                            const spp = Number(e.target.value) || 1;
                                            const totalQ = (Number(req.totalPackets) || 0) * spp;
                                            setReq({ ...req, sheetsPerPacket: e.target.value, targetQty: totalQ > 0 ? totalQ.toString() : req.targetQty });
                                        }}
                                        className="h-12 bg-white dark:bg-gray-800/50 font-bold shadow-sm"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Packets Count</Label>
                                    <Input
                                        type="number"
                                        placeholder="Packets"
                                        value={req.totalPackets}
                                        onChange={e => {
                                            const pkts = Number(e.target.value) || 0;
                                            const totalQ = pkts * (Number(req.sheetsPerPacket) || 100);
                                            setReq({ ...req, totalPackets: e.target.value, targetQty: totalQ > 0 ? totalQ.toString() : "" });
                                        }}
                                        className="h-12 bg-white dark:bg-gray-800/50 font-bold shadow-sm"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Total Sheets</Label>
                                    <Input
                                        type="number"
                                        placeholder="Total Qty"
                                        value={req.targetQty}
                                        onChange={e => {
                                            const qty = Number(e.target.value) || 0;
                                            const pkgSize = Number(req.sheetsPerPacket) || 100;
                                            const pkts = qty / pkgSize;
                                            setReq({ ...req, targetQty: e.target.value, totalPackets: qty > 0 ? (Math.round(pkts * 10) / 10).toString() : "" });
                                        }}
                                        className="h-12 bg-white dark:bg-gray-800/50 font-bold shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Suggestions Area */}
                            {!selectedReel && suggestedReels.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-0.5 flex-1 bg-gray-100 dark:bg-gray-800"></div>
                                        <span className="text-[10px] font-black uppercase text-brand-600 tracking-widest px-3">Best Matches Found</span>
                                        <div className="h-0.5 flex-1 bg-gray-100 dark:bg-gray-800"></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {suggestedReels.map(reel => (
                                            <div
                                                key={reel._id}
                                                className={`group relative border-2 rounded-3xl p-5 hover:shadow-xl hover:shadow-brand-500/10 transition-all cursor-pointer overflow-hidden ${((reel.currentBalanceKg || 0) < (reel.totalWeightKg || 0) && (reel.totalWeightKg || 0) > 0)
                                                    ? 'bg-orange-50/40 dark:bg-orange-900/10 border-orange-300 dark:border-orange-700/50 hover:border-orange-400'
                                                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/50 hover:border-brand-500'
                                                    }`}
                                                onClick={() => handleApplyRequirement(reel)}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="text-[9px] font-black text-brand-600 uppercase tracking-tighter">R# {reel.reelNo}</div>
                                                            {((reel.currentBalanceKg || 0) < (reel.totalWeightKg || 0) && (reel.totalWeightKg || 0) > 0) && (
                                                                <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[8px] font-black rounded uppercase tracking-tight">
                                                                    ⭐ Already In Use
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="text-lg font-black text-gray-900 dark:text-white leading-none">
                                                            {convertUnit(reel.width, reel.sizeUnit || 'cm', req.widthUnit).toFixed(1)} <span className="text-xs font-bold text-gray-400">{req.widthUnit} <span className="text-gray-300">•</span> <span className="font-black text-blue-500">{reel.gsm} GSM</span></span>
                                                            <div className="text-[10px] text-gray-400 mt-1">({reel.width} {reel.sizeUnit})</div>
                                                        </h4>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-all">
                                                        <ArrowUpRight className="w-5 h-5" />
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-tighter">
                                                            <span>Cuts per Width</span>
                                                            <span className="text-gray-900 dark:text-white">{reel.stats?.ups} Pieces</span>
                                                        </div>
                                                        <div className="text-[10px] text-brand-600/60 font-medium">
                                                            {convertUnit(reel.width, reel.sizeUnit || 'cm', req.widthUnit).toFixed(1)}{req.widthUnit} / {req.width}{req.widthUnit} = {reel.stats?.ups}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1 border-t border-gray-50 dark:border-gray-700/50 pt-3 mt-3">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-gray-400 font-bold uppercase tracking-tighter">Yield Breakdown</span>
                                                            <span className="font-black text-green-600 truncate">{reel.stats?.totalSheets.toLocaleString()} Total</span>
                                                        </div>
                                                        <div className="text-[10px] text-green-600/60 font-medium">
                                                            {reel.stats?.sheetsPerPiece.toLocaleString()} Sheets per Piece (Strip)
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Trim Waste</span>
                                                        <span className="font-black text-red-500">{reel.stats?.trimWaste.toFixed(1)}%</span>
                                                    </div>
                                                    {reel.stats && reel.stats.pieceWiseWaste > 0 && (
                                                        <div className="flex flex-col gap-1 p-2 bg-red-50 dark:bg-red-500/5 rounded-lg border border-red-100 dark:border-red-500/20 mt-2">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-red-400 font-bold uppercase tracking-tighter italic">Nuksaan (Waste)</span>
                                                                <span className="font-black text-red-600">{reel.stats.pieceWiseWaste.toLocaleString()} Pcs</span>
                                                            </div>
                                                            <div className="text-[9px] text-red-400 font-bold">
                                                                {reel.stats.pieceWiseWastePercentage.toFixed(1)}% of used pieces
                                                            </div>
                                                        </div>
                                                    )}
                                                    {req.targetQty && reel.stats && reel.stats.totalSheets < Number(req.targetQty) && (
                                                        <div className="flex flex-col gap-1 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-900/30 mt-2">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-orange-600 dark:text-orange-400 font-bold uppercase tracking-tighter italic">Order Shortfall</span>
                                                                <span className="font-black text-orange-700 dark:text-orange-300">{(Number(req.targetQty) - reel.stats.totalSheets).toLocaleString()} Pcs Short</span>
                                                            </div>
                                                            <div className="text-[9px] text-orange-600 dark:text-orange-400 font-semibold leading-tight mt-0.5">
                                                                This roll will exhaust at {reel.stats.totalSheets.toLocaleString()} sheets. You will need to process the remaining {(Number(req.targetQty) - reel.stats.totalSheets).toLocaleString()} sheets from another roll.
                                                            </div>
                                                        </div>
                                                    )}
                                                    {reel.stats && reel.stats.safeStrips > 0 && (
                                                        <div className="flex items-center justify-between text-[10px] text-green-600 font-black uppercase mt-1 px-1">
                                                            <span>Safe Pieces (Strips)</span>
                                                            <span>{reel.stats.safeStrips} Safe</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase">{reel.quality}</span>
                                                    <span className="text-[10px] font-bold text-gray-400">{reel.currentBalanceKg.toFixed(1)} Kg</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {req.targetQty && suggestedReels.length > 0 && (suggestedReels[0]?.stats?.totalSheets || 0) < Number(req.targetQty) && (
                                        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3 text-orange-700">
                                            <Info className="w-5 h-5" />
                                            <p className="text-xs font-bold">
                                                Note: 1 Roll is not enough for {Number(req.targetQty).toLocaleString()} sheets.
                                                You will need {Math.ceil(Number(req.targetQty) / (suggestedReels[0]?.stats?.totalSheets || 1))} rolls of this size.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {selectedReel && req.width && req.height && (
                    <div className="bg-white dark:bg-gray-900 border-2 border-green-500/20 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-500/10 rounded-xl text-green-600">
                                <Info className="w-5 h-5" />
                            </div>
                            <h4 className="font-black text-gray-900 dark:text-white">Production Summary for Roll #{selectedReel.reelNo}</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-gray-400">Total Yield</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">
                                    {getReelStats(selectedReel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit)?.totalSheets.toLocaleString()} Sheets
                                </p>
                                <div className="p-2 bg-brand-50 dark:bg-brand-500/5 rounded-xl border border-brand-100 dark:border-brand-500/20 mt-2">
                                    <p className="text-[10px] font-black text-brand-600 uppercase">Piece-wise Output</p>
                                    <p className="text-sm font-black text-brand-700">
                                        {getReelStats(selectedReel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit)?.sheetsPerPiece.toLocaleString()} pieces
                                        <span className="text-[10px] text-brand-500 font-bold ml-1 uppercase">(from each of the {getReelStats(selectedReel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit)?.ups} strips)</span>
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-[10px] font-black uppercase text-gray-400">Main Cutting Plan</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-black text-brand-600">{req.targetQty || 'All'}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ordered Sheets</span>
                                </div>
                                <div className="text-[10px] text-gray-500 font-bold">
                                    Cutting {getReelStats(selectedReel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit)?.ups} pieces per width
                                </div>
                            </div>

                            {req.targetQty && (getReelStats(selectedReel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit)?.pieceWiseWaste || 0) > 0 && (
                                <div className="space-y-1 p-4 bg-red-50 dark:bg-red-500/5 rounded-2xl border-2 border-red-200 dark:border-red-500/20">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[10px] font-black uppercase text-red-500 tracking-widest">Nuksaan (Waste Summary)</p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleDownloadPDF}
                                                className="px-3 py-1 bg-red-600 text-white text-[9px] font-black rounded-full uppercase flex items-center gap-1 hover:bg-red-700 transition-colors shadow-sm"
                                            >
                                                Download PDF Report
                                            </button>
                                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] font-black rounded-full uppercase">Real Waste</span>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-red-600">{getReelStats(selectedReel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit)?.pieceWiseWaste}</span>
                                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest text-wrap leading-tight">Waste Sheets from {getReelStats(selectedReel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit)?.stripsUsed} active strip(s)</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-red-500 italic mt-2 leading-relaxed">
                                        Suggestion: Only {getReelStats(selectedReel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit)?.pieceWiseWaste} sheets are waste ({getReelStats(selectedReel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit)?.pieceWiseWastePercentage.toFixed(1)}% nuksaan).
                                        Rest {getReelStats(selectedReel, Number(req.width), Number(req.height), Number(req.gsm), req.widthUnit, req.heightUnit)?.safeStrips} full strips are safe.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <ComponentCard title={editData ? "Edit Sheet Details" : "Enter Sheet Details"}>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label>Source Roll <span className="text-red-500">*</span></Label>
                                {(() => {
                                    const activeReel = selectedReel || preSelectedReel;
                                    if (!activeReel) {
                                        return (
                                            <div className="h-11 w-full bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl px-4 flex justify-between items-center opacity-70 cursor-not-allowed">
                                                <span className="text-xs text-gray-400 font-black uppercase tracking-widest italic">Use Smart Selector Above</span>
                                                <Info className="w-4 h-4 text-gray-300 transition-colors" />
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="h-11 bg-gray-50 dark:bg-gray-800/40 px-4 rounded-xl border-2 border-brand-100 dark:border-brand-500/20 flex items-center group overflow-hidden opacity-80 cursor-not-allowed">
                                            <div className="flex flex-col justify-center min-w-0">
                                                <span className="text-sm font-black text-brand-600 dark:text-brand-400 leading-tight truncate">
                                                    {activeReel.reelNo}
                                                </span>
                                                <span className="text-[10px] text-gray-400 uppercase font-black leading-tight tracking-wider">
                                                    {activeReel.quality || "N/A"} • {activeReel.gsm} GSM
                                                </span>
                                            </div>
                                            <div className="ml-auto" title="Selection is managed by the Smart Reel Selector above">
                                                <Info className="w-4 h-4 text-gray-300 shrink-0" />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="space-y-1">
                                <Label>Batch / Sheet Number</Label>
                                <Input
                                    name="sheetNo"
                                    placeholder="Auto-generated if empty"
                                    value={formData.sheetNo}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="flex items-center gap-1.5">
                                    Quantity (Sheets) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    name="targetQty"
                                    type="number"
                                    placeholder="Quantity to cut"
                                    value={formData.targetQty}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="flex items-center gap-1.5">
                                    Total Weight (Kg)
                                    <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-md font-extrabold uppercase">Calculated</span>
                                </Label>
                                <Input
                                    name="totalWeightKg"
                                    type="number"
                                    placeholder="Weight"
                                    value={formData.totalWeightKg}
                                    onChange={handleInputChange}
                                    className="font-black bg-brand-50/10 border-brand-100 text-brand-600"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <DatePicker
                                    id="entryDate"
                                    label="Entry Date"
                                    defaultDate={formData.entryDate}
                                    onChange={(selectedDates) => {
                                        if (selectedDates && selectedDates.length > 0) {
                                            const date = formatDateToYYYYMMDD(selectedDates[0]);
                                            setFormData(prev => ({ ...prev, entryDate: date }));
                                        }
                                    }}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Party / Client</Label>
                                <Input
                                    name="clientName"
                                    type="text"
                                    placeholder="Enter client or party name"
                                    value={formData.clientName}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>GSM</Label>
                                <Input
                                    name="gsm"
                                    type="number"
                                    placeholder="Enter GSM"
                                    value={formData.gsm}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Quality</Label>
                                <select
                                    name="quality"
                                    className="h-11 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 outline-none transition-all"
                                    value={formData.quality}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Select Quality</option>
                                    <option value="SBS">SBS</option>
                                    <option value="FBB">FBB</option>
                                    <option value="Grey Back">Grey Back</option>
                                    <option value="White Back">White Back</option>
                                    <option value="Kraft">Kraft</option>
                                    <option value="Art Paper">Art Paper</option>
                                    <option value="Maplitho">Maplitho</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Cut Sizes (Width x Height)</Label>
                                <div className="flex items-center gap-3">
                                    <div className="w-24">
                                        <Select
                                            options={Object.values(SizeUnit).map(u => ({ label: u, value: u }))}
                                            value={formData.sizeUnit}
                                            onChange={(v) => handleSelectChange("sizeUnit", v)}
                                        />
                                    </div>
                                    {(!editData || (!editData.sheetNo?.includes('STK') && editData.clientName !== 'STOCK')) && (
                                        <Button type="button" size="sm" variant="outline" onClick={addSizeRow}>
                                            Add Size
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {formData.sizes.map((size, index) => (
                                <div key={index} className="flex items-end gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                    <div className="flex-1">
                                        <Label className="text-xs">Sheet Size ({formData.sizeUnit})</Label>
                                        <Input
                                            type="number"
                                            placeholder="Width"
                                            value={size.width}
                                            onChange={(e) => handleSizeChange(index, 'width', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="flex items-center pb-3 text-gray-400">×</div>
                                    <div className="flex-1">
                                        <Label className="text-xs">Sheet Cutting Size ({formData.sizeUnit})</Label>
                                        <Input
                                            type="number"
                                            placeholder="Height"
                                            value={size.height}
                                            onChange={(e) => handleSizeChange(index, 'height', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs">Grain</Label>
                                        <select
                                            className="h-[42px] mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 outline-none transition-all"
                                            value={(size as any).grain || "No issue"}
                                            onChange={(e) => handleSizeChange(index, 'grain', e.target.value)}
                                        >
                                            <option value="No issue">No issue</option>
                                            <option value="As per size">As per size</option>
                                            <option value="Long Grain (LG)">Long Grain (LG)</option>
                                            <option value="Short Grain (SG)">Short Grain (SG)</option>
                                        </select>
                                    </div>
                                    {(!editData || (!editData.sheetNo?.includes('STK') && editData.clientName !== 'STOCK')) && (
                                        <Button
                                            type="button"
                                            variant="danger"
                                            size="sm"
                                            className="mb-0.5 mt-1"
                                            onClick={() => removeSizeRow(index)}
                                            disabled={formData.sizes.length === 1}
                                        >
                                            <TrashBinIcon className="w-5 h-5" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="col-span-full">
                            <Label>Notes</Label>
                            <textarea
                                name="notes"
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white mt-1"
                                rows={3}
                                placeholder="Any specific notes about this batch..."
                                value={formData.notes}
                                onChange={handleTextareaChange}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => navigate("/sheet-management")}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : editData ? "Update Sheet Lot" : "Create Sheet Lot"}
                            </Button>
                        </div>
                    </form>
                </ComponentCard>
            </div>

            {/* Reel Selection Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                className="max-w-xl"
            >
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Select Source Roll</h3>

                    {/* Search Input */}
                    <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            autoFocus
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all"
                            placeholder="Search by reel number or quality..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {reels.length > 0 ? (
                            reels.map((reel) => (
                                <div
                                    key={reel._id}
                                    onClick={() => handleSelectReel(reel)}
                                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex justify-between items-center group
                                        ${formData.reelId === reel._id
                                            ? 'bg-brand-50 border-brand-500 dark:bg-brand-500/10'
                                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-brand-500 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs
                                            ${formData.reelId === reel._id
                                                ? 'bg-brand-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                            }`}
                                        >
                                            RL
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors break-all">
                                                {reel.reelNo}
                                            </h4>
                                            <p className="text-xs text-gray-400 font-medium">
                                                {reel.quality} • {reel.gsm} GSM
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            {reel.currentBalanceKg} KG
                                        </p>
                                        <p className="text-[10px] text-gray-400 uppercase font-medium">Available</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center text-gray-500 font-medium">
                                No active reels found matching your search.
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(reelPagination.currentPage - 1)}
                                disabled={reelPagination.currentPage === 1}
                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <AngleLeftIcon className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                Page {reelPagination.currentPage} of {reelPagination.totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(reelPagination.currentPage + 1)}
                                disabled={reelPagination.currentPage === reelPagination.totalPages}
                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <AngleRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
