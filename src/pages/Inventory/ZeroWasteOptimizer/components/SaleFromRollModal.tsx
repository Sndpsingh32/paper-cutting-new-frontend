import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { postData } from "../../../../utility/utility";
import { Reel } from '../../../../types/reel';
import { ShoppingBag, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface StripInfo {
  orderId: string;
  client: string;
  reelSize: number;
  cutSize: number;
  usableSheets: number;
  totalSheets: number;
  isRotated: boolean;
  sheets: number;
  mode: string;
  fullStripWeight: number;
  clientName?: string;
}

interface ItemSaleData {
  stripIdx: number;
  client: string;
  sheetNo: string;
  reelSize: number;
  cutSize: number;
  qtySold: number;
  targetQty: number;
  potentialQty: number;
  pricePerKg: number;
  totalWeight: number;
  fullStripWeight: number;
  totalAmount: number;
  mode: string;
}

interface SaleFromRollData {
  reel: Reel | any;
  strips: StripInfo[];
  quality: string;
  gsm: number;
  trimWasteKg?: number;
  remainingWidthMm?: number;
  totalWidthMm?: number;
  trimIsUsable?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  saleData: SaleFromRollData | null;
  onSaleComplete: () => void;
}

const SaleFromRollModal: React.FC<Props> = ({ isOpen, onClose, saleData, onSaleComplete }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ItemSaleData[]>([]);
  const [saleDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (saleData && isOpen) {
      const initialItems: ItemSaleData[] = saleData.strips.map((s, idx) => {
        const wInM = s.reelSize / 1000;
        const hInM = s.cutSize / 1000;
        const weightPerSheet = (wInM * hInM * saleData.gsm) / 1000;

        return {
          stripIdx: idx,
          client: s.clientName || s.client,
          sheetNo: `${saleData.reel.reelNo || 'ROLL'}/P${idx + 1}`,
          reelSize: s.reelSize,
          cutSize: s.cutSize,
          qtySold: s.sheets,
          targetQty: s.usableSheets,
          potentialQty: s.totalSheets,
          pricePerKg: 0,
          totalWeight: weightPerSheet * (Number(s.sheets) || 0),
          fullStripWeight: s.fullStripWeight || 0,
          totalAmount: 0,
          mode: s.mode
        };
      });
      setItems(initialItems);
    }
  }, [saleData, isOpen]);

  const updateItem = (idx: number, field: keyof ItemSaleData, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[idx], [field]: value };

      if (field === 'qtySold' || field === 'pricePerKg') {
        const qty = (Number(item.qtySold) || 0);
        const wInM = item.reelSize / 1000;
        const hInM = item.cutSize / 1000;
        const weightPerSheet = (wInM * hInM * (saleData?.gsm || 0)) / 1000;
        item.totalWeight = weightPerSheet * qty;
        item.totalAmount = item.totalWeight * (Number(item.pricePerKg) || 0);
      }

      newItems[idx] = item;
      return newItems;
    });
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totals = useMemo(() => {
    return items.reduce((acc, item) => ({
      qty: acc.qty + (Number(item.qtySold) || 0),
      weight: acc.weight + (Number(item.totalWeight) || 0),
      potentialWeight: acc.potentialWeight + (Number(item.fullStripWeight) || 0),
      amount: acc.amount + (Number(item.totalAmount) || 0)
    }), { qty: 0, weight: 0, potentialWeight: 0, amount: 0 });
  }, [items]);

  const handleSubmit = async (status: string = 'approved') => {
    if (!saleData) return;
    setLoading(true);

    try {
      let sourceId = saleData.reel._id || saleData.reel.id || "unknown";
      if (typeof sourceId === 'object') sourceId = sourceId.toString();

      const isReadyStrip = saleData.reel.isPattiStock;

      const payload = {
        reelId: String(sourceId),
        totalWeightKg: isReadyStrip ? Number(totals.weight) : Number(totals.potentialWeight),
        trimWasteKg: saleData.trimIsUsable ? 0 : Number(saleData.trimWasteKg || 0),
        items: items.map(item => ({
          ...item,
          potentialQty: isReadyStrip ? item.qtySold : item.potentialQty,
          totalQty: isReadyStrip ? item.qtySold : item.potentialQty,
          totalWeight: isReadyStrip ? Number(item.totalWeight.toFixed(4)) : Number(item.fullStripWeight.toFixed(4)),
          sourceReelNo: saleData.reel.reelNo
        })),
        entryDate: saleDate,
        status: status,
        sourceReelNo: saleData.reel.reelNo,
        // Manual override for side-cut preservation (works for both Roll and Patti)
        ...(saleData.trimIsUsable && saleData.remainingWidthMm !== undefined && saleData.totalWidthMm ? (() => {
          const ratio = saleData.remainingWidthMm / saleData.totalWidthMm;
          const currentWeight = Number(saleData.reel.currentBalanceKg || saleData.reel.totalWeightKg || 0);
          const currentWidth = Number(saleData.reel.width || 0);

          return {
            newReelWidth: parseFloat((ratio * currentWidth).toFixed(2)),
            newReelWeight: parseFloat((ratio * currentWeight).toFixed(4))
          };
        })() : {})
      };

      const response = await postData('/sheet/create', payload);

      if (response && (response.success || response.statusCode < 300)) {
        toast.success(saleData.reel.isPattiStock ? "Strip sale and leftover updated!" : "Roll production confirmed!");
        onSaleComplete();
        onClose();
      } else {
        toast.error(response?.message || "Production failed");
      }
    } catch (err) {
      console.error("Production Error", err);
      toast.error("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !saleData) return null;

  const isReadyStrip = saleData.reel.isPattiStock;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className={`px-8 py-6 ${isReadyStrip ? 'bg-emerald-600' : 'bg-indigo-600'} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2">
                Confirm {isReadyStrip ? 'Ready Strip Sale' : 'Roll Cutting & Sale'}
              </h2>
              <div className="flex items-center gap-3 mt-1 opacity-80">
                <span className="text-xs font-bold uppercase tracking-widest">
                  {isReadyStrip ? `Strip #${saleData.reel.reelNo}` : `Roll #${saleData.reel.reelNo}`}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/40" />
                <span className="text-xs font-bold uppercase tracking-widest">{saleData.gsm} GSM</span>
                <span className="w-1 h-1 rounded-full bg-white/40" />
                <span className="text-xs font-bold uppercase tracking-widest">{saleData.quality}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <XCircle className="w-8 h-8" />
          </button>
        </div>

        {/* 📊 High-Density Production Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th className="px-8 py-4">Identification</th>
                <th className="px-4 py-4">Dimensions</th>
                <th className="px-4 py-4 text-center">Production Qty</th>
                <th className="px-4 py-4 text-center">Rate (₹/Kg)</th>
                <th className="px-4 py-4 text-right">Net Weight</th>
                <th className="px-4 py-4 text-right">Subtotal</th>
                <th className="px-8 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item, idx) => {
                const diff = item.qtySold - item.targetQty;
                const isShortfall = diff < 0;
                const isExtra = diff > 0;

                return (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex flex-col gap-1">
                        <input
                          value={item.sheetNo}
                          onChange={e => updateItem(idx, 'sheetNo', e.target.value)}
                          className="bg-transparent font-black text-gray-800 dark:text-white text-sm outline-none border-b-2 border-transparent focus:border-indigo-500 transition-all w-40"
                          placeholder="Batch No"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">{item.client || 'STOCK'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${item.mode === 'Full' ? 'bg-indigo-100 text-indigo-700' :
                            item.mode === 'Skip' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                            {item.mode}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{item.reelSize.toFixed(0)} × {item.cutSize.toFixed(0)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="relative">
                          <input
                            type="number"
                            value={item.qtySold}
                            onChange={e => updateItem(idx, 'qtySold', e.target.value)}
                            className={`w-24 px-2 py-1.5 rounded-lg font-black text-xs text-center border outline-none transition-all ${item.mode === 'Full' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' :
                              isShortfall ? 'border-red-200 bg-red-50 text-red-700' :
                                isExtra ? 'border-amber-200 bg-amber-50 text-amber-700' :
                                  'border-green-200 bg-green-50 text-green-700'
                              }`}
                          />
                          {item.mode === 'Full' && isExtra && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[7px] font-black uppercase whitespace-nowrap shadow-sm">
                              Full Roll
                            </div>
                          )}
                          {item.mode === 'Fixed' && isExtra && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-amber-500 text-white rounded text-[7px] font-black uppercase whitespace-nowrap shadow-sm">
                              Extra Qty
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-gray-400">Req: {item.targetQty.toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-gray-400 italic">Possible: {item.potentialQty.toLocaleString()}</span>
                          {item.mode === 'Fixed' && item.potentialQty > item.qtySold && (
                            <span className="text-[9px] font-black text-emerald-500">
                              Remaining: {(item.potentialQty - item.qtySold).toLocaleString()} (Stock)
                            </span>
                          )}
                          {isExtra && (
                            <span className={`text-[9px] font-black ${item.mode === 'Full' ? 'text-indigo-500' : 'text-amber-500'}`}>
                              +{(item.qtySold - item.targetQty).toLocaleString()} Extra
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          value={item.pricePerKg}
                          onChange={e => updateItem(idx, 'pricePerKg', e.target.value)}
                          className="w-20 px-2 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-center font-black text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-indigo-600">
                          {(item.fullStripWeight || 0).toFixed(2)} <span className="text-[10px] opacity-40">Kg</span>
                        </span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Full Strip Weight</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-black text-emerald-600">₹{item.totalAmount.toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 🧾 Compact Summary Footer */}
        <div className="px-8 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex gap-10">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Quantity</span>
              <span className="text-xl font-black text-gray-800 dark:text-white">{totals.qty} <span className="text-[10px] opacity-40">SHT</span></span>
            </div>
            <div className="flex flex-col border-l border-gray-200 dark:border-gray-800 pl-10">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Weight</span>
              <span className="text-xl font-black text-indigo-600">{totals.potentialWeight.toFixed(2)} <span className="text-[10px] opacity-40">KG</span></span>
            </div>
            <div className="flex flex-col border-l border-gray-200 dark:border-gray-800 pl-10">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Estimate</span>
              <span className="text-xl font-black text-emerald-600">₹{totals.amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-gray-500 font-black text-xs uppercase hover:bg-gray-100 transition-all border border-transparent"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit('pending_approval')}
              disabled={loading}
              className="px-6 py-3 rounded-xl border-2 border-indigo-600 text-indigo-600 font-black text-xs uppercase tracking-wider hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50"
            >
              Save as Quotation
            </button>
            <button
              onClick={() => handleSubmit('approved')}
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-gray-900 text-white font-black text-xs uppercase tracking-wider hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Confirming...' : 'Confirm Production'}
              {!loading && <CheckCircle2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SaleFromRollModal;
