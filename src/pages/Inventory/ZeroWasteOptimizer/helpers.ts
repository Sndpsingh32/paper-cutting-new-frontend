/**
 * UI/helper utilities for ZeroWaste page.
 * Optimization calc ownership: Python + OR-Tools via Node proxy (/zerowaste/*).
 * Local weight/length helpers here are legacy/fallback-only where still referenced.
 */
import { SizeUnit, Reel } from "../../../types/reel";

export function normalizeOrderQuality(quality?: string): string {
    if (!quality || quality.trim() === "" || quality.toLowerCase() === "any") return "Any";
    return quality.trim();
}

export function isOrderQualityMatch(orderQuality: string | undefined, reelQuality: string | undefined): boolean {
    const normalized = normalizeOrderQuality(orderQuality);
    if (normalized === "Any") return true;
    return normalized === reelQuality;
}

export const toMm = (val: number, unit: SizeUnit): number => {
    if (unit === SizeUnit.MM) return val;
    if (unit === SizeUnit.CM) return val * 10;
    if (unit === SizeUnit.INCH) return val * 25.4;
    return val;
};

export const toCm = (val: number, unit: SizeUnit): number => {
    if (unit === SizeUnit.MM) return val / 10;
    if (unit === SizeUnit.CM) return val;
    if (unit === SizeUnit.INCH) return val * 2.54;
    return val;
};

export const createSeededRandom = (seed: number) => {
    let currentSeed = seed;
    return () => {
        currentSeed = (currentSeed * 16807) % 2147483647;
        return (currentSeed - 1) / 2147483646;
    };
};

export function shuffle(arr: any[], randomFunc: () => number) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(randomFunc() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** Fallback-only UI estimate. Business calc ownership: Node /calculations/* -> Python. */
export function calcAvailableLengthCm(reel: Reel, rollWidthCm: number, gsm: number): number {
    const rollWMeters = rollWidthCm * 0.01;
    return ((reel.currentBalanceKg * 1000) / (rollWMeters * gsm)) * 100;
}

const leftoverStoreKey = "leftoverWidths";

export function saveLeftover(trim: number) {
    if (trim > 100) { // ignore small waste
        const old = JSON.parse(localStorage.getItem(leftoverStoreKey) || "[]");
        old.push(trim);
        localStorage.setItem(leftoverStoreKey, JSON.stringify(old.slice(-50))); // last 50 only
    }
}

export function getBestReuseMatch(width: number) {
    const leftovers = JSON.parse(localStorage.getItem(leftoverStoreKey) || "[]");
    return leftovers.find((l: number) => Math.abs(l - width) < 10);
}

// 🏋️ WEIGHT CALCULATION HELPERS

/**
 * Calculate weight per sheet in kg
 * Formula: (Width mm × Height mm × GSM) / 1,000,000,000
 */
/** Fallback-only UI estimate. Business calc ownership: Node /calculations/* -> Python. */
export function calcWeightPerSheetKg(widthMm: number, heightMm: number, gsm: number): number {
    return (widthMm * heightMm * gsm) / 1000000000;
}

/**
 * Calculate total weight from sheets
 */
export function calcTotalWeightKg(widthMm: number, heightMm: number, gsm: number, sheets: number): number {
    return calcWeightPerSheetKg(widthMm, heightMm, gsm) * sheets;
}

/**
 * Calculate sheets from total weight
 */
export function calcSheetsFromWeight(widthMm: number, heightMm: number, gsm: number, weightKg: number): number {
    const weightPerSheet = calcWeightPerSheetKg(widthMm, heightMm, gsm);
    if (weightPerSheet <= 0) return 0;
    return Math.round(weightKg / weightPerSheet);
}
