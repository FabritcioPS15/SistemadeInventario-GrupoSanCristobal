import { RiFileExcel2Fill } from 'react-icons/ri';
import { FaFilePdf } from 'react-icons/fa6';

interface ExportButtonsProps {
  onExportExcel: () => void;
  onExportPDF: () => void;
  className?: string;
}

export default function ExportButtons({ onExportExcel, onExportPDF, className = '' }: ExportButtonsProps) {
  return (
    <div className={`flex gap-1 w-full md:w-auto ${className}`}>
      <button
        type="button"
        onClick={onExportExcel}
        title="Exportar a Excel"
        className="flex-1 md:flex-none group flex items-center justify-center h-10 px-4 bg-white text-slate-400 border border-slate-200 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
      >
        <RiFileExcel2Fill size={20} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
      </button>
      <button
        type="button"
        onClick={onExportPDF}
        title="Exportar a PDF"
        className="flex-1 md:flex-none group flex items-center justify-center h-10 px-4 bg-white text-slate-400 border border-slate-200 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
      >
        <FaFilePdf size={20} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
      </button>
    </div>
  );
}
