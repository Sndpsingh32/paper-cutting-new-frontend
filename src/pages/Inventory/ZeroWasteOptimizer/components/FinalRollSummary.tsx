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
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="flex items-center gap-2 mb-4 px-2">
                <Layers className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                    Selected Production Rolls Summary
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-500"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Roll {idx + 1}</p>
                                    <h4 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-1.5">
                                        #{opt.reel.reelNo}
                                    </h4>
                                </div>
                                <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${cw < 1 ? 'bg-green-500 text-white' : cw < 5 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {cw.toFixed(1)}% Trim
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 font-bold flex items-center gap-1">
                                        <Ruler className="w-3 h-3" /> Size
                                    </span>
                                    <span className="text-gray-800 dark:text-gray-200 font-black">{opt.reel.width}{opt.reel.sizeUnit} · {gsm} GSM</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 font-bold flex items-center gap-1">
                                        <Layers className="w-3 h-3" /> Produced Sheets
                                    </span>
                                    <span className="text-gray-800 dark:text-gray-200 font-black">
                                        {opt.stripsLayout.reduce((total: number, s: any, sIdx: number) => {
                                            if (groupSkippedStrips[sIdx]) return total;
                                            if (groupManualSheets[sIdx] !== undefined) return total + groupManualSheets[sIdx];
                                            return total + (groupStripModes[sIdx] ? s.totalSheets : s.usableSheets);
                                        }, 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50 dark:border-gray-800">
                                    <span className="text-gray-500 font-bold flex items-center gap-1">
                                        <Weight className="w-3 h-3" /> Roll / Consumed
                                    </span>
                                    <span className="text-gray-800 dark:text-gray-200 font-black">
                                        {(opt.reel.totalWeightKg || 0).toFixed(0)}kg / <span className="text-emerald-600">{liveConsumedWeightKg.toFixed(1)}kg</span>
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 font-bold flex items-center gap-1">
                                        <Ruler className="w-3 h-3" /> Side-Cut Reel
                                    </span>
                                    <span className="text-amber-600 font-black">
                                        {opt.trimWasteMm < 1 ? 'Zero' : `${(opt.trimWasteMm / 25.4).toFixed(2)}"`}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="mt-3 flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span className="text-[10px] font-black text-gray-400 uppercase">Optimal Plan Applied</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FinalRollSummary;
