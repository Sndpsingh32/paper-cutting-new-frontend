import React from "react";
import { CheckCircle2, Share2, Ruler, ChevronRight, Zap } from "lucide-react";
import { OrderRow, OptimizationResult, GroupResult } from "../types";
import { shareClientSummaryOnWhatsApp } from "../sharing";
import { toMm } from "../helpers";

interface Props {
    orders: OrderRow[];
    individualBestPlans: Record<string, OptimizationResult | null>;
    groupResults: GroupResult[];
    selectedRollIndices: Record<string, number>;
    setSelectedRollIndices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    customerPhone: string;
}

const IndividualBestPlans: React.FC<Props> = ({
    orders,
    individualBestPlans,
    groupResults,
    selectedRollIndices,
    setSelectedRollIndices,
    customerPhone
}) => {
    // Group orders by client
    const ordersByClient = orders.reduce((acc, order) => {
        if (!order.client) return acc;
        if (!acc[order.client]) acc[order.client] = [];
        acc[order.client].push(order);
        return acc;
    }, {} as Record<string, OrderRow[]>);

    return (
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 mb-4 px-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                    Personal Best Roll for Each Order
                </h3>
            </div>

            {/* 👤 CLIENT-WISE SUMMARY CARDS */}
            <div className="grid grid-cols-1 gap-6">
                {Object.entries(ordersByClient).map(([clientName, clientOrders]) => {
                    // Calculate totals for this client
                    const totalSheets = clientOrders.reduce((sum, o) => sum + (Number(o.qty) || 0), 0);
                    const totalWeight = clientOrders.reduce((sum, o) => {
                        const widthMm = toMm(Number(o.reelSize) || 0, o.reelSizeUnit);
                        const heightMm = toMm(Number(o.cutSize) || 0, o.cutSizeUnit);
                        const gsm = Number(o.gsm) || 0;
                        const qty = Number(o.qty) || 0;
                        return sum + (widthMm > 0 && heightMm > 0 && gsm > 0 && qty > 0
                            ? (widthMm * heightMm * gsm * qty) / 1000000000
                            : 0);
                    }, 0);

                    return (
                        <div key={clientName} className="bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            {/* Compact Client Header */}
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg">
                                        {clientName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-800 dark:text-white text-base leading-none">{clientName}</h4>
                                        <p className="text-[11px] text-gray-500 font-bold mt-1.5 uppercase tracking-wider">
                                            {clientOrders.length} orders · {totalSheets.toLocaleString()} sheets · {totalWeight.toFixed(1)} kg
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => shareClientSummaryOnWhatsApp(customerPhone, clientName, clientOrders, groupResults, selectedRollIndices)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-green-500/20"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share Summary
                                </button>
                            </div>

                            {/* Orders Table-like List */}
                            <div className="overflow-x-auto -mx-2 px-2">
                                <table className="w-full text-left border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <th className="px-4 py-2">Order Item</th>
                                            <th className="px-4 py-2">Requirement</th>
                                            <th className="px-4 py-2">Match Found</th>
                                            <th className="px-4 py-2">Proposal Options</th>
                                            <th className="px-4 py-2 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="space-y-2">
                                        {clientOrders.map((o) => {
                                            const plan = individualBestPlans[o.id];
                                            if (!plan) return null;
                                            const cw = plan.trimWastePercent;
                                            
                                            // Calculation Logic
                                            const req = Number(o.qty) || 0;
                                            const wMm = toMm(Number(o.reelSize) || 0, o.reelSizeUnit);
                                            const hMm = toMm(Number(o.cutSize) || 0, o.cutSizeUnit);
                                            const sheetWeight = (wMm * hMm * Number(o.gsm)) / 1000000000;

                                            let allStrips: { total: number, usable: number }[] = [];
                                            groupResults.forEach(g => {
                                                if (!g.rollOptions || g.rollOptions.length === 0) return;
                                                const selIdx = selectedRollIndices[g.group.key] || 0;
                                                const bestOpt = g.rollOptions[selIdx] || g.rollOptions[0];
                                                if (!bestOpt || !bestOpt.stripsLayout) return;

                                                const orderStrips = bestOpt.stripsLayout.filter(s => s.orderId === o.id);
                                                orderStrips.forEach(s => {
                                                    allStrips.push({ total: s.totalSheets, usable: s.usableSheets });
                                                });
                                            });

                                            let opt1Qty = 0, opt2Qty = 0;
                                            if (allStrips.length > 0) {
                                                opt1Qty = allStrips.length > 1 
                                                    ? allStrips.slice(0, -1).reduce((sum, s) => sum + s.total, 0)
                                                    : allStrips[0].usable;
                                                opt2Qty = allStrips.reduce((sum, s) => sum + s.total, 0);
                                            }

                                            return (
                                                <tr key={o.id} className="group bg-gray-50/50 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 shadow-xs hover:shadow-md rounded-2xl">
                                                    {/* Column 1: Dimensions & Quality */}
                                                    <td className="px-4 py-3 rounded-l-2xl border-y border-l border-gray-100/50 dark:border-gray-800/50">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                                                <Ruler className="w-4 h-4 text-indigo-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-gray-900 dark:text-white">
                                                                    {o.reelSize}{o.reelSizeUnit} × {o.cutSize}{o.cutSizeUnit}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                                    {o.quality || 'Universal'} · {o.gsm} GSM
                                                                    {o.grain && o.grain !== 'Any' && (
                                                                        <span className="ml-1.5 px-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[8px] font-black uppercase">
                                                                            Grain {o.grain}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Column 2: Requirement */}
                                                    <td className="px-4 py-3 border-y border-gray-100/50 dark:border-gray-800/50">
                                                        <p className="text-xs font-black text-gray-800 dark:text-gray-200">
                                                            {Number(o.qty).toLocaleString()} <span className="text-[10px] opacity-50">Sht</span>
                                                        </p>
                                                        <p className="text-[10px] font-bold text-emerald-600">
                                                            {(Number(o.weightKg) || 0).toFixed(1)} Kg
                                                        </p>
                                                    </td>

                                                    {/* Column 3: Optimal Match */}
                                                    <td className="px-4 py-3 border-y border-gray-100/50 dark:border-gray-800/50">
                                                        <div className="flex items-center gap-2">
                                                            <div>
                                                                <p className="text-xs font-black text-gray-700 dark:text-gray-300">
                                                                    {plan.reel.isPattiStock ? 'Strip' : 'Roll'} #{plan.reel.reelNo}
                                                                </p>
                                                                <p className="text-[9px] font-bold text-gray-400 italic flex items-center gap-1">
                                                                    Width: {plan.reel.width}{plan.reel.sizeUnit}
                                                                    {plan.reel.isPattiStock && (
                                                                        <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded uppercase flex items-center gap-0.5">
                                                                            <Zap className="w-2 h-2 fill-current" /> Ready Strip
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${cw < 1 ? 'bg-green-500 text-white' : cw < 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {cw < 0.1 ? 'Zero Waste' : `${cw.toFixed(1)}% Trim`}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Column 4: Proposals */}
                                                    <td className="px-4 py-3 border-y border-gray-100/50 dark:border-gray-800/50">
                                                        {allStrips.length > 0 ? (
                                                            <div className="flex flex-col xl:flex-row items-stretch gap-2 min-w-[300px]">
                                                                {/* Option 1: Under-Deliver */}
                                                                <div className="flex-1 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl p-2 border border-orange-100/50 dark:border-orange-900/20">
                                                                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-orange-100/30">
                                                                        <p className="text-[8px] font-black text-orange-600 uppercase">Under</p>
                                                                        <span className="text-[9px] font-black text-orange-700">{(opt1Qty * sheetWeight).toFixed(1)}kg</span>
                                                                    </div>
                                                                    <p className="text-[11px] font-black text-orange-800 dark:text-orange-400 font-mono tracking-tighter text-center">
                                                                        {req}{opt1Qty - req < 0 ? <span className="text-red-600">-{Math.abs(opt1Qty - req)}</span> : <span className="text-green-600">+{opt1Qty - req}</span>} = <span className="text-xs text-gray-900 dark:text-white">{opt1Qty.toLocaleString()}</span>
                                                                    </p>
                                                                </div>

                                                                {/* Option 2: Over-Deliver */}
                                                                <div className="flex-1 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl p-2 border border-indigo-100/50 dark:border-indigo-900/20">
                                                                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-indigo-100/30">
                                                                        <p className="text-[8px] font-black text-indigo-600 uppercase">Over</p>
                                                                        <span className="text-[9px] font-black text-indigo-700">{(opt2Qty * sheetWeight).toFixed(1)}kg</span>
                                                                    </div>
                                                                    <p className="text-[11px] font-black text-indigo-800 dark:text-indigo-400 font-mono tracking-tighter text-center">
                                                                        {req}{opt2Qty - req < 0 ? <span className="text-red-600">-{Math.abs(opt2Qty - req)}</span> : <span className="text-green-600">+{opt2Qty - req}</span>} = <span className="text-xs text-gray-900 dark:text-white">{opt2Qty.toLocaleString()}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400 italic">No layout</span>
                                                        )}
                                                    </td>

                                                    {/* Column 5: Action */}
                                                    <td className="px-4 py-3 rounded-r-2xl border-y border-r border-gray-100/50 dark:border-gray-800/50 text-right">
                                                        <button
                                                            onClick={() => {
                                                                const group = groupResults.find(g => g.group.orders.some(order => order.id === o.id));
                                                                if (group) {
                                                                    const optIdx = group.rollOptions.findIndex(opt => opt.reel._id === plan.reel._id);
                                                                    if (optIdx !== -1) {
                                                                        setSelectedRollIndices(prev => ({ ...prev, [group.group.key]: optIdx }));
                                                                        const element = document.getElementById(`group-${group.group.key}`);
                                                                        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                    }
                                                                }
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-gray-800 text-white hover:bg-black dark:hover:bg-gray-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                                                        >
                                                            View
                                                            <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default IndividualBestPlans;
