import React, { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import moment from 'moment';
import { toast } from 'react-toastify';
import { getData } from '../../utility/utility';
import { downloadCsv } from '../../utility/csvExport';
import {
    TrendingUp, Package, AlertTriangle,
    DollarSign, Activity, ChevronRight,
    ArrowUpRight, Clock, PhoneCall, Truck, Target, Layers, Wallet, Download
} from 'lucide-react';
import { Resource } from '../../types/permission';
import ReadPermissionGuard from '../../components/auth/ReadPermissionGuard';

const InventoryAnalytics: React.FC = () => {
    const [data, setData] = useState<any>({
        stock: [], aging: [], sales: { gsmWise: [], sizeWise: [] },
        trends: [], profit: [], efficiency: null, kpis: null, segments: [],
        financial: null, performance: [], forecast: [], dispatch: null, intelligence: null,
        weeklyPnl: [], monthlyPnl: []
    });
    const [pnlView, setPnlView] = useState<'weekly' | 'monthly'>('monthly');
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [showFullProfit, setShowFullProfit] = useState(false);
    const [fullProfit, setFullProfit] = useState<any[]>([]);
    const [loadingFullProfit, setLoadingFullProfit] = useState(false);

    useEffect(() => {
        fetchEverything();
    }, []);

    useEffect(() => {
        if (activeSection !== 'profit') {
            setShowFullProfit(false);
            setFullProfit([]);
        }
    }, [activeSection]);

    const fetchEverything = async () => {
        setLoading(true);
        try {
            const endpoints = [
                'stock-summary', 'stock-aging', 'sales-breakdown', 'rate-trends',
                'profit-summary', 'efficiency-report', 'system-kpis', 'customer-segments',
                'financial-summary', 'sales-performance', 'demand-forecast', 'dispatch-delays',
                'customer-intelligence', 'weekly-profit-loss', 'monthly-profit-loss'
            ];

            const results = await Promise.all(
                endpoints.map(ep => getData(`/analytics/${ep}`))
            );

            setData({
                stock: results[0].data, aging: results[1].data, sales: results[2].data,
                trends: results[3].data, profit: results[4].data,
                efficiency: results[5].data, kpis: results[6].data,
                segments: results[7].data, financial: results[8].data,
                performance: results[9].data,
                forecast: results[10].data,
                dispatch: results[11].data,
                intelligence: results[12].data,
                weeklyPnl: results[13].data || [],
                monthlyPnl: results[14].data || []
            });
        } catch (error) {
            console.error("SAP Analytics Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const profitRows = showFullProfit ? fullProfit : data.profit;

    const handleDownloadTopBuyersCsv = () => {
        const buyers = data.intelligence?.topBuyers || [];
        if (buyers.length === 0) {
            toast.info('No top buyer data to export.');
            return;
        }
        type TopBuyerCsvRow = {
            rank: number;
            name: string;
            totalWeight: number;
            totalOrders: number;
            totalPurchase: number;
            totalDue: number;
        };
        const rows: TopBuyerCsvRow[] = buyers.map((b: { name?: string; totalWeight?: number; totalOrders?: number; totalPurchase?: number; totalDue?: number }, i: number) => ({
            rank: i + 1,
            name: b.name || '',
            totalWeight: Number(b.totalWeight || 0),
            totalOrders: Number(b.totalOrders || 0),
            totalPurchase: Number(b.totalPurchase || 0),
            totalDue: Number(b.totalDue || 0),
        }));
        downloadCsv<TopBuyerCsvRow>(
            `top-buyers-volume-${moment().format('YYYY-MM-DD')}.csv`,
            [
                { header: 'Rank', getValue: (b) => b.rank },
                { header: 'Customer', getValue: (b) => b.name },
                { header: 'Total Weight (kg)', getValue: (b) => b.totalWeight.toFixed(2) },
                { header: 'Orders', getValue: (b) => b.totalOrders },
                { header: 'Total Purchase (₹)', getValue: (b) => Math.round(b.totalPurchase) },
                { header: 'Outstanding Due (₹)', getValue: (b) => Math.round(b.totalDue) },
            ],
            rows
        );
    };

    const fetchAllProfitRows = async (): Promise<any[]> => {
        if (showFullProfit && fullProfit.length > 0) return fullProfit;
        const res = await getData('/analytics/profit-summary?full=true');
        return res.data || [];
    };

    const handleDownloadProfitCsv = async () => {
        try {
            const rows = await fetchAllProfitRows();
            if (rows.length === 0) {
                toast.info('No profit data to export.');
                return;
            }
            downloadCsv(
                `order-profitability-${moment().format('YYYY-MM-DD')}.csv`,
                [
                    { header: 'Sale Date', getValue: (p) => p.createdAt ? moment(p.createdAt).format('YYYY-MM-DD') : '' },
                    { header: 'Bill No', getValue: (p) => p.billNo || '' },
                    { header: 'Customer', getValue: (p) => p.customerName || '' },
                    { header: 'Weight (kg)', getValue: (p) => Number(p.saleWeightKg || 0).toFixed(2) },
                    { header: 'Buy Rate (₹/kg)', getValue: (p) => Number(p.buyRate || 0).toFixed(2) },
                    { header: 'Sell Rate (₹/kg)', getValue: (p) => Number(p.sellRate || 0).toFixed(2) },
                    { header: 'Net Profit (₹)', getValue: (p) => Math.round(p.profit || 0) },
                ],
                rows
            );
        } catch {
            toast.error('Failed to export profit report.');
        }
    };

    const handleViewFullProfitReport = async () => {
        if (showFullProfit) {
            setShowFullProfit(false);
            setFullProfit([]);
            return;
        }
        setLoadingFullProfit(true);
        try {
            const rows = await fetchAllProfitRows();
            setFullProfit(rows);
            setShowFullProfit(true);
            if (rows.length === 0) {
                toast.info('No sales transactions found.');
            }
        } catch {
            toast.error('Failed to load full profit report.');
        } finally {
            setLoadingFullProfit(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent shadow-xl"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Syncing ERP Intelligence</p>
            </div>
        </div>
    );

    // Chart Options
    const trendChartOptions: any = {
        chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
        stroke: { curve: 'smooth', width: [3, 3] },
        colors: ['#ef4444', '#10b981'],
        xaxis: { categories: data.trends.map((t: any) => t._id), labels: { style: { colors: '#94a3b8', fontWeight: 700 } } },
        yaxis: { labels: { style: { colors: '#94a3b8', fontWeight: 700 } } },
        legend: { position: 'top', horizontalAlign: 'right', fontWeight: 800, labels: { colors: '#64748b' } },
        grid: { borderColor: '#f1f5f9' },
        markers: { size: 4 }
    };

    const agingOptions: any = {
        chart: { type: 'bar', toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 8, distributed: true } },
        colors: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
        xaxis: { categories: ['0-7 Days', '8-30 Days', '31-60 Days', '60+ Days'], labels: { style: { fontWeight: 700 } } },
        dataLabels: { enabled: false },
        legend: { show: false }
    };

    const perfMonths = data.performance.map((p: any) => p._id);
    const perfChartOptions: any = {
        chart: { type: 'bar', toolbar: { show: false }, zoom: { enabled: false } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
        colors: ['#6366f1', '#10b981', '#f59e0b'],
        stroke: { width: [0, 3, 3], curve: 'smooth' },
        xaxis: { categories: perfMonths, labels: { style: { colors: '#94a3b8', fontWeight: 700, fontSize: '11px' } } },
        yaxis: [
            { seriesName: 'Revenue', title: { text: '₹ Revenue', style: { color: '#6366f1', fontWeight: 800 } }, labels: { style: { colors: '#6366f1' }, formatter: (v: number) => `₹${Math.round(v / 1000)}k` } },
            { seriesName: 'Weight (KG)', opposite: true, title: { text: 'KG / Sheets', style: { color: '#10b981', fontWeight: 800 } }, labels: { style: { colors: '#10b981' } } },
            { seriesName: 'Sheets', opposite: true, show: false }
        ],
        legend: { position: 'top', fontWeight: 800, labels: { colors: '#64748b' } },
        grid: { borderColor: '#f1f5f9' },
        dataLabels: { enabled: false },
        tooltip: { shared: true, intersect: false }
    };

    return (
        <ReadPermissionGuard resource={Resource.DASHBOARD}>
        <div className="p-8 space-y-10 bg-white dark:bg-gray-950 min-h-screen">
            {/* Header: Industrial Look */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 pb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-600/30">
                            <Layers className="w-8 h-8 text-white" />
                        </div>
                        Industrial Analytics <span className="text-indigo-600">ERP</span>
                    </h1>
                    <p className="text-gray-400 font-bold mt-2 text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        11-CORE MODULES ACTIVE • LIVE CALCULATION ENGINE
                    </p>
                </div>
                <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-inner">
                    {['dashboard', 'stock', 'sales', 'profit', 'p&l'].map((s) => (
                        <button key={s} onClick={() => setActiveSection(s)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === s ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
                            {s === 'p&l' ? '📈 P&L' : s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Section 1: Dashboard KPIs */}
            {activeSection === 'dashboard' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { label: 'Total Sales Revenue', val: `₹${(data.financial?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, col: 'emerald', sub: 'Gross Turnover' },
                            { label: 'Total Market Due', val: `₹${(data.financial?.totalDue || 0).toLocaleString()}`, icon: Wallet, col: 'rose', sub: 'Outstanding Receivables' },
                            { label: 'Conversion Rate', val: data.kpis?.conversion, icon: PhoneCall, col: 'indigo', sub: `${data.kpis?.totalOrders} Sales / ${data.kpis?.totalCalls} Calls` },
                            { label: 'Avg Dispatch', val: data.kpis?.avgDispatch, icon: Truck, col: 'amber', sub: 'Order to Dispatch Time' }
                        ].map((k, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className={`p-4 rounded-2xl bg-${k.col}-50 text-${k.col}-600 inline-block mb-6 group-hover:rotate-12 transition-transform`}>
                                    <k.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{k.val}</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{k.label}</p>
                                <p className="text-xs font-bold text-gray-400 mt-4 pt-4 border-t border-gray-50">{k.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Sales Performance: Combo Chart */}
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                    <Activity className="w-7 h-7 text-indigo-600" />
                                    Sales Performance Analysis
                                </h2>
                                <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">Revenue • Weight (KG) • Sheet Count — Monthly</p>
                            </div>
                            <div className="flex gap-6">
                                {[
                                    { label: 'Total Revenue', val: `₹${Math.round(data.financial?.totalRevenue || 0).toLocaleString()}`, col: 'text-indigo-600' },
                                    { label: 'Total Weight', val: `${data.performance.reduce((a: number, p: any) => a + (p.totalWeight || 0), 0).toFixed(1)} kg`, col: 'text-emerald-600' },
                                    { label: 'Total Sheets', val: `${data.performance.reduce((a: number, p: any) => a + (p.totalSheets || 0), 0).toLocaleString()} pcs`, col: 'text-amber-600' }
                                ].map((s, i) => (
                                    <div key={i} className="text-center">
                                        <p className={`text-xl font-black ${s.col}`}>{s.val}</p>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="h-[380px] flex items-center justify-center">
                            {data.performance.length > 0 ? (
                                <ReactApexChart
                                    options={perfChartOptions}
                                    series={[
                                        { name: 'Revenue', type: 'bar', data: data.performance.map((p: any) => Math.round(p.totalRevenue || 0)) },
                                        { name: 'Weight (KG)', type: 'line', data: data.performance.map((p: any) => parseFloat((p.totalWeight || 0).toFixed(1))) },
                                        { name: 'Sheets', type: 'line', data: data.performance.map((p: any) => p.totalSheets || 0) }
                                    ]}
                                    type="line"
                                    height="100%"
                                    width="100%"
                                />
                            ) : (
                                <div className="text-center opacity-20">
                                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">No Sales Data Available Yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Rate Trend Tracking */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                                    Rate Trend & Margin Analysis
                                </h2>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase">
                                        <div className="w-2 h-2 rounded-full bg-rose-500"></div> Buy Rate
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Sell Rate
                                    </div>
                                </div>
                            </div>
                            <div className="h-[300px] flex items-center justify-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                {data.trends.length > 0 ? (
                                    <ReactApexChart
                                        options={trendChartOptions}
                                        series={[
                                            { name: 'Buy Rate', data: data.trends.map((t: any) => t.avgBuyRate.toFixed(1)) },
                                            { name: 'Sell Rate', data: data.trends.map((t: any) => t.avgSellRate.toFixed(1)) }
                                        ]}
                                        type="line"
                                        height="100%"
                                        width="100%"
                                    />
                                ) : (
                                    <div className="text-center">
                                        <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">No Sales Data Available for Trends</p>
                                    </div>
                                )}
                            </div>

                            {/* Margin Trend Indicator */}
                            {data.trends.length >= 1 && (() => {
                                const last = data.trends[data.trends.length - 1];
                                const prev = data.trends.length >= 2 ? data.trends[data.trends.length - 2] : null;
                                const lastMargin = (last.avgSellRate - last.avgBuyRate);
                                const prevMargin = prev ? (prev.avgSellRate - prev.avgBuyRate) : null;
                                const change = prevMargin !== null ? lastMargin - prevMargin : null;
                                const pct = (prevMargin && prevMargin > 0) ? ((change! / prevMargin) * 100).toFixed(1) : null;
                                const improving = change !== null ? change >= 0 : null;
                                return (
                                    <div className="mt-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Margin</p>
                                            <p className="text-2xl font-black text-gray-900 mt-0.5">₹{lastMargin.toFixed(1)}/kg</p>
                                            <p className="text-[10px] text-gray-400 font-bold mt-1">{last._id} — Sell ₹{last.avgSellRate.toFixed(1)} | Buy ₹{last.avgBuyRate.toFixed(1)}</p>
                                        </div>
                                        <div className="text-right">
                                            {improving !== null ? (
                                                <div className={`flex items-center gap-2 justify-end ${improving ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    <ArrowUpRight className={`w-6 h-6 ${improving ? '' : 'rotate-180'}`} />
                                                    <span className="text-xl font-black">{pct ? `${improving ? '+' : ''}${pct}%` : 'New'}</span>
                                                </div>
                                            ) : null}
                                            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${improving ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {improving === null ? 'First Month' : improving ? 'Margin Improving ↑' : 'Margin Declining ↓'}
                                            </p>
                                            {prevMargin !== null && <p className="text-[9px] text-gray-400 font-bold">Prev: ₹{prevMargin.toFixed(1)}/kg</p>}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Right Column: Top GSM + Efficiency stacked */}
                        <div className="flex flex-col gap-6">

                            {/* Top GSM Leaderboard */}
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border border-gray-100 shadow-sm flex-1">
                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-1">
                                    <Package className="w-5 h-5 text-indigo-600" />
                                    Top Trending GSM
                                </h3>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-5">Ranked by Weight Sold</p>
                                <div className="space-y-3">
                                    {data.sales.gsmWise?.length > 0 ? data.sales.gsmWise.slice(0, 5).map((g: any, i: number) => {
                                        const maxWeight = data.sales.gsmWise[0]?.weight || 1;
                                        const pct = Math.round((g.weight / maxWeight) * 100);
                                        const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500'];
                                        return (
                                            <div key={i} className="group">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center ${colors[i]}`}>
                                                            {i + 1}
                                                        </span>
                                                        <p className="text-sm font-black text-gray-900">{g._id} GSM</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-gray-700">{(g.weight || 0).toFixed(1)} kg</p>
                                                        <p className="text-[9px] text-gray-400 font-bold">₹{Math.round(g.revenue || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full ${colors[i]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="py-8 text-center opacity-20">
                                            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase text-gray-400">No GSM Data</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Efficiency Card (compact) */}
                            <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-indigo-600/40">
                                <h3 className="text-lg font-black tracking-tighter">Wastage & ₹ Impact</h3>
                                <p className="text-indigo-100 text-xs mt-2 font-medium leading-relaxed">
                                    Efficiency: <span className="text-white font-black">
                                        {data.efficiency?.totalInput > 0 ? (((data.efficiency.totalInput - data.efficiency.totalLossWeight) / data.efficiency.totalInput) * 100).toFixed(1) : 0}%
                                    </span> | Loss: <span className="text-white font-black">{(data.efficiency?.totalLossWeight || 0).toFixed(1)}kg</span>
                                </p>
                                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 mt-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Financial Impact (Loss)</p>
                                    <p className="text-2xl font-black mt-1">₹{Math.round((data.efficiency?.totalLossWeight || 0) * 45).toLocaleString()}</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </>
            )}

            {/* Section 2: Detailed Stock */}
            {activeSection === 'stock' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                            <Clock className="w-6 h-6 text-amber-500" />
                            Stock Aging & Dead Stock
                        </h2>
                        <ReactApexChart
                            options={agingOptions}
                            series={[{ name: 'Weight (kg)', data: data.aging.map((a: any) => Math.round(a.weight)) }]}
                            type="bar"
                            height={300}
                        />
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-rose-500" />
                            Reorder Level Alerts
                        </h2>
                        <div className="space-y-4">
                            {data.stock.filter((s: any) => s.totalWeight < s.minStock).map((s: any, i: number) => (
                                <div key={i} className="p-5 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-black text-rose-700">{s._id.quality} {s._id.gsm} GSM</p>
                                        <p className="text-xs font-bold text-rose-500">Current: {s.totalWeight}kg | Min: {s.minStock}kg</p>
                                    </div>
                                    <button className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase">Order Now</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Section 3: Profit Tracking (The Heart) */}
            {activeSection === 'profit' && (
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-black">Detailed Order Profitability</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {showFullProfit
                                    ? `Showing all ${profitRows.length} orders`
                                    : `Showing latest ${profitRows.length} orders`}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadProfitCsv}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download CSV
                        </button>
                    </div>
                    <div className="overflow-hidden border border-gray-100 rounded-3xl">
                        <div className={`${showFullProfit ? 'max-h-[70vh]' : 'max-h-[500px]'} overflow-y-auto scrollbar-hide`}>
                            <table className="w-full">
                                <thead className="sticky top-0 bg-white dark:bg-gray-800 z-20 shadow-sm">
                                    <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <th className="p-6">Customer</th>
                                        <th className="p-6">Weight</th>
                                        <th className="p-6 text-center">Buy/Sell Rate</th>
                                        <th className="p-6 text-right">Net Profit</th>
                                        <th className="p-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {profitRows.length > 0 ? profitRows.map((p: any, i: number) => (
                                        <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="p-6">
                                                <p className="text-sm font-black text-gray-900">{p.customerName}</p>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-sm font-bold text-gray-500">{(p.saleWeightKg || 0).toFixed(2)} kg</p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-xs font-black">
                                                    ₹{(p.buyRate || 0).toFixed(1)} / ₹{(p.sellRate || 0).toFixed(1)}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <p className={`text-sm font-black ${p.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    ₹{Math.round(p.profit).toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="p-6 text-right">
                                                <button className="p-2 hover:bg-indigo-50 rounded-lg text-gray-300 hover:text-indigo-600 transition-colors">
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-20">
                                                    <DollarSign className="w-10 h-10 text-gray-400" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">No Sales Transactions Found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            type="button"
                            onClick={handleViewFullProfitReport}
                            disabled={loadingFullProfit}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:underline disabled:opacity-50"
                        >
                            {loadingFullProfit
                                ? 'Loading...'
                                : showFullProfit
                                    ? 'Show Latest 20 Only'
                                    : 'View Full Profit Report'}
                        </button>
                        {showFullProfit && (
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {fullProfit.length} total orders loaded
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Section 4: Customer Relationship Manager */}
            {activeSection === 'sales' && (
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                    <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                        <Target className="w-7 h-7 text-indigo-600" />
                        Customer Account Segmentation
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                        {data.segments.length > 0 ? data.segments.map((c: any, i: number) => (
                            <div key={i} className="p-6 rounded-[2rem] bg-gray-50/50 border border-transparent hover:border-indigo-100 transition-all group">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg ${c.segment === 'Regular' ? 'bg-indigo-600 shadow-indigo-200' : c.segment === 'Occasional' ? 'bg-amber-500 shadow-amber-200' : 'bg-gray-400 shadow-gray-200'}`}>
                                        {c.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-gray-900">{c.name}</p>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${c.segment === 'Regular' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {c.segment}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                                    <div className="text-[10px] font-black text-gray-400 uppercase">Frequency Score</div>
                                    <ArrowUpRight className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-20 text-center opacity-20">
                                <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">No Customer Segments Detected</p>
                            </div>
                        )}
                    </div>

                    {/* Top Buyers & Payment Discipline */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Top Buyers */}
                        <div className="border border-gray-100 rounded-3xl p-6 bg-gray-50/30">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <h3 className="text-sm font-black flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    Top Buyers (Volume)
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleDownloadTopBuyersCsv}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[9px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    CSV
                                </button>
                            </div>
                            <div className="space-y-3">
                                {data.intelligence?.topBuyers?.length > 0 ? data.intelligence.topBuyers.map((b: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-gray-400 w-4">{i + 1}.</span>
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{b.name}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{b.totalWeight}kg | {b.totalOrders} Orders</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-emerald-600">₹{Math.round(b.totalPurchase).toLocaleString()}</p>
                                            {b.totalDue > 0 && <p className="text-[9px] font-black text-rose-500">Due: ₹{Math.round(b.totalDue).toLocaleString()}</p>}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-gray-400 text-center py-4">No buyer data</p>
                                )}
                            </div>
                        </div>

                        {/* Payment Discipline */}
                        <div className="border border-gray-100 rounded-3xl p-6 bg-gray-50/30">
                            <h3 className="text-sm font-black mb-4 flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-indigo-500" />
                                Payment Discipline Score
                            </h3>
                            <div className="space-y-3">
                                {data.intelligence?.paymentDiscipline?.length > 0 ? data.intelligence.paymentDiscipline.map((p: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100">
                                        <div>
                                            <p className="text-sm font-black text-gray-900">{p.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{p.payments} Payments Analyzed</p>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <div className="text-right">
                                                <p className={`text-sm font-black ${p.avgDelay <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {p.avgDelay <= 0 ? 'On Time' : `${p.avgDelay} Days Late`}
                                                </p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Avg Delay</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${p.grade === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                                                p.grade === 'Good' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                {p.grade}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-gray-400 text-center py-4">No payment data with dates</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== SECTION: P&L OVERVIEW ===== */}
            {activeSection === 'p&l' && (() => {
                const pnlData = pnlView === 'weekly' ? data.weeklyPnl : data.monthlyPnl;
                const totalRevenue = pnlData.reduce((s: number, r: any) => s + (r.totalRevenue || 0), 0);
                const totalCost = pnlData.reduce((s: number, r: any) => s + (r.totalPurchaseCost || 0), 0);
                const totalProfit = pnlData.reduce((s: number, r: any) => s + (r.totalProfit || 0), 0);
                const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

                const pnlChartOptions: any = {
                    chart: { type: 'bar', toolbar: { show: false }, zoom: { enabled: false } },
                    plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', grouped: true } },
                    colors: ['#6366f1', '#f43f5e', '#10b981'],
                    stroke: { width: [0, 0, 3], curve: 'smooth' },
                    xaxis: {
                        categories: pnlData.map((r: any) => r.label || ''),
                        labels: { style: { colors: '#94a3b8', fontWeight: 700, fontSize: '11px' } }
                    },
                    yaxis: [
                        {
                            seriesName: 'Revenue',
                            title: { text: '₹ Amount', style: { color: '#6366f1', fontWeight: 800 } },
                            labels: { style: { colors: '#94a3b8' }, formatter: (v: number) => `₹${Math.round(v / 1000)}k` }
                        },
                        { seriesName: 'Purchase Cost', show: false },
                        {
                            seriesName: 'Net Profit',
                            opposite: true,
                            title: { text: '₹ Profit/Loss', style: { color: '#10b981', fontWeight: 800 } },
                            labels: { style: { colors: '#10b981' }, formatter: (v: number) => `₹${Math.round(v / 1000)}k` }
                        }
                    ],
                    legend: { position: 'top', fontWeight: 800, labels: { colors: '#64748b' } },
                    grid: { borderColor: '#f1f5f9' },
                    dataLabels: { enabled: false },
                    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => `₹${Math.round(v).toLocaleString()}` } }
                };

                return (
                    <div className="space-y-8">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Revenue', val: `₹${Math.round(totalRevenue).toLocaleString()}`, sub: 'Selling Price Total', col: 'indigo', icon: '💰' },
                                { label: 'Total Purchase Cost', val: `₹${Math.round(totalCost).toLocaleString()}`, sub: 'Buy Price × Weight', col: 'rose', icon: '🛒' },
                                { label: 'Net Profit / Loss', val: `₹${Math.round(totalProfit).toLocaleString()}`, sub: totalProfit >= 0 ? 'In Profit ✅' : 'In Loss ❌', col: totalProfit >= 0 ? 'emerald' : 'rose', icon: totalProfit >= 0 ? '📈' : '📉' },
                                { label: 'Profit Margin', val: `${margin}%`, sub: 'Revenue Share', col: 'amber', icon: '🎯' }
                            ].map((k, i) => (
                                <div key={i} className={`bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 shadow-sm`}>
                                    <div className="text-3xl mb-3">{k.icon}</div>
                                    <p className={`text-2xl font-black text-${k.col}-600`}>{k.val}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{k.label}</p>
                                    <p className="text-xs text-gray-400 font-bold mt-2 pt-2 border-t border-gray-50">{k.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Chart Card */}
                        <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                        <span className="text-2xl">📊</span>
                                        Profit & Loss Overview
                                    </h2>
                                    <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">
                                        Revenue vs Purchase Cost vs Net Profit
                                    </p>
                                </div>
                                {/* Weekly / Monthly Toggle */}
                                <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
                                    {(['monthly', 'weekly'] as const).map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setPnlView(v)}
                                            className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                                pnlView === v ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                        >
                                            {v === 'weekly' ? '📅 Weekly' : '🗓 Monthly'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {pnlData.length > 0 ? (
                                <ReactApexChart
                                    options={pnlChartOptions}
                                    series={[
                                        { name: 'Revenue', type: 'bar', data: pnlData.map((r: any) => r.totalRevenue || 0) },
                                        { name: 'Purchase Cost', type: 'bar', data: pnlData.map((r: any) => r.totalPurchaseCost || 0) },
                                        { name: 'Net Profit', type: 'line', data: pnlData.map((r: any) => r.totalProfit || 0) }
                                    ]}
                                    type="bar"
                                    height={380}
                                    width="100%"
                                />
                            ) : (
                                <div className="h-[300px] flex items-center justify-center opacity-20">
                                    <div className="text-center">
                                        <div className="text-5xl mb-3">📉</div>
                                        <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">No Sales Data Available</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Detail Table */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                                <span>📋</span> {pnlView === 'weekly' ? 'Weekly' : 'Monthly'} Breakdown
                            </h3>
                            <div className="overflow-hidden rounded-2xl border border-gray-100">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <th className="p-4">{pnlView === 'weekly' ? 'Week' : 'Month'}</th>
                                            <th className="p-4 text-right">Revenue</th>
                                            <th className="p-4 text-right">Purchase Cost</th>
                                            <th className="p-4 text-right">Net P&L</th>
                                            <th className="p-4 text-right">Margin</th>
                                            <th className="p-4 text-right">Orders</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {pnlData.length > 0 ? pnlData.map((r: any, i: number) => {
                                            const m = r.totalRevenue > 0 ? ((r.totalProfit / r.totalRevenue) * 100).toFixed(1) : '0.0';
                                            const isPos = (r.totalProfit || 0) >= 0;
                                            return (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-4 font-black text-sm text-gray-900">{r.label}</td>
                                                    <td className="p-4 text-right text-sm font-bold text-indigo-600">₹{Math.round(r.totalRevenue || 0).toLocaleString()}</td>
                                                    <td className="p-4 text-right text-sm font-bold text-rose-500">₹{Math.round(r.totalPurchaseCost || 0).toLocaleString()}</td>
                                                    <td className={`p-4 text-right text-sm font-black ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {isPos ? '+' : ''}₹{Math.round(r.totalProfit || 0).toLocaleString()}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${isPos ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                            {m}%
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right text-sm font-bold text-gray-500">{r.totalOrders}</td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center opacity-20">
                                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">No data for this period</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {pnlData.length > 0 && (
                                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                            <tr className="font-black">
                                                <td className="p-4 text-xs uppercase tracking-widest text-gray-500">Total</td>
                                                <td className="p-4 text-right text-sm text-indigo-600">₹{Math.round(totalRevenue).toLocaleString()}</td>
                                                <td className="p-4 text-right text-sm text-rose-500">₹{Math.round(totalCost).toLocaleString()}</td>
                                                <td className={`p-4 text-right text-sm ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {totalProfit >= 0 ? '+' : ''}₹{Math.round(totalProfit).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${totalProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                        {margin}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right text-sm text-gray-500">
                                                    {pnlData.reduce((s: number, r: any) => s + (r.totalOrders || 0), 0)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Demand Forecast + Dispatch Delays */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Demand Forecasting */}
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                    <h2 className="text-xl font-black mb-2 flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-indigo-600" />
                        Demand Forecast
                    </h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Based on last 60 days sales • Stock urgency</p>
                    <div className="space-y-3 max-h-[350px] overflow-y-auto">
                        {data.forecast.length > 0 ? data.forecast.map((f: any, i: number) => (
                            <div key={i} className={`p-4 rounded-2xl border flex items-center justify-between ${f.urgency === 'critical' ? 'bg-rose-50 border-rose-200' :
                                f.urgency === 'high' ? 'bg-amber-50 border-amber-200' :
                                    'bg-gray-50 border-gray-100'
                                }`}>
                                <div>
                                    <p className="text-sm font-black text-gray-900">{f.quality} {f.gsm} GSM</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                                        Sold: {f.soldLast60Days}kg | Stock: {f.currentStock}kg
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs font-black ${f.urgency === 'critical' ? 'text-rose-600' :
                                        f.urgency === 'high' ? 'text-amber-600' : 'text-emerald-600'
                                        }`}>
                                        {f.daysRemaining === 999 ? '∞' : `${f.daysRemaining}d`} left
                                    </p>
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${f.urgency === 'critical' ? 'bg-rose-100 text-rose-700' :
                                        f.urgency === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>{f.urgency}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="py-16 text-center opacity-20">
                                <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400">No Forecast Data</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Dispatch Delay Detection */}
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                    <h2 className="text-xl font-black mb-2 flex items-center gap-3">
                        <Truck className="w-6 h-6 text-amber-500" />
                        Dispatch Performance
                    </h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Orders &gt; 3 days = Delayed</p>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { label: 'Avg Days', val: data.dispatch?.avgDelay || '0', col: 'text-indigo-600' },
                            { label: 'Delayed', val: data.dispatch?.delayed?.length || 0, col: 'text-rose-600' },
                            { label: 'On Time', val: data.dispatch?.onTime?.length || 0, col: 'text-emerald-600' }
                        ].map((s, i) => (
                            <div key={i} className="text-center p-4 bg-gray-50 rounded-2xl">
                                <p className={`text-2xl font-black ${s.col}`}>{s.val}</p>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2 max-h-[230px] overflow-y-auto">
                        {(data.dispatch?.delayed || []).length > 0 ? (data.dispatch.delayed || []).map((d: any, i: number) => (
                            <div key={i} className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-between">
                                <p className="text-xs font-black text-rose-700">{d.customerName}</p>
                                <span className="text-[10px] font-black text-rose-500">{Math.round(d.daysToDispatch)}d delay</span>
                            </div>
                        )) : (
                            <div className="py-10 text-center opacity-20">
                                <Truck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No Delayed Orders</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </ReadPermissionGuard>
    );
};

export default InventoryAnalytics;
