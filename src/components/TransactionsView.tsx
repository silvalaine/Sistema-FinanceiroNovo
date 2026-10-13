import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Clock, 
  ArrowDownUp, 
  FileSpreadsheet, 
  X,
  Calendar,
  Layers,
  CreditCard as CardIcon,
  Tag,
  CalendarClock,
  Wallet
} from 'lucide-react';
import { Category, CreditCard, PaymentMethod, PeriodFilter, Transaction, TransactionStatus, TransactionType } from '../types/finance';
import { formatCurrency, formatDate, getDateRangeForPeriod, getMonthNamesForRelativePeriods, getTransactionCardDates, PAYMENT_METHOD_LABELS } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

const MONTH_NAMES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const MONTH_SHORT_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

export const matchesTransactionSearch = (
  tx: Transaction,
  query: string,
  categories: Category[],
  cards: CreditCard[]
): boolean => {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;

  // 1. DESCRIÇÃO e textos relacionados
  if (tx.description.toLowerCase().includes(q)) return true;
  if (tx.notes && tx.notes.toLowerCase().includes(q)) return true;

  const cat = categories.find((c) => c.id === tx.categoryId);
  if (cat && cat.name.toLowerCase().includes(q)) return true;

  const sub = cat?.subcategories.find((s) => s.id === tx.subcategoryId);
  if (sub && sub.name.toLowerCase().includes(q)) return true;

  const card = cards.find((c) => c.id === tx.cardId);
  if (card && card.name.toLowerCase().includes(q)) return true;

  const methodLabel = PAYMENT_METHOD_LABELS[tx.paymentMethod];
  if (methodLabel && methodLabel.toLowerCase().includes(q)) return true;

  // 2. DATA (formatos brasileiros DD/MM/AAAA, DD/MM, MM/AAAA, ISO AAAA-MM-DD e nomes de meses)
  const rawDate = tx.date; // "2026-10-06"
  if (rawDate.includes(q)) return true;

  const formattedBr = formatDate(tx.date).toLowerCase(); // "06/10/2026"
  if (formattedBr.includes(q)) return true;

  const parts = rawDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const dayMonth = `${day}/${month}`; // "06/10"
    const monthYear = `${month}/${year}`; // "10/2026"
    const shortYear = year.slice(-2);
    const dayMonthShortYear = `${day}/${month}/${shortYear}`; // "06/10/26"

    if (dayMonth.includes(q) || monthYear.includes(q) || dayMonthShortYear.includes(q)) {
      return true;
    }

    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      if (MONTH_NAMES_PT[mIdx].includes(q) || MONTH_SHORT_PT[mIdx].includes(q)) {
        return true;
      }
      if (mIdx === 2 && 'marco'.includes(q)) {
        return true;
      }
    }
  }

  // 3. VALOR (pesquisa em tempo real por valor numérico, formatado ou parcial)
  const amountStr = tx.amount.toString(); // "150", "28.5"
  const amountFixed2 = tx.amount.toFixed(2); // "150.00", "28.50"
  const amountComma = amountFixed2.replace('.', ','); // "150,00", "28,50"
  const formattedCurrency = formatCurrency(tx.amount).toLowerCase(); // "r$ 150,00"
  const integerPart = Math.floor(tx.amount).toString();

  if (
    amountStr.includes(q) ||
    amountFixed2.includes(q) ||
    amountComma.includes(q) ||
    formattedCurrency.includes(q) ||
    integerPart === q
  ) {
    return true;
  }

  // Tratamento para valores com símbolo ou formatos: "R$ 150", "150,00", "150.00", "28,5"
  const cleanQ = q.replace(/[r$\s]/gi, '').replace(',', '.');
  if (cleanQ && !isNaN(Number(cleanQ))) {
    const qNum = parseFloat(cleanQ);
    if (Math.abs(tx.amount - qNum) < 0.005) return true;
    if (amountFixed2.startsWith(cleanQ) || amountComma.startsWith(cleanQ.replace('.', ','))) {
      return true;
    }
  }

  return false;
};

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  cards: CreditCard[];
  onOpenNewTransaction: (type?: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onDeleteInstallmentGroup?: (groupId: string) => void;
  onToggleStatus: (txId: string) => void;
  onExportCSV: (filteredData: Transaction[]) => void;
  initialCardFilter?: string;
  onOpenPayInvoice?: (cardId?: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  cards,
  onOpenNewTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onDeleteInstallmentGroup,
  onToggleStatus,
  onExportCSV,
  initialCardFilter,
  onOpenPayInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('current_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');

  const monthNames = useMemo(() => getMonthNamesForRelativePeriods(), []);
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [selectedCardId, setSelectedCardId] = useState<string>(initialCardFilter || 'all');
  const [onlyInstallments, setOnlyInstallments] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Compute active date boundaries
  const { startDate, endDate, label: periodLabel } = useMemo(() => {
    return getDateRangeForPeriod(period, customStart, customEnd);
  }, [period, customStart, customEnd]);

  // Selected Category's subcategories
  const availableSubcategories = useMemo(() => {
    if (selectedCategoryId === 'all') return [];
    const cat = categories.find((c) => c.id === selectedCategoryId);
    return cat ? cat.subcategories : [];
  }, [selectedCategoryId, categories]);

  // Handle category filter change
  const handleCategoryFilterChange = (catId: string) => {
    setSelectedCategoryId(catId);
    setSelectedSubcategoryId('all');
  };

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Date range
        if (period !== 'all') {
          if (tx.date < startDate || tx.date > endDate) return false;
        }

        // Type
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

        // Status
        if (statusFilter !== 'all' && tx.status !== statusFilter) return false;

        // Category
        if (selectedCategoryId !== 'all' && tx.categoryId !== selectedCategoryId) return false;

        // Subcategory
        if (selectedSubcategoryId !== 'all' && tx.subcategoryId !== selectedSubcategoryId) return false;

        // Payment method
        if (paymentMethodFilter !== 'all' && tx.paymentMethod !== paymentMethodFilter) return false;

        // Credit Card filter
        if (selectedCardId !== 'all' && tx.cardId !== selectedCardId) return false;

        // Installment filter
        if (onlyInstallments && !tx.installment) return false;

        // Search query: busca em tempo real por descrição, data ou valor
        if (searchQuery.trim()) {
          if (!matchesTransactionSearch(tx, searchQuery, categories, cards)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'date') {
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortField === 'amount') {
          cmp = a.amount - b.amount;
        } else if (sortField === 'description') {
          cmp = a.description.localeCompare(b.description);
        }
        return sortDirection === 'desc' ? -cmp : cmp;
      });
  }, [
    transactions,
    period,
    startDate,
    endDate,
    typeFilter,
    statusFilter,
    selectedCategoryId,
    selectedSubcategoryId,
    paymentMethodFilter,
    selectedCardId,
    onlyInstallments,
    searchQuery,
    sortField,
    sortDirection,
    categories,
    cards,
  ]);

  // Contagem de resultados correspondentes em todo o histórico (caso o período atual esteja restrito)
  const matchingInAllPeriodsCount = useMemo(() => {
    if (!searchQuery.trim() || period === 'all') return 0;
    return transactions.filter((tx) =>
      matchesTransactionSearch(tx, searchQuery, categories, cards)
    ).length;
  }, [transactions, searchQuery, period, categories, cards]);

  // Totals for filtered subset
  const { totalIncome, totalExpense, netTotal } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') inc += tx.amount;
      else exp += tx.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netTotal: inc - exp,
    };
  }, [filteredTransactions]);

  const tableScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = 0;
    }
  }, [period, searchQuery, selectedCategoryId, selectedCardId, typeFilter, statusFilter]);

  const handleSort = (field: 'date' | 'amount' | 'description') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setPeriod('current_month');
    setTypeFilter('all');
    setStatusFilter('all');
    setSelectedCategoryId('all');
    setSelectedSubcategoryId('all');
    setPaymentMethodFilter('all');
    setSelectedCardId('all');
    setOnlyInstallments(false);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    period !== 'current_month' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    selectedCategoryId !== 'all' ||
    selectedSubcategoryId !== 'all' ||
    paymentMethodFilter !== 'all' ||
    selectedCardId !== 'all' ||
    onlyInstallments;

  return (
    <div className="space-y-4">
      {/* Page Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Livro de Lançamentos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento detalhado de transações, pagamentos parcelados e faturas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenPayInvoice && (
            <button
              onClick={() => onOpenPayInvoice(selectedCardId !== 'all' ? selectedCardId : undefined)}
              className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Pagar ou liquidar fatura do cartão de crédito"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pagar Fatura</span>
            </button>
          )}
          <button
            onClick={() => onExportCSV(filteredTransactions)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            title="Exportar registros filtrados para CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => onOpenNewTransaction('income')}
            className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Cadastrar nova receita"
          >
            <Plus className="w-3.5 h-3.5" />
            Receita
          </button>
          <button
            onClick={() => onOpenNewTransaction('expense')}
            title="Novo Lançamento / Despesa (Atalho: Tecla 'N' ou Alt+N)"
            className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Novo Lançamento</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30" title="Atalho: Tecla 'N' ou Alt+N">
              N
            </kbd>
          </button>
        </div>
      </div>

      {/* Filter Surface */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        {/* Row 1: Search & Period & Type Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por descrição, data (ex: 06/10) ou valor (ex: 150,00)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              className="w-full py-2.5 px-3.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="last_month">{monthNames.lastMonth}</option>
              <option value="current_month">{monthNames.currentMonth}</option>
              <option value="next_month">{monthNames.nextMonth}</option>
              <option value="last_3_months">Últimos 3 Meses</option>
              <option value="last_6_months">Últimos 6 Meses</option>
              <option value="current_year">Ano Atual</option>
              <option value="all">Todo o Histórico (Inc. Futuras)</option>
              <option value="custom">Personalizado...</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full">
              <button
                onClick={() => setTypeFilter('all')}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'income' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Receitas
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'expense' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Despesas
              </button>
            </div>
          </div>
        </div>

        {/* Live Search Status Chip */}
        {searchQuery.trim() && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-950">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Filtrando em tempo real por <strong>"{searchQuery}"</strong> (descrição, data ou valor)
              </span>
              <span className="bg-indigo-100 text-indigo-800 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                {filteredTransactions.length} {filteredTransactions.length === 1 ? 'resultado' : 'resultados'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-sm font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
            >
              Limpar busca
            </button>
          </div>
        )}

        {/* Suggestion to search across all periods if 0 results in current period but matches exist in others */}
        {searchQuery.trim() && filteredTransactions.length === 0 && matchingInAllPeriodsCount > 0 && (
          <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <span>
              Nenhum resultado no período selecionado, mas encontramos <strong>{matchingInAllPeriodsCount}</strong> lançamento(s) para <strong>"{searchQuery}"</strong> em outros períodos.
            </span>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className="font-bold text-amber-800 hover:text-amber-950 underline ml-2 whitespace-nowrap cursor-pointer text-sm"
            >
              Ver em Todo o Histórico
            </button>
          </div>
        )}

        {/* Row 2: Custom date range (if selected) */}
        {period === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 font-semibold">De:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 font-semibold">Até:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Row 3: Filters: Category, Subcategory, Cartão de Crédito, Forma de Pagamento */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Categoria
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              className="w-full py-2 px-3 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas Categorias</option>
              {categories
                .filter((c) => typeFilter === 'all' || c.type === typeFilter)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Subcategoria
            </label>
            <select
              disabled={selectedCategoryId === 'all'}
              value={selectedSubcategoryId}
              onChange={(e) => setSelectedSubcategoryId(e.target.value)}
              className="w-full py-2 px-3 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas Subcategorias</option>
              {availableSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cartão de Crédito Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Cartão de Crédito
            </label>
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="w-full py-2 px-3 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Cartões</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Forma de Pagto
            </label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value as 'all' | PaymentMethod)}
              className="w-full py-2 px-3 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas Formas</option>
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((key) => (
                <option key={key} value={key}>
                  {PAYMENT_METHOD_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | TransactionStatus)}
              className="w-full py-2 px-3 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Status</option>
              <option value="completed">Realizados</option>
              <option value="pending">Pendentes</option>
            </select>
          </div>
        </div>

        {/* Parcelamento toggle filter */}
        <div className="flex items-center justify-between text-sm text-slate-600 pt-2.5 border-t border-slate-100">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyInstallments}
              onChange={(e) => setOnlyInstallments(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5"
            />
            <span className="font-semibold text-slate-800">
              Exibir apenas compras parceladas
            </span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-sm cursor-pointer"
            >
              Limpar Todos os Filtros
            </button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div>
          <span className="text-slate-500 text-xs sm:text-sm font-medium block">Registros</span>
          <span className="font-mono font-bold text-slate-900 text-base sm:text-lg tabular-nums">
            {filteredTransactions.length} lançamentos
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-xs sm:text-sm font-medium block">Receitas Filtradas</span>
          <span className="font-mono font-bold text-emerald-600 text-base sm:text-lg tabular-nums">
            +{formatCurrency(totalIncome)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-xs sm:text-sm font-medium block">Despesas Filtradas</span>
          <span className="font-mono font-bold text-rose-600 text-base sm:text-lg tabular-nums">
            -{formatCurrency(totalExpense)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-xs sm:text-sm font-medium block">Saldo do Período</span>
          <span
            className={`font-mono font-bold text-base sm:text-lg tabular-nums ${
              netTotal >= 0 ? 'text-slate-900' : 'text-rose-700'
            }`}
          >
            {formatCurrency(netTotal)}
          </span>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div ref={tableScrollRef} className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm sm:text-[15px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 select-none">
                <th
                  onClick={() => handleSort('date')}
                  className="py-3 px-3 sm:px-4 font-bold cursor-pointer hover:text-slate-950 text-xs uppercase tracking-wider whitespace-nowrap"
                  title="Ordenar por data"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Data</span>
                    {sortField === 'date' && (
                      <span className="text-xs text-indigo-600 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('description')}
                  className="py-3 px-3 sm:px-4 font-bold cursor-pointer hover:text-slate-950 text-xs uppercase tracking-wider min-w-[150px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Descrição</span>
                    {sortField === 'description' && (
                      <span className="text-xs text-indigo-600 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 sm:px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                  Categoria
                </th>
                <th className="py-3 px-3 sm:px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                  Forma / Cartão
                </th>
                <th className="py-3 px-2 sm:px-3 font-bold text-center text-xs uppercase tracking-wider whitespace-nowrap min-w-[95px]">
                  Status
                </th>
                <th
                  onClick={() => handleSort('amount')}
                  className="py-3 px-3 sm:px-4 font-bold text-right cursor-pointer hover:text-slate-950 text-xs uppercase tracking-wider whitespace-nowrap min-w-[120px]"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Valor (R$)</span>
                    {sortField === 'amount' && (
                      <span className="text-xs text-indigo-600 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-2 sm:px-3 font-bold text-center text-xs uppercase tracking-wider whitespace-nowrap w-20 min-w-[75px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <p className="font-semibold text-slate-800 text-base mb-1.5">
                      {searchQuery.trim()
                        ? `Nenhum lançamento encontrado para "${searchQuery}"`
                        : 'Nenhum lançamento encontrado'}
                    </p>
                    <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
                      {searchQuery.trim()
                        ? 'Verifique se a descrição, data ou valor foi digitado corretamente ou tente buscar em todo o histórico.'
                        : 'Tente alterar os filtros ou adicione uma nova transação.'}
                    </p>
                    <div className="flex items-center justify-center gap-2.5 flex-wrap">
                      {searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                        >
                          Limpar busca
                        </button>
                      )}
                      {searchQuery.trim() && period !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setPeriod('all')}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                        >
                          Buscar em todo o histórico
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenNewTransaction()}
                        title="Novo Lançamento (Atalho: Tecla 'N')"
                        className="px-4.5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-bold transition-colors cursor-pointer shadow-sm shadow-indigo-200 flex items-center gap-2"
                      >
                        <span>+ Novo Lançamento</span>
                        <kbd className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                          N
                        </kbd>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  const sub = cat?.subcategories.find((s) => s.id === tx.subcategoryId);
                  const card = cards.find((c) => c.id === tx.cardId);
                  const cardDates = getTransactionCardDates(tx, cards);

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap text-sm font-medium">
                        {cardDates.isCreditCard ? (
                          <div className="flex flex-col gap-0.5 leading-tight">
                            <div className="flex items-center gap-1.5" title="Data da compra">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                                Compra
                              </span>
                              <span className="font-mono text-slate-900 font-semibold text-xs sm:text-sm">
                                {formatDate(cardDates.purchaseDate)}
                              </span>
                            </div>
                            {cardDates.dueDate && (
                              <div className="flex items-center gap-1 text-amber-900" title="Vencimento da fatura do cartão">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded shrink-0 flex items-center gap-0.5">
                                  <CalendarClock className="w-2.5 h-2.5" />
                                  Venc.
                                </span>
                                <span className="font-mono font-bold text-amber-950 text-xs sm:text-sm">
                                  {formatDate(cardDates.dueDate)}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono text-slate-800 font-semibold text-xs sm:text-sm">
                            {formatDate(tx.date)}
                          </span>
                        )}
                      </td>

                      {/* Description with Installment indicator */}
                      <td className="py-3 px-3 sm:px-4 min-w-[150px] max-w-[280px]">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 truncate text-sm sm:text-base">
                            {tx.description}
                          </p>
                          {tx.installment && (
                            <span className="shrink-0 text-xs font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold">
                              {tx.installment.current}/{tx.installment.total}
                            </span>
                          )}
                        </div>
                        {tx.notes && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {tx.notes}
                          </p>
                        )}
                      </td>

                      {/* Category & Subcategory */}
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap min-w-[120px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: cat?.color || '#94a3b8' }}
                          />
                          <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate max-w-[110px]">
                            {cat?.name || 'Não categorizado'}
                          </span>
                          {sub && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">/</span>
                              <span className="text-slate-500 text-xs font-medium truncate max-w-[90px]">{sub.name}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Payment method & Credit Card */}
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap min-w-[120px]">
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          {tx.paymentMethod === 'credit_card' && card ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: card.color }}
                                />
                                <span className="font-semibold text-slate-900 truncate max-w-[110px]">
                                  {card.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-700 font-medium">
                              {PAYMENT_METHOD_LABELS[tx.paymentMethod] || 'Outro'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status toggle */}
                      <td className="py-3 px-2 sm:px-3 text-center whitespace-nowrap min-w-[95px]">
                        <button
                          onClick={() => onToggleStatus(tx.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            tx.status === 'completed'
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60'
                              : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60'
                          }`}
                        >
                          {tx.status === 'completed' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Realizado
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Pendente
                            </>
                          )}
                        </button>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap font-mono tabular-nums font-extrabold text-sm sm:text-base min-w-[120px]">
                        <span
                          className={
                            tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                          }
                        >
                          {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-2 sm:px-3 text-center whitespace-nowrap w-20 min-w-[75px]">
                        <div className="flex items-center justify-center gap-1 shrink-0">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Editar lançamento"
                          >
                            <Edit2 className="w-4 h-4 shrink-0" />
                          </button>
                          <button
                            onClick={() => {
                              if (tx.installment && onDeleteInstallmentGroup) {
                                const choice = confirm(
                                  `Esta despesa faz parte de um parcelamento (${tx.installment.current}/${tx.installment.total}).\n\nClique em OK para excluir TODAS as parcelas deste grupo, ou Cancelar para excluir apenas esta parcela.`
                                );
                                if (choice) {
                                  onDeleteInstallmentGroup(tx.installment.groupId);
                                  return;
                                }
                              }
                              if (confirm(`Excluir lançamento "${tx.description}"?`)) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-4 h-4 shrink-0" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
