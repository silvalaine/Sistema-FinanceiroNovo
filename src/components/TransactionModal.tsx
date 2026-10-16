import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Check, CreditCard as CardIcon, Layers, Calendar, CalendarClock, AlertCircle, CheckCircle2, Calculator, Delete } from 'lucide-react';
import { Category, CreditCard, PaymentMethod, Transaction, TransactionStatus, TransactionType } from '../types/finance';
import { CategoryIcon } from './CategoryIcon';
import { 
  addMonthsToDate, 
  calculateCardInvoiceDueDate, 
  formatCurrency, 
  formatDate, 
  PAYMENT_METHOD_LABELS 
} from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => void;
  onSaveMultiple?: (txs: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  categories: Category[];
  cards: CreditCard[];
  initialTransaction?: Transaction | null;
  onQuickAddSubcategory: (categoryId: string, subcategoryName: string) => void;
  defaultType?: TransactionType;
}

// Safe math evaluator for quick inline arithmetic (+, -, *, /)
function evaluateMathExpression(expr: string): number | null {
  if (!expr || typeof expr !== 'string') return null;
  const clean = expr.replace(/R\$/g, '').replace(/,/g, '.').replace(/\s+/g, '');
  if (!clean) return null;
  if (!/^[0-9+\-*/.()]+$/.test(clean)) return null;

  try {
    const safeExpr = clean.replace(/[+\-*/.]+$/, '');
    if (!safeExpr) return null;
    const result = new Function(`"use strict"; return (${safeExpr});`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return Math.round(result * 100) / 100;
    }
    return null;
  } catch {
    return null;
  }
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveMultiple,
  categories,
  cards,
  initialTransaction,
  onQuickAddSubcategory,
  defaultType = 'expense',
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cardId, setCardId] = useState<string>('');
  const [status, setStatus] = useState<TransactionStatus>('completed');
  const [notes, setNotes] = useState<string>('');
  const [customDueDate, setCustomDueDate] = useState<string>('');

  // Closed invoice auto-shift option:
  // When expense is on a credit card and invoice is closed, post on next month invoice due date
  const [postOnInvoiceDueDate, setPostOnInvoiceDueDate] = useState<boolean>(true);

  // Installment configuration (for expenses)
  const [isInstallment, setIsInstallment] = useState<boolean>(false);
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [installmentValueMode, setInstallmentValueMode] = useState<'total' | 'per_installment'>('total');

  // Quick add subcategory inline input
  const [isAddingSubcat, setIsAddingSubcat] = useState<boolean>(false);
  const [newSubcatName, setNewSubcatName] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Quick next transaction feedback & ref
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [sessionSavedCount, setSessionSavedCount] = useState<number>(0);
  const amountInputRef = React.useRef<HTMLInputElement>(null);
  const descriptionInputRef = React.useRef<HTMLInputElement>(null);

  // Mini Calculator State
  const [isCalcOpen, setIsCalcOpen] = useState<boolean>(false);
  const [calcFormula, setCalcFormula] = useState<string>('');

  const calcResult = useMemo(() => evaluateMathExpression(calcFormula), [calcFormula]);

  const handleCalcInput = (val: string) => {
    setCalcFormula((prev) => {
      const isOperator = ['+', '-', '*', '/'].includes(val);
      const lastChar = prev.slice(-1);
      const lastIsOperator = ['+', '-', '*', '/'].includes(lastChar);
      if (isOperator && lastIsOperator) {
        return prev.slice(0, -1) + val;
      }
      return prev + val;
    });
  };

  const handleCalcClear = () => {
    setCalcFormula('');
  };

  const handleCalcBackspace = () => {
    setCalcFormula((prev) => prev.slice(0, -1));
  };

  const handleCalcEqual = () => {
    if (calcResult !== null) {
      setCalcFormula(calcResult.toString());
    }
  };

  const handleCalcApply = () => {
    const finalVal = calcResult !== null ? calcResult : parseFloat(calcFormula.replace(',', '.')) || 0;
    if (finalVal > 0) {
      setAmountStr(finalVal.toFixed(2));
    }
    setIsCalcOpen(false);
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 60);
  };

  const handleQuickPercent = (pct: number) => {
    const currentVal = calcResult !== null ? calcResult : parseFloat(calcFormula) || parseFloat(amountStr) || 0;
    if (currentVal > 0) {
      const added = currentVal * (1 + pct / 100);
      setCalcFormula((Math.round(added * 100) / 100).toString());
    }
  };

  const handleQuickDivide = (divisor: number) => {
    const currentVal = calcResult !== null ? calcResult : parseFloat(calcFormula) || parseFloat(amountStr) || 0;
    if (currentVal > 0) {
      const divided = currentVal / divisor;
      setCalcFormula((Math.round(divided * 100) / 100).toString());
    }
  };

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmountStr(initialTransaction.amount.toString());
      setDescription(initialTransaction.description);
      setDate(initialTransaction.date);
      setCategoryId(initialTransaction.categoryId);
      setSubcategoryId(initialTransaction.subcategoryId);
      setPaymentMethod(initialTransaction.paymentMethod);
      setCardId(initialTransaction.cardId || (cards[0]?.id ?? ''));
      setStatus(initialTransaction.status);
      setNotes(initialTransaction.notes || '');
      setCustomDueDate(initialTransaction.dueDate || '');
      setIsInstallment(!!initialTransaction.installment);
      if (initialTransaction.installment) {
        setInstallmentsCount(initialTransaction.installment.total);
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      setType(defaultType);
      setAmountStr('');
      setDescription('');
      setDate(today);
      setStatus('completed');
      setPaymentMethod('pix');
      setCardId(cards[0]?.id || '');
      setNotes('');
      setCustomDueDate(defaultType === 'expense' ? today : '');
      setIsInstallment(false);
      setInstallmentsCount(2);
      setInstallmentValueMode('total');

      const availableCats = categories.filter((c) => c.type === defaultType);
      if (availableCats.length > 0) {
        setCategoryId(availableCats[0].id);
        if (availableCats[0].subcategories.length > 0) {
          setSubcategoryId(availableCats[0].subcategories[0].id);
        } else {
          setSubcategoryId('');
        }
      }
    }
    setIsAddingSubcat(false);
    setNewSubcatName('');
    setError('');
    setSuccessBanner(null);
    setIsCalcOpen(false);
    setCalcFormula('');
    if (!isOpen) {
      setSessionSavedCount(0);
    } else {
      setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 80);
    }
  }, [initialTransaction, isOpen, defaultType, cards]);

  const availableCategories = categories.filter((c) => c.type === type);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      setIsInstallment(false);
    } else if (paymentMethod !== 'credit_card' && !customDueDate) {
      setCustomDueDate(date || new Date().toISOString().split('T')[0]);
    }
    const validCats = categories.filter((c) => c.type === newType);
    if (validCats.length > 0) {
      setCategoryId(validCats[0].id);
      if (validCats[0].subcategories.length > 0) {
        setSubcategoryId(validCats[0].subcategories[0].id);
      } else {
        setSubcategoryId('');
      }
    } else {
      setCategoryId('');
      setSubcategoryId('');
    }
  };

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const cat = categories.find((c) => c.id === newCatId);
    if (cat && cat.subcategories.length > 0) {
      setSubcategoryId(cat.subcategories[0].id);
    } else {
      setSubcategoryId('');
    }
  };

  const currentCategory = categories.find((c) => c.id === categoryId);
  const currentSubcategories = currentCategory ? currentCategory.subcategories : [];

  const handleCreateInlineSubcategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcatName.trim() || !categoryId) return;
    onQuickAddSubcategory(categoryId, newSubcatName.trim());
    const generatedId = `sub-${Date.now()}`;
    setSubcategoryId(generatedId);
    setNewSubcatName('');
    setIsAddingSubcat(false);
  };

  // Calculations for installments
  const enteredAmount = parseFloat(amountStr.replace(',', '.')) || 0;
  const eachInstallmentAmount =
    installmentValueMode === 'total'
      ? enteredAmount > 0 ? enteredAmount / installmentsCount : 0
      : enteredAmount;
  const totalPurchaseAmount =
    installmentValueMode === 'total'
      ? enteredAmount
      : enteredAmount * installmentsCount;

  // Credit Card & Closed Invoice Calculations
  const selectedCard = useMemo(() => {
    if (cards.length === 0) return null;
    return cards.find((c) => c.id === cardId) || cards[0];
  }, [cards, cardId]);

  const isCreditCardExpense = type === 'expense' && paymentMethod === 'credit_card' && !!selectedCard;

  const invoiceCalc = useMemo(() => {
    if (!isCreditCardExpense || !selectedCard) return null;
    return calculateCardInvoiceDueDate(date, selectedCard);
  }, [isCreditCardExpense, selectedCard, date]);

  const handleSaveForm = (keepOpen: boolean) => {
    if (enteredAmount <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }
    if (!description.trim()) {
      setError('Informe uma descrição.');
      return;
    }
    if (!categoryId) {
      setError('Selecione uma categoria.');
      return;
    }

    const chosenSubcat = subcategoryId || (currentSubcategories[0]?.id ?? 'sub-geral');
    const chosenCardId = paymentMethod === 'credit_card' ? cardId || undefined : undefined;
    const baseDate = date || new Date().toISOString().split('T')[0];

    // Determine if date shifts to next month invoice due date
    const shouldPostOnDueDate = isCreditCardExpense && invoiceCalc?.isClosed && postOnInvoiceDueDate;
    const effectiveDate = shouldPostOnDueDate && invoiceCalc ? invoiceCalc.targetDueDate : baseDate;
    // Compras no cartão iniciam como pendentes de quitação de fatura para comprometer o limite total
    const effectiveStatus: TransactionStatus = isCreditCardExpense && !initialTransaction && status === 'completed'
      ? 'pending'
      : (shouldPostOnDueDate ? 'pending' : status);
    const cardDueDate = isCreditCardExpense && invoiceCalc ? invoiceCalc.targetDueDate : undefined;

    const savedDesc = description.trim();
    const savedAmountFormatted = formatCurrency(isInstallment ? totalPurchaseAmount : enteredAmount);

    // CASE 1: New Installment Expense Creation
    if (!initialTransaction && isInstallment && installmentsCount > 1 && type === 'expense') {
      const groupId = `grp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const installmentTransactions: Omit<Transaction, 'id' | 'createdAt'>[] = [];

      for (let i = 0; i < installmentsCount; i++) {
        const instNumber = i + 1;
        const instDate = addMonthsToDate(effectiveDate, i);
        const instDueDate = isCreditCardExpense
          ? (cardDueDate ? addMonthsToDate(cardDueDate, i) : undefined)
          : (customDueDate.trim()
              ? addMonthsToDate(customDueDate.trim(), i)
              : addMonthsToDate(effectiveDate, i));
        // Todas as parcelas no cartão começam pendentes (ocupam limite até que cada fatura seja paga)
        const instStatus: TransactionStatus = isCreditCardExpense ? 'pending' : effectiveStatus;

        const installmentNote = notes.trim()
          ? `${notes.trim()} · Parcela ${instNumber} de ${installmentsCount}${shouldPostOnDueDate && i === 0 ? ` (Compra original em ${formatDate(baseDate)})` : ''}`
          : `Parcela ${instNumber} de ${installmentsCount}${shouldPostOnDueDate && i === 0 ? ` (Compra original em ${formatDate(baseDate)})` : ''}`;

        installmentTransactions.push({
          description: `${description.trim()} (${String(instNumber).padStart(2, '0')}/${String(installmentsCount).padStart(2, '0')})`,
          amount: parseFloat(eachInstallmentAmount.toFixed(2)),
          type: 'expense',
          categoryId,
          subcategoryId: chosenSubcat,
          date: instDate,
          paymentMethod,
          cardId: chosenCardId,
          status: instStatus,
          purchaseDate: isCreditCardExpense ? baseDate : undefined,
          dueDate: instDueDate,
          installment: {
            current: instNumber,
            total: installmentsCount,
            groupId,
          },
          notes: installmentNote,
        });
      }

      if (onSaveMultiple) {
        onSaveMultiple(installmentTransactions);
      } else {
        // Fallback save first
        onSave(installmentTransactions[0]);
      }

      if (keepOpen) {
        setSessionSavedCount((prev) => prev + 1);
        setSuccessBanner(`Parcelamento de "${savedDesc}" (${installmentsCount}x de ${formatCurrency(eachInstallmentAmount)}) salvo com sucesso! Preencha a próxima transação.`);
        setError('');
        setDescription('');
        setAmountStr('');
        setNotes('');
        setIsInstallment(false);
        setTimeout(() => {
          amountInputRef.current?.focus();
          amountInputRef.current?.select();
        }, 60);
      } else {
        onClose();
      }
      return;
    }

    // CASE 2: Single Transaction (or updating an existing one)
    const effectiveNotes = shouldPostOnDueDate
      ? notes.trim()
        ? `${notes.trim()} (Compra em ${formatDate(baseDate)} · Fatura fechada)`
        : `Compra em ${formatDate(baseDate)} · Fatura fechada dia ${selectedCard?.closingDay}`
      : notes.trim() || undefined;

    onSave({
      id: initialTransaction ? initialTransaction.id : undefined,
      description: description.trim(),
      amount: enteredAmount,
      type,
      categoryId,
      subcategoryId: chosenSubcat,
      date: effectiveDate,
      paymentMethod,
      cardId: chosenCardId,
      status: effectiveStatus,
      notes: effectiveNotes,
      purchaseDate: isCreditCardExpense ? baseDate : undefined,
      dueDate: isCreditCardExpense
        ? cardDueDate
        : (type === 'expense' ? (customDueDate.trim() || effectiveDate) : (customDueDate.trim() || undefined)),
      installment: initialTransaction?.installment,
    });

    if (keepOpen) {
      setSessionSavedCount((prev) => prev + 1);
      setSuccessBanner(`Transação "${savedDesc}" (${savedAmountFormatted}) salva com sucesso! Preencha a próxima.`);
      setError('');
      setDescription('');
      setAmountStr('');
      setNotes('');
      setCustomDueDate('');
      setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 60);
    } else {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden transition-all my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {initialTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h2>
            <p className="text-xs text-slate-500">
              Preencha os detalhes da movimentação financeira
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form 
          onSubmit={handleSubmit} 
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSaveForm(!initialTransaction);
            }
          }}
          className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
        >
          {/* Success Banner when saving consecutive transactions */}
          {successBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between gap-2 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successBanner}</span>
              </div>
              {sessionSavedCount > 0 && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full shrink-0">
                  {sessionSavedCount} {sessionSavedCount === 1 ? 'salvo' : 'salvos'} nesta sessão
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-xs font-semibold rounded-md transition-all ${
                type === 'expense'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Despesa (Saída)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-xs font-semibold rounded-md transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Receita (Entrada)
            </button>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  {isInstallment && installmentValueMode === 'total'
                    ? 'Valor Total da Compra (R$)'
                    : isInstallment
                    ? 'Valor de Cada Parcela (R$)'
                    : 'Valor (R$)'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!isCalcOpen) {
                      setCalcFormula(amountStr ? amountStr.replace(',', '.') : '');
                    }
                    setIsCalcOpen(!isCalcOpen);
                  }}
                  className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    isCalcOpen
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
                  }`}
                  title="Abrir calculadora rápida para somar, subtrair ou dividir valores"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Calculadora</span>
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-mono">
                  R$
                </span>
                <input
                  ref={amountInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0,00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!isCalcOpen) {
                      setCalcFormula(amountStr ? amountStr.replace(',', '.') : '');
                    }
                    setIsCalcOpen(!isCalcOpen);
                  }}
                  className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="Abrir calculadora rápida"
                >
                  <Calculator className="w-4 h-4" />
                </button>
              </div>

              {/* Mini Calculadora Integrada */}
              {isCalcOpen && (
                <div className="mt-2.5 p-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700/80 animate-in fade-in zoom-in-95 duration-100 select-none">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Calculadora Rápida</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCalcOpen(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
                      title="Fechar calculadora"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Display da Conta e Resultado */}
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 mb-2.5 text-right font-mono">
                    <div className="text-[11px] text-slate-400 truncate min-h-[16px]">
                      {calcFormula || '0'}
                    </div>
                    <div className="text-base sm:text-lg font-bold text-emerald-400 truncate tabular-nums">
                      = {formatCurrency(calcResult !== null ? calcResult : (parseFloat(calcFormula) || 0))}
                    </div>
                  </div>

                  {/* Atalhos Rápidos */}
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDivide(2)}
                      className="py-1 px-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded transition-colors cursor-pointer font-bold text-center"
                      title="Dividir por 2"
                    >
                      ÷ 2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDivide(3)}
                      className="py-1 px-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded transition-colors cursor-pointer font-bold text-center"
                      title="Dividir por 3"
                    >
                      ÷ 3
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(10)}
                      className="py-1 px-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded transition-colors cursor-pointer font-bold text-center"
                      title="Acrescentar 10%"
                    >
                      + 10%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(15)}
                      className="py-1 px-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded transition-colors cursor-pointer font-bold text-center"
                      title="Acrescentar 15%"
                    >
                      + 15%
                    </button>
                  </div>

                  {/* Teclado da Calculadora */}
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={handleCalcClear}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg transition-colors cursor-pointer font-bold"
                    >
                      C
                    </button>
                    <button
                      type="button"
                      onClick={handleCalcBackspace}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer font-bold"
                      title="Apagar último dígito"
                    >
                      ⌫
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcInput('/')}
                      className="py-2 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 rounded-lg transition-colors cursor-pointer font-bold text-sm"
                    >
                      ÷
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcInput('*')}
                      className="py-2 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 rounded-lg transition-colors cursor-pointer font-bold text-sm"
                    >
                      ×
                    </button>

                    {/* Linha 2: 7, 8, 9, - */}
                    <button
                      type="button"
                      onClick={() => handleCalcInput('7')}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      7
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcInput('8')}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      8
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcInput('9')}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      9
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcInput('-')}
                      className="py-2 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 rounded-lg transition-colors cursor-pointer font-bold text-sm"
                    >
                      -
                    </button>

                    {/* Linha 3: 4, 5, 6, + */}
                    <button
                      type="button"
                      onClick={() => handleCalcInput('4')}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      4
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcInput('5')}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcInput('6')}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      6
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcInput('+')}
                      className="py-2 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 rounded-lg transition-colors cursor-pointer font-bold text-sm"
                    >
                      +
                    </button>

                    {/* Linha 4: 1, 2, 3, = */}
                    <button
                      type="button"
                      onClick={() => handleCalcInput('1')}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcInput('2')}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcInput('3')}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      3
                    </button>
                    <button
                      type="button"
                      onClick={handleCalcEqual}
                      className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer font-bold text-sm"
                      title="Calcular resultado"
                    >
                      =
                    </button>

                    {/* Linha 5: 0, ., Usar no Lançamento */}
                    <button
                      type="button"
                      onClick={() => handleCalcInput('0')}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcInput('.')}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      ,
                    </button>
                    <button
                      type="button"
                      onClick={handleCalcApply}
                      className="col-span-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                      title="Inserir este valor no campo de lançamento"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Usar no Valor</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {isInstallment ? 'Data da 1ª Parcela (Compra)' : 'Data da Compra / Lançamento'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  const val = e.target.value;
                  const prevDate = date;
                  setDate(val);
                  if (type === 'expense' && paymentMethod !== 'credit_card' && (!customDueDate || customDueDate === prevDate)) {
                    setCustomDueDate(val);
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              />
              {isCreditCardExpense && invoiceCalc?.isClosed && postOnInvoiceDueDate && (
                <p className="text-[11px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                  <span>Fatura fechada: será lançado para <strong>{formatDate(invoiceCalc.targetDueDate)}</strong></span>
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Descrição <span className="text-rose-500">*</span>
            </label>
            <input
              ref={descriptionInputRef}
              type="text"
              required
              placeholder="ex: Compras semanais no mercado, Notebook Dell, Salário..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Categoria Principal <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
              >
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Subcategoria <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingSubcat(!isAddingSubcat)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {isAddingSubcat ? 'Cancelar' : '+ Nova sub'}
                </button>
              </div>

              {isAddingSubcat ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Nome da subcategoria"
                    value={newSubcatName}
                    onChange={(e) => setNewSubcatName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreateInlineSubcategory}
                    className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium"
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                >
                  {currentSubcategories.length === 0 ? (
                    <option value="">Geral</option>
                  ) : (
                    currentSubcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>

          {/* Payment Method & Credit Card Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const val = e.target.value as PaymentMethod;
                  setPaymentMethod(val);
                  if (val === 'credit_card') {
                    if (!cardId && cards.length > 0) {
                      setCardId(cards[0].id);
                    }
                    if (!initialTransaction) {
                      setStatus('pending');
                    }
                  } else if (type === 'expense' && !customDueDate) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setCustomDueDate(date || todayStr);
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
              >
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((key) => (
                  <option key={key} value={key}>
                    {PAYMENT_METHOD_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            {/* Credit Card Selector if paymentMethod is credit_card, or Data do Vencimento for other payment methods */}
            {paymentMethod === 'credit_card' ? (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cartão Utilizado
                </label>
                {cards.length === 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    Nenhum cartão cadastrado. Cadastre na aba Cartões.
                  </div>
                ) : (
                  <select
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                  >
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.lastFourDigits ? `(•••• ${c.lastFourDigits})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Data do Vencimento</span>
                    {type === 'expense' ? (
                      <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded font-semibold">
                        Despesa
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                    )}
                  </label>
                  {customDueDate && (
                    <button
                      type="button"
                      onClick={() => setCustomDueDate('')}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={customDueDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomDueDate(val);
                    if (val && !initialTransaction && status === 'completed') {
                      const todayStr = new Date().toISOString().split('T')[0];
                      if (val > todayStr) {
                        setStatus('pending');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-amber-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-amber-50/20 text-slate-800 font-mono"
                />
                {/* Atalhos rápidos para Data do Vencimento */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCustomDueDate(date || new Date().toISOString().split('T')[0])}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    Mesmo dia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = date || new Date().toISOString().split('T')[0];
                      const d = new Date(base + 'T12:00:00');
                      d.setDate(d.getDate() + 5);
                      setCustomDueDate(d.toISOString().split('T')[0]);
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    +5 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = date || new Date().toISOString().split('T')[0];
                      const d = new Date(base + 'T12:00:00');
                      d.setDate(d.getDate() + 10);
                      setCustomDueDate(d.toISOString().split('T')[0]);
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    +10 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = date || new Date().toISOString().split('T')[0];
                      const d = new Date(base + 'T12:00:00');
                      d.setDate(d.getDate() + 30);
                      setCustomDueDate(d.toISOString().split('T')[0]);
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    +30 dias
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {customDueDate ? (
                    <span className="text-amber-800 font-semibold flex items-center gap-1">
                      <CalendarClock className="w-3 h-3 text-amber-600" />
                      Vencimento da conta: {formatDate(customDueDate)}
                    </span>
                  ) : (
                    'Vencimento de boletos, aluguel, energia, contas fixas, etc.'
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Credit Card Invoice Status & Auto-Scheduling Notification */}
          {isCreditCardExpense && selectedCard && invoiceCalc && (
            <div>
              {invoiceCalc.isClosed ? (
                <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/90 rounded-xl space-y-2.5 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-800">
                      <CalendarClock className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                          Fatura Fechada (Fechou no Dia {selectedCard.closingDay})
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900 rounded-md">
                          Fatura de {invoiceCalc.targetMonthName}
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                        Como a compra no cartão <strong>{selectedCard.name}</strong> foi feita após o fechamento (dia {selectedCard.closingDay}), ela será lançada na fatura de <strong>{invoiceCalc.targetMonthName}</strong>, na data de vencimento da fatura: <strong className="text-amber-950 font-mono">{formatDate(invoiceCalc.targetDueDate)}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950">
                      <input
                        type="checkbox"
                        checked={postOnInvoiceDueDate}
                        onChange={(e) => setPostOnInvoiceDueDate(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-amber-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Lançar no vencimento da fatura de {invoiceCalc.targetMonthName} ({formatDate(invoiceCalc.targetDueDate)})</span>
                    </label>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md self-start sm:self-auto">
                      Status: Pendente (A Vencer)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      Fatura de <strong>{invoiceCalc.targetMonthName}</strong> aberta (fecha dia <strong>{selectedCard.closingDay}</strong> · Vence dia <strong>{formatDate(invoiceCalc.targetDueDate)}</strong>)
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50 shrink-0">
                    {invoiceCalc.targetMonthName}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* INSTALLMENT SECTION (Pagamento Parcelado) */}
          {type === 'expense' && !initialTransaction && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Pagamento Parcelado
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Gera automaticamente as parcelas nos meses subsequentes
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInstallment}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsInstallment(checked);
                      if (checked) {
                        setPaymentMethod('credit_card');
                        if (!cardId && cards.length > 0) setCardId(cards[0].id);
                        if (!initialTransaction) setStatus('pending');
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {isInstallment && (
                <div className="pt-2 border-t border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Número de Parcelas
                      </label>
                      <select
                        value={installmentsCount}
                        onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36, 48].map((num) => (
                          <option key={num} value={num}>
                            {num}x parcelas
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        O valor informado é:
                      </label>
                      <select
                        value={installmentValueMode}
                        onChange={(e) =>
                          setInstallmentValueMode(e.target.value as 'total' | 'per_installment')
                        }
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="total">Valor Total da Compra</option>
                        <option value="per_installment">Valor de Cada Parcela</option>
                      </select>
                    </div>
                  </div>

                  {/* Installment calculation summary */}
                  {enteredAmount > 0 && (
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-950 flex items-center justify-between">
                      <div>
                        <span className="font-semibold block">
                          {installmentsCount}x de {formatCurrency(eachInstallmentAmount)}
                        </span>
                        <span className="text-[11px] text-indigo-700">
                          Total da compra: {formatCurrency(totalPurchaseAmount)}
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-600 uppercase font-semibold">
                        {installmentsCount} meses
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Status da 1ª Parcela / Transação
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                  status === 'completed'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {status === 'completed' && <Check className="w-3.5 h-3.5" />}
                Realizado / Pago
              </button>
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                  status === 'pending'
                    ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {status === 'pending' && <Check className="w-3.5 h-3.5" />}
                Pendente / A Pagar
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              placeholder="Notas adicionais, número de nota, garantia..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <div className="flex items-center gap-2">
              {!initialTransaction && (
                <button
                  type="button"
                  onClick={() => handleSaveForm(true)}
                  className="px-3.5 sm:px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/90 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  title="Salvar esta transação e continuar na tela para cadastrar a próxima (Atalho: Ctrl+Enter)"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                  <span>Salvar e Próxima</span>
                  <kbd className="hidden sm:inline-block text-[9px] font-mono bg-white text-indigo-900 border border-indigo-200 px-1 py-0.2 rounded font-semibold ml-0.5">
                    Ctrl+Enter
                  </kbd>
                </button>
              )}
              <button
                type="submit"
                className="px-4.5 sm:px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-lg shadow-sm shadow-indigo-100 transition-colors cursor-pointer"
              >
                {initialTransaction
                  ? 'Salvar Alterações'
                  : isInstallment
                  ? `Criar ${installmentsCount} Parcelas`
                  : 'Adicionar Transação'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
