import React, { useState, useEffect } from 'react';
import { 
  loadStoredCategories, 
  loadStoredTransactions, 
  loadStoredCards,
  saveStoredCategories, 
  saveStoredTransactions, 
  saveStoredCards,
  resetAllDataToDefault,
  DEFAULT_CATEGORIES,
  DEFAULT_CREDIT_CARDS
} from './data/initialData';
import { Category, CreditCard, Transaction, TransactionType } from './types/finance';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { CreditCardsView } from './components/CreditCardsView';
import { CategoriesView } from './components/CategoriesView';
import { ReportsView } from './components/ReportsView';
import { TransactionModal } from './components/TransactionModal';
import { CategoryModal } from './components/CategoryModal';
import { CreditCardModal } from './components/CreditCardModal';
import { ExportModal } from './components/ExportModal';
import { PayInvoiceModal } from './components/PayInvoiceModal';
import { ShareModal } from './components/ShareModal';
import { 
  auth, 
  loginWithGoogle, 
  logout, 
  subscribeToUserData, 
  initializeCloudDataIfEmpty,
  saveCategoryCloud,
  deleteCategoryCloud,
  saveCardCloud,
  deleteCardCloud,
  saveTransactionCloud,
  saveMultipleTransactionsCloud,
  deleteTransactionCloud,
  deleteInstallmentGroupCloud
} from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Smartphone, Monitor, CheckCircle2, Cloud, ArrowRight, X } from 'lucide-react';

export default function App() {
  const [categories, setCategories] = useState<Category[]>(() => loadStoredCategories());
  const [cards, setCards] = useState<CreditCard[]>(() => loadStoredCards());
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadStoredTransactions());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedCardFilter, setSelectedCardFilter] = useState<string>('all');

  // Firebase Realtime & Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showSyncBanner, setShowSyncBanner] = useState<boolean>(true);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [defaultTxType, setDefaultTxType] = useState<TransactionType>('expense');

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [defaultCatType, setDefaultCatType] = useState<TransactionType>('expense');

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Pay Invoice Modal state
  const [isPayInvoiceModalOpen, setIsPayInvoiceModalOpen] = useState(false);
  const [payInvoiceCardId, setPayInvoiceCardId] = useState<string | undefined>(undefined);
  const [payInvoiceMonthKey, setPayInvoiceMonthKey] = useState<string | undefined>(undefined);

  // Sync to localStorage as backup/offline storage
  useEffect(() => {
    saveStoredCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveStoredCards(cards);
  }, [cards]);

  useEffect(() => {
    saveStoredTransactions(transactions);
  }, [transactions]);

  // Listen to Firebase Auth state and setup realtime Firestore listeners
  useEffect(() => {
    let unsubscribeSync: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        setIsSyncing(true);
        try {
          // Initialize remote database with current state if empty
          await initializeCloudDataIfEmpty(user.uid, {
            categories,
            cards,
            transactions,
          });
        } catch (err) {
          console.warn('Initial cloud seed notice:', err);
        }

        // Realtime sync from Firestore
        unsubscribeSync = subscribeToUserData(user.uid, {
          onCategories: (cloudCats) => {
            if (cloudCats.length > 0) setCategories(cloudCats);
          },
          onCards: (cloudCards) => {
            if (cloudCards.length > 0) setCards(cloudCards);
          },
          onTransactions: (cloudTxs) => {
            setTransactions(cloudTxs);
          },
        });

        setIsSyncing(false);
        setSyncNotice('Sincronização em tempo real ativa! Suas alterações no PC aparecem no celular instantaneamente.');
        setTimeout(() => setSyncNotice(null), 8000);
      } else {
        if (unsubscribeSync) {
          unsubscribeSync();
          unsubscribeSync = undefined;
        }
        setIsSyncing(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSync) unsubscribeSync();
    };
  }, []);

  // Google Login / Logout handlers
  const handleLogin = async () => {
    try {
      setIsSyncing(true);
      await loginWithGoogle();
    } catch (err) {
      console.error('Login error:', err);
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSyncNotice(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Transaction Handlers
  const handleOpenNewTransaction = (type: TransactionType = 'expense') => {
    setEditingTransaction(null);
    setDefaultTxType(type);
    setIsTxModalOpen(true);
  };

  // Global Keyboard Shortcuts:
  // - Press 'N' (or 'n', or '+') when not editing form fields to quickly add a new transaction
  // - Press 'Alt + N' anywhere
  // - Press 'Escape' to close any open modal
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. ESC closes open modals
      if (e.key === 'Escape') {
        if (isTxModalOpen) setIsTxModalOpen(false);
        else if (isPayInvoiceModalOpen) setIsPayInvoiceModalOpen(false);
        else if (isCardModalOpen) setIsCardModalOpen(false);
        else if (isCatModalOpen) setIsCatModalOpen(false);
        else if (isExportModalOpen) setIsExportModalOpen(false);
        return;
      }

      // If a modal is open, do not open another new transaction modal
      if (isTxModalOpen || isPayInvoiceModalOpen || isCardModalOpen || isCatModalOpen || isExportModalOpen) {
        return;
      }

      // Check if target is editable (input, textarea, select, contenteditable)
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      const isAltN = e.altKey && (e.key === 'n' || e.key === 'N');
      const isSingleN = !e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'n' || e.key === 'N') && !isInput;
      const isPlusKey = !e.altKey && !e.ctrlKey && !e.metaKey && e.key === '+' && !isInput;

      if (isAltN || isSingleN || isPlusKey) {
        e.preventDefault();
        handleOpenNewTransaction('expense');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isTxModalOpen, isPayInvoiceModalOpen, isCardModalOpen, isCatModalOpen, isExportModalOpen]);

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setDefaultTxType(tx.type);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }
  ) => {
    if (txData.id) {
      // Update
      const updatedTx: Transaction = {
        ...txData,
        id: txData.id,
        createdAt: editingTransaction?.createdAt || new Date().toISOString(),
      };
      setTransactions((prev) =>
        prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
      );
      if (currentUser) {
        saveTransactionCloud(currentUser.uid, updatedTx);
      }
    } else {
      // Create new single
      const newTx: Transaction = {
        ...txData,
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);
      if (currentUser) {
        saveTransactionCloud(currentUser.uid, newTx);
      }
    }
  };

  // Multiple transactions (e.g. Generated installments)
  const handleSaveMultipleTransactions = (
    newTxsData: Omit<Transaction, 'id' | 'createdAt'>[]
  ) => {
    const formatted: Transaction[] = newTxsData.map((data, idx) => ({
      ...data,
      id: `tx-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    }));
    setTransactions((prev) => [...formatted, ...prev]);
    if (currentUser) {
      saveMultipleTransactionsCloud(currentUser.uid, formatted);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (currentUser) {
      deleteTransactionCloud(currentUser.uid, id);
    }
  };

  const handleDeleteInstallmentGroup = (groupId: string) => {
    setTransactions((prev) =>
      prev.filter((t) => !t.installment || t.installment.groupId !== groupId)
    );
    if (currentUser) {
      deleteInstallmentGroupCloud(currentUser.uid, groupId);
    }
  };

  const handleToggleStatus = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated: Transaction = {
            ...t,
            status: t.status === 'completed' ? 'pending' : 'completed',
          };
          if (currentUser) {
            saveTransactionCloud(currentUser.uid, updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Card Handlers
  const handleOpenNewCard = () => {
    setEditingCard(null);
    setIsCardModalOpen(true);
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setIsCardModalOpen(true);
  };

  const handleSaveCard = (card: CreditCard) => {
    setCards((prev) => {
      const exists = prev.some((c) => c.id === card.id);
      if (exists) {
        return prev.map((c) => (c.id === card.id ? card : c));
      }
      return [...prev, card];
    });
    if (currentUser) {
      saveCardCloud(currentUser.uid, card);
    }
  };

  const handleDeleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setTransactions((prev) =>
      prev.map((t) => (t.cardId === cardId ? { ...t, cardId: undefined } : t))
    );
    if (currentUser) {
      deleteCardCloud(currentUser.uid, cardId);
    }
  };

  const handleFilterTransactionsByCard = (cardId: string) => {
    setSelectedCardFilter(cardId);
    setActiveTab('transactions');
  };

  // Pay Invoice Handlers
  const handleOpenPayInvoice = (cardId?: string, monthKey?: string) => {
    setPayInvoiceCardId(cardId);
    setPayInvoiceMonthKey(monthKey);
    setIsPayInvoiceModalOpen(true);
  };

  const handleConfirmPayInvoice = (
    updatedTransactions: Transaction[],
    paymentRecord?: Omit<Transaction, 'id' | 'createdAt'>
  ) => {
    const updatedMap = new Map(updatedTransactions.map((t) => [t.id, t]));
    let paymentTx: Transaction | undefined;
    if (paymentRecord) {
      paymentTx = {
        ...paymentRecord,
        id: `tx-${Date.now()}-pay-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
    }

    setTransactions((prev) => {
      let next = prev.map((t) => updatedMap.get(t.id) || t);
      if (paymentTx) {
        next = [paymentTx, ...next];
      }
      return next;
    });

    if (currentUser) {
      saveMultipleTransactionsCloud(currentUser.uid, updatedTransactions);
      if (paymentTx) {
        saveTransactionCloud(currentUser.uid, paymentTx);
      }
    }
  };

  // Category Handlers
  const handleOpenNewCategory = (type: TransactionType = 'expense') => {
    setEditingCategory(null);
    setDefaultCatType(type);
    setIsCatModalOpen(true);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setDefaultCatType(cat.type);
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = (cat: Category) => {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === cat.id);
      if (exists) {
        return prev.map((c) => (c.id === cat.id ? cat : c));
      }
      return [...prev, cat];
    });
    if (currentUser) {
      saveCategoryCloud(currentUser.uid, cat);
    }
  };

  const handleDeleteCategory = (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    if (currentUser) {
      deleteCategoryCloud(currentUser.uid, catId);
    }
  };

  const handleAddSubcategory = (catId: string, subName: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId) {
          const newSub = {
            id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            name: subName,
          };
          const updated = {
            ...c,
            subcategories: [...(c.subcategories || []), newSub],
          };
          if (currentUser) {
            saveCategoryCloud(currentUser.uid, updated);
          }
          return updated;
        }
        return c;
      })
    );
  };

  const handleDeleteSubcategory = (catId: string, subId: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId) {
          const updated = {
            ...c,
            subcategories: (c.subcategories || []).filter((s) => s.id !== subId),
          };
          if (currentUser) {
            saveCategoryCloud(currentUser.uid, updated);
          }
          return updated;
        }
        return c;
      })
    );
  };

  // CSV Export for filtered transactions
  const handleExportCSV = (dataToExport: Transaction[]) => {
    const csvRows: string[] = [];
    csvRows.push(['Data', 'Descrição', 'Tipo', 'Categoria', 'Subcategoria', 'Valor (R$)', 'Forma de Pagamento', 'Cartão', 'Parcelamento', 'Status', 'Notas'].join(';'));
    
    dataToExport.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const sub = cat?.subcategories.find((s) => s.id === tx.subcategoryId);
      const card = cards.find((c) => c.id === tx.cardId);

      csvRows.push([
        tx.date,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.type === 'income' ? 'Receita' : 'Despesa',
        `"${(cat?.name || '').replace(/"/g, '""')}"`,
        `"${(sub?.name || '').replace(/"/g, '""')}"`,
        tx.amount.toFixed(2).replace('.', ','),
        tx.paymentMethod,
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
    link.setAttribute('download', `finanplan_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Backup Import & Reset
  const handleImportData = (data: {
    categories: Category[];
    transactions: Transaction[];
    cards?: CreditCard[];
  }) => {
    setCategories(data.categories);
    setTransactions(data.transactions);
    if (data.cards) setCards(data.cards);

    if (currentUser) {
      data.categories.forEach((cat) => saveCategoryCloud(currentUser.uid, cat));
      if (data.cards) data.cards.forEach((card) => saveCardCloud(currentUser.uid, card));
      saveMultipleTransactionsCloud(currentUser.uid, data.transactions);
    }
  };

  const handleResetToDemo = () => {
    const { categories: newCats, transactions: newTxs, cards: newCards } = resetAllDataToDefault();
    setCategories(newCats);
    setTransactions(newTxs);
    setCards(newCards);

    if (currentUser) {
      newCats.forEach((cat) => saveCategoryCloud(currentUser.uid, cat));
      newCards.forEach((card) => saveCardCloud(currentUser.uid, card));
      saveMultipleTransactionsCloud(currentUser.uid, newTxs);
    }
  };

  const handleClearAllTransactions = () => {
    setTransactions([]);
    if (currentUser) {
      transactions.forEach((tx) => deleteTransactionCloud(currentUser.uid, tx.id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'transactions') setSelectedCardFilter('all');
          setActiveTab(tab);
        }}
        onOpenNewTransaction={() => handleOpenNewTransaction()}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        totalTransactionsCount={transactions.length}
        currentUser={currentUser}
        isSyncing={isSyncing}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Sync Status Banner */}
      {syncNotice && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-all flex items-center justify-between no-print animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-200" />
              <span>{syncNotice}</span>
            </div>
            <button
              onClick={() => setSyncNotice(null)}
              className="p-1 hover:bg-emerald-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Multi-Device Sync Callout if not logged in */}
      {!currentUser && showSyncBanner && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white px-4 py-3 border-b border-indigo-700/50 shadow-xs no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <div className="flex items-center -space-x-1">
                  <Monitor className="w-4 h-4 text-indigo-200" />
                  <Smartphone className="w-4 h-4 text-emerald-300" />
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white leading-tight">
                  Sincronização em Tempo Real (PC & Celular)
                </p>
                <p className="text-xs text-indigo-200 leading-tight mt-0.5">
                  Conecte sua conta Google para acessar e atualizar suas finanças no computador e no celular simultaneamente.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-3 py-1.5 text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
                title="Abrir no Celular via QR Code ou Link"
              >
                <Smartphone className="w-4 h-4 text-emerald-300" />
                <span>Acessar no Celular</span>
              </button>
              <button
                onClick={handleLogin}
                className="px-4 py-1.5 text-xs sm:text-sm font-bold bg-white text-indigo-950 hover:bg-indigo-50 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Cloud className="w-4 h-4 text-indigo-600" />
                <span>Ativar Sincronização</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowSyncBanner(false)}
                title="Fechar aviso"
                className="p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            transactions={transactions}
            categories={categories}
            cards={cards}
            onOpenNewTransaction={handleOpenNewTransaction}
            onEditTransaction={handleEditTransaction}
            onToggleStatus={handleToggleStatus}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenPayInvoice={handleOpenPayInvoice}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            categories={categories}
            cards={cards}
            onOpenNewTransaction={handleOpenNewTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onDeleteInstallmentGroup={handleDeleteInstallmentGroup}
            onToggleStatus={handleToggleStatus}
            onExportCSV={handleExportCSV}
            initialCardFilter={selectedCardFilter}
            onOpenPayInvoice={handleOpenPayInvoice}
          />
        )}

        {activeTab === 'cards' && (
          <CreditCardsView
            cards={cards}
            transactions={transactions}
            onOpenNewCard={handleOpenNewCard}
            onEditCard={handleEditCard}
            onDeleteCard={handleDeleteCard}
            onFilterTransactionsByCard={handleFilterTransactionsByCard}
            onOpenPayInvoice={handleOpenPayInvoice}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            categories={categories}
            transactions={transactions}
            onOpenNewCategory={handleOpenNewCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddSubcategory={handleAddSubcategory}
            onDeleteSubcategory={handleDeleteSubcategory}
            onResetDefaults={() => setCategories(DEFAULT_CATEGORIES)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            categories={categories}
            cards={cards}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-600">FinanPlan · Gestão Financeira, Cartões de Crédito & Parcelamentos</span>
          <div className="flex items-center gap-2 text-slate-500">
            {currentUser ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sincronizado na nuvem (PC & Celular simultâneo)
              </span>
            ) : (
              <span>Armazenamento local ativo · Conecte com Google para sincronizar em múltiplos dispositivos</span>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSave={handleSaveTransaction}
        onSaveMultiple={handleSaveMultipleTransactions}
        categories={categories}
        cards={cards}
        initialTransaction={editingTransaction}
        onQuickAddSubcategory={handleAddSubcategory}
        defaultType={defaultTxType}
      />

      <CreditCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onSave={handleSaveCard}
        initialCard={editingCard}
      />

      <CategoryModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        onSave={handleSaveCategory}
        initialCategory={editingCategory}
        defaultType={defaultCatType}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        categories={categories}
        cards={cards}
        transactions={transactions}
        onImportData={handleImportData}
        onResetToDemo={handleResetToDemo}
        onClearAllTransactions={handleClearAllTransactions}
        currentUser={currentUser}
        onLogin={handleLogin}
      />

      <PayInvoiceModal
        isOpen={isPayInvoiceModalOpen}
        onClose={() => setIsPayInvoiceModalOpen(false)}
        cards={cards}
        transactions={transactions}
        categories={categories}
        initialCardId={payInvoiceCardId}
        initialMonthKey={payInvoiceMonthKey}
        onConfirmPayment={handleConfirmPayInvoice}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentUserEmail={currentUser?.email}
      />
    </div>
  );
}
