import { Reel, SizeUnit } from "../../../types/reel";

export interface OrderRow {
    id: string;
    client: string;
    quality: string;
    gsm: string;
    reelSize: string;    // Width  = Roll width (reel width)
    reelSizeUnit: SizeUnit;
    cutSize: string;     // Height = Cutting size (cut height/length)
    cutSizeUnit: SizeUnit;
    packets: string;     // 1 packet = 100 sheets
    sheetsPerPacket: string;
    qty: string;
    grain: "Long" | "Short" | "Any";
    weightKg?: string;   // Weight in kg - auto calculated or user input
}

export interface OptimizationResult {
    reel: Reel;
    orders: OrderRow[];
    stripsLayout: StripLayout[];
    totalReelWidthUsed: number;
    reelWidth: number;
    trimWasteMm: number;
    trimWastePercent: number;
    trimIsUsable: boolean;    // true if trim = 0mm OR trim >= 450mm (next order usable)
    trimMatchesOrderWidth: boolean; // true if trim width ~= one of the pending order reel sizes
    trimBestMatchMm: number;        // which order width the trim can serve (0 if none)
    trimIsAdjustableMatch?: boolean; // true if trim can be used by adjusting order width within ±25mm
    lengthWasteSheets: number;
    lengthWastePercent: number;
    totalOrderedSheets: number;
    rollYieldSheets: number;
    totalUsableSheets: number;
    totalWeightKg: string;
    isZeroWaste: boolean;
    approvalNeeded: boolean;
    wasteCategory: "zero" | "low" | "medium" | "high";
    recommendation: string;
    optimizations: string[];
    wasteReasons: string[];
    score: number;
    cannotFit?: boolean;   // true when no strips fit at all
    cannotFitReason?: string;
    isDeadZone?: boolean;  // true when waste is 20-450mm (should take fewer orders)
    actionableAdjustment?: { orderId: string, adjustToWidthMm: number, label: string, isWidthRotated?: boolean };
}

export interface StripLayout {
    orderId: string;
    client: string; // Detailed description (Technical)
    clientName?: string; // Clean party name (for billing)
    mode: 'Fixed' | 'Full' | 'Skip';
    slitIndex?: number;
    reelSize: number;
    adjustedReelSize?: number; // The actual width used after 25mm tolerance adjustment
    cutSize: number;
    count: number;
    sheetsPerStrip: number;
    totalSheets: number;
    usableSheets: number;
    requestedSheets: number; // For this specific roll optimization
    originalOrderQty: number; // The absolute requirement from the user input
    excessSheets: number;
    excessSheetsPercent: number;
    isRotated: boolean;
}

// A group of orders sharing the same Quality + GSM (can share one roll)
export interface OrderGroup {
    key: string;        // e.g. "SBS__230"
    quality: string;
    gsm: number;
    orders: OrderRow[];
}

// Result for one group — multiple roll options ranked by score
export interface GroupResult {
    group: OrderGroup;
    rollOptions: OptimizationResult[];   // sorted best first
    noReelsFound: boolean;               // API returned 0 reels for this group
}

export const OPT_CONFIG = {
    TRIM_USEFUL_MIN_MM: 10,
    TRIM_MATCH_TOLERANCE_MM: 8,
    MAX_DFS_PATTERNS: 100,
    CACHE_SIZE_LIMIT: 3000,
    EXPLORATION_BIAS: 0.7,
    MAX_SEQUENCE_LENGTH: 15,
    MAX_ITERATIONS: 30,
    DFS_TIMEOUT_MS: 200,
    EARLY_EXIT_SCORE: 70000,
    WEIGHTS: {
        PERFECT_FIT: 10000,
        USABLE_TRIM: 2000,
        DEAD_TRIM_PENALTY: -10000,
        MULTI_ORDER_BONUS: 2000,
    }
};
