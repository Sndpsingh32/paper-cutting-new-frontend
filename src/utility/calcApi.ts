import { postData, toCm } from "./utility";

const toMm = (val: number, unit: string) => toCm(val, unit) * 10;

const localWeightPerSheetKg = (width: number, height: number, unit: string, gsm: number) => {
  const wM = toCm(width, unit) * 0.01;
  const hM = toCm(height, unit) * 0.01;
  return wM * hM * Number(gsm) / 1000; // kg (raw) - legacy fallback
};

export async function calcTotalWeightKgBackendFirst(params: {
  width: number; height: number; unit: string; gsm: number; sheets: number; roundingMode?: "raw" | "admin_ream_ceil" | "sql_round_2" | "sql_round_4";
}) {
  const { width, height, unit, gsm, sheets, roundingMode = "raw" } = params;
  const localPerSheet = localWeightPerSheetKg(width, height, unit, gsm);
  const localTotal = roundingMode === "admin_ream_ceil"
    ? (Math.ceil(localPerSheet * 1000) * Number(sheets)) / 1000
    : localPerSheet * Number(sheets);
  try {
    const res = await postData('/calculations/total-weight', {
      width_mm: toMm(width, unit),
      height_mm: toMm(height, unit),
      gsm: Number(gsm),
      sheets: Number(sheets),
      rounding_mode: roundingMode,
    });
    if (res?.success && res?.data) {
      return {
        weightPerSheetKg: Number(res.data.weight_per_sheet_kg ?? localPerSheet),
        totalWeightKg: Number(res.data.total_weight_kg ?? localTotal),
        source: 'python' as const,
      };
    }
  } catch (e) {
    console.warn('Backend calc total-weight failed, using local fallback', e);
  }
  return { weightPerSheetKg: localPerSheet, totalWeightKg: localTotal, source: 'local-fallback' as const };
}

export async function calcSheetsFromWeightBackendFirst(params: { width: number; height: number; unit: string; gsm: number; weightKg: number; }) {
  const { width, height, unit, gsm, weightKg } = params;
  const localPerSheet = localWeightPerSheetKg(width, height, unit, gsm);
  const localSheets = localPerSheet > 0 ? Math.floor(Number(weightKg) / localPerSheet) : 0;
  try {
    const res = await postData('/calculations/sheets-from-weight', {
      width_mm: toMm(width, unit),
      height_mm: toMm(height, unit),
      gsm: Number(gsm),
      weight_kg: Number(weightKg),
    });
    if (res?.success && res?.data) {
      return {
        weightPerSheetKg: Number(res.data.weight_per_sheet_kg ?? localPerSheet),
        sheets: Math.max(0, Math.floor(Number(res.data.sheets ?? localSheets))),
        source: 'python' as const,
      };
    }
  } catch (e) {
    console.warn('Backend calc sheets-from-weight failed, using local fallback', e);
  }
  return { weightPerSheetKg: localPerSheet, sheets: localSheets, source: 'local-fallback' as const };
}

export type ReelStats = {
  ups: number; totalSheets: number; sheetsPerPiece: number; trimWaste: number; stripsUsed: number;
  pieceWiseWaste: number; pieceWiseWastePercentage: number; safeStrips: number; orientation: 'Normal'|'Rotated';
  weightPerSheet: number; detectedGrain: string; availableLengthCm?: number;
};

const localReelStats = (reel: any, rWidth: number, rHeight: number, rGsm: number, rWidthUnit: string, rHeightUnit: string, targetQty: number): ReelStats | undefined => {
  const toCmVal = (val: number, unit: string) => unit === 'mm' ? val / 10 : unit === 'inch' ? val * 2.54 : val;
  const cutW = toCmVal(rWidth, rWidthUnit); const cutH = toCmVal(rHeight, rHeightUnit);
  let rollW = Number(reel?.width || 0); const reelUnit = reel?.sizeUnit || 'cm';
  if (reelUnit === 'mm') rollW /= 10; else if (reelUnit === 'inch') rollW *= 2.54;
  const gsm = Number(rGsm || reel?.gsm || 0);
  const ups1 = cutW > 0 ? Math.floor((rollW + 0.001) / cutW) : 0;
  const ups2 = cutH > 0 ? Math.floor((rollW + 0.001) / cutH) : 0;
  const ups = Math.max(ups1, ups2); const bestCutW = ups1 >= ups2 ? cutW : cutH; const bestCutL = ups1 >= ups2 ? cutH : cutW;
  if (ups === 0 || gsm === 0) return undefined;
  const weightPerSheet = (cutW * 0.01 * cutH * 0.01 * gsm) / 1000;
  const availableLengthCm = (((Number(reel?.currentBalanceKg || 0) * 1000) / ((rollW * 0.01) * gsm)) * 100);
  const sheetsPerPiece = Math.floor(availableLengthCm / bestCutL);
  const totalSheets = sheetsPerPiece * ups;
  const trimWaste = ((rollW - (bestCutW * ups)) / rollW) * 100;
  const grainDir = (ups1 >= ups2) ? (cutH > cutW ? 'Long Grain' : 'Short Grain') : (cutW > cutH ? 'Long Grain' : 'Short Grain');
  let stripsUsed = 0, pieceWiseWaste = 0, pieceWiseWastePercentage = 0, safeStrips = ups;
  const targetQ = Number(targetQty || 0);
  if (targetQ > 0 && sheetsPerPiece > 0) {
    if (totalSheets < targetQ) { stripsUsed = ups; pieceWiseWaste = 0; pieceWiseWastePercentage = 0; safeStrips = 0; }
    else { stripsUsed = Math.ceil(targetQ / sheetsPerPiece); pieceWiseWaste = (stripsUsed * sheetsPerPiece) - targetQ; pieceWiseWastePercentage = (pieceWiseWaste / (stripsUsed * sheetsPerPiece)) * 100; safeStrips = Math.max(0, ups - stripsUsed); }
  }
  return { ups, totalSheets, sheetsPerPiece, trimWaste, stripsUsed, pieceWiseWaste, pieceWiseWastePercentage, safeStrips, orientation: ups1 >= ups2 ? 'Normal' : 'Rotated', weightPerSheet, detectedGrain: grainDir, availableLengthCm };
};

const reelStatsCache = new Map<string, ReelStats | null>();

export async function calcReelStatsBackendFirst(params: { reel: any; rWidth: number; rHeight: number; rGsm: number; rWidthUnit: string; rHeightUnit: string; targetQty?: number; }): Promise<ReelStats | undefined> {
  const { reel, rWidth, rHeight, rGsm, rWidthUnit, rHeightUnit, targetQty = 0 } = params;
  const key = JSON.stringify([reel?._id, reel?.width, reel?.sizeUnit, reel?.currentBalanceKg, rWidth, rHeight, rGsm, rWidthUnit, rHeightUnit, targetQty]);
  if (reelStatsCache.has(key)) return reelStatsCache.get(key) || undefined;
  const local = localReelStats(reel, rWidth, rHeight, rGsm, rWidthUnit, rHeightUnit, targetQty);
  try {
    const res = await postData('/calculations/reel-stats', {
      reelWidth: Number(reel?.width || 0), reelSizeUnit: reel?.sizeUnit || 'cm', currentBalanceKg: Number(reel?.currentBalanceKg || 0),
      gsm: Number(rGsm || reel?.gsm || 0), cutWidth: Number(rWidth), cutHeight: Number(rHeight), cutUnit: rWidthUnit || 'cm', targetQty: Number(targetQty || 0)
    });
    if (res?.success && res?.data) {
      const d = res.data;
      const mapped: ReelStats = {
        ups: Number(d.ups||0), totalSheets: Number(d.total_sheets||0), sheetsPerPiece: Number(d.sheets_per_piece||0),
        trimWaste: Number(d.trim_waste_percent||0), stripsUsed: Number(d.strips_used||0), pieceWiseWaste: Number(d.piece_wise_waste||0),
        pieceWiseWastePercentage: Number(d.piece_wise_waste_percent||0), safeStrips: Number(d.safe_strips||0),
        orientation: d.orientation === 'Rotated' ? 'Rotated' : 'Normal', weightPerSheet: Number(d.weight_per_sheet_kg||0),
        detectedGrain: String(d.detected_grain || local?.detectedGrain || 'Short Grain'), availableLengthCm: Number(d.available_length_cm||0)
      };
      reelStatsCache.set(key, mapped);
      return mapped;
    }
  } catch (e) { console.warn('Backend calc reel-stats failed, using local fallback', e); }
  reelStatsCache.set(key, local || null);
  return local;
}
