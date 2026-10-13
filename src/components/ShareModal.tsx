import React, { useEffect, useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Smartphone, 
  ExternalLink, 
  QrCode, 
  AlertCircle, 
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Globe,
  ShieldCheck,
  CreditCard,
  Share2
} from 'lucide-react';
import QRCode from 'qrcode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

const DEFAULT_SHARED_URL = 'https://ais-pre-gycrfu7qrptlnvk5v2gvvp-878956240114.us-east1.run.app';

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail
}) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [publicUrl, setPublicUrl] = useState<string>(DEFAULT_SHARED_URL);
  const [activeTab, setActiveTab] = useState<'qr' | 'free_vs_deploy' | 'help'>('free_vs_deploy');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let url = window.location.href;
      if (url.includes('ais-dev-')) {
        url = url.replace('ais-dev-', 'ais-pre-');
      } else if (!url.startsWith('http')) {
        url = DEFAULT_SHARED_URL;
      }
      setPublicUrl(url);

      // Generate QR Code with public URL
      QRCode.toDataURL(url, {
        width: 260,
        margin: 2,
        color: {
          dark: '#1e1b4b', // Deep indigo
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
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && publicUrl) {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = publicUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
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
              <Smartphone className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Publicação & Acesso Gratuito</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  100% Grátis
                </span>
              </div>
              <p className="text-xs text-indigo-200">Seu app já está publicado e pronto para uso</p>
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
            onClick={() => setActiveTab('free_vs_deploy')}
            className={`px-3 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'free_vs_deploy'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Como Publicar Grátis</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-3 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'qr'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>Link Gratuito & QR Code</span>
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`px-3 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'help'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>Passo a Passo de Atualização</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700 text-xs">
          {activeTab === 'free_vs_deploy' && (
            <div className="space-y-4">
              {/* Green Confirmation Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-emerald-950">
                    Boa notícia: Seu aplicativo JÁ ESTÁ PUBLICADO de forma gratuita!
                  </h4>
                  <p className="text-emerald-800 leading-relaxed">
                    Você não precisa cadastrar cartão de crédito nem pagar nenhuma assinatura. O Google AI Studio já hospeda seu aplicativo gratuitamente na nuvem.
                  </p>
                </div>
              </div>

              {/* Explain Share vs Deploy difference */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-900 text-sm">
                  Por que pode ter parecido que não dá para publicar grátis?
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-700 font-bold">
                      <CreditCard className="w-4 h-4" />
                      <span>Botão "Deploy" (Pago)</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Se você clicou em <strong>Deploy</strong> na barra superior, ele pede uma conta do Google Cloud com faturamento. <strong>Você NÃO precisa usar o Deploy!</strong>
                    </p>
                  </div>

                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold">
                      <Share2 className="w-4 h-4" />
                      <span>Botão "Share" (100% Grátis)</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      A publicação gratuita oficial é feita pelo botão <strong>Share</strong> (Compartilhar). Ele gera o link público do app sem cobrar nada.
                    </p>
                  </div>
                </div>
              </div>

              {/* Link Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    Seu Link Público Gratuito Já Ativo:
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                    Ativo na Nuvem
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-hidden select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs ${
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

                <div className="flex items-center justify-between pt-1">
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                  >
                    <span>Abrir link em nova aba</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => setActiveTab('qr')}
                    className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ver QR Code para Celular</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                {qrCodeDataUrl ? (
                  <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200 shrink-0">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code para acesso gratuito no celular" 
                      className="w-40 h-40 object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12" />
                  </div>
                )}

                <div className="space-y-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                    <Sparkles className="w-3.5 h-3.5" />
                    Acesso Instantâneo e Gratuito
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Aponte a câmera do celular
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Você pode escanear o código ao lado para abrir este sistema no seu smartphone sem digitar nada.
                  </p>
                  {currentUserEmail && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Conectado como <strong>{currentUserEmail}</strong> com sincronização em tempo real.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Link Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Link Direto Gratuito:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="w-full px-3 py-2.5 text-xs font-mono bg-slate-100 border border-slate-300 rounded-xl text-slate-700 focus:outline-hidden select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1">
                <h4 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  Como publicar alterações de graça no Google AI Studio
                </h4>
                <p className="text-indigo-900 leading-relaxed">
                  Siga estes 3 passos simples sempre que fizer alterações no projeto:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Clique em "Share" (Não use o "Deploy")</p>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      No canto superior direito da tela do Google AI Studio, clique no botão <strong>"Share"</strong>. Não clique em "Deploy", pois o Deploy é para servidores pagos.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Clique em "Update" (Atualizar)</p>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Na janela suspensa do Share, clique no botão azul <strong>"Update"</strong>. O Google AI Studio republicará o seu aplicativo gratuitamente no mesmo link.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">No Celular: Recarregue a página</p>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Caso o celular ainda mostre a tela antiga, puxe a tela para baixo para atualizar ou abra em uma <strong>Aba Anônima</strong> para limpar o cache da memória do celular.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'free_vs_deploy' ? 'qr' : 'free_vs_deploy')}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
            >
              {activeTab === 'free_vs_deploy' ? 'Ver QR Code' : 'Explicação Grátis vs Pago'}
            </button>
          </div>

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
