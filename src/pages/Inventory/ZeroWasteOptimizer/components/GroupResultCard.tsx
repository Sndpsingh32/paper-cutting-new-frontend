import React, { useState } from "react";
import { XCircle, AlertTriangle, FileDown, Share2, RotateCcw, ShoppingCart, Edit3, Save, X, Zap } from 'lucide-react';
import { GroupResult } from "../types";
import { generatePDF, shareReportPDF, shareOnWhatsApp } from "../sharing";
import { calcTotalWeightKg } from "../helpers";
import { postData } from "../../../../utility/utility";
import SaleFromRollModal from "./SaleFromRollModal";
import { toast } from "react-toastify";

const EMPTY_BOOL_MAP: Record<number, boolean> = Object.freeze({});
const EMPTY_NUM_MAP: Record<number, number> = Object.freeze({});

interface Props {
    gRes: GroupResult;
    gIdx: number;
    selectedRollIndices: Record<string, number>;
    setSelectedRollIndices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    stripModes: Record<string, Record<number, boolean>>;
    setStripModes: React.Dispatch<React.SetStateAction<Record<string, Record<number, boolean>>>>;
    manualSheets: Record<string, Record<number, number>>;
    setManualSheets: React.Dispatch<React.SetStateAction<Record<string, Record<number, number>>>>;
    skippedStrips: Record<string, Record<number, boolean>>;
    setSkippedStrips: React.Dispatch<React.SetStateAction<Record<string, Record<number, boolean>>>>;
    customerPhone: string;
    applyLocalOverride?: (groupKey: string, orderId: string, overrides: { reelSize?: string; cutSize?: string }) => void;
    resetLocalOverride?: (groupKey: string) => void;
    hasOverrides?: boolean;
    fetchReels: () => void;
}

const GroupResultCard: React.FC<Props> = ({
    gRes,
    gIdx,
    selectedRollIndices,
    setSelectedRollIndices,
    stripModes,
    setStripModes,
    manualSheets,
    skippedStrips,
    setSkippedStrips,
    customerPhone,
    applyLocalOverride,
    resetLocalOverride,
    hasOverrides,
    fetchReels
}) => {
    const [saleModalOpen, setSaleModalOpen] = useState(false);
    const [selectedStrips, setSelectedStrips] = useState<any[]>([]);
    const [selectedTrimWasteKg, setSelectedTrimWasteKg] = useState<number>(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState<Record<number, { w: string, h: string }>>({}); // si -> {w,h}

    const { group, rollOptions, noReelsFound } = gRes;
    const groupKey = group.key;

    // Use props instead of local state - stable references prevent infinite refetch loops
    const currentStripModes = stripModes[groupKey] ?? EMPTY_BOOL_MAP;
    const currentSkippedStrips = skippedStrips[groupKey] ?? EMPTY_BOOL_MAP;
    const fittable = rollOptions.filter(r => !r.cannotFit);
    const unfittable = rollOptions.filter(r => r.cannotFit);
    const groupLabel = `${group.quality || 'Any Quality'} · ${group.gsm} GSM`;
    const groupClients = group.orders.map(o => o.client || 'Party').join(', ');

    // 🎯 Robust Selection Matching
    // We determine the best matching roll based on the selected index from parent,
    // but we fall back to index 0 safely if results have shifted or changed.
    const rawIdxFromParent = selectedRollIndices[group.key] ?? 0;
    const bestRoll = fittable[rawIdxFromParent] || fittable[0];

    // Calculate the index within the filtered FITTABLE list for display purposes (e.g. Option #2)
    const selectedIdxInFittable = fittable.findIndex(r => r.reel._id === bestRoll?.reel?._id);
    const displayIdx = selectedIdxInFittable !== -1 ? selectedIdxInFittable : 0;

    const primaryUnit = group.orders[0]?.reelSizeUnit || 'mm';
    const formatSize = (mmVal: number, specificUnit?: string) => {
        const u = specificUnit || primaryUnit;
        if (u === 'inch') return { val: parseFloat((mmVal / 25.4).toFixed(2)).toString(), unit: 'inch' };
        if (u === 'cm') return { val: parseFloat((mmVal / 10).toFixed(2)).toString(), unit: 'cm' };
        return { val: parseFloat(mmVal.toFixed(1)).toString(), unit: 'mm' };
    };

    const formatReelWidth = (reel: { width: number, sizeUnit: string }) => {
        let inMm = reel.width;
        if (reel.sizeUnit === 'inch') inMm = reel.width * 25.4;
        else if (reel.sizeUnit === 'cm') inMm = reel.width * 10;

        const formatted = formatSize(inMm, primaryUnit);
        return `${formatted.val} ${formatted.unit}`;
    };

    // Calculate dynamic stats - backend-primary logical calc, local fallback
    const [calculatedStats, setCalculatedStats] = useState({ totalWeightKg: 0, totalOutputSheets: 0 });
    const [trimStats, setTrimStats] = useState({ skippedWidthMm: 0, effectiveTrimWasteMm: 0, effectiveTrimWastePercent: 0, effectiveIsZeroWaste: false });
    React.useEffect(() => {
        if (!bestRoll) { setCalculatedStats({ totalWeightKg: 0, totalOutputSheets: 0 }); setTrimStats({ skippedWidthMm: 0, effectiveTrimWasteMm: 0, effectiveTrimWastePercent: 0, effectiveIsZeroWaste: false }); return; }
        const groupManualSheets = manualSheets[groupKey] ?? EMPTY_NUM_MAP;
        const stripModesPayload = bestRoll.stripsLayout.map((_: any, idx: number) => ({
            strip_idx: idx,
            is_full: !!currentStripModes[idx],
            manual_sheets: groupManualSheets[idx] !== undefined ? Number(groupManualSheets[idx]) : null,
            is_skipped: !!currentSkippedStrips[idx],
        }));
        let cancelled = false;
        let timer: any = null;
        const localTrim = () => {
            const skippedWidthMm = bestRoll.stripsLayout.reduce((sum: number, strip: any, sIdx: number) => sum + (currentSkippedStrips[sIdx] ? strip.reelSize : 0), 0);
            const effectiveTrimWasteMm = (bestRoll.trimWasteMm || 0) + skippedWidthMm;
            return { skippedWidthMm, effectiveTrimWasteMm, effectiveTrimWastePercent: bestRoll.reelWidth > 0 ? (effectiveTrimWasteMm / bestRoll.reelWidth) * 100 : 0, effectiveIsZeroWaste: effectiveTrimWasteMm === 0 };
        };
        const run = async () => {
            try {
                const res = await postData('/zerowaste/simulate-fulfillment', { bestOpt: bestRoll, orders: group.orders, stripModes: stripModesPayload });
                if (!cancelled && res?.success && res?.data) {
                    setCalculatedStats({ totalWeightKg: Number(res.data.total_weight_kg || 0), totalOutputSheets: Number(res.data.total_output_sheets || 0) });
                    setTrimStats({
                        skippedWidthMm: Number(res.data.skipped_width_mm || 0),
                        effectiveTrimWasteMm: Number(res.data.effective_trim_waste_mm ?? bestRoll.trimWasteMm ?? 0),
                        effectiveTrimWastePercent: Number(res.data.effective_trim_waste_percent ?? bestRoll.trimWastePercent ?? 0),
                        effectiveIsZeroWaste: !!res.data.effective_is_zero_waste,
                    });
                    return;
                }
            } catch {}
            if (cancelled) return;
            const local = bestRoll.stripsLayout.reduce((acc: any, strip: any, sIdx: number) => {
                if (!!currentSkippedStrips[sIdx]) return acc;
                const sheets = groupManualSheets[sIdx] !== undefined ? Number(groupManualSheets[sIdx]) : (!!currentStripModes[sIdx] ? strip.totalSheets : strip.usableSheets);
                acc.totalWeightKg += calcTotalWeightKg(strip.reelSize, strip.cutSize, group.gsm, sheets);
                acc.totalOutputSheets += sheets;
                return acc;
            }, { totalWeightKg: 0, totalOutputSheets: 0 });
            setCalculatedStats(local);
            setTrimStats(localTrim());
        };
        timer = setTimeout(run, 250); // debounce to avoid request storms on rapid toggles/renders
        return () => { cancelled = true; if (timer) clearTimeout(timer); };
    }, [bestRoll, currentStripModes, currentSkippedStrips, manualSheets, groupKey, group.gsm, group.orders]);

    const { skippedWidthMm, effectiveTrimWasteMm, effectiveTrimWastePercent, effectiveIsZeroWaste } = trimStats;

    const handleCreateSale = () => {
        if (!bestRoll) return;

        // 1. Group items by physical slit position to avoid double-counting width
        const slitGroups: { [key: string]: any[] } = {};
        bestRoll.stripsLayout.forEach((s, sIdx) => {
            if (currentSkippedStrips[sIdx]) return;
            // Now we have a reliable slitIndex from the logic
            const slitKey = s.slitIndex !== undefined ? `slit-${s.slitIndex}` : `pos-${sIdx}`;
            if (!slitGroups[slitKey]) slitGroups[slitKey] = [];
            slitGroups[slitKey].push({ ...s, originalIdx: sIdx });
        });

        // 2. Process each physical slit
        const processedStrips: any[] = [];
        Object.values(slitGroups).forEach(groupStrips => {
            // All items in this group share the same width (one after another)
            const totalSlitLength = groupStrips.reduce((sum, s) => sum + (s.totalSheets * s.cutSize), 0);
            const slitWidthRatio = groupStrips[0].reelSize / bestRoll.reelWidth;
            const totalSlitWeight = slitWidthRatio * (Number(bestRoll.reel.currentBalanceKg) || 0);

            groupStrips.forEach(s => {
                // Distribute the slit's weight among items in this specific slit
                const itemLengthRatio = totalSlitLength > 0
                    ? (s.totalSheets * s.cutSize) / totalSlitLength
                    : (1 / groupStrips.length);
                const itemFullWeight = totalSlitWeight * itemLengthRatio;

                processedStrips.push({
                    ...s,
                    sheets: !!currentStripModes[s.originalIdx] ? s.totalSheets : s.usableSheets,
                    mode: !!currentStripModes[s.originalIdx] ? 'Full' : 'Fixed',
                    fullStripWeight: parseFloat(itemFullWeight.toFixed(4))
                });
            });
        });

        const totalStripsWeight = processedStrips.reduce((sum, s) => sum + s.fullStripWeight, 0);
        const calculatedTrimWasteKg = Math.max(0, (Number(bestRoll.reel.currentBalanceKg) || 0) - totalStripsWeight);

        setSelectedStrips(processedStrips);
        setSelectedTrimWasteKg(calculatedTrimWasteKg);
        setSaleModalOpen(true);
    };

    const handleSaleComplete = () => {
        toast.success('Sale completed successfully!');
        fetchReels();
    };

    const saleModalData = selectedStrips?.length && bestRoll ? {
        reel: bestRoll.reel,
        strips: selectedStrips,
        quality: group.quality || 'Unknown',
        gsm: group.gsm,
        trimWasteKg: selectedTrimWasteKg,
        remainingWidthMm: effectiveTrimWasteMm,
        totalWidthMm: bestRoll.reelWidth,
        trimIsUsable: bestRoll.trimIsUsable
    } : null;

    return (
        <>
            <div key={group.key} id={`group-${group.key}`} className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b border-brand-100/70 bg-gradient-to-br from-brand-50/80 via-white to-accent-50/30 dark:border-brand-500/15 dark:from-brand-500/10 dark:via-gray-900 dark:to-accent-500/5 sm:px-7 px-6 py-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-stretch xl:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                            <div className="relative shrink-0">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-black text-brand-700 shadow-sm ring-1 ring-brand-100 dark:bg-gray-900 dark:text-brand-300 dark:ring-brand-500/20">
                                    {String(gIdx + 1).padStart(2, '0')}
                                </div>
                                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-900" title="Active group" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand-700 shadow-sm dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
                                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                                        Optimization Group
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                        {group.orders.length} order{group.orders.length > 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                                    <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-[28px]">
                                        {groupLabel}
                                    </h3>
                                    <p className="pb-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Production planning summary
                                    </p>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1.5 ring-1 ring-gray-100 dark:bg-gray-900/60 dark:ring-gray-800">
                                        <span className="font-semibold text-gray-400 dark:text-gray-500">Clients</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-100">{groupClients}</span>
                                    </span>
                                    {hasOverrides && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            Manual overrides applied
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="xl:w-[52%]">
                            <div className="mb-2 flex items-center justify-between px-1">
                                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">Order Requirements</p>
                                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">Size · Quantity</p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {group.orders.map((o, oi) => (
                                    <div key={o.id} className="group rounded-xl border border-gray-100 bg-white/90 px-3.5 py-3 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50/30 dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{o.client || `Party ${oi + 1}`}</p>
                                                <p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                                    {o.reelSize}{o.reelSizeUnit} × {o.cutSize}{o.cutSizeUnit}
                                                </p>
                                            </div>
                                            <div className="shrink-0 rounded-lg bg-brand-50 px-2 py-1 text-right dark:bg-brand-500/10">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-brand-500 dark:text-brand-400">Qty</p>
                                                <p className="text-xs font-black text-brand-700 dark:text-brand-300">{Number(o.qty).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── No Reels Found ── */}
                {noReelsFound && (
                    <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-5 dark:border-gray-800 dark:bg-gray-800/30">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-500/10">
                            <XCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">No roll stock available for this group</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{groupLabel} ke liye matching roll inventory nahi mila.</p>
                        </div>
                    </div>
                )}

                {/* ── Cannot Fit Warning ── */}
                {!noReelsFound && fittable.length === 0 && unfittable.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-5 border-t border-amber-200">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-black text-amber-800 dark:text-amber-300 text-sm">
                                    {unfittable[0].cannotFitReason}
                                </p>
                                <p className="text-amber-700 dark:text-amber-400 text-xs mt-1 font-medium">
                                    Stock mein available rolls ({unfittable.length}):
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {unfittable.map(r => (
                                        <span key={r.reel._id} className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-amber-300 rounded-lg text-xs font-black text-amber-700">
                                            Roll #{r.reel.reelNo} — {formatReelWidth(r.reel)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Roll Options Tabs ── */}
                {!noReelsFound && fittable.length > 1 && (
                    <div className="border-y border-gray-100 bg-gray-50/70 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/20">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Available Roll Options</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Select the best plan for production</p>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                        {fittable.map((opt, oIdx) => {
                            const active = opt.reel._id === bestRoll?.reel?._id;
                            const cw = opt.trimWastePercent;
                            return (
                                <button
                                    key={`${opt.reel._id}-${oIdx}`}
                                    onClick={() => {
                                        setSelectedRollIndices(prev => ({ ...prev, [group.key]: oIdx }));
                                    }}
                                    className={`min-w-[190px] shrink-0 rounded-2xl border px-4 py-3 text-left transition-all ${active
                                        ? 'border-brand-300 bg-white shadow-theme-sm ring-4 ring-brand-500/10 dark:border-brand-500/40 dark:bg-gray-900'
                                        : 'border-gray-200 bg-white/70 hover:border-gray-300 hover:bg-white dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-gray-600'
                                        }`}
                                >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className={`text-xs font-black ${active ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-200'}`}>
                                            {opt.reel.isPattiStock ? 'Strip' : 'Roll'} #{opt.reel.reelNo}
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${opt.wasteCategory === 'zero' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : opt.wasteCategory === 'low' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'}`}>
                                            {opt.wasteCategory}
                                        </span>
                                    </div>
                                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        {formatReelWidth(opt.reel)} · {opt.reel.currentBalanceKg.toFixed(1)}kg
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-[11px]">
                                        <span className="font-medium text-gray-400 dark:text-gray-500">Trim waste</span>
                                        <span className={`font-black ${cw > 5 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{cw.toFixed(1)}%</span>
                                    </div>
                                </button>
                            );
                        })}
                        </div>
                    </div>
                )}

                {/* ── Selected Roll Details ── */}
                {fittable.length > 0 && (() => {
                    const combinedWaste = bestRoll.trimWastePercent;
                    const isPartialReel = bestRoll.reel.currentBalanceKg < (bestRoll.reel.totalWeightKg || 0) && (bestRoll.reel.totalWeightKg || 0) > 0;
                    const isReadyStrip = bestRoll.reel.isPattiStock;
                    const headerBg = isReadyStrip
                        ? 'bg-emerald-600'
                        : bestRoll.wasteCategory === 'zero'
                            ? 'bg-green-500' : bestRoll.wasteCategory === 'low'
                                ? 'bg-yellow-500' : 'bg-gray-500';

                    return (
                        <div className="border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                            <div className={`${headerBg} px-6 py-4`}>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/90">
                                            {displayIdx === 0 ? 'Best Match' : `Option #${displayIdx + 1}`}
                                        </span>
                                        <div>
                                            <p className="text-base font-black text-white">
                                                {isReadyStrip ? 'Ready Strip' : 'Roll'} #{bestRoll.reel.reelNo}
                                            </p>
                                            <p className="text-xs font-medium text-white/80">
                                                {formatReelWidth(bestRoll.reel)} wide · {bestRoll.reel.gsm} GSM · {bestRoll.reel.quality} · {bestRoll.reel.currentBalanceKg.toFixed(1)} Kg
                                            </p>
                                        </div>
                                        {isReadyStrip ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                                                <Zap className="h-3 w-3 fill-current" /> Ready Strip
                                            </span>
                                        ) : isPartialReel ? (
                                            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase text-white">Leftover Roll</span>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={handleCreateSale}
                                            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-gray-900 transition hover:bg-gray-100"
                                        >
                                            <ShoppingCart className="h-3.5 w-3.5" />
                                            Create Sale
                                        </button>
                                        {bestRoll.isZeroWaste ? (
                                            <span className="rounded-xl bg-white/15 px-3 py-2 text-xs font-black text-white ring-1 ring-white/20">Zero Waste</span>
                                        ) : combinedWaste <= 10 ? (
                                            <span className="rounded-xl bg-amber-400/20 px-3 py-2 text-xs font-black text-white ring-1 ring-amber-200/30">{combinedWaste.toFixed(1)}% Trim · Review</span>
                                        ) : (
                                            <span className="rounded-xl bg-red-500/20 px-3 py-2 text-xs font-black text-white ring-1 ring-red-200/30">{combinedWaste.toFixed(1)}% Trim · High Waste</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border-b border-gray-100 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-900">
                                <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                                    <div className="min-w-0 xl:w-[260px] xl:shrink-0">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Production Decision</p>
                                        <p className={`mt-1.5 text-lg font-black leading-snug ${
                                            (bestRoll.wasteCategory === 'zero' || bestRoll.wasteCategory === 'low')
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : bestRoll.wasteCategory === 'medium'
                                                    ? 'text-amber-500'
                                                    : 'text-red-500'
                                        }`}>
                                            {bestRoll.recommendation}
                                        </p>
                                        {bestRoll.wasteReasons.length > 0 && (
                                            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                {bestRoll.wasteReasons.slice(0, 2).join(' · ')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="hidden h-14 w-px bg-gray-200 dark:bg-gray-700 xl:block" />

                                    <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Output</p>
                                            <p className="mt-1 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                                                {calculatedStats.totalOutputSheets.toLocaleString()}
                                                <span className="ml-1 text-xs font-semibold text-gray-400">sht</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Required</p>
                                            <p className="mt-1 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                                                {bestRoll.totalOrderedSheets.toLocaleString()}
                                                <span className="ml-1 text-xs font-semibold text-gray-400">sht</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Weight</p>
                                            <p className="mt-1 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                                                {calculatedStats.totalWeightKg.toFixed(2)}
                                                <span className="ml-1 text-xs font-semibold text-gray-400">kg</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Side Cut</p>
                                            <p className={`mt-1 text-2xl font-black tracking-tight ${effectiveIsZeroWaste ? 'text-emerald-600 dark:text-emerald-400' : (effectiveTrimWasteMm > 20 && effectiveTrimWasteMm < 450) ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
                                                {formatSize(effectiveTrimWasteMm).val}
                                                <span className="ml-1 text-xs font-semibold text-gray-400">{formatSize(effectiveTrimWasteMm).unit}</span>
                                            </p>
                                            <p className="text-[11px] text-gray-400">{effectiveTrimWastePercent.toFixed(1)}% trim</p>
                                        </div>
                                    </div>
                                </div>

                                {(skippedWidthMm > 0 || bestRoll.actionableAdjustment) && (
                                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                                        {skippedWidthMm > 0 && (
                                            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                                +{formatSize(skippedWidthMm).val} {formatSize(skippedWidthMm).unit} from skipped strip
                                            </span>
                                        )}
                                        {bestRoll.actionableAdjustment && (
                                            <div className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 dark:bg-amber-500/10">
                                                <span className="text-xs font-medium text-amber-800 dark:text-amber-200">{bestRoll.actionableAdjustment.label} for zero waste</span>
                                                {applyLocalOverride && (
                                                    <button
                                                        onClick={async () => {
                                                            const exactMmVal = String(bestRoll.actionableAdjustment!.adjustToWidthMm);
                                                            const isRotated = bestRoll.actionableAdjustment!.isWidthRotated;
                                                            const overrides = isRotated ? { cutSize: exactMmVal } : { reelSize: exactMmVal };
                                                            applyLocalOverride(groupKey, bestRoll.actionableAdjustment!.orderId, overrides);
                                                            toast.info(`Adjusted local layout to ${exactMmVal}mm!`);
                                                        }}
                                                        className="rounded-md bg-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900 transition hover:bg-amber-300 dark:bg-amber-400/20 dark:text-amber-100 dark:hover:bg-amber-400/30"
                                                    >
                                                        Apply
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Layout Content */}
                            <div className="p-6">
                                <div className="mb-6 overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-gray-800">
                                                <th className="pb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Party / Segment</th>
                                                <th className="pb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <div className="flex items-center gap-3">
                                                        <span>Cutting Plan</span>
                                                        <button
                                                            onClick={() => {
                                                                if (isEditing) {
                                                                    // Save logic
                                                                    Object.entries(editValues).forEach(([si, val]) => {
                                                                        if (applyLocalOverride) {
                                                                            const s = bestRoll.stripsLayout[Number(si)];
                                                                            if (!s) return;

                                                                            let wMm = parseFloat(val.w);
                                                                            let hMm = parseFloat(val.h);
                                                                            if (isNaN(wMm) || isNaN(hMm)) return;

                                                                            if (primaryUnit === 'inch') { wMm *= 25.4; hMm *= 25.4; }
                                                                            else if (primaryUnit === 'cm') { wMm *= 10; hMm *= 10; }

                                                                            applyLocalOverride(groupKey, s.orderId, {
                                                                                reelSize: wMm.toString(),
                                                                                cutSize: hMm.toString()
                                                                            });
                                                                        }
                                                                    });
                                                                    setIsEditing(false);
                                                                    toast.success("Optimization request updated with manual sizes!");
                                                                } else {
                                                                    // Start editing
                                                                    const initial: Record<number, { w: string, h: string }> = {};
                                                                    bestRoll.stripsLayout.forEach((s, idx) => {
                                                                        initial[idx] = {
                                                                            w: formatSize(s.reelSize).val,
                                                                            h: formatSize(s.cutSize).val
                                                                        };
                                                                    });
                                                                    setEditValues(initial);
                                                                    setIsEditing(true);
                                                                }
                                                            }}
                                                            className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1.5 transition-all shadow-xs ${isEditing ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100'
                                                                }`}
                                                        >
                                                            {isEditing ? <><Save className="w-2.5 h-2.5" /> Save Changes</> : <><Edit3 className="w-2.5 h-2.5" /> Edit Plan</>}
                                                        </button>
                                                        {isEditing && (
                                                            <button
                                                                onClick={() => setIsEditing(false)}
                                                                className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[8px] font-black uppercase flex items-center gap-1.5 hover:bg-red-100"
                                                            >
                                                                <X className="w-2.5 h-2.5" /> Cancel
                                                            </button>
                                                        )}
                                                        {hasOverrides && !isEditing && (
                                                            <button
                                                                onClick={() => resetLocalOverride && resetLocalOverride(groupKey)}
                                                                className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[8px] font-black uppercase flex items-center gap-1.5 hover:bg-amber-100 shadow-xs"
                                                            >
                                                                <RotateCcw className="w-2.5 h-2.5" /> Undo Changes
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="pb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Output</th>
                                                <th className="pb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Utility</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {bestRoll.stripsLayout.map((s, si) => {
                                                const isFull = !!currentStripModes[si];
                                                const isSkipped = !!currentSkippedStrips[si];

                                                // --- Running balance (moved here from IIFE) ---
                                                const orderStrips = bestRoll.stripsLayout.filter((gs: any) => gs.orderId === s.orderId);
                                                let runningFulfilled = 0;
                                                const currentOrderIdx = orderStrips.findIndex((gs: any) => gs === s);
                                                for (let i = 0; i < currentOrderIdx; i++) {
                                                    const prevStripIdx = bestRoll.stripsLayout.findIndex(bs => bs === orderStrips[i]);
                                                    if (!!currentSkippedStrips[prevStripIdx]) continue; // skip contributes 0
                                                    const prevIsFull = !!currentStripModes[prevStripIdx];
                                                    const prevOutput = prevIsFull ? orderStrips[i].totalSheets : orderStrips[i].usableSheets;
                                                    runningFulfilled += prevOutput;
                                                }

                                                // Strip role flags
                                                const currentOutput = isSkipped ? 0 : (isFull ? s.totalSheets : s.usableSheets);
                                                const hasExtra = s.totalSheets > s.usableSheets;
                                                const showToggle = hasExtra || isSkipped; // Show buttons only if there's a choice or we need to undo a skip

                                                // Utility calculations
                                                const initialTarget = s.requestedSheets || 0;
                                                const currentTarget = Math.max(0, initialTarget - runningFulfilled);

                                                // Check if a subsequent strip for same order was skipped (customer accepted reduced)
                                                const hasSubsequentSkippedStrip = orderStrips.slice(currentOrderIdx + 1).some(laterStrip => {
                                                    const laterIdx = bestRoll.stripsLayout.findIndex(bs => bs === laterStrip);
                                                    return !!currentSkippedStrips[laterIdx];
                                                });

                                                const shortfall = Math.max(0, currentTarget - currentOutput);
                                                const isShortfallAccepted = shortfall > 0 && hasSubsequentSkippedStrip && !isSkipped;
                                                const isShortfall = shortfall > 0 && !isSkipped && !hasSubsequentSkippedStrip;
                                                const extraQty = Math.max(0, currentOutput - currentTarget);
                                                const isExtra = extraQty > 0 && !isSkipped;

                                                return (
                                                    <tr key={si} className={`group transition-colors ${isSkipped ? 'opacity-50 bg-red-50/30 dark:bg-red-900/10' : isFull ? 'bg-indigo-50/10' : ''}`}>
                                                        <td className="py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-xs uppercase group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                                    P{si + 1}
                                                                </div>
                                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{s.client}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    {isEditing ? (
                                                                        <div className="flex items-center gap-1.5 px-1 py-0.5">
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={editValues[si]?.w || ''}
                                                                                onChange={(e) => setEditValues(prev => ({ ...prev, [si]: { ...(prev[si] || { h: formatSize(s.cutSize).val }), w: e.target.value } }))}
                                                                                className="w-20 px-1 py-1 bg-transparent border-b-2 border-indigo-200 text-[13px] font-black text-indigo-700 focus:outline-none focus:border-indigo-500 transition-all text-center"
                                                                            />
                                                                            <span className="text-[10px] font-black text-gray-400">W</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs font-black px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30">
                                                                            {formatSize(s.reelSize, group.orders.find(o => o.id === s.orderId)?.reelSizeUnit).val} <span className="ml-1 text-[10px] opacity-70">{formatSize(s.reelSize, group.orders.find(o => o.id === s.orderId)?.reelSizeUnit).unit} (W)</span>
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[10px] font-bold text-gray-300">×</span>
                                                                    {isEditing ? (
                                                                        <div className="flex items-center gap-1.5 px-1 py-0.5">
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={editValues[si]?.h || ''}
                                                                                onChange={(e) => setEditValues(prev => ({ ...prev, [si]: { ...(prev[si] || { w: formatSize(s.reelSize).val }), h: e.target.value } }))}
                                                                                className="w-20 px-1 py-1 bg-transparent border-b-2 border-violet-200 text-[13px] font-black text-violet-700 focus:outline-none focus:border-violet-500 transition-all text-center"
                                                                            />
                                                                            <span className="text-[10px] font-black text-gray-400">H</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs font-black text-violet-600 bg-violet-50 dark:bg-violet-900/30 px-2 py-1 rounded-md">
                                                                            {formatSize(s.cutSize, group.orders.find(o => o.id === s.orderId)?.cutSizeUnit).val} <span className="ml-1 text-[10px] opacity-70">{formatSize(s.cutSize, group.orders.find(o => o.id === s.orderId)?.cutSizeUnit).unit} (H)</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {s.isRotated && <span className="text-[9px] font-black text-brand-500 uppercase tracking-tighter flex items-center gap-1">
                                                                    <RotateCcw className="w-2.5 h-2.5" /> Rotated ↺
                                                                </span>}
                                                            </div>
                                                        </td>

                                                        {/* ── Output + Toggle ── */}
                                                        <td className="py-4 text-center">
                                                            <div className="flex flex-col items-center gap-2">
                                                                {/* Sheet count */}
                                                                <div className={`font-black text-sm transition-all duration-300 ${isSkipped ? 'text-red-300' :
                                                                    isFull ? 'text-indigo-600 scale-110' : 'text-gray-800 dark:text-white'
                                                                    }`}>
                                                                    {isSkipped
                                                                        ? <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-500 px-2 py-0.5 rounded-md font-black uppercase tracking-tight">SKIPPED</span>
                                                                        : currentOutput.toLocaleString()
                                                                    }
                                                                </div>

                                                                {/* Fixed / Full / Skip toggle */}
                                                                {showToggle && (
                                                                    <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm gap-0.5">
                                                                        {/* Fixed & Full only shown when strip produces more than needed */}
                                                                        {hasExtra && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setStripModes(prev => ({ ...prev, [groupKey]: { ...(prev[groupKey] || {}), [si]: false } }));
                                                                                        setSkippedStrips(prev => ({ ...prev, [groupKey]: { ...(prev[groupKey] || {}), [si]: false } }));
                                                                                    }}
                                                                                    className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${!isFull && !isSkipped ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                                                                                >
                                                                                    Fixed
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setStripModes(prev => ({ ...prev, [groupKey]: { ...(prev[groupKey] || {}), [si]: true } }));
                                                                                        setSkippedStrips(prev => ({ ...prev, [groupKey]: { ...(prev[groupKey] || {}), [si]: false } }));
                                                                                    }}
                                                                                    className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${isFull && !isSkipped ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                                                                                >
                                                                                    Full
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {/* Skip — only show if we have extra or it's been skipped manually */}
                                                                        <button
                                                                            onClick={() => {
                                                                                const nextSkipped = !isSkipped;
                                                                                setSkippedStrips(prev => ({ ...prev, [groupKey]: { ...(prev[groupKey] || {}), [si]: nextSkipped } }));
                                                                                if (nextSkipped) {
                                                                                    // Reset to fixed when skipping
                                                                                    setStripModes(prev => ({ ...prev, [groupKey]: { ...(prev[groupKey] || {}), [si]: false } }));
                                                                                }
                                                                            }}
                                                                            className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${isSkipped ? 'bg-red-100 dark:bg-red-900/40 text-red-700 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-red-400'}`}
                                                                        >
                                                                            {isSkipped ? '↩ Undo' : 'Skip'}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* ── Utility ── */}
                                                        <td className="py-4 text-right">
                                                            <div className="flex flex-col items-end">
                                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Target:</span>
                                                                    <span className="text-sm font-black text-gray-800 dark:text-white">{currentTarget.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-0.5 border-t border-gray-100 dark:border-gray-800 pt-1.5 w-full">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[10px] font-bold text-blue-400 uppercase">Selected:</span>
                                                                        <span className={`text-sm font-black ${isSkipped ? 'text-red-300 line-through' : isFull ? 'text-indigo-600' : 'text-blue-600'}`}>
                                                                            {currentOutput.toLocaleString()}
                                                                        </span>
                                                                    </div>

                                                                    {/* Customer accepted reduced — shown when THIS strip is skipped */}
                                                                    {isSkipped && (
                                                                        <div className="mt-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
                                                                            <span className="text-[10px] font-black text-emerald-600">✅ Customer Accepted Reduced</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Shortfall accepted — shown on P1 when its P2 is skipped */}
                                                                    {isShortfallAccepted && (
                                                                        <div className="mt-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
                                                                            <span className="text-[10px] font-black text-emerald-600">✅ -{shortfall.toLocaleString()} Accepted by Customer</span>
                                                                        </div>
                                                                    )}

                                                                    {isExtra && (
                                                                        <div className="mt-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
                                                                            <span className="text-[10px] font-black text-amber-600">+{extraQty.toLocaleString()} EXTRA</span>
                                                                        </div>
                                                                    )}

                                                                    {isShortfall && (
                                                                        <div className="mt-1 px-2 py-0.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
                                                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                                            <span className="text-[10px] font-black text-red-600">SHORTFALL: -{shortfall.toLocaleString()}</span>
                                                                        </div>
                                                                    )}

                                                                    {!isExtra && !isShortfall && !isSkipped && (
                                                                        <div className="mt-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded text-[10px] font-black text-green-600 uppercase">
                                                                            Exact Fit
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}


                                            {/* Result Summary Footers */}
                                            <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                                                <td className="py-4 px-4 font-black text-[10px] text-gray-400 uppercase tracking-widest" colSpan={2}>Roll Profile Summary</td>
                                                <td className="py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-black text-indigo-600">{calculatedStats.totalOutputSheets.toLocaleString()} Sht</span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase">Selected Total</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right pr-4">
                                                    <span className="text-xs font-black text-gray-700 dark:text-gray-300">{formatSize(bestRoll.totalReelWidthUsed).val} {formatSize(bestRoll.totalReelWidthUsed).unit}</span>
                                                    <span className="text-[10px] font-black text-gray-400 mx-2">/</span>
                                                    <span className="text-xs font-black text-gray-400">{formatSize(bestRoll.reelWidth).val} {formatSize(bestRoll.reelWidth).unit} Used</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-4 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            onClick={() => generatePDF(bestRoll, currentStripModes)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-black dark:bg-white dark:text-gray-900"
                                        >
                                            <FileDown className="h-4 w-4" /> PDF Report
                                        </button>
                                        <button
                                            onClick={() => shareReportPDF(bestRoll, currentStripModes)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                        >
                                            <Share2 className="h-4 w-4" /> Share Report
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => shareOnWhatsApp(customerPhone, bestRoll, "Order Summary: Mixed Selections", currentStripModes)}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-700"
                                    >
                                        <Share2 className="h-4 w-4" /> Share on WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            <SaleFromRollModal
                isOpen={saleModalOpen}
                onClose={() => setSaleModalOpen(false)}
                saleData={saleModalData}
                onSaleComplete={handleSaleComplete}
            />
        </>
    );
};

export default GroupResultCard;
