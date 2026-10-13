import React, { useState, useMemo } from 'react';
import { 
  X, 
  Check, 
  CreditCard as CardIcon, 
  Wallet, 
  Calendar, 
  CalendarClock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { Category, CreditCard, PaymentMethod, Transaction, TransactionStatus } from '../types/finance';
import { 
  formatCurrency, 
  formatDate, 
  formatMonthName, 
  getMonthNamesForRelativePeriods, 
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
    paymentRecord?: Omit<Transaction, 'id' | 'createdAt'>
  ) => void;
}

export const PayInvoiceModal: React.FC<PayInvoiceModalProps> = ({
  isOpen,
  onClose,
  cards,
  transactions,
  categories,
  initialCardId,
  initialMonthKey,
  onConfirmPayment,
}) => {
  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7);
  const nextMonthObj = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonthObj.getFullYear()}-${String(nextMonthObj.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  // Selected Card State
  const [selectedCardId, setSelectedCardId] = useState<string>(
    initialCardId || (cards[0]?.id ?? '')
  );

  // Selected Invoice Month
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    initialMonthKey || currentMonthKey
  );

  // Payment Execution Form State
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [registerPaymentRecord, setRegisterPaymentRecord] = useState<boolean>(true);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
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

  // Available invoice months (months that have credit card transactions for this card, plus current and next month)
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthKey);
    monthSet.add(nextMonthKey);

    transactions
      .filter((t) => t.type === 'expense' && t.paymentMethod === 'credit_card' && (!selectedCardId || t.cardId === selectedCardId))
      .forEach((t) => {
        const m = t.date.slice(0, 7);
        if (m) monthSet.add(m);
      });

    return Array.from(monthSet).sort().reverse();
  }, [transactions, selectedCardId, currentMonthKey, nextMonthKey]);

  // Transactions belonging to this card's invoice for the selected month
  const invoiceTransactions = useMemo(() => {
    if (!selectedCard) return [];
    return transactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.paymentMethod === 'credit_card' &&
        t.cardId === selectedCard.id &&
        t.date.startsWith(selectedMonthKey)
    ).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, selectedCard, selectedMonthKey]);

  // Pending vs Completed in this invoice
  const pendingTransactions = useMemo(() => {
    return invoiceTransactions.filter((t) => t.status === 'pending');
  }, [invoiceTransactions]);

  const completedTransactions = useMemo(() => {
    return invoiceTransactions.filter((t) => t.status === 'completed');
  }, [invoiceTransactions]);

  // When invoiceTransactions change, default selected txs to all pending ones
  React.useEffect(() => {
    const pendingIds = new Set(pendingTransactions.map((t) => t.id));
    setSelectedTxIds(pendingIds);
    setError(null);
    setSuccessMsg(null);
  }, [selectedCardId, selectedMonthKey, invoiceTransactions.length]);

  const totalInvoiceAmount = invoiceTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalPaidAmount = completedTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalPendingAmount = pendingTransactions.reduce((acc, t) => acc + t.amount, 0);

  // Selected amount to pay right now
  const amountToPay = useMemo(() => {
    return pendingTransactions
      .filter((t) => selectedTxIds.has(t.id))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [pendingTransactions, selectedTxIds]);

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllPending = () => {
    if (selectedTxIds.size === pendingTransactions.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(pendingTransactions.map((t) => t.id)));
    }
  };

  const isFullyPaid = invoiceTransactions.length > 0 && pendingTransactions.length === 0;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCard) {
      setError('Selecione um cartão de crédito.');
      return;
    }

    if (invoiceTransactions.length === 0) {
      setError('Não há lançamentos nesta fatura para pagamento.');
      return;
    }

    if (selectedTxIds.size === 0) {
      setError('Selecione ao menos um lançamento pendente para quitar nesta fatura.');
      return;
    }

    // Build updated transactions (mark selected pending items as completed)
    const paidTxsToUpdate: Transaction[] = [];
    const formattedPaymentDate = paymentDate || todayStr;

    invoiceTransactions.forEach((tx) => {
      if (selectedTxIds.has(tx.id) && tx.status === 'pending') {
        paidTxsToUpdate.push({
          ...tx,
          status: 'completed',
          notes: tx.notes
            ? `${tx.notes} · Fatura paga em ${formatDate(formattedPaymentDate)} via ${PAYMENT_METHOD_LABELS[paymentMethod]}`
            : `Fatura paga em ${formatDate(formattedPaymentDate)} via ${PAYMENT_METHOD_LABELS[paymentMethod]}`,
        });
      }
    });

    // Optional payment receipt record in cash flow
    let paymentRecord: Omit<Transaction, 'id' | 'createdAt'> | undefined = undefined;
    if (registerPaymentRecord && amountToPay > 0) {
      // Find category for payments (e.g. moradia, financas, or fallback to first expense category)
      const targetCatId = categories.find((c) => c.type === 'expense' && (c.name.toLowerCase().includes('moradia') || c.name.toLowerCase().includes('outros')))?.id || categories[0]?.id || 'cat-outros';

      paymentRecord = {
        description: `Pagamento de Fatura · ${selectedCard.name} (${formatMonthName(selectedMonthKey)})`,
        amount: parseFloat(amountToPay.toFixed(2)),
        type: 'expense',
        categoryId: targetCatId,
        subcategoryId: 'sub-geral',
        date: formattedPaymentDate,
        paymentMethod: paymentMethod, // Forma usada para pagar a fatura (ex: PIX, Débito)
        status: 'completed',
        notes: `Quitação de ${paidTxsToUpdate.length} compras na fatura de ${formatMonthName(selectedMonthKey)} do cartão ${selectedCard.name}`,
      };
    }

    onConfirmPayment(paidTxsToUpdate, paymentRecord);
    setSuccessMsg(`Pagamento de ${formatCurrency(amountToPay)} registrado com sucesso!`);

    setTimeout(() => {
      onClose();
    }, 900);
  };

  if (!isOpen) return null;

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
                Liquide as compras da fatura e registre o pagamento no fluxo financeiro
              </p>
            </div>
          </div>
          <button
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
                    Fatura de {formatMonthName(mKey)} {mKey === currentMonthKey ? '· Vigente' : mKey === nextMonthKey ? '· Próxima' : ''}
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

                <div className="flex items-center gap-2">
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
                </div>
              </div>

              {/* Invoice Totals KPI Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-slate-500 font-semibold block">Total da Fatura</span>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-slate-900 tabular-nums">
                    {formatCurrency(totalInvoiceAmount)}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold block">Já Quitado</span>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-600 tabular-nums">
                    {formatCurrency(totalPaidAmount)}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] sm:text-xs text-rose-600 font-semibold block">Saldo a Pagar</span>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-rose-600 tabular-nums">
                    {formatCurrency(totalPendingAmount)}
                  </span>
                </div>
              </div>
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
                  {selectedTxIds.size === pendingTransactions.length ? 'Desmarcar Todas' : 'Selecionar Todas Pendentes'}
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
                        isPending ? 'cursor-pointer hover:bg-slate-50' : 'bg-slate-50/50 opacity-80'
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
                              <span className="text-amber-800 font-medium">· Venc: {formatDate(txDates.dueDate)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900 block">
                          {formatCurrency(tx.amount)}
                        </span>
                        <span className={`text-[10px] font-semibold ${isPending ? 'text-amber-700' : 'text-emerald-700'}`}>
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
          {!isFullyPaid && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3.5">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>Dados da Baixa / Pagamento</span>
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
                Cancelar
              </button>
              <button
                type="submit"
                disabled={amountToPay <= 0 || isFullyPaid}
                className="flex-1 sm:flex-none px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-xs shadow-emerald-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Pagamento</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
