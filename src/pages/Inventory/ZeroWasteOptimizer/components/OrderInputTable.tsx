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
    const filledOrders = orders.filter(o => o.gsm && o.reelSize && o.cutSize && o.qty).length;
    const totalQty = orders.reduce((sum, o) => sum + (Number(o.qty) || 0), 0);
    const totalWeight = orders.reduce((sum, o) => sum + (Number(o.weightKg) || 0), 0);

    return (
        <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 bg-linear-to-r from-white via-gray-50 to-brand-50/50 px-6 py-6 dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 sm:px-8">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/20">
                            <Scissors className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                                Order Workspace
                            </div>
                            <h3 className="mt-3 text-xl font-black text-gray-900 dark:text-white sm:text-2xl">Customer Requirements</h3>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                                Add customer orders, validate sizes, and run optimization. The layout stays clean for operators while keeping all existing calculations intact.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white/80 p-2 dark:border-gray-700 dark:bg-gray-800/70">
                            <div className="rounded-xl px-3 py-2 text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Ready</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">{filledOrders}</p>
                            </div>
                            <div className="rounded-xl px-3 py-2 text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Sheets</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">{totalQty.toLocaleString()}</p>
                            </div>
                            <div className="rounded-xl px-3 py-2 text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Weight</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">{totalWeight.toFixed(1)}kg</p>
                            </div>
                        </div>
                        <button
                            onClick={addOrder}
                            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                        >
                            <span className="text-base leading-none">+</span>
                            Add Order
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/50">
                            <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">#</th>
                            <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Client / Party</th>
                            <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Quality</th>
                            <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">GSM</th>
                            <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">Reel Size</th>
                            <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">Cutting Size</th>
                            <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">Grain</th>
                            <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Packets × Sheets</th>
                            <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Total Qty</th>
                            <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">Weight (kg)</th>
                            <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {orders.map((o, idx) => (
                            <tr key={o.id} className="group transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
                                <td className="px-4 py-4">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-xs font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <input
                                        placeholder="Client name"
                                        className="w-32 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-brand-200 focus:bg-brand-50/40 dark:text-white dark:placeholder:text-gray-600 dark:focus:border-brand-500/30 dark:focus:bg-brand-500/5"
                                        value={o.client}
                                        onChange={e => updateOrder(o.id, "client", e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-4">
                                    <select
                                        className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        value={o.quality}
                                        onChange={e => updateOrder(o.id, "quality", e.target.value)}
                                    >
                                        <option value="">Any</option>
                                        {Object.values(PaperQuality).map(q => <option key={q} value={q}>{q}</option>)}
                                    </select>
                                </td>
                                <td className="px-4 py-4">
                                    <input
                                        type="number"
                                        placeholder="GSM"
                                        className="h-10 w-20 rounded-xl border border-gray-200 bg-white px-2 text-center text-xs font-bold text-gray-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
                                <td className="px-4 py-4">
                                    <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                        <input
                                            type="number"
                                            placeholder="26"
                                            className="h-10 w-20 bg-transparent px-2 text-center text-sm font-bold text-gray-800 outline-none dark:text-white"
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
                                            className="h-10 border-l border-gray-200 bg-gray-50 px-2 text-[10px] font-black uppercase text-gray-500 outline-none dark:border-gray-700 dark:bg-gray-700/60 dark:text-gray-300"
                                            value={o.reelSizeUnit}
                                            onChange={e => {
                                                const unit = e.target.value as SizeUnit;
                                                const w = toMm(Number(o.reelSize) || 0, unit);
                                                const h = toMm(Number(o.cutSize) || 0, unit);
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
                                <td className="px-4 py-4">
                                    <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                        <input
                                            type="number"
                                            placeholder="17.5"
                                            className="h-10 w-20 bg-transparent px-2 text-center text-sm font-bold text-gray-800 outline-none dark:text-white"
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
                                            className="h-10 border-l border-gray-200 bg-gray-50 px-2 text-[10px] font-black uppercase text-gray-500 outline-none dark:border-gray-700 dark:bg-gray-700/60 dark:text-gray-300"
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
                                <td className="px-4 py-4">
                                    <select
                                        className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        value={o.grain || "Any"}
                                        onChange={e => updateOrder(o.id, "grain", e.target.value as any)}
                                    >
                                        <option value="Any">Any Grain</option>
                                        <option value="Long">Grain Long</option>
                                        <option value="Short">Grain Short</option>
                                    </select>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <input
                                            type="number"
                                            placeholder="Pkts"
                                            className="h-10 w-16 rounded-xl border border-gray-200 bg-white px-2 text-center text-xs font-bold text-gray-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                            value={o.packets}
                                            onChange={e => {
                                                const pkts = e.target.value;
                                                const total = (Number(pkts) || 0) * (Number(o.sheetsPerPacket) || 100);
                                                const widthMm = toMm(Number(o.reelSize) || 0, o.reelSizeUnit);
                                                const heightMm = toMm(Number(o.cutSize) || 0, o.cutSizeUnit);
                                                const gsm = Number(o.gsm) || 0;
                                                const localWeight = (widthMm > 0 && heightMm > 0 && gsm > 0 && total > 0) ? calcTotalWeightKg(widthMm, heightMm, gsm, total).toFixed(2) : "";
                                                setOrders(prev => prev.map(r => r.id === o.id ? { ...r, packets: pkts, qty: total > 0 ? String(total) : "", weightKg: localWeight } : r));
                                                if (widthMm > 0 && heightMm > 0 && gsm > 0 && total > 0) { void backendTotalWeightKg(widthMm,heightMm,gsm,total).then(bw => setOrders(prev => prev.map(r => r.id === o.id ? { ...r, weightKg: Number(bw).toFixed(2) } : r))); }
                                                if (hasFetched) setHasFetched(false);
                                            }}
                                        />
                                        <span className="text-xs font-bold text-gray-300">×</span>
                                        <select
                                            className="h-10 rounded-xl border border-gray-200 bg-white px-2 text-xs font-bold text-gray-600 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                            value={o.sheetsPerPacket}
                                            onChange={e => {
                                                const spp = e.target.value;
                                                const total = (Number(o.packets) || 0) * (Number(spp) || 100);
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
                                <td className="px-4 py-4">
                                    <input
                                        type="number"
                                        placeholder="2100"
                                        className="h-10 w-24 rounded-xl border border-gray-200 bg-white px-3 text-right text-sm font-black text-gray-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        value={o.qty}
                                        onChange={e => {
                                            const qty = e.target.value;
                                            const spp = Number(o.sheetsPerPacket) || 100;
                                            const pkts = qty ? (Math.round((Number(qty) / spp) * 10) / 10).toString() : "";
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
                                <td className="px-4 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="flex h-10 items-center overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                                            <span className="pl-2 text-emerald-500"><Weight className="h-3.5 w-3.5" /></span>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                step="0.01"
                                                className="w-20 bg-transparent px-2 text-right text-xs font-black text-emerald-700 outline-none dark:text-emerald-300"
                                                value={o.weightKg || ""}
                                                onChange={e => {
                                                    const weight = e.target.value;
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
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <button
                                        onClick={() => removeOrder(o.id)}
                                        disabled={orders.length === 1}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-700 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                                        title="Remove order"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-gray-100 px-6 py-5 dark:border-gray-800 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">Tip:</span> Fill GSM, Reel Size, Cutting Size, and Quantity for accurate optimization.
                </div>

                <button
                    onClick={fetchReels}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isLoading ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> Optimizing...</>
                    ) : (
                        <><Zap className="h-4 w-4" /> Find Best Roll Fit</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default OrderInputTable;
