import { useState, useEffect, useMemo } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import ComponentCard from '../../components/common/ComponentCard';
import { getData, putData } from '../../utility/utility';
import Badge from '../../components/ui/badge/Badge';
import ReactPaginate from 'react-paginate';
import Swal from 'sweetalert2';
import { Search, IndianRupee, Calendar } from 'lucide-react';
import { Resource } from '../../types/permission';
import ReadPermissionGuard from '../../components/auth/ReadPermissionGuard';

const roundMoney = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const fmt = (n: number) =>
    roundMoney(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const curr = (n: number) => "₹" + fmt(n);
const formatDate = (dateStr?: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";

const normalizeSaleAmounts = (sale: Sale): Sale => ({
    ...sale,
    totalAmount: roundMoney(sale.totalAmount),
    paidAmount: roundMoney(sale.paidAmount),
    pendingAmount: roundMoney(sale.pendingAmount),
});

interface Sale {
    _id: string;
    saleDate: string;
    customerName: string;
    customerContact: string;
    customerGst?: string;
    contactPerson?: string;
    qtySold: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    paymentStatus: string;
    paymentDueDate?: string;
    paymentReceivedDate?: string;
    quality: string;
    size1: string;
    size2: string;
}

export default function PaymentDues() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 10;

    // Payment Modal State
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [payAmount, setPayAmount] = useState<number | string>('');
    const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            setIsLoading(true);
            const res = await getData("/sale");
            const data = res.success ? res.data : (Array.isArray(res) ? res : []);
            const pendingSales = data
                .filter((s: Sale) => Number(s.pendingAmount) > 0.5 && s.paymentStatus !== 'paid')
                .map(normalizeSaleAmounts);
            setSales(pendingSales);
        } catch (error) {
            console.error("Failed to fetch sales:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSales = useMemo(() => {
        return sales.filter(s =>
            s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.customerContact?.includes(searchTerm) ||
            s.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.quality?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sales, searchTerm]);

    const totalOutstanding = useMemo(() => {
        return sales.reduce((acc, s) => acc + s.pendingAmount, 0);
    }, [sales]);

    // Pagination logic
    const pageCount = Math.ceil(filteredSales.length / itemsPerPage);
    const offset = currentPage * itemsPerPage;
    const currentItems = filteredSales.slice(offset, offset + itemsPerPage);

    const handlePageClick = (event: { selected: number }) => {
        setCurrentPage(event.selected);
    };

    const openPayModal = (sale: Sale) => {
        setSelectedSale(sale);
        setPayAmount(roundMoney(sale.pendingAmount));
        setPayDate(new Date().toISOString().split('T')[0]);
        setIsPayModalOpen(true);
    };

    const handlePayment = async () => {
        if (!selectedSale || !payAmount || Number(payAmount) <= 0) {
            Swal.fire("Error", "Please enter a valid amount", "error");
            return;
        }
        
        const pendingDue = roundMoney(selectedSale.pendingAmount);
        const amountToPay = roundMoney(Number(payAmount));

        if (amountToPay > pendingDue) {
            Swal.fire("Error", "Amount cannot be greater than pending balance", "error");
            return;
        }

        try {
            setIsPaying(true);
            const res = await putData(`/sale/${selectedSale._id}/pay`, {
                amount: amountToPay,
                paymentDate: payDate
            });

            if (res.success) {
                Swal.fire({ title: "Success!", text: "Payment recorded successfully", icon: "success", timer: 1500 });
                setIsPayModalOpen(false);
                fetchSales(); // Refresh the list
            }
        } catch (error) {
            console.error("Payment failed", error);
            Swal.fire("Error", "Failed to record payment", "error");
        } finally {
            setIsPaying(false);
        }
    };

    return (
        <ReadPermissionGuard resource={Resource.SHEET}>
        <div className="pb-10">
            <PageMeta title="Payment Dues | Admin Dashboard" description="Track outstanding payments" />
            <PageBreadcrumb pageTitle="Payment Dues" />

            <div className="space-y-6">
                {/* Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-red-500/20">
                        <p className="text-xs font-black uppercase tracking-widest opacity-80">Total Outstanding</p>
                        <h2 className="text-4xl font-black mt-2">{curr(totalOutstanding)}</h2>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                            <span className="text-[10px] font-bold uppercase tracking-tight">{sales.length} Pending Invoices</span>
                        </div>
                    </div>
                </div>

                <ComponentCard title="Outstanding Invoices">
                    <div className="space-y-6">
                        {/* Search */}
                        <div className="relative max-w-md flex items-center">
                            <div className="absolute left-4 text-gray-400"><Search className="w-4 h-4" /></div>
                            <input
                                type="text"
                                placeholder="Search by customer, contact, or quality..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(0);
                                }}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-400 uppercase font-black tracking-[0.15em] border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="px-4 py-4">Customer Details</th>
                                        <th className="px-4 py-4">Sale Date</th>
                                        <th className="px-4 py-4">Product Info</th>
                                        <th className="px-4 py-4">Total Amount</th>
                                        <th className="px-4 py-4">Paid</th>
                                        <th className="px-4 py-4">Paid Date</th>
                                        <th className="px-4 py-4 text-right">Balance Due</th>
                                        <th className="px-4 py-4 text-center">Status</th>
                                        <th className="px-4 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={9} className="py-20 text-center">
                                                <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div></div>
                                            </td>
                                        </tr>
                                    ) : currentItems.length > 0 ? (
                                        currentItems.map((s) => {
                                            const isOverdue = s.paymentDueDate ? new Date(s.paymentDueDate).getTime() < new Date().getTime() : false;
                                            return (
                                                <tr key={s._id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-4 py-5">
                                                        <div className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">{s.customerName}</div>
                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex flex-col gap-0.5">
                                                            <span>📞 {s.customerContact}</span>
                                                            {s.contactPerson && <span>👤 {s.contactPerson}</span>}
                                                            {s.customerGst && <span>Tax ID: {s.customerGst}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5">
                                                        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                            {formatDate(s.saleDate)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5">
                                                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300">{s.size1}x{s.size2}</div>
                                                        <div className="text-[10px] text-gray-500 uppercase font-black">{s.quality} • {fmt(s.qtySold)} Sheets</div>
                                                    </td>
                                                    <td className="px-4 py-5 font-bold text-gray-900 dark:text-white">
                                                        {curr(s.totalAmount)}
                                                    </td>
                                                    <td className="px-4 py-5 font-bold text-emerald-600">
                                                        {curr(s.paidAmount)}
                                                    </td>
                                                    <td className="px-4 py-5">
                                                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                            {formatDate(s.paymentReceivedDate)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5 text-right">
                                                        <div className="font-black text-red-600 text-base">{curr(s.pendingAmount)}</div>
                                                        {s.paymentDueDate && (
                                                            <div className={`text-sm font-bold mt-1.5 ${isOverdue ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                Due: {formatDate(s.paymentDueDate)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-5 text-center">
                                                        <Badge color={isOverdue ? 'error' : s.paymentStatus === 'partial' ? 'warning' : 'info'} size="sm">
                                                            {isOverdue ? 'OVERDUE' : (s.paymentStatus?.toUpperCase() || 'PENDING')}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-5 text-center">
                                                        <button 
                                                            onClick={() => openPayModal(s)}
                                                            className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg font-black text-xs uppercase tracking-widest transition-all"
                                                        >
                                                            Pay
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="py-20 text-center text-gray-400 font-bold italic">
                                                {searchTerm ? 'No matching invoices found.' : 'No outstanding payments found. All clear! 🎉'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Component */}
                        {pageCount > 1 && (
                            <div className="flex justify-center mt-6">
                                <ReactPaginate
                                    breakLabel="..."
                                    nextLabel="Next >"
                                    onPageChange={handlePageClick}
                                    pageRangeDisplayed={3}
                                    marginPagesDisplayed={1}
                                    pageCount={pageCount}
                                    previousLabel="< Prev"
                                    containerClassName="flex items-center gap-2"
                                    pageClassName="px-3 py-1 rounded-lg border border-gray-100 hover:bg-gray-50 text-sm font-medium"
                                    activeClassName="bg-brand-500 text-white border-brand-500 hover:bg-brand-600"
                                    previousClassName="px-3 py-1 rounded-lg border border-gray-100 hover:bg-gray-50 text-sm font-medium"
                                    nextClassName="px-3 py-1 rounded-lg border border-gray-100 hover:bg-gray-50 text-sm font-medium"
                                    disabledClassName="opacity-50 cursor-not-allowed hover:bg-transparent"
                                />
                            </div>
                        )}
                    </div>
                </ComponentCard>
            </div>

            {/* Payment Modal */}
            {isPayModalOpen && selectedSale && (() => {
                const pendingDue = roundMoney(selectedSale.pendingAmount);
                const amountNum = roundMoney(Number(payAmount) || 0);
                const exceedsBalance = amountNum > pendingDue;
                const canConfirmPay = !isPaying && amountNum > 0 && !exceedsBalance;

                return (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Record Payment</h3>
                            <button onClick={() => setIsPayModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400">Customer</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedSale.customerName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-rose-500">Pending Dues</p>
                                    <p className="text-lg font-black text-rose-600">{curr(pendingDue)}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-2 block">
                                        Amount Received
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                            <IndianRupee className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={payAmount}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setPayAmount(val === '' ? '' : roundMoney(Number(val)));
                                            }}
                                            max={pendingDue}
                                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-black text-lg focus:border-brand-500 outline-none transition-all"
                                            placeholder="Enter amount..."
                                        />
                                    </div>
                                    {exceedsBalance && (
                                        <p className="text-xs text-rose-500 mt-1 font-bold">Amount exceeds pending balance!</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-2 block">
                                        Payment Date
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="date"
                                            value={payDate}
                                            max={new Date().toISOString().split('T')[0]} // Cannot be future date
                                            onChange={(e) => setPayDate(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-bold focus:border-brand-500 outline-none transition-all"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Crucial for payment discipline score</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
                            <button
                                onClick={() => setIsPayModalOpen(false)}
                                className="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-black text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePayment}
                                disabled={!canConfirmPay}
                                className={`flex-1 py-3 rounded-xl font-black text-sm text-white uppercase tracking-widest shadow-lg transition-all ${
                                    canConfirmPay
                                        ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 cursor-pointer'
                                        : 'bg-emerald-300 cursor-not-allowed opacity-60'
                                }`}
                            >
                                {isPaying ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
        </ReadPermissionGuard>
    );
}
