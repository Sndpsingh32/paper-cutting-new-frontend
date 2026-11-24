import {
  ArrowUpIcon,
  BoxIconLine,
  GroupIcon,
  PieChartIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";

interface DashboardStats {
  totalWeight: number;
  totalReels: number;
  wastagePercentage: number;
  monthlyGrowth: number;
  totalSheets: number;
  cuttingRecords: number;
  stockValue: number;
  totalOutstanding: number;
}

export default function EcommerceMetrics({ stats }: { stats: DashboardStats }) {
  if (!stats) return null;

  const fmt = (n: number) => n?.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) || "0";

  const metrics = [
    {
      title: "Total Weight",
      value: `${fmt(stats.totalWeight)} kg`,
      change: `+${stats.monthlyGrowth}%`,
      icon: <BoxIconLine className="size-6" />,
      color: "from-brand-500/30 via-brand-500/10 to-transparent",
      accentColor: "bg-brand-500",
      iconBg: "bg-brand-500/10 text-brand-600",
      badgeColor: "success",
    },
    {
      title: "Active Rolls",
      value: stats.totalReels,
      change: `₹${(stats.stockValue / 1000).toFixed(1)}k`,
      icon: <PieChartIcon className="size-6" />,
      color: "from-blue-500/30 via-blue-500/10 to-transparent",
      accentColor: "bg-blue-500",
      iconBg: "bg-blue-500/10 text-blue-600",
      badgeColor: "info",
    },
    {
      title: "Sheet Stock",
      value: `${fmt(stats.totalSheets)} kg`,
      change: `${stats.cuttingRecords} Batches`,
      icon: <GroupIcon className="size-6" />,
      color: "from-emerald-500/30 via-emerald-500/10 to-transparent",
      accentColor: "bg-emerald-500",
      iconBg: "bg-emerald-500/10 text-emerald-600",
      badgeColor: "success",
    },
    {
      title: "Outstanding",
      value: `₹${(stats.totalOutstanding / 1000).toFixed(1)}k`,
      change: "Payments",
      icon: <ArrowUpIcon className="size-6 rotate-45" />,
      color: "from-rose-500/30 via-rose-500/10 to-transparent",
      accentColor: "bg-rose-500",
      iconBg: "bg-rose-500/10 text-rose-600",
      badgeColor: "warning",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white/40 backdrop-blur-xl p-8 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-gray-200 dark:border-white/5 dark:bg-white/[0.03] dark:hover:shadow-none group"
        >
          {/* Ambient Background Glow */}
          <div className={`absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br ${metric.color} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700`}></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className={`flex items-center justify-center w-14 h-14 rounded-2xl ${metric.iconBg} transition-all duration-700 group-hover:scale-110 group-hover:rotate-[10deg] shadow-lg shadow-black/[0.03]`}>
                {metric.icon}
              </div>
              <Badge color={metric.badgeColor as any} className="font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-widest bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
                {metric.change}
              </Badge>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {metric.title}
              </span>
              <h4 className="text-3xl font-black text-gray-900 dark:text-white group-hover:tracking-tight transition-all duration-500">
                {metric.value}
              </h4>
            </div>

            {/* Dynamic Progress Line Overlay */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${metric.accentColor} rounded-full w-0 group-hover:w-[60%] transition-all duration-1000 delay-300 shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">Target: 85%</span>
            </div>
          </div>

          {/* Premium Bottom Bar */}
          <div className={`absolute bottom-0 left-0 h-1.5 w-0 ${metric.accentColor} transition-all duration-700 group-hover:w-full group-hover:opacity-60`}></div>
        </div>
      ))}
    </div>
  );
}
