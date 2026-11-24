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

    return (
        <ReadPermissionGuard resource={Resource.REEL}>
        <div className="px-0 py-4 w-full max-w-none">
            <PageMeta title="Zero Waste Optimizer | JAIN TRADE LINKS" description="Plan and optimize paper roll cutting to minimize waste." />

            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="flex items-center justify-center w-11 h-11 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-gray-50 transition-all shadow-sm active:scale-95">
                    <AngleLeftIcon className="w-5 h-5 text-gray-500" />
                </button>
                <h1 className="text-2xl font-black text-gray-800 dark:text-white">Zero Waste Optimizer</h1>
            </div>

            <OrderInputTable
                orders={orders} setOrders={setOrders} addOrder={addOrder} removeOrder={removeOrder} updateOrder={updateOrder}
                customerPhone={customerPhone} setCustomerPhone={setCustomerPhone}
                fetchReels={fetchReels} isLoading={isLoading} hasFetched={hasFetched} setHasFetched={setHasFetched}
            />

            {hasFetched && Object.keys(individualBestPlans).length > 0 && (
                <>
                    <IndividualBestPlans orders={orders} individualBestPlans={individualBestPlans} groupResults={groupResults} selectedRollIndices={selectedRollIndices} setSelectedRollIndices={setSelectedRollIndices} customerPhone={customerPhone} />
                    <FinalRollSummary 
                        groupResults={groupResults} 
                        selectedRollIndices={selectedRollIndices}
                        stripModes={stripModes}
                        manualSheets={manualSheets}
                        skippedStrips={skippedStrips}
                    />
                </>
            )}

            {hasFetched && groupResults.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 p-6">
                    <XCircle className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-700 font-black text-lg">Koi rolls nahi mile.</p>
                </div>
            )}

            {hasFetched && groupResults.length > 0 && (
                <div className="space-y-10">
                    <div className="flex items-center gap-3">
                        <ChevronRight className="w-5 h-5 text-green-500" />
                        <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest text-center">
                            Results Summary
                        </h2>
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
