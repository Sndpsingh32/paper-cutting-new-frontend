import moment from "moment";
import { downloadCsv, CsvColumn } from "./csvExport";

export interface SheetExportRow {
    sheetNo: string;
    party: string;
    rollNo: string;
    quality: string;
    gsm: number;
    sizeUnit: string;
    cutWidth: number;
    cutHeight: number;
    pieces: number;
    totalSheets: number;
    requiredQty: number;
    productionMode: string;
    balanceKg: number;
    totalWeightKg: number;
    machineLoss: number;
    cutDate: string;
    status: string;
}

function sanitizeFilename(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "sheet";
}

function getReelNo(sheet: Record<string, unknown>): string {
    const reelId = sheet.reelId;
    if (typeof reelId === "object" && reelId !== null) {
        return (reelId as { reelNo?: string }).reelNo || "N/A";
    }
    return "N/A";
}

function getTotalSheets(sheet: Record<string, unknown>): number {
    let total = Number(sheet.totalQty) || 0;
    const items = sheet.items as Array<{ qtySold?: number }> | undefined;
    if (items?.length) {
        const itemsTotal = items.reduce((acc, it) => acc + (Number(it.qtySold) || 0), 0);
        if (itemsTotal > 0) total = itemsTotal;
    }
    return total;
}

function getCutLines(sheet: Record<string, unknown>): { width: number; height: number; pieces: number }[] {
    const items = sheet.items as Array<{ reelSize?: number; cutSize?: number; qtySold?: number; sheets?: number }> | undefined;
    if (items?.length) {
        return items.map((it) => ({
            width: Math.round(Number(it.reelSize || 0) * 100) / 100,
            height: Math.round(Number(it.cutSize || 0) * 100) / 100,
            pieces: Number(it.qtySold || it.sheets || 0),
        }));
    }

    const sizes = (sheet.sizes as Array<{ width?: number; height?: number }>) || [];
    if (sizes.length === 0) {
        return [{ width: 0, height: 0, pieces: Number(sheet.targetQty) || 0 }];
    }

    return sizes.map((s, idx) => ({
        width: Math.round(Number(s.width || 0) * 100) / 100,
        height: Math.round(Number(s.height || 0) * 100) / 100,
        pieces: idx === 0 ? Number(sheet.targetQty) || 0 : 0,
    }));
}

function sheetToExportRows(sheet: Record<string, unknown>): SheetExportRow[] {
    const cutLines = getCutLines(sheet);
    const totalSheets = getTotalSheets(sheet);
    const party = String(sheet.clientName || "STOCK");
    const status = String(sheet.status || "approved");

    return cutLines.map((line) => ({
        sheetNo: String(sheet.sheetNo || ""),
        party,
        rollNo: getReelNo(sheet),
        quality: String(sheet.quality || ""),
        gsm: Number(sheet.gsm) || 0,
        sizeUnit: String(sheet.sizeUnit || "cm"),
        cutWidth: line.width,
        cutHeight: line.height,
        pieces: line.pieces,
        totalSheets,
        requiredQty: Number(sheet.targetQty) || 0,
        productionMode: String(sheet.productionMode || ""),
        balanceKg: Number(sheet.currentBalanceKg) || 0,
        totalWeightKg: Number(sheet.totalWeightKg) || 0,
        machineLoss: Number(sheet.machineLoss) || 0,
        cutDate: sheet.entryDate ? moment(String(sheet.entryDate)).format("DD-MM-YYYY") : "N/A",
        status,
    }));
}

const SHEET_CSV_COLUMNS: CsvColumn<SheetExportRow>[] = [
    { header: "Sheet No", getValue: (r) => r.sheetNo },
    { header: "Party / Client", getValue: (r) => r.party },
    { header: "Roll No", getValue: (r) => r.rollNo },
    { header: "Quality", getValue: (r) => r.quality },
    { header: "GSM", getValue: (r) => r.gsm },
    { header: "Size Unit", getValue: (r) => r.sizeUnit },
    { header: "Cut Width", getValue: (r) => r.cutWidth },
    { header: "Cut Height", getValue: (r) => r.cutHeight },
    { header: "Pieces", getValue: (r) => r.pieces },
    { header: "Total Sheets", getValue: (r) => r.totalSheets },
    { header: "Required Qty", getValue: (r) => r.requiredQty },
    { header: "Production Mode", getValue: (r) => r.productionMode },
    { header: "Balance (kg)", getValue: (r) => r.balanceKg.toFixed(2) },
    { header: "Total Weight (kg)", getValue: (r) => r.totalWeightKg.toFixed(2) },
    { header: "Machine Loss", getValue: (r) => r.machineLoss },
    { header: "Cut Date", getValue: (r) => r.cutDate },
    { header: "Status", getValue: (r) => r.status },
];

export function exportSheetToCsv(sheet: Record<string, unknown>): void {
    const rows = sheetToExportRows(sheet);
    const filename = `sheet-${sanitizeFilename(String(sheet.sheetNo || "lot"))}.csv`;
    downloadCsv(filename, SHEET_CSV_COLUMNS, rows);
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function exportSheetsToSeparateCsvs(sheets: Record<string, unknown>[]): Promise<void> {
    for (let i = 0; i < sheets.length; i++) {
        exportSheetToCsv(sheets[i]);
        if (i < sheets.length - 1) {
            await delay(350);
        }
    }
}
