
import React, { useState, useRef, useEffect, SyntheticEvent } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { extractAttendanceFromFile } from '../services/geminiService';
import { getAllProfiles } from '../services/supabaseService';
import { Upload, Loader2, Check, X, FileText, AlertCircle, Save, AlertTriangle, Image as ImageIcon, Sparkles, Cpu, Calculator, Camera, UserCheck, Search, ChevronDown } from 'lucide-react';
import { AttendanceRecord, Operator } from '../types';
import { calculateDuration, formatMinutesToHHMM } from '../utils/timeUtils';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configuração do worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
  providerId: string;
  providerName: string;
  existingRecords?: string[];
  onExtracted: (records: AttendanceRecord[], evaluation?: any) => void;
  onCancel: () => void;
}

const processingMessages = [
  "Iniciando análise inteligente...",
  "Calibrando reconhecimento de caracteres...",
  "Identificando caligrafia manuscrita...",
  "Extraindo datas e horários...",
  "Calculando durações automaticamente...",
  "Validando integridade do documento...",
  "Finalizando processamento..."
];

interface SearchableOperatorSelectProps {
  value: string;
  onChange: (val: string) => void;
  systemOperators: Operator[];
  isUnselected: boolean;
}

const SearchableOperatorSelect: React.FC<SearchableOperatorSelectProps> = ({
  value,
  onChange,
  systemOperators,
  isUnselected
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const close = () => { setIsOpen(false); setSearch(''); };

  const openDropdown = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownH = Math.min(290, window.innerHeight * 0.45);
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < dropdownH + 12;
      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        ...(showAbove
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
        zIndex: 9999,
      });
    }
    setIsOpen(true);
  };

  const filteredOperators = systemOperators.filter(op => {
    if (!search.trim()) return true;
    const label = `${op.rank ? op.rank + ' ' : ''}${op.warName || op.name}`.toLowerCase();
    return label.includes(search.toLowerCase().trim());
  });

  return (
    <>
      {/* Backdrop invisível — fecha ao tocar fora, sem conflito com o botão */}
      {isOpen && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 9998 }}
          onClick={close}
        />
      )}

      <div className="relative w-full">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => isOpen ? close() : openDropdown()}
          className={`w-full px-3 py-2.5 rounded-xl text-xs font-black flex items-center justify-between transition-all cursor-pointer text-left ${
            isUnselected
              ? 'border-2 border-red-500 bg-red-50 text-red-900 shadow-sm'
              : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <span className="truncate">{value || '-- SELECIONE O RESPONSÁVEL --'}</span>
          <ChevronDown size={16} className={`shrink-0 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : isUnselected ? 'text-red-500' : 'text-slate-400'}`} />
        </button>

        {isOpen && (
          <div
            style={dropdownStyle}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Search bar */}
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Buscar militar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSearch(''); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto p-1.5 space-y-0.5" style={{ maxHeight: 220 }}>
              {filteredOperators.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs font-semibold">
                  Nenhum militar encontrado
                </div>
              ) : (
                filteredOperators.map(op => {
                  const label = `${op.rank ? op.rank + ' ' : ''}${op.warName || op.name}`.trim();
                  const isSelected = value === label;
                  return (
                    <button
                      key={op.id || label}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(label);
                        close();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-left font-bold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span className="font-extrabold tracking-wide">{label}</span>
                      {isSelected && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const AttendanceSheetOCR: React.FC<Props> = ({ providerId, providerName, existingRecords = [], onExtracted, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; type: string } | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<AttendanceRecord>[]>([]);
  const [extractedName, setExtractedName] = useState<string | null>(null);
  const [extractedEvaluation, setExtractedEvaluation] = useState<any | null>(null);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [msgIndex, setMsgIndex] = useState(0);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [systemOperators, setSystemOperators] = useState<Operator[]>([]);

  useEffect(() => {
    getAllProfiles()
      .then(ops => setSystemOperators(ops || []))
      .catch(err => console.error("Erro ao carregar operados para o OCR:", err));
  }, []);

  const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

  const matchOperator = (rawText: string, ops: Operator[]): string => {
    if (!rawText || !rawText.trim()) return '';
    const normRaw = normalize(rawText);
    // Conjunto de tokens da leitura OCR para comparação exata de palavras
    const tokenSet = new Set(normRaw.split(/\s+/).filter(w => w.length > 0));

    // 1. Match exato da string completa com "POSTO NOMEGUERRA"
    for (const op of ops) {
      const rankWar = normalize(`${op.rank || ''} ${op.warName || ''}`).trim();
      if (rankWar && rankWar === normRaw) {
        return `${op.rank ? op.rank + ' ' : ''}${op.warName}`.trim();
      }
    }

    // 2. Nome de guerra como token exato na leitura (sem substring)
    for (const op of ops) {
      const warName = normalize(op.warName || '');
      if (warName && warName.length > 2 && tokenSet.has(warName)) {
        return `${op.rank ? op.rank + ' ' : ''}${op.warName}`.trim();
      }
    }

    // 3. Nenhum match confirmado — retorna vazio, nunca inventa
    return '';
  };

  // Efeito para alternar mensagens de processamento
  useEffect(() => {
    let interval: number;
    if (loading) {
      interval = window.setInterval(() => {
        setMsgIndex((prev) => (prev + 1) % processingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);



  const optimizeImage = (base64Str: string, maxWidth = 4000, quality = 0.95): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const convertPdfToImage = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setConverting(true);
    setFileMeta({ name: file.name, type: 'image/jpeg' });
    try {
      let base64 = '';
      if (file.type === 'application/pdf') {
        base64 = await convertPdfToImage(file);
      } else {
        const rawBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        base64 = await optimizeImage(rawBase64);
      }
      setPreview(base64);
      // Reseta o crop state sempre que uma nova imagem é carregada
      setCrop(undefined);
      setCompletedCrop(null);
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      alert('Não foi possível processar este arquivo.');
    } finally {
      setConverting(false);
    }
  };

  const getCroppedImageBase64 = async (): Promise<string | null> => {
    if (!completedCrop || !imgRef.current || completedCrop.width === 0 || completedCrop.height === 0) {
      return preview;
    }

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return preview;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleProcess = async () => {
    if (!preview || !fileMeta) return;
    setLoading(true);
    setMsgIndex(0);
    try {
      const finalImageBase64 = await getCroppedImageBase64() || preview;
      const base64 = finalImageBase64.split(',')[1];
      const result = await extractAttendanceFromFile(base64, 'image/jpeg');
      const records = result.records.map((r: any) => {
        const matchedOp = matchOperator(r.responsibleName || '', systemOperators);
        return {
          id: Math.random().toString(36).substr(2, 9),
          providerId,
          date: r.date,
          entryTime: r.entryTime,
          exitTime: r.exitTime,
          responsibleOperator: matchedOp,
          durationMinutes: calculateDuration(r.entryTime, r.exitTime),
          attachmentData: finalImageBase64,
          attachmentType: 'image/jpeg'
        };
      });
      setExtractedName(result.extractedProviderName);
      setExtractedData(records);
      if (result.monthlyEvaluation) {
        setExtractedEvaluation(result.monthlyEvaluation);
      } else {
        setExtractedEvaluation(null);
      }
      setStep('review');
    } catch (error: any) {
      console.error('Erro na API do Gemini:', error);
      const errorMsg = error.message || 'Verifique a conexão ou a chave da API, e tente uma foto mais nítida.';
      alert(`Erro na leitura inteligente: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = (index: number, field: string, value: string) => {
    const updated = [...extractedData];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'entryTime' || field === 'exitTime') {
      const entry = field === 'entryTime' ? value : updated[index].entryTime!;
      const exit = field === 'exitTime' ? value : updated[index].exitTime!;
      updated[index].durationMinutes = calculateDuration(entry, exit);
    }
    setExtractedData(updated);
  };

  const removeRecord = (index: number) => {
    setExtractedData(extractedData.filter((_, i) => i !== index));
  };

  const isNameMismatched = extractedName && 
    !providerName.toLowerCase().split(' ').some(part => extractedName.toLowerCase().includes(part));

  const isIOS = typeof window !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);



  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[150] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .scan-line {
          position: absolute;
          width: 100%;
          height: 4px;
          background: linear-gradient(to bottom, transparent, #3b82f6, transparent);
          box-shadow: 0 0 15px 2px rgba(59, 130, 246, 0.7);
          z-index: 20;
          animation: scan 3s linear infinite;
        }
        .grid-overlay {
          background-size: 30px 30px;
          background-image: linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
        }
      `}</style>

      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto border border-white/20">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <FileText size={20} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800">
              {step === 'upload' ? 'Digitalizar Folha' : 'Conferência de Dados'}
            </h3>
          </div>
          <button onClick={() => { onCancel(); }} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 'upload' ? (
            <div className="space-y-6">
              {!preview && !converting ? (
                <div className="flex flex-col items-center text-center space-y-6 pt-4">
                  <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                    <Camera size={40} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Capturar Folha</h4>
                    <p className="text-slate-500 text-sm mt-2 font-medium">Posicione a folha de frequência em um local iluminado para facilitar a leitura inteligente.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row w-full gap-3 pt-4">
                    <label 
                      htmlFor="camera-input"
                      className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest cursor-pointer select-none text-center"
                    >
                      <Camera size={18} />
                      Tirar Foto
                    </label>
                    
                    <label 
                      htmlFor="gallery-input"
                      className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl shadow-sm hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest border border-slate-200 cursor-pointer select-none text-center"
                    >
                      <Upload size={18} />
                      Fazer Upload
                    </label>

                    <input 
                      id="camera-input" 
                      type="file" 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      capture={isIOS ? undefined : true} 
                      className="hidden" 
                    />
                    <input id="gallery-input" type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border bg-slate-50 flex items-center justify-center min-h-[350px]">
                    {converting ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                        <p className="font-bold text-slate-500">Otimizando imagem...</p>
                      </div>
                    ) : (
                      <>
                        <div className="absolute top-4 left-0 w-full text-center z-10 pointer-events-none">
                          <p className="inline-block bg-blue-900/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-pulse">
                            Ajuste as bordas da folha
                          </p>
                        </div>
                        <ReactCrop 
                          crop={crop} 
                          onChange={(c) => setCrop(c)} 
                          onComplete={(c) => setCompletedCrop(c)}
                          className="flex items-center justify-center bg-slate-100"
                        >
                          <img 
                            ref={imgRef}
                            src={preview!} 
                            alt="Preview" 
                            className={`max-h-[50vh] object-contain w-full transition-all duration-700 ${loading ? 'scale-[1.02] blur-[1px]' : ''}`} 
                            onLoad={(e: SyntheticEvent<HTMLImageElement>) => {
                              const { width, height } = e.currentTarget;
                              // Define um crop inicial deixando uma pequena margem
                              setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
                            }}
                          />
                        </ReactCrop>
                        {loading && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/40 grid-overlay">
                            <div className="scan-line"></div>
                            
                            <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/20 flex flex-col items-center max-w-[80%] text-center animate-in zoom-in-95 duration-300">
                              <div className="relative mb-6">
                                <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping"></div>
                                <div className="bg-blue-600 p-4 rounded-full text-white relative">
                                  <Sparkles size={32} className="animate-pulse" />
                                </div>
                              </div>
                              
                              <h4 className="text-blue-900 font-black uppercase tracking-widest text-sm mb-2">Processamento Inteligente</h4>
                              <div className="h-6 flex items-center justify-center">
                                <p className="text-slate-600 font-bold text-xs animate-in slide-in-from-bottom-2 fade-in">
                                  {processingMessages[msgIndex]}
                                </p>
                              </div>
                              
                              <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-6 overflow-hidden">
                                <div 
                                  className="h-full bg-blue-600 transition-all duration-1000 ease-out" 
                                  style={{ width: `${((msgIndex + 1) / processingMessages.length) * 100}%` }}
                                ></div>
                              </div>
                              <p className="text-[10px] text-slate-400 font-black uppercase mt-4 flex items-center gap-1">
                                <Cpu size={10} /> Motor de Leitura Inteligente
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {!loading && !converting && (
                    <div className="flex gap-3">
                      <button onClick={() => setPreview(null)} className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-100 rounded-2xl">Trocar</button>
                      <button onClick={handleProcess} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2">
                        <Sparkles size={20} />
                        Ler e Analisar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                {isNameMismatched ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 items-start">
                    <AlertTriangle className="text-red-600 shrink-0" size={24} />
                    <div>
                      <h4 className="font-black text-red-700 text-sm uppercase">Divergência de Identidade</h4>
                      <p className="text-xs text-red-600 leading-relaxed">
                        O nome detectado (<strong className="underline">{extractedName}</strong>) não parece ser o mesmo deste cadastro.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl text-xs font-medium border border-amber-100">
                    <AlertCircle size={16} />
                    <span>Verifique os dados extraídos e corrija se necessário.</span>
                  </div>
                )}

                {extractedEvaluation && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex gap-3 items-start animate-in fade-in duration-300">
                    <div className="bg-emerald-600 p-1.5 rounded-lg text-white shrink-0 shadow-sm">
                      <Check size={16} />
                    </div>
                    <div>
                      <h4 className="font-black text-emerald-700 text-sm uppercase">Avaliação Mensal Detectada</h4>
                      <p className="text-xs text-emerald-600 leading-relaxed">
                        A avaliação comportamental no rodapé foi identificada e será salva automaticamente com os registros.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-200">
                      <Calculator size={20} />
                    </div>
                    <span className="font-black text-blue-900 uppercase text-[10px] md:text-xs tracking-widest">Somatório da Folha:</span>
                  </div>
                  <span className="text-xl md:text-2xl font-black text-blue-700">
                    {formatMinutesToHHMM(extractedData.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0))}
                  </span>
                </div>
              </div>

              <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-2">
                {extractedData.map((record, idx) => {
                  const isDuplicate = existingRecords.some(key => {
                    const [d, ent, ext, t] = key.split('|');
                    if (d !== record.date) return false;
                    if (t === 'justification') return true;
                    return ent === record.entryTime && ext === record.exitTime;
                  });
                  
                  const isUnselected = !record.responsibleOperator;

                  return (
                    <div key={idx} className={`p-4 rounded-2xl border relative group transition-all ${isUnselected ? 'bg-red-50/40 border-red-200' : isDuplicate ? 'bg-amber-50/50 border-amber-200 opacity-80' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex flex-col gap-3 pr-8">
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Data</label>
                            {isDuplicate && (
                              <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">Já Registrado</span>
                            )}
                          </div>
                          <input type="date" value={record.date} onChange={(e) => handleUpdateField(idx, 'date', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm" />
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Entrada</label>
                            <input type="time" value={record.entryTime} onChange={(e) => handleUpdateField(idx, 'entryTime', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm" />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Saída</label>
                            <input type="time" value={record.exitTime} onChange={(e) => handleUpdateField(idx, 'exitTime', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm" />
                          </div>
                        </div>

                        <div className="w-full pt-1 border-t border-slate-200/60">
                          <div className="flex items-center justify-between mb-1">
                            <label className={`text-[10px] font-black uppercase flex items-center gap-1 ${isUnselected ? 'text-red-700' : 'text-slate-500'}`}>
                              <UserCheck size={12} className={isUnselected ? 'text-red-600' : 'text-blue-600'} />
                              <span>Militar Responsável (Folha)</span>
                            </label>
                            {isUnselected ? (
                              <span className="text-[8px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-200 uppercase tracking-tighter animate-pulse">Selecione o Responsável *</span>
                            ) : (
                              <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">Identificado</span>
                            )}
                          </div>
                          <SearchableOperatorSelect
                            value={record.responsibleOperator || ''}
                            onChange={(val) => handleUpdateField(idx, 'responsibleOperator', val)}
                            systemOperators={systemOperators}
                            isUnselected={isUnselected}
                          />
                        </div>
                      </div>
                      <button onClick={() => removeRecord(idx)} className="absolute top-4 right-2 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><X size={18} /></button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button onClick={() => setStep('upload')} className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl">Voltar</button>
                <button 
                  onClick={() => {
                    const unselectedCount = extractedData.filter(r => !r.responsibleOperator).length;
                    if (unselectedCount > 0) {
                      alert(`Atenção: Selecione o militar responsável nas ${unselectedCount} linha(s) destacada(s) em vermelho antes de confirmar.`);
                      return;
                    }
                    onExtracted(extractedData as AttendanceRecord[], extractedEvaluation);
                  }} 
                  className={`flex-1 py-4 px-2 text-[11px] sm:text-base text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-1 sm:gap-2 transition-all ${isNameMismatched ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  <Save size={18} className="shrink-0" />
                  Confirmar Registros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceSheetOCR;
