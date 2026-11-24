import React from "react";
import { Layers, Weight, Ruler, CheckCircle2 } from "lucide-react";
import { GroupResult } from "../types";

interface Props {
    groupResults: GroupResult[];
    selectedRollIndices: Record<string, number>;
    stripModes: Record<string, Record<number, boolean>>;
    manualSheets: Record<string, Record<number, number>>;
    skippedStrips: Record<string, Record<number, boolean>>;
}

const FinalRollSummary: React.FC<Props> = ({ 
    groupResults, 
    selectedRollIndices,
    stripModes,
    manualSheets,
    skippedStrips
}) => {
    if (!groupResults || groupResults.length === 0) return null;

    // Filter out groups with no reels found or no roll options
    const activeRolls = groupResults.map(g => {
        const selIdx = selectedRollIndices[g.group.key] || 0;
        const opt = g.rollOptions?.[selIdx];
        if (!opt || opt.cannotFit) return null;
        return {
            groupKey: g.group.key,
            gsm: g.group.gsm,
            opt: opt
        };
    }).filter(Boolean) as { groupKey: string, gsm: number, opt: any }[];

    if (activeRolls.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">Production Summary</p>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">Selected Roll Plans</h3>
                    </div>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {activeRolls.length} active roll{activeRolls.length > 1 ? "s" : ""}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
                {activeRolls.map((item, idx) => {
                    const { groupKey, gsm, opt } = item;
                    const cw = opt.trimWastePercent;

                    // 🔋 CALCULATE LIVE CONSUMED WEIGHT based on toggles
                    const groupStripModes = stripModes[groupKey] || {};
                    const groupManualSheets = manualSheets[groupKey] || {};
                    const groupSkippedStrips = skippedStrips[groupKey] || {};

                    const liveConsumedWeightKg = opt.stripsLayout.reduce((total: number, s: any, sIdx: number) => {
                        let produced = 0;
                        if (groupSkippedStrips[sIdx]) produced = 0;
                        else if (groupManualSheets[sIdx] !== undefined) produced = groupManualSheets[sIdx];
                        else {
                            const isFull = !!groupStripModes[sIdx];
                            produced = isFull ? s.totalSheets : s.usableSheets;
                        }

                        // Weight = (Width * Height * Sheets * GSM) / 10^9
                        const stripWeight = (s.reelSize * s.cutSize * produced * gsm) / 1000000000;
                        return total + stripWeight;
                    }, 0);

                    return (
                        <div
                            key={groupKey}
                            className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 transition hover:border-brand-200 hover:bg-white dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-brand-500/30 dark:hover:bg-gray-800"
                        >
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Roll {idx + 1}</p>
                                    <h4 className="mt-1 text-base font-black text-gray-900 dark:text-white">#{opt.reel.reelNo}</h4>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{opt.reel.width}{opt.reel.sizeUnit} · {gsm} GSM</p>
                                </div>
                                <div className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${cw < 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : cw < 5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'}`}>
                                    {cw.toFixed(1)}% Trim
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Layers className="h-4 w-4" />Produced</span>
                                    <span className="font-black text-gray-900 dark:text-white">
                                        {opt.stripsLayout.reduce((total: number, s: any, sIdx: number) => {
                                            if (groupSkippedStrips[sIdx]) return total;
                                            if (groupManualSheets[sIdx] !== undefined) return total + groupManualSheets[sIdx];
                                            return total + (groupStripModes[sIdx] ? s.totalSheets : s.usableSheets);
                                        }, 0).toLocaleString()} sht
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Weight className="h-4 w-4" />Consumed</span>
                                    <span className="font-black text-gray-900 dark:text-white">{liveConsumedWeightKg.toFixed(1)} / {(opt.reel.totalWeightKg || 0).toFixed(0)} kg</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Ruler className="h-4 w-4" />Side-cut</span>
                                    <span className="font-black text-gray-900 dark:text-white">{opt.trimWasteMm < 1 ? 'Zero' : `${(opt.trimWasteMm / 25.4).toFixed(2)}"`}</span>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-gray-500 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                Optimal plan applied
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FinalRollSummary;
