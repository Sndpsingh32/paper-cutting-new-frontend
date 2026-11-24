import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import PageMeta from "../../components/common/PageMeta";
import { getData } from "../../utility/utility";
import Loader from "../../components/common/Loader";

import { useProfile } from "../../context/ProfileContext";
import { Resource } from "../../types/permission";
import ReadPermissionGuard from "../../components/auth/ReadPermissionGuard";

export default function Home() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const [stats, setStats] = useState<any>(null);
  const [dueSales, setDueSales] = useState<any[]>([]);
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, dueRes, stockRes] = await Promise.all([
          getData("/dashboard/stats"),
          getData("/sale/due-today"),
          getData("/reels/summary")
        ]);

        if (statsRes.success) {
          setStats(statsRes.data);
        }
        if (dueRes.success) {
          setDueSales(dueRes.data || []);
        }
        if (stockRes.success) {
          setStockSummary(stockRes.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!profileLoading) {
      if (profile && profile.role !== 'superadmin' && profile.role !== 'admin') {
        const perms = (profile.permissions as any)?.permissions || profile.permissions;
        const dashPerms = perms ? (perms.dashboard || perms.DASHBOARD || []) : [];
        if (!dashPerms.includes('read') && !dashPerms.includes('READ')) {
          navigate('/profile', { replace: true });
          return;
        }
      }
      fetchStats();
    }
  }, [profile, profileLoading, navigate]);

  if (loading || profileLoading) return <Loader />;

  return (
    <ReadPermissionGuard resource={Resource.DASHBOARD}>
    <>
      <PageMeta
        title="Dashboard | Paper Cutting - Service Management System"
        description="Main dashboard for Paper Cutting service management system"
      />

      {/* Decorative Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-200/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-light-200/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="relative z-1 space-y-10 lg:space-y-12">
        {dueSales.length > 0 && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="bg-gradient-to-r from-red-600 to-red-800 p-6 rounded-[2.5rem] shadow-2xl shadow-red-500/20 border border-red-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 text-white font-black text-xs uppercase tracking-[0.2em]">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-ping"></span>
                  ⚠ Priority: Payment Due Today
                </div>
                <button
                  onClick={() => navigate("/payment-dues")}
                  className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all border border-white/10 backdrop-blur-md"
                >
                  View All Dues →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dueSales.map(s => (
                  <div key={s._id} className="group p-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl hover:bg-white/15 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white group-hover:text-red-100 transition-colors">{s.customerName}</h4>
                        <p className="text-[10px] text-red-100/60 font-medium">{s.customerContact}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-white">₹{s.pendingAmount.toLocaleString()}</div>
                        <div className="text-[9px] font-black uppercase text-red-200 tracking-wider">Pending Balance</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


        {/* Welcome Section */}
        {/* <div className="relative overflow-hidden rounded-[3.5rem] bg-gray-900 p-12 md:p-16 text-white shadow-2xl transition-all duration-700 hover:shadow-brand-500/10 group">
      
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-brand-950 transition-transform duration-700 group-hover:scale-105"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-12">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-ping"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">System Live</span>
              </div>
              <h1 className="text-5xl font-black tracking-tight md:text-6xl lg:text-7xl leading-[1.1]">
                Factory <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-brand-400 to-accent-500">Intelligence</span>
              </h1>
              <p className="max-w-xl text-lg md:text-xl text-gray-400 leading-relaxed font-medium">
                Real-time monitoring of <span className="text-white font-black">{stats.totalReels} heavy industrial reels</span> currently in production. All systems are operating at peak efficiency.
              </p>

              <div className="pt-4 flex flex-wrap gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Health Score</span>
                  <span className="text-2xl font-black text-white">98%</span>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Throughput</span>
                  <span className="text-2xl font-black text-white">4.2k <span className="text-xs text-gray-500">kg/h</span></span>
                </div>
              </div>
            </div>
          </div>

      
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-500/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]"></div>

       
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
        </div> */}

        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          <div className="col-span-12">
            <EcommerceMetrics stats={stats} />
          </div>

          {/* Low Stock Alerts — below summary cards */}
          {stockSummary.filter(s => s.totalReels < 2 || s.totalWeightKg < 500).length > 0 && (
            <div className="col-span-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm dark:border-amber-800/40 dark:from-amber-950/30 dark:via-gray-900 dark:to-gray-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40">
                      <span className="text-lg">⚠️</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                        Inventory Analytics
                      </h3>
                      <p className="text-xs font-semibold text-amber-700/80 dark:text-amber-400/80">
                        Low Stock Warnings
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/reel-management")}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-[10px] font-black text-white uppercase tracking-widest transition-colors shadow-md shadow-amber-600/20"
                  >
                    Manage Inventory →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stockSummary.filter(s => s.totalReels < 2 || s.totalWeightKg < 500).map((s, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all dark:bg-gray-800/80 dark:border-amber-900/50 dark:hover:border-amber-700"
                    >
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div className="min-w-0">
                          <h4 className="font-black text-gray-900 dark:text-white truncate text-sm">
                            {s.quality} {s.gsm} GSM
                          </h4>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                            Consolidated Stock (All Widths)
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-tighter shrink-0 dark:bg-red-900/40 dark:text-red-300">
                          Critical
                        </span>
                      </div>

                      <div className="flex items-end justify-between pt-3 border-t border-amber-100/80 dark:border-amber-900/30">
                        <div>
                          <span className="text-2xl font-black text-gray-900 dark:text-white">{s.totalReels}</span>
                          <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5">
                            Active Rolls
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-amber-700 dark:text-amber-400">
                            {s.totalWeightKg.toFixed(1)} KG
                          </span>
                          <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5">
                            Net Available
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stats && (
            <>
              <div className="col-span-12 xl:col-span-8 transition-transform duration-500 hover:translate-y-[-4px]">
                <RecentOrders sheets={stats.recentSheets} />
              </div>

              <div className="col-span-12 xl:col-span-4 transition-transform duration-500 hover:translate-y-[-4px]">
                <MonthlyTarget />
              </div>

              <div className="col-span-12 transition-all duration-500 hover:shadow-xl rounded-3xl">
                <MonthlySalesChart data={stats.weeklySalesStats} />
              </div>
            </>
          )}

          {!stats && !loading && (
            <div className="col-span-12 py-20 text-center">
              <div className="inline-flex size-20 bg-red-50 rounded-[2.5rem] items-center justify-center dark:bg-red-900/10 mb-6">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                System Data <span className="text-red-500">Unavailable</span>
              </h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto">
                We're having trouble connecting to the intelligence server. Please check your connection or try refreshing the dashboard.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-8 px-8 py-3 bg-gray-900 dark:bg-brand-500 text-white font-bold rounded-2xl hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-gray-900/10"
              >
                Reconnect System
              </button>
            </div>
          )}
        </div>
      </div>
    </>
    </ReadPermissionGuard>
  );
}
