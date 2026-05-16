import React, { useState, useRef, useEffect, SyntheticEvent } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Camera, Upload, Loader2, CheckCircle2, AlertCircle, FileText, Smartphone, Sparkles, Cpu, Receipt, ArrowRight, SkipForward } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { FuelSupply } from '../types';

interface Props {
  onExtracted: (supply: FuelSupply) => void;
  onCancel: () => void;
}

type CaptureStep = 'select' | 'capture' | 'review' | 'processing';
type DocType = 'nf' | 'ticket';

const FuelReceiptOCR: React.FC<Props> = ({ onExtracted, onCancel }) => {
  const [step, setStep] = useState<CaptureStep>('select');
  const [currentDocType, setCurrentDocType] = useState<DocType | null>(null);
  
  // Imagens capturadas (cropped base64)
  const [images, setImages] = useState<{ nf: string | null, ticket: string | null }>({ nf: null, ticket: null });
  
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      setShowWebcam(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (err) {
      console.error(err);
      setError("Erro ao acessar a câmera. Verifique as permissões.");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowWebcam(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        // MUDANÇA: Aumentada qualidade da compressão para 1.0 (máxima)
        setPreview(canvas.toDataURL('image/jpeg', 1.0));
        setCrop(undefined);
        setCompletedCrop(null);
        stopWebcam();
        setError(null);
        setStep('review');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setCrop(undefined);
      setCompletedCrop(null);
      setError(null);
      setStep('review');
    };
    reader.readAsDataURL(file);
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

    // MUDANÇA: Aumentada qualidade da compressão do crop para 1.0
    return canvas.toDataURL('image/jpeg', 1.0);
  };

  React.useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const handleSelectDoc = (type: DocType) => {
    setCurrentDocType(type);
    setStep('capture');
  };

  const handleConfirmPhoto = async () => {
    if (!preview || !currentDocType) return;
    setLoading(true);
    
    try {
      const finalImageBase64 = await getCroppedImageBase64() || preview;
      
      const newImages = { ...images, [currentDocType]: finalImageBase64 };
      setImages(newImages);
      
      // Verifica se falta algum documento
      if (currentDocType === 'nf' && !newImages.ticket) {
        setCurrentDocType('ticket');
        setPreview(null);
        setStep('capture');
        setLoading(false);
      } else if (currentDocType === 'ticket' && !newImages.nf) {
        setCurrentDocType('nf');
        setPreview(null);
        setStep('capture');
        setLoading(false);
      } else {
        // Tem os dois, ou escolheu finalizar direto
        processFinal(newImages);
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao processar imagem. Tente novamente.");
      setLoading(false);
    }
  };

  const handleSkipSecond = async () => {
    if (!preview || !currentDocType) return;
    setLoading(true);
    
    try {
      const finalImageBase64 = await getCroppedImageBase64() || preview;
      const newImages = { ...images, [currentDocType]: finalImageBase64 };
      setImages(newImages);
      processFinal(newImages);
    } catch (err) {
      console.error(err);
      setError("Erro ao processar imagem. Tente novamente.");
      setLoading(false);
    }
  };

  const processFinal = async (finalImages: { nf: string | null, ticket: string | null }) => {
    setStep('processing');
    setLoading(true);
    setError(null);

    try {
      let result = {} as any;
      
      // Só executa a IA se tiver a Nota Fiscal capturada
      if (finalImages.nf) {
        const base64Data = finalImages.nf.split(',')[1];
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (globalThis as any).process?.env?.GEMINI_API_KEY;
        
        if (!apiKey) {
          throw new Error("API Key do Gemini não configurada.");
        }
        
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `Analise esta nota fiscal de abastecimento e extraia os seguintes dados em formato JSON. 
        IMPORTANTE: Extraia a data e hora EXATAMENTE como constam na nota.
        
        - data: Data e hora do abastecimento (formato ISO local YYYY-MM-DDTHH:mm, ignore fuso horário)
        - local: Nome do posto ou estabelecimento
        - cnpj: CNPJ do estabelecimento
        - fuelType: Tipo de combustível (ex: Gasolina Comum, Diesel S10)
        - liters: Quantidade de litros (número)
        - pricePerLiter: Preço por litro (número)
        - totalValue: Valor total pago (número)
        - driver: Nome do motorista (se disponível)
        - plate: Placa do veículo. REGRAS CRÍTICAS PARA PLACA:
          1. O formato brasileiro é 3 LETRAS seguidas de 4 NÚMEROS (ABC1234) ou o padrão Mercosul (ABC1D23).
          2. Os 3 PRIMEIROS caracteres são SEMPRE LETRAS. Nunca confunda '0' com 'O' ou '1' com 'I' nestas posições.
          3. No padrão Mercosul, o 5º caractere é SEMPRE uma LETRA.
          4. Verifique cuidadosamente se o que parece um '0' (zero) não é na verdade a letra 'O' nas posições de letras, e vice-versa.
        - km: Quilometragem do veículo (número, se disponível)
        - attendant: Nome do atendente (se disponível)
        - protocol: Número do protocolo ou da nota fiscal (se disponível)
        
        Se algum dado não for encontrado, deixe como string vazia ou zero para números.`;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                  }
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                data: { type: Type.STRING },
                local: { type: Type.STRING },
                cnpj: { type: Type.STRING },
                fuelType: { type: Type.STRING },
                liters: { type: Type.NUMBER },
                pricePerLiter: { type: Type.NUMBER },
                totalValue: { type: Type.NUMBER },
                driver: { type: Type.STRING },
                plate: { type: Type.STRING },
                km: { type: Type.NUMBER },
                attendant: { type: Type.STRING },
                protocol: { type: Type.STRING }
              }
            }
          }
        });

        result = JSON.parse(response.text || '{}');
      }
      
      const getLocalISOString = (date: Date) => {
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
      };

      const supply: FuelSupply = {
        id: 'temp-' + Date.now(),
        date: result.data || getLocalISOString(new Date()),
        location: result.local || '',
        cnpj: result.cnpj || '',
        fuelType: result.fuelType || '',
        liters: result.liters || 0,
        pricePerLiter: result.pricePerLiter || 0,
        totalValue: result.totalValue || 0,
        driver: result.driver || '',
        plate: result.plate || '',
        km: result.km || 0,
        attendant: result.attendant || '',
        protocol: result.protocol || '',
        attachmentData: finalImages.nf || '',
        attachmentType: finalImages.nf ? 'image/jpeg' : '',
        ticketLogData: finalImages.ticket || '',
        ticketLogType: finalImages.ticket ? 'image/jpeg' : '',
        createdAt: new Date().toISOString()
      };

      onExtracted(supply);
    } catch (err: any) {
      console.error("Erro no processamento Final:", err);
      setError("Não foi possível processar a nota. Tente tirar fotos mais nítidas ou preencher manualmente.");
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const getDocTitle = (type: DocType | null) => type === 'nf' ? 'Nota Fiscal' : 'Ticket Log';

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[3000] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
      <style>{`
        @keyframes scan-fuel {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .scan-line-fuel {
          position: absolute;
          width: 100%;
          height: 4px;
          background: linear-gradient(to bottom, transparent, #10b981, transparent);
          box-shadow: 0 0 15px 2px rgba(16, 185, 129, 0.7);
          z-index: 20;
          animation: scan-fuel 3s linear infinite;
        }
      `}</style>
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col my-auto border border-white/10">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <FileText size={20} />
            </div>
            <h3 className="font-black text-blue-900 uppercase tracking-tight text-sm">Registro Documental Múltiplo</h3>
          </div>
          <button onClick={() => { stopWebcam(); onCancel(); }} className="p-2.5 hover:bg-blue-100 text-blue-400 transition-colors rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex flex-col items-center text-center space-y-6">
          
          {step === 'select' && (
            <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2 mx-auto">
                <Receipt size={40} />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Qual documento capturar?</h4>
                <p className="text-slate-500 text-sm mt-2 font-medium">Recomendamos enviar ambos (Nota Fiscal e Ticket Log) para registro completo.</p>
              </div>
              
              <div className="flex flex-col gap-3 mt-6">
                <button 
                  onClick={() => handleSelectDoc('nf')}
                  className={`py-4 rounded-2xl shadow-sm border transition-all active:scale-95 flex items-center justify-between px-6 ${images.nf ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                >
                  <div className="flex items-center gap-3 font-black uppercase text-xs tracking-widest">
                    <FileText size={20} />
                    Nota Fiscal {images.nf && '(Capturada)'}
                  </div>
                  {images.nf ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Camera size={20} className="text-slate-400" />}
                </button>
                
                <button 
                  onClick={() => handleSelectDoc('ticket')}
                  className={`py-4 rounded-2xl shadow-sm border transition-all active:scale-95 flex items-center justify-between px-6 ${images.ticket ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                >
                  <div className="flex items-center gap-3 font-black uppercase text-xs tracking-widest">
                    <Receipt size={20} />
                    Ticket Log {images.ticket && '(Capturado)'}
                  </div>
                  {images.ticket ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Camera size={20} className="text-slate-400" />}
                </button>
              </div>

              {(images.nf || images.ticket) && (
                <button 
                  onClick={() => processFinal(images)}
                  className="mt-4 w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest"
                >
                  Finalizar e Processar Dados
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          )}

          {step === 'capture' && (
            <div className="w-full flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-blue-100 text-blue-800 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl mb-2">
                Capturando {getDocTitle(currentDocType)}
              </div>
              
              {!showWebcam ? (
                <div className="flex flex-col sm:flex-row w-full gap-3">
                  <button onClick={startWebcam} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase text-[10px]">
                    <Camera size={18} /> Abrir Câmera
                  </button>
                  <button onClick={() => { const input = document.getElementById('fuel-file-input'); if (input) input.click(); }} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl border flex items-center justify-center gap-3 uppercase text-[10px]">
                    <Upload size={18} /> Fazer Upload
                  </button>
                  <input id="fuel-file-input" type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-4">
                  <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-inner border-4 border-slate-900">
                    <video ref={videoRef} playsInline autoPlay muted className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-4 rounded-xl border-dashed"></div>
                  </div>
                  <div className="flex gap-3 w-full max-w-sm mt-2">
                    <button onClick={stopWebcam} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase text-[10px]">Cancelar</button>
                    <button onClick={capturePhoto} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase text-[10px]">
                      <Camera size={18} /> Tirar Foto
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'review' && preview && (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl mb-2 inline-block">
                Revisão: {getDocTitle(currentDocType)}
              </div>
              <div className="relative rounded-3xl overflow-hidden border bg-slate-50 flex items-center justify-center min-h-[300px]">
                <div className="absolute top-4 left-0 w-full text-center z-10 pointer-events-none">
                  <p className="inline-block bg-emerald-900/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-pulse">
                    Ajuste as bordas
                  </p>
                </div>
                <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} className="flex items-center justify-center bg-slate-100">
                  <img ref={imgRef} src={preview} alt="Preview" className={`max-h-[50vh] object-contain w-full transition-all duration-700 ${loading ? 'scale-[1.02] blur-[1px]' : ''}`} onLoad={(e: SyntheticEvent<HTMLImageElement>) => { setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 }); }} />
                </ReactCrop>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-center text-left">
                  <AlertCircle className="text-red-500 shrink-0" size={20} />
                  <p className="text-xs text-red-700 font-bold">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleConfirmPhoto}
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase text-[10px] disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Aprovar e Avançar
                </button>
                
                {/* Permite finalizar ignorando o segundo arquivo caso a pessoa não tenha */}
                {((currentDocType === 'nf' && !images.ticket) || (currentDocType === 'ticket' && !images.nf)) && (
                   <button 
                    onClick={handleSkipSecond}
                    disabled={loading}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] hover:bg-slate-50"
                  >
                    <SkipForward size={14} /> Aprovar Foto e Finalizar (Ignorar o outro)
                  </button>
                )}

                <button 
                  onClick={() => { setPreview(null); setStep('capture'); }}
                  disabled={loading}
                  className="w-full py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-[10px] tracking-widest"
                >
                  Descartar e Tirar Nova Foto
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="w-full h-64 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500">
               <div className="relative">
                 <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse"></div>
                 <Cpu className="text-blue-600 relative z-10 animate-bounce" size={48} />
               </div>
               <div>
                 <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Analisando Documentos</h4>
                 <p className="text-slate-500 text-sm mt-2 font-medium">Processando arquivos e extraindo dados com inteligência artificial...</p>
               </div>
               <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default FuelReceiptOCR;
