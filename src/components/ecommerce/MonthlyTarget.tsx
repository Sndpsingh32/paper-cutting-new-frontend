import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useState, useMemo } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Button from "../ui/button/Button";

export default function MonthlyTarget() {
  const options: ApexOptions = useMemo(() => ({
    colors: ["#0084C1"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -120,
        endAngle: 120,
        hollow: {
          margin: 0,
          size: "65%",
          background: "transparent",
        },
        track: {
          background: "rgba(241, 245, 249, 0.5)",
          strokeWidth: "100%",
          margin: 5,
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: "12px",
            fontWeight: 800,
            color: "#94a3b8",
            offsetY: 80,
          },
          value: {
            offsetY: -10,
            fontSize: "44px",
            fontWeight: 900,
            color: "#0f172a",
            formatter: function (val) {
              return val + "%";
            },
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        shadeIntensity: 0.5,
        gradientToColors: ["#005a84"],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Goal Achieved"],
  }), []);

  const [isOpen, setIsOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Benchmarks and targets
  const [efficiencySeries, setEfficiencySeries] = useState([78]);
  const [shiftProduction, setShiftProduction] = useState(7240);
  const [shiftTarget, setShiftTarget] = useState(10000);
  const [currentBenchmark, setCurrentBenchmark] = useState(66); // 78 - 12 = 66

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdjustModalOpen(false);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white/40 backdrop-blur-xl p-8 dark:border-white/5 dark:bg-white/[0.03] shadow-sm hover:shadow-2xl transition-all duration-500 group">
        {/* Background Decorative Element */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Efficiency <span className="text-brand-500">Target</span>
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Industrial throughput</p>
          </div>
          <div className="relative inline-block">
            <button
              className="dropdown-toggle p-3 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group-inner"
              onClick={() => setIsOpen(!isOpen)}
            >
              <MoreDotIcon className="text-gray-400 group-inner-hover:text-brand-500 size-6 transition-colors" />
            </button>
            <Dropdown
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              className="w-48 p-2 rounded-[1.5rem] shadow-2xl border-none backdrop-blur-2xl bg-white/90 z-50"
            >
              <DropdownItem
                onItemClick={() => {
                  setIsOpen(false);
                  setIsAdjustModalOpen(true);
                }}
                className="flex w-full font-bold text-xs uppercase tracking-widest text-gray-500 rounded-xl hover:bg-brand-500 hover:text-white transition-all py-3 px-4"
              >
                Adjust Parameters
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        <div className="relative flex flex-col items-center py-4">
          <div className="w-full h-[300px] flex justify-center items-center">
            <Chart
              options={options}
              series={efficiencySeries}
              type="radialBar"
              height={400}
              width="100%"
            />
          </div>

          <div className="absolute top-[50%] left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className={`px-6 py-2 rounded-full ${efficiencySeries[0] >= currentBenchmark ? 'bg-success-500 shadow-success-500/20' : 'bg-warning-500 shadow-warning-500/20'} text-white text-[10px] font-black border-none shadow-lg mt-20 flex items-center gap-2`}>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              {efficiencySeries[0] >= currentBenchmark
                ? `+${efficiencySeries[0] - currentBenchmark}% ABOVE BENCHMARK`
                : `${currentBenchmark - efficiencySeries[0]}% BELOW BENCHMARK`}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="p-6 rounded-[2rem] bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-white/5 shadow-sm group-hover:shadow-md">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Shift Production</span>
              <span className="text-xs font-black text-brand-600 dark:text-brand-400">{shiftProduction.toLocaleString()} / {shiftTarget.toLocaleString()} KG</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-amber-400 rounded-full transition-all duration-1000 delay-500 shadow-[0_0_15px_rgba(217,119,6,0.2)]"
                style={{ width: `${Math.min(100, (shiftProduction / shiftTarget) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-3">
              <span className="text-[9px] font-bold text-gray-400 uppercase italic">In Progress</span>
              <span className={`text-[9px] font-bold uppercase ${(shiftProduction / shiftTarget) >= 0.7 ? 'text-success-600' : 'text-amber-600'}`}>
                {(shiftProduction / shiftTarget) >= 0.7 ? 'On Schedule' : 'Below Pace'}
              </span>
            </div>
          </div>

          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.1em] leading-relaxed">
            Analysis: High velocity cutting detected in <span className="text-gray-900 dark:text-white">Batch B-90</span>
          </p>
        </div>
      </div>

      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        className="max-w-lg"
      >
        <div className="p-8">
          <div className="mb-8">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Recalibrate <span className="text-brand-500">Targets</span></h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Adjust industrial benchmark parameters</p>
          </div>

          <form onSubmit={handleAdjustSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Shift Efficiency (%)</Label>
                <Input
                  type="number"
                  value={efficiencySeries[0]}
                  onChange={(e) => setEfficiencySeries([Number(e.target.value)])}
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Industry Benchmark (%)</Label>
                <Input
                  type="number"
                  value={currentBenchmark}
                  onChange={(e) => setCurrentBenchmark(Number(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Current Production (KG)</Label>
                <Input
                  type="number"
                  value={shiftProduction}
                  onChange={(e) => setShiftProduction(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Daily Target (KG)</Label>
                <Input
                  type="number"
                  value={shiftTarget}
                  onChange={(e) => setShiftTarget(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-[1.25rem] py-4"
                onClick={() => setIsAdjustModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-[1.25rem] py-4 shadow-xl shadow-brand-500/20"
              >
                Apply Changes
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
