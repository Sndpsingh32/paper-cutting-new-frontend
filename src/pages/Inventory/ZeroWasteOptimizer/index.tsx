import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import { postData, toCm as toCmUtil } from "../../../utility/utility";
import { Reel, SizeUnit } from "../../../types/reel";
import PageMeta from "../../../components/common/PageMeta";
import { AngleLeftIcon } from "../../../icons";
import { XCircle, ChevronRight } from "lucide-react";
import { Resource } from "../../../types/permission";
import ReadPermissionGuard from "../../../components/auth/ReadPermissionGuard";

// Components
import OrderInputTable from "./components/OrderInputTable";
import IndividualBestPlans from "./components/IndividualBestPlans";
import FinalRollSummary from "./components/FinalRollSummary";
import GroupResultCard from "./components/GroupResultCard";

// Logic & Utils
import { OrderRow, OptimizationResult, OrderGroup, GroupResult } from "./types";
import { createSeededRandom, normalizeOrderQuality, isOrderQualityMatch } from "./helpers";
import { optimizeOrders } from "./logic";

const ZEROWASTE_PY_ENABLED = String((import.meta as any).env?.VITE_ZEROWASTE_PYTHON_ENABLED ?? "true").toLowerCase() !== "false";

async function optimizeOrdersPrimary(reel: Reel, orders: OrderRow[], rnd: () => number, originalOrders?: OrderRow[]): Promise<OptimizationResult[]> {
    // Primary: Python/OR-Tools via Node proxy. Legacy TS is fallback-only for resilience.
    if (ZEROWASTE_PY_ENABLED) {
        try {
            const res = await postData("/zerowaste/optimize-orders", {
                reel,
                orders,
                originalOrders: originalOrders || orders,
                seed: 42,
            });
            if (res?.success && Array.isArray(res?.data?.results)) {
                console.info('[ZeroWaste] optimize-orders source', { engine: res?.data?.engine || 'python', source: 'backend-proxy' });
                return res.data.results as OptimizationResult[];
            }
            console.warn("ZeroWaste Python proxy returned non-success, falling back to legacy TS optimizer", res);
        } catch (e) {
            console.warn("ZeroWaste Python proxy failed, falling back to legacy TS optimizer", e);
        }
    }
    return optimizeOrders(reel, orders, rnd, originalOrders);
}

const ORDERS_STORAGE_KEY = "zero-waste-orders";
const ORDERS_UNIT_VERSION_KEY = "zero-waste-orders-unit-version";
const ORDERS_UNIT_VERSION = "inch-default-v1";

const createEmptyOrder = (): OrderRow => ({
    id: Math.random().toString(36).substr(2, 9),
    client: "", quality: "", gsm: "",
    reelSize: "", reelSizeUnit: SizeUnit.INCH,
    cutSize: "", cutSizeUnit: SizeUnit.INCH,
    packets: "", sheetsPerPacket: "100", qty: "",
    grain: "Any"
});

const normalizeOrderUnits = (order: OrderRow): OrderRow => ({
    ...order,
    reelSizeUnit: order.reelSizeUnit === SizeUnit.CM ? SizeUnit.INCH : (order.reelSizeUnit || SizeUnit.INCH),
    cutSizeUnit: order.cutSizeUnit === SizeUnit.CM ? SizeUnit.INCH : (order.cutSizeUnit || SizeUnit.INCH),
});

const loadOrdersFromStorage = (): OrderRow[] => {
    const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!saved) return [createEmptyOrder()];

    try {
        const parsed = JSON.parse(saved) as OrderRow[];
        if (!Array.isArray(parsed) || parsed.length === 0) return [createEmptyOrder()];

        const needsUnitMigration = localStorage.getItem(ORDERS_UNIT_VERSION_KEY) !== ORDERS_UNIT_VERSION;
        const orders = parsed.map(normalizeOrderUnits);

        if (needsUnitMigration) {
            localStorage.setItem(ORDERS_UNIT_VERSION_KEY, ORDERS_UNIT_VERSION);
            localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
        }

        return orders;
    } catch (e) {
        console.error("Failed to parse saved orders", e);
        return [createEmptyOrder()];
    }
};

export default function ZeroWasteOptimizer() {
    const navigate = useNavigate();

    // 🔥 DATA PERSISTENCE
    const [orders, setOrders] = useState<OrderRow[]>(loadOrdersFromStorage);

    const [customerPhone, setCustomerPhone] = useState(() => {
        return localStorage.getItem("zero-waste-phone") || "";
    });

    useEffect(() => {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    }, [orders]);

    useEffect(() => {
        localStorage.setItem("zero-waste-phone", customerPhone);
    }, [customerPhone]);

    const [isLoading, setIsLoading] = useState(false);
    const [groupResults, setGroupResults] = useState<GroupResult[]>([]);
    const [hasFetched, setHasFetched] = useState(false);
    const patternCacheRef = useRef<Map<string, OptimizationResult[]>>(new Map());
    const [individualBestPlans, setIndividualBestPlans] = useState<Record<string, OptimizationResult | null>>({});

    // NEW STATES FOR DYNAMIC FLOW
    const [selectedRollIndices, setSelectedRollIndices] = useState<Record<string, number>>({});
    const [stripModes, setStripModes] = useState<Record<string, Record<number, boolean>>>({}); // groupKey -> stripIdx -> isFull
    const [manualSheets, setManualSheets] = useState<Record<string, Record<number, number>>>({}); // groupKey -> stripIdx -> manualCount
    const [skippedStrips, setSkippedStrips] = useState<Record<string, Record<number, boolean>>>({}); // groupKey -> stripIdx -> isSkipped (customer accepted reduced)
    const [localOverrides, setLocalOverrides] = useState<Record<string, Record<string, { reelSize?: string, cutSize?: string }>>>({}); // groupKey -> orderId -> {w,h}

    // 🔥 FLOW STATE: The foundation of all results
    const [globalData, setGlobalData] = useState<{ groups: OrderGroup[], availableReelsGroups: Record<number, Reel[]> } | null>(null);

    const fetchReels = useCallback(async () => {
        const validOrders = orders.filter(o => o.gsm && o.reelSize && o.cutSize);
        if (validOrders.length === 0) {
            toast.error("GSM, Reel Size aur Cutting Size fill karo");
            return;
        }
        setIsLoading(true);
        setHasFetched(false);
        setSelectedRollIndices({});
        setStripModes({});
        setManualSheets({});
        setSkippedStrips({});
        setLocalOverrides({});
        patternCacheRef.current.clear();

        const rnd = createSeededRandom(42);

        try {
            const groupMap: Record<string, OrderGroup> = {};
            validOrders.forEach(o => {
                const qualityKey = normalizeOrderQuality(o.quality);
                const key = `gsm__${o.gsm}__quality__${qualityKey}`;
                if (!groupMap[key]) {
                    groupMap[key] = { key, quality: qualityKey, gsm: Number(o.gsm), orders: [] };
                }
                groupMap[key].orders.push(o);
            });
            const groups = Object.values(groupMap);

            const getCachedOptimization = async (r: Reel, ords: OrderRow[], originalOrds?: OrderRow[]) => {
                if (!r || !r._id) return [];
                const key = `${r._id}:${[...ords].sort((a, b) => a.id.localeCompare(b.id)).map(o => `${o.id}_${o.qty}_${o.reelSize}_${o.cutSize}_${o.gsm}_${o.quality}`).join("|")}`;
                if (patternCacheRef.current.has(key)) return patternCacheRef.current.get(key)!;
                const res = await optimizeOrdersPrimary(r, ords, rnd, originalOrds);
                patternCacheRef.current.set(key, res);
                return res;
            };

            const reelMatchesGroupQuality = (reel: Reel, groupQuality: string) =>
                groupQuality === "Any" || reel.quality === groupQuality;

            const availableReelsGroups: Record<number, Reel[]> = {};
            for (let gIdx = 0; gIdx < groups.length; gIdx++) {
                const group = groups[gIdx];
                const groupReels: Reel[] = [];
                const uniqueDimKeys = new Set<string>();
                const suggestPromises: Promise<any>[] = [];

                for (const order of group.orders) {
                    const widthCm = toCmUtil(Number(order.reelSize), order.reelSizeUnit as any);
                    const heightCm = toCmUtil(Number(order.cutSize), order.cutSizeUnit as any);
                    const dimKey = `${widthCm}x${heightCm}_${group.gsm}_${group.quality}`;
                    if (!uniqueDimKeys.has(dimKey)) {
                        uniqueDimKeys.add(dimKey);
                        suggestPromises.push(postData("/sale/suggest", { 
                            widthCm, 
                            heightCm, 
                            gsm: group.gsm,
                            ...(group.quality !== "Any" ? { quality: group.quality } : {}),
                        }));
                    }
                }
                const suggestResults = await Promise.all(suggestPromises);
                suggestResults.forEach(res => {
                    if (res?.success) {
                        if (res.data?.reels) {
                            (res.data.reels as Reel[]).forEach(r => {
                                if (!reelMatchesGroupQuality(r, group.quality)) return;
                                if (!groupReels.find(x => x._id === r._id)) groupReels.push(r);
                            });
                        }
                        if (res.data?.sheets) {
                            (res.data.sheets as any[]).forEach(s => {
                                if (!reelMatchesGroupQuality(s, group.quality)) return;
                                // Convert Sheet (Patti) to a Reel format for the optimizer
                                const pattiAsReel: Reel = {
                                    _id: s._id,
                                    reelNo: s.sheetNo,
                                    width: s.sizes?.[0]?.width || 0,
                                    sizeUnit: s.sizeUnit || 'mm',
                                    gsm: s.gsm,
                                    quality: s.quality,
                                    currentBalanceKg: s.currentBalanceKg || 0,
                                    totalWeightKg: s.totalWeightKg || 0,
                                    status: 'active' as any,
                                    isPattiStock: true // New flag
                                } as any;
                                if (!groupReels.find(x => x._id === pattiAsReel._id)) groupReels.push(pattiAsReel);
                            });
                        }
                    }
                });
                availableReelsGroups[gIdx] = groupReels;
            }

            setGlobalData({ groups, availableReelsGroups });
            setHasFetched(true);

            // Calculate Best Personal Plans
            const bestPersonalPlans: Record<string, OptimizationResult | null> = {};
            const uniqueReels: Reel[] = [];
            Object.values(availableReelsGroups).forEach(reels => {
                reels.forEach(r => { if (!uniqueReels.find(x => x._id === r._id)) uniqueReels.push(r); });
            });

            for (const o of validOrders) {
                let best: OptimizationResult | null = null;
                let bestAdjustedScore = -Infinity;

                for (const r of uniqueReels.slice(0, 15)) {
                    if (!isOrderQualityMatch(o.quality, r.quality)) continue;
                    const res = await getCachedOptimization(r, [o]);
                    if (res[0]) {
                        // 🎯 CALCULATE GSM PENALTY: Prioritize near GSMs!
                        // If user wants 320 and we have 325 and 330, 325 should win.
                        const gsmReq = Number(o.gsm) || 0;
                        const gsmDiff = Math.abs(r.gsm - gsmReq);
                        const gsmPenalty = gsmDiff * 50000; 
                        
                        const pattiBonus = (r as any).isPattiStock ? 1000000 : 0;
                        const adjustedScore = res[0].score - gsmPenalty + pattiBonus;

                        if (!best || adjustedScore > bestAdjustedScore) {
                            best = res[0];
                            bestAdjustedScore = adjustedScore;
                        }
                    }
                }
                bestPersonalPlans[o.id] = best;
            }
            setIndividualBestPlans(bestPersonalPlans);
            toast.success("Optimization completed successfully!");
        } catch (err) {
            console.error("Fetch Failure", err);
            toast.error("Error fetching data");
        } finally {
            setIsLoading(false);
        }
    }, [orders]);

    // 🌊 DYNAMIC FULFILLMENT FLOW EFFECT
    useEffect(() => {
        if (!globalData || !hasFetched) return;

        const syncFlow = async () => {
            const { groups, availableReelsGroups } = globalData;
            const newResults: GroupResult[] = [];
            const rnd = createSeededRandom(42);
            const nextUpdatedSelections = { ...selectedRollIndices };
            let hasSelectionChanged = false;

            const getCachedOptimization = async (r: Reel, ords: OrderRow[], originalOrds?: OrderRow[]) => {
                const key = `${r._id}:${[...ords].sort((a, b) => a.id.localeCompare(b.id)).map(o => `${o.id}_${o.qty}_${o.reelSize}_${o.cutSize}_${o.gsm}_${o.quality}`).join("|")}`;
                if (patternCacheRef.current.has(key)) return patternCacheRef.current.get(key)!;
                const res = await optimizeOrdersPrimary(r, ords, rnd, originalOrds);
                patternCacheRef.current.set(key, res);
                return res;
            };

            for (let gIdx = 0; gIdx < groups.length; gIdx++) {
                const mainGroup = groups[gIdx];
                let currentOrders = [...mainGroup.orders];
                let availableReels = [...(availableReelsGroups[gIdx] || [])];
                let virtualIdx = 0;

                while (currentOrders.length > 0) {
                    const groupKey = `${mainGroup.key}__part${virtualIdx}`;

                    // 🎯 APPLY LOCAL OVERRIDES (From Smart Snap 'Apply' button)
                    let evaluateOrders = [...currentOrders];
                    if (localOverrides[groupKey]) {
                        evaluateOrders = evaluateOrders.map(o => {
                            const ovr = localOverrides[groupKey][o.id];
                            if (ovr) {
                                return {
                                    ...o,
                                    reelSize: ovr.reelSize || o.reelSize,
                                    reelSizeUnit: ovr.reelSize ? SizeUnit.MM : o.reelSizeUnit,
                                    cutSize: ovr.cutSize || o.cutSize,
                                    cutSizeUnit: ovr.cutSize ? SizeUnit.MM : o.cutSizeUnit,
                                    client: `${o.client || 'Party'} (Manual Adjust)`
                                };
                            }
                            return o;
                        });
                    }

                    const rollOptions: OptimizationResult[] = [];
                    for (const r of availableReels) {
                        const opts = await getCachedOptimization(r, evaluateOrders, mainGroup.orders);
                        rollOptions.push(...opts);
                    }
                    const sortedOptions = rollOptions.filter(Boolean).sort((a, b) => {
                        const catScore: any = { "zero": 0, "low": 1, "medium": 2, "high": 3 };
                        if (catScore[a.wasteCategory] !== catScore[b.wasteCategory]) return catScore[a.wasteCategory] - catScore[b.wasteCategory];
                        return b.score - a.score;
                    }) as OptimizationResult[];

                    if (sortedOptions.length === 0 || sortedOptions.every(r => r.cannotFit)) {
                        newResults.push({ group: { ...mainGroup, key: groupKey, orders: currentOrders }, rollOptions: sortedOptions, noReelsFound: sortedOptions.length === 0 });
                        break;
                    }

                    if (nextUpdatedSelections[groupKey] === undefined) {
                        nextUpdatedSelections[groupKey] = 0;
                        hasSelectionChanged = true;
                    }

                    const selectedIdx = nextUpdatedSelections[groupKey] ?? 0;
                    const bestOpt = sortedOptions[selectedIdx] || sortedOptions[0];

                    newResults.push({ group: { ...mainGroup, key: groupKey, orders: currentOrders }, rollOptions: sortedOptions, noReelsFound: false });

                    // Fulfillment logic - backend-primary (Python/Node), local fallback for resilience
                    const groupStripModes = stripModes[groupKey] || {};
                    const groupManualSheets = manualSheets[groupKey] || {};
                    const groupSkippedStrips = skippedStrips[groupKey] || {};
                    const stripModesPayload = bestOpt.stripsLayout.map((_, idx) => ({
                        strip_idx: idx,
                        is_full: !!groupStripModes[idx],
                        manual_sheets: groupManualSheets[idx] !== undefined ? Number(groupManualSheets[idx]) : null,
                        is_skipped: !!groupSkippedStrips[idx],
                    }));
                    let next: OrderRow[] = [];
                    let progress = false;
                    try {
                        const simRes = await postData('/zerowaste/simulate-fulfillment', {
                            bestOpt, orders: currentOrders, stripModes: stripModesPayload,
                        });
                        if (simRes?.success && simRes?.data) {
                            next = Array.isArray(simRes.data.next_orders) ? simRes.data.next_orders : [];
                            progress = !!simRes.data.progress;
                        } else {
                            throw new Error('simulate-fulfillment non-success');
                        }
                    } catch (e) {
                        console.warn('simulate-fulfillment backend failed, using local fallback', e);
                        for (const o of currentOrders) {
                            const orderStrips = bestOpt.stripsLayout.map((s, idx) => ({ ...s, idx })).filter(s => s.orderId === o.id);
                            const hasSkippedStrip = orderStrips.some(s => !!groupSkippedStrips[s.idx]);
                            const totalProduced = orderStrips.reduce((sum, s) => {
                                if (groupSkippedStrips[s.idx]) return sum;
                                if (groupManualSheets[s.idx] !== undefined) return sum + groupManualSheets[s.idx];
                                return sum + (groupStripModes[s.idx] ? s.totalSheets : s.usableSheets);
                            }, 0);
                            if (totalProduced < Number(o.qty)) {
                                if (hasSkippedStrip) { progress = true; }
                                else { next.push({ ...o, qty: String(Number(o.qty) - totalProduced) }); if (totalProduced > 0) progress = true; }
                            } else progress = true;
                        }
                    }
                    if (!progress) break;
                    currentOrders = next;
                    availableReels = availableReels.filter(r => r._id !== bestOpt.reel._id);
                    virtualIdx++;
                }
            }

            setGroupResults(newResults);
            if (hasSelectionChanged) {
                setSelectedRollIndices(nextUpdatedSelections);
            }
        };

        syncFlow();
    }, [selectedRollIndices, stripModes, manualSheets, skippedStrips, localOverrides, globalData, hasFetched]);

    const addOrder = () => setOrders(prev => [...prev, {
        ...createEmptyOrder(),
        client: "",
        quality: prev[0]?.quality || "",
        gsm: prev[0]?.gsm || "",
    }]);

    const removeOrder = (id: string) => {
        if (orders.length === 1) return;
        setOrders(prev => prev.filter(o => o.id !== id));
    };

    const updateOrder = (id: string, field: keyof OrderRow, value: string) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
        if (hasFetched) { setHasFetched(false); setGlobalData(null); }
    };

    const resetLocalOverride = (gKey: string) => {
        setLocalOverrides(prev => {
            const next = { ...prev };
            delete next[gKey];
            return next;
        });
        toast.info("Original layout restored!");
    };

    const validOrderCount = orders.filter(o => o.gsm && o.reelSize && o.cutSize).length;
    const totalOrderedSheets = orders.reduce((sum, o) => sum + (Number(o.qty) || 0), 0);
    const matchedGroups = groupResults.filter(g => !g.noReelsFound && g.rollOptions.some(r => !r.cannotFit)).length;
    const selectedRollCount = groupResults.reduce((count, g) => {
        const selIdx = selectedRollIndices[g.group.key] || 0;
        const opt = g.rollOptions?.[selIdx];
        return count + (opt && !opt.cannotFit ? 1 : 0);
    }, 0);

    return (
        <ReadPermissionGuard resource={Resource.REEL}>
        <div className="relative w-full max-w-none space-y-6 pb-8">
            <PageMeta title="Zero Waste Optimizer | Paper Sheet Trade" description="Plan and optimize paper roll cutting to minimize waste." />

            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden">
                <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-brand-200/30 blur-3xl dark:bg-brand-900/20" />
                <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20" />
                <div className="absolute left-1/3 top-24 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-900/10" />
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-gray-200/80 bg-white/90 shadow-theme-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/90">
                <div className="border-b border-gray-100 bg-linear-to-r from-gray-950 via-gray-900 to-brand-950 px-6 py-7 dark:border-gray-800 sm:px-8">
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl">
                            <button
                                onClick={() => navigate(-1)}
                                className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:bg-white/10 hover:text-white"
                            >
                                <AngleLeftIcon className="h-4 w-4" />
                                Back
                            </button>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-200">
                                <span className="h-2 w-2 rounded-full bg-brand-400" />
                                Inventory Intelligence
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                                Zero Waste Optimizer
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
                                Plan roll cutting with a clear, production-ready view. Compare roll options, control strip output, and share customer-ready summaries from one workspace.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[520px]">
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Orders</p>
                                <p className="mt-2 text-2xl font-black text-white">{validOrderCount}</p>
                                <p className="text-xs font-medium text-gray-400">Ready to optimize</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Sheets</p>
                                <p className="mt-2 text-2xl font-black text-white">{totalOrderedSheets.toLocaleString()}</p>
                                <p className="text-xs font-medium text-gray-400">Total requirement</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Groups</p>
                                <p className="mt-2 text-2xl font-black text-white">{matchedGroups}</p>
                                <p className="text-xs font-medium text-gray-400">Matched layouts</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 backdrop-blur-sm">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">Selected</p>
                                <p className="mt-2 text-2xl font-black text-white">{selectedRollCount}</p>
                                <p className="text-xs font-medium text-emerald-100/80">Roll plans</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 px-6 py-4 sm:grid-cols-3 sm:px-8">
                    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                            <span className="text-sm font-black">1</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">Enter orders</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Client, size, GSM, quantity</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                            <span className="text-sm font-black">2</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">Optimize rolls</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Find best-fit production plan</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <span className="text-sm font-black">3</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">Share & produce</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">PDF, WhatsApp, sales flow</p>
                        </div>
                    </div>
                </div>
            </div>

            <OrderInputTable
                orders={orders} setOrders={setOrders} addOrder={addOrder} removeOrder={removeOrder} updateOrder={updateOrder}
                customerPhone={customerPhone} setCustomerPhone={setCustomerPhone}
                fetchReels={fetchReels} isLoading={isLoading} hasFetched={hasFetched} setHasFetched={setHasFetched}
            />

            {hasFetched && Object.keys(individualBestPlans).length > 0 && (
                <div className="space-y-6">
                    <IndividualBestPlans orders={orders} individualBestPlans={individualBestPlans} groupResults={groupResults} selectedRollIndices={selectedRollIndices} setSelectedRollIndices={setSelectedRollIndices} customerPhone={customerPhone} />
                    <FinalRollSummary
                        groupResults={groupResults}
                        selectedRollIndices={selectedRollIndices}
                        stripModes={stripModes}
                        manualSheets={manualSheets}
                        skippedStrips={skippedStrips}
                    />
                </div>
            )}

            {hasFetched && groupResults.length === 0 && (
                <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800">
                        <XCircle className="h-8 w-8" />
                    </div>
                    <p className="text-xl font-black text-gray-800 dark:text-white">No matching rolls found</p>
                    <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                        Check GSM, quality, and size inputs, or verify roll inventory availability for these requirements.
                    </p>
                </div>
            )}

            {hasFetched && groupResults.length > 0 && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-3 rounded-[1.75rem] border border-gray-200 bg-white px-6 py-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                <ChevronRight className="h-3.5 w-3.5" />
                                Optimization Results
                            </div>
                            <h2 className="mt-3 text-xl font-black text-gray-900 dark:text-white">Production-ready roll plans</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Review each group, adjust strip behavior, and share the final plan with confidence.</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/70">
                            <span className="font-black text-gray-900 dark:text-white">{groupResults.length}</span>
                            <span className="ml-1 text-gray-500 dark:text-gray-400">result group{groupResults.length > 1 ? "s" : ""}</span>
                        </div>
                    </div>

                    {groupResults.map((gRes, gIdx) => (
                        <GroupResultCard
                            key={gRes.group.key} gRes={gRes} gIdx={gIdx}
                            selectedRollIndices={selectedRollIndices}
                            setSelectedRollIndices={setSelectedRollIndices}
                            stripModes={stripModes}
                            setStripModes={setStripModes}
                            manualSheets={manualSheets}
                            setManualSheets={setManualSheets}
                            skippedStrips={skippedStrips}
                            setSkippedStrips={setSkippedStrips}
                            customerPhone={customerPhone}
                            applyLocalOverride={(gKey, orderId, overrides) => setLocalOverrides(prev => ({
                                ...prev,
                                [gKey]: {
                                    ...(prev[gKey] || {}),
                                    [orderId]: { ...(prev[gKey]?.[orderId] || {}), ...overrides }
                                }
                            }))}
                            resetLocalOverride={resetLocalOverride}
                            hasOverrides={!!localOverrides[gRes.group.key]}
                            fetchReels={fetchReels}
                        />
                    ))}
                </div>
            )}
        </div>
        </ReadPermissionGuard>
    );
}
