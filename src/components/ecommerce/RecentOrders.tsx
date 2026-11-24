import { useNavigate } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";

// Define the TypeScript interface for the table rows
interface SheetActivity {
  _id: string;
  sheetNo: string;
  reelId: {
    _id: string;
    reelNo: string;
    quality: string;
    gsm: number;
  };
  totalWeightKg: number;
  quality: string;
  entryDate: string;
}

export default function RecentOrders({ sheets }: { sheets: SheetActivity[] }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white/40 backdrop-blur-xl dark:border-white/5 dark:bg-white/[0.03] shadow-sm hover:shadow-2xl transition-all duration-500">
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between px-8 pt-8">
        <div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Production <span className="text-brand-500">Feed</span>
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Live manufacturing stream</p>
        </div>

        <button
          onClick={() => navigate('/sheet-management')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-gray-900/10 transition-all hover:bg-gray-800 hover:shadow-xl active:scale-95 dark:bg-brand-500 dark:shadow-brand-500/20 dark:hover:bg-brand-600"
        >
          Full Audit Trail
        </button>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar px-2">
        <Table className="border-separate border-spacing-y-3 px-6">
          <TableHeader>
            <TableRow className="border-none bg-transparent">
              <TableCell isHeader className="pb-4 font-black text-gray-400 text-start text-[10px] uppercase tracking-[0.2em] dark:text-gray-500 pl-6">
                Batch Details
              </TableCell>
              <TableCell isHeader className="pb-4 font-black text-gray-400 text-start text-[10px] uppercase tracking-[0.2em] dark:text-gray-500">
                Source Roll
              </TableCell>
              <TableCell isHeader className="pb-4 font-black text-gray-400 text-start text-[10px] uppercase tracking-[0.2em] dark:text-gray-500">
                Yield
              </TableCell>
              <TableCell isHeader className="pb-4 font-black text-gray-400 text-center text-[10px] uppercase tracking-[0.2em] dark:text-gray-500">
                Quality
              </TableCell>
              <TableCell isHeader className="pb-4 font-black text-gray-400 text-end text-[10px] uppercase tracking-[0.2em] dark:text-gray-500 pr-6">
                Timestamp
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sheets?.map((sheet) => (
              <TableRow key={sheet._id} className="group bg-white/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] transition-all duration-300 shadow-sm first:rounded-t-3xl last:rounded-b-3xl">
                <TableCell className="py-5 pl-6 rounded-l-[1.5rem]">
                  <div className="flex flex-col">
                    <span className="font-extrabold text-gray-900 text-sm dark:text-white group-hover:text-brand-600 transition-colors">
                      #{sheet.sheetNo}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Job-{sheet._id.substring(18)}</span>
                  </div>
                </TableCell>
                <TableCell className="py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center dark:bg-white/5 border border-gray-100 dark:border-white/5 group-hover:border-brand-200 transition-colors">
                      <span className="text-[10px] font-black text-brand-500">ROLL</span>
                    </div>
                    <span className="text-gray-600 font-bold text-sm dark:text-gray-300">
                      {sheet.reelId?.reelNo || 'N/A'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-5">
                  <div className="flex flex-col">
                    <span className="font-black text-gray-900 text-sm dark:text-white">
                      {sheet.totalWeightKg.toFixed(1)} <span className="text-[10px] text-gray-400">KG</span>
                    </span>
                    <div className="w-12 h-1 bg-gray-100 dark:bg-white/5 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-success-500 w-[70%]"></div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-5 text-center">
                  <Badge size="sm" color="info" className="font-black text-[9px] uppercase tracking-tighter px-3 py-1 rounded-lg border-none bg-info-50 text-info-700 dark:bg-info-500/10 dark:text-info-400 shadow-sm">
                    {sheet.quality}
                  </Badge>
                </TableCell>
                <TableCell className="py-5 pr-6 text-end rounded-r-[1.5rem]">
                  <div className="flex flex-col">
                    <span className="text-gray-900 font-extrabold text-sm dark:text-white">
                      {new Date(sheet.entryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                      {new Date(sheet.entryDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(!sheets || sheets.length === 0) && (
        <div className="py-20 text-center">
          <div className="inline-flex size-20 bg-gray-50 rounded-[2rem] items-center justify-center dark:bg-white/5 mb-4">
            <span className="text-3xl grayscale">📊</span>
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">Quiet in the Factory</h4>
          <p className="text-sm text-gray-400 font-medium">No cutting activities recorded in this shift yet.</p>
        </div>
      )}

      <div className="p-8 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-transparent">
        <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <span>Security: AES-256 Encrypted</span>
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-success-500 rounded-full animate-pulse"></div>
            Service Online
          </span>
        </div>
      </div>
    </div>
  );
}
