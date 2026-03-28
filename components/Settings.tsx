import React, { useState, useEffect } from 'react';
import { Operator } from '../types';
import UserProfile from './UserProfile';
import { Settings as SettingsIcon, Smartphone, UserCircle, ChevronRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  currentUser: Operator;
  onUpdateProfile: (user: Operator) => void;
  onOpenInstallGuide: () => void;
}

const Settings: React.FC<Props> = ({ currentUser, onUpdateProfile, onOpenInstallGuide }) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="mb-6 shrink-0">
        <div className="flex items-center gap-4 mb-1">
          <div className="bg-slate-800 p-3 rounded-2xl shadow-lg shadow-slate-900/20">
            <SettingsIcon size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Configurações</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Gerencie seu perfil e o sistema</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-24 md:pb-8 no-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-7xl mx-auto">
          
          {/* Main Content Area - Profile */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <UserCircle size={20} />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-800 uppercase text-sm tracking-tight">Meu Perfil</h2>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Informações da Conta</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 border border-emerald-200">
                  <ShieldCheck size={12} /> Operador Ativo
                </div>
              </div>
              <div className="p-6">
                <UserProfile user={currentUser} onUpdate={onUpdateProfile} onBack={() => {}} />
              </div>
            </div>
          </div>

          {/* Sidebar Area - System Settings */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* App Installation */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl shadow-xl shadow-blue-900/20 p-6 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-inner">
                  <Smartphone size={24} className="text-white drop-shadow-md" />
                </div>
                
                <h3 className="font-black text-xl uppercase tracking-tight mb-2">Instalar Aplicativo</h3>
                <p className="text-blue-100 text-xs font-medium mb-6 leading-relaxed">
                  Adicione o Gestão CBM à tela inicial do seu celular computador para acesso rápido e experiência em tela cheia (PWA).
                </p>
                
                <button 
                  onClick={onOpenInstallGuide}
                  className="w-full bg-white text-blue-700 hover:bg-blue-50 py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-between group/btn shadow-lg transition-all active:scale-95"
                >
                  Ver Guia de Instalação
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center group-hover/btn:translate-x-1 transition-transform">
                    <ChevronRight size={14} className="text-blue-600" />
                  </div>
                </button>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Informações do Sistema</h3>
              <div className="space-y-3 text-xs font-medium text-slate-600">
                <div className="flex justify-between items-center py-2">
                  <span>Versão</span>
                  <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">2.1.0</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Admin Access Control Panel */}
        {currentUser.isAdmin && (
          <div className="mt-6 w-full max-w-7xl mx-auto">
            <UserAccessControl />
          </div>
        )}
      </div>
    </div>
  );
};

const UserAccessControl: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [defaultScreens, setDefaultScreens] = useState<string[]>(['dashboard', 'fuel', 'face-checkin']);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingDefault, setSavingDefault] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const availableScreens = [
    { id: 'dashboard', label: 'Painel' },
    { id: 'providers', label: 'Prestadores' },
    { id: 'face-checkin', label: 'Check-in Facial' },
    { id: 'fuel', label: 'Abastecimento' },
    { id: 'reports', label: 'Relatórios' },
    { id: 'settings', label: 'Configurações (Admin)' }
  ];

  useEffect(() => {
    // Clear message after 3 seconds
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { getSystemConfig, getAllProfiles } = await import('../services/supabaseService');
      const [configData, profilesData] = await Promise.all([
        getSystemConfig('default_screens'),
        getAllProfiles()
      ]);
      
      if (configData && Array.isArray(configData)) setDefaultScreens(configData);
      setProfiles(profilesData || []);
    } catch (err) {
      console.error("Erro ao carregar dados de acesso:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleScreen = (userId: string, screenId: string) => {
    setProfiles(prev => prev.map(p => {
      if (p.id !== userId) return p;
      const screens = p.allowedScreens || [];
      const newScreens = screens.includes(screenId)
        ? screens.filter((s: string) => s !== screenId)
        : [...screens, screenId];
      return { ...p, allowedScreens: newScreens, hasUnsavedChanges: true };
    }));
  };

  const handleToggleDefaultScreen = (screenId: string) => {
    if (defaultScreens.includes(screenId)) {
      setDefaultScreens(defaultScreens.filter(s => s !== screenId));
    } else {
      setDefaultScreens([...defaultScreens, screenId]);
    }
  };

  const saveUserAccess = async (user: any) => {
    setSavingId(user.id);
    try {
      const { updateUserAccess } = await import('../services/supabaseService');
      const isNowAdmin = user.allowedScreens.includes('settings');
      await updateUserAccess(user.id, user.allowedScreens, isNowAdmin);
      setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, hasUnsavedChanges: false, isAdmin: isNowAdmin } : p));
      setStatusMessage({ type: 'success', text: `Acessos de ${user.warName} salvos com sucesso!` });
    } catch (err) {
      console.error("Erro ao salvar acesso:", err);
      setStatusMessage({ type: 'error', text: "Erro ao salvar permissões do usuário." });
    } finally {
      setSavingId(null);
    }
  };

  const saveDefaultConfig = async () => {
    setSavingDefault(true);
    try {
      const { updateSystemConfig } = await import('../services/supabaseService');
      await updateSystemConfig('default_screens', defaultScreens);
      setStatusMessage({ type: 'success', text: "Configuração padrão atualizada com sucesso!" });
    } catch (err) {
      console.error("Erro ao salvar config:", err);
      setStatusMessage({ type: 'error', text: "Erro ao salvar configuração padrão." });
    } finally {
      setSavingDefault(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs">Carregando permissões...</div>;

  return (
    <div className="flex flex-col gap-6">
      
      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold text-sm uppercase tracking-tight">{statusMessage.text}</p>
        </div>
      )}

      {/* Default Sign-up Config */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
              <UserCircle size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-800 uppercase text-sm tracking-tight">Novos Usuários</h2>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Acesso padrão automático</p>
            </div>
          </div>
          <button 
            onClick={saveDefaultConfig}
            disabled={savingDefault}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-black uppercase shadow-md shadow-purple-600/20 hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:bg-slate-300"
          >
            {savingDefault ? 'Salvando...' : 'Salvar Padrão'}
          </button>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {availableScreens.map(screen => (
              <label key={screen.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer border transition-colors ${defaultScreens.includes(screen.id) ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                <input 
                  type="checkbox" 
                  checked={defaultScreens.includes(screen.id)}
                  onChange={() => handleToggleDefaultScreen(screen.id)}
                  className="hidden" 
                />
                <div className={`w-3 h-3 rounded-md flex items-center justify-center border ${defaultScreens.includes(screen.id) ? 'border-purple-600 bg-purple-600' : 'border-slate-300'}`}>
                   {defaultScreens.includes(screen.id) && <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>}
                </div>
                {screen.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="font-black text-slate-800 uppercase text-sm tracking-tight">Controle de Usuários</h2>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Gerencie quem acessa o quê</p>
          </div>
        </div>

        <div className="flex flex-col">
          {profiles.map(p => (
            <div key={p.id} className="p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors flex flex-col xl:flex-row gap-6 xl:items-center justify-between">
              
              <div className="flex items-center gap-4 min-w-[250px]">
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  {p.profilePhoto ? (
                    <img src={p.profilePhoto} alt={p.warName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <UserCircle size={24} />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-sm">{p.rank} {p.warName}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{p.email}</p>
                </div>
              </div>

              <div className="flex-1 flex flex-wrap gap-2">
                {availableScreens.map(screen => {
                  const hasAccess = (p.allowedScreens || []).includes(screen.id);
                  return (
                    <label key={screen.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer border transition-colors ${hasAccess ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                      <input 
                        type="checkbox" 
                        checked={hasAccess} 
                        onChange={() => handleToggleScreen(p.id, screen.id)}
                        className="hidden" 
                      />
                      <div className={`w-2.5 h-2.5 rounded-sm flex items-center justify-center ${hasAccess ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                      {screen.label}
                    </label>
                  );
                })}
              </div>

              <div className="shrink-0 flex items-center">
                {p.hasUnsavedChanges ? (
                  <button 
                    onClick={() => saveUserAccess(p)}
                    disabled={savingId === p.id}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-colors w-full xl:w-auto"
                  >
                    {savingId === p.id ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-black uppercase text-center w-full xl:w-auto">
                    Acessos Salvos
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Settings;
