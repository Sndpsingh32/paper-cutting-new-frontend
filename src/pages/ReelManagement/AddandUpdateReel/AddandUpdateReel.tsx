import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import Label from "../../../components/form/Label";
import DatePicker from "../../../components/form/date-picker";
import { postData, formatDateToYYYYMMDD } from "../../../utility/utility";
import { toast } from "react-toastify";
import { Reel, PaperQuality, SizeUnit, ReelStatus } from "../../../types/reel";
import { Modal } from "../../../components/ui/modal";
import { GridIcon, AngleLeftIcon } from "../../../icons";

const SearchIcon = ({ className }: { className?: string }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
    </svg>
);

export default function AddandUpdateReel() {
    const navigate = useNavigate();
    const location = useLocation();
    const editData = location.state?.reel as Reel | undefined;

    const [isLoading, setIsLoading] = useState(false);
    const [vendors, setVendors] = useState<{ _id: string; companyName: string }[]>([]);
    const [companies, setCompanies] = useState<{ _id: string; companyName: string }[]>([]);

    const [formData, setFormData] = useState({
        reelNo: "",
        quality: PaperQuality.SBS,
        gsm: "",
        width: "",
        height: "",
        sizeUnit: SizeUnit.CM,
        totalWeightKg: "",
        currentBalanceKg: "",
        minimumStockKg: "",
        purchasePricePerKg: "",
        vendorId: "",
        companyId: "",
        entryDate: formatDateToYYYYMMDD(new Date()),
        notes: "",
        status: ReelStatus.ACTIVE,
    });

    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [vendorSearch, setVendorSearch] = useState("");
    const [companySearch, setCompanySearch] = useState("");
    const [selectedVendor, setSelectedVendor] = useState<{ _id: string; companyName: string } | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<{ _id: string; companyName: string } | null>(null);

    const [vendorPagination, setVendorPagination] = useState({ currentPage: 1, totalPages: 1, limit: 10 });
    const [companyPagination, setCompanyPagination] = useState({ currentPage: 1, totalPages: 1, limit: 10 });

    const fetchVendors = useCallback(async (page: number = 1, search: string = "") => {
        try {
            const response = await postData("/vendor/list", { limit: vendorPagination.limit, page, search });
            if (response.success) {
                setVendors(response.data.vendors || []);
                setVendorPagination(prev => ({
                    ...prev,
                    totalPages: response.data.totalPages || 1,
                    currentPage: response.data.page || page
                }));
            }
        } catch (error) {
            console.error("Error fetching vendors:", error);
        }
    }, [vendorPagination.limit]);

    const fetchCompanies = useCallback(async (page: number = 1, search: string = "") => {
        try {
            const response = await postData("/company/list", {
                limit: companyPagination.limit,
                page,
                search,
                type: "buyer"
            });
            if (response.success) {
                setCompanies(response.data.companies || []);
                setCompanyPagination(prev => ({
                    ...prev,
                    totalPages: response.data.totalPages || 1,
                    currentPage: response.data.page || page
                }));
            }
        } catch (error) {
            console.error("Error fetching companies:", error);
        }
    }, [companyPagination.limit]);

    useEffect(() => {
        if (isVendorModalOpen) fetchVendors(vendorPagination.currentPage, vendorSearch);
    }, [isVendorModalOpen, vendorPagination.currentPage, vendorSearch, fetchVendors]);

    useEffect(() => {
        if (isCompanyModalOpen) fetchCompanies(companyPagination.currentPage, companySearch);
    }, [isCompanyModalOpen, companyPagination.currentPage, companySearch, fetchCompanies]);

    useEffect(() => {
        if (editData) {
            setFormData({
                reelNo: editData.reelNo,
                quality: editData.quality,
                gsm: String(editData.gsm),
                width: String(editData.width),
                height: String(editData.height),
                sizeUnit: editData.sizeUnit,
                totalWeightKg: String(editData.totalWeightKg),
                currentBalanceKg: String(editData.currentBalanceKg),
                minimumStockKg: String(editData.minimumStockKg),
                purchasePricePerKg: String(editData.purchasePricePerKg),
                vendorId: typeof editData.vendorId === 'string' ? editData.vendorId : (editData.vendorId as any)?._id || "",
                companyId: typeof editData.companyId === 'string' ? editData.companyId : (editData.companyId as any)?._id || "",
                entryDate: editData.entryDate ? formatDateToYYYYMMDD(new Date(editData.entryDate)) : formatDateToYYYYMMDD(new Date()),
                notes: editData.notes || "",
                status: editData.status || ReelStatus.ACTIVE,
            });
            if (editData.vendorId && typeof editData.vendorId !== 'string') setSelectedVendor(editData.vendorId as any);
            if (editData.companyId && typeof editData.companyId !== 'string') setSelectedCompany(editData.companyId as any);
        }
    }, [editData]);

    // ✅ Auto-calculate Length (Height) from Weight, GSM, and Width
    useEffect(() => {
        const weight = Number(formData.currentBalanceKg || formData.totalWeightKg || 0);
        const gsm = Number(formData.gsm || 0);
        const width = Number(formData.width || 0);
        const unit = formData.sizeUnit || 'cm';

        if (weight > 0 && gsm > 0 && width > 0) {
            // Convert width to meters
            let widthM = width;
            if (unit === 'cm') widthM = width / 100;
            else if (unit === 'mm') widthM = width / 1000;
            else if (unit === 'inch') widthM = (width * 2.54) / 100;

            // Area in m2 = (Weight * 1000) / GSM
            const areaM2 = (weight * 1000) / gsm;
            // Height (Length) in meters = Area / Width
            const heightM = areaM2 / widthM;

            // Convert back to chosen unit for display
            let calcHeight = heightM * 100; // default cm
            if (unit === 'mm') calcHeight = heightM * 1000;
            else if (unit === 'inch') calcHeight = heightM / 0.0254;

            const calcHeightStr = calcHeight.toFixed(0);
            if (formData.height !== calcHeightStr) {
                setFormData(prev => ({ ...prev, height: calcHeightStr }));
            }
        }
    }, [formData.currentBalanceKg, formData.totalWeightKg, formData.gsm, formData.width, formData.sizeUnit]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        let newValue: any = value;
        if (type === "number") {
            if (value === "") {
                newValue = "";
            } else {
                let num = Number(value);
                if (num < 0) num = 0; // ensure no negative
                newValue = num;
            }
        }
        setFormData((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const url = editData ? "/reels/update" : "/reels/create";
            const basePayload: any = editData ? { ...formData, reelId: editData._id } : { ...formData };
            // convert numeric-string fields back to numbers
            [
                'gsm', 'width', 'height',
                'totalWeightKg', 'currentBalanceKg',
                'minimumStockKg', 'purchasePricePerKg'
            ].forEach((key) => {
                if (basePayload[key] === "" || basePayload[key] === undefined) {
                    basePayload[key] = 0;
                } else {
                    basePayload[key] = Number(basePayload[key]);
                }
            });
            const payload = { ...basePayload };
            if (!payload.companyId || payload.companyId === "") delete payload.companyId;
            if (!payload.vendorId || payload.vendorId === "") delete payload.vendorId;

            const response = await postData(url, payload);
            if (response.success) {
                toast.success(editData ? "Roll updated successfully!" : "Roll created successfully!");
                navigate("/reel-management");
            } else {
                toast.error(response.message || "Something went wrong");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to save reel");
        } finally {
            setIsLoading(false);
        }
    };

    const SectionLabel: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
        <div className="flex items-center gap-2 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
            <span>{icon}</span>
            <span>{title}</span>
        </div>
    );

    return (
        <>
            <PageMeta
                title={editData ? "Update Roll | Paper Cutting" : "Add New Roll | Paper Cutting"}
                description="Roll inventory management"
            />
            <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between py-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 transition-all duration-200 bg-white border border-gray-200 rounded-xl dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md active:scale-95 group shadow-sm shrink-0"
                    >
                        <AngleLeftIcon className="w-5 h-5 text-gray-500 transition-colors group-hover:text-brand-600 dark:text-gray-400 group-hover:scale-110" />
                    </button>
                    <div>
                        <h4 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            {editData ? "Edit Roll Entry" : "New Roll Intake"}
                        </h4>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                            {editData ? "Update existing stock" : "Register new inventory"}
                        </p>
                    </div>
                </div>
                <div className="hidden sm:block">
                    <PageBreadcrumb pageTitle={editData ? "Update Roll" : "Add New Roll"} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ComponentCard title="Reel Information">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Basic Info */}
                            <div>
                                <SectionLabel icon="📦" title="Basic Information" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>Roll Number<span className="text-red-500">*</span></Label>
                                        <Input
                                            name="reelNo"
                                            placeholder="e.g. JTL-1318"
                                            value={formData.reelNo}
                                            onChange={handleInputChange}
                                            required
                                            maxLength={15}
                                        />
                                    </div>
                                    <div>
                                        <Label>Quality <span className="text-red-500">*</span></Label>
                                        <Select
                                            options={Object.values(PaperQuality).map(q => ({ label: q, value: q }))}
                                            value={formData.quality}
                                            onChange={(v) => handleSelectChange("quality", v)}
                                        />
                                    </div>
                                    <div>
                                        <Label>GSM (Thickness)</Label>
                                        <Input
                                            name="gsm"
                                            type="number"
                                            min={0}
                                            placeholder="e.g. 255"
                                            value={formData.gsm}
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                        />
                                    </div>
                                    <div>
                                        <Label>Total Weight (kg)</Label>
                                        <Input
                                            name="totalWeightKg"
                                            type="number"
                                            min="0"
                                            placeholder="e.g. 1500"
                                            value={formData.totalWeightKg}
                                            onChange={(e) => {
                                                handleInputChange(e);
                                                if (!editData) setFormData(prev => ({ ...prev, currentBalanceKg: e.target.value }));
                                            }}
                                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === '-') e.preventDefault(); }}
                                        />
                                    </div>
                                    <div>
                                        <Label>Purchase Price per kg (₹)</Label>
                                        <Input
                                            name="purchasePricePerKg"
                                            type="number"
                                            min="0"
                                            placeholder="e.g. 68"
                                            value={formData.purchasePricePerKg}
                                            onChange={handleInputChange}
                                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === '-') e.preventDefault(); }}
                                        />
                                    </div>
                                    <div>
                                        <DatePicker
                                            id="entryDate"
                                            label="Entry Date"
                                            defaultDate={formData.entryDate}
                                            onChange={(dates) => dates && dates[0] && handleSelectChange("entryDate", formatDateToYYYYMMDD(dates[0]))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dimensions */}
                            <div>
                                <SectionLabel icon="📐" title="Dimensions" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <Label>Roll Size</Label>
                                        <Input name="width" type="number" value={formData.width} onChange={handleInputChange} />
                                    </div>
                                    <div>
                                        <Label>Height (Auto-calculated)</Label>
                                        <Input name="height" type="number" value={formData.height} readOnly className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <Label>Size Unit</Label>
                                        <Select
                                            options={Object.values(SizeUnit).map(u => ({ label: u, value: u }))}
                                            value={formData.sizeUnit}
                                            onChange={(v) => handleSelectChange("sizeUnit", v)}
                                        />
                                    </div>
                                    <div>
                                        <Label>Min. Stock Alert (kg)</Label>
                                        <Input name="minimumStockKg" type="number" min={0} value={formData.minimumStockKg} onChange={handleInputChange} onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} />
                                    </div>
                                    <div>
                                        <Label>Status</Label>
                                        <Select
                                            options={Object.values(ReelStatus).map(s => ({ label: s.toUpperCase(), value: s }))}
                                            value={formData.status}
                                            onChange={(v) => handleSelectChange("status", v)}
                                        />
                                    </div>
                                </div>
                            </div>

                             {/* Partnership */}
                             <div>
                                 <SectionLabel icon="🤝" title="Partnership & Sourcing" />
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <div>
                                         <Label>Our Company</Label>
                                         <div
                                             onClick={() => setIsCompanyModalOpen(true)}
                                             className="h-11 border border-gray-200 dark:border-gray-800 rounded-lg px-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-bold text-sm"
                                         >
                                             {selectedCompany ? selectedCompany.companyName : <span className="text-gray-400 font-normal">(Optional) Select Company...</span>}
                                             <SearchIcon className="w-4 h-4 text-gray-400" />
                                         </div>
                                     </div>
                                     <div>
                                         <Label>Sourcing Vendor</Label>
                                         <div
                                             onClick={() => setIsVendorModalOpen(true)}
                                             className="h-11 border border-gray-200 dark:border-gray-800 rounded-lg px-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-bold text-sm"
                                         >
                                             {selectedVendor ? selectedVendor.companyName : <span className="text-gray-400 font-normal">(Optional) Select Vendor...</span>}
                                             <SearchIcon className="w-4 h-4 text-gray-400" />
                                         </div>
                                     </div>
                                 </div>
                             </div>

                            {/* Notes */}
                            <div>
                                <SectionLabel icon="📝" title="Additional Notes" />
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    className="w-full h-24 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent"
                                    placeholder="Add any internal remarks..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                                <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : (editData ? "Update Reel" : "Add to Stock")}</Button>
                            </div>
                        </form>
                    </ComponentCard>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <ComponentCard title="Preview Card">
                        <div className="space-y-6">
                            {(formData.reelNo || formData.width || formData.height) ? (
                                <div className="p-6 bg-brand-50/30 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/30 rounded-3xl">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h4 className="text-2xl font-black text-gray-900 dark:text-white break-all">#{formData.reelNo || "NEW"}</h4>
                                            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest">{formData.quality}</p>
                                        </div>
                                        <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                                            <GridIcon className="w-6 h-6 text-brand-500" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <QuickInfo label="Width" value={`${formData.width} ${formData.sizeUnit}`} />
                                        <QuickInfo label="Length (Calc)" value={`${formData.height} ${formData.sizeUnit}`} />
                                        <QuickInfo label="GSM" value={formData.gsm.toString()} />
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-brand-100 dark:border-brand-900/40">
                                        <div className="text-[10px] uppercase font-black text-gray-400 mb-1">Total Stock</div>
                                        <div className="text-xl font-black text-gray-900 dark:text-white">{formData.totalWeightKg} kg</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400">
                                    <p className="text-sm">Enter reel details to see preview</p>
                                </div>
                            )}

                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl space-y-3 font-medium">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Price/kg</span>
                                    <span className="text-gray-900 dark:text-white font-bold">₹{Number(formData.purchasePricePerKg || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Balanced Added</span>
                                    <span className="text-green-600 font-bold">{formData.totalWeightKg} kg</span>
                                </div>
                            </div>
                        </div>
                    </ComponentCard>
                </div>
            </div>

            {/* Vendor Modal */}
            <Modal isOpen={isVendorModalOpen} onClose={() => setIsVendorModalOpen(false)} className="max-w-xl">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Sourcing Vendor</h3>
                        <div className="flex items-center gap-4">
                            {(selectedVendor || formData.vendorId) && (
                                <button
                                    onClick={() => {
                                        setSelectedVendor(null);
                                        setFormData(f => ({ ...f, vendorId: "" }));
                                        setIsVendorModalOpen(false);
                                    }}
                                    className="text-xs font-bold text-red-500 hover:text-red-600 underline"
                                >
                                    Clear Selection
                                </button>
                            )}
                            <button onClick={() => setIsVendorModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="relative mb-6">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by vendor name..."
                            autoFocus
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all shadow-sm"
                        />
                    </div>

                    <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {vendors.length > 0 ? (
                            vendors.map(v => (
                                <div
                                    key={v._id}
                                    onClick={() => {
                                        setSelectedVendor(v);
                                        setFormData(f => ({ ...f, vendorId: v._id }));
                                        setIsVendorModalOpen(false);
                                    }}
                                    className={`group p-4 border rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-between
                                        ${formData.vendorId === v._id
                                            ? 'bg-brand-50 border-brand-500 dark:bg-brand-500/10'
                                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-brand-500 hover:shadow-md hover:translate-x-1'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase
                                            ${formData.vendorId === v._id
                                                ? 'bg-brand-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 group-hover:bg-brand-100 group-hover:text-brand-600 dark:group-hover:bg-brand-500/20'
                                            }`}
                                        >
                                            {v.companyName.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">
                                                {v.companyName}
                                            </h4>
                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Vendor</p>
                                        </div>
                                    </div>
                                    <div className={`transition-opacity duration-200 ${formData.vendorId === v._id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-gray-500 font-medium">
                                <div className="mb-2 text-3xl">🤝</div>
                                <p>No vendors found matching your search.</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setVendorPagination(p => ({ ...p, currentPage: Math.max(1, p.currentPage - 1) }))}
                                disabled={vendorPagination.currentPage === 1}
                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                Page {vendorPagination.currentPage} of {vendorPagination.totalPages}
                            </span>
                            <button
                                onClick={() => setVendorPagination(p => ({ ...p, currentPage: Math.min(p.totalPages, p.currentPage + 1) }))}
                                disabled={vendorPagination.currentPage === vendorPagination.totalPages}
                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsVendorModalOpen(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Company Modal */}
            <Modal isOpen={isCompanyModalOpen} onClose={() => setIsCompanyModalOpen(false)} className="max-w-xl">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Buyer Company</h3>
                        <div className="flex items-center gap-4">
                            {(selectedCompany || formData.companyId) && (
                                <button
                                    onClick={() => {
                                        setSelectedCompany(null);
                                        setFormData(f => ({ ...f, companyId: "" }));
                                        setIsCompanyModalOpen(false);
                                    }}
                                    className="text-xs font-bold text-red-500 hover:text-red-600 underline"
                                >
                                    Clear Selection
                                </button>
                            )}
                            <button onClick={() => setIsCompanyModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="relative mb-6">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by company name..."
                            autoFocus
                            value={companySearch}
                            onChange={(e) => setCompanySearch(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all shadow-sm"
                        />
                    </div>

                    <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {companies.length > 0 ? (
                            companies.map(c => (
                                <div
                                    key={c._id}
                                    onClick={() => {
                                        setSelectedCompany(c);
                                        setFormData(f => ({ ...f, companyId: c._id }));
                                        setIsCompanyModalOpen(false);
                                    }}
                                    className={`group p-4 border rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-between
                                        ${formData.companyId === c._id
                                            ? 'bg-brand-50 border-brand-500 dark:bg-brand-500/10'
                                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-brand-500 hover:shadow-md hover:translate-x-1'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase
                                            ${formData.companyId === c._id
                                                ? 'bg-brand-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 group-hover:bg-brand-100 group-hover:text-brand-600 dark:group-hover:bg-brand-500/20'
                                            }`}
                                        >
                                            {c.companyName.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">
                                                {c.companyName}
                                            </h4>
                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Buyer Company</p>
                                        </div>
                                    </div>
                                    <div className={`transition-opacity duration-200 ${formData.companyId === c._id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-gray-500 font-medium">
                                <div className="mb-2 text-3xl">🏢</div>
                                <p>No buyer companies found matching your search.</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCompanyPagination(p => ({ ...p, currentPage: Math.max(1, p.currentPage - 1) }))}
                                disabled={companyPagination.currentPage === 1}
                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                Page {companyPagination.currentPage} of {companyPagination.totalPages}
                            </span>
                            <button
                                onClick={() => setCompanyPagination(p => ({ ...p, currentPage: Math.min(p.totalPages, p.currentPage + 1) }))}
                                disabled={companyPagination.currentPage === companyPagination.totalPages}
                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsCompanyModalOpen(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

function QuickInfo({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[9px] uppercase font-bold text-gray-400">{label}</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{value}</div>
        </div>
    );
}
