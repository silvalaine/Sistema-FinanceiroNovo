import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  Wallet,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  RotateCcw,
  Undo2
} from 'lucide-react';
import { Category, CreditCard, PaymentMethod, Transaction } from '../types/finance';
import {
  formatCurrency,
  formatDate,
  formatMonthName,
  getTransactionCardDates,
  PAYMENT_METHOD_LABELS
} from '../utils/formatters';

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CreditCard[];
  transactions: Transaction[];
  categories: Category[];
  initialCardId?: string;
  initialMonthKey?: string;
  onConfirmPayment: (
    updatedTransactions: Transaction[],
    paymentRecord?: Omit<Transaction, 'id' | 'createdAt'>,
    extraNewTransactions?: Transaction[]
  ) => void;
  onReversePayment?: (
    updatedTransactions: Transaction[],
    deletedTransactionIds: string[],
    newTransactions?: Transaction[]
  ) => void;
}

const round2 = (val: number): number => Math.round((val + Number.EPSILON) * 100) / 100;

const parseAmountInput = (raw: string): number => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[R$\s]/g, '');
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    normalized = cleaned.replace(',', '.');
  }

  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? round2(parsed) : 0;
};

const formatInputDecimal = (val: number): string => {
  if (val <= 0) return '';
  return round2(val).toFixed(2).replace('.', ',');
};

const appendNote = (existing: string | undefined, addition: string): string => {
  const base = existing?.trim();
  return base ? `${base} · ${addition}` : addition;
};

const stripInvoiceNotes = (notes?: string): string | undefined => {
  if (!notes) return undefined;
  const parts = notes
    .split(' · ')
    .map((p) => p.trim())
    .filter(
      (p) =>
        p &&
        !p.startsWith('Fatura paga em ') &&
        !p.startsWith('Abatimento parcial de ') &&
        !p.startsWith('Pagamento parcial em ')
    );
  return parts.length > 0 ? parts.join(' · ') : undefined;
};

export const PayInvoiceModal: React.FC<PayInvoiceModalProps> = ({
  isOpen,
  onClose,
  cards,
  transactions,
  categories,
  initialCardId,
  initialMonthKey,
  onConfirmPayment,
  onReversePayment,
}) => {
  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7);
  const nextMonthObj = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonthObj.getFullYear()}-${String(nextMonthObj.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  // Selected Card & Month State
  const [selectedCardId, setSelectedCardId] = useState<string>(
    initialCardId || (cards[0]?.id ?? '')
  );
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    initialMonthKey || currentMonthKey
  );

  // Payment Execution Form State
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [registerPaymentRecord, setRegisterPaymentRecord] = useState<boolean>(true);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [isManualAmount, setIsManualAmount] = useState<boolean>(false);

  // Reversal (Estorno) State
  const [showReversePanel, setShowReversePanel] = useState<boolean>(false);
  const [reverseAmountStr, setReverseAmountStr] = useState<string>('');
  const [reverseAlsoCashFlow, setReverseAlsoCashFlow] = useState<boolean>(true);
  const [confirmingBatchId, setConfirmingBatchId] = useState<string | null>(null);
  const [confirmingCustomReverse, setConfirmingCustomReverse] = useState<boolean>(false);

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Update card if initialCardId changes
  React.useEffect(() => {
    if (initialCardId && cards.some((c) => c.id === initialCardId)) {
      setSelectedCardId(initialCardId);
    } else if (cards.length > 0 && !cards.some((c) => c.id === selectedCardId)) {
      setSelectedCardId(cards[0].id);
    }
  }, [initialCardId, cards]);

  // Update month if initialMonthKey changes
  React.useEffect(() => {
    if (initialMonthKey) {
      setSelectedMonthKey(initialMonthKey);
    }
  }, [initialMonthKey]);

  const selectedCard = useMemo(() => {
    return cards.find((c) => c.id === selectedCardId) || cards[0] || null;
  }, [cards, selectedCardId]);

  // Available invoice months
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthKey);
    monthSet.add(nextMonthKey);

    transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.paymentMethod === 'credit_card' &&
          (!selectedCardId || t.cardId === selectedCardId)
      )
      .forEach((t) => {
        const m = t.date.slice(0, 7);
        if (m) monthSet.add(m);
      });

    return Array.from(monthSet).sort().reverse();
  }, [transactions, selectedCardId, currentMonthKey, nextMonthKey]);

  // Transactions belonging to this card's invoice for the selected month
  const invoiceTransactions = useMemo(() => {
    if (!selectedCard) return [];
    return transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.paymentMethod === 'credit_card' &&
          t.cardId === selectedCard.id &&
          t.date.startsWith(selectedMonthKey)
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }, [transactions, selectedCard, selectedMonthKey]);

  // Cash-flow payment records linked to this card & month
  const invoicePaymentRecords = useMemo(() => {
    if (!selectedCard) return [];
    const expectedPrefix = `Pagamento de Fatura · ${selectedCard.name} (${formatMonthName(selectedMonthKey)})`;
    return transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.paymentMethod !== 'credit_card' &&
          ((t.invoicePaymentCardId === selectedCard.id &&
            t.invoicePaymentMonthKey === selectedMonthKey) ||
            t.description === expectedPrefix)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [transactions, selectedCard, selectedMonthKey]);

  const pendingTransactions = useMemo(() => {
    return invoiceTransactions.filter((t) => t.status === 'pending');
  }, [invoiceTransactions]);

  const completedTransactions = useMemo(() => {
    return invoiceTransactions.filter((t) => t.status === 'completed');
  }, [invoiceTransactions]);

  const totalInvoiceAmount = round2(invoiceTransactions.reduce((acc, t) => acc + t.amount, 0));
  const totalPaidAmount = round2(completedTransactions.reduce((acc, t) => acc + t.amount, 0));
  const totalPendingAmount = round2(pendingTransactions.reduce((acc, t) => acc + t.amount, 0));
  const isFullyPaid = invoiceTransactions.length > 0 && pendingTransactions.length === 0;

  // Reset messages & reversal UI when switching card, month, or reopening
  React.useEffect(() => {
    setError(null);
    setSuccessMsg(null);
    setShowReversePanel(false);
    setConfirmingBatchId(null);
    setConfirmingCustomReverse(false);
  }, [isOpen, selectedCardId, selectedMonthKey]);

  // Sync selected pending transactions and default input values when pending/paid totals change
  const pendingSignature = pendingTransactions.map((t) => `${t.id}:${t.amount}`).join('|');
  React.useEffect(() => {
    const pendingIds = new Set(pendingTransactions.map((t) => t.id));
    setSelectedTxIds(pendingIds);
    setIsManualAmount(false);
    setCustomAmountStr(formatInputDecimal(totalPendingAmount));
  }, [selectedCardId, selectedMonthKey, isOpen, pendingSignature, totalPendingAmount]);

  React.useEffect(() => {
    setReverseAmountStr(formatInputDecimal(totalPaidAmount));
    setConfirmingCustomReverse(false);
    setConfirmingBatchId(null);
  }, [selectedCardId, selectedMonthKey, isOpen, totalPaidAmount]);

  const selectedPendingTotal = useMemo(() => {
    return round2(
      pendingTransactions
        .filter((t) => selectedTxIds.has(t.id))
        .reduce((acc, t) => acc + t.amount, 0)
    );
  }, [pendingTransactions, selectedTxIds]);

  const parsedCustomAmount = useMemo(() => parseAmountInput(customAmountStr), [customAmountStr]);
  const amountToPay = isManualAmount ? parsedCustomAmount : selectedPendingTotal;

  const parsedReverseAmount = useMemo(() => parseAmountInput(reverseAmountStr), [reverseAmountStr]);

  const toggleSelectTx = (id: string) => {
    const next = new Set(selectedTxIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTxIds(next);

    const newSum = round2(
      pendingTransactions.filter((t) => next.has(t.id)).reduce((acc, t) => acc + t.amount, 0)
    );
    setIsManualAmount(false);
    setCustomAmountStr(formatInputDecimal(newSum));
  };

  const handleSelectAllPending = () => {
    if (selectedTxIds.size === pendingTransactions.length) {
      setSelectedTxIds(new Set());
      setIsManualAmount(false);
      setCustomAmountStr('');
    } else {
      const allIds = new Set(pendingTransactions.map((t) => t.id));
      setSelectedTxIds(allIds);
      setIsManualAmount(false);
      setCustomAmountStr(formatInputDecimal(totalPendingAmount));
    }
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedCard) {
      setError('Selecione um cartão de crédito.');
      return;
    }

    if (invoiceTransactions.length === 0) {
      setError('Não há lançamentos nesta fatura para pagamento.');
      return;
    }

    if (pendingTransactions.length === 0) {
      setError('Esta fatura já está 100% quitada. Utilize a opção de estorno caso precise corrigir o valor.');
      return;
    }

    if (amountToPay <= 0) {
      setError('Informe um valor válido maior que zero para pagar.');
      return;
    }

    const formattedPaymentDate = paymentDate || todayStr;
    const batchId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Build ordered pool of pending transactions: selected first, then unselected if manual amount exceeds selected
    const selectedPool = pendingTransactions.filter((t) => selectedTxIds.has(t.id));
    const unselectedPool = pendingTransactions.filter((t) => !selectedTxIds.has(t.id));
    const pool =
      amountToPay > selectedPendingTotal + 0.004 || selectedPool.length === 0
        ? [...selectedPool, ...unselectedPool]
        : selectedPool;

    const paidTxsToUpdate: Transaction[] = [];
    const extraNewTransactions: Transaction[] = [];
    let remaining = round2(amountToPay);
    let settledCount = 0;

    for (const tx of pool) {
      if (remaining <= 0.004) break;

      if (remaining + 0.004 >= tx.amount) {
        paidTxsToUpdate.push({
          ...tx,
          status: 'completed',
          invoicePaymentBatchId: batchId,
          notes: appendNote(
            tx.notes,
            `Fatura paga em ${formatDate(formattedPaymentDate)} via ${PAYMENT_METHOD_LABELS[paymentMethod]}`
          ),
        });
        settledCount += 1;
        remaining = round2(Math.max(0, remaining - tx.amount));
      } else {
        // Partial payment on this transaction: keep leftover pending on original tx, create completed split tx
        const paidPart = round2(remaining);
        const leftoverPart = round2(tx.amount - paidPart);

        paidTxsToUpdate.push({
          ...tx,
          amount: leftoverPart,
          notes: appendNote(
            tx.notes,
            `Abatimento parcial de ${formatCurrency(paidPart)} em ${formatDate(formattedPaymentDate)}`
          ),
        });

        extraNewTransactions.push({
          ...tx,
          id: `tx-${Date.now()}-part-${Math.random().toString(36).substring(2, 6)}`,
          description: tx.description.includes('(Parcial)')
            ? tx.description
            : `${tx.description} (Parcial)`,
          amount: paidPart,
          status: 'completed',
          splitFromId: tx.id,
          invoicePaymentBatchId: batchId,
          notes: appendNote(
            stripInvoiceNotes(tx.notes),
            `Pagamento parcial em ${formatDate(formattedPaymentDate)} via ${PAYMENT_METHOD_LABELS[paymentMethod]}`
          ),
          createdAt: new Date().toISOString(),
        });

        settledCount += 1;
        remaining = 0;
      }
    }

    // Optional payment receipt record in cash flow
    let paymentRecord: Omit<Transaction, 'id' | 'createdAt'> | undefined = undefined;
    if (registerPaymentRecord && amountToPay > 0) {
      const targetCatId =
        categories.find(
          (c) =>
            c.type === 'expense' &&
            (c.name.toLowerCase().includes('moradia') || c.name.toLowerCase().includes('outros'))
        )?.id ||
        categories[0]?.id ||
        'cat-outros';

      const excessNote =
        remaining > 0.004
          ? ` (inclui excedente/encargos de ${formatCurrency(remaining)})`
          : '';

      paymentRecord = {
        description: `Pagamento de Fatura · ${selectedCard.name} (${formatMonthName(selectedMonthKey)})`,
        amount: round2(amountToPay),
        type: 'expense',
        categoryId: targetCatId,
        subcategoryId: 'sub-geral',
        date: formattedPaymentDate,
        paymentMethod: paymentMethod,
        status: 'completed',
        invoicePaymentBatchId: batchId,
        invoicePaymentCardId: selectedCard.id,
        invoicePaymentMonthKey: selectedMonthKey,
        notes: `Quitação de ${settledCount} ${settledCount === 1 ? 'lançamento' : 'lançamentos'} na fatura de ${formatMonthName(selectedMonthKey)} do cartão ${selectedCard.name}${excessNote}`,
      };
    }

    onConfirmPayment(paidTxsToUpdate, paymentRecord, extraNewTransactions);
    setSuccessMsg(`Pagamento de ${formatCurrency(amountToPay)} registrado com sucesso!`);

    setTimeout(() => {
      onClose();
    }, 900);
  };

  // Reverse a specific cash-flow payment record
  const executeReversePaymentRecord = (payTx: Transaction) => {
    if (!onReversePayment || !selectedCard) return;
    setError(null);

    if (payTx.invoicePaymentBatchId) {
      const batchTxs = transactions.filter(
        (t) =>
          t.paymentMethod === 'credit_card' &&
          t.invoicePaymentBatchId === payTx.invoicePaymentBatchId
      );

      if (batchTxs.length > 0) {
        const updatedMap = new Map<string, Transaction>();
        const deletedIds: string[] = [payTx.id];

        batchTxs.forEach((bTx) => {
          if (bTx.splitFromId) {
            const existingParent =
              updatedMap.get(bTx.splitFromId) ||
              transactions.find((t) => t.id === bTx.splitFromId);
            if (existingParent) {
              updatedMap.set(existingParent.id, {
                ...existingParent,
                amount: round2(existingParent.amount + bTx.amount),
                status: 'pending',
                notes: stripInvoiceNotes(existingParent.notes),
              });
              deletedIds.push(bTx.id);
              return;
            }
          }

          updatedMap.set(bTx.id, {
            ...bTx,
            status: 'pending',
            invoicePaymentBatchId: undefined,
            notes: stripInvoiceNotes(bTx.notes),
          });
        });

        onReversePayment(Array.from(updatedMap.values()), deletedIds);
        setConfirmingBatchId(null);
        setShowReversePanel(false);
        setSuccessMsg(
          `Estorno de ${formatCurrency(payTx.amount)} concluído! O limite e o saldo a pagar foram restaurados.`
        );
        return;
      }
    }

    // Legacy fallback: revert up to payTx.amount from completed invoice items and delete payTx
    executeReverseByAmount(Math.min(payTx.amount, totalPaidAmount), true, payTx);
  };

  // Reverse an arbitrary paid amount (partial or total)
  const executeReverseByAmount = (
    targetReverseAmount: number,
    adjustCashFlow: boolean,
    specificPayRecord?: Transaction
  ) => {
    if (!onReversePayment || !selectedCard) return;
    setError(null);

    if (targetReverseAmount <= 0 && !specificPayRecord) {
      setError('Informe um valor válido maior que zero para estornar.');
      return;
    }

    if (targetReverseAmount > totalPaidAmount + 0.01 && !specificPayRecord) {
      setError(
        `O valor máximo disponível para estorno nesta fatura é ${formatCurrency(totalPaidAmount)}.`
      );
      return;
    }

    const updatedMap = new Map<string, Transaction>();
    const deletedIds: string[] = [];
    const newTransactions: Transaction[] = [];

    // Prioritize split items first, then most recent date
    const orderedCompleted = [...completedTransactions].sort((a, b) => {
      const aSplit = a.splitFromId ? 1 : 0;
      const bSplit = b.splitFromId ? 1 : 0;
      if (aSplit !== bSplit) return bSplit - aSplit;
      return b.date.localeCompare(a.date);
    });

    let rem = round2(Math.min(targetReverseAmount, totalPaidAmount));

    for (const tx of orderedCompleted) {
      if (rem <= 0.004) break;

      if (rem + 0.004 >= tx.amount) {
        if (tx.splitFromId) {
          const parent =
            updatedMap.get(tx.splitFromId) ||
            transactions.find((t) => t.id === tx.splitFromId);
          if (parent) {
            updatedMap.set(parent.id, {
              ...parent,
              amount: round2(parent.amount + tx.amount),
              status: 'pending',
              notes: stripInvoiceNotes(parent.notes),
            });
            deletedIds.push(tx.id);
            rem = round2(Math.max(0, rem - tx.amount));
            continue;
          }
        }

        updatedMap.set(tx.id, {
          ...tx,
          status: 'pending',
          invoicePaymentBatchId: undefined,
          notes: stripInvoiceNotes(tx.notes),
        });
        rem = round2(Math.max(0, rem - tx.amount));
      } else {
        // Partial reversal of a single completed item
        const reversePart = round2(rem);
        const remainingPaid = round2(tx.amount - reversePart);

        if (tx.splitFromId) {
          const parent =
            updatedMap.get(tx.splitFromId) ||
            transactions.find((t) => t.id === tx.splitFromId);
          if (parent) {
            updatedMap.set(parent.id, {
              ...parent,
              amount: round2(parent.amount + reversePart),
              status: 'pending',
              notes: stripInvoiceNotes(parent.notes),
            });
            updatedMap.set(tx.id, {
              ...tx,
              amount: remainingPaid,
            });
            rem = 0;
            continue;
          }
        }

        updatedMap.set(tx.id, {
          ...tx,
          amount: remainingPaid,
          notes: appendNote(
            tx.notes,
            `Estorno parcial de ${formatCurrency(reversePart)} em ${formatDate(todayStr)}`
          ),
        });

        newTransactions.push({
          ...tx,
          id: `tx-${Date.now()}-rev-${Math.random().toString(36).substring(2, 6)}`,
          amount: reversePart,
          status: 'pending',
          invoicePaymentBatchId: undefined,
          notes: appendNote(
            stripInvoiceNotes(tx.notes),
            `Valor estornado da fatura em ${formatDate(todayStr)}`
          ),
          createdAt: new Date().toISOString(),
        });
        rem = 0;
      }
    }

    // Adjust cash-flow payment records if requested
    if (adjustCashFlow) {
      if (specificPayRecord) {
        deletedIds.push(specificPayRecord.id);
      } else {
        let cashRem = round2(targetReverseAmount);
        for (const payTx of invoicePaymentRecords) {
          if (cashRem <= 0.004) break;
          if (cashRem + 0.004 >= payTx.amount) {
            deletedIds.push(payTx.id);
            cashRem = round2(Math.max(0, cashRem - payTx.amount));
          } else {
            updatedMap.set(payTx.id, {
              ...payTx,
              amount: round2(payTx.amount - cashRem),
              notes: appendNote(
                payTx.notes,
                `Estorno parcial de ${formatCurrency(cashRem)} em ${formatDate(todayStr)}`
              ),
            });
            cashRem = 0;
          }
        }
      }
    }

    const actualReversed = specificPayRecord
      ? specificPayRecord.amount
      : round2(targetReverseAmount);

    onReversePayment(Array.from(updatedMap.values()), deletedIds, newTransactions);
    setConfirmingCustomReverse(false);
    setConfirmingBatchId(null);
    setShowReversePanel(false);
    setSuccessMsg(
      `Estorno de ${formatCurrency(actualReversed)} realizado! O saldo a pagar e o limite do cartão foram atualizados.`
    );
  };

  if (!isOpen) return null;

  const isPartialPayment =
    totalPendingAmount > 0 && amountToPay > 0 && amountToPay < totalPendingAmount - 0.004;
  const isExcessPayment =
    totalPendingAmount > 0 && amountToPay > totalPendingAmount + 0.004;
  const hasPaidOrRecords = totalPaidAmount > 0 || invoicePaymentRecords.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden transition-all my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Pagamento de Fatura do Cartão
              </h2>
              <p className="text-xs text-slate-500">
                Liquide compras total ou parcialmente e estorne valores caso necessário
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleConfirm} className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs sm:text-sm font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs sm:text-sm font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Selection Controls (Card & Month) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cartão de Crédito
              </label>
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full py-2.5 px-3.5 text-sm font-semibold border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Venc. todo dia {c.dueDay})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Competência da Fatura
              </label>
              <select
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                className="w-full py-2.5 px-3.5 text-sm font-semibold border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {availableMonths.map((mKey) => (
                  <option key={mKey} value={mKey}>
                    Fatura de {formatMonthName(mKey)}{' '}
                    {mKey === currentMonthKey
                      ? '· Vigente'
                      : mKey === nextMonthKey
                      ? '· Próxima'
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Visual Card Simulation & Invoice Status Banner */}
          {selectedCard && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold shadow-xs shrink-0"
                    style={{ backgroundColor: selectedCard.color }}
                  >
                    {selectedCard.brand.toUpperCase().slice(0, 4)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedCard.name}</h3>
                    <span className="text-xs text-slate-500">
                      Fechamento dia {selectedCard.closingDay} · Vencimento dia {selectedCard.dueDay}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {isFullyPaid ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Fatura 100% Paga
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-lg flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-amber-700" />
                      Aguardando Pagamento
                    </span>
                  )}

                  {hasPaidOrRecords && onReversePayment && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowReversePanel((prev) => !prev);
                        setConfirmingBatchId(null);
                        setConfirmingCustomReverse(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        showReversePanel
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{showReversePanel ? 'Ocultar Estorno' : 'Estornar Valor Pago'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Invoice Totals KPI Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-slate-500 font-semibold block">
                    Total da Fatura
                  </span>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-slate-900 tabular-nums">
                    {formatCurrency(totalInvoiceAmount)}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold block">
                    Já Quitado
                  </span>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-600 tabular-nums">
                    {formatCurrency(totalPaidAmount)}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-rose-600 font-semibold block">
                    Saldo a Pagar
                  </span>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-rose-600 tabular-nums">
                    {formatCurrency(totalPendingAmount)}
                  </span>
                </div>
              </div>

              {/* Reversal (Estorno) Panel */}
              {hasPaidOrRecords && onReversePayment && (showReversePanel || isFullyPaid) && (
                <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                      <Undo2 className="w-4 h-4 text-rose-600" />
                      <span>Estorno de Pagamento da Fatura</span>
                    </div>
                    <span className="text-[11px] text-rose-700 font-medium">
                      Use caso o valor pago esteja errado
                    </span>
                  </div>

                  {/* Recorded payment entries for quick 1-click reversal */}
                  {invoicePaymentRecords.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        Pagamentos registrados no extrato ({invoicePaymentRecords.length}):
                      </span>
                      <div className="divide-y divide-rose-100 rounded-lg border border-rose-200/80 bg-white overflow-hidden">
                        {invoicePaymentRecords.map((payTx) => {
                          const isConfirmingThis = confirmingBatchId === payTx.id;
                          return (
                            <div
                              key={payTx.id}
                              className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 font-mono">
                                  {formatCurrency(payTx.amount)}
                                </span>
                                <span className="text-slate-500 ml-2">
                                  em {formatDate(payTx.date)} ·{' '}
                                  {PAYMENT_METHOD_LABELS[payTx.paymentMethod]}
                                </span>
                              </div>

                              {isConfirmingThis ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => executeReversePaymentRecord(payTx)}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold text-[11px] cursor-pointer"
                                  >
                                    Confirmar Estorno
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingBatchId(null)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-[11px] cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmingBatchId(payTx.id);
                                    setConfirmingCustomReverse(false);
                                  }}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Estornar</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom / Partial Reversal Amount */}
                  {totalPaidAmount > 0 && (
                    <div className="pt-2 border-t border-rose-200/70 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-700">
                              Ou digite o valor a estornar (R$)
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setReverseAmountStr(formatInputDecimal(totalPaidAmount))
                              }
                              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                            >
                              Tudo ({formatCurrency(totalPaidAmount)})
                            </button>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                              R$
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={reverseAmountStr}
                              onChange={(e) => {
                                setReverseAmountStr(e.target.value);
                                setConfirmingCustomReverse(false);
                              }}
                              placeholder="0,00"
                              className="w-full pl-9 pr-3 py-1.5 text-sm font-mono font-bold border border-rose-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                          </div>
                        </div>

                        {confirmingCustomReverse ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                executeReverseByAmount(parsedReverseAmount, reverseAlsoCashFlow)
                              }
                              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Confirmar ({formatCurrency(parsedReverseAmount)})
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingCustomReverse(false)}
                              className="px-2.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              parsedReverseAmount <= 0 ||
                              parsedReverseAmount > totalPaidAmount + 0.01
                            }
                            onClick={() => {
                              setConfirmingCustomReverse(true);
                              setConfirmingBatchId(null);
                            }}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Estornar Valor</span>
                          </button>
                        )}
                      </div>

                      {invoicePaymentRecords.length > 0 && (
                        <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reverseAlsoCashFlow}
                            onChange={(e) => setReverseAlsoCashFlow(e.target.checked)}
                            className="w-3.5 h-3.5 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer"
                          />
                          <span>
                            Abater/remover também o lançamento de saída correspondente no extrato
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Items list to pay */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Compras incluídas nesta fatura ({invoiceTransactions.length})
              </span>
              {pendingTransactions.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllPending}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                >
                  {selectedTxIds.size === pendingTransactions.length
                    ? 'Desmarcar Todas'
                    : 'Selecionar Todas Pendentes'}
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white">
              {invoiceTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma compra com cartão encontrada para esta competência.
                </div>
              ) : (
                invoiceTransactions.map((tx) => {
                  const txDates = getTransactionCardDates(tx, cards);
                  const isPending = tx.status === 'pending';
                  const isChecked = selectedTxIds.has(tx.id);

                  return (
                    <div
                      key={tx.id}
                      onClick={() => isPending && toggleSelectTx(tx.id)}
                      className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                        isPending
                          ? 'cursor-pointer hover:bg-slate-50'
                          : 'bg-slate-50/50 opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isPending ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectTx(tx.id)}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 truncate">
                              {tx.description}
                            </span>
                            {tx.installment && (
                              <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded font-bold">
                                {tx.installment.current}/{tx.installment.total}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>Compra: {formatDate(txDates.purchaseDate)}</span>
                            {txDates.dueDate && (
                              <span className="text-amber-800 font-medium">
                                · Venc: {formatDate(txDates.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900 block">
                          {formatCurrency(tx.amount)}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            isPending ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {isPending ? (isChecked ? 'A liquidar' : 'Pendente') : 'Já quitado'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Payment Execution Parameters */}
          {!isFullyPaid && pendingTransactions.length > 0 && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
                  <Receipt className="w-4 h-4 text-emerald-700" />
                  <span>Dados da Baixa / Pagamento</span>
                </div>
              </div>

              {/* Editable Payment Amount */}
              <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold text-slate-800">
                    Valor que vai pagar (R$)
                  </label>
                  <div className="flex items-center gap-2">
                    {selectedPendingTotal > 0 &&
                      Math.abs(amountToPay - selectedPendingTotal) > 0.01 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualAmount(false);
                            setCustomAmountStr(formatInputDecimal(selectedPendingTotal));
                          }}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                        >
                          Selecionadas ({formatCurrency(selectedPendingTotal)})
                        </button>
                      )}
                    {totalPendingAmount > 0 &&
                      Math.abs(amountToPay - totalPendingAmount) > 0.01 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTxIds(new Set(pendingTransactions.map((t) => t.id)));
                            setIsManualAmount(false);
                            setCustomAmountStr(formatInputDecimal(totalPendingAmount));
                          }}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                        >
                          Saldo Total ({formatCurrency(totalPendingAmount)})
                        </button>
                      )}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-emerald-700">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customAmountStr}
                    onChange={(e) => {
                      setIsManualAmount(true);
                      setCustomAmountStr(e.target.value);
                    }}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-2.5 text-base sm:text-lg font-extrabold font-mono text-slate-900 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {isPartialPayment && (
                  <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1.5">
                    Pagamento parcial: quitará {formatCurrency(amountToPay)} (liberando esse valor no limite) e restará{' '}
                    <strong>{formatCurrency(round2(totalPendingAmount - amountToPay))}</strong> a pagar nesta fatura.
                  </p>
                )}

                {isExcessPayment && (
                  <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1.5">
                    Valor acima do saldo pendente (+{formatCurrency(round2(amountToPay - totalPendingAmount))}). Todas as compras pendentes serão quitadas e o valor total informado será registrado no extrato.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data do Pagamento
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full py-2 px-3 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Forma de Pagamento da Fatura
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full py-2 px-3 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="pix">PIX (Conta Bancária)</option>
                    <option value="debit_card">Cartão de Débito / Conta</option>
                    <option value="bank_transfer">Transferência / TED</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="cash">Dinheiro em Espécie</option>
                    <option value="other">Outro Meio</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={registerPaymentRecord}
                    onChange={(e) => setRegisterPaymentRecord(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>
                    Registrar lançamento de saída da fatura ({formatCurrency(amountToPay)}) no extrato
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6 mt-0.5">
                  Gera um registro categorizado como despesa de pagamento da fatura para manter o saldo bancário conciliado.
                </p>
              </div>
            </div>
          )}

          {/* Modal Footer & Action Button */}
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left">
              <span className="text-xs text-slate-500 block">Total a Quitar Agora</span>
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700 tabular-nums">
                {formatCurrency(amountToPay)}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {isFullyPaid ? 'Fechar' : 'Cancelar'}
              </button>
              {!isFullyPaid && (
                <button
                  type="submit"
                  disabled={amountToPay <= 0 || pendingTransactions.length === 0}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-xs shadow-emerald-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Pagamento</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
