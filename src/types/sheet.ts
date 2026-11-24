import { PaperQuality, SizeUnit } from "./reel";

export interface SheetSize {
    width: number;
    height: number;
    grain?: string;
}

export enum SheetStatus {
    PENDING_APPROVAL = 'pending_approval',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export interface Sheet {
    _id: string;
    sheetNo: string;
    reelId: {
        _id: string;
        reelNo: string;
        quality: PaperQuality;
        gsm: number;
        width: number;
        sizeUnit: SizeUnit;
    } | string;
    totalWeightKg: number;
    sizes: SheetSize[];
    sizeUnit: SizeUnit;
    gsm: number;
    quality: PaperQuality;
    entryDate: string;
    notes?: string;
    status?: SheetStatus;
    currentBalanceKg: number;
    machineLoss?: number;
    clientName?: string;
    createdAt: string;
    updatedAt: string;
}
