import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import ComponentCard from '../../components/common/ComponentCard';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import Loader from '../../components/common/Loader';
import { postData, formatDateToYYYYMMDD, toCm, convertUnit, toMeter } from "../../utility/utility";
import { calcTotalWeightKgBackendFirst, calcSheetsFromWeightBackendFirst, calcReelStatsBackendFirst } from "../../utility/calcApi";
import { Modal } from '../../components/ui/modal';
import DatePicker from '../../components/form/date-picker';
import {
    AngleLeftIcon,
    AngleRightIcon,
    UserIcon,
    FileIcon
} from '../../icons';
import { Layers } from 'lucide-react';
import { PaperQuality, SizeUnit } from '../../types/reel';

interface SuggestionReq {
    width: number | '';
    height: number | '';
    widthUnit: string;
    heightUnit: string;
    gsm: number | '';
    quality: string;
    kg: number | '';
    targetQty: number | '';
    sheetsPerPacket: string;
    totalPackets: string;
    grain: string;
}

interface SuggestedSheet {
    _id: string;
    sheetNo: string;
    quality: string;
    gsm: number;
    sizeUnit: string;
    sizes: { width: number; height: number; grain?: string }[];
    bestSize: { width: number; height: number; grain?: string };
    wastePercent: number;
    availableKg: number;
    estimatedQty: number;
    score: number;
    reasons: string[];
    currentBalanceKg: number;
    totalWeightKg: number;
}

interface SuggestedReel {
    _id: string;
    reelNo: string;
    quality: string;
    gsm: number;
    width: number;
    sizeUnit: string;
    upsPerWidth: number;
    estimatedSheets: number;
    availableKg: number;
    score: number;
    reasons: string[];
    purchasePricePerKg: number;
    currentBalanceKg: number;
    totalWeightKg: number;
    isPartiallyUsed?: boolean;
    detectedGrain?: string;
    stats?: {
        ups: number;
        totalSheets: number;
        sheetsPerPiece: number;
        trimWaste: number;
        stripsUsed: number;
        pieceWiseWaste: number;
        pieceWiseWastePercentage: number;
        safeStrips: number;
        orientation: string;
        weightPerSheet: number;
        detectedGrain?: string;
    };
}

interface SaleFormData {
    saleDate: string;
    customerName: string;
    customerContact: string;
    customerEmail?: string;
    customerGender?: 'male' | 'female' | 'other';
    customerDob?: string;
    customerId?: string;
    customerCompany?: string;
    customerGst?: string;
    contactPerson?: string;
    customerType: 'walk-in' | 'registered';
    sheetId: string;
    reqWidth: number;
    reqHeight: number;
    sizeUnit: string;
    qtySold: number;
    pricePerKg: number;
    totalAmount: number;
    notes: string;
    targetGsm?: number | '';
    targetQuality?: string;
    targetWeight?: number | '';
    paidAmount: number;
    pendingAmount: number;
    paymentDueDate?: string;
    paymentStatus: 'pending' | 'partial' | 'paid';
}

const fmt = (n: number) => n?.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) || "0";

const NewSale: React.FC = () => {
    const navigate = useNavigate();
    const [sheets, setSheets] = useState<any[]>([]);
    const [reels, setReels] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isReelModalOpen, setIsReelModalOpen] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');

    // ── Suggestion Engine State ──────────────────────────────────────────
    const [suggReq, setSuggReq] = useState<SuggestionReq>({
        width: '',
        height: '',
        widthUnit: SizeUnit.CM,
        heightUnit: SizeUnit.CM,
        gsm: '',
        quality: '',
        kg: '',
        targetQty: '',
        sheetsPerPacket: '100',
        totalPackets: '',
        grain: 'all'
    });
    const [suggestions, setSuggestions] = useState<{ sheets: SuggestedSheet[]; reels: SuggestedReel[] } | null>(null);
    const [suggLoading, setSuggLoading] = useState(false);
    const [suggTab, setSuggTab] = useState<'sheets' | 'reels'>('sheets');
    const [reelStatsMap, setReelStatsMap] = useState<Record<string, any>>({});
    const suggTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // ─────────────────────────────────────────────────────────────────────

    const [formData, setFormData] = useState<SaleFormData>({
        saleDate: new Date().toISOString().slice(0, 10),
        customerName: '',
        customerContact: '',
        customerEmail: '',
        customerGender: 'male',
        customerDob: '',
        customerCompany: '',
        customerGst: '',
        contactPerson: '',
        customerType: 'walk-in',
        sheetId: '',
        reqWidth: '' as any,
        reqHeight: '' as any,
        sizeUnit: SizeUnit.INCH,
        qtySold: '' as any,
        pricePerKg: '' as any,
        totalAmount: 0,
        notes: '',
        targetGsm: '',
        targetQuality: '',
        targetWeight: '',
        paidAmount: 0,
        pendingAmount: 0,
        paymentDueDate: '',
        paymentStatus: 'pending'
    });

    const [userPagination, setUserPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
    });

    const [sheetPagination, setSheetPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
    });

    const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
    const [sheetSearchTerm, setSheetSearchTerm] = useState('');

    const [showAdditionalWalkInFields, setShowAdditionalWalkInFields] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchInitialData();
    }, []);

    // ── Suggestion Engine ─────────────────────────────────────────────────
    const fetchSuggestions = useCallback(async (req: SuggestionReq) => {
        if (!req.width || !req.height || !req.gsm) {
            setSuggestions(null);
            return;
        }


        setSuggLoading(true);
        try {
            const res = await postData('/sale/suggest', {
                widthCm: toCm(Number(req.width), req.widthUnit),
                heightCm: toCm(Number(req.height), req.heightUnit),
                gsm: Number(req.gsm),
                quality: req.quality || undefined,
                kg: req.kg ? Number(req.kg) : undefined,
                targetQty: req.targetQty ? Number(req.targetQty) : undefined,
                grain: req.grain !== 'all' ? req.grain : undefined
            });
            if (res.success && res.data) {
                setSuggestions(res.data);
                // Auto-switch tab based on results
                if (res.data.sheets.length === 0 && res.data.reels.length > 0) {
                    setSuggTab('reels');
                } else {
                    setSuggTab('sheets');
                }
            }
        } catch (err) {
            console.error('Suggestion error:', err);
        } finally {
            setSuggLoading(false);
        }
    }, []);

    const handleSuggReqChange = (field: keyof SuggestionReq, value: any) => {
        const updated = { ...suggReq, [field]: value };

        // Handle Linked Fields (Packets/Sheets)
        if (field === 'sheetsPerPacket') {
            const spp = Number(value) || 1;
            const pkts = Number(suggReq.totalPackets) || 0;
            const totalQ = Math.round(pkts * spp);
            updated.targetQty = totalQ > 0 ? totalQ : suggReq.targetQty;
        } else if (field === 'totalPackets') {
            const pkts = Number(value) || 0;
            const spp = Number(suggReq.sheetsPerPacket) || 100;
            const totalQ = Math.round(pkts * spp);
            updated.targetQty = totalQ > 0 ? totalQ : '';
        } else if (field === 'targetQty') {
            const qty = Number(value) || 0;
            const spp = Number(suggReq.sheetsPerPacket) || 100;
            const pkts = qty / spp;
            updated.totalPackets = qty > 0 ? (Math.round(pkts * 10) / 10).toString() : "";
        }

        setSuggReq(updated);
        // Debounce the API call
        if (suggTimerRef.current) clearTimeout(suggTimerRef.current);
        suggTimerRef.current = setTimeout(() => fetchSuggestions(updated), 600);
    };

    const selectSuggestedSheet = async (sheet: SuggestedSheet) => {
        // Populate the form with the best matching size from the sheet
        const size = sheet.bestSize || sheet.sizes?.[0];

        let qtyToSell = 0;
        if (suggReq.targetQty) {
            qtyToSell = Number(suggReq.targetQty);
        } else if (Number(suggReq.kg) && sheet.gsm && size) {
            const est = await calcSheetsFromWeightBackendFirst({ width: Number(size.width||0), height: Number(size.height||0), unit: sheet.sizeUnit || 'cm', gsm: Number(sheet.gsm||0), weightKg: Number(suggReq.kg) });
            qtyToSell = est.sheets || sheet.estimatedQty || 0;
        } else {
            qtyToSell = sheet.estimatedQty || 0;
        }

        const pKg = Number(formData.pricePerKg) || 0;
        const w = size?.width || 0;
        const h = size?.height || 0;
        const gsm = sheet.gsm || 0;
        const calc = await calcTotalWeightKgBackendFirst({ width: Number(w), height: Number(h), unit: sheet.sizeUnit || suggReq.widthUnit || 'cm', gsm: Number(gsm), sheets: Number(qtyToSell), roundingMode: 'admin_ream_ceil' });
        const newTotalAmount = Number(calc.totalWeightKg || 0) * pKg;
        const paid = Number(formData.paidAmount) || 0;
        const newPending = Math.max(0, newTotalAmount - paid);

        setFormData(prev => ({
            ...prev,
            sheetId: sheet._id,
            qtySold: qtyToSell,
            targetGsm: sheet.gsm,
            targetQuality: sheet.quality,
            reqWidth: suggReq.width as number,
            reqHeight: suggReq.height as number,
            sizeUnit: suggReq.widthUnit,
            targetWeight: suggReq.kg,
            totalAmount: newTotalAmount,
            pendingAmount: newPending,
            paymentStatus: paid >= newTotalAmount && newTotalAmount > 0 ? 'paid' : (paid > 0 ? 'partial' : 'pending')
        }));

        toast.success(`Sheet ${sheet.sheetNo} selected!`);
    };

    const selectSuggestedReel = (reel: SuggestedReel) => {
        const stats = getReelStats(reel, Number(suggReq.width), Number(suggReq.height), Number(suggReq.gsm), suggReq.widthUnit, suggReq.heightUnit);
        const autoGrain = stats?.detectedGrain || reel.detectedGrain || 'N/A';

        toast.info(`Proceeding with ${autoGrain}. Cut this reel to production.`);
        navigate('/sheet-management/add', {
            state: {
                reel,
                targetWidth: suggReq.width,
                targetHeight: suggReq.height,
                targetUnit: suggReq.widthUnit,
                targetQty: suggReq.targetQty,
                targetGsm: suggReq.gsm,
                targetQuality: suggReq.quality,
                detectedGrain: autoGrain
            }
        });
    };

    const getReelStatsLocal = useCallback((reel: any, rWidth: number, rHeight: number, rGsm: number, rWidthUnit: string, rHeightUnit: string) => {
        const toCmVal = (val: number, unit: string) => {
            if (unit === SizeUnit.MM) return val / 10;
            if (unit === SizeUnit.INCH) return val * 2.54;
            return val;
        };
        const cutW = toCmVal(rWidth, rWidthUnit); const cutH = toCmVal(rHeight, rHeightUnit);
        let rollW = reel.width || 0; const reelUnit = reel.sizeUnit || SizeUnit.CM;
        if (reelUnit === SizeUnit.MM) rollW = rollW / 10; else if (reelUnit === SizeUnit.INCH) rollW = rollW * 2.54;
        const gsm = rGsm || reel.gsm;
        const ups1 = cutW > 0 ? Math.floor((rollW + 0.001) / cutW) : 0;
        const ups2 = cutH > 0 ? Math.floor((rollW + 0.001) / cutH) : 0;
        const ups = Math.max(ups1, ups2); const bestCutW = (ups1 >= ups2) ? cutW : cutH; const bestCutL = (ups1 >= ups2) ? cutH : cutW;
        if (ups === 0 || gsm === 0) return undefined;
        const weightPerSheet = (cutW * 0.01 * cutH * 0.01 * gsm) / 1000;
        const availableLengthCm = (((reel.currentBalanceKg || 0) * 1000) / ((rollW * 0.01) * gsm)) * 100;
        const sheetsPerPiece = Math.floor(availableLengthCm / bestCutL); const totalSheets = sheetsPerPiece * ups;
        const trimWaste = ((rollW - (bestCutW * ups)) / rollW) * 100;
        const grainDir = (ups1 >= ups2) ? (cutH > cutW ? 'Long Grain' : 'Short Grain') : (cutW > cutH ? 'Long Grain' : 'Short Grain');
        const targetQ = Number(suggReq.targetQty) || 0;
        let stripsUsed = 0, pieceWiseWaste = 0, pieceWiseWastePercentage = 0, safeStrips = ups;
        if (targetQ > 0 && sheetsPerPiece > 0) {
            if (totalSheets < targetQ) { stripsUsed = ups; pieceWiseWaste = 0; pieceWiseWastePercentage = 0; safeStrips = 0; }
            else { stripsUsed = Math.ceil(targetQ / sheetsPerPiece); pieceWiseWaste = (stripsUsed * sheetsPerPiece) - targetQ; pieceWiseWastePercentage = (pieceWiseWaste / (stripsUsed * sheetsPerPiece)) * 100; safeStrips = Math.max(0, ups - stripsUsed); }
        }
        return { ups, totalSheets, sheetsPerPiece, trimWaste, stripsUsed, pieceWiseWaste, pieceWiseWastePercentage, safeStrips, orientation: (ups1 >= ups2) ? 'Normal' : 'Rotated', weightPerSheet, detectedGrain: grainDir };
    }, [suggReq.targetQty]);

    const getReelStats = useCallback((reel: any, rWidth: number, rHeight: number, rGsm: number, rWidthUnit: string, rHeightUnit: string) => {
        const key = JSON.stringify([reel?._id, reel?.width, reel?.sizeUnit, reel?.currentBalanceKg, rWidth, rHeight, rGsm, rWidthUnit, rHeightUnit, suggReq.targetQty || 0]);
        const cached = reelStatsMap[key];
        if (cached) return cached;
        const local = getReelStatsLocal(reel, rWidth, rHeight, rGsm, rWidthUnit, rHeightUnit);
        void calcReelStatsBackendFirst({ reel, rWidth, rHeight, rGsm, rWidthUnit, rHeightUnit, targetQty: Number(suggReq.targetQty || 0) }).then((remote) => {
            if (!remote) return;
            setReelStatsMap(prev => prev[key] ? prev : { ...prev, [key]: remote });
        });
        return local;
    }, [suggReq.targetQty, reelStatsMap, getReelStatsLocal]);

    const handleDownloadPDF = (reel: any) => {
        if (!reel) {
            toast.error("Invalid reel selected");
            return;
        }

        const stats = getReelStats(reel, Number(suggReq.width), Number(suggReq.height), Number(suggReq.gsm), suggReq.widthUnit, suggReq.heightUnit);
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
        doc.text("JAIN TRADE LINKS", 15, 20);
        doc.setFontSize(10);
        doc.text("SALES WASTE ANALYSIS & ORDER REPORT", 15, 30);
        doc.text(new Date().toLocaleDateString(), pageWidth - 45, 20);

        // Section: Order Details
        doc.setTextColor(31, 41, 55); // gray-800
        doc.setFontSize(14);
        doc.text("Customer & Order Information", 15, 55);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        autoTable(doc, {
            startY: 60,
            head: [['Requirement', 'Details']],
            body: [
                ['Customer Name', formData.customerName || 'N/A'],
                ['Quality', reel.quality || 'N/A'],
                ['Target GSM', `${suggReq.gsm} GSM`],
                ['Requested Size', `${suggReq.width} x ${suggReq.height} ${suggReq.widthUnit}`],
                ['Grain Direction', stats.detectedGrain],
                ['Requested Quantity', `${suggReq.targetQty} Sheets`],
                [`Total Lot Capacity`, `${stats.totalSheets.toLocaleString()} Sheets`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [243, 244, 246], textColor: [75, 85, 99], fontStyle: 'bold' }
        });

        // Section: Analysis
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Production Waste (Nuksaan) Analysis", 15, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Analysis Metric', 'Value', 'Status']],
            body: [
                ['Pieces per Cut (Ups)', stats.ups.toString(), 'Optimal'],
                ['Wasted Sheets (Estimated)', stats.pieceWiseWaste.toString(), stats.pieceWiseWaste > 0 ? 'Review Required' : 'Excellent'],
                ['Waste Percentage (%)', `${stats.pieceWiseWastePercentage.toFixed(1)}%`, stats.pieceWiseWastePercentage > 5 ? 'High' : 'Normal'],
                ['Trim Waste (Side Margin)', `${stats.trimWaste.toFixed(1)}%`, 'N/A'],
                ['Safety Stock (Safe Strips)', stats.safeStrips.toString(), 'Available for Inventory']
            ],
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
            bodyStyles: { fontStyle: 'bold' }
        });

        const lastY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(107, 114, 128); // gray-500
        doc.text("Note: This report shows the estimated results of cutting the requested size from Lot No: " + reel.reelNo, 15, lastY);
        doc.text("Please approve the waste analysis to proceed with the transaction.", 15, lastY + 5);

        // Footer Branding
        doc.text("Generated by JAIN TRADE LINKS SMART SYSTEM", pageWidth / 2, 285, { align: "center" });

        doc.save(`${formData.customerName || 'Sale'}_Waste_Report.pdf`);
        toast.success("Sales Report Generated successfully!");
    };
    // ─────────────────────────────────────────────────────────────────────

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchSheets(1),
                fetchUsers(1),
                fetchReels()
            ]);
        } catch (error: any) {
            console.error("Failed to fetch initial data:", error);
            toast.error("Failed to connect to server.");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async (page: number = 1, search: string = userSearchTerm) => {
        try {
            const res = await postData("/company/list", {
                page,
                limit: userPagination.limit,
                search,
                type: 'buyer'
            });

            if (res.success && res.data) {
                setUsers(res.data.companies || []);
                setUserPagination(prev => ({
                    ...prev,
                    currentPage: page,
                    totalPages: res.data.totalPages || 1,
                    totalCount: res.data.total || (res.data.companies?.length || 0)
                }));
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    const fetchSheets = async (page: number = 1, search: string = sheetSearchTerm) => {
        try {
            const res = await postData("/sheet/list", {
                page,
                limit: sheetPagination.limit,
                search
            });

            if (res.success && res.data) {
                setSheets(res.data.sheets || []);
                setSheetPagination(prev => ({
                    ...prev,
                    currentPage: page,
                    totalPages: res.data.totalPages || 1,
                    totalCount: res.data.totalCount || (res.data.sheets?.length || 0)
                }));
            }
        } catch (error) {
            console.error("Error fetching sheets:", error);
        }
    };

    const fetchReels = async () => {
        try {
            const res = await postData("/reels/list", {
                page: 1,
                limit: 100
            });
            if (res.success && res.data) {
                setReels(res.data.reels || []);
            }
        } catch (error) {
            console.error("Error fetching reels:", error);
        }
    };

    const handleUserSearch = (val: string) => {
        setUserSearchTerm(val);
        fetchUsers(1, val);
    };

    const handleSheetSearch = (val: string) => {
        setSheetSearchTerm(val);
        fetchSheets(1, val);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Handle numerical fields allowing them to be empty
        const isNumField = ['qtySold', 'pricePerSheet', 'reqWidth', 'reqHeight', 'paidAmount', 'pricePerKg'].includes(name);
        const processedValue = isNumField ? (value === '' ? '' : Number(value)) : value;

        const newFormData = {
            ...formData,
            [name]: processedValue
        };

        setFormData(newFormData);

        if (['qtySold', 'pricePerKg', 'sheetId', 'reqWidth', 'reqHeight'].includes(name)) {
            const selSheet = sheets.find(s => s._id === (name === 'sheetId' ? value : newFormData.sheetId));
            if (selSheet) {
                const qty = Number(newFormData.qtySold) || 0;
                const pKg = Number(newFormData.pricePerKg) || 0;
                const w = selSheet.sizes?.[0]?.width || 0;
                const h = selSheet.sizes?.[0]?.height || 0;
                const gsm = selSheet.gsm || 0;
                void calcTotalWeightKgBackendFirst({ width: Number(w), height: Number(h), unit: selSheet.sizeUnit || 'cm', gsm: Number(gsm), sheets: qty, roundingMode: 'admin_ream_ceil' }).then((calc) => {
                    setFormData(prev => {
                        const totalAmount = Number(calc.totalWeightKg || 0) * pKg;
                        const paidAmt = Number(prev.paidAmount) || 0;
                        const pendingAmount = Math.max(0, totalAmount - paidAmt);
                        return {
                            ...prev,
                            totalAmount,
                            pendingAmount,
                            paymentStatus: paidAmt === 0 ? 'pending' : (paidAmt >= totalAmount ? 'paid' : 'partial'),
                        };
                    });
                });
            }
        }

        // Immediate pending/status update for responsiveness
        setFormData(prev => {
            const total = Number(prev.totalAmount) || 0;
            const paidAmt = Number(prev.paidAmount) || 0;
            const pendingAmount = Math.max(0, total - paidAmt);
            return {
                ...prev,
                pendingAmount,
                paymentStatus: paidAmt === 0 ? 'pending' : (paidAmt >= total ? 'paid' : 'partial'),
            };
        });

        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const selectCustomer = (user: any) => {
        setFormData({
            ...formData,
            customerName: user.companyName || user.fullName || user.name,
            customerContact: user.phone || user.mobileNumber || user.contact || '',
            customerEmail: user.email || '',
            customerGender: user.gender || 'male',
            customerDob: user.dob ? user.dob.slice(0, 10) : '',
            customerId: user._id || user.id,
            customerCompany: user.companyName || '',
            customerGst: user.gstNumber || '',
            contactPerson: user.contactPerson || '',
            customerType: 'registered'
        });
        setIsCustomerModalOpen(false);
    };

    const selectSheet = async (sheet: any) => {
        const qty = Number(formData.qtySold) || 0;
        const pKg = Number(formData.pricePerKg) || 0;
        const w = sheet.sizes?.[0]?.width || 0;
        const h = sheet.sizes?.[0]?.height || 0;
        const gsm = sheet.gsm || 0;
        const calc = await calcTotalWeightKgBackendFirst({ width: Number(w), height: Number(h), unit: sheet.sizeUnit || 'cm', gsm: Number(gsm), sheets: qty, roundingMode: 'admin_ream_ceil' });
        setFormData(prev => ({
            ...prev,
            sheetId: sheet._id,
            totalAmount: Number(calc.totalWeightKg || 0) * pKg
        }));
        setIsSheetModalOpen(false);
    };

    const recommendationData = useMemo(() => {
        const scored = sheets.map(s => {
            let score = 0;
            const reasons: string[] = [];
            const sWidth = s.sizes?.[0]?.width || 0;
            const sHeight = s.sizes?.[0]?.height || 0;


            // Convert requested dimensions to CM for accurate comparison with stock
            const reqWidthCm = suggReq.width ? toCm(suggReq.width, suggReq.widthUnit) : 0;
            const reqHeightCm = suggReq.height ? toCm(suggReq.height, suggReq.heightUnit) : 0;

            // 1. Dimension Match (Crucial)
            const isFeasible = reqWidthCm && reqHeightCm
                ? (sWidth >= reqWidthCm && sHeight >= reqHeightCm) || (sHeight >= reqWidthCm && sWidth >= reqHeightCm)
                : true;

            if (isFeasible && reqWidthCm && reqHeightCm) {
                const waste = (sWidth * sHeight) - (reqWidthCm * reqHeightCm);
                if (waste < 50) { score += 40; reasons.push("Minimal Waste"); }
                else if (waste < 150) { score += 20; reasons.push("Good Size"); }
            }

            // 2. GSM Match
            if (suggReq.gsm) {
                const diff = Math.abs(s.gsm - Number(suggReq.gsm));
                if (diff === 0) { score += 50; reasons.push("Ideal GSM"); }
                else if (diff <= 10) { score += 20; reasons.push("Close GSM"); }
            }

            // 3. Quality Match
            const targetQual = suggReq.quality || formData.targetQuality;
            if (targetQual && s.quality?.toLowerCase() === targetQual.toLowerCase()) {
                score += 30;
                reasons.push("Preferred Quality");
            }

            // 4. Weight Fulfillment
            if (suggReq.kg && suggReq.gsm && suggReq.width && suggReq.height) {
                const availableWeight = (s.currentBalanceKg ?? s.totalWeightKg ?? 0);

                if (availableWeight >= Number(suggReq.kg)) {
                    score += 40;
                    reasons.push("Enough for Order");
                }
            }

            return { ...s, score, reasons, isFeasible };
        });

        const reelScored = reels.map(r => {
            let score = 0;
            const reasons: string[] = [];
            const unit = r.sizeUnit || 'cm';

            // ── Normalise the reel's own width to CM ──────────────────────────
            let rWidthCm: number;
            switch (unit.toLowerCase()) {
                case 'mm': rWidthCm = (r.width || 0) / 10; break;
                case 'inch': rWidthCm = (r.width || 0) * 2.54; break;
                default: rWidthCm = (r.width || 0); break; // cm
            }

            const reqWCm = Number(suggReq.width) ? toCm(Number(suggReq.width), suggReq.widthUnit) : 0;
            const reqHCm = Number(suggReq.height) ? toCm(Number(suggReq.height), suggReq.heightUnit) : 0;
            const reqGsm = Number(suggReq.gsm) || 0;
            const reqKg = Number(suggReq.kg) || 0;
            const reqQuality = suggReq.quality;

            // 0. If user has not entered dimensions yet, skip reel
            if (!reqWCm || !reqHCm) {
                return { ...r, score: -1, isFeasible: false, reasons: ['Enter Width & Height to see reel matches'] };
            }

            // ── HARD FILTER: GSM must match within 10 tolerance ───────────────
            if (reqGsm) {
                const gsmDiff = Math.abs((r.gsm || 0) - reqGsm);
                if (gsmDiff === 0) { score += 40; reasons.push('Exact GSM'); }
                else if (gsmDiff <= 5) { score += 30; reasons.push('Very Close GSM'); }
                else if (gsmDiff <= 10) { score += 15; reasons.push('Close GSM'); }
                else {
                    return {
                        ...r, score: -1, isFeasible: false,
                        reasons: [`GSM mismatch: reel ${r.gsm} vs needed ${reqGsm}`],
                    };
                }
            }

            // ── HARD FILTER: Quality must match if specified ───────────────────
            if (reqQuality && r.quality?.toLowerCase() !== reqQuality.toLowerCase()) {
                return { ...r, score: -1, isFeasible: false, reasons: [`Quality mismatch`] };
            }

            // ── PRIORITY BONUS: Prefer partially-used (already-cut) reels ─────
            const availableKg = r.currentBalanceKg ?? 0;
            const totalKg = r.totalWeightKg ?? 0;
            const isPartiallyUsed = availableKg < totalKg && totalKg > 0;
            if (isPartiallyUsed) {
                score += 5000;
                reasons.push('Already In Use (Priority)');
            }

            // Quality match score
            if (reqQuality && r.quality?.toLowerCase() === reqQuality.toLowerCase()) {
                score += 30;
                reasons.push('Preferred Quality');
            }

            // ── REEL SIZE SCORING (PRIORITY): Compare input Reel Size with available reels ────
            const fitsNormal = rWidthCm >= reqWCm;
            const fitsRotated = rWidthCm >= reqHCm;

            if (reqWCm > 0 && reqHCm > 0) {
                // If it doesn't fit at all, it's really not feasible for THIS specific cut
                if (!fitsNormal && !fitsRotated) {
                    score += 10; // Show it but with very low score
                    reasons.push('Too narrow for this cut');
                } else {
                    const diffNormal = Math.abs(rWidthCm - reqWCm);
                    const diffRotated = Math.abs(rWidthCm - reqHCm);
                    const minDiff = Math.min(diffNormal, diffRotated);

                    if (minDiff < 0.1) {
                        score += 5000;
                        reasons.push('Perfect Width Match');
                    } else if (minDiff <= 2) {
                        score += 500;
                        reasons.push('Close Width Match');
                    } else {
                        score += 50;
                        reasons.push('Width fits required cut');
                    }
                }
            }

            // Yield — cuts across the reel width
            const upsNormal = fitsNormal ? Math.floor((rWidthCm + 0.001) / reqWCm) : 0;
            const upsRotated = fitsRotated ? Math.floor((rWidthCm + 0.001) / reqHCm) : 0;
            const bestUps = Math.max(upsNormal, upsRotated);

            if (bestUps >= 4) { score += 40; reasons.push(`${bestUps} Pieces per cut — High Yield`); }
            else if (bestUps >= 2) { score += 25; reasons.push(`${bestUps} Pieces per cut`); }
            else if (bestUps === 1) { score += 10; reasons.push('1 Piece per cut'); }

            // Weight fulfillment
            if (reqKg > 0) {
                if (availableKg >= reqKg) { score += 20; reasons.push('Enough for Order'); }
                else { reasons.push(`Partial: ${availableKg.toFixed(0)} kg avail`); }
            }

            const rStats = getReelStats(r, Number(suggReq.width), Number(suggReq.height), Number(suggReq.gsm), suggReq.widthUnit, suggReq.heightUnit);

            return { ...r, score, reasons, isFeasible: true, rWidthCm: rWidthCm.toFixed(1), bestUps, stats: rStats };
        });

        const sortedSheets = scored
            .filter(s => s.isFeasible && s.score > 0)
            .sort((a, b) => b.score - a.score);

        const sortedReels = reelScored
            .filter(r => r.isFeasible && r.score > 0)
            .sort((a, b) => b.score - a.score);

        return {
            recommended: sortedSheets,
            reels: sortedReels,
            others: []
        };
    }, [sheets, reels, formData.reqWidth, formData.reqHeight, formData.targetGsm, formData.targetQuality, formData.targetWeight, suggReq]);

    const enrichedSuggestions = useMemo(() => {
        if (!suggestions) return { sheets: [], reels: [] };

        const enrichedReels = suggestions.reels.map(r => {
            const stats = getReelStats(r, Number(suggReq.width), Number(suggReq.height), Number(suggReq.gsm), suggReq.widthUnit, suggReq.heightUnit);
            return { ...r, stats, availableKg: r.currentBalanceKg || 0 };
        });

        const enrichedSheets = suggestions.sheets.map(s => {
            const weight = (s.currentBalanceKg ?? s.totalWeightKg ?? 0);
            const w = s.sizes?.[0]?.width || 0;
            const h = s.sizes?.[0]?.height || 0;
            const gsm = s.gsm || 0;
            const unit = s.sizeUnit || SizeUnit.CM;

            let mFactor = 0.01;
            if (unit === SizeUnit.MM) mFactor = 0.001;
            if (unit === SizeUnit.INCH) mFactor = 0.0254;

            const estimatedQty = Math.floor((weight * 1000) / (w * mFactor * h * mFactor * gsm || 1));
            return { ...s, estimatedQty, availableKg: weight };
        });

        return { sheets: enrichedSheets, reels: enrichedReels };
    }, [suggestions, suggReq, getReelStats]);

    const estimatedSheets = useMemo(() => {
        if (!formData.targetWeight || !formData.targetGsm || !formData.reqWidth || !formData.reqHeight) return null;


        const wInM = toMeter(formData.reqWidth, formData.sizeUnit);
        const hInM = toMeter(formData.reqHeight, formData.sizeUnit);
        const qty = (Number(formData.targetWeight) * 1000) / (wInM * hInM * Number(formData.targetGsm));

        return Math.ceil(qty);
    }, [formData.targetWeight, formData.targetGsm, formData.reqWidth, formData.reqHeight]);

    const selectedSheet = useMemo(() => {
        return sheets.find(s => s._id === formData.sheetId);
    }, [sheets, formData.sheetId]);

    const currentSaleWeight = useMemo(() => {
        if (!selectedSheet || !formData.qtySold) return 0;
        const w = selectedSheet.sizes?.[0]?.width || 0;
        const h = selectedSheet.sizes?.[0]?.height || 0;
        const gsm = selectedSheet.gsm || 0;
        const qty = Number(formData.qtySold) || 0;

        const wInM = toMeter(w, selectedSheet.sizeUnit || 'cm');
        const hInM = toMeter(h, selectedSheet.sizeUnit || 'cm');
        // fallback-only UI estimate for display; backend authoritative on sale
        const weightPerSheetKg = (wInM * hInM * gsm) / 1000;
        const reamWeightKg = Math.ceil(weightPerSheetKg * 1000);
        return (reamWeightKg * qty) / 1000;
    }, [selectedSheet, formData.qtySold]);

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.customerName.trim()) {
            errors.customerName = 'Customer name is required';
        }

        if (formData.customerType === 'walk-in') {
            if (!formData.customerContact || formData.customerContact.length !== 10) {
                errors.customerContact = 'Valid 10-digit mobile number is required';
            }
        }

        if (!formData.sheetId) {
            errors.sheetId = 'Product/Sheet selection is required';
        }

        if (formData.qtySold <= 0) {
            errors.qtySold = 'Quantity must be greater than zero';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        setLoading(true);

        try {
            let finalCustomerId = formData.customerId;

            if (formData.customerType === 'walk-in') {
                const userRes = await postData('/users/create', {
                    fullName: formData.customerName,
                    mobileNumber: formData.customerContact,
                    email: formData.customerEmail?.trim() || undefined,
                    gender: formData.customerGender || 'male',
                    dob: formData.customerDob || undefined,
                    role: 'user'
                });

                if (userRes.success && userRes.data) {
                    finalCustomerId = userRes.data._id;
                } else {
                    toast.error(userRes.message || 'Failed to register customer.');
                    setLoading(false);
                    return; // Stop the process if registration fails
                }
            }

            const selSheet = sheets.find(s => s._id === formData.sheetId);
            const { reqWidth, reqHeight, customerEmail, customerGender, customerDob, pricePerKg, targetGsm, targetQuality, targetWeight, sizeUnit, ...cleanData } = formData;

            const response = await postData('/sale', {
                ...cleanData,
                customerId: finalCustomerId,
                size1: selSheet?.sizes?.[0]?.width?.toString() || "28",
                size2: selSheet?.sizes?.[0]?.height?.toString() || "32",
                gsm: selSheet?.gsm || 230,
                quality: selSheet?.quality || 'SBS',
                pricePerSheet: formData.qtySold > 0 ? (formData.totalAmount / formData.qtySold) : 0
            });

            if (response.success) {
                toast.success('Sale recorded successfully!');
                navigate('/inventory-intelligence');
            } else {
                toast.error(response.message || 'Failed to record sale');
            }
        } catch (err: any) {
            console.error('Sale submission error:', err);
            const rawMessage = err.response?.data?.message || err.message || 'Failed to record sale';
            const finalMessage = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
            toast.error(finalMessage);
        } finally {
            setLoading(false);
        }
    };

    const getSheetEstimate = (sheet: any) => {
        if (!sheet || !sheet.sizes?.[0]) return 0;
        const w = sheet.sizes[0].width;
        const h = sheet.sizes[0].height;
        const unit = sheet.sizeUnit || 'cm';
        const gsm = sheet.gsm;
        const weight = sheet.currentBalanceKg ?? sheet.totalWeightKg;

        let mFactor = 0.01;
        if (unit === 'mm') mFactor = 0.001;
        if (unit.toLowerCase().includes('in')) mFactor = 0.0254;

        const count = (weight * 1000) / (w * mFactor * h * mFactor * gsm);
        return Math.floor(count);
    };

    const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
            {children}
        </div>
    );

    return (
        <>
            <PageMeta
                title="New Sale | Inventory Intelligence"
                description="Record a new paper cutting sale"
            />
            <PageBreadcrumb pageTitle="New Sale" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">
                            Create New Transaction
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Enter customer details and select stock to process a sale
                        </p>
                    </div>
                </div>

                {/* ── Smart Requirement Search Panel ─────────────────────────── */}
                <div className="rounded-3xl border-2 border-brand-100 dark:border-brand-900/40 bg-gradient-to-br from-brand-50/60 to-white dark:from-brand-950/20 dark:to-gray-900 overflow-hidden shadow-lg shadow-brand-100/30 dark:shadow-brand-900/10">
                    {/* Header */}
                    <div className="px-6 py-4 bg-brand-500 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg">🔍</div>
                            <div>
                                <p className="text-[10px] font-black text-brand-100 uppercase tracking-widest leading-none">Step 1 — Smart Search</p>
                                <h4 className="text-white font-black text-base leading-tight">Find Matching Stock</h4>
                            </div>
                        </div>
                        {suggestions && (
                            <div className="flex items-center gap-2 text-[10px] text-white/80 font-bold">
                                <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
                                {suggestions.sheets.length} Sheets · {suggestions.reels.length} Reels found
                            </div>
                        )}
                    </div>

                    {/* Input Row */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="flex flex-col">
                                <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Quality</Label>
                                <select
                                    className="h-12 w-full rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all shadow-sm"
                                    value={suggReq.quality}
                                    onChange={e => handleSuggReqChange('quality', e.target.value)}
                                >
                                    <option value="">Any Quality</option>
                                    {Object.values(PaperQuality).map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Target GSM</Label>
                                <input
                                    type="number"
                                    className="w-full h-12 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 px-4 text-base font-black text-gray-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                    placeholder="e.g. 230"
                                    value={suggReq.gsm}
                                    onChange={e => handleSuggReqChange('gsm', e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col">
                                <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Reel Size</Label>
                                <div className="flex bg-white dark:bg-gray-800/50 rounded-xl border-2 border-gray-100 dark:border-gray-800 focus-within:border-brand-500 transition-all h-12 overflow-hidden shadow-sm">
                                    <input
                                        type="number"
                                        className="min-w-0 flex-1 bg-transparent px-4 text-sm font-bold outline-none border-none text-gray-900 dark:text-white"
                                        placeholder="Reel Size"
                                        value={suggReq.width}
                                        onChange={e => handleSuggReqChange('width', e.target.value)}
                                    />
                                    <div className="bg-gray-50 dark:bg-gray-900 px-3 flex items-center border-l border-gray-100 dark:border-gray-800">
                                        <select
                                            className="bg-transparent text-[11px] font-black uppercase text-brand-600 outline-none cursor-pointer"
                                            value={suggReq.widthUnit}
                                            onChange={e => handleSuggReqChange('widthUnit', e.target.value)}
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
                                        placeholder="Cutting Size"
                                        value={suggReq.height}
                                        onChange={e => handleSuggReqChange('height', e.target.value)}
                                    />
                                    <div className="bg-gray-50 dark:bg-gray-900 px-3 flex items-center border-l border-gray-100 dark:border-gray-800">
                                        <select
                                            className="bg-transparent text-[11px] font-black uppercase text-brand-600 outline-none cursor-pointer"
                                            value={suggReq.heightUnit}
                                            onChange={e => handleSuggReqChange('heightUnit', e.target.value)}
                                        >
                                            {Object.values(SizeUnit).map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Sht/Pkt</Label>
                                <input
                                    type="number"
                                    className="w-full h-12 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 px-4 text-base font-black text-gray-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                    placeholder="100"
                                    value={suggReq.sheetsPerPacket}
                                    onChange={e => handleSuggReqChange('sheetsPerPacket', e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col">
                                <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Packets Count</Label>
                                <input
                                    type="number"
                                    className="w-full h-12 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-base font-black text-gray-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                    placeholder="Packets"
                                    value={suggReq.totalPackets}
                                    onChange={e => handleSuggReqChange('totalPackets', e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col">
                                <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Total Sheets</Label>
                                <input
                                    type="number"
                                    className="w-full h-12 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-base font-black text-gray-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                    placeholder="Total Qty"
                                    value={suggReq.targetQty}
                                    onChange={e => handleSuggReqChange('targetQty', e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col">
                                <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Order Grain</Label>
                                <select
                                    className="h-12 w-full rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all shadow-sm"
                                    value={suggReq.grain}
                                    onChange={e => handleSuggReqChange('grain', e.target.value)}
                                >
                                    <option value="all">Any Grain</option>
                                    <option value="Long Grain (LG)">Long Grain (LG)</option>
                                    <option value="Short Grain (SG)">Short Grain (SG)</option>
                                </select>
                            </div>
                        </div>

                        {/* Suggestion Results */}
                        {suggLoading && (
                            <div className="flex items-center gap-3 py-4 text-brand-600">
                                <Loader size="sm" />
                                <span className="text-sm font-bold">Scanning inventory...</span>
                            </div>
                        )}

                        {!suggLoading && suggestions && (
                            <div className="mt-2">
                                {/* Tab bar */}
                                <div className="flex items-center gap-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setSuggTab('sheets')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${suggTab === 'sheets'
                                            ? 'bg-brand-500 text-white shadow-lg shadow-brand-200'
                                            : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700 hover:border-brand-300'
                                            }`}
                                    >
                                        📄 Sheets
                                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${suggTab === 'sheets' ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600'
                                            }`}>{suggestions.sheets.length}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSuggTab('reels')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${suggTab === 'reels'
                                            ? 'bg-brand-500 text-white shadow-lg shadow-brand-200'
                                            : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700 hover:border-brand-300'
                                            }`}
                                    >
                                        🌀 Reels (Cut to size)
                                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${suggTab === 'reels' ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600'
                                            }`}>{suggestions.reels.length}</span>
                                    </button>
                                </div>

                                {/* Sheet Results */}
                                {suggTab === 'sheets' && (
                                    <>
                                        {enrichedSuggestions.sheets.length === 0 ? (
                                            <div className="text-center py-8 text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                                <p className="text-2xl mb-2">📭</p>
                                                <p className="font-bold text-sm">No matching sheets found</p>
                                                <p className="text-xs mt-1">Check the Reels tab — you may need to cut a reel first</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                                                {enrichedSuggestions.sheets.map((sheet) => (
                                                    <div
                                                        key={sheet._id}
                                                        onClick={() => selectSuggestedSheet(sheet)}
                                                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all group hover:scale-[1.01] ${formData.sheetId === sheet._id
                                                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-lg shadow-brand-100'
                                                            : 'border-brand-100 dark:border-brand-900/30 bg-white dark:bg-gray-900 hover:border-brand-400 hover:shadow-md'
                                                            }`}
                                                    >
                                                        {/* Header row */}
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <div className="text-[9px] font-black text-brand-500 uppercase tracking-widest mb-0.5">{sheet.sheetNo}</div>
                                                                <div className="text-lg font-black text-gray-900 dark:text-white leading-none">
                                                                    {convertUnit(sheet.bestSize?.width ?? sheet.sizes?.[0]?.width, sheet.sizeUnit || 'cm', suggReq.widthUnit).toFixed(1)} × {convertUnit(sheet.bestSize?.height ?? sheet.sizes?.[0]?.height, sheet.sizeUnit || 'cm', suggReq.widthUnit).toFixed(1)}
                                                                    <span className="text-xs font-bold text-gray-400 ml-1">{suggReq.widthUnit}</span>
                                                                    <span className="text-[10px] text-gray-400 font-bold ml-1.5 opacity-60">({sheet.bestSize?.width ?? sheet.sizes?.[0]?.width}×{sheet.bestSize?.height ?? sheet.sizes?.[0]?.height} {sheet.sizeUnit || 'cm'})</span>
                                                                    {sheet.bestSize?.grain && sheet.bestSize.grain !== 'No issue' && (
                                                                        <span className="ml-1 text-[8px] px-1.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-700 uppercase font-black tracking-tighter align-middle">
                                                                            {sheet.bestSize.grain}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs font-bold text-gray-500 mt-0.5">{sheet.quality} · {sheet.gsm} GSM</div>
                                                            </div>
                                                            {formData.sheetId === sheet._id && (
                                                                <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs">✓</div>
                                                            )}
                                                        </div>
                                                        {/* Stats row */}
                                                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                                                            <div className="text-center">
                                                                <div className="text-xl font-black text-brand-600 flex flex-col items-center justify-center gap-1.5 pb-1">
                                                                    <Layers className="w-8 h-8 text-brand-500 drop-shadow-sm" strokeWidth={1.5} />
                                                                    <span>{sheet.estimatedQty.toLocaleString()}</span>
                                                                </div>
                                                                <div className="text-[9px] text-gray-400 uppercase font-bold">Est. Sheets</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-sm font-black text-gray-800 dark:text-gray-200">{sheet.availableKg.toFixed(1)} kg</div>
                                                                <div className="text-[9px] text-gray-400 uppercase font-bold">Available</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className={`text-sm font-black ${sheet.wastePercent <= 10 ? 'text-green-600' :
                                                                    sheet.wastePercent <= 30 ? 'text-yellow-600' : 'text-red-500'
                                                                    }`}>{sheet.wastePercent.toFixed(1)}%</div>
                                                                <div className="text-[9px] text-gray-400 uppercase font-bold">Waste</div>
                                                            </div>
                                                        </div>
                                                        {/* Tags */}
                                                        <div className="flex flex-wrap gap-1 mt-3">
                                                            {sheet.reasons.map((r, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-md text-[9px] font-black uppercase">{r}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Reel Results */}
                                {suggTab === 'reels' && (
                                    <>
                                        {enrichedSuggestions.reels.length === 0 ? (
                                            <div className="text-center py-8 text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                                <p className="text-2xl mb-2">🌀</p>
                                                <p className="font-bold text-sm">No matching reels found</p>
                                                <p className="text-xs mt-1">Try different dimensions or GSM</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                                                {enrichedSuggestions.reels.map((reel) => (
                                                    <div
                                                        key={reel._id}
                                                        className={`p-4 rounded-2xl border-2 hover:shadow-md transition-all cursor-pointer group ${reel.isPartiallyUsed
                                                            ? 'border-orange-300 dark:border-orange-700/50 bg-orange-50/40 dark:bg-orange-900/10 hover:border-orange-400'
                                                            : 'border-brand-100 dark:border-brand-900/30 bg-brand-50/30 dark:bg-brand-900/10 hover:border-brand-400'
                                                            }`}
                                                        onClick={() => selectSuggestedReel(reel)}
                                                    >
                                                        {/* Header */}
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <div className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Reel #{reel.reelNo}</div>
                                                                    {reel.isPartiallyUsed && (
                                                                        <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[8px] font-black rounded uppercase tracking-tight">
                                                                            ⭐ Already In Use
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-lg font-black text-gray-900 dark:text-white leading-none">
                                                                    {convertUnit(reel.width, reel.sizeUnit, suggReq.widthUnit).toFixed(1)} {suggReq.widthUnit} wide
                                                                    <span className="text-[10px] text-gray-400 font-bold ml-1.5 opacity-60">({reel.width} {reel.sizeUnit})</span>
                                                                </div>
                                                                <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{reel.quality} · {reel.gsm} GSM</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-base font-black text-brand-600">{reel.availableKg.toFixed(1)}</div>
                                                                <div className="text-[9px] text-gray-400 uppercase font-bold">kg avail</div>
                                                            </div>
                                                        </div>


                                                        {/* Stats Breakdown */}
                                                        <div className="space-y-2 mt-3 pt-3 border-t border-brand-100/50 dark:border-brand-900/20">
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex justify-between items-center text-[10px]">
                                                                    <span className="text-gray-400 font-bold uppercase tracking-tighter">Cuts per Width</span>
                                                                    <span className="font-black text-gray-900 dark:text-white">{reel.stats?.ups || 0} Pieces</span>
                                                                </div>
                                                                <div className="text-[8px] text-brand-600/60 font-medium">
                                                                    {convertUnit(reel.width, reel.sizeUnit, suggReq.widthUnit).toFixed(1)}{suggReq.widthUnit} / {suggReq.width}{suggReq.widthUnit} = {reel.stats?.ups || 0}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex justify-between items-center text-[10px]">
                                                                    <span className="text-gray-400 font-bold uppercase tracking-tighter text-wrap max-w-[100px]">Total Yield Breakdown</span>
                                                                    <span className="font-black text-green-600 truncate">{reel.stats?.totalSheets.toLocaleString() || 0} Total</span>
                                                                </div>
                                                                <div className="text-[8px] text-green-600/60 font-medium leading-none">
                                                                    {reel.stats?.sheetsPerPiece.toLocaleString() || 0} Sheets per Piece (Strip)
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px]">
                                                                <span className="text-gray-400 font-bold uppercase tracking-tighter">Trim Waste</span>
                                                                <span className="font-black text-red-500">{reel.stats?.trimWaste.toFixed(1) || 0}%</span>
                                                            </div>

                                                            {reel.stats && reel.stats.pieceWiseWaste > 0 && (
                                                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-500/5 rounded-lg border border-red-100 dark:border-red-500/20">
                                                                    <div className="flex items-center justify-between text-[10px]">
                                                                        <span className="text-red-500 font-black uppercase tracking-tighter italic">Nuksaan (Waste)</span>
                                                                        <span className="font-black text-red-600">{reel.stats.pieceWiseWaste.toLocaleString()} Pcs</span>
                                                                    </div>
                                                                    <div className="text-[8px] text-red-400 font-bold leading-none mt-1">
                                                                        {reel.stats.pieceWiseWastePercentage.toFixed(1)}% of used pieces
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {suggReq.targetQty && reel.stats && reel.stats.totalSheets < Number(suggReq.targetQty) && (
                                                                <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-900/30">
                                                                    <div className="flex items-center justify-between text-[10px]">
                                                                        <span className="text-orange-600 dark:text-orange-400 font-black uppercase tracking-tighter italic">Order Shortfall</span>
                                                                        <span className="font-black text-orange-700 dark:text-orange-300">{(Number(suggReq.targetQty) - reel.stats.totalSheets).toLocaleString()} Pcs Short</span>
                                                                    </div>
                                                                    <div className="text-[8px] text-orange-600 dark:text-orange-400 font-bold leading-tight mt-1">
                                                                        This roll will exhaust at {reel.stats.totalSheets.toLocaleString()} sheets. You will need to process the remaining {(Number(suggReq.targetQty) - reel.stats.totalSheets).toLocaleString()} sheets from another roll.
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {reel.stats && reel.stats.safeStrips > 0 && (
                                                                <div className="flex items-center justify-between text-[9px] font-black uppercase text-green-600 mt-1 px-1">
                                                                    <span>Safe Pieces (Strips)</span>
                                                                    <span>{reel.stats.safeStrips} Safe</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* CTA */}
                                                        <div className="w-full mt-4 py-2 bg-brand-500 group-hover:bg-brand-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest text-center transition-all shadow-sm shadow-brand-200/50">
                                                            ✂ Cut to Required Size
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {!suggLoading && !suggestions && (
                            <div className="mt-8 flex items-center gap-3 py-3 px-4 bg-brand-50/50 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-900/20">
                                <span className="text-xl">💡</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Enter <strong>Size</strong>, <strong>Cut Size</strong> (cm) and <strong>GSM</strong> above to get smart stock suggestions.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                {/* ─────────────────────────────────────────────────────────── */}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <ComponentCard title="Sale Details">
                            <form id="sale-form" onSubmit={handleSubmit} className="space-y-8">
                                {/* Basic Info */}
                                <div>
                                    <SectionLabel>📦 Basic Information</SectionLabel>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <DatePicker
                                                id="saleDate"
                                                label="Sale Date"
                                                defaultDate={formData.saleDate}
                                                onChange={(dates) => dates && dates[0] && setFormData(prev => ({ ...prev, saleDate: formatDateToYYYYMMDD(dates[0]) }))}
                                            />
                                        </div>

                                        <div>
                                            <Label>Company Type</Label>
                                            <div className="flex gap-2 mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, customerType: 'walk-in', customerId: undefined })}
                                                    className={`flex-1 py-3 text-sm font-black rounded-xl border transition-all ${formData.customerType === 'walk-in' ? 'bg-brand-50 border-brand-200 text-brand-600 shadow-sm shadow-brand-100 dark:bg-brand-900/20 dark:border-brand-800' : 'bg-transparent border-gray-100 text-gray-400 dark:border-gray-800 hover:border-gray-300'}`}
                                                >
                                                    Walk-in
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCustomerModalOpen(true)}
                                                    className={`flex-1 py-3 text-sm font-black rounded-xl border transition-all ${formData.customerType === 'registered' ? 'bg-brand-50 border-brand-200 text-brand-600 shadow-sm shadow-brand-100 dark:bg-brand-900/20 dark:border-brand-800' : 'bg-transparent border-gray-100 text-gray-400 dark:border-gray-800 hover:border-gray-300'}`}
                                                >
                                                    Registered
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                        <div>
                                            <Label>Company Name <span className="text-error-500">*</span></Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="text"
                                                    name="customerName"
                                                    value={formData.customerName}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter Company Name"
                                                    error={!!fieldErrors.customerName}
                                                    hint={fieldErrors.customerName}
                                                    readOnly={formData.customerType === 'registered'}
                                                    className="flex-1"
                                                />
                                                {formData.customerType === 'registered' && (
                                                    <Button variant="outline" size="sm" onClick={() => setIsCustomerModalOpen(true)}>Change</Button>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label>Contact Person</Label>
                                            <Input
                                                type="text"
                                                name="contactPerson"
                                                value={formData.contactPerson}
                                                onChange={handleInputChange}
                                                placeholder="Enter contact person name"
                                                readOnly={formData.customerType === 'registered'}
                                            />
                                        </div>

                                        <div>
                                            <Label>Contact Number <span className="text-error-500">*</span></Label>
                                            <Input
                                                type="tel"
                                                name="customerContact"
                                                value={formData.customerContact}
                                                onChange={handleInputChange}
                                                placeholder="e.g. 9876543210"
                                                readOnly={formData.customerType === 'registered'}
                                                error={!!fieldErrors.customerContact}
                                                hint={fieldErrors.customerContact}
                                            />
                                        </div>

                                        <div>
                                            <Label>GST Number</Label>
                                            <Input
                                                type="text"
                                                name="customerGst"
                                                value={formData.customerGst}
                                                onChange={handleInputChange}
                                                placeholder="Enter GST Number"
                                                readOnly={formData.customerType === 'registered'}
                                            />
                                        </div>
                                    </div>

                                    {formData.customerType === 'walk-in' && (
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                onClick={() => setShowAdditionalWalkInFields(!showAdditionalWalkInFields)}
                                                className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:text-brand-700 transition-colors flex items-center gap-1.5 mb-4"
                                            >
                                                {showAdditionalWalkInFields ? '− Hide Optional Fields' : '+ Add More Details (Email, DOB, Gender)'}
                                            </button>

                                            {showAdditionalWalkInFields && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div>
                                                        <Label className="text-xs">Email Address</Label>
                                                        <Input
                                                            type="email"
                                                            name="customerEmail"
                                                            value={formData.customerEmail}
                                                            onChange={handleInputChange}
                                                            placeholder="customer@example.com"
                                                            className="h-10 text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Gender</Label>
                                                        <select
                                                            name="customerGender"
                                                            value={formData.customerGender}
                                                            onChange={handleInputChange}
                                                            className="h-10 w-full rounded-lg border px-4 py-2 text-sm bg-transparent border-gray-300 dark:border-gray-700 mt-1"
                                                        >
                                                            <option value="male">Male</option>
                                                            <option value="female">Female</option>
                                                            <option value="other">Other</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <DatePicker
                                                            id="customerDob"
                                                            label="Date of Birth"
                                                            maxDate={new Date()}
                                                            defaultDate={formData.customerDob}
                                                            onChange={(dates) => dates && dates[0] && setFormData(prev => ({ ...prev, customerDob: formatDateToYYYYMMDD(dates[0]) }))}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Stock Details */}
                                <div>
                                    <SectionLabel>📄 Stock & Dimensions</SectionLabel>

                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 mb-8">
                                        <div className="text-[11px] font-black text-brand-600 uppercase tracking-widest mb-5 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                                            Target Dimensions (Required Cut)
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                            <div className="flex flex-col">
                                                <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Quality</Label>
                                                <select
                                                    className="h-12 w-full rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all shadow-sm"
                                                    value={suggReq.quality}
                                                    onChange={e => handleSuggReqChange('quality', e.target.value)}
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
                                                    value={suggReq.gsm}
                                                    onChange={e => handleSuggReqChange('gsm', e.target.value)}
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
                                                        value={suggReq.width}
                                                        onChange={e => handleSuggReqChange('width', e.target.value)}
                                                    />
                                                    <div className="bg-gray-50 dark:bg-gray-900 px-3 flex items-center border-l border-gray-100 dark:border-gray-800">
                                                        <select
                                                            className="bg-transparent text-[11px] font-black uppercase text-brand-600 outline-none cursor-pointer"
                                                            value={suggReq.widthUnit}
                                                            onChange={e => handleSuggReqChange('widthUnit', e.target.value)}
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
                                                        value={suggReq.height}
                                                        onChange={e => handleSuggReqChange('height', e.target.value)}
                                                    />
                                                    <div className="bg-gray-50 dark:bg-gray-900 px-3 flex items-center border-l border-gray-100 dark:border-gray-800">
                                                        <select
                                                            className="bg-transparent text-[11px] font-black uppercase text-brand-600 outline-none cursor-pointer"
                                                            value={suggReq.heightUnit}
                                                            onChange={e => handleSuggReqChange('heightUnit', e.target.value)}
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
                                                    value={suggReq.sheetsPerPacket}
                                                    onChange={e => handleSuggReqChange('sheetsPerPacket', e.target.value)}
                                                    className="h-12 bg-white dark:bg-gray-800/50 font-bold shadow-sm"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Packets Count</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Packets"
                                                    value={suggReq.totalPackets}
                                                    onChange={e => handleSuggReqChange('totalPackets', e.target.value)}
                                                    className="h-12 bg-white dark:bg-gray-800/50 font-bold shadow-sm"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Total Sheets</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Total Qty"
                                                    value={suggReq.targetQty}
                                                    onChange={e => handleSuggReqChange('targetQty', e.target.value)}
                                                    className="h-12 bg-white dark:bg-gray-800/50 font-bold shadow-sm"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <Label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Order Grain</Label>
                                                <select
                                                    className="h-12 w-full rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all shadow-sm"
                                                    value={suggReq.grain}
                                                    onChange={e => handleSuggReqChange('grain', e.target.value)}
                                                >
                                                    <option value="all">Any Grain</option>
                                                    <option value="long">Long Grain</option>
                                                    <option value="short">Short Grain</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 mb-8">
                                        <div className="text-[11px] font-black text-brand-600 uppercase tracking-widest mb-5 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                                            Recommendation Preferences (Filter)
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <Label className="text-xs font-bold text-gray-500 mb-2">GSM (Thickness)</Label>
                                                <Input
                                                    type="number"
                                                    name="targetGsm"
                                                    value={formData.targetGsm || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="e.g. 230"
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs font-bold text-gray-500 mb-2">Quality</Label>
                                                <select
                                                    name="targetQuality"
                                                    value={formData.targetQuality || ''}
                                                    onChange={handleInputChange}
                                                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm bg-transparent border-gray-300 dark:border-gray-700 mt-1"
                                                >
                                                    <option value="">Any Quality</option>
                                                    {Object.values(PaperQuality).map((q) => (
                                                        <option key={q} value={q}>{q}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <Label className="text-xs font-bold text-gray-500 mb-2">Total Weight (Kg)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        name="targetWeight"
                                                        value={formData.targetWeight || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="e.g. 50"
                                                        className="w-full pr-10"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">KG</div>
                                                </div>
                                            </div>
                                        </div>
                                        {estimatedSheets && (
                                            <div className="mt-6 p-4 bg-brand-50/50 dark:bg-brand-500/5 rounded-xl border border-brand-100 dark:border-brand-500/20 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-lg">💡</div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest leading-none mb-1">Recommendation Insight</p>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                            You will need approximately <span className="text-brand-600 text-lg font-black">{estimatedSheets.toLocaleString()}</span> sheets to reach your target weight.
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const pKg = Number(formData.pricePerKg) || 0;
                                                        const targetW = Number(formData.targetWeight) || 0;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            qtySold: estimatedSheets,
                                                            totalAmount: targetW * pKg
                                                        }));
                                                    }}
                                                    className="px-4 py-2 bg-brand-600 text-white text-xs font-black rounded-lg hover:bg-brand-700 transition-colors uppercase tracking-widest shadow-sm shadow-brand-200"
                                                >
                                                    Apply Qty
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                                        <div>
                                            <Label className="text-xs font-bold text-gray-500 mb-2">Select Sheet Stock <span className="text-error-500">*</span></Label>
                                            <div
                                                onClick={() => setIsSheetModalOpen(true)}
                                                className={`min-h-[64px] w-full rounded-2xl border-2 px-6 py-4 cursor-pointer flex justify-between items-center transition-all group
                                                    ${fieldErrors.sheetId
                                                        ? 'border-red-200 bg-red-50/30'
                                                        : selectedSheet
                                                            ? 'border-brand-100 bg-brand-50/20'
                                                            : 'border-gray-100 bg-gray-50/30 hover:border-brand-500 hover:bg-white'
                                                    }`}
                                            >
                                                {selectedSheet ? (
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white">
                                                            <FileIcon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                                                                {selectedSheet.sizes?.[0]?.width} × {selectedSheet.sizes?.[0]?.height} <span className="text-xs text-gray-400">{selectedSheet.sizeUnit || 'cm'}</span>
                                                                {selectedSheet.sizes?.[0]?.grain && selectedSheet.sizes?.[0]?.grain !== 'No issue' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 uppercase">{selectedSheet.sizes?.[0]?.grain}</span>}
                                                            </div>
                                                            <div className="text-xs font-bold text-brand-600 uppercase tracking-tighter">
                                                                {selectedSheet.quality} • {selectedSheet.gsm} GSM
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                                                            <FileIcon className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-gray-400 font-bold">Choose Available Stock</span>
                                                    </div>
                                                )}
                                                <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-brand-500 group-hover:bg-brand-50 transition-all">
                                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                            {fieldErrors.sheetId && <p className="mt-2 text-xs font-bold text-red-500 pl-2">⚠ {fieldErrors.sheetId}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                        <div>
                                            <Label>Quantity (Sheets) <span className="text-error-500">*</span></Label>
                                            <Input
                                                type="number"
                                                name="qtySold"
                                                value={formData.qtySold}
                                                onChange={handleInputChange}
                                                placeholder="0"
                                                error={!!fieldErrors.qtySold}
                                                hint={fieldErrors.qtySold}
                                            />
                                        </div>
                                        <div>
                                            <Label>Price Per Kg (₹) <span className="text-error-500">*</span></Label>
                                            <Input
                                                type="number"
                                                name="pricePerKg"
                                                value={formData.pricePerKg}
                                                onChange={handleInputChange}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    {/* Payment Information */}
                                    <div className="mt-8">
                                        <SectionLabel>💳 Payment Information</SectionLabel>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label>Paid Amount (₹)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        name="paidAmount"
                                                        value={formData.paidAmount}
                                                        onChange={handleInputChange}
                                                        placeholder="0.00"
                                                        className="pr-10"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</div>
                                                </div>
                                            </div>
                                            <div>
                                                <DatePicker
                                                    id="paymentDueDate"
                                                    label="Payment Due Date"
                                                    defaultDate={formData.paymentDueDate}
                                                    onChange={(dates) => dates && dates[0] && setFormData(prev => ({ ...prev, paymentDueDate: formatDateToYYYYMMDD(dates[0]) }))}
                                                />
                                            </div>
                                        </div>

                                        {/* Status Insights */}
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            <div className="flex-1 min-w-[140px] p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending</span>
                                                <span className={`text-sm font-black ${formData.pendingAmount > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                    ₹{formData.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-[140px] p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter 
                                                    ${formData.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/20' :
                                                        formData.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20' :
                                                            'bg-red-100 text-red-700 dark:bg-red-900/20'}`}>
                                                    {formData.paymentStatus}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <SectionLabel>📝 Notes</SectionLabel>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full h-24 rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 mt-1"
                                        placeholder="Add any internal remarks..."
                                    />
                                </div>
                            </form>
                        </ComponentCard>
                    </div>

                    <div className="lg:col-span-1 lg:sticky lg:top-24 self-start">
                        <ComponentCard title="Order Summary">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">Sale Weight</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{currentSaleWeight.toFixed(2)} Kg</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">Subtotal</span>
                                    <span className="font-bold text-gray-900 dark:text-white">₹{formData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">Tax (Inclusive)</span>
                                    <span className="font-bold text-gray-900 dark:text-white">₹0</span>
                                </div>
                                <div className="flex justify-between items-center py-4">
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total Amount</span>
                                    <span className="text-2xl font-black text-brand-600">₹{formData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 font-medium">Pending Amount</span>
                                        <span className={`font-black ${formData.pendingAmount > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            ₹{formData.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 font-medium">Status</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter 
                                            ${formData.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/20' :
                                                formData.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20' :
                                                    'bg-red-100 text-red-700 dark:bg-red-900/20'}`}>
                                            {formData.paymentStatus}
                                        </span>
                                    </div>
                                    {formData.paymentDueDate && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-medium">Due Date</span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {new Date(formData.paymentDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {formData.reqWidth > 0 && formData.reqHeight > 0 && (
                                    <div className="p-4 bg-brand-50/30 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-900/20">
                                        <div className="text-[10px] font-bold text-brand-600 uppercase mb-2">Target Dimensions</div>
                                        <div className="font-black text-gray-900 dark:text-white text-lg">
                                            {formData.reqWidth} × {formData.reqHeight} <span className="text-sm font-bold text-gray-400 normal-case">{formData.sizeUnit}</span>
                                        </div>
                                    </div>
                                )}

                                {formData.customerName && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Customer Info</div>
                                        <div className="font-bold text-gray-900 dark:text-white">{formData.customerName}</div>
                                        <div className="text-xs text-brand-600 font-medium">{formData.customerContact}</div>
                                    </div>
                                )}

                                <div className="pt-6">
                                    <Button
                                        type="submit"
                                        form="sale-form"
                                        className="w-full flex justify-center py-3"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader size="sm" color="white" className="mr-2" />
                                                Processing...
                                            </>
                                        ) : (
                                            'Confirm & Print Receipt'
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full mt-3 flex justify-center"
                                        onClick={() => navigate(-1)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </ComponentCard>
                    </div>
                </div>
            </div>

            {/* Customer Selection Modal */}
            <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} className="max-w-xl">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">👥 Select Customer</h3>
                        <button
                            type="button"
                            onClick={() => navigate('/company-registration')}
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-brand-500/20"
                        >
                            + Register Company
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative mb-8">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl leading-5 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                            placeholder="Search by name or contact..."
                            value={userSearchTerm}
                            onChange={(e) => handleUserSearch(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3 max-h-[450px] overflow-y-auto custom-scrollbar pr-2 mb-8">
                        {users.length > 0 ? (
                            users.map((cust) => (
                                <div
                                    key={cust._id}
                                    onClick={() => selectCustomer(cust)}
                                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex justify-between items-center group
                                        ${formData.customerId === cust._id
                                            ? 'bg-brand-50 border-brand-500 dark:bg-brand-500/10 shadow-sm shadow-brand-200'
                                            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-brand-500 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs uppercase
                                            ${formData.customerId === cust._id
                                                ? 'bg-brand-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                            }`}
                                        >
                                            {cust.companyName ? (
                                                cust.companyName.charAt(0)
                                            ) : (
                                                <UserIcon className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">
                                                {cust.companyName || cust.fullName}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-brand-600 font-bold">
                                                    {cust.phone || cust.mobileNumber}
                                                </p>
                                                {cust.type && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 font-medium uppercase tracking-tighter">
                                                        {cust.type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                        ${formData.customerId === cust._id
                                            ? 'border-brand-500 bg-brand-500 text-white'
                                            : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        {formData.customerId === cust._id && (
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-gray-400 font-medium bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                                No customers found.
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchUsers(userPagination.currentPage - 1)}
                                disabled={userPagination.currentPage === 1}
                                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
                            >
                                <AngleLeftIcon className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-black text-gray-900 dark:text-white mx-2">
                                {userPagination.currentPage} / {userPagination.totalPages}
                            </span>
                            <button
                                onClick={() => fetchUsers(userPagination.currentPage + 1)}
                                disabled={userPagination.currentPage === userPagination.totalPages}
                                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
                            >
                                <AngleRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsCustomerModalOpen(false)}
                            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white uppercase tracking-tight transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Sheet Stock Selection Modal */}
            <Modal isOpen={isSheetModalOpen} onClose={() => setIsSheetModalOpen(false)} className="max-w-3xl">
                <div className="p-6 max-h-[90vh] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">📄 Select Stock</h3>
                        <div className="flex gap-2">
                            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                <button className="px-4 py-2 text-xs font-black bg-white dark:bg-gray-700 text-brand-600 rounded-lg shadow-sm">Sheets</button>
                                <button onClick={() => { setIsSheetModalOpen(false); setIsReelModalOpen(true); }} className="px-4 py-2 text-xs font-black text-gray-500 hover:text-brand-600 rounded-lg">Reels</button>
                            </div>
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl leading-5 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                            placeholder="Search by quality or GSM..."
                            value={sheetSearchTerm}
                            onChange={(e) => handleSheetSearch(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 mb-4 flex-1">
                        {recommendationData.recommended.length > 0 && (
                            <div className="mb-8">
                                <div className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse border-4 border-brand-100 dark:border-brand-900/50"></span>
                                    AI Smart Recommendations
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {recommendationData.recommended.map((s: any) => {
                                        const est = getSheetEstimate(s);
                                        const waste = formData.reqWidth && formData.reqHeight
                                            ? 100 - (((formData.reqWidth * 2.54 * formData.reqHeight * 2.54) / (s.sizes[0].width * s.sizes[0].height)) * 100)
                                            : 0;

                                        return (
                                            <div
                                                key={s._id}
                                                onClick={() => selectSheet(s)}
                                                className="p-5 border-2 border-brand-200 bg-brand-50/40 dark:bg-brand-500/5 dark:border-brand-500/20 rounded-3xl cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all flex flex-col sm:flex-row justify-between gap-4 group relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 px-4 py-1.5 bg-brand-500 text-white rounded-bl-2xl text-[10px] font-black uppercase tracking-widest">
                                                    Perfect Match
                                                </div>

                                                <div className="flex gap-5 items-start">
                                                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-brand-100 dark:border-brand-900/30 flex flex-col items-center justify-center text-brand-600 shrink-0">
                                                        <FileIcon className="w-8 h-8" />
                                                        <span className="text-[10px] font-black">{s.gsm}</span>
                                                    </div>

                                                    <div>
                                                        <div className="text-[10px] font-black text-brand-500/70 uppercase tracking-tighter mb-0.5">{s.sheetNo || 'Lot Record'}</div>
                                                        <h4 className="font-black text-xl text-gray-900 dark:text-white leading-none mb-2">
                                                            {s.sizes?.[0]?.width}×{s.sizes?.[0]?.height} <span className="text-xs opacity-40 font-bold">{s.sizeUnit || 'cm'}</span>
                                                            {s.sizes?.[0]?.grain && s.sizes?.[0]?.grain !== 'No issue' && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 uppercase align-middle">{s.sizes?.[0]?.grain}</span>}
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="px-2 py-0.5 bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 rounded-lg text-[9px] font-black uppercase">
                                                                {s.quality}
                                                            </span>
                                                            {waste > 0 && (
                                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${waste < 20 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                    {waste.toFixed(1)}% Waste
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center sm:items-end flex-row sm:flex-col justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-brand-100 dark:border-brand-900/30 pt-4 sm:pt-0 sm:pl-6 text-right">
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-brand-600 mb-0.5">~{est.toLocaleString()}</p>
                                                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-none">Sheets Available</p>
                                                    </div>
                                                    <div className="hidden sm:block mt-1">
                                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                                                            {(s.currentBalanceKg ?? s.totalWeightKg).toFixed(2)} Kg
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-3">
                            <span className="flex-1 h-px bg-gray-100 dark:bg-gray-800"></span>
                            Remaining Inventory
                            <span className="flex-1 h-px bg-gray-100 dark:bg-gray-800"></span>
                        </div>

                        {sheets.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {sheets.map((s) => {
                                    const est = getSheetEstimate(s);
                                    return (
                                        <div
                                            key={s._id}
                                            onClick={() => selectSheet(s)}
                                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex justify-between items-center group
                                                ${formData.sheetId === s._id
                                                    ? 'bg-brand-50 border-brand-500 dark:bg-brand-500/10'
                                                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-brand-500 hover:bg-brand-50/10'
                                                }`}
                                        >
                                            <div className="flex gap-4 items-center">
                                                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-colors
                                                    ${formData.sheetId === s._id
                                                        ? 'bg-brand-500 text-white'
                                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-brand-100 group-hover:text-brand-600'
                                                    }`}
                                                >
                                                    <FileIcon className="w-5 h-5 mb-0.5" />
                                                    <span className="text-[8px] font-black tracking-tighter uppercase">{s.gsm}g</span>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-tight leading-none mb-1">{s.sheetNo}</div>
                                                    <h4 className="font-black text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors leading-none">
                                                        {s.sizes?.[0]?.width} × {s.sizes?.[0]?.height} <span className="text-[10px] font-medium opacity-50">{s.sizeUnit || 'cm'}</span>
                                                        {s.sizes?.[0]?.grain && s.sizes?.[0]?.grain !== 'No issue' && <span className="ml-1 text-[8px] px-1 py-0.5 rounded bg-brand-50 text-brand-600 border border-brand-200 uppercase">{s.sizes?.[0]?.grain}</span>}
                                                    </h4>
                                                    <p className="text-[9px] text-gray-400 font-black uppercase mt-1">
                                                        {s.quality}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                                                    {est.toLocaleString()}
                                                </p>
                                                <p className="text-[9px] text-gray-400 uppercase font-black leading-none">Sheets</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-12 text-center text-gray-400 font-medium bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                                No sheets in stock.
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchSheets(sheetPagination.currentPage - 1)}
                                disabled={sheetPagination.currentPage === 1}
                                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
                            >
                                <AngleLeftIcon className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-black text-gray-900 dark:text-white mx-2">
                                {sheetPagination.currentPage} / {sheetPagination.totalPages}
                            </span>
                            <button
                                onClick={() => fetchSheets(sheetPagination.currentPage + 1)}
                                disabled={sheetPagination.currentPage === sheetPagination.totalPages}
                                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
                            >
                                <AngleRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsSheetModalOpen(false)}
                            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white uppercase tracking-tight transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Reel Selection Modal */}
            <Modal isOpen={isReelModalOpen} onClose={() => setIsReelModalOpen(false)} className="max-w-3xl">
                <div className="p-6 max-h-[90vh] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">🌀 Select Reel Stock</h3>
                        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                            <button onClick={() => { setIsReelModalOpen(false); setIsSheetModalOpen(true); }} className="px-4 py-2 text-xs font-black text-gray-500 hover:text-brand-600 rounded-lg">Sheets</button>
                            <button className="px-4 py-2 text-xs font-black bg-white dark:bg-gray-700 text-brand-600 rounded-lg shadow-sm">Reels</button>
                        </div>
                    </div>

                    <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 flex-1">
                        {recommendationData.reels.length > 0 && (
                            <div>
                                <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    Recommended Reels for Cutting
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {recommendationData.reels.map((r: any) => {
                                        return (
                                            <div
                                                key={r._id}
                                                onClick={() => selectSuggestedReel(r)}
                                                className="p-5 border-2 border-amber-100 bg-amber-50/20 dark:bg-amber-500/5 dark:border-amber-900/20 rounded-3xl group relative transition-all hover:border-amber-400 cursor-pointer"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="text-[10px] font-black text-amber-600 uppercase mb-1">Lot: {r.reelNo}</div>
                                                        <h4 className="text-xl font-black text-gray-900 dark:text-white">
                                                            {convertUnit(r.width, r.sizeUnit || 'cm', suggReq.widthUnit).toFixed(1)} {suggReq.widthUnit} Reel
                                                            <span className="text-[11px] text-amber-600/60 font-medium ml-1.5 opacity-60">({r.width} {r.sizeUnit || 'cm'})</span>
                                                        </h4>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">{r.quality} • {r.gsm} GSM • {r.currentBalanceKg} Kg</p>
                                                    </div>
                                                    <div className="absolute top-4 right-4 flex gap-2">
                                                        <button
                                                            type="button"
                                                            title="Download Waste Analysis PDF"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadPDF(r);
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </button>
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner
                                                            ${selectedSheet?._id === r._id
                                                                ? 'bg-brand-500 text-white ring-2 ring-brand-200'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                                            }`}
                                                        >
                                                            {r._id.startsWith('temp_') ? 'NEW' : 'RL'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 pt-4 border-t border-amber-100/50 dark:border-amber-900/20">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Grain Result</span>
                                                        <span className="font-black text-brand-600 px-2 py-0.5 bg-brand-50 rounded-md">
                                                            {r.stats?.detectedGrain || r.detectedGrain || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Cuts per Width</span>
                                                        <span className="font-black text-gray-900 dark:text-white">{r.stats?.ups || 0} Pieces (Ups)</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Total Sheets</span>
                                                        <span className="font-black text-green-600 truncate">{r.stats?.totalSheets.toLocaleString() || 0}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Side Waste (Trim)</span>
                                                        <span className="font-black text-red-500">{r.stats?.trimWaste.toFixed(1) || 0}%</span>
                                                    </div>

                                                    {r.stats && r.stats.pieceWiseWaste > 0 && (
                                                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-500/5 rounded-2xl border-2 border-red-100 dark:border-red-500/20">
                                                            <div className="flex justify-between items-center text-xs mb-1">
                                                                <span className="text-red-500 font-black uppercase tracking-tighter italic">Piece Waste (Nuksaan)</span>
                                                                <span className="font-black text-red-600">{r.stats.pieceWiseWaste.toLocaleString()} Pcs</span>
                                                            </div>
                                                            <div className="text-[10px] text-red-400 font-bold">
                                                                Estimated {r.stats.pieceWiseWastePercentage.toFixed(1)}% waste
                                                            </div>
                                                        </div>
                                                    )}

                                                    {r.stats && r.stats.safeStrips > 0 && (
                                                        <div className="flex items-center justify-between text-[11px] font-black uppercase text-green-600 mt-2 px-1">
                                                            <span>Safety Inventory</span>
                                                            <span>+{r.stats.safeStrips} Safe Cuts</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    className="w-full mt-5 py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl uppercase tracking-widest transition-all shadow-md shadow-amber-200/50"
                                                >
                                                    ✂ Cut to required size
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-3">
                            <span className="flex-1 h-px bg-gray-100 dark:bg-gray-800"></span>
                            Remaining Reel Inventory
                            <span className="flex-1 h-px bg-gray-100 dark:bg-gray-800"></span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {reels.filter(r => !recommendationData.reels.some(rr => rr._id === r._id)).map(r => (
                                <div key={r._id} className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex justify-between items-center group hover:border-brand-500 transition-all">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                            <FileIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600">Reel #{r.reelNo}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">{r.quality} • {r.gsm} GSM • {r.width} {r.sizeUnit}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-gray-900 dark:text-white">{fmt(r.currentBalanceKg)} Kg</div>
                                        <button
                                            onClick={() => {
                                                navigate('/sheet-management/add', { state: { reel: r, targetWidth: suggReq.width, targetHeight: suggReq.height } });
                                            }}
                                            className="text-[9px] font-black text-brand-600 uppercase hover:underline"
                                        >
                                            Cut
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                        <button onClick={() => setIsReelModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white uppercase tracking-tight transition-colors">Close</button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default NewSale;
