import React from "react";
import { Scissors, Trash2, Weight } from "lucide-react";
import { OrderRow } from "../types";
import { PaperQuality, SizeUnit } from "../../../../types/reel";
import { Zap, RefreshCw } from "lucide-react";
import { calcTotalWeightKg, calcSheetsFromWeight, toMm } from "../helpers"; // fallback-only UI estimates; business ownership is Python/Node
import { postData } from "../../../../utility/utility";



async function backendTotalWeightKg(widthMm:number,heightMm:number,gsm:number,sheets:number){
  try { const res = await postData('/calculations/total-weight', { width_mm: widthMm, height_mm: heightMm, gsm, sheets, rounding_mode: 'raw' }); if (res?.success && res?.data?.total_weight_kg !== undefined) return Number(res.data.total_weight_kg); } catch {}
  return calcTotalWeightKg(widthMm,heightMm,gsm,sheets);
}
async function backendSheetsFromWeight(widthMm:number,heightMm:number,gsm:number,weightKg:number){
  try { const res = await postData('/calculations/sheets-from-weight', { width_mm: widthMm, height_mm: heightMm, gsm, weight_kg: weightKg }); if (res?.success && res?.data?.sheets !== undefined) return Math.max(0, Math.floor(Number(res.data.sheets))); } catch {}
  return calcSheetsFromWeight(widthMm,heightMm,gsm,weightKg);
}
interface Props {
    orders: OrderRow[];
    setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
    addOrder: () => void;
    removeOrder: (id: string) => void;
    updateOrder: (id: string, field: keyof OrderRow, value: string) => void;
    customerPhone: string;
    setCustomerPhone: (val: string) => void;
    fetchReels: () => void;
    isLoading: boolean;
    hasFetched: boolean;
    setHasFetched: (val: boolean) => void;
}

const OrderInputTable: React.FC<Props> = ({
    orders, addOrder, removeOrder, updateOrder, setOrders,
    fetchReels, isLoading, hasFetched, setHasFetched
}) => {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-xl mb-6">
            <div className="bg-linear-to-r from-indigo-600 to-violet-600 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                        <Scissors className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">Order Requirements</h3>
                        <p className="text-xs text-indigo-200 font-bold uppercase tracking-widest">Enter multiple client orders at once</p>
                    </div>
                </div>
                <button
                    onClick={addOrder}
                    className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg"
                >
                    + Add Order
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/60">
                            <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">#</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Client / Party</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Quality</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">GSM</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase text-indigo-400 tracking-widest">Reel Size</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase text-violet-400 tracking-widest">Cutting Size</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase text-amber-500 tracking-widest">Grain</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Packets × Sht</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Total Qty</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase text-emerald-400 tracking-widest text-right">Weight (kg)</th>
                            <th className="px-4 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {orders.map((o, idx) => (
                            <tr key={o.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="px-4 py-3">
                                    <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 text-xs font-black flex items-center justify-center">
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        placeholder="Client Name"
                                        className="w-28 bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-indigo-400 text-gray-800 dark:text-white placeholder-gray-300 transition-colors"
                                        value={o.client}
                                        onChange={e => updateOrder(o.id, "client", e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 h-9 text-xs font-black text-gray-800 dark:text-white outline-none focus:border-indigo-400"
                                        value={o.quality}
                                        onChange={e => updateOrder(o.id, "quality", e.target.value)}
                                    >
                                        <option value="">Any</option>
                                        {Object.values(PaperQuality).map(q => <option key={q} value={q}>{q}</option>)}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="number"
                                        placeholder="GSM"
                                        className="w-16 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg h-9 px-2 text-xs font-black outline-none focus:border-indigo-400 text-center"
                                        value={o.gsm}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const total = Number(o.qty) || 0;
                                            const w = toMm(Number(o.reelSize) || 0, o.reelSizeUnit);
                                            const h = toMm(Number(o.cutSize) || 0, o.cutSizeUnit);
                                            const g = Number(val) || 0;
                                            const localWeight = (w > 0 && h > 0 && g > 0 && total > 0) ? calcTotalWeightKg(w, h, g, total).toFixed(2) : "";
                                            setOrders(prev => prev.map(r => r.id === o.id ? { ...r, gsm: val, weightKg: localWeight } : r));
                                            if (w > 0 && h > 0 && g > 0 && total > 0) { void backendTotalWeightKg(w,h,g,total).then(bw => setOrders(prev => prev.map(r => r.id === o.id ? { ...r, weightKg: Number(bw).toFixed(2) } : r))); }
                                        }}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            placeholder="26"
                                            className="w-20 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50 rounded-l-lg h-9 px-2 text-sm font-black outline-none focus:border-indigo-500 text-indigo-700 dark:text-indigo-300 text-center"
                                            value={o.reelSize}
                                            onChange={e => {
                                                const val = e.target.value;
                                                const total = Number(o.qty) || 0;
                                                const w = toMm(Number(val) || 0, o.reelSizeUnit);
                                                const h = toMm(Number(o.cutSize) || 0, o.cutSizeUnit);
                                                const g = Number(o.gsm) || 0;
                                                const localWeight = (w > 0 && h > 0 && g > 0 && total > 0) ? calcTotalWeightKg(w, h, g, total).toFixed(2) : "";
                                                setOrders(prev => prev.map(r => r.id === o.id ? { ...r, reelSize: val, weightKg: localWeight } : r));
                                                if (w > 0 && h > 0 && g > 0 && total > 0) { void backendTotalWeightKg(w,h,g,total).then(bw => setOrders(prev => prev.map(r => r.id === o.id ? { ...r, weightKg: Number(bw).toFixed(2) } : r))); }
                                            }}
                                        />
                                        <select
                                            className="bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/50 rounded-r-lg h-9 px-1 text-[10px] font-black text-indigo-600 outline-none cursor-pointer"
                                            value={o.reelSizeUnit}
                                            onChange={e => {
                                                const unit = e.target.value as SizeUnit;
                                                const w = toMm(Number(o.reelSize) || 0, unit);
                                                const h = toMm(Number(o.cutSize) || 0, unit); // Syncing with new unit
                                                const total = Number(o.qty) || 0;
                                                const g = Number(o.gsm) || 0;
                                                const localWeight = (w > 0 && h > 0 && g > 0 && total > 0) ? calcTotalWeightKg(w, h, g, total).toFixed(2) : "";
                                                setOrders(prev => prev.map(r => r.id === o.id ? { ...r, reelSizeUnit: unit, cutSizeUnit: unit, weightKg: localWeight } : r));
                                                if (w > 0 && h > 0 && g > 0 && total > 0) { void backendTotalWeightKg(w,h,g,total).then(bw => setOrders(prev => prev.map(r => r.id === o.id ? { ...r, weightKg: Number(bw).toFixed(2) } : r))); }
                                            }}
                                        >
                                            {Object.values(SizeUnit).map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            placeholder="17.5"
                                            className="w-20 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/50 rounded-l-lg h-9 px-2 text-sm font-black outline-none focus:border-violet-500 text-violet-700 dark:text-violet-300 text-center"
                                            value={o.cutSize}
                                            onChange={e => {
                                                const val = e.target.value;
                                                const total = Number(o.qty) || 0;
                                                const w = toMm(Number(o.reelSize) || 0, o.reelSizeUnit);
                                                const h = toMm(Number(val) || 0, o.cutSizeUnit);
                                                const g = Number(o.gsm) || 0;
                                                const localWeight = (w > 0 && h > 0 && g > 0 && total > 0) ? calcTotalWeightKg(w, h, g, total).toFixed(2) : "";
                                                setOrders(prev => prev.map(r => r.id === o.id ? { ...r, cutSize: val, weightKg: localWeight } : r));
                                                if (w > 0 && h > 0 && g > 0 && total > 0) { void backendTotalWeightKg(w,h,g,total).then(bw => setOrders(prev => prev.map(r => r.id === o.id ? { ...r, weightKg: Number(bw).toFixed(2) } : r))); }
                                            }}
                                        />
                                        <select
                                            className="bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700/50 rounded-r-lg h-9 px-1 text-[10px] font-black text-violet-600 outline-none cursor-pointer"
                                            value={o.cutSizeUnit}
                                            onChange={e => {
                                                const unit = e.target.value as SizeUnit;
                                                const w = toMm(Number(o.reelSize) || 0, o.reelSizeUnit);
                                                const h = toMm(Number(o.cutSize) || 0, unit);
                                                const total = Number(o.qty) || 0;
                                                const g = Number(o.gsm) || 0;
                                                const localWeight = (w > 0 && h > 0 && g > 0 && total > 0) ? calcTotalWeightKg(w, h, g, total).toFixed(2) : "";
                                                setOrders(prev => prev.map(r => r.id === o.id ? { ...r, cutSizeUnit: unit, weightKg: localWeight } : r));
                                                if (w > 0 && h > 0 && g > 0 && total > 0) { void backendTotalWeightKg(w,h,g,total).then(bw => setOrders(prev => prev.map(r => r.id === o.id ? { ...r, weightKg: Number(bw).toFixed(2) } : r))); }
                                            }}
                                        >
                                            {Object.values(SizeUnit).map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg h-9 px-2 text-[10px] font-black text-amber-700 dark:text-amber-300 outline-none focus:border-amber-500 transition-colors"
                                        value={o.grain || "Any"}
                                        onChange={e => updateOrder(o.id, "grain", e.target.value as any)}
                                    >
                                        <option value="Any">Any Grain</option>
                                        <option value="Long">Grain Long</option>
                                        <option value="Short">Grain Short</option>
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1 justify-center">
                                        <input
                                            type="number"
                                            placeholder="Pkts"
                                            className="w-14 bg-gray-100 dark:bg-gray-800 rounded-lg h-8 px-1 text-xs font-bold outline-none text-center"
                                            value={o.packets}
                                            onChange={e => {
                                                const pkts = e.target.value;
                                                const total = (Number(pkts) || 0) * (Number(o.sheetsPerPacket) || 100);
                                                // Auto-calculate weight when packets change
                                                const widthMm = toMm(Number(o.reelSize) || 0, o.reelSizeUnit);
                                                const heightMm = toMm(Number(o.cutSize) || 0, o.cutSizeUnit);
                                                const gsm = Number(o.gsm) || 0;
                                                const localWeight = (widthMm > 0 && heightMm > 0 && gsm > 0 && total > 0) ? calcTotalWeightKg(widthMm, heightMm, gsm, total).toFixed(2) : "";
                                                setOrders(prev => prev.map(r => r.id === o.id ? { ...r, packets: pkts, qty: total > 0 ? String(total) : "", weightKg: localWeight } : r));
                                                if (widthMm > 0 && heightMm > 0 && gsm > 0 && total > 0) { void backendTotalWeightKg(widthMm,heightMm,gsm,total).then(bw => setOrders(prev => prev.map(r => r.id === o.id ? { ...r, weightKg: Number(bw).toFixed(2) } : r))); }
                                                if (hasFetched) setHasFetched(false);
                                            }}
                                        />
                                        <span className="text-[10px] font-black text-gray-300">×</span>
                                        <select
                                            className="text-[10px] font-black text-gray-500 bg-transparent outline-none"
                                            value={o.sheetsPerPacket}
                                            onChange={e => {
                                                const spp = e.target.value;
                                                const total = (Number(o.packets) || 0) * (Number(spp) || 100);
                                                // Auto-calculate weight when sheets per packet changes
                                                const widthMm = toMm(Number(o.reelSize) || 0, o.reelSizeUnit);
                                                const heightMm = toMm(Number(o.cutSize) || 0, o.cutSizeUnit);
                                                const gsm = Number(o.gsm) || 0;
                                                const localWeight = (widthMm > 0 && heightMm > 0 && gsm > 0 && total > 0) ? calcTotalWeightKg(widthMm, heightMm, gsm, total).toFixed(2) : "";
                                                setOrders(prev => prev.map(r => r.id === o.id ? { ...r, sheetsPerPacket: spp, qty: total > 0 ? String(total) : "", weightKg: localWeight } : r));
                                                if (widthMm > 0 && heightMm > 0 && gsm > 0 && total > 0) { void backendTotalWeightKg(widthMm,heightMm,gsm,total).then(bw => setOrders(prev => prev.map(r => r.id === o.id ? { ...r, weightKg: Number(bw).toFixed(2) } : r))); }
                                                if (hasFetched) setHasFetched(false);
                                            }}
                                        >
                                            <option value="100">100</option>
                                            <option value="125">125</option>
                                            <option value="250">250</option>
                                            <option value="500">500</option>
                                        </select>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="number"
                                        placeholder="2100"
                                        className="w-20 bg-transparent font-black text-sm outline-none text-right text-brand-600 dark:text-brand-400 border-b border-transparent focus:border-indigo-400"
                                        value={o.qty}
                                        onChange={e => {
                                            const qty = e.target.value;
                                            const spp = Number(o.sheetsPerPacket) || 100;
                                            const pkts = qty ? (Math.round((Number(qty) / spp) * 10) / 10).toString() : "";
                                            // Auto-calculate weight when sheets change
                                            const widthMm = toMm(Number(o.reelSize) || 0, o.reelSizeUnit);
                                            const heightMm = toMm(Number(o.cutSize) || 0, o.cutSizeUnit);
                                            const gsm = Number(o.gsm) || 0;
                                            const sheets = Number(qty) || 0;
                                            const localWeight = (widthMm > 0 && heightMm > 0 && gsm > 0 && sheets > 0) ? calcTotalWeightKg(widthMm, heightMm, gsm, sheets).toFixed(2) : "";
                                            setOrders(prev => prev.map(r => r.id === o.id ? { ...r, qty, packets: pkts, weightKg: localWeight } : r));
                                            if (widthMm > 0 && heightMm > 0 && gsm > 0 && sheets > 0) { void backendTotalWeightKg(widthMm,heightMm,gsm,sheets).then(bw => setOrders(prev => prev.map(r => r.id === o.id ? { ...r, weightKg: Number(bw).toFixed(2) } : r))); }
                                            if (hasFetched) setHasFetched(false);
                                        }}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1 justify-end">
                                        <Weight className="w-3.5 h-3.5 text-emerald-500" />
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            step="0.01"
                                            className="w-20 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-lg h-9 px-2 text-xs font-black outline-none focus:border-emerald-500 text-emerald-700 dark:text-emerald-300 text-right"
                                            value={o.weightKg || ""}
                                            onChange={e => {
                                                const weight = e.target.value;
                                                // Auto-calculate sheets when weight changes
                                                const widthMm = toMm(Number(o.reelSize) || 0, o.reelSizeUnit);
                                                const heightMm = toMm(Number(o.cutSize) || 0, o.cutSizeUnit);
                                                const gsm = Number(o.gsm) || 0;
                                                const weightKg = Number(weight) || 0;
                                                const localSheets = (widthMm > 0 && heightMm > 0 && gsm > 0 && weightKg > 0) ? calcSheetsFromWeight(widthMm, heightMm, gsm, weightKg) : 0;
                                                const spp = Number(o.sheetsPerPacket) || 100;
                                                const pkts = localSheets > 0 ? (Math.round((localSheets / spp) * 10) / 10).toString() : "";
                                                setOrders(prev => prev.map(r => r.id === o.id ? { ...r, weightKg: weight, qty: localSheets > 0 ? String(localSheets) : "", packets: pkts } : r));
                                                if (widthMm > 0 && heightMm > 0 && gsm > 0 && weightKg > 0) { void backendSheetsFromWeight(widthMm,heightMm,gsm,weightKg).then(bs => { const bp = bs > 0 ? (Math.round((bs / Number(o.sheetsPerPacket || 100)) * 10) / 10).toString() : ""; setOrders(prev => prev.map(r => r.id === o.id ? { ...r, qty: bs > 0 ? String(bs) : "", packets: bp } : r)); }); }
                                                if (hasFetched) setHasFetched(false);
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => removeOrder(o.id)}
                                        disabled={orders.length === 1}
                                        className="p-1.5 text-gray-300 hover:text-red-500 disabled:opacity-20 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-4">

                <button
                    onClick={fetchReels}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-8 py-3 bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:from-green-600 hover:to-emerald-700 transition-all shadow-xl shadow-green-500/30 active:scale-95 disabled:opacity-60"
                >
                    {isLoading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Calculating...</>
                    ) : (
                        <><Zap className="w-4 h-4" /> Find Best Roll Fit</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default OrderInputTable;
