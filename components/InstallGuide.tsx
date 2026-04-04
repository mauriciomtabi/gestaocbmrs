import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Smartphone, Monitor, MoreVertical, CheckCircle2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator as any).standalone;

const InstallGuide: React.FC<Props> = ({ onClose }) => {
  const appUrl = window.location.origin;
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installState, setInstallState] = useState<'idle' | 'done'>('idle');
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appUrl);
    alert("Link copiado para a área de transferência!");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Gestão CBM - Sapucaia do Sul',
          text: 'Sistema de Gestão de Prestadores de Serviço Comunitário',
          url: appUrl,
        });
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    } else {
      copyToClipboard();
    }
  };

  const handleAndroidInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstallState('done');
      setDeferredPrompt(null);
    } else {
      window.open(appUrl, '_blank');
    }
  };

  const handleIOSInstall = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Gestão CBM', url: appUrl });
      } catch {}
    } else {
      setShowIOSHint(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-[3000] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Smartphone size={20} />
            </div>
            <h3 className="font-black text-blue-900 uppercase tracking-tight text-sm">Instalar no Celular</h3>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-blue-100 text-blue-400 transition-colors rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8">

          {/* Botões de Instalação por Plataforma */}
          {isInStandaloneMode() || installState === 'done' ? (
            <div className="flex items-center gap-3 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <CheckCircle2 className="text-emerald-600 shrink-0" size={28} />
              <p className="text-emerald-800 font-black text-sm uppercase">Aplicativo já instalado neste dispositivo!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Botão Android */}
              <button
                onClick={handleAndroidInstall}
                className="flex flex-col items-center justify-center gap-3 py-6 px-4 bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-300/40 transition-all active:scale-95"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" className="w-8 h-8 brightness-0 invert" alt="Android" />
                <span>{deferredPrompt ? 'Instalar no Android' : 'Abrir no Navegador'}</span>
                <span className="text-green-200 font-medium normal-case text-[10px]">
                  {deferredPrompt ? 'Toque para instalar agora' : 'Abrir e instalar pelo Chrome'}
                </span>
              </button>

              {/* Botão iOS */}
              <button
                onClick={handleIOSInstall}
                className="flex flex-col items-center justify-center gap-3 py-6 px-4 bg-gradient-to-br from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-400/30 transition-all active:scale-95"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" className="w-7 h-8 brightness-0 invert" alt="Apple" />
                <span>Instalar no iPhone</span>
                <span className="text-slate-400 font-medium normal-case text-[10px]">Abre o menu de compartilhamento</span>
              </button>
            </div>
          )}

          {/* Dica iOS após clicar */}
          {showIOSHint && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
              <Share className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <p className="text-amber-800 text-xs font-bold leading-relaxed">
                No Safari: toque em <span className="bg-amber-200 px-1 rounded">Compartilhar</span> na barra inferior → selecione <span className="bg-amber-200 px-1 rounded">"Adicionar à Tela de Início"</span> → toque em <span className="bg-amber-200 px-1 rounded">Adicionar</span>.
              </p>
            </div>
          )}

          {/* Compartilhar link */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">01</span>
              <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Compartilhar o Sistema</h4>
            </div>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Envie o link abaixo para outros operadores. O sistema é 100% web e não precisa baixar na loja de aplicativos.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-600 font-mono text-xs truncate flex items-center">
                {appUrl}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  className="flex-1 sm:flex-none bg-slate-100 text-slate-600 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 border border-slate-200"
                >
                  Copiar
                </button>
                <button 
                  onClick={handleNativeShare}
                  className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Share size={14} />
                  Compartilhar
                </button>
              </div>
            </div>
          </section>

          {/* Android / iOS Guide Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* iOS */}
            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white p-2 rounded-xl shadow-sm">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" className="w-5 h-5" alt="Apple" />
                </div>
                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">iPhone (iOS)</h4>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm font-medium text-slate-600">
                  <div className="shrink-0 w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200"><Share size={14} className="text-blue-600" /></div>
                  <p>Abra no <span className="font-bold text-slate-800">Safari</span> e toque no ícone de <span className="font-bold text-slate-800">Compartilhar</span>.</p>
                </li>
                <li className="flex gap-3 text-sm font-medium text-slate-600">
                  <div className="shrink-0 w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200"><PlusSquare size={14} className="text-blue-600" /></div>
                  <p>Role para baixo e selecione <span className="font-bold text-slate-800">"Adicionar à Tela de Início"</span>.</p>
                </li>
                <li className="flex gap-3 text-sm font-medium text-slate-600">
                  <div className="shrink-0 w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200"><CheckCircle2 size={14} className="text-emerald-600" /></div>
                  <p>Toque em <span className="font-bold text-slate-800">Adicionar</span> no canto superior.</p>
                </li>
              </ul>
            </div>

            {/* Android */}
            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white p-2 rounded-xl shadow-sm">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" className="w-5 h-5" alt="Android" />
                </div>
                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Android (Chrome)</h4>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm font-medium text-slate-600">
                  <div className="shrink-0 w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200"><MoreVertical size={14} className="text-blue-600" /></div>
                  <p>Abra no <span className="font-bold text-slate-800">Chrome</span> e toque nos <span className="font-bold text-slate-800">três pontos</span> no canto.</p>
                </li>
                <li className="flex gap-3 text-sm font-medium text-slate-600">
                  <div className="shrink-0 w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200"><Monitor size={14} className="text-blue-600" /></div>
                  <p>Selecione a opção <span className="font-bold text-slate-800">"Instalar Aplicativo"</span> ou "Adicionar à tela inicial".</p>
                </li>
                <li className="flex gap-3 text-sm font-medium text-slate-600">
                  <div className="shrink-0 w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200"><CheckCircle2 size={14} className="text-emerald-600" /></div>
                  <p>Confirme a instalação para criar o atalho.</p>
                </li>
              </ul>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-slate-800 text-white font-black rounded-2xl shadow-xl hover:bg-slate-900 transition-all active:scale-95 uppercase text-[10px] tracking-widest"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

export default InstallGuide;
