import React, { useState, useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  ChevronRight,
  CreditCard as CardIcon,
  BarChart3,
  PieChart,
  Target,
  Plus,
  Wallet
} from 'lucide-react';
import { Category, CreditCard, PeriodFilter, Transaction, TransactionType } from '../types/finance';
import { formatCurrency, formatPercent, formatDate, getDateRangeForPeriod, formatShortMonth, getMonthNamesForRelativePeriods } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface DashboardViewProps {
  transactions: Transaction[];
  categories: Category[];
  cards: CreditCard[];
  onOpenNewTransaction: (type?: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
  onToggleStatus: (txId: string) => void;
  onNavigateToTab: (tab: 'transactions' | 'cards' | 'categories' | 'reports') => void;
  onOpenPayInvoice?: (cardId?: string, monthKey?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  categories,
  cards,
  onOpenNewTransaction,
  onEditTransaction,
  onNavigateToTab,
  onOpenPayInvoice,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('current_month');
  const [analysisTab, setAnalysisTab] = useState<'evolution' | 'categories' | 'budgets'>('evolution');
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<string | null>(null);

  const monthNames = useMemo(() => getMonthNamesForRelativePeriods(), []);

  const { startDate, endDate, label: periodLabel } = useMemo(() => {
    return getDateRangeForPeriod(period);
  }, [period]);

  // Filter transactions in selected period
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date >= startDate && tx.date <= endDate);
  }, [transactions, startDate, endDate]);

  // Totals
  const {
    totalIncome,
    totalExpense,
    netBalance,
    pendingIncome,
    pendingExpense,
    completedIncome,
    completedExpense,
    savingsRate,
    creditCardInvoiceTotal,
    installmentTransactionsCount,
  } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let pendInc = 0;
    let pendExp = 0;
    let compInc = 0;
    let compExp = 0;
    let cardExp = 0;
    let instCount = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') {
        income += tx.amount;
        if (tx.status === 'pending') pendInc += tx.amount;
        else compInc += tx.amount;
      } else {
        expense += tx.amount;
        if (tx.status === 'pending') pendExp += tx.amount;
        else compExp += tx.amount;

        if (tx.paymentMethod === 'credit_card') {
          cardExp += tx.amount;
        }
        if (tx.installment) {
          instCount += 1;
        }
      }
    });

    const net = income - expense;
    const rate = income > 0 ? Math.max(0, ((income - expense) / income) * 100) : 0;

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: net,
      pendingIncome: pendInc,
      pendingExpense: pendExp,
      completedIncome: compInc,
      completedExpense: compExp,
      savingsRate: rate,
      creditCardInvoiceTotal: cardExp,
      installmentTransactionsCount: instCount,
    };
  }, [filteredTransactions]);

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, { category: Category; total: number; count: number; subcategoriesMap: Map<string, number> }>();

    filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        const cat = categories.find((c) => c.id === tx.categoryId) || {
          id: tx.categoryId,
          name: 'Outros',
          type: 'expense' as const,
          color: '#64748B',
          icon: 'Tag',
          subcategories: [],
        };

        if (!map.has(cat.id)) {
          map.set(cat.id, {
            category: cat,
            total: 0,
            count: 0,
            subcategoriesMap: new Map(),
          });
        }

        const entry = map.get(cat.id)!;
        entry.total += tx.amount;
        entry.count += 1;

        const subTotal = entry.subcategoriesMap.get(tx.subcategoryId) || 0;
        entry.subcategoriesMap.set(tx.subcategoryId, subTotal + tx.amount);
      });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredTransactions, categories]);

  // Last 6 months cashflow (includes next month when selected for projection)
  const monthlyFlow = useMemo(() => {
    const now = new Date();
    const monthsMap = new Map<string, { monthKey: string; income: number; expense: number }>();

    const includeNext = period === 'next_month';
    const startOffset = includeNext ? 4 : 5;
    const endOffset = includeNext ? -1 : 0;

    for (let i = startOffset; i >= endOffset; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap.set(key, { monthKey: key, income: 0, expense: 0 });
    }

    transactions.forEach((tx) => {
      const key = tx.date.slice(0, 7);
      if (monthsMap.has(key)) {
        const entry = monthsMap.get(key)!;
        if (tx.type === 'income') {
          entry.income += tx.amount;
        } else {
          entry.expense += tx.amount;
        }
      }
    });

    return Array.from(monthsMap.values());
  }, [transactions, period]);

  const maxMonthlyVal = useMemo(() => {
    const max = Math.max(...monthlyFlow.map((m) => Math.max(m.income, m.expense)), 1000);
    return Math.ceil(max / 1000) * 1000;
  }, [monthlyFlow]);

  // Categories exceeding or nearing budget
  const budgetAlerts = useMemo(() => {
    return expensesByCategory
      .filter((item) => item.category.budgetLimit && item.category.budgetLimit > 0)
      .map((item) => {
        const limit = item.category.budgetLimit!;
        const percent = (item.total / limit) * 100;
        return {
          ...item,
          budgetLimit: limit,
          percentageUsed: percent,
        };
      })
      .sort((a, b) => b.percentageUsed - a.percentageUsed);
  }, [expensesByCategory]);

  const exceededBudgetsCount = useMemo(() => {
    return budgetAlerts.filter((b) => b.percentageUsed > 100).length;
  }, [budgetAlerts]);

  // Recent 5 transactions
  const recentTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Painel Financeiro
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Visão consolidada de receitas, despesas, cartões e fluxo de caixa
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {(
              [
                { id: 'last_month', label: monthNames.lastMonth },
                { id: 'current_month', label: monthNames.currentMonth },
                { id: 'next_month', label: monthNames.nextMonth },
                { id: 'last_3_months', label: '3 Meses' },
                { id: 'current_year', label: 'Ano' },
                { id: 'all', label: 'Tudo' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={`px-3.5 py-2 text-sm sm:text-base font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  period === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => onOpenNewTransaction()}
            className="px-4.5 py-2.5 text-sm sm:text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Primary Metric Cards with Larger, Readable Typography */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Líquido */}
        <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-sm sm:text-base text-slate-500 mb-2">
              <span className="font-bold text-slate-700">Saldo Líquido</span>
              <span className={`text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg ${
                netBalance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {netBalance >= 0 ? `+${savingsRate.toFixed(0)}% poupado` : 'Déficit'}
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatCurrency(netBalance)}
            </div>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between font-mono tabular-nums font-medium">
            <span>Rec: <strong className="text-emerald-700">{formatCurrency(totalIncome)}</strong></span>
            <span>Desp: <strong className="text-rose-700">{formatCurrency(totalExpense)}</strong></span>
          </div>
        </div>

        {/* Total Receitas */}
        <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-sm sm:text-base text-slate-500 mb-2">
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <ArrowUpRight className="w-4.5 h-4.5" />
                Receitas Totais
              </span>
              {pendingIncome > 0 && (
                <span className="text-xs sm:text-sm text-amber-600 font-mono font-semibold">
                  {formatCurrency(pendingIncome)} pendente
                </span>
              )}
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-mono tabular-nums tracking-tight">
              +{formatCurrency(totalIncome)}
            </div>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between font-medium">
            <span>Realizado: <strong className="font-mono text-slate-800">{formatCurrency(completedIncome)}</strong></span>
            <span className="text-slate-500">({filteredTransactions.filter(t => t.type === 'income').length} entradas)</span>
          </div>
        </div>

        {/* Total Despesas */}
        <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-sm sm:text-base text-slate-500 mb-2">
              <span className="flex items-center gap-1.5 text-rose-700 font-bold">
                <ArrowDownRight className="w-4.5 h-4.5" />
                Despesas Totais
              </span>
              {pendingExpense > 0 && (
                <span className="text-xs sm:text-sm text-amber-600 font-mono font-semibold">
                  {formatCurrency(pendingExpense)} a pagar
                </span>
              )}
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-rose-600 font-mono tabular-nums tracking-tight">
              -{formatCurrency(totalExpense)}
            </div>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between font-medium">
            <span>Quitado: <strong className="font-mono text-slate-800">{formatCurrency(completedExpense)}</strong></span>
            <span className="text-slate-500">({filteredTransactions.filter(t => t.type === 'expense').length} saídas)</span>
          </div>
        </div>

        {/* Fatura de Cartões & Parcelamentos */}
        <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-sm sm:text-base text-slate-500 mb-2">
              <span className="flex items-center gap-1.5 text-indigo-700 font-bold">
                <CardIcon className="w-4.5 h-4.5" />
                Fatura de Cartões
              </span>
              <div className="flex items-center gap-2">
                {onOpenPayInvoice && (
                  <button
                    onClick={() => onOpenPayInvoice()}
                    className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200/60 transition-colors"
                    title="Pagar fatura de cartão de crédito"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Pagar Fatura</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigateToTab('cards')}
                  className="text-xs sm:text-sm text-indigo-600 hover:underline font-bold cursor-pointer"
                >
                  Gerenciar
                </button>
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatCurrency(creditCardInvoiceTotal)}
            </div>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between font-medium">
            <span>{cards.length} {cards.length === 1 ? 'cartão ativo' : 'cartões ativos'}</span>
            <span className="text-indigo-600 font-bold font-mono">{installmentTransactionsCount} parceladas</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Analysis Center vs Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Interactive Analysis Center with Tabs */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header with Segmented Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Análise Financeira
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {periodLabel} · Visualização consolidada
                </p>
              </div>

              {/* Segmented Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAnalysisTab('evolution')}
                  className={`px-3.5 py-2 text-sm sm:text-base font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                    analysisTab === 'evolution'
                      ? 'bg-white text-indigo-950 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-4.5 h-4.5 text-indigo-600" />
                  <span>Fluxo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisTab('categories')}
                  className={`px-3.5 py-2 text-sm sm:text-base font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                    analysisTab === 'categories'
                      ? 'bg-white text-indigo-950 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PieChart className="w-4.5 h-4.5 text-indigo-600" />
                  <span>Categorias</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisTab('budgets')}
                  className={`px-3.5 py-2 text-sm sm:text-base font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                    analysisTab === 'budgets'
                      ? 'bg-white text-indigo-950 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Target className="w-4.5 h-4.5 text-indigo-600" />
                  <span>Metas</span>
                  {exceededBudgetsCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: CASHFLOW EVOLUTION CHART */}
            {analysisTab === 'evolution' && (
              <div>
                <div className="flex items-center justify-between text-xs sm:text-sm mb-3 text-slate-600">
                  <span>
                    {period === 'next_month'
                      ? `Histórico Recente e Projeção de ${monthNames.nextMonth}`
                      : 'Últimos 6 meses (Receitas vs Despesas)'}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <span className="w-3 h-3 rounded-xs bg-emerald-500" />
                      Receitas
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <span className="w-3 h-3 rounded-xs bg-rose-500" />
                      Despesas
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full relative pt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 540 180" preserveAspectRatio="none">
                    {[0, 0.33, 0.66, 1].map((pct, idx) => {
                      const y = 150 - pct * 130;
                      const val = maxMonthlyVal * pct;
                      return (
                        <g key={idx}>
                          <line x1="0" y1={y} x2="540" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                          <text x="0" y={y - 3} fill="#94a3b8" fontSize="10" fontFamily="monospace">
                            R$ {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                          </text>
                        </g>
                      );
                    })}

                    {monthlyFlow.map((item, index) => {
                      const groupWidth = 540 / monthlyFlow.length;
                      const groupCenter = index * groupWidth + groupWidth / 2;
                      const barWidth = 22;

                      const incomeHeight = maxMonthlyVal > 0 ? (item.income / maxMonthlyVal) * 130 : 0;
                      const expenseHeight = maxMonthlyVal > 0 ? (item.expense / maxMonthlyVal) * 130 : 0;

                      const incomeY = 150 - incomeHeight;
                      const expenseY = 150 - expenseHeight;

                      return (
                        <g key={item.monthKey} className="group">
                          <rect
                            x={groupCenter - barWidth - 2}
                            y={incomeY}
                            width={barWidth}
                            height={incomeHeight}
                            rx="3"
                            fill="#10B981"
                            className="transition-all opacity-90 hover:opacity-100"
                          />
                          <rect
                            x={groupCenter + 2}
                            y={expenseY}
                            width={barWidth}
                            height={expenseHeight}
                            rx="3"
                            fill="#F43F5E"
                            className="transition-all opacity-90 hover:opacity-100"
                          />
                          <text
                            x={groupCenter}
                            y="170"
                            textAnchor="middle"
                            fill="#475569"
                            fontSize="11"
                            fontWeight="600"
                          >
                            {formatShortMonth(item.monthKey)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}

            {/* TAB 2: EXPENSES BY CATEGORY */}
            {analysisTab === 'categories' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-sm text-slate-500 mb-1">
                  <span>Maiores Gastos no Período</span>
                  <span>Total: <strong className="text-slate-900 font-mono font-bold">{formatCurrency(totalExpense)}</strong></span>
                </div>

                <div className="space-y-3 max-h-68 overflow-y-auto pr-1">
                  {expensesByCategory.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      Nenhuma despesa registrada neste período.
                    </div>
                  ) : (
                    expensesByCategory.slice(0, 6).map((item) => {
                      const pct = totalExpense > 0 ? (item.total / totalExpense) * 100 : 0;
                      const isSelected = selectedCategoryDetail === item.category.id;

                      return (
                        <div
                          key={item.category.id}
                          onClick={() => setSelectedCategoryDetail(isSelected ? null : item.category.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-50/50'
                              : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: item.category.color }}
                              >
                                <CategoryIcon name={item.category.icon} className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-slate-900">
                                {item.category.name}
                              </span>
                            </div>
                            <div className="text-right font-mono tabular-nums">
                              <span className="font-bold text-slate-900 text-sm">{formatCurrency(item.total)}</span>
                              <span className="text-xs text-slate-500 ml-2 font-medium">({formatPercent(pct)})</span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: item.category.color }}
                            />
                          </div>

                          {isSelected && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1.5">
                              {Array.from(item.subcategoriesMap.entries()).map(([subId, subTotal]) => {
                                const subObj = item.category.subcategories.find((s) => s.id === subId);
                                const subName = subObj ? subObj.name : 'Geral';
                                const subPct = item.total > 0 ? (subTotal / item.total) * 100 : 0;
                                return (
                                  <div key={subId} className="flex items-center justify-between text-xs text-slate-700 pl-2.5 border-l-2 border-slate-300">
                                    <span className="font-medium">{subName}</span>
                                    <span className="font-mono tabular-nums font-semibold">{formatCurrency(subTotal)} ({formatPercent(subPct)})</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: BUDGET TARGETS TRACKER */}
            {analysisTab === 'budgets' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-sm text-slate-500 mb-1">
                  <span>Limites Estabelecidos por Categoria</span>
                  <button
                    onClick={() => onNavigateToTab('categories')}
                    className="text-indigo-600 hover:underline font-bold text-xs"
                  >
                    Editar Metas
                  </button>
                </div>

                <div className="space-y-3 max-h-68 overflow-y-auto pr-1">
                  {budgetAlerts.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      Nenhuma meta de orçamento configurada ainda. Configure limites na aba Categorias.
                    </div>
                  ) : (
                    budgetAlerts.map((item) => {
                      const isOver = item.percentageUsed > 100;
                      const isNear = item.percentageUsed >= 80 && item.percentageUsed <= 100;

                      return (
                        <div key={item.category.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-150">
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="font-bold text-slate-900 flex items-center gap-2">
                              <CategoryIcon name={item.category.icon} color={item.category.color} className="w-4 h-4" />
                              {item.category.name}
                            </span>
                            <span className="font-mono tabular-nums text-slate-700 font-semibold text-xs">
                              {formatCurrency(item.total)} / {formatCurrency(item.budgetLimit)}
                            </span>
                          </div>

                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden my-1.5">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, item.percentageUsed)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{formatPercent(item.percentageUsed)} utilizado</span>
                            {isOver ? (
                              <span className="text-rose-600 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Estourou por {formatCurrency(item.total - item.budgetLimit)}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">
                                Resta {formatCurrency(item.budgetLimit - item.total)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer of Left Card */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
            <span>Relatórios avançados com exportação em PDF e planilhas</span>
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 cursor-pointer text-sm sm:text-base"
            >
              Abrir Relatórios
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Clean Recent Transactions */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Últimos Lançamentos
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Movimentações mais recentes
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('transactions')}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                Ver Todas ({filteredTransactions.length})
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Alert chip if any budget is exceeded */}
            {exceededBudgetsCount > 0 && (
              <div 
                onClick={() => setAnalysisTab('budgets')}
                className="mb-3.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center justify-between cursor-pointer hover:bg-rose-100/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                  <span><strong>{exceededBudgetsCount}</strong> categoria(s) ultrapassaram o limite</span>
                </div>
                <span className="underline font-bold text-sm">Conferir</span>
              </div>
            )}

            {/* Clean, readable recent transactions list */}
            <div className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <div className="py-14 text-center text-sm text-slate-400">
                  Nenhum lançamento no período selecionado.
                </div>
              ) : (
                recentTransactions.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  const card = cards.find((c) => c.id === tx.cardId);

                  return (
                    <div
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl px-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                          style={{ backgroundColor: cat?.color || '#64748B' }}
                        >
                          <CategoryIcon name={cat?.icon || 'Tag'} className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {tx.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mt-0.5">
                            <span className="font-medium">{formatDate(tx.date)}</span>
                            <span>·</span>
                            <span className="truncate">{cat?.name}</span>
                            {card && (
                              <>
                                <span>·</span>
                                <span className="text-indigo-600 font-semibold truncate">{card.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={`text-base sm:text-lg font-extrabold font-mono tabular-nums ${
                            tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </p>
                        <span
                          className={`text-xs sm:text-sm font-bold flex items-center justify-end gap-1 ${
                            tx.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {tx.status === 'completed' ? 'Realizado' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Add link at bottom */}
          <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
            <span>{filteredTransactions.length} lançamentos neste filtro</span>
            <button
              onClick={() => onOpenNewTransaction()}
              title="Adicionar Novo Lançamento (Atalho: Tecla 'N')"
              className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer text-sm sm:text-base flex items-center gap-1.5"
            >
              <span>+ Adicionar Novo</span>
              <kbd className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-300">
                N
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
