import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { ShoppingCart, CheckCircle2, User, Printer, Users, CreditCard, MessageSquare, Trash2, FileText, ChevronDown, Search, X } from 'lucide-react';
import { postData, formatDateToYYYYMMDD } from "../../utility/utility";
import DatePicker from "../../components/form/date-picker";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { Modal } from "../../components/ui/modal";
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';

const roundWeight = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

interface SelectedStrip {
    _id: string;
    sheetNo: string;
    sizes: { width: number; height: number }[];
    sizeUnit: string;
    gsm: number;
    quality: string;
    totalWeightKg: number;
    currentBalanceKg: number;
    totalQty: number;
    clientName?: string;
    productionMode?: 'Fixed' | 'Full' | 'Skip';
    potentialQty?: number;
    targetQty?: number;
    machineLoss?: number;
}

interface SaleItem extends SelectedStrip {
    rate: number;
    amount: number;
    saleQty: number;
    saleWeight: number;
}

const ConsolidatedSale: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [items, setItems] = useState<SaleItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Improved Customer & Payment State
    const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
    const [companyType, setCompanyType] = useState<'walk-in' | 'registered'>('walk-in');
    const [customerId, setCustomerId] = useState('');
    const [customer, setCustomer] = useState({
        name: '',
        contact: '',
        company: '',
        gst: '',
        contactPerson: '',
        email: '',
        gender: 'male' as 'male' | 'female' | 'other',
        dob: ''
    });
    const [showAdditionalWalkInFields, setShowAdditionalWalkInFields] = useState(false);
    const [paidAmount, setPaidAmount] = useState(0);
    const [paymentDueDate, setPaymentDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [totalBillableWeight, setTotalBillableWeight] = useState(0);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userPagination, setUserPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 5
    });

    const [customers, setCustomers] = useState<any[]>([]);
    const [fetchingCustomers, setFetchingCustomers] = useState(false);

    const fetchCustomers = async (page: number = 1, search: string = userSearchTerm) => {
        try {
            setFetchingCustomers(true);
            // 1. Try with buyer filter
            let response = await postData('/company/list', {
                page,
                limit: userPagination.limit,
                search,
                type: 'buyer'
            });

            let list = response?.data?.companies ||
                response?.data?.data?.companies ||
                response?.companies ||
                (Array.isArray(response?.data) ? response.data : []);

            // 2. Fallback: If empty, try without filter
            if (!list || list.length === 0) {
                response = await postData('/company/list', { page: 1, limit: 1000, search });
                list = response?.data?.companies ||
                    response?.data?.data?.companies ||
                    response?.companies ||
                    (Array.isArray(response?.data) ? response.data : []);
            }

            setCustomers(list || []);
            setUserPagination(prev => ({
                ...prev,
                currentPage: page,
                totalPages: response?.data?.totalPages || 1,
                totalCount: response?.data?.total || (list?.length || 0)
            }));
        } catch (err) {
            console.error("Failed to fetch companies", err);
        } finally {
            setFetchingCustomers(false);
        }
    };

    useEffect(() => {
        fetchCustomers(1);
    }, []);

    const handleUserSearch = (val: string) => {
        setUserSearchTerm(val);
        fetchCustomers(1, val);
    };

    useEffect(() => {
        // Reset customer info when switching types to avoid data mixing
        setCustomer({
            name: '',
            company: '',
            contact: '',
            gst: '',
            contactPerson: '',
            email: '',
            gender: 'male',
            dob: ''
        });
        setCustomerId('');
    }, [companyType]);

    const handleCustomerChange = (id: string) => {
        setCustomerId(id);
        const selected = customers.find(c => c._id === id);
        if (selected) {
            setCustomer({
                name: selected.companyName || selected.name || '',
                company: selected.companyName || selected.name || '',
                contact: selected.phone || selected.mobileNumber || selected.mobile || '',
                gst: selected.gstNumber || selected.gst || '',
                contactPerson: selected.contactPerson || '',
                email: selected.email || '',
                gender: selected.gender || 'male',
                dob: selected.dob ? selected.dob.slice(0, 10) : ''
            });
        } else {
            setCustomer({ name: '', company: '', contact: '', gst: '', contactPerson: '', email: '', gender: 'male', dob: '' });
        }
    };

    useEffect(() => {
        if (location.state?.selectedSheets) {
            const initialItems: SaleItem[] = location.state.selectedSheets.map((s: SelectedStrip) => {
                const defaultQty = s.targetQty || s.totalQty || 0;
                const netTotalQty = Math.max(0, (s.totalQty || 0) - (s.machineLoss || 0));
                const totalPhysical = netTotalQty || s.potentialQty || 0;
                const ratio = totalPhysical > 0 ? defaultQty / totalPhysical : 1;
                const weight = (s.totalWeightKg || 0) * ratio;

                return {
                    ...s,
                    rate: 0,
                    amount: 0,
                    saleQty: defaultQty,
                    saleWeight: Number(weight.toFixed(2))
                };
            });
            setItems(initialItems);

            // Auto-fill customer if common clientName exists
            const clientNames: string[] = Array.from(new Set(initialItems.map((i: SaleItem) => i.clientName).filter((n): n is string => Boolean(n))));
            if (clientNames.length === 1) {
                const firstClient = clientNames[0];
                setCustomer(prev => ({ ...prev, name: firstClient }));
            }
        } else {
            navigate('/sheet-management');
        }
    }, [location.state, navigate]);

    const updateItem = (idx: number, field: keyof SaleItem, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            // Cast to number for calculation fields
            let processedValue = value;
            if (field === 'rate' || field === 'saleQty' || field === 'saleWeight') {
                processedValue = field === 'saleWeight' ? roundWeight(Number(value) || 0) : Number(value) || 0;
            }

            const item = { ...newItems[idx], [field]: processedValue };

            if (field === 'rate' || field === 'saleWeight' || field === 'saleQty') {
                item.amount = roundWeight((Number(item.rate) || 0) * (Number(item.saleWeight) || 0));
            }

            newItems[idx] = item;
            return newItems;
        });
    };

    const removeItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const netStripWeight = useMemo(
        () => roundWeight(items.reduce((acc, item) => acc + (Number(item.saleWeight) || 0), 0)),
        [items],
    );

    useEffect(() => {
        setTotalBillableWeight(netStripWeight);
    }, [netStripWeight]);

    const billingBreakdown = useMemo(() => {
        const billableWeight = roundWeight(Math.max(0, Number(totalBillableWeight) || 0));

        const lines = items.map((item) => {
            const netWeight = roundWeight(Number(item.saleWeight) || 0);
            const share = netStripWeight > 0 ? netWeight / netStripWeight : 0;
            const billableItemWeight = roundWeight(billableWeight * share);
            const amount = roundWeight((Number(item.rate) || 0) * billableItemWeight);
            return { netWeight, billableItemWeight, amount, share };
        });

        const amount = roundWeight(lines.reduce((acc, line) => acc + line.amount, 0));
        return { billableWeight, amount, lines };
    }, [items, netStripWeight, totalBillableWeight]);

    const getItemBillableAmount = (idx: number) => billingBreakdown.lines[idx]?.amount ?? 0;

    const handleSubmit = async () => {
        if (!customer.name) return toast.error('Please enter customer name');
        if (items.some(i => i.rate <= 0)) return toast.error('Please enter rates for all items');

        setLoading(true);
        try {
            const billNo = `BILL-${Date.now()}`;
            const grandTotal = billingBreakdown.amount;

            const promises = items.map((item, idx) => {
                const line = billingBreakdown.lines[idx];
                const billableItemWeight = roundWeight(line.billableItemWeight);
                const lineAmount = roundWeight(line.amount);
                const physicalWeight = roundWeight(Number(item.saleWeight) || 0);

                const payload = {
                    saleDate: saleDate,
                    customerName: customer.name || customer.company,
                    customerType: companyType,
                    customerId: companyType === 'registered' ? customerId : undefined,
                    customerContact: customer.contact,
                    customerEmail: customer.email,
                    customerGender: customer.gender,
                    customerDob: customer.dob,
                    contactPerson: customer.contactPerson,
                    customerCompany: customer.company,
                    customerGst: customer.gst,
                    sheetId: item._id,
                    reelId: (item as any).reelId?._id || (item as any).reelId,
                    size1: String(item.sizes[0]?.width || 0),
                    size2: String(item.sizes[0]?.height || 0),
                    gsm: item.gsm,
                    quality: item.quality,
                    qtySold: item.saleQty,
                    pricePerSheet: roundWeight(lineAmount / (item.saleQty || 1)),
                    totalAmount: lineAmount,
                    paidAmount: grandTotal > 0 ? roundWeight((paidAmount * lineAmount) / grandTotal) : 0,
                    pendingAmount: roundWeight(lineAmount - (grandTotal > 0 ? (paidAmount * lineAmount) / grandTotal : 0)),
                    paymentDueDate: paymentDueDate,
                    notes: notes,
                    billNo: billNo,
                    saleWeightKg: physicalWeight,
                    billableWeightKg: billableItemWeight,
                };
                return postData('/sale', payload);
            });

            const results = await Promise.all(promises);
            const allSuccess = results.every(r => r.success);

            if (allSuccess) {
                toast.success('Consolidated Sale Recorded Successfully!');
                navigate('/sheet-management'); // Or wherever sales list is
            } else {
                toast.error('Some items failed to record');
            }
        } catch (err) {
            toast.error('Network error during sale creation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 lg:p-8">
            <PageMeta title="Consolidated Billing | Zero Waste" description="Create multi-item bills" />
            <PageBreadcrumb pageTitle="Consolidated Billing" />

            <div className="max-w-7xl mx-auto space-y-6">

                {/* 👤 Customer Details Section */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-8">
                        {/* Top Row: Sale Date & Company Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div>
                                <DatePicker
                                    id="saleDate"
                                    label="Sale Date"
                                    defaultDate={saleDate}
                                    onChange={(dates) => dates && dates[0] && setSaleDate(formatDateToYYYYMMDD(dates[0]))}
                                />
                            </div>
                            <div>
                                <Label>Company Type</Label>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setCompanyType('walk-in')}
                                        className={`flex-1 py-3 text-sm font-black rounded-xl border transition-all ${companyType === 'walk-in' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-transparent border-gray-100 text-gray-400 dark:border-gray-800 hover:border-gray-300'}`}
                                    >
                                        Walk-in
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCompanyType('registered')}
                                        className={`flex-1 py-3 text-sm font-black rounded-xl border transition-all ${companyType === 'registered' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-transparent border-gray-100 text-gray-400 dark:border-gray-800 hover:border-gray-300'}`}
                                    >
                                        Registered
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Second Row: Company Name & Contact Person */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="flex flex-col">
                                <Label>Company Name *</Label>
                                {companyType === 'registered' ? (
                                    <div
                                        onClick={() => setIsCustomerModalOpen(true)}
                                        className={`h-12 w-full rounded-2xl border-2 px-6 flex justify-between items-center transition-all cursor-pointer group ${customerId ? 'border-indigo-100 bg-indigo-50/20' : 'border-gray-100 bg-gray-50/30 hover:border-indigo-500 hover:bg-white'}`}
                                    >
                                        {customerId ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-black">
                                                    {customer.company.charAt(0)}
                                                </div>
                                                <div className="text-sm font-black text-gray-900 dark:text-white">
                                                    {customer.company}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 font-bold text-sm">Choose Available Customer</span>
                                        )}
                                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                                    </div>
                                ) : (
                                    <Input
                                        type="text"
                                        value={customer.company}
                                        onChange={(e) => setCustomer({ ...customer, company: e.target.value, name: e.target.value })}
                                        placeholder="Enter Company Name"
                                        className="h-12"
                                    />
                                )}
                            </div>
                            <div>
                                <Label>Contact Person</Label>
                                <Input
                                    type="text"
                                    value={customer.contactPerson}
                                    onChange={(e) => setCustomer({ ...customer, contactPerson: e.target.value })}
                                    placeholder="Enter contact person name"
                                    readOnly={companyType === 'registered'}
                                    className="h-12"
                                />
                            </div>
                        </div>

                        {/* Third Row: Contact Number & GST Number */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
                            <div>
                                <Label>Contact Number *</Label>
                                <Input
                                    type="tel"
                                    value={customer.contact}
                                    onChange={(e) => setCustomer({ ...customer, contact: e.target.value })}
                                    placeholder="e.g. 9876543210"
                                    readOnly={companyType === 'registered'}
                                    className="h-12"
                                />
                            </div>
                            <div>
                                <Label>GST Number</Label>
                                <Input
                                    type="text"
                                    value={customer.gst}
                                    onChange={(e) => setCustomer({ ...customer, gst: e.target.value })}
                                    placeholder="Enter GST Number"
                                    readOnly={companyType === 'registered'}
                                    className="h-12"
                                />
                            </div>
                        </div>

                        {/* Additional Fields Link */}
                        {companyType === 'walk-in' && (
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAdditionalWalkInFields(!showAdditionalWalkInFields)}
                                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors flex items-center gap-1.5"
                                >
                                    {showAdditionalWalkInFields ? '− Hide Optional Fields' : '+ Add More Details (Email, DOB, Gender)'}
                                </button>

                                {showAdditionalWalkInFields && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <Label className="text-xs font-bold text-gray-500">Email Address</Label>
                                            <Input
                                                type="email"
                                                value={customer.email}
                                                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                                                placeholder="customer@example.com"
                                                className="h-10 text-sm mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs font-bold text-gray-500">Gender</Label>
                                            <select
                                                value={customer.gender}
                                                onChange={(e) => setCustomer({ ...customer, gender: e.target.value as any })}
                                                className="h-10 w-full rounded-lg border px-4 py-2 text-sm bg-transparent border-gray-300 dark:border-gray-700 mt-1"
                                            >
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <DatePicker
                                                id="customerDob"
                                                label="Date of Birth"
                                                maxDate={new Date()}
                                                defaultDate={customer.dob}
                                                onChange={(dates) => dates && dates[0] && setCustomer(prev => ({ ...prev, dob: formatDateToYYYYMMDD(dates[0]) }))}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>


                {/*  Items Table Section */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-900 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Billing Items</h3>
                                <p className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Multiple Strips Consolidated</p>
                            </div>
                        </div>
                        <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-black uppercase tracking-tighter">
                            {items.length} Strips Selected
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-8 py-4">Lot/Strip Details</th>
                                    <th className="px-4 py-4">Dimensions</th>
                                    <th className="px-4 py-4 text-center">Billing Qty (Pcs)</th>
                                    <th className="px-4 py-4 text-center">Net Weight (Kg)</th>
                                    <th className="px-4 py-4 text-center">Rate (₹/Kg)</th>
                                    <th className="px-4 py-4 text-right">Subtotal</th>
                                    <th className="px-8 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-gray-900 dark:text-white text-sm">{item.sheetNo}</span>
                                                    {item.productionMode && (
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${item.productionMode === 'Full' ? 'bg-indigo-100 text-indigo-700' :
                                                            item.productionMode === 'Skip' ? 'bg-red-100 text-red-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {item.productionMode}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">{item.quality} · {item.gsm} GSM</span>

                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {item.targetQty && (
                                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                            Customer Req: {item.targetQty.toLocaleString()} Pcs
                                                        </span>
                                                    )}
                                                    {item.totalQty && (
                                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                            Net Available: {Math.max(0, item.totalQty - (item.machineLoss || 0)).toLocaleString()} Pcs
                                                        </span>
                                                    )}
                                                    {item.totalQty && Math.max(0, item.totalQty - (item.machineLoss || 0)) > (item.targetQty || 0) && (
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                            Post-Bill Left: {(Math.max(0, item.totalQty - (item.machineLoss || 0)) - (item.targetQty || 0)).toLocaleString()} Pcs
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5">
                                            <span className="text-xs font-bold text-gray-600">
                                                {item.sizes[0]?.width} × {item.sizes[0]?.height} {item.sizeUnit}
                                            </span>
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            <div className="flex justify-center">
                                                <div className="flex flex-col gap-2 items-center">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={item.saleQty}
                                                            onChange={(e) => {
                                                                const newQty = Number(e.target.value) || 0;
                                                                const netTotalQty = Math.max(0, (item.totalQty || 0) - (item.machineLoss || 0));
                                                                const totalPhysical = netTotalQty || item.potentialQty || 0;
                                                                const ratio = totalPhysical > 0 ? newQty / totalPhysical : 1;
                                                                const newWeight = (item.totalWeightKg || 0) * ratio;
                                                                updateItem(idx, 'saleQty', newQty);
                                                                updateItem(idx, 'saleWeight', Number(newWeight.toFixed(2)));
                                                            }}
                                                            className="w-28 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-center font-black text-sm outline-none focus:border-indigo-500 transition-all"
                                                        />

                                                        {item.potentialQty && item.saleQty < item.potentialQty && (
                                                            <button
                                                                onClick={() => {
                                                                    const fullQty = item.potentialQty || item.totalQty;
                                                                    const totalPhysical = Math.max(item.potentialQty || 0, item.totalQty || 0);
                                                                    const ratio = totalPhysical > 0 ? fullQty / totalPhysical : 1;
                                                                    const fullWeight = (item.totalWeightKg || 0) * ratio;

                                                                    updateItem(idx, 'saleQty', fullQty);
                                                                    updateItem(idx, 'saleWeight', Number(fullWeight.toFixed(2)));
                                                                }}
                                                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all uppercase whitespace-nowrap"
                                                            >
                                                                Bill Full
                                                            </button>
                                                        )}
                                                    </div>

                                                    {item.targetQty && item.saleQty !== item.targetQty && (
                                                        <button
                                                            onClick={() => {
                                                                const netTotalQty = Math.max(0, (item.totalQty || 0) - (item.machineLoss || 0));
                                                                const totalPhysical = netTotalQty || item.potentialQty || 0;
                                                                const ratio = totalPhysical > 0 ? item.targetQty! / totalPhysical : 1;
                                                                const newWeight = (item.totalWeightKg || 0) * ratio;
                                                                updateItem(idx, 'saleQty', item.targetQty!);
                                                                updateItem(idx, 'saleWeight', Number(newWeight.toFixed(2)));
                                                            }}
                                                            className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all uppercase"
                                                        >
                                                            Reset to Req ({item.targetQty.toLocaleString()})
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5">
                                            <div className="flex justify-center">
                                                <input
                                                    type="number"
                                                    value={item.saleWeight}
                                                    onChange={(e) => updateItem(idx, 'saleWeight', e.target.value)}
                                                    className="w-24 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-center font-black text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-5">
                                            <div className="flex justify-center">
                                                <input
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                                                    className="w-24 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-700 rounded-xl text-center font-black text-xs text-brand-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-black text-emerald-600">₹{getItemBillableAmount(idx).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                {Math.abs(billingBreakdown.billableWeight - netStripWeight) > 0.01 && (
                                                    <span className="text-[9px] font-bold text-gray-400">
                                                        Billable: {billingBreakdown.lines[idx]?.billableItemWeight.toFixed(2)} kg
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 📊 Summary Footer */}
                    <div className="px-8 py-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Strip Weight</span>
                                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                                        {netStripWeight.toFixed(2)} <span className="text-xs opacity-40 uppercase">Kg</span>
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 mt-1">Sum of all strip net weights</span>
                                </div>
                                <div className="flex flex-col p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">
                                        Total Billable Weight (KG)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={totalBillableWeight ? roundWeight(totalBillableWeight) : ''}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            if (raw === '') {
                                                setTotalBillableWeight(0);
                                                return;
                                            }
                                            setTotalBillableWeight(roundWeight(Math.max(0, Number(raw) || 0)));
                                        }}
                                        onBlur={() => setTotalBillableWeight((w) => roundWeight(w))}
                                        placeholder="0.00"
                                        className="w-full max-w-[200px] px-4 py-2.5 bg-white dark:bg-gray-950 border-2 border-indigo-300 dark:border-indigo-700 rounded-xl text-2xl font-black text-indigo-700 dark:text-indigo-300 outline-none focus:border-indigo-500 transition-all"
                                    />
                                    <span className="text-[9px] font-bold text-indigo-500/70 mt-1">
                                        Edit total kg for billing — split by each strip&apos;s net weight share
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                                    <span className="text-2xl font-black text-emerald-600">
                                        ₹{billingBreakdown.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 mt-1">Based on billable weight × rate</span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => navigate(-1)}
                                className="px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shrink-0"
                            >
                                Back
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 💳 Payment Information Section */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-800 flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-lg font-black tracking-tight">Payment Information</h3>
                    </div>
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Paid Amount (₹)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={paidAmount}
                                        onChange={(e) => setPaidAmount(Number(e.target.value))}
                                        className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-black outline-none focus:border-emerald-500 transition-all"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 font-bold">₹</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <DatePicker
                                    id="paymentDueDate"
                                    label="Payment Due Date"
                                    placeholder="Select due date"
                                    defaultDate={paymentDueDate}
                                    onChange={(dates) => dates && dates[0] && setPaymentDueDate(formatDateToYYYYMMDD(dates[0]))}
                                />
                            </div>
                            <div className="px-5 py-4 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-2xl flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Pending</span>
                                    <span className="text-xl font-black text-orange-600">₹{(billingBreakdown.amount - paidAmount).toLocaleString()}</span>
                                </div>
                                <div className={`px-2 py-1 rounded text-[8px] font-black uppercase ${paidAmount >= billingBreakdown.amount ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {paidAmount >= billingBreakdown.amount ? 'Paid' : 'Pending'}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1.5">
                                    <MessageSquare className="w-3 h-3" /> Internal Notes
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any internal remarks..."
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 min-h-[46px] resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🖨️ Generate Bill CTA */}
                <div className="bg-gradient-to-r from-indigo-500 to-blue-500 rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-indigo-900/30 border border-indigo-400/30 overflow-hidden">
                    <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                <Printer className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white tracking-tight">Ready to Generate Bill?</h3>
                                <p className="text-[11px] font-bold text-indigo-100/70 uppercase tracking-widest mt-0.5">
                                    {items.length} strip{items.length !== 1 ? 's' : ''} · ₹{billingBreakdown.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} grand total · {billingBreakdown.billableWeight.toFixed(2)} kg billable
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || items.length === 0}
                            className="w-full md:w-auto flex items-center justify-center gap-3 px-12 py-4 rounded-2xl bg-white text-indigo-600 font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Printer className="w-5 h-5" />
                                    Generate Consolidated Bill
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 💡 Tips Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
                        <FileText className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                            <h4 className="font-black text-xs text-blue-900 dark:text-blue-200 uppercase tracking-tight">Single Invoice</h4>
                            <p className="text-[10px] text-blue-700/70 font-bold leading-tight mt-1">All selected items will be grouped under one Bill ID for accounting.</p>
                        </div>
                    </div>
                    <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800 flex items-start gap-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-1" />
                        <div>
                            <h4 className="font-black text-xs text-emerald-900 dark:text-emerald-200 uppercase tracking-tight">Auto Stock Deduction</h4>
                            <p className="text-[10px] text-emerald-700/70 font-bold leading-tight mt-1">Inventory will be automatically deducted for all selected strips upon confirmation.</p>
                        </div>
                    </div>
                    <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-3xl border border-amber-100 dark:border-amber-800 flex items-start gap-4">
                        <User className="w-5 h-5 text-amber-600 mt-1" />
                        <div>
                            <h4 className="font-black text-xs text-amber-900 dark:text-amber-200 uppercase tracking-tight">Dynamic Pricing</h4>
                            <p className="text-[10px] text-amber-700/70 font-bold leading-tight mt-1">You can set different rates for different qualities within the same bill.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 👤 Customer Selection Modal */}
            <Modal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                className="max-w-2xl"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                                <Users className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Select Customer</h3>
                        </div>
                        <button onClick={() => setIsCustomerModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or contact..."
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            value={userSearchTerm}
                            onChange={(e) => handleUserSearch(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {fetchingCustomers ? (
                            <div className="py-20 text-center">
                                <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                                <p className="text-sm font-bold text-gray-400">Loading Customers...</p>
                            </div>
                        ) : customers.length === 0 ? (
                            <div className="py-20 text-center">
                                <p className="text-4xl mb-4">🔍</p>
                                <p className="text-sm font-bold text-gray-400">No Customers Found</p>
                            </div>
                        ) : (
                            customers.map((c) => (
                                <div
                                    key={c._id}
                                    onClick={() => {
                                        handleCustomerChange(c._id);
                                        setIsCustomerModalOpen(false);
                                    }}
                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group flex items-center justify-between ${customerId === c._id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-50 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-indigo-200'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-lg font-black group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            {(c.companyName || c.name || "U").charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 dark:text-white leading-tight mb-1">{c.companyName || c.name}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-indigo-500">{c.phone || c.mobileNumber || "No Contact"}</span>
                                                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[8px] font-black uppercase text-gray-400 tracking-widest">{c.type || 'Buyer'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${customerId === c._id ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-200 group-hover:border-indigo-500'}`}>
                                        {customerId === c._id && <CheckCircle2 className="w-4 h-4" />}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {userPagination.totalPages > 1 && (
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <button
                                disabled={userPagination.currentPage === 1}
                                onClick={() => fetchCustomers(userPagination.currentPage - 1)}
                                className="p-2 border rounded-lg disabled:opacity-30"
                            >
                                <ChevronDown className="w-5 h-5 rotate-90" />
                            </button>
                            <span className="text-sm font-black text-gray-500">
                                {userPagination.currentPage} / {userPagination.totalPages}
                            </span>
                            <button
                                disabled={userPagination.currentPage === userPagination.totalPages}
                                onClick={() => fetchCustomers(userPagination.currentPage + 1)}
                                className="p-2 border rounded-lg disabled:opacity-30"
                            >
                                <ChevronDown className="w-5 h-5 -rotate-90" />
                            </button>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ConsolidatedSale;
