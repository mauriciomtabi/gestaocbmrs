import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Provider } from '../types';
import { AttendanceSheetPrint } from './BlankAttendanceSheet';
import { ArrowLeft, Printer, FileText } from 'lucide-react';

interface BatchBlankAttendanceSheetProps {
  providers: Provider[];
  initialMonth: string;
  initialYear: string;
  onClose: () => void;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const BatchBlankAttendanceSheet: React.FC<BatchBlankAttendanceSheetProps> = ({
  providers,
  initialMonth,
  initialYear,
  onClose
}) => {
  const [targetMonth, setTargetMonth] = useState<string>(initialMonth || 'Agosto');
  const [targetYear, setTargetYear] = useState<string>(initialYear || String(new Date().getFullYear()));

  const handlePrint = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0;
        }
        .no-print { display: none !important; }
        ::-webkit-scrollbar { display: none !important; }
        * { 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact; 
          box-shadow: none !important; 
        }
        body > *:not(.batch-print-wrapper) {
          display: none !important;
        }
        .batch-print-wrapper {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          display: block !important;
        }
        .print-page {
          margin: 0 !important;
          padding: 0.7cm 1.5cm 1.5cm 1.5cm !important;
          border: none !important;
          width: 210mm !important;
          height: 297mm !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .print-page-break {
          page-break-before: always !important;
          break-before: page !important;
        }
        body, html, #temp-print-container, .print-page, table, tr, td, th, div, span, p, a {
          font-family: Arial, sans-serif !important;
        }
        .judiciario-logo-text, .judiciario-logo-text * {
          font-family: 'Times New Roman', Times, serif !important;
        }
        div, main { overflow: visible !important; height: auto !important; }
        table.frequency-table { border-collapse: collapse; width: 100%; }
        table.frequency-table th, table.frequency-table td { border: 1px solid black; padding: 4px 6px; }
        table.frequency-table td.process-td { padding: 0 !important; }
      }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
      window.print();
      setTimeout(() => document.head.removeChild(style), 1000);
    }, 100);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 md:p-8 overflow-y-auto batch-print-wrapper print:bg-white print:p-0">
      <div className="bg-slate-100 rounded-[2rem] overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col relative my-auto print:rounded-none print:shadow-none print:max-w-none">
        
        {/* Barra de Ações Fixa no Topo (no-print) */}
        <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 bg-white"
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="text-blue-600" size={22} />
                Impressão em Lote ({providers.length} Prestadores)
              </h1>
              <p className="text-slate-500 text-xs font-bold">Folhas de Frequência em Branco para os prestadores selecionados.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 pl-1">Período:</span>
              <select 
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className="text-slate-400 font-bold">/</span>
              <input 
                type="number" 
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 w-24 text-center"
              />
            </div>
            
            <button 
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md font-black text-sm active:scale-95"
            >
              <Printer size={18} />
              Imprimir Lote ({providers.length})
            </button>
          </div>
        </div>

        {/* Lista de Papéis A4 Oficiais para Renderização e Impressão */}
        <div className="w-full py-8 overflow-visible print:p-0 print:py-0 print:border-none print:shadow-none print:bg-white flex flex-col items-center gap-8 bg-slate-100 print:gap-0">
          {providers.map((p, index) => (
            <div 
              key={p.id}
              className={`bg-white min-w-[21cm] max-w-[21cm] pt-[0.7cm] pb-[1.5cm] px-[1.5cm] md:pt-[0.7cm] md:pb-[2cm] md:px-[2cm] shadow-xl border border-slate-200 print-page ${index > 0 ? 'print-page-break' : ''} print:border-none print:shadow-none print:m-0 print:pt-[0.7cm] print:pb-[1.5cm] print:px-[1.5cm] print:max-w-none print:w-full`}
              style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', color: '#000' }}
            >
              <AttendanceSheetPrint 
                provider={p}
                records={[]}
                month={targetMonth}
                year={targetYear}
                evaluation={null}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default BatchBlankAttendanceSheet;
