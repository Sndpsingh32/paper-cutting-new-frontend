import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ChartTab from "../common/ChartTab";

export default function MonthlySalesChart({ data }: { data?: any }) {
  const options: ApexOptions = ({
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "left",
      fontSize: "12px",
      fontWeight: 600,
      markers: {
        width: 12,
        height: 12,
        radius: 0,
        strokeWidth: 0,
      },
      itemMargin: {
        horizontal: 15,
        vertical: 10,
      },
    },
    colors: ["#0084C1", "#E31B23", "#10B981"], // Blue (Partial), Red (Pending), Green (Paid)
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "area",
      stacked: true,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: {
      curve: "smooth",
      width: [2, 2, 2],
      colors: ["#0084C1", "#E31B23", "#10B981"],
    },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.7, opacityTo: 0.2 },
    },
    markers: { size: 4, colors: ["#0084C1", "#E31B23", "#10B981"], strokeColors: "#fff", strokeWidth: 2, hover: { size: 6 } },
    dataLabels: { enabled: true, formatter: function (val: any) { return val; }, style: { fontSize: '10px', fontWeight: 'bold' } },
    grid: {
      borderColor: "#e5e7eb",
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true, strokeDashArray: 5 } },
      padding: { left: 10, right: 10, top: 0, bottom: 0 }
    },
    tooltip: { enabled: true, shared: true, intersect: false, theme: "light", style: { fontSize: "12px", fontFamily: "Outfit" } },
    xaxis: {
      type: "category",
      categories: data?.labels || ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "12px", fontWeight: 500, colors: "#6B7280" }, padding: 10 },
      tooltip: { enabled: false }
    },
    yaxis: {
      labels: { style: { fontSize: "12px", colors: "#6B7280", fontWeight: 500 }, padding: 10 },
      title: { text: "Sales Count", style: { fontSize: "10px", fontWeight: 600 } }
    },
  } as any) as ApexOptions;

  const series = [
    { name: "Partial Payments", data: data?.partial || [0, 0, 0, 0, 0, 0, 0] },
    { name: "Pending Payments", data: data?.pending || [0, 0, 0, 0, 0, 0, 0] },
    { name: "Paid Sales", data: data?.paid || [0, 0, 0, 0, 0, 0, 0] },
  ];

  return (
    <div className="rounded-[1rem] border border-brand-500 bg-white/40 backdrop-blur-xl px-6 pb-5 pt-8 dark:border-brand-500/30 dark:bg-white/[0.03] shadow-sm hover:shadow-2xl transition-all duration-500">
      <div className="flex flex-col gap-5 mb-8 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Weekly Sales & <span className="text-brand-500">Payments</span>
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Transaction status distribution analysis</p>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
          <ChartTab />
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <Chart options={options} series={series} type="area" height={310} />
        </div>
      </div>
    </div>
  );
}
