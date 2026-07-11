import React, { useState, useEffect } from 'react';
import { getPublicAttendanceRecord, getPublicAttendanceForMonth } from '../services/supabaseService';
import { Clock, MapPin, ScanFace, FileText, AlertCircle, Loader2, Download, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';
import GeoMapViewer from './GeoMapViewer';
import * as XLSX from 'xlsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Utilitário para download do Excel
export const downloadProviderExcel = async (providerId: string, providerName: string, year: string, month: string) => {
  const { records } = await getPublicAttendanceForMonth(providerId, year, month);
  
  const sheetData = records.map(r => {
    let entryOp = '';
    let exitOp = '';
    if (r.reason) {
      try {
        const parsed = JSON.parse(r.reason);
        entryOp = parsed.entryOperator || '';
        exitOp = parsed.exitOperator || '';
      } catch (e) {}
    }
    
    const isJustification = r.type === 'justification';
    const duration = r.durationMinutes ? `${Math.floor(r.durationMinutes / 60)}h ${String(r.durationMinutes % 60).padStart(2, '0')}m` : '0h 00m';
    
    return {
      "Data": r.date.split('-').reverse().join('/'),
      "Entrada": isJustification ? 'JUSTIFICADO' : (r.entryTime || '--:--'),
      "Saída": isJustification ? 'JUSTIFICADO' : (r.exitTime || '--:--'),
      "Duração": isJustification ? '—' : duration,
      "Tipo": isJustification ? 'Falta Justificada' : 'Presença',
      "Justificativa / Observação": isJustification ? (r.reason || '') : '',
      "Militar Responsável (Entrada)": entryOp || 'CB COBOM',
      "Militar Responsável (Saída)": exitOp || 'CB COBOM'
    };
  });

  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Frequência");

  ws['!cols'] = [
    { wch: 12 }, // Data
    { wch: 12 }, // Entrada
    { wch: 12 }, // Saída
    { wch: 10 }, // Duração
    { wch: 18 }, // Tipo
    { wch: 35 }, // Justificativa / Obs
    { wch: 28 }, // Militar Entrada
    { wch: 28 }  // Militar Saída
  ];

  const safeName = providerName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `auditoria_frequencia_${safeName}_${month}_${year}.xlsx`);
};

interface PublicAuditViewProps {
  recordId: string;
  onGoHome: () => void;
}

export const PublicAuditView: React.FC<PublicAuditViewProps> = ({ recordId, onGoHome }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getPublicAttendanceRecord(recordId);
        setData(res);
      } catch (err: any) {
        console.error(err);
        setError("Não foi possível carregar o registro de auditoria. Verifique a URL ou tente novamente.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [recordId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
        <p className="text-sm font-extrabold uppercase tracking-widest text-slate-400">Carregando registro de auditoria...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h3 className="text-xl font-black uppercase mb-2">Erro de Acesso</h3>
        <p className="text-slate-400 text-sm max-w-md mb-6">{error || 'Registro inválido.'}</p>
        <button onClick={onGoHome} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 text-xs uppercase tracking-wider">
          Ir para Página Inicial
        </button>
      </div>
    );
  }

  const { record, provider, evaluation } = data;
  const isJustification = record.type === 'justification';
  const isFace = record.id && record.id.startsWith('face-');

  let reasonObj: any = {};
  if (record.reason) {
    try {
      reasonObj = JSON.parse(record.reason);
    } catch (e) {
      reasonObj = { rawText: record.reason };
    }
  }

  const entryOp = reasonObj.entryOperator || (isFace ? 'CB COBOM' : (evaluation?.evaluatedBy || '1º SGT GONCZOROSKI'));
  const exitOp = reasonObj.exitOperator || (isFace ? 'CB COBOM' : (evaluation?.evaluatedBy || '1º SGT GONCZOROSKI'));

  let entryLoc = reasonObj.entry;
  let exitLoc = reasonObj.exit;
  let perimeter = reasonObj.perimeter;

  if (!entryLoc && !exitLoc && record.reason) {
    const m = record.reason.match(/lat=([-\d.]+).*lng=([-\d.]+)/);
    if (m) {
      entryLoc = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    }
  }

  const methodLabel = isJustification
    ? 'Falta Justificada'
    : isFace
    ? 'Biometria Facial Autenticada'
    : reasonObj.ocr
    ? 'Digitalização OCR'
    : 'Homologação Manual';

  const methodColor = isJustification
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : isFace
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : 'text-blue-600 bg-blue-50 border-blue-200';

  const dateParts = record.date.split('-');
  const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 md:px-8 text-slate-800 flex flex-col justify-between font-sans">
      <div className="max-w-4xl w-full mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl border ${methodColor} shrink-0`}>
              {isJustification && <FileText size={24} />}
              {!isJustification && isFace && <ScanFace size={24} />}
              {!isJustification && !isFace && <CheckCircle2 size={24} />}
            </div>
            <div className="text-left">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Registro de Auditoria Pública</span>
              <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">
                {methodLabel}
              </h3>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => downloadProviderExcel(provider.id, provider.name, dateParts[0], dateParts[1])}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-200/50"
            >
              <Download size={16} />
              Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 flex-1">
          {/* Top Panel - Provider Info */}
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl flex flex-col sm:flex-row justify-between gap-6">
            <div className="text-left">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Prestador</span>
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{provider.name}</h4>
              <p className="text-xs text-slate-500 font-semibold">Processo: {provider.processNumber || 'Sem número'}</p>
            </div>
            <div className="sm:text-right text-left">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Data da Presença</span>
              <h4 className="text-lg font-black text-slate-900 tracking-tight">{formattedDate}</h4>
              <p className="text-xs text-slate-500 font-semibold">Status: <span className="text-emerald-600 font-black uppercase">Ativo</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Side: Photo & Information */}
            <div className="space-y-6">
              {/* Times and Operators */}
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl space-y-4">
                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5 text-left">
                  <Clock size={14} />
                  Horários e Militares Responsáveis
                </h5>

                {isJustification ? (
                  <div className="text-xs font-bold text-slate-700 bg-amber-50/50 p-4 border border-amber-100 rounded-2xl text-left">
                    <span className="text-amber-800 block mb-1.5 uppercase text-[9px] font-black tracking-wider">Justificativa Anexada</span>
                    {reasonObj.rawText || 'Sem justificativa informada'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Entrada */}
                    <div className="p-4 bg-white border border-slate-200/60 rounded-2xl relative overflow-hidden text-left">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Entrada</span>
                      <span className="text-2xl font-black text-slate-800 block my-1">
                        {record.entryTime || '--:--'}
                      </span>
                      <span className="text-[8px] font-black uppercase text-slate-500 block truncate" title={entryOp}>
                        Por: {entryOp}
                      </span>
                    </div>

                    {/* Saída */}
                    <div className="p-4 bg-white border border-slate-200/60 rounded-2xl relative overflow-hidden text-left">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500" />
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Saída</span>
                      <span className="text-2xl font-black text-slate-800 block my-1">
                        {record.exitTime || '--:--'}
                      </span>
                      <span className="text-[8px] font-black uppercase text-slate-500 block truncate" title={exitOp}>
                        Por: {exitOp}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Proof */}
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl flex flex-col">
                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5 mb-3 text-left">
                  <ScanFace size={14} />
                  Comprovante Fotográfico
                </h5>
                {record.attachmentData ? (
                  <div 
                    onClick={() => setIsPhotoExpanded(true)}
                    className="relative rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center cursor-zoom-in group/photo hover:opacity-95 transition-all max-h-[260px] bg-slate-100"
                  >
                    <img
                      src={record.attachmentData}
                      alt="Comprovante"
                      className="max-h-[250px] w-auto object-contain"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase tracking-wider border border-white/10 flex items-center gap-2">
                        <ExternalLink size={14} />
                        Ampliar Comprovante
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-center gap-2 text-slate-400">
                    <AlertCircle size={24} className="text-slate-300" />
                    <div className="text-[10px] font-black uppercase tracking-wider">Sem Comprovante Biométrico</div>
                    <div className="text-[9px] font-bold text-slate-400/80 leading-tight">Este registro foi homologado manualmente pelo militar responsável, dispensando foto facial.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Map & Geolocations */}
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl h-full flex flex-col min-h-[350px]">
                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5 mb-3 shrink-0 text-left">
                  <MapPin size={14} />
                  Rastreabilidade Geográfica (GPS)
                </h5>

                {((entryLoc && entryLoc.lat) || (exitLoc && exitLoc.lat)) ? (
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="rounded-2xl overflow-hidden border border-slate-200 flex-1 min-h-[200px]">
                      <GeoMapViewer entry={entryLoc} exit={exitLoc} perimeter={perimeter} height={200} />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2.5 text-[9px] font-bold text-slate-600 bg-white p-4 border border-slate-200/60 rounded-2xl text-left">
                      {entryLoc && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow inline-block" />
                            GPS Entrada:
                          </span>
                          <span className="font-mono text-slate-500">{entryLoc.lat.toFixed(5)}, {entryLoc.lng.toFixed(5)}</span>
                          {entryLoc.isOutside !== undefined && (
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${entryLoc.isOutside ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                              {entryLoc.isOutside ? 'Fora' : 'Dentro'}
                            </span>
                          )}
                        </div>
                      )}

                      {exitLoc && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow inline-block" />
                            GPS Saída:
                          </span>
                          <span className="font-mono text-slate-500">{exitLoc.lat.toFixed(5)}, {exitLoc.lng.toFixed(5)}</span>
                          {exitLoc.isOutside !== undefined && (
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${exitLoc.isOutside ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                              {exitLoc.isOutside ? 'Fora' : 'Dentro'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-center gap-2 text-slate-400">
                    <MapPin size={28} className="text-slate-300" />
                    <div className="text-[10px] font-black uppercase tracking-wider">Sem Dados de Localização</div>
                    <div className="text-[9px] font-bold text-slate-400/80 leading-tight">Este registro não possui dados de latitude e longitude associados (Lançamento manual / digitalização de folha).</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Corpo de Bombeiros Militar de Sapucaia do Sul — Vara de Execução Criminais
        </div>
      </div>

      {/* Photo Modal */}
      {isPhotoExpanded && record.attachmentData && (
        <div 
          onClick={() => setIsPhotoExpanded(false)}
          className="fixed inset-0 bg-slate-950/90 z-[200] flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img 
            src={record.attachmentData} 
            alt="Expanded Proof" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

interface PublicExportViewProps {
  providerId: string;
  year: string;
  month: string;
  onGoHome: () => void;
}

export const PublicExportView: React.FC<PublicExportViewProps> = ({ providerId, year, month, onGoHome }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runExport = async () => {
      try {
        setLoading(true);
        const { provider } = await getPublicAttendanceForMonth(providerId, year, month);
        await downloadProviderExcel(providerId, provider.name, year, month);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError("Não foi possível gerar a planilha Excel. Verifique os dados ou tente novamente.");
        setLoading(false);
      }
    };
    runExport();
  }, [providerId, year, month]);

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="max-w-md w-full bg-white text-slate-800 p-8 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col items-center gap-6">
        {loading ? (
          <>
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Exportando Planilha...</h3>
              <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">Aguarde a geração do arquivo Excel</p>
            </div>
          </>
        ) : error ? (
          <>
            <AlertCircle className="text-red-500" size={48} />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Erro na Exportação</h3>
              <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">{error}</p>
            </div>
            <button onClick={onGoHome} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 text-xs uppercase tracking-wider">
              Ir para Página Inicial
            </button>
          </>
        ) : (
          <>
            <CheckCircle2 className="text-emerald-500" size={48} />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Download Concluído!</h3>
              <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">O arquivo Excel foi baixado com sucesso.</p>
            </div>
            <button onClick={onGoHome} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 text-xs uppercase tracking-wider">
              Voltar ao Início
            </button>
          </>
        )}
      </div>
    </div>
  );
};

interface PublicProviderAuditViewProps {
  providerId: string;
  year: string;
  month: string;
  onGoHome: () => void;
}

export const PublicProviderAuditView: React.FC<PublicProviderAuditViewProps> = ({
  providerId,
  year,
  month,
  onGoHome
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getPublicAttendanceForMonth(providerId, year, month);
        setData(res);
      } catch (err: any) {
        console.error(err);
        setError("Não foi possível carregar o histórico de auditoria deste prestador.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [providerId, year, month]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
        <p className="text-sm font-extrabold uppercase tracking-widest text-slate-400">Carregando histórico de auditoria...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h3 className="text-xl font-black uppercase mb-2">Erro de Acesso</h3>
        <p className="text-slate-400 text-sm max-w-md mb-6">{error || 'Não foi possível carregar os dados.'}</p>
        <button onClick={onGoHome} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 text-xs uppercase tracking-wider">
          Ir para Página Inicial
        </button>
      </div>
    );
  }

  const { provider, records, allRecords, evaluation } = data;

  const monthsBr = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthName = monthsBr[parseInt(month) - 1] || month;

  // Calculo de horas
  const totalMins = records.reduce((sum: number, r: any) => sum + (r.durationMinutes || 0), 0);
  const formattedTotalHours = `${Math.floor(totalMins / 60)}h ${String(totalMins % 60).padStart(2, '0')}m`;

  const chartData = React.useMemo(() => {
    if (!data || !allRecords) return [];
    const months = [];
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    const monthsBrShort = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    for (let i = 5; i >= 0; i--) {
      let m = targetMonth - i;
      let y = targetYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      months.push({
        year: y,
        month: m,
        monthStr: String(m).padStart(2, '0'),
        label: `${monthsBrShort[m - 1]} / ${String(y).slice(-2)}`,
        fullName: `${monthsBr[m - 1]} de ${y}`
      });
    }

    return months.map(m => {
      const monthMins = (allRecords || []).reduce((sum: number, r: any) => {
        const parts = r.date.split('-');
        const isMatch = parseInt(parts[0]) === m.year && parseInt(parts[1]) === m.month;
        return isMatch ? sum + (r.durationMinutes || 0) : sum;
      }, 0);
      return {
        label: m.label,
        fullName: m.fullName,
        hours: parseFloat((monthMins / 60).toFixed(1))
      };
    });
  }, [allRecords, year, month]);

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 md:px-8 text-slate-800 flex flex-col justify-between font-sans">
      <div className="max-w-4xl w-full mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
          <div className="text-left">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Painel de Auditoria Pública</span>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Linha do Tempo de Presenças
            </h3>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => downloadProviderExcel(provider.id, provider.name, year, month)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-200/50"
            >
              <Download size={16} />
              Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 flex-1">
          {/* Card Resumo do Prestador */}
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-left">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Prestador</span>
              <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">{provider.name}</h4>
              <p className="text-xs text-slate-500 font-semibold">Processo: {provider.processNumber || 'Sem número'}</p>
            </div>
            <div className="text-left">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Período</span>
              <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">{monthName} / {year}</h4>
              <p className="text-xs text-slate-500 font-semibold">Total de Horas: <span className="text-blue-600 font-black">{formattedTotalHours}</span></p>
            </div>
            <div className="text-left">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Avaliação Mensal</span>
              {evaluation ? (
                <div>
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight mt-0.5">
                    ✓ Homologada
                  </span>
                  <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-tight">Avaliado por: {evaluation.evaluatedBy}</p>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight mt-0.5">
                  ⚠️ Pendente
                </span>
              )}
            </div>
          </div>

          {/* Gráfico da Linha do Tempo dos Últimos 6 Meses */}
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl space-y-4">
            <div className="text-left">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Histórico de Engajamento</span>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Total de Horas Cumpridas (Últimos 6 Meses)</h4>
            </div>
            
            <div className="h-[200px] w-full font-sans">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    unit="h"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontFamily: 'sans-serif',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                    }} 
                    formatter={(value: any) => [`${value} horas`, 'Horas Cumpridas']}
                    labelFormatter={(label, items) => {
                      const item = items && items[0] ? items[0].payload : null;
                      return `Período: ${item ? item.fullName : label}`;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorHours)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Timeline de Registros */}
          <div className="space-y-6 text-left">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Linha do Tempo ({records.length} Dias)</h3>
            {records.length === 0 ? (
              <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                Nenhum registro encontrado para este período.
              </div>
            ) : (
              <div className="space-y-6">
                {records.map((r: any) => {
                  const isJust = r.type === 'justification';
                  const isFace = r.id && r.id.startsWith('face-');
                  
                  let reasonObj: any = {};
                  if (r.reason) {
                    try {
                      reasonObj = JSON.parse(r.reason);
                    } catch (e) {
                      reasonObj = { rawText: r.reason };
                    }
                  }

                  const entryOp = reasonObj.entryOperator || (isFace ? 'CB COBOM' : (evaluation?.evaluatedBy || '1º SGT GONCZOROSKI'));
                  const exitOp = reasonObj.exitOperator || (isFace ? 'CB COBOM' : (evaluation?.evaluatedBy || '1º SGT GONCZOROSKI'));

                  let entryLoc = reasonObj.entry;
                  let exitLoc = reasonObj.exit;
                  let perimeter = reasonObj.perimeter;

                  if (!entryLoc && !exitLoc && r.reason) {
                    const m = r.reason.match(/lat=([-\d.]+).*lng=([-\d.]+)/);
                    if (m) {
                      entryLoc = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
                    }
                  }

                  return (
                    <div key={r.id} className="border border-slate-100 rounded-3xl p-6 hover:shadow-lg transition-all bg-white relative flex flex-col md:flex-row justify-between gap-6">
                      {/* Left: Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-900">{r.date.split('-').reverse().join('/')}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            isJust ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            isFace ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {isJust ? 'Falta Justificada' : isFace ? 'Check-in Facial' : 'Homologação'}
                          </span>
                        </div>

                        {isJust ? (
                          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                            <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Motivo da Justificativa</span>
                            <p className="text-xs text-slate-700 font-bold uppercase tracking-tight">{r.reason || 'Documento Anexado'}</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Entrada */}
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-1">
                              <span className="text-[8px] font-black uppercase text-slate-400 block">Entrada</span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-base font-black text-slate-800">{r.entryTime || '--:--'}</span>
                                <span className="text-[9px] text-slate-500 font-bold uppercase truncate">Resp: {entryOp}</span>
                              </div>
                              {r.attachmentData && (
                                <button 
                                  onClick={() => setExpandedPhoto(r.attachmentData)}
                                  className="mt-1 text-[8px] font-black text-blue-600 hover:underline uppercase tracking-wide flex items-center gap-0.5"
                                >
                                  📷 Ver Foto Entrada
                                </button>
                              )}
                            </div>

                            {/* Saída */}
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-1">
                              <span className="text-[8px] font-black uppercase text-slate-400 block">Saída</span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-base font-black text-slate-800">{r.exitTime || '--:--'}</span>
                                <span className="text-[9px] text-slate-500 font-bold uppercase truncate">Resp: {exitOp}</span>
                              </div>
                              {r.exitAttachmentData && (
                                <button 
                                  onClick={() => setExpandedPhoto(r.exitAttachmentData)}
                                  className="mt-1 text-[8px] font-black text-blue-600 hover:underline uppercase tracking-wide flex items-center gap-0.5"
                                >
                                  📷 Ver Foto Saída
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Map coordinates (if exist) */}
                      {!isJust && perimeter && (entryLoc || exitLoc) && (
                        <div className="w-full md:w-[260px] h-[150px] shrink-0 rounded-2xl overflow-hidden border border-slate-100 relative">
                          <GeoMapViewer 
                            perimeterCenter={perimeter.center}
                            perimeterRadius={perimeter.radius}
                            entryCoords={entryLoc}
                            exitCoords={exitLoc}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Corpo de Bombeiros Militar de Sapucaia do Sul — Vara de Execução Criminais
        </div>
      </div>

      {/* Expanded Photo Modal */}
      {expandedPhoto && (
        <div 
          onClick={() => setExpandedPhoto(null)}
          className="fixed inset-0 bg-slate-950/90 z-[200] flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img 
            src={expandedPhoto} 
            alt="Foto de Auditoria Expandida" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
