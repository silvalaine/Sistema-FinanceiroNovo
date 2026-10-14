import React, { useEffect, useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Globe, 
  Rocket, 
  Edit3, 
  Info,
  RefreshCw
} from 'lucide-react';
import QRCode from 'qrcode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  // Custom link state
  const [savedUrl, setSavedUrl] = useState<string>(() => {
    return localStorage.getItem('finanplan_custom_published_url') || '';
  });
  const [inputUrl, setInputUrl] = useState<string>(() => {
    return localStorage.getItem('finanplan_custom_published_url') || '';
  });
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'qr' | 'how_to_publish' | 'preview'>('qr');

  // Internal preview URL
  const [internalPreviewUrl, setInternalPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let url = window.location.href;
      if (url.includes('ais-dev-')) {
        url = url.replace('ais-dev-', 'ais-pre-');
      }
      setInternalPreviewUrl(url);

      const activeLink = savedUrl || url;
      QRCode.toDataURL(activeLink, {
        width: 260,
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff'
        }
      })
        .then((dataUrl: string) => {
          setQrCodeDataUrl(dataUrl);
        })
        .catch((err: unknown) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [isOpen, savedUrl]);

  if (!isOpen) return null;

  const currentActiveUrl = savedUrl || internalPreviewUrl;

  const handleSaveUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputUrl.trim();
    if (clean) {
      setSavedUrl(clean);
      localStorage.setItem('finanplan_custom_published_url', clean);
      setSaveSuccess(true);
      setIsEditingUrl(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleResetToDefault = () => {
    localStorage.removeItem('finanplan_custom_published_url');
    setSavedUrl('');
    setInputUrl('');
    setIsEditingUrl(false);
  };

  const handleCopy = async (text: string, isPreview: boolean = false) => {
    try {
      if (navigator.clipboard && text) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      if (isPreview) {
        setCopiedPreview(true);
        setTimeout(() => setCopiedPreview(false), 3000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <QrCode className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Link & Acesso ao App</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {savedUrl ? 'Link Personalizado' : 'Pronto para Uso'}
                </span>
              </div>
              <p className="text-xs text-indigo-200">Acesse no celular ou atualize o link do aplicativo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-3 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'qr'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>Link do App & QR Code</span>
          </button>

          <button
            onClick={() => setActiveTab('how_to_publish')}
            className={`px-3 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'how_to_publish'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Rocket className="w-4 h-4 text-indigo-600" />
            <span>Como Publicar Grátis</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'preview'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-4 h-4 text-slate-500" />
            <span>Testar no Computador</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-700 text-xs">
          
          {/* TAB 1: QR CODE & EDIT LINK */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              
              {/* Success Notification */}
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Link do aplicativo atualizado com sucesso! O QR Code e botões foram atualizados.</span>
                </div>
              )}

              {/* QR Code and Instructions */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                {qrCodeDataUrl ? (
                  <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200 shrink-0">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code do FinanPlan" 
                      className="w-40 h-40 object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12" />
                  </div>
                )}

                <div className="space-y-2.5 flex-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                      <Sparkles className="w-3.5 h-3.5" />
                      {savedUrl ? 'Link Oficial Configurado' : 'Acesso Rápido'}
                    </span>
                  </div>
                  
                  <h3 className="text-base font-bold text-slate-900">
                    Aponte a câmera do seu celular
                  </h3>
                  
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Escaneie este QR Code para abrir o <strong>FinanPlan</strong> diretamente no seu smartphone.
                  </p>

                  {currentUserEmail && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Conectado como <strong>{currentUserEmail}</strong> (Sincronizado na Nuvem).</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Link Bar */}
              <div className="space-y-2 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    Link Ativo do Aplicativo:
                  </label>
                  <button
                    onClick={() => setIsEditingUrl(!isEditingUrl)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingUrl ? 'Fechar Edição' : 'Atualizar / Trocar Link'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentActiveUrl}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-700 select-all"
                  />
                  <button
                    onClick={() => handleCopy(currentActiveUrl)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Edit Link Drawer / Form */}
                {isEditingUrl && (
                  <form onSubmit={handleSaveUrl} className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Cole a nova URL que você deseja usar:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Ex: https://meu-app.ai.studio ou https://...run.app"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
                      >
                        Salvar Novo Link
                      </button>
                    </div>
                    {savedUrl && (
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer pt-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Restaurar link padrão da prévia</span>
                      </button>
                    )}
                  </form>
                )}
              </div>

              {/* Quick tip if using internal preview link */}
              {!savedUrl && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-amber-950 font-bold">
                      Você pode me enviar o link aqui no chat!
                    </p>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Se você tem o link que gerou no botão <strong>Publish</strong>, basta colar ele aqui nesta caixinha ou me mandar no chat que eu configuro ele no código do aplicativo para você.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HOW TO PUBLISH FOR REAL & FREE */}
          {activeTab === 'how_to_publish' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Como gerar seu link público gratuito no Google AI Studio:
                  </h3>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Para que o link abra no celular de qualquer pessoa sem exigir login de desenvolvedor:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Clique em "Publish" (Publicar)</p>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      No canto superior direito da tela do Google AI Studio (no topo da tela), clique em <strong>"Publish"</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Escolha o "Starter Tier" (100% Gratuito)</p>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      O plano <strong>Starter Tier</strong> permite publicar até 2 aplicativos de graça, sem precisar colocar cartão de crédito.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Copie o link gerado e cole no app</p>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Assim que o AI Studio publicar, copie a URL gerada, volte aqui na aba <strong>"Link do App & QR Code"</strong> e cole seu link!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREVIEW ON COMPUTER */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-sm text-slate-900">
                    Abrir em tela cheia no Computador
                  </h4>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Para abrir o app em tela cheia no mesmo computador em uma aba separada:
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={internalPreviewUrl}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-700 select-all"
                  />
                  <button
                    onClick={() => handleCopy(internalPreviewUrl, true)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    {copiedPreview ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>

                <div className="pt-2">
                  <a
                    href={internalPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-xs"
                  >
                    <span>Abrir Agora em Nova Aba</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => setActiveTab(activeTab === 'qr' ? 'how_to_publish' : 'qr')}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
          >
            {activeTab === 'qr' ? 'Ver Passo a Passo de Publicação' : 'Voltar para Link & QR Code'}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
