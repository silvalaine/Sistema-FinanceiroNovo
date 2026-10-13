import React, { useState } from 'react';
import { 
  Plus, 
  ArrowDownUp, 
  BarChart3, 
  PieChart, 
  Layers, 
  Wallet, 
  Download, 
  CreditCard as CardIcon, 
  Cloud, 
  LogOut,
  Smartphone,
  CheckCircle2,
  QrCode
} from 'lucide-react';
import type { User } from 'firebase/auth';

export type ActiveTab = 'dashboard' | 'transactions' | 'cards' | 'categories' | 'reports';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewTransaction: () => void;
  onOpenExportModal: () => void;
  onOpenShareModal?: () => void;
  totalTransactionsCount: number;
  currentUser?: User | null;
  isSyncing?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTransaction,
  onOpenExportModal,
  onOpenShareModal,
  currentUser,
  isSyncing,
  onLogin,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Visão Geral', icon: PieChart },
    { id: 'transactions', label: 'Transações', icon: ArrowDownUp },
    { id: 'cards', label: 'Cartões & Faturas', icon: CardIcon },
    { id: 'categories', label: 'Categorias', icon: Layers },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/98 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 flex items-center justify-center text-white shadow-sm shadow-indigo-200 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <a
              href="#dashboard"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('dashboard');
              }}
              className="group flex flex-col cursor-pointer"
            >
              <span className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors leading-none">
                FinanPlan
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                Gestão Financeira
              </span>
            </a>
          </div>

          {/* Desktop Navigation Links - Spacious, Clear, Highly Legible */}
          <nav className="hidden lg:flex items-center gap-1.5 p-1.5 bg-slate-100/80 border border-slate-200/70 rounded-2xl shadow-inner-2xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-4.5 py-2.5 text-[15px] xl:text-base font-semibold rounded-xl transition-all flex items-center gap-2.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs font-bold border border-slate-200/90'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 stroke-[2.2]' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Actions & Cloud Sync */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Cloud Sync Button / User Status */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 transition-all cursor-pointer text-left shadow-2xs"
                  title={`Conectado como ${currentUser.email} (PC & Celular sincronizados)`}
                >
                  <div className="relative">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover border border-emerald-300"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                        {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-2 ring-white" />
                  </div>
                  <div className="hidden sm:flex flex-col min-w-0 max-w-[130px]">
                    <span className="text-xs font-bold text-slate-800 truncate leading-tight">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-emerald-600" />
                      {isSyncing ? 'Sincronizado' : 'Conectado'}
                    </span>
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="pb-2.5 mb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-emerald-700">Sincronização em Tempo Real Ativa</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate">{currentUser.displayName || 'Usuário'}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-xl text-xs text-slate-600 mb-2 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Acesse no celular com o mesmo login para atualizar tudo simultaneamente.</span>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenShareModal?.();
                      }}
                      className="w-full px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-xl flex items-center gap-2 cursor-pointer transition-colors mb-1"
                    >
                      <QrCode className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Acessar no Celular (QR Code)</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenExportModal();
                      }}
                      className="w-full px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-xl flex items-center gap-2 cursor-pointer transition-colors mb-1"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                      </svg>
                      <span>Backup no Google Drive</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout?.();
                      }}
                      className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Desconectar da Nuvem</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="px-3.5 py-2 text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/90 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-2xs hover:shadow-xs whitespace-nowrap"
                title="Conectar com o Google para sincronizar no computador e celular ao mesmo tempo"
              >
                <Cloud className="w-4 h-4 text-indigo-600" />
                <span>Sincronizar PC & Celular</span>
              </button>
            )}

            <button
              onClick={onOpenShareModal}
              title="Acessar no celular via QR Code ou copiar link atualizado"
              className="px-3 sm:px-3.5 py-2.5 text-sm sm:text-base font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-all flex items-center gap-2 shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <Smartphone className="w-4.5 h-4.5 text-indigo-600" />
              <span className="hidden xl:inline">Celular & Link</span>
            </button>

            <button
              onClick={onOpenExportModal}
              title="Backup e exportação de dados (Google Drive e local)"
              className="px-3.5 sm:px-4 py-2.5 text-sm sm:text-base font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-all flex items-center gap-2 shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <Download className="w-4.5 h-4.5 text-slate-600" />
              <span className="hidden xl:inline">Backup & Drive</span>
            </button>
            <button
              onClick={onOpenNewTransaction}
              title="Novo Lançamento (Atalho: Tecla 'N' ou Alt+N)"
              className="px-4 sm:px-5 py-2.5 text-sm sm:text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-xl shadow-sm shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">Novo</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white/20 text-white rounded border border-white/30 shadow-2xs" title="Atalho: Tecla 'N' ou Alt+N">
                N
              </kbd>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar - Enhanced font size, touch target, and active pill */}
        <div className="flex lg:hidden border-t border-slate-100 py-3 gap-2 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-xl whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
