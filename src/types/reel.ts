export enum PaperQuality {
    SBS = 'SBS',
    FBB = 'FBB',
    WB = 'White/ Brown',
    GB = 'Grey/ Brown',
}

export enum SizeUnit {
    CM = 'cm',
    INCH = 'inch',
    MM = 'mm',
}

export enum ReelStatus {
    ACTIVE = 'active',
    FINISHED = 'finished',
}

export interface Reel {
    _id: string;
    reelNo: string;
    quality: PaperQuality;
    gsm: number;
    width: number;
    height: number;
    core?: number;
    sizeUnit: SizeUnit;
    totalWeightKg: number;
    currentBalanceKg: number;
    minimumStockKg: number;
    purchasePricePerKg: number;
    vendorId: {
        _id: string;
        companyName: string;
        email: string;
    } | string;
    companyId: {
        _id: string;
        companyName: string;
    } | string;
    status: ReelStatus;
    entryDate: string;
    notes?: string;
    // Calculated fields from backend
    usedWeightKg?: number;
    remainingWeightKg?: number;
    stockValue?: number;
    isPattiStock?: boolean;
    createdAt: string;
    updatedAt: string;
}
