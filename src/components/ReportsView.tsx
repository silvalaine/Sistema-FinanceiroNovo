import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  FileSpreadsheet, 
  Calendar, 
  Layers, 
  FileText, 
  TrendingUp, 
  CreditCard as CardIcon,
  ChevronDown,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  PieChart,
  ArrowRight,
  Download,
  CalendarClock,
  X,
  RotateCcw,
  SlidersHorizontal,
  Tag
} from 'lucide-react';
import { Category, CreditCard, PeriodFilter, ReportType, Transaction, TransactionType } from '../types/finance';
import { 
  formatCurrency, 
  formatDate, 
  formatMonthName, 
  formatPercent, 
  formatShortMonth,
  getDateRangeForPeriod, 
  getMonthNamesForRelativePeriods,
  getTransactionCardDates,
  PAYMENT_METHOD_LABELS 
} from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { generateAndDownloadPDF } from '../utils/pdfGenerator';

interface ReportsViewProps {
  transactions: Transaction[];
  categories: Category[];
  cards: CreditCard[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  categories,
  cards,
}) => {
  const [reportType, setReportType] = useState<ReportType>('card_category');
  const [period, setPeriod] = useState<PeriodFilter>('current_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [includePending, setIncludePending] = useState(true);

  const monthNames = useMemo(() => getMonthNamesForRelativePeriods(), []);
  const [categoryTypeTab, setCategoryTypeTab] = useState<TransactionType>('expense');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Sub-controls for Category & Subcategory report
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');
  const [selectedSubcatFilter, setSelectedSubcatFilter] = useState<string>('all');

  // Sub-controls for Card & Category report
  const [selectedCardFilter, setSelectedCardFilter] = useState<string>('all');
  const [selectedCategoryCardFilter, setSelectedCategoryCardFilter] = useState<string>('all');
  const [cardCategoryGroupBy, setCardCategoryGroupBy] = useState<'card' | 'category'>('card');
  const [expandedCardGroups, setExpandedCardGroups] = useState<Record<string, boolean>>({});

  const { startDate, endDate, label: periodLabel } = useMemo(() => {
    return getDateRangeForPeriod(period, customStart, customEnd);
  }, [period, customStart, customEnd]);

  // Filter transactions in scope
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.date < startDate || tx.date > endDate) return false;
      if (!includePending && tx.status !== 'completed') return false;
      return true;
    });
  }, [transactions, startDate, endDate, includePending]);

  // General Totals
  const { totalIncome, totalExpense, netBalance, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') inc += tx.amount;
      else exp += tx.amount;
    });
    const net = inc - exp;
    const rate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
    return {
      totalIncome: inc,
      totalExpense: exp,
      netBalance: net,
      savingsRate: rate,
    };
  }, [filteredTransactions]);

  // 1. Relatório por Cartão e Categoria (Cross-Analysis)
  const cardCategoryReport = useMemo(() => {
    // Only credit card expense transactions
    const cardTxs = filteredTransactions.filter(
      (t) => t.type === 'expense' && t.paymentMethod === 'credit_card'
    );

    // Apply card filter if selected
    let targetedTxs =
      selectedCardFilter === 'all'
        ? cardTxs
        : cardTxs.filter((t) => (t.cardId || 'unassigned') === selectedCardFilter);

    // Apply category filter if selected
    if (selectedCategoryCardFilter !== 'all') {
      targetedTxs = targetedTxs.filter((t) => t.categoryId === selectedCategoryCardFilter);
    }

    const totalSpentOnCards = targetedTxs.reduce((acc, t) => acc + t.amount, 0);

    // Mode A: Grouped by Card
    const byCardList = (selectedCardFilter === 'all' ? cards : cards.filter((c) => c.id === selectedCardFilter)).map((card) => {
      const cardExpenses = targetedTxs.filter((t) => t.cardId === card.id);
      const cardTotal = cardExpenses.reduce((acc, t) => acc + t.amount, 0);

      // Group categories inside this card
      const catMap = new Map<string, { category: Category; total: number; count: number; txs: Transaction[]; subcategoriesMap: Map<string, { subName: string; total: number; count: number }> }>();

      cardExpenses.forEach((tx) => {
        const cat = categories.find((c) => c.id === tx.categoryId) || {
          id: tx.categoryId,
          name: 'Outros',
          type: 'expense' as const,
          color: '#64748B',
          icon: 'Tag',
          subcategories: [],
        };

        if (!catMap.has(cat.id)) {
          catMap.set(cat.id, {
            category: cat,
            total: 0,
            count: 0,
            txs: [],
            subcategoriesMap: new Map(),
          });
        }

        const entry = catMap.get(cat.id)!;
        entry.total += tx.amount;
        entry.count += 1;
        entry.txs.push(tx);

        const subObj = cat.subcategories.find((s) => s.id === tx.subcategoryId);
        const subName = subObj ? subObj.name : 'Geral';
        const subEntry = entry.subcategoriesMap.get(tx.subcategoryId) || { subName, total: 0, count: 0 };
        subEntry.total += tx.amount;
        subEntry.count += 1;
        entry.subcategoriesMap.set(tx.subcategoryId, subEntry);
      });

      const categoriesList = Array.from(catMap.values()).map((c) => ({
        ...c,
        pctOfCard: cardTotal > 0 ? (c.total / cardTotal) * 100 : 0,
        subcategories: Array.from(c.subcategoriesMap.entries()).map(([subId, subData]) => ({
          subId,
          ...subData,
          pctOfCategory: c.total > 0 ? (subData.total / c.total) * 100 : 0,
        })).sort((a, b) => b.total - a.total),
      })).sort((a, b) => b.total - a.total);

      return {
        card,
        total: cardTotal,
        count: cardExpenses.length,
        pctOfAllCards: totalSpentOnCards > 0 ? (cardTotal / totalSpentOnCards) * 100 : 0,
        categories: categoriesList,
      };
    });

    // Also account for credit card expenses without card assigned
    const unassignedExpenses = targetedTxs.filter((t) => !t.cardId);
    if (unassignedExpenses.length > 0 && selectedCardFilter === 'all') {
      const unassignedTotal = unassignedExpenses.reduce((acc, t) => acc + t.amount, 0);
      const catMap = new Map<string, { category: Category; total: number; count: number; txs: Transaction[]; subcategoriesMap: Map<string, { subName: string; total: number; count: number }> }>();

      unassignedExpenses.forEach((tx) => {
        const cat = categories.find((c) => c.id === tx.categoryId) || {
          id: tx.categoryId,
          name: 'Outros',
          type: 'expense' as const,
          color: '#64748B',
          icon: 'Tag',
          subcategories: [],
        };
        if (!catMap.has(cat.id)) {
          catMap.set(cat.id, { category: cat, total: 0, count: 0, txs: [], subcategoriesMap: new Map() });
        }
        const entry = catMap.get(cat.id)!;
        entry.total += tx.amount;
        entry.count += 1;
        entry.txs.push(tx);

        const subObj = cat.subcategories.find((s) => s.id === tx.subcategoryId);
        const subName = subObj ? subObj.name : 'Geral';
        const subEntry = entry.subcategoriesMap.get(tx.subcategoryId) || { subName, total: 0, count: 0 };
        subEntry.total += tx.amount;
        subEntry.count += 1;
        entry.subcategoriesMap.set(tx.subcategoryId, subEntry);
      });

      byCardList.push({
        card: {
          id: 'unassigned',
          name: 'Outros Cartões / Não especificado',
          brand: 'other',
          limit: 0,
          closingDay: 0,
          dueDay: 0,
          color: '#64748B',
        },
        total: unassignedTotal,
        count: unassignedExpenses.length,
        pctOfAllCards: totalSpentOnCards > 0 ? (unassignedTotal / totalSpentOnCards) * 100 : 0,
        categories: Array.from(catMap.values()).map((c) => ({
          ...c,
          pctOfCard: unassignedTotal > 0 ? (c.total / unassignedTotal) * 100 : 0,
          subcategories: Array.from(c.subcategoriesMap.entries()).map(([subId, subData]) => ({
            subId,
            ...subData,
            pctOfCategory: c.total > 0 ? (subData.total / c.total) * 100 : 0,
          })).sort((a, b) => b.total - a.total),
        })).sort((a, b) => b.total - a.total),
      });
    }

    // Mode B: Grouped by Category (Category -> which cards were used)
    const catGroupMap = new Map<string, { category: Category; total: number; count: number; cardsMap: Map<string, { cardName: string; cardColor: string; total: number; count: number; txs: Transaction[] }> }>();

    targetedTxs.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId) || {
        id: tx.categoryId,
        name: 'Outros',
        type: 'expense' as const,
        color: '#64748B',
        icon: 'Tag',
        subcategories: [],
      };

      if (!catGroupMap.has(cat.id)) {
        catGroupMap.set(cat.id, {
          category: cat,
          total: 0,
          count: 0,
          cardsMap: new Map(),
        });
      }

      const entry = catGroupMap.get(cat.id)!;
      entry.total += tx.amount;
      entry.count += 1;

      const cardObj = cards.find((c) => c.id === tx.cardId);
      const cardKey = tx.cardId || 'unassigned';
      const cardName = cardObj ? cardObj.name : 'Cartão Não Vinculado';
      const cardColor = cardObj ? cardObj.color : '#64748B';

      const cardEntry = entry.cardsMap.get(cardKey) || { cardName, cardColor, total: 0, count: 0, txs: [] };
      cardEntry.total += tx.amount;
      cardEntry.count += 1;
      cardEntry.txs.push(tx);
      entry.cardsMap.set(cardKey, cardEntry);
    });

    const byCategoryList = Array.from(catGroupMap.values()).map((c) => ({
      category: c.category,
      total: c.total,
      count: c.count,
      pctOfTotalCards: totalSpentOnCards > 0 ? (c.total / totalSpentOnCards) * 100 : 0,
      cardsUsed: Array.from(c.cardsMap.entries()).map(([cardId, cData]) => ({
        cardId,
        ...cData,
        pctOfCategory: c.total > 0 ? (cData.total / c.total) * 100 : 0,
      })).sort((a, b) => b.total - a.total),
    })).sort((a, b) => b.total - a.total);

    return {
      byCardList: byCardList.filter(
        (b) => b.total > 0 || (selectedCardFilter !== 'all' && selectedCategoryCardFilter === 'all')
      ),
      byCategoryList,
      totalSpentOnCards,
      totalCount: targetedTxs.length,
    };
  }, [filteredTransactions, selectedCardFilter, selectedCategoryCardFilter, cards, categories]);

  // Available categories & subcategories for the filter
  const availableCategoriesForFilter = useMemo(() => {
    return categories.filter((c) => c.type === categoryTypeTab);
  }, [categories, categoryTypeTab]);

  const availableSubcategoriesForFilter = useMemo(() => {
    if (selectedCatFilter !== 'all') {
      const cat = categories.find((c) => c.id === selectedCatFilter);
      return cat?.subcategories || [];
    }
    // When "all" categories are selected, list all subcategories grouped with their category info
    const list: Array<{ id: string; name: string; categoryName: string; categoryColor: string; categoryId: string }> = [];
    categories
      .filter((c) => c.type === categoryTypeTab)
      .forEach((cat) => {
        (cat.subcategories || []).forEach((sub) => {
          list.push({
            id: sub.id,
            name: sub.name,
            categoryName: cat.name,
            categoryColor: cat.color,
            categoryId: cat.id,
          });
        });
      });
    return list;
  }, [categories, categoryTypeTab, selectedCatFilter]);

  // 2. Category & Subcategory detailed analysis
  const categorySubcategoryReport = useMemo(() => {
    const targetType = categoryTypeTab;
    const allRelevantTxs = filteredTransactions.filter((tx) => tx.type === targetType);
    const totalForTypeAll = allRelevantTxs.reduce((acc, t) => acc + t.amount, 0);

    // Apply category & subcategory filters if selected
    let targetedTxs = allRelevantTxs;
    if (selectedCatFilter !== 'all') {
      targetedTxs = targetedTxs.filter((t) => t.categoryId === selectedCatFilter);
    }
    if (selectedSubcatFilter !== 'all') {
      if (selectedSubcatFilter === 'sub-unassigned') {
        const assignedSubIds = new Set(
          categories.flatMap((c) => (c.subcategories || []).map((s) => s.id))
        );
        targetedTxs = targetedTxs.filter(
          (t) => !t.subcategoryId || !assignedSubIds.has(t.subcategoryId)
        );
      } else {
        targetedTxs = targetedTxs.filter((t) => t.subcategoryId === selectedSubcatFilter);
      }
    }

    const filteredTotal = targetedTxs.reduce((acc, t) => acc + t.amount, 0);

    let relevantCats = categories.filter((c) => c.type === targetType);
    if (selectedCatFilter !== 'all') {
      relevantCats = relevantCats.filter((c) => c.id === selectedCatFilter);
    }

    const reportData = relevantCats.map((cat) => {
      const catTxs = targetedTxs.filter((t) => t.categoryId === cat.id);
      const catTotal = catTxs.reduce((acc, t) => acc + t.amount, 0);
      const catCount = catTxs.length;
      const catPct = filteredTotal > 0 ? (catTotal / filteredTotal) * 100 : 0;
      const avgTicket = catCount > 0 ? catTotal / catCount : 0;

      let subcategoriesData = (cat.subcategories || []).map((sub) => {
        const subTxs = catTxs.filter((t) => t.subcategoryId === sub.id);
        const subTotal = subTxs.reduce((acc, t) => acc + t.amount, 0);
        const subCount = subTxs.length;
        const subPctOfCat = catTotal > 0 ? (subTotal / catTotal) * 100 : 0;
        const subPctOfTotal = filteredTotal > 0 ? (subTotal / filteredTotal) * 100 : 0;
        const subAvgTicket = subCount > 0 ? subTotal / subCount : 0;

        return {
          id: sub.id,
          name: sub.name,
          total: subTotal,
          count: subCount,
          pctOfCategory: subPctOfCat,
          pctOfTotal: subPctOfTotal,
          avgTicket: subAvgTicket,
        };
      });

      // Filter subcategoriesData if subcategory filter is applied
      if (selectedSubcatFilter !== 'all') {
        subcategoriesData = subcategoriesData.filter((s) => s.id === selectedSubcatFilter);
      }

      const assignedSubIds = new Set((cat.subcategories || []).map((s) => s.id));
      const unassignedTxs = catTxs.filter((t) => !assignedSubIds.has(t.subcategoryId));
      if (
        unassignedTxs.length > 0 &&
        (selectedSubcatFilter === 'all' || selectedSubcatFilter === 'sub-unassigned')
      ) {
        const unassignedTotal = unassignedTxs.reduce((acc, t) => acc + t.amount, 0);
        subcategoriesData.push({
          id: 'sub-unassigned',
          name: 'Outros / Não especificado',
          total: unassignedTotal,
          count: unassignedTxs.length,
          pctOfCategory: catTotal > 0 ? (unassignedTotal / catTotal) * 100 : 0,
          pctOfTotal: filteredTotal > 0 ? (unassignedTotal / filteredTotal) * 100 : 0,
          avgTicket: unassignedTotal / unassignedTxs.length,
        });
      }

      subcategoriesData = subcategoriesData.filter((s) => s.total > 0);
      subcategoriesData.sort((a, b) => b.total - a.total);

      return {
        category: cat,
        total: catTotal,
        count: catCount,
        pctOfTotal: catPct,
        avgTicket,
        subcategories: subcategoriesData,
      };
    });

    const isFiltered = selectedCatFilter !== 'all' || selectedSubcatFilter !== 'all';
    // Mostra somente as categorias que obtiveram valores (total > 0)
    const finalItems = reportData
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);

    return {
      items: finalItems,
      totalForType: filteredTotal,
      unfilteredTotalForType: totalForTypeAll,
      relevantTxsCount: targetedTxs.length,
      unfilteredTxsCount: allRelevantTxs.length,
      isFiltered,
    };
  }, [categoryTypeTab, filteredTransactions, categories, selectedCatFilter, selectedSubcatFilter]);

  // 3. DRE Mensal
  const dreReport = useMemo(() => {
    const incomeCategories = categories
      .filter((c) => c.type === 'income')
      .map((cat) => {
        const txs = filteredTransactions.filter(
          (t) => t.type === 'income' && t.categoryId === cat.id
        );
        const total = txs.reduce((acc, t) => acc + t.amount, 0);
        return { category: cat, total, count: txs.length };
      })
      .filter((i) => i.total > 0)
      .sort((a, b) => b.total - a.total);

    const expenseCategories = categories
      .filter((c) => c.type === 'expense')
      .map((cat) => {
        const txs = filteredTransactions.filter(
          (t) => t.type === 'expense' && t.categoryId === cat.id
        );
        const total = txs.reduce((acc, t) => acc + t.amount, 0);
        return { category: cat, total, count: txs.length };
      })
      .filter((e) => e.total > 0)
      .sort((a, b) => b.total - a.total);

    return {
      incomeCategories,
      expenseCategories,
      totalIncome,
      totalExpense,
      netBalance,
      savingsRate,
    };
  }, [filteredTransactions, categories, totalIncome, totalExpense, netBalance, savingsRate]);

  // 4. Monthly Comparison
  const monthlyComparisonReport = useMemo(() => {
    const monthsMap = new Map<
      string,
      {
        monthKey: string;
        income: number;
        expense: number;
        incomeCount: number;
        expenseCount: number;
      }
    >();

    transactions.forEach((tx) => {
      const monthKey = tx.date.slice(0, 7);
      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          monthKey,
          income: 0,
          expense: 0,
          incomeCount: 0,
          expenseCount: 0,
        });
      }
      const entry = monthsMap.get(monthKey)!;
      if (tx.type === 'income') {
        entry.income += tx.amount;
        entry.incomeCount += 1;
      } else {
        entry.expense += tx.amount;
        entry.expenseCount += 1;
      }
    });

    const sortedMonths = Array.from(monthsMap.values()).sort((a, b) =>
      b.monthKey.localeCompare(a.monthKey)
    );

    return sortedMonths.map((item, idx, arr) => {
      const nextMonth = arr[idx + 1];
      const net = item.income - item.expense;
      const expenseDiff = nextMonth ? item.expense - nextMonth.expense : 0;
      const expensePctChange = nextMonth && nextMonth.expense > 0 ? (expenseDiff / nextMonth.expense) * 100 : 0;

      return {
        ...item,
        netBalance: net,
        expenseDiff,
        expensePctChange,
      };
    });
  }, [transactions]);

  // 5. Future Installments
  const futureInstallmentsReport = useMemo(() => {
    const now = new Date();
    const futureMonthsMap = new Map<string, { monthKey: string; total: number; items: { tx: Transaction; card?: CreditCard }[] }>();

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      futureMonthsMap.set(key, { monthKey: key, total: 0, items: [] });
    }

    transactions
      .filter((t) => t.type === 'expense' && t.installment)
      .forEach((t) => {
        const monthKey = t.date.slice(0, 7);
        if (futureMonthsMap.has(monthKey)) {
          const entry = futureMonthsMap.get(monthKey)!;
          entry.total += t.amount;
          const card = cards.find((c) => c.id === t.cardId);
          entry.items.push({ tx: t, card });
        }
      });

    return Array.from(futureMonthsMap.values()).filter((m) => m.total > 0 || m.monthKey >= now.toISOString().slice(0, 7));
  }, [transactions, cards]);

  const toggleExpand = (catId: string) => {
    setExpandedCats((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const expandAllCats = () => {
    const next: Record<string, boolean> = {};
    categorySubcategoryReport.items.forEach((item) => {
      next[item.category.id] = true;
    });
    setExpandedCats(next);
  };

  const collapseAllCats = () => {
    const next: Record<string, boolean> = {};
    categorySubcategoryReport.items.forEach((item) => {
      next[item.category.id] = false;
    });
    setExpandedCats(next);
  };

  const handleCategoryTypeChange = (type: TransactionType) => {
    setCategoryTypeTab(type);
    setSelectedCatFilter('all');
    setSelectedSubcatFilter('all');
  };

  const handleCategoryFilterChange = (catId: string) => {
    setSelectedCatFilter(catId);
    if (catId === 'all') {
      setSelectedSubcatFilter('all');
    } else {
      const cat = categories.find((c) => c.id === catId);
      const subExists = (cat?.subcategories || []).some((s) => s.id === selectedSubcatFilter);
      if (!subExists && selectedSubcatFilter !== 'sub-unassigned') {
        setSelectedSubcatFilter('all');
      }
    }
  };

  const clearCategoryFilters = () => {
    setSelectedCatFilter('all');
    setSelectedSubcatFilter('all');
  };

  const toggleExpandCardGroup = (id: string) => {
    setExpandedCardGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Export CSV
  const handleExportCSV = () => {
    let csvRows: string[] = [];

    if (reportType === 'card_category') {
      csvRows.push(['Cartão', 'Categoria', 'Subcategoria', 'Valor (R$)', 'Lançamentos', '% do Cartão'].join(';'));
      cardCategoryReport.byCardList.forEach(({ card, categories: catList }) => {
        catList.forEach((c) => {
          csvRows.push([
            `"${card.name}"`,
            `"${c.category.name}"`,
            '-- TOTAL DA CATEGORIA --',
            c.total.toFixed(2).replace('.', ','),
            c.count.toString(),
            c.pctOfCard.toFixed(1) + '%',
          ].join(';'));

          c.subcategories.forEach((sub) => {
            csvRows.push([
              `"${card.name}"`,
              `"${c.category.name}"`,
              `"${sub.subName}"`,
              sub.total.toFixed(2).replace('.', ','),
              sub.count.toString(),
              sub.pctOfCategory.toFixed(1) + '% da cat',
            ].join(';'));
          });
        });
      });
    } else if (reportType === 'category_subcategory') {
      csvRows.push(['Tipo', 'Categoria', 'Subcategoria', 'Total (R$)', 'Qtd Lançamentos', 'Percentual', 'Ticket Médio (R$)'].join(';'));
      categorySubcategoryReport.items.forEach((item) => {
        csvRows.push([
          categoryTypeTab === 'expense' ? 'Despesa' : 'Receita',
          item.category.name,
          '-- TOTAL DA CATEGORIA --',
          item.total.toFixed(2).replace('.', ','),
          item.count.toString(),
          item.pctOfTotal.toFixed(1) + '%',
          item.avgTicket.toFixed(2).replace('.', ','),
        ].join(';'));

        item.subcategories.forEach((sub) => {
          csvRows.push([
            categoryTypeTab === 'expense' ? 'Despesa' : 'Receita',
            item.category.name,
            sub.name,
            sub.total.toFixed(2).replace('.', ','),
            sub.count.toString(),
            sub.pctOfCategory.toFixed(1) + '%',
            sub.avgTicket.toFixed(2).replace('.', ','),
          ].join(';'));
        });
      });
    } else if (reportType === 'income_statement') {
      csvRows.push(['Seção DRE', 'Categoria', 'Valor (R$)', 'Lançamentos'].join(';'));
      dreReport.incomeCategories.forEach((inc) => {
        csvRows.push(['Receita', inc.category.name, inc.total.toFixed(2).replace('.', ','), inc.count.toString()].join(';'));
      });
      csvRows.push(['TOTAL RECEITAS', '', dreReport.totalIncome.toFixed(2).replace('.', ','), ''].join(';'));
      dreReport.expenseCategories.forEach((exp) => {
        csvRows.push(['Despesa', exp.category.name, exp.total.toFixed(2).replace('.', ','), exp.count.toString()].join(';'));
      });
      csvRows.push(['TOTAL DESPESAS', '', dreReport.totalExpense.toFixed(2).replace('.', ','), ''].join(';'));
      csvRows.push(['RESULTADO LÍQUIDO', '', dreReport.netBalance.toFixed(2).replace('.', ','), ''].join(';'));
    } else if (reportType === 'future_installments') {
      csvRows.push(['Competência', 'Descrição', 'Parcela', 'Cartão', 'Valor (R$)', 'Status'].join(';'));
      futureInstallmentsReport.forEach((m) => {
        m.items.forEach(({ tx, card }) => {
          csvRows.push([
            formatMonthName(m.monthKey),
            `"${tx.description.replace(/"/g, '""')}"`,
            tx.installment ? `${tx.installment.current}/${tx.installment.total}` : '1/1',
            card?.name || 'Não informado',
            tx.amount.toFixed(2).replace('.', ','),
            tx.status === 'completed' ? 'Pago' : 'Pendente',
          ].join(';'));
        });
      });
    } else {
      csvRows.push(['Data', 'Descrição', 'Tipo', 'Categoria', 'Subcategoria', 'Valor (R$)', 'Forma de Pagamento', 'Cartão', 'Parcela', 'Status'].join(';'));
      filteredTransactions.forEach((tx) => {
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
          card?.name || '',
          tx.installment ? `${tx.installment.current}/${tx.installment.total}` : '',
          tx.status === 'completed' ? 'Realizado' : 'Pendente',
        ].join(';'));
      });
    }

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${reportType}_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  const handleDownloadPDF = () => {
    setIsGeneratingPDF(true);
    setPdfSuccessMessage(null);

    let reportTitle = 'Relatório Financeiro';
    if (reportType === 'card_category') {
      reportTitle = 'Relatório de Gastos por Cartão e Categoria';
    } else if (reportType === 'category_subcategory') {
      reportTitle = `Detalhamento por Categorias & Subcategorias (${categoryTypeTab === 'expense' ? 'Despesas' : 'Receitas'})`;
    } else if (reportType === 'income_statement') {
      reportTitle = 'Demonstrativo de Resultado do Exercício (DRE)';
    } else if (reportType === 'future_installments') {
      reportTitle = 'Cronograma de Parcelas Futuras & Comprometimento';
    } else if (reportType === 'monthly_comparison') {
      reportTitle = 'Comparativo Mensal de Desempenho';
    }

    let filterDesc = '';
    if (reportType === 'card_category') {
      if (selectedCardFilter !== 'all') {
        const c = cards.find((card) => card.id === selectedCardFilter);
        filterDesc += `Cartão: ${c?.name || 'Selecionado'}`;
      }
      if (selectedCategoryCardFilter !== 'all') {
        const cat = categories.find((c) => c.id === selectedCategoryCardFilter);
        filterDesc += (filterDesc ? ' · ' : '') + `Categoria: ${cat?.name || 'Selecionada'}`;
      }
    } else if (reportType === 'category_subcategory') {
      if (selectedCatFilter !== 'all') {
        const cat = categories.find((c) => c.id === selectedCatFilter);
        filterDesc += `Categoria: ${cat?.name || 'Selecionada'}`;
      }
      if (selectedSubcatFilter !== 'all') {
        let subName = 'Selecionada';
        if (selectedSubcatFilter === 'sub-unassigned') {
          subName = 'Outros / Não especificado';
        } else {
          for (const c of categories) {
            const found = c.subcategories?.find((s) => s.id === selectedSubcatFilter);
            if (found) {
              subName = found.name;
              break;
            }
          }
        }
        filterDesc += (filterDesc ? ' · ' : '') + `Subcategoria: ${subName}`;
      }
    }

    const success = generateAndDownloadPDF({
      reportType,
      reportTitle,
      periodLabel: reportType === 'future_installments' ? 'Próximos 12 meses' : periodLabel,
      filterDescription: filterDesc,
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        totalCards: cardCategoryReport.totalSpentOnCards,
      },
      cardCategoryData: {
        byCardList: cardCategoryReport.byCardList.map((cg) => ({
          card: { name: cg.card.name, brand: cg.card.brand },
          total: cg.total,
          count: cg.count,
          pctOfAllCards: cg.pctOfAllCards,
          categories: cg.categories.map((c) => ({
            category: { name: c.category.name },
            total: c.total,
            count: c.count,
            pctOfCard: c.pctOfCard,
            subcategories: c.subcategories.map((s) => ({
              subName: s.subName,
              total: s.total,
              count: s.count,
              pctOfCategory: s.pctOfCategory,
            })),
            txs: c.txs.map((tx) => {
              const txDates = getTransactionCardDates(tx, cards);
              return {
                description: tx.description,
                amount: tx.amount,
                purchaseDate: txDates.purchaseDate,
                dueDate: txDates.dueDate,
              };
            }),
          })),
        })),
      },
      categorySubcategoryData: {
        typeLabel: categoryTypeTab === 'expense' ? 'Despesas' : 'Receitas',
        totalFiltered: categorySubcategoryReport.totalForType,
        items: categorySubcategoryReport.items.map((i) => ({
          category: { name: i.category.name },
          total: i.total,
          count: i.count,
          pctOfTotal: i.pctOfTotal,
          avgTicket: i.avgTicket,
          subcategories: i.subcategories.map((s) => ({
            name: s.name,
            total: s.total,
            count: s.count,
            pctOfCategory: s.pctOfCategory,
            avgTicket: s.avgTicket,
          })),
        })),
      },
      dreData: {
        incomeCategories: dreReport.incomeCategories.map((c) => ({
          category: { name: c.category.name },
          total: c.total,
          count: c.count,
        })),
        expenseCategories: dreReport.expenseCategories.map((c) => ({
          category: { name: c.category.name },
          total: c.total,
          count: c.count,
        })),
        totalIncome: dreReport.totalIncome,
        totalExpense: dreReport.totalExpense,
        netBalance: dreReport.netBalance,
        savingsRate: dreReport.savingsRate,
      },
      futureInstallmentsData: futureInstallmentsReport.map((m) => ({
        monthKey: m.monthKey,
        total: m.total,
        items: m.items.map((it) => {
          const itemDates = getTransactionCardDates(it.tx, cards);
          return {
            tx: {
              description: it.tx.description,
              amount: it.tx.amount,
              installment: it.tx.installment ? { current: it.tx.installment.current, total: it.tx.installment.total } : undefined,
              status: it.tx.status,
              purchaseDate: itemDates.purchaseDate,
              dueDate: itemDates.dueDate,
            },
            card: it.card ? { name: it.card.name } : undefined,
          };
        }),
      })),
      monthlyComparisonData: monthlyComparisonReport.map((m) => ({
        monthKey: m.monthKey,
        income: m.income,
        expense: m.expense,
        netBalance: m.netBalance,
        expensePctChange: m.expensePctChange,
      })),
    });

    setIsGeneratingPDF(false);
    if (success) {
      setPdfSuccessMessage('Arquivo PDF gerado e baixado com sucesso!');
      setTimeout(() => setPdfSuccessMessage(null), 5000);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Impressão direta via navegador falhou no iframe, baixando PDF diretamente:', e);
      handleDownloadPDF();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Relatórios Financeiros & Análises
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Demonstrativos detalhados, categorização hierárquica, faturas por cartão e parcelamentos
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 text-sm sm:text-base font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>

          {/* Botão Baixar PDF Diretamente (Gera e baixa arquivo PDF real - Nunca falha em iframes) */}
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="px-4.5 py-2.5 text-sm sm:text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Gerar e baixar relatório em formato PDF no seu computador"
          >
            <Download className="w-4.5 h-4.5" />
            <span>{isGeneratingPDF ? 'Gerando PDF...' : 'Baixar em PDF (.pdf)'}</span>
          </button>

          {/* Botão Imprimir via Navegador */}
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 text-sm sm:text-base font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
            title="Abrir diálogo de impressão do navegador"
          >
            <Printer className="w-4.5 h-4.5 text-slate-600" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner para PDF baixado com sucesso */}
      {pdfSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 flex items-center justify-between no-print shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{pdfSuccessMessage} Verifique sua pasta de downloads.</span>
          </div>
          <button
            onClick={() => setPdfSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer text-base"
          >
            ✕
          </button>
        </div>
      )}

      {/* Report Controls Bar (No-Print) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 no-print shadow-2xs">
        {/* Report Type Selector Tabs */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider mb-2.5">
            Tipo de Relatório
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* NOVO: Relatório por Cartão & Categoria */}
            <button
              onClick={() => setReportType('card_category')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                reportType === 'card_category'
                  ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold shadow-2xs'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 text-sm mb-1 font-bold">
                <CardIcon className="w-4 h-4 text-indigo-600" />
                <span>Por Cartão e Categoria</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Cruzamento faturas vs categorias
              </p>
            </button>

            <button
              onClick={() => setReportType('category_subcategory')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                reportType === 'category_subcategory'
                  ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold shadow-2xs'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 text-sm mb-1 font-bold">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Categorias & Sub</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Detalhamento geral e ticket
              </p>
            </button>

            <button
              onClick={() => setReportType('income_statement')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                reportType === 'income_statement'
                  ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold shadow-2xs'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 text-sm mb-1 font-bold">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Demonstrativo DRE</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Estrutura contábil receitas vs despesas
              </p>
            </button>

            <button
              onClick={() => setReportType('future_installments')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                reportType === 'future_installments'
                  ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold shadow-2xs'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 text-sm mb-1 font-bold">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Parcelas Futuras</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Comprometimento nos próximos meses
              </p>
            </button>

            <button
              onClick={() => setReportType('monthly_comparison')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                reportType === 'monthly_comparison'
                  ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold shadow-2xs'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 text-sm mb-1 font-bold">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Comparativo Mensal</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Evolução temporal e variações (%)
              </p>
            </button>
          </div>
        </div>

        {/* Date Filter & Options */}
        {reportType !== 'future_installments' && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-3.5 border-t border-slate-100 items-center">
            <div className="sm:col-span-5">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Período de Referência
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                className="w-full py-2 px-3.5 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="last_month">{monthNames.lastMonth}</option>
                <option value="current_month">{monthNames.currentMonth}</option>
                <option value="next_month">{monthNames.nextMonth}</option>
                <option value="last_3_months">Últimos 3 Meses</option>
                <option value="last_6_months">Últimos 6 Meses</option>
                <option value="current_year">Ano Vigente</option>
                <option value="all">Todo o Histórico</option>
                <option value="custom">Personalizado...</option>
              </select>
            </div>

            {period === 'custom' && (
              <div className="sm:col-span-4 flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-1/2 py-2 px-2.5 text-sm border border-slate-200 rounded-xl bg-white"
                />
                <span className="text-sm text-slate-400">até</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-1/2 py-2 px-2.5 text-sm border border-slate-200 rounded-xl bg-white"
                />
              </div>
            )}

            <div className="sm:col-span-3 flex items-center gap-2 sm:justify-end pt-4 sm:pt-0">
              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none font-medium">
                <input
                  type="checkbox"
                  checked={includePending}
                  onChange={(e) => setIncludePending(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5"
                />
                <span>Incluir lançamentos pendentes</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Printable Report Surface */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs print:border-none print:shadow-none print:p-0">
        {/* Dossier Header Info */}
        <div className="border-b border-slate-200 pb-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold tracking-wider text-indigo-600 uppercase">
                FinanPlan · Relatório Gerencial
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                {reportType === 'card_category' && 'Relatório de Gastos por Cartão e Categoria'}
                {reportType === 'category_subcategory' &&
                  `Detalhamento por Categorias & Subcategorias (${
                    categoryTypeTab === 'expense' ? 'Despesas' : 'Receitas'
                  })`}
                {reportType === 'income_statement' && 'Demonstrativo de Resultado (DRE)'}
                {reportType === 'future_installments' && 'Cronograma de Parcelas Futuras & Comprometimento'}
                {reportType === 'monthly_comparison' && 'Comparativo Mensal de Desempenho'}
              </h2>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-500">
              <p>
                Período:{' '}
                <strong className="text-slate-800">
                  {reportType === 'future_installments' ? 'Próximos 12 meses' : periodLabel}
                </strong>
              </p>
              {reportType === 'card_category' && (selectedCardFilter !== 'all' || selectedCategoryCardFilter !== 'all') && (
                <p className="text-[11px] text-indigo-700 font-medium">
                  Filtros:{' '}
                  {selectedCardFilter !== 'all' && (
                    <span>Cartão: <strong>{cards.find((c) => c.id === selectedCardFilter)?.name || 'Selecionado'}</strong> </span>
                  )}
                  {selectedCardFilter !== 'all' && selectedCategoryCardFilter !== 'all' && '· '}
                  {selectedCategoryCardFilter !== 'all' && (
                    <span>Categoria: <strong>{categories.find((c) => c.id === selectedCategoryCardFilter)?.name || 'Selecionada'}</strong></span>
                  )}
                </p>
              )}
              {reportType === 'category_subcategory' && (selectedCatFilter !== 'all' || selectedSubcatFilter !== 'all') && (
                <p className="text-[11px] text-indigo-700 font-medium">
                  Filtros:{' '}
                  {selectedCatFilter !== 'all' && (
                    <span>Categoria: <strong>{categories.find((c) => c.id === selectedCatFilter)?.name || 'Selecionada'}</strong> </span>
                  )}
                  {selectedCatFilter !== 'all' && selectedSubcatFilter !== 'all' && '· '}
                  {selectedSubcatFilter !== 'all' && (
                    <span>
                      Subcategoria: <strong>
                        {selectedSubcatFilter === 'sub-unassigned'
                          ? 'Outros / Não especificado'
                          : availableSubcategoriesForFilter.find((s) => s.id === selectedSubcatFilter)?.name || 'Selecionada'}
                      </strong>
                    </span>
                  )}
                </p>
              )}
              <p>
                Gerado em: <span className="font-mono">{new Date().toLocaleDateString('pt-BR')}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics Header */}
          {reportType === 'card_category' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Total Faturado nos Cartões</span>
                <span className="font-mono font-bold text-rose-600 text-sm tabular-nums">
                  {formatCurrency(cardCategoryReport.totalSpentOnCards)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Compras com Cartão</span>
                <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                  {cardCategoryReport.totalCount} lançamentos
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Despesas Consolidadas</span>
                <span className="font-mono font-bold text-slate-800 text-sm tabular-nums">
                  {formatCurrency(totalExpense)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Participação do Cartão</span>
                <span className="font-mono font-bold text-indigo-600 text-sm tabular-nums">
                  {totalExpense > 0
                    ? formatPercent((cardCategoryReport.totalSpentOnCards / totalExpense) * 100)
                    : '0%'} das despesas
                </span>
              </div>
            </div>
          )}

          {reportType === 'category_subcategory' && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Realizado pelo Filtro
              </span>
              <span
                className={`font-mono font-bold text-xl sm:text-2xl tabular-nums mt-0.5 block ${
                  categoryTypeTab === 'expense' ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(categorySubcategoryReport.totalForType)}
              </span>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* REPORT TYPE: CARD AND CATEGORY CROSS-ANALYSIS */}
        {/* ============================================================ */}
        {reportType === 'card_category' && (
          <div className="space-y-6">
            {/* View Sub-Controls (No Print) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex flex-wrap items-center gap-3.5">
                {/* Filtrar Cartão */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Filtrar Cartão:</span>
                  <select
                    value={selectedCardFilter}
                    onChange={(e) => setSelectedCardFilter(e.target.value)}
                    className="py-1.5 px-3 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Todos os Cartões ({cards.length})</option>
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtrar Categoria */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Filtrar Categoria:</span>
                  <select
                    value={selectedCategoryCardFilter}
                    onChange={(e) => setSelectedCategoryCardFilter(e.target.value)}
                    className="py-1.5 px-3 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Todas as Categorias</option>
                    {categories
                      .filter((c) => c.type === 'expense')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Limpar Filtros */}
                {(selectedCardFilter !== 'all' || selectedCategoryCardFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCardFilter('all');
                      setSelectedCategoryCardFilter('all');
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800 underline font-bold cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>

              {/* Group By Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setCardCategoryGroupBy('card')}
                  className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                    cardCategoryGroupBy === 'card'
                      ? 'bg-white text-indigo-950 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Agrupar por Cartão
                </button>
                <button
                  type="button"
                  onClick={() => setCardCategoryGroupBy('category')}
                  className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                    cardCategoryGroupBy === 'category'
                      ? 'bg-white text-indigo-950 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Agrupar por Categoria
                </button>
              </div>
            </div>

            {/* Banner de filtro ativo por categoria */}
            {selectedCategoryCardFilter !== 'all' && (
              <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-200/70 rounded-lg text-xs text-indigo-950 no-print">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>
                    Filtrando compras com cartão na categoria{' '}
                    <strong>
                      {categories.find((c) => c.id === selectedCategoryCardFilter)?.name || 'Selecionada'}
                    </strong>
                    {selectedCardFilter !== 'all' && (
                      <> no cartão <strong>{cards.find((c) => c.id === selectedCardFilter)?.name}</strong></>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryCardFilter('all')}
                  className="font-semibold text-indigo-700 hover:text-indigo-900 underline ml-2"
                >
                  Remover Filtro de Categoria
                </button>
              </div>
            )}

            {/* Content Display: MODE A - Grouped by Card */}
            {cardCategoryGroupBy === 'card' && (
              <div className="space-y-6">
                {cardCategoryReport.byCardList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Nenhum gasto em cartão de crédito encontrado para os filtros selecionados.
                  </div>
                ) : (
                  cardCategoryReport.byCardList.map(({ card, total, count, pctOfAllCards, categories: catList }) => {
                    const isExpanded = expandedCardGroups[card.id] ?? true;

                    return (
                      <div
                        key={card.id}
                        className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                      >
                        {/* Card Group Header Banner */}
                        <div
                          onClick={() => toggleExpandCardGroup(card.id)}
                          className="p-4 bg-slate-50/80 hover:bg-slate-100/70 cursor-pointer transition-colors flex items-center justify-between border-b border-slate-200"
                        >
                          <div className="flex items-center gap-3">
                            <span className="no-print text-slate-400">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </span>
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: card.color }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900">
                                  {card.name}
                                </h3>
                                {card.limit > 0 && (
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    · Limite: {formatCurrency(card.limit)}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500">
                                {count} compras registradas · {catList.length} categorias diferentes
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-bold font-mono text-rose-600 tabular-nums">
                              {formatCurrency(total)}
                            </span>
                            <span className="text-[11px] text-slate-500 block font-mono">
                              {formatPercent(pctOfAllCards)} do gasto total em cartões
                            </span>
                          </div>
                        </div>

                        {/* Categories Table under this Card */}
                        {isExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-100/60 text-slate-600 border-b border-slate-200 font-semibold select-none">
                                  <th className="py-2.5 px-4">Categoria / Subcategoria</th>
                                  <th className="py-2.5 px-3 text-center">Compras</th>
                                  <th className="py-2.5 px-3 text-right">% da Fatura deste Cartão</th>
                                  <th className="py-2.5 px-4 text-right">Total (R$)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {catList.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="py-6 text-center text-slate-400">
                                      Nenhum gasto registrado neste cartão no período.
                                    </td>
                                  </tr>
                                ) : (
                                  catList.map((c) => {
                                    const subExpandKey = `${card.id}-${c.category.id}`;
                                    const isSubExpanded = expandedCardGroups[subExpandKey] ?? true;

                                    return (
                                      <React.Fragment key={c.category.id}>
                                        {/* Category Row */}
                                        <tr
                                          onClick={() => toggleExpandCardGroup(subExpandKey)}
                                          className="hover:bg-slate-50/70 cursor-pointer font-medium"
                                        >
                                          <td className="py-2.5 px-4">
                                            <div className="flex items-center gap-2">
                                              <span className="no-print text-slate-300">
                                                {isSubExpanded ? (
                                                  <ChevronDown className="w-3 h-3" />
                                                ) : (
                                                  <ChevronRight className="w-3 h-3" />
                                                )}
                                              </span>
                                              <div
                                                className="w-5 h-5 rounded flex items-center justify-center text-white shrink-0"
                                                style={{ backgroundColor: c.category.color }}
                                              >
                                                <CategoryIcon
                                                  name={c.category.icon}
                                                  className="w-3 h-3"
                                                />
                                              </div>
                                              <span className="text-slate-900 font-semibold">
                                                {c.category.name}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 text-center font-mono text-slate-600 tabular-nums">
                                            {c.count}
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                                <div
                                                  className="h-full rounded-full"
                                                  style={{
                                                    width: `${c.pctOfCard}%`,
                                                    backgroundColor: c.category.color,
                                                  }}
                                                />
                                              </div>
                                              <span className="font-mono text-slate-700 tabular-nums">
                                                {formatPercent(c.pctOfCard)}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                                            {formatCurrency(c.total)}
                                          </td>
                                        </tr>

                                        {/* Subcategories Children */}
                                        {isSubExpanded &&
                                          c.subcategories.map((sub) => (
                                            <tr
                                              key={sub.subId}
                                              className="bg-slate-50/30 text-slate-600 hover:bg-slate-50/70"
                                            >
                                              <td className="py-2 px-4 pl-12">
                                                <div className="flex items-center gap-2">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                  <span>{sub.subName}</span>
                                                </div>
                                              </td>
                                              <td className="py-2 px-3 text-center font-mono text-slate-400 tabular-nums text-[11px]">
                                                {sub.count}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono text-slate-500 tabular-nums text-[11px]">
                                                {formatPercent(sub.pctOfCategory)} da categoria
                                              </td>
                                              <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-700">
                                                {formatCurrency(sub.total)}
                                              </td>
                                            </tr>
                                          ))}

                                        {/* Individual Purchases with Purchase Date and Due Date */}
                                        {isSubExpanded && c.txs && c.txs.length > 0 && (
                                          <tr className="bg-slate-50/70 border-b border-slate-200">
                                            <td colSpan={4} className="py-2.5 px-4 pl-12">
                                              <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1.5 shadow-2xs">
                                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1.5 border-b border-slate-100 uppercase tracking-wider">
                                                  <span>Lançamentos neste Cartão ({c.txs.length})</span>
                                                  <span>Data da Compra · Vencimento do Cartão</span>
                                                </div>
                                                <div className="divide-y divide-slate-100">
                                                  {c.txs.map((tx) => {
                                                    const txDates = getTransactionCardDates(tx, cards);
                                                    return (
                                                      <div key={tx.id} className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                          <span className="font-semibold text-slate-800 truncate">{tx.description}</span>
                                                          {tx.installment && (
                                                            <span className="shrink-0 text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold">
                                                              {tx.installment.current}/{tx.installment.total}
                                                            </span>
                                                          )}
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0 flex-wrap">
                                                          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                                                            <span className="text-[9px] font-bold uppercase text-slate-400">Compra:</span>
                                                            <span className="font-semibold">{formatDate(txDates.purchaseDate)}</span>
                                                          </div>
                                                          {txDates.dueDate && (
                                                            <div className="flex items-center gap-1 text-[11px] font-mono text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-semibold">
                                                              <CalendarClock className="w-3 h-3 text-amber-700" />
                                                              <span className="text-[9px] font-bold uppercase text-amber-800">Venc. Cartão:</span>
                                                              <span>{formatDate(txDates.dueDate)}</span>
                                                            </div>
                                                          )}
                                                          <span className="font-mono font-bold text-slate-900 min-w-[70px] text-right">
                                                            {formatCurrency(tx.amount)}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Content Display: MODE B - Grouped by Category */}
            {cardCategoryGroupBy === 'category' && (
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold select-none">
                        <th className="py-3 px-4">Categoria / Cartões Utilizados</th>
                        <th className="py-3 px-3 text-center">Compras</th>
                        <th className="py-3 px-3 text-right">% do Total em Cartões</th>
                        <th className="py-3 px-4 text-right">Total Gasto (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cardCategoryReport.byCategoryList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            Nenhum gasto em cartão encontrado no período.
                          </td>
                        </tr>
                      ) : (
                        cardCategoryReport.byCategoryList.map((catItem) => {
                          const isExpanded = expandedCardGroups[`modeB-${catItem.category.id}`] ?? true;

                          return (
                            <React.Fragment key={catItem.category.id}>
                              {/* Category Main Row */}
                              <tr
                                onClick={() => toggleExpandCardGroup(`modeB-${catItem.category.id}`)}
                                className="bg-slate-50/70 font-semibold hover:bg-slate-100/70 cursor-pointer transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="no-print text-slate-400">
                                      {isExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      )}
                                    </span>
                                    <div
                                      className="w-5 h-5 rounded flex items-center justify-center text-white shrink-0"
                                      style={{ backgroundColor: catItem.category.color }}
                                    >
                                      <CategoryIcon
                                        name={catItem.category.icon}
                                        className="w-3 h-3"
                                      />
                                    </div>
                                    <span className="text-slate-900 text-sm">
                                      {catItem.category.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-slate-600 tabular-nums">
                                  {catItem.count}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">
                                  {formatPercent(catItem.pctOfTotalCards)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums text-sm">
                                  {formatCurrency(catItem.total)}
                                </td>
                              </tr>

                              {/* Which Cards were used for this Category */}
                              {isExpanded &&
                                catItem.cardsUsed.map((cardData) => (
                                  <React.Fragment key={cardData.cardId}>
                                    <tr className="hover:bg-slate-50/40 text-slate-600 transition-colors">
                                      <td className="py-2 px-4 pl-12">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: cardData.cardColor }}
                                          />
                                          <span className="font-medium text-slate-800">
                                            {cardData.cardName}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono text-slate-500 tabular-nums text-[11px]">
                                        {cardData.count}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-500 tabular-nums text-[11px]">
                                        {formatPercent(cardData.pctOfCategory)} desta categoria
                                      </td>
                                      <td className="py-2 px-4 text-right font-mono font-medium text-slate-800 tabular-nums">
                                        {formatCurrency(cardData.total)}
                                      </td>
                                    </tr>

                                    {/* Detailed transactions with Purchase Date and Due Date */}
                                    {cardData.txs && cardData.txs.length > 0 && (
                                      <tr className="bg-slate-50/70 border-b border-slate-200">
                                        <td colSpan={4} className="py-2.5 px-4 pl-16">
                                          <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1.5 shadow-2xs">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1.5 border-b border-slate-100 uppercase tracking-wider">
                                              <span>Lançamentos em {cardData.cardName} ({cardData.txs.length})</span>
                                              <span>Data da Compra · Vencimento do Cartão</span>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                              {cardData.txs.map((tx) => {
                                                const txDates = getTransactionCardDates(tx, cards);
                                                return (
                                                  <div key={tx.id} className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      <span className="font-semibold text-slate-800 truncate">{tx.description}</span>
                                                      {tx.installment && (
                                                        <span className="shrink-0 text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold">
                                                          {tx.installment.current}/{tx.installment.total}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                                                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                                                        <span className="text-[9px] font-bold uppercase text-slate-400">Compra:</span>
                                                        <span className="font-semibold">{formatDate(txDates.purchaseDate)}</span>
                                                      </div>
                                                      {txDates.dueDate && (
                                                        <div className="flex items-center gap-1 text-[11px] font-mono text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-semibold">
                                                          <CalendarClock className="w-3 h-3 text-amber-700" />
                                                          <span className="text-[9px] font-bold uppercase text-amber-800">Venc. Cartão:</span>
                                                          <span>{formatDate(txDates.dueDate)}</span>
                                                        </div>
                                                      )}
                                                      <span className="font-mono font-bold text-slate-900 min-w-[70px] text-right">
                                                        {formatCurrency(tx.amount)}
                                                      </span>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                ))}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold text-sm">
                        <td className="py-3 px-4">TOTAL EM CARTÕES DE CRÉDITO</td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-slate-300">
                          {cardCategoryReport.totalCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-slate-300">
                          100.0%
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-base">
                          {formatCurrency(cardCategoryReport.totalSpentOnCards)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* REPORT TYPE: CATEGORY & SUBCATEGORY BREAKDOWN */}
        {/* ============================================================ */}
        {reportType === 'category_subcategory' && (
          <div className="space-y-4">
            {/* Filter Toolbar (No Print) */}
            <div className="no-print bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                {/* Type Switcher Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-2xs self-start">
                  <button
                    onClick={() => handleCategoryTypeChange('expense')}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      categoryTypeTab === 'expense'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Despesas</span>
                  </button>
                  <button
                    onClick={() => handleCategoryTypeChange('income')}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      categoryTypeTab === 'income'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Receitas</span>
                  </button>
                </div>

                {/* Quick Expand / Collapse and Clear */}
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={expandAllCats}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                  >
                    Expandir Todas
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllCats}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                  >
                    Recolher Todas
                  </button>
                  {(selectedCatFilter !== 'all' || selectedSubcatFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={clearCategoryFilters}
                      className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Limpar Filtros</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Category & Subcategory Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Filtrar por Categoria:</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCatFilter}
                      onChange={(e) => handleCategoryFilterChange(e.target.value)}
                      className="w-full py-2 pl-3 pr-8 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                    >
                      <option value="all">
                        Todas as Categorias ({availableCategoriesForFilter.length})
                      </option>
                      {availableCategoriesForFilter.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.subcategories?.length || 0} subcategorias)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subcategory Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Filtrar por Subcategoria:</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSubcatFilter}
                      onChange={(e) => setSelectedSubcatFilter(e.target.value)}
                      className="w-full py-2 pl-3 pr-8 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                    >
                      <option value="all">
                        {selectedCatFilter === 'all'
                          ? 'Todas as Subcategorias'
                          : `Todas as Subcategorias de "${categories.find((c) => c.id === selectedCatFilter)?.name || ''}"`}
                      </option>

                      {selectedCatFilter !== 'all' ? (
                        <>
                          {(categories.find((c) => c.id === selectedCatFilter)?.subcategories || []).map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                          <option value="sub-unassigned">Outros / Não especificado</option>
                        </>
                      ) : (
                        availableCategoriesForFilter.map((cat) => {
                          if (!cat.subcategories || cat.subcategories.length === 0) return null;
                          return (
                            <optgroup key={cat.id} label={cat.name}>
                              {cat.subcategories.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name} ({cat.name})
                                </option>
                              ))}
                            </optgroup>
                          );
                        })
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Filter Badges & Summary */}
              {(selectedCatFilter !== 'all' || selectedSubcatFilter !== 'all') && (
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500 font-medium">Filtrando por:</span>
                    {selectedCatFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Tag className="w-3 h-3 text-indigo-500" />
                        <span>Categoria: {categories.find((c) => c.id === selectedCatFilter)?.name || 'Selecionada'}</span>
                        <button
                          type="button"
                          onClick={() => handleCategoryFilterChange('all')}
                          className="hover:text-indigo-900 cursor-pointer ml-1"
                          title="Remover filtro de categoria"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedSubcatFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                        <Layers className="w-3 h-3 text-violet-500" />
                        <span>
                          Subcategoria:{' '}
                          {selectedSubcatFilter === 'sub-unassigned'
                            ? 'Outros / Não especificado'
                            : availableSubcategoriesForFilter.find((s) => s.id === selectedSubcatFilter)?.name || 'Selecionada'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedSubcatFilter('all')}
                          className="hover:text-violet-900 cursor-pointer ml-1"
                          title="Remover filtro de subcategoria"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 font-medium">
                    Resultado filtrado: <strong className="font-mono text-slate-900">{formatCurrency(categorySubcategoryReport.totalForType)}</strong> ({categorySubcategoryReport.relevantTxsCount} lançamentos)
                  </div>
                </div>
              )}
            </div>

            {/* Empty State when filters yield no items */}
            {categorySubcategoryReport.items.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                  <Filter className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Nenhum lançamento encontrado para os filtros selecionados
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Não foram encontradas despesas ou receitas para a categoria e subcategoria escolhidas no período de <strong>{periodLabel}</strong>.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={clearCategoryFilters}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    Limpar Filtros de Categorias & Sub
                  </button>
                </div>
              </div>
            ) : (
              /* Report Table */
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold select-none">
                      <th className="py-2.5 px-4">Categoria / Subcategoria</th>
                      <th className="py-2.5 px-3 text-center">Lançamentos</th>
                      <th className="py-2.5 px-4 text-right">Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categorySubcategoryReport.items.map((catItem) => {
                      const isExpanded = expandedCats[catItem.category.id] ?? true;

                      return (
                        <React.Fragment key={catItem.category.id}>
                          <tr
                            onClick={() => toggleExpand(catItem.category.id)}
                            className="bg-slate-50/70 hover:bg-slate-100/70 font-semibold cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="no-print text-slate-400">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </span>
                                <div
                                  className="w-5 h-5 rounded flex items-center justify-center text-white shrink-0 shadow-2xs"
                                  style={{ backgroundColor: catItem.category.color }}
                                >
                                  <CategoryIcon
                                    name={catItem.category.icon}
                                    className="w-3 h-3"
                                  />
                                </div>
                                <span className="text-slate-900 text-sm">
                                  {catItem.category.name}
                                </span>
                                {selectedCatFilter === catItem.category.id && (
                                  <span className="no-print px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                    Filtro Ativo
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-slate-600 tabular-nums">
                              {catItem.count}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums text-sm">
                              {formatCurrency(catItem.total)}
                            </td>
                          </tr>

                          {isExpanded &&
                            catItem.subcategories.map((subItem) => {
                              const isSubFiltered = selectedSubcatFilter === subItem.id;
                              return (
                                <tr
                                  key={subItem.id}
                                  className={`transition-colors ${
                                    isSubFiltered
                                      ? 'bg-indigo-50/40 text-indigo-950 font-medium'
                                      : 'hover:bg-slate-50/40 text-slate-600'
                                  }`}
                                >
                                  <td className="py-2 px-4 pl-12">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: catItem.category.color }}
                                      />
                                      <span>{subItem.name}</span>
                                      {isSubFiltered && (
                                        <span className="no-print px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
                                          Selecionada
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-center font-mono text-slate-500 tabular-nums text-[11px]">
                                    {subItem.count}
                                  </td>
                                  <td className="py-2 px-4 text-right font-mono font-medium text-slate-800 tabular-nums">
                                    {formatCurrency(subItem.total)}
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold text-xs">
                      <td className="py-3 px-4">
                        TOTAL ANALISADO ({categoryTypeTab === 'expense' ? 'DESPESAS' : 'RECEITAS'})
                        {categorySubcategoryReport.isFiltered && (
                          <span className="ml-2 font-normal text-[10px] text-indigo-300">
                            (Filtrado)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300">
                        {categorySubcategoryReport.relevantTxsCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-sm">
                        {formatCurrency(categorySubcategoryReport.totalForType)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* REPORT TYPE: FUTURE INSTALLMENTS */}
        {/* ============================================================ */}
        {reportType === 'future_installments' && (
          <div className="space-y-6">
            <p className="text-xs text-slate-600">
              Planejamento de parcelas já contratadas em compras parceladas nos cartões de crédito para os próximos meses:
            </p>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                    <th className="py-2.5 px-4">Lançamento / Descrição</th>
                    <th className="py-2.5 px-3">Cartão de Crédito</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Data da Compra</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Vencimento do Cartão</th>
                    <th className="py-2.5 px-3 text-center">Parcela</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {futureInstallmentsReport.map((m) => (
                    <React.Fragment key={m.monthKey}>
                      <tr className="bg-slate-100/80 font-semibold border-y border-slate-200">
                        <td colSpan={2} className="py-2.5 px-4 text-slate-900 font-bold text-sm">
                          {formatMonthName(m.monthKey)}
                        </td>
                        <td colSpan={4} className="py-2.5 px-3 text-slate-500 font-mono">
                          {m.items.length} {m.items.length === 1 ? 'parcela programada' : 'parcelas programadas'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 tabular-nums text-sm">
                          {formatCurrency(m.total)}
                        </td>
                      </tr>

                      {m.items.map(({ tx, card }) => {
                        const itemDates = getTransactionCardDates(tx, cards);
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/60 text-slate-700">
                            <td className="py-2 px-4 pl-6">
                              <span className="font-semibold text-slate-900">{tx.description}</span>
                            </td>
                            <td className="py-2 px-3">
                              {card ? (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: card.color }}
                                  />
                                  <span className="font-medium text-slate-800">{card.name}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">Cartão Geral</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {formatDate(itemDates.purchaseDate)}
                            </td>
                            <td className="py-2 px-3 font-mono text-amber-900 whitespace-nowrap font-semibold">
                              <span className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                                {formatDate(itemDates.dueDate || tx.date)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap font-mono text-indigo-700 font-semibold">
                              {tx.installment ? `${tx.installment.current}/${tx.installment.total}` : '1/1'}
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                                tx.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {tx.status === 'completed' ? 'Quitado' : 'A pagar'}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold">
                              {formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* REPORT TYPE: DEMONSTRATIVO DRE */}
        {/* ============================================================ */}
        {reportType === 'income_statement' && (
          <div className="space-y-6">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                    <th className="py-2.5 px-4">Conta Contábil / Categoria</th>
                    <th className="py-2.5 px-3 text-center">Registros</th>
                    <th className="py-2.5 px-3 text-right">% da Receita</th>
                    <th className="py-2.5 px-4 text-right">Valor Consolidado (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-emerald-50/50 font-bold text-emerald-900 border-t border-b border-emerald-200">
                    <td colSpan={3} className="py-2.5 px-4">
                      (+) RECEITAS OPERACIONAIS BRUTAS
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-sm">
                      +{formatCurrency(dreReport.totalIncome)}
                    </td>
                  </tr>

                  {dreReport.incomeCategories.map((inc) => (
                    <tr key={inc.category.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-4 pl-8 text-slate-700 font-medium">
                        {inc.category.name}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-500 tabular-nums">
                        {inc.count}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 tabular-nums">
                        {formatPercent(dreReport.totalIncome > 0 ? (inc.total / dreReport.totalIncome) * 100 : 0)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-emerald-700 font-medium tabular-nums">
                        +{formatCurrency(inc.total)}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-rose-50/50 font-bold text-rose-900 border-t border-b border-rose-200">
                    <td colSpan={3} className="py-2.5 px-4">
                      (-) DESPESAS E CUSTOS OPERACIONAIS
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-sm">
                      -{formatCurrency(dreReport.totalExpense)}
                    </td>
                  </tr>

                  {dreReport.expenseCategories.map((exp) => (
                    <tr key={exp.category.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-4 pl-8 text-slate-700 font-medium">
                        {exp.category.name}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-500 tabular-nums">
                        {exp.count}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 tabular-nums">
                        {formatPercent(dreReport.totalIncome > 0 ? (exp.total / dreReport.totalIncome) * 100 : 0)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-rose-700 font-medium tabular-nums">
                        -{formatCurrency(exp.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-sm">
                    <td className="py-3 px-4">(=) RESULTADO LÍQUIDO DO PERÍODO</td>
                    <td className="py-3 px-3 text-center font-mono text-xs text-slate-300">
                      {filteredTransactions.length}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-slate-300">
                      {formatPercent(dreReport.savingsRate)} margem
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-base">
                      {formatCurrency(dreReport.netBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* REPORT TYPE: MONTHLY COMPARISON */}
        {/* ============================================================ */}
        {reportType === 'monthly_comparison' && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold select-none">
                    <th className="py-2.5 px-4">Competência (Mês/Ano)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700">Receitas</th>
                    <th className="py-2.5 px-3 text-right text-rose-700">Despesas</th>
                    <th className="py-2.5 px-3 text-right">Saldo Líquido</th>
                    <th className="py-2.5 px-4 text-right">Var. Despesas MoM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyComparisonReport.map((m) => (
                    <tr key={m.monthKey} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {formatMonthName(m.monthKey)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600 font-semibold tabular-nums">
                        +{formatCurrency(m.income)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600 font-semibold tabular-nums">
                        -{formatCurrency(m.expense)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-bold tabular-nums ${
                          m.netBalance >= 0 ? 'text-slate-900' : 'text-rose-700'
                        }`}
                      >
                        {formatCurrency(m.netBalance)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {m.expenseDiff === 0 ? (
                          '--'
                        ) : (
                          <span
                            className={
                              m.expenseDiff > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }
                          >
                            {m.expenseDiff > 0 ? '+' : ''}
                            {formatPercent(m.expensePctChange)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
