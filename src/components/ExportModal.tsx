import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Cloud, 
  RefreshCw, 
  Loader2,
  Calendar,
  Database,
  ArrowDownToLine,
  ExternalLink
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Category, CreditCard, Transaction } from '../types/finance';
import { formatDate, PAYMENT_METHOD_LABELS } from '../utils/formatters';
import { 
  uploadBackupToDrive, 
  listDriveBackups, 
  downloadBackupFromDrive, 
  deleteDriveBackup, 
  GoogleDriveFile 
} from '../services/googleDrive';
import { getDriveAccessToken, loginWithGoogle } from '../services/firebase';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  cards: CreditCard[];
  transactions: Transaction[];
  onImportData: (data: { categories: Category[]; transactions: Transaction[]; cards?: CreditCard[] }) => void;
  onResetToDemo: () => void;
  onClearAllTransactions: () => void;
  currentUser?: User | null;
  onLogin?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  categories,
  cards,
  transactions,
  onImportData,
  onResetToDemo,
  onClearAllTransactions,
  currentUser,
  onLogin,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'drive' | 'local' | 'danger'>('drive');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Google Drive state
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState<boolean>(false);
  const [isBackingUpToDrive, setIsBackingUpToDrive] = useState<boolean>(false);
  const [restoringFileId, setRestoringFileId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<GoogleDriveFile | null>(null);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<GoogleDriveFile | null>(null);

  // Fetch drive backups when modal opens
  useEffect(() => {
    if (isOpen) {
      setMessage(null);
      if (currentUser) {
        loadDriveFiles(false);
      }
    }
  }, [isOpen, currentUser]);

  const loadDriveFiles = async (promptUser = false) => {
    setIsLoadingDriveFiles(true);
    try {
      const token = await getDriveAccessToken(promptUser);
      if (token) {
        const files = await listDriveBackups(token);
        setDriveFiles(files);
      }
    } catch (err) {
      console.error('Erro ao listar arquivos do Google Drive:', err);
      // Only show error message if user explicitly requested/prompted
      if (promptUser) {
        setMessage({
          type: 'error',
          text: 'Não foi possível carregar os backups do Google Drive. Verifique a permissão.',
        });
      }
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  if (!isOpen) return null;

  // 1-Click Backup to Google Drive of active email
  const handleBackupToDrive = async () => {
    setIsBackingUpToDrive(true);
    setMessage({ type: 'info', text: 'Conectando ao Google Drive e preparando backup...' });

    try {
      const token = await getDriveAccessToken(true);
      if (!token) {
        throw new Error('Permissão do Google Drive não autorizada.');
      }

      const backupPayload = {
        version: '1.1',
        exportedAt: new Date().toISOString(),
        source: 'finanplan_google_drive',
        categories,
        cards,
        transactions,
      };

      const result = await uploadBackupToDrive(token, backupPayload);
      
      setMessage({
        type: 'success',
        text: `Backup salvo com sucesso no Google Drive (${result.name})!`,
      });

      // Refresh list
      const updatedFiles = await listDriveBackups(token);
      setDriveFiles(updatedFiles);
    } catch (err: any) {
      console.error('Erro ao realizar backup no Drive:', err);
      setMessage({
        type: 'error',
        text: err?.message || 'Falha ao salvar backup no Google Drive. Tente novamente.',
      });
    } finally {
      setIsBackingUpToDrive(false);
    }
  };

  // Restore/Import from Google Drive
  const handleExecuteRestoreFromDrive = async (file: GoogleDriveFile) => {
    setRestoringFileId(file.id);
    setConfirmRestoreFile(null);
    setMessage({ type: 'info', text: `Baixando e restaurando ${file.name}...` });

    try {
      const token = await getDriveAccessToken(true);
      if (!token) {
        throw new Error('Não foi possível obter a autenticação do Google Drive.');
      }

      const data = await downloadBackupFromDrive(token, file.id);
      
      onImportData({
        categories: data.categories,
        transactions: data.transactions,
        cards: data.cards,
      });

      setMessage({
        type: 'success',
        text: `Backup "${file.name}" importado com sucesso! Seus dados foram atualizados.`,
      });
    } catch (err: any) {
      console.error('Erro ao restaurar do Drive:', err);
      setMessage({
        type: 'error',
        text: err?.message || 'Falha ao importar backup do Google Drive.',
      });
    } finally {
      setRestoringFileId(null);
    }
  };

  // Delete Backup from Google Drive with mandatory confirmation
  const handleExecuteDeleteFromDrive = async (file: GoogleDriveFile) => {
    setDeletingFileId(file.id);
    setConfirmDeleteFile(null);

    try {
      const token = await getDriveAccessToken(true);
      if (!token) {
        throw new Error('Não foi possível obter a autorização do Google Drive.');
      }

      await deleteDriveBackup(token, file.id);
      setDriveFiles((prev) => prev.filter((f) => f.id !== file.id));
      setMessage({
        type: 'success',
        text: `Arquivo "${file.name}" removido do seu Google Drive.`,
      });
    } catch (err: any) {
      console.error('Erro ao excluir do Drive:', err);
      setMessage({
        type: 'error',
        text: err?.message || 'Falha ao excluir arquivo do Google Drive.',
      });
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleExportJSON = () => {
    const backupData = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      categories,
      cards,
      transactions,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `finanplan_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setMessage({ type: 'success', text: 'Backup JSON baixado com sucesso!' });
  };

  const handleExportAllCSV = () => {
    const csvRows: string[] = [];
    csvRows.push(['Data', 'Descrição', 'Tipo', 'Categoria', 'Subcategoria', 'Valor (R$)', 'Forma de Pagamento', 'Cartão', 'Parcelamento', 'Status', 'Notas'].join(';'));
    
    transactions.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const sub = cat?.subcategories.find((s) => s.id === tx.subcategoryId);
      const card = cards.find((c) => c.id === tx.cardId);

      csvRows.push([
        formatDate(tx.date),
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.type === 'income' ? 'Receita' : 'Despesa',
        `"${(cat?.name || '').replace(/"/g, '""')}"`,
        `"${(sub?.name || '').replace(/"/g, '""')}"`,
        tx.amount.toFixed(2).replace('.', ','),
        PAYMENT_METHOD_LABELS[tx.paymentMethod] || 'Outro',
        card ? `"${card.name}"` : '',
        tx.installment ? `${tx.installment.current}/${tx.installment.total}` : '',
        tx.status === 'completed' ? 'Realizado' : 'Pendente',
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
      ].join(';'));
    });

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `finanplan_todas_transacoes_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage({ type: 'success', text: 'Planilha CSV exportada com sucesso!' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.categories) && Array.isArray(parsed.transactions)) {
          onImportData({
            categories: parsed.categories,
            transactions: parsed.transactions,
            cards: Array.isArray(parsed.cards) ? parsed.cards : undefined,
          });
          setMessage({ type: 'success', text: 'Dados restaurados com sucesso do arquivo local!' });
        } else {
          setMessage({ type: 'error', text: 'Formato do arquivo de backup inválido.' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Erro ao processar arquivo JSON local.' });
      }
    };
    reader.readAsText(file);
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatFileDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden transition-all flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Backup & Gestão de Dados
              </h2>
              <p className="text-xs text-slate-500">
                Backup direto no Google Drive, restauração e exportação
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2">
          <button
            onClick={() => setActiveTab('drive')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'drive'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {/* Google Drive Logo Icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
            <span>Google Drive</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
              Nuvem
            </span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'local'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Arquivo Local & CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('danger')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'danger'
                ? 'border-rose-600 text-rose-700 bg-rose-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Gerenciamento</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status Message */}
          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 transition-all ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : message.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              ) : message.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              ) : (
                <Loader2 className="w-5 h-5 shrink-0 text-indigo-600 animate-spin mt-0.5" />
              )}
              <span className="flex-1 font-medium">{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-5">
              {/* Active Account Status Card */}
              <div className="p-4 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/60 border border-indigo-100/80 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-indigo-100 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Google Drive Conectado
                      </p>
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {currentUser?.email ? (
                          <span className="flex items-center gap-1.5">
                            <span>{currentUser.email}</span>
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Ativo" />
                          </span>
                        ) : (
                          'Nenhum e-mail conectado'
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Os backups são salvos e importados com segurança na sua conta do Google Drive.
                      </p>
                    </div>
                  </div>

                  {!currentUser && (
                    <button
                      onClick={async () => {
                        if (onLogin) {
                          onLogin();
                        } else {
                          try {
                            await loginWithGoogle();
                            loadDriveFiles(true);
                          } catch (e) {
                            console.error(e);
                          }
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Cloud className="w-4 h-4" />
                      <span>Conectar com Google</span>
                    </button>
                  )}
                </div>

                {/* 1-Click Backup Action Button */}
                <div className="mt-4 pt-3 border-t border-indigo-100/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">
                      {transactions.length} lançamentos
                    </span>
                    {', '}
                    <span>{categories.length} categorias</span>
                    {' e '}
                    <span>{cards.length} cartões</span>
                  </div>

                  <button
                    onClick={handleBackupToDrive}
                    disabled={isBackingUpToDrive}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    {isBackingUpToDrive ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando no Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 stroke-[2.5]" />
                        <span>Fazer Backup no Google Drive</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Backups List from Google Drive */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Backups no Google Drive ({driveFiles.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => loadDriveFiles(true)}
                    disabled={isLoadingDriveFiles}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5 p-1 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer"
                    title="Atualizar lista de backups do Drive"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                    <span>Atualizar</span>
                  </button>
                </div>

                {isLoadingDriveFiles && driveFiles.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 font-medium">Buscando backups salvos no seu Google Drive...</p>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-slate-500">
                    <Cloud className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                    <p className="text-xs sm:text-sm font-medium text-slate-700">
                      Nenhum backup encontrado no Google Drive ainda.
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                      Clique em <strong className="text-slate-800">"Fazer Backup no Google Drive"</strong> acima para criar uma cópia de segurança instantânea da sua conta.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white max-h-60 overflow-y-auto">
                    {driveFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 sm:p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {file.name}
                            </span>
                            {file.size && (
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {formatFileSize(file.size)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatFileDate(file.createdTime)}</span>
                          </div>
                        </div>

                        {/* Actions for this file */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setConfirmRestoreFile(file)}
                            disabled={restoringFileId === file.id}
                            className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                            title="Restaurar este backup"
                          >
                            {restoringFileId === file.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Importando...</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                                <span>Restaurar</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setConfirmDeleteFile(file)}
                            disabled={deletingFileId === file.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir arquivo do Google Drive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LOCAL JSON & CSV */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Total de Lançamentos:</span>
                  <strong className="text-slate-900 font-mono">{transactions.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total de Categorias:</span>
                  <strong className="text-slate-900 font-mono">{categories.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Cartões Cadastrados:</span>
                  <strong className="text-slate-900 font-mono">{cards.length}</strong>
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Exportar Arquivos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handleExportJSON}
                    className="p-3.5 border border-slate-200 hover:border-indigo-300 rounded-xl text-left hover:bg-indigo-50/20 transition-all flex items-center gap-3 cursor-pointer group shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Backup JSON Local</p>
                      <p className="text-[11px] text-slate-500">Salvar no seu computador</p>
                    </div>
                  </button>

                  <button
                    onClick={handleExportAllCSV}
                    className="p-3.5 border border-slate-200 hover:border-emerald-300 rounded-xl text-left hover:bg-emerald-50/20 transition-all flex items-center gap-3 cursor-pointer group shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Planilha Excel / CSV</p>
                      <p className="text-[11px] text-slate-500">Todos os lançamentos</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Import Local Option */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Restaurar de Arquivo Local</h3>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl text-center hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Selecionar arquivo .JSON do seu computador</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DANGER ZONE / MANAGEMENT */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Ações de redefinição e limpeza de dados locais:
              </p>

              <div className="space-y-2.5">
                <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between gap-3 bg-slate-50/50">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Restaurar Dados de Exemplo</p>
                    <p className="text-[11px] text-slate-500">Recarrega lançamentos, cartões e categorias padrão</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Deseja recarregar os dados de exemplo padrão (incluindo cartões e parcelamentos)?')) {
                        onResetToDemo();
                        setMessage({ type: 'success', text: 'Dados de exemplo restaurados!' });
                      }
                    }}
                    className="px-3.5 py-2 border border-slate-200 hover:bg-white bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar</span>
                  </button>
                </div>

                <div className="p-3.5 border border-rose-200 rounded-xl flex items-center justify-between gap-3 bg-rose-50/30">
                  <div>
                    <p className="text-xs font-bold text-rose-900">Limpar Todas as Transações</p>
                    <p className="text-[11px] text-rose-700">Apaga todos os lançamentos mantendo categorias e cartões</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Tem certeza absoluta que deseja apagar todos os lançamentos? Essa ação não pode ser desfeita.')) {
                        onClearAllTransactions();
                        setMessage({ type: 'success', text: 'Todos os lançamentos foram apagados.' });
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Apagar Tudo</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            {currentUser?.email ? `Conectado como ${currentUser.email}` : 'Armazenamento local'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Explicit User Confirmation Modal for Restoring from Drive (Workspace guidelines) */}
      {confirmRestoreFile && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Confirmar Restauração do Backup</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Deseja restaurar o arquivo <strong className="text-slate-900 font-mono">{confirmRestoreFile.name}</strong> salvo em{' '}
              <strong className="text-slate-900">{formatFileDate(confirmRestoreFile.createdTime)}</strong>?
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <strong className="font-bold">Atenção:</strong> Os lançamentos, cartões e categorias atuais serão atualizados com os dados deste backup.
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmRestoreFile(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExecuteRestoreFromDrive(confirmRestoreFile)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Sim, Restaurar Dados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explicit User Confirmation Modal for Destructive Workspace API Delete (Required) */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Excluir Arquivo do Google Drive?</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Você está prestes a excluir permanentemente o arquivo de backup{' '}
              <strong className="text-slate-900 font-mono">{confirmDeleteFile.name}</strong> do seu Google Drive.
            </p>
            <p className="text-xs text-slate-500">
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDeleteFile(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExecuteDeleteFromDrive(confirmDeleteFile)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
