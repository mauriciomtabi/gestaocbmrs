import React, { useState } from 'react';
import { Provider } from '../types';
import { ArrowLeft, FileDown, Printer } from 'lucide-react';

interface Props {
  provider: Provider;
  onClose: () => void;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const BlankAttendanceSheet: React.FC<Props> = ({ provider, onClose }) => {
  const currentDate = new Date();
  const [targetMonth, setTargetMonth] = useState(months[currentDate.getMonth()]);
  const [targetYear, setTargetYear] = useState(currentDate.getFullYear().toString());

  const handleGeneratePDF = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { size: A4 portrait; margin: 0; }
        body, html, #root, main { 
          background-color: white !important; 
          margin: 0 !important; 
          padding: 0 !important;
          height: auto !important;
          overflow: visible !important;
          border: none !important;
        }
        nav { display: none !important; }
        .no-print { display: none !important; }
        ::-webkit-scrollbar { display: none !important; }
        * { 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact; 
          box-shadow: none !important; 
        }
        div, main { overflow: visible !important; height: auto !important; }
      }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
      window.print();
      setTimeout(() => document.head.removeChild(style), 1000);
    }, 100);
  };

  // 15 linhas em branco para preenchimento
  const emptyRows = Array.from({ length: 15 });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 overflow-y-auto">
      {/* Barra de Ações Fixa no Topo (no-print) */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 bg-white"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Gerar Folha de Frequência</h1>
            <p className="text-slate-500 text-xs font-bold">Preview do documento para impressão/PDF.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
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
            onClick={handleGeneratePDF}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md font-black text-sm"
          >
            <Printer size={18} />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Papel A4 Oficial */}
      <div className="w-full py-8 md:py-12 overflow-visible print:p-0 print:py-0 print:border-none print:shadow-none print:bg-white flex-1 flex justify-center items-start">
        <div 
          id="blank-sheet-content" 
          className="bg-white min-w-[21cm] max-w-[21cm] p-[1.5cm] md:p-[2cm] shadow-xl border border-slate-200 print:border-none print:shadow-none print:m-0 print:p-[1.5cm] print:max-w-none print:w-full"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', color: '#000' }}
        >
          {/* Cabeçalho */}
          <div className="flex items-center gap-4 mb-6 outline-none" contentEditable suppressContentEditableWarning>
            <img 
              src="/brasao.png" 
              alt="Brasão" 
              style={{ width: '65px', height: 'auto', display: 'block' }}
            />
            <div className="leading-tight">
              <div style={{ fontSize: '9pt' }}>ESTADO DO RIO GRANDE DO SUL</div>
              <div className="font-bold" style={{ fontSize: '12pt' }}>PODER JUDICIÁRIO</div>
            </div>
          </div>

          <div className="mb-4 leading-tight outline-none" contentEditable suppressContentEditableWarning>
            <div>Comarca de Sapucaia do Sul – Vara de Execução Criminais</div>
            <div>Programa Prestação de Serviços à Comunidade (PSC)</div>
          </div>

          {/* Tabela Principal */}
          <table className="w-full border-collapse mb-8" style={{ border: '1px solid black' }}>
            <tbody>
              {/* Título */}
              <tr>
                <td colSpan={5} className="font-bold text-center uppercase py-2" style={{ border: '1px solid black', fontSize: '12pt' }}>
                  FOLHA DE FREQUÊNCIA
                </td>
              </tr>
              
              {/* Informações 1 */}
              <tr>
                <td colSpan={2} className="py-1.5 px-2" style={{ border: '1px solid black', width: '50%' }}>
                  <span className="font-bold">Processo nº:</span> <span className="outline-none" contentEditable suppressContentEditableWarning>{provider.processNumber || '____________________'}</span>
                </td>
                <td colSpan={3} className="py-1.5 px-2" style={{ border: '1px solid black', width: '50%' }}>
                  <span className="font-bold">Mês de cumprimento:</span> <span className="outline-none bg-yellow-200/50 print:bg-transparent" contentEditable suppressContentEditableWarning>{targetMonth} / {targetYear}</span>
                </td>
              </tr>
              
              {/* Nome */}
              <tr>
                <td colSpan={5} className="py-1.5 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">Nome do Prestador:</span> <span className="outline-none bg-yellow-200/50 print:bg-transparent" contentEditable suppressContentEditableWarning>{provider.name}</span>
                </td>
              </tr>
              
              {/* Telefone */}
              <tr>
                <td colSpan={5} className="py-1.5 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">Telefone:</span> <span className="outline-none" contentEditable suppressContentEditableWarning>{provider.phone || '____________________'}</span>
                </td>
              </tr>
              
              {/* Endereço */}
              <tr>
                <td colSpan={5} className="py-1.5 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">Endereço:</span> <span className="outline-none" contentEditable suppressContentEditableWarning>{provider.address || '____________________'}</span>
                </td>
              </tr>
              
              {/* Entidade */}
              <tr>
                <td colSpan={5} className="py-1.5 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">Entidade Conveniada:</span> <span className="outline-none" contentEditable suppressContentEditableWarning>Corpo de Bombeiros Militar de Sapucaia do Sul</span>
                </td>
              </tr>
              
              {/* E-mail */}
              <tr>
                <td colSpan={5} className="py-1.5 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">E-mail Entidade Conveniada:</span> <span className="outline-none" contentEditable suppressContentEditableWarning>sapucaiadosul@cbm.rs.gov.br</span>
                </td>
              </tr>

              {/* Cabeçalho da Grade */}
              <tr className="font-bold text-center">
                <td className="py-2 w-[12%]" style={{ border: '1px solid black' }}>Data</td>
                <td className="py-2 w-[14%]" style={{ border: '1px solid black' }}>Chegada</td>
                <td className="py-2 w-[14%]" style={{ border: '1px solid black' }}>Saída</td>
                <td className="py-2 w-[30%]" style={{ border: '1px solid black' }}>Assinatura do prestador</td>
                <td className="py-2 w-[30%]" style={{ border: '1px solid black' }}>
                  <div className="flex flex-col items-center justify-center leading-tight">
                    <span>Assinatura do</span>
                    <span>responsável</span>
                  </div>
                </td>
              </tr>

              {/* Linhas Vazias */}
              {emptyRows.map((_, idx) => (
                <tr key={idx} style={{ height: '26px' }}>
                  <td style={{ border: '1px solid black' }}></td>
                  <td style={{ border: '1px solid black' }}></td>
                  <td style={{ border: '1px solid black' }}></td>
                  <td style={{ border: '1px solid black' }}></td>
                  <td style={{ border: '1px solid black' }}></td>
                </tr>
              ))}
              
              {/* Total Horas */}
              <tr>
                <td colSpan={5} className="py-2 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">Total de horas:</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Questionário Rodapé */}
          <div className="space-y-4" style={{ fontSize: '11pt' }}>
            <div className="flex flex-col">
              <span>Faltas no período?</span>
              <span>Sim ( &nbsp; ) &nbsp;&nbsp; Não ( &nbsp; )</span>
            </div>

            <div className="flex flex-col">
              <span>Apresentou bom comportamento?</span>
              <span>Sim ( &nbsp; ) &nbsp;&nbsp; Não ( &nbsp; )</span>
            </div>

            <div className="flex flex-col">
              <span>Cometeu atos indisciplinares?</span>
              <span>Sim ( &nbsp; ) &nbsp;&nbsp; Não ( &nbsp; )</span>
            </div>

            <div className="flex flex-col">
              <span>A qualidade do serviço prestado foi satisfatória?</span>
              <span>Sim ( &nbsp; ) &nbsp;&nbsp; Não ( &nbsp; )</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BlankAttendanceSheet;
