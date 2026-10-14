import React, { useMemo } from 'react';
import { Plus, Edit2, Trash2, CreditCard as CardIcon, Calendar, CalendarClock, AlertTriangle, ArrowRight, CheckCircle2, Wallet } from 'lucide-react';
import { CreditCard, Transaction } from '../types/finance';
import { CARD_BRAND_LABELS, formatCurrency, formatDate, formatMonthName, formatPercent, formatShortMonth, getMonthNamesForRelativePeriods } from '../utils/formatters';

interface CreditCardsViewProps {
  cards: CreditCard[];
  transactions: Transaction[];
  onOpenNewCard: () => void;
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (cardId: string) => void;
  onFilterTransactionsByCard: (cardId: string) => void;
  onOpenPayInvoice: (cardId?: string, monthKey?: string) => void;
}

export const CreditCardsView: React.FC<CreditCardsViewProps> = ({
  cards,
  transactions,
  onOpenNewCard,
  onEditCard,
  onDeleteCard,
  onFilterTransactionsByCard,
  onOpenPayInvoice,
}) => {
  // Current month key YYYY-MM & Next month key
  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7);
  const nextMonthObj = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonthObj.getFullYear()}-${String(nextMonthObj.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = now.getDate();
  const monthNames = useMemo(() => getMonthNamesForRelativePeriods(), []);

  // Card metrics
  const cardsMetrics = useMemo(() => {
    return cards.map((card) => {
      // Current month invoice total (completed or pending expense on this card in current month)
      const currentMonthTxs = transactions.filter(
        (t) => t.type === 'expense' && t.cardId === card.id && t.date.startsWith(currentMonthKey)
      );
      const currentInvoiceTotal = currentMonthTxs.reduce((acc, t) => acc + t.amount, 0);

      // Next month invoice total (expenses after closing & scheduled installments)
      const nextMonthTxs = transactions.filter(
        (t) => t.type === 'expense' && t.cardId === card.id && t.date.startsWith(nextMonthKey)
      );
      const nextInvoiceTotal = nextMonthTxs.reduce((acc, t) => acc + t.amount, 0);

      // All expenses on this card that occupy credit limit:
      // Debitar do limite total tudo o que for lançado (independente do mês e de parcelas) que ainda não foi pago (status pending)
      const pendingTxs = transactions.filter(
        (t) => t.type === 'expense' && t.cardId === card.id && t.status === 'pending'
      );
      const totalCommitted = pendingTxs.reduce((acc, t) => acc + t.amount, 0);

      // Limite disponível: limite total do cartão menos tudo o que foi lançado que ainda não foi quitado na fatura
      const availableLimit = Math.max(0, card.limit - totalCommitted);
      const limitUsedPct = card.limit > 0 ? (totalCommitted / card.limit) * 100 : 0;

      // Active installments on this card
      const activeInstallments = transactions.filter(
        (t) => t.type === 'expense' && t.cardId === card.id && t.installment && t.status === 'pending'
      );

      const isInvoiceClosed = currentDay >= card.closingDay;

      return {
        card,
        currentInvoiceTotal,
        nextInvoiceTotal,
        nextMonthTxsCount: nextMonthTxs.length,
        totalCommitted,
        availableLimit,
        limitUsedPct,
        currentMonthTxsCount: currentMonthTxs.length,
        activeInstallmentsCount: activeInstallments.length,
        isInvoiceClosed,
      };
    });
  }, [cards, transactions, currentMonthKey, nextMonthKey, currentDay]);

  // Overall totals
  const overall = useMemo(() => {
    const totalLimit = cards.reduce((acc, c) => acc + c.limit, 0);
    const totalCurrentInvoice = cardsMetrics.reduce((acc, m) => acc + m.currentInvoiceTotal, 0);
    const totalNextInvoice = cardsMetrics.reduce((acc, m) => acc + m.nextInvoiceTotal, 0);
    const totalCommittedAll = cardsMetrics.reduce((acc, m) => acc + m.totalCommitted, 0);
    const totalAvailable = Math.max(0, totalLimit - totalCommittedAll);
    const totalInstallments = transactions.filter(
      (t) => t.type === 'expense' && t.installment && t.status === 'pending'
    ).length;

    return {
      totalLimit,
      totalCurrentInvoice,
      totalNextInvoice,
      totalCommittedAll,
      totalAvailable,
      totalInstallments,
    };
  }, [cards, cardsMetrics, transactions]);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Cartões de Crédito & Faturas
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Gerenciamento de limites, faturas mensais e compras parceladas
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => onOpenPayInvoice()}
            className="px-4 py-2.5 text-sm sm:text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Wallet className="w-4.5 h-4.5" />
            <span>Pagar Fatura</span>
          </button>

          <button
            onClick={onOpenNewCard}
            className="px-4.5 py-2.5 text-sm sm:text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Cadastrar Novo Cartão</span>
          </button>
        </div>
      </div>

      {/* Global Card Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-sm font-semibold text-slate-600 block mb-1">Fatura de {monthNames.currentMonth} Total</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono tabular-nums tracking-tight">
            {formatCurrency(overall.totalCurrentInvoice)}
          </span>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-medium">
            Gasto consolidado de {monthNames.currentMonth} em todos os cartões
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-sm font-semibold text-slate-600 block mb-1">Limite Disponível</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tabular-nums tracking-tight">
            {formatCurrency(overall.totalAvailable)}
          </span>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-medium">
            Espaço livre para novas compras
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-sm font-semibold text-slate-600 block mb-1">Limite Total Cadastrado</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
            {formatCurrency(overall.totalLimit)}
          </span>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-medium">
            Soma dos limites em {cards.length} {cards.length === 1 ? 'cartão' : 'cartões'}
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-sm font-semibold text-slate-600 block mb-1">Parcelas Futuras Ativas</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 font-mono tabular-nums tracking-tight">
            {overall.totalInstallments} parcelas
          </span>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-medium">
            Programadas para os próximos meses
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cardsMetrics.length === 0 ? (
          <div className="col-span-2 py-16 text-center bg-white border border-slate-200 rounded-xl p-8">
            <CardIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Nenhum cartão de crédito cadastrado
            </h3>
            <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
              Cadastre seus cartões para controlar compras parceladas, limites disponíveis e o fechamento das faturas.
            </p>
            <button
              onClick={onOpenNewCard}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              + Cadastrar Primeiro Cartão
            </button>
          </div>
        ) : (
          cardsMetrics.map(({ 
            card, 
            currentInvoiceTotal, 
            nextInvoiceTotal, 
            nextMonthTxsCount, 
            totalCommitted,
            availableLimit, 
            limitUsedPct, 
            currentMonthTxsCount, 
            activeInstallmentsCount,
            isInvoiceClosed 
          }) => {
            const isNearLimit = limitUsedPct >= 80;

            return (
              <div
                key={card.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                {/* Physical Card Simulation Header */}
                <div
                  className="p-5 text-white flex flex-col justify-between h-44 relative overflow-hidden"
                  style={{ backgroundColor: card.color }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold tracking-tight">
                        {card.name}
                      </h2>
                      <span className="text-[11px] text-white/80 uppercase font-mono tracking-wider">
                        {CARD_BRAND_LABELS[card.brand]}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-black/20 backdrop-blur-xs rounded-lg p-1">
                      <button
                        onClick={() => onEditCard(card)}
                        className="p-1 hover:bg-white/20 rounded transition-colors text-white"
                        title="Editar Cartão"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Deseja realmente excluir o cartão "${card.name}"? Os lançamentos vinculados a ele serão mantidos como cartão geral.`
                            )
                          ) {
                            onDeleteCard(card.id);
                          }
                        }}
                        className="p-1 hover:bg-rose-500/80 rounded transition-colors text-white"
                        title="Excluir Cartão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="font-mono tracking-widest text-sm text-white/90">
                      •••• •••• •••• {card.lastFourDigits || '••••'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs sm:text-sm pt-2.5 border-t border-white/20 text-white/95">
                    <div>
                      <span className="text-xs text-white/75 block">Fechamento</span>
                      <span className="font-semibold">Dia {card.closingDay}</span>
                    </div>
                    <div>
                      <span className="text-xs text-white/75 block">Vencimento</span>
                      <span className="font-semibold">Dia {card.dueDay}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-white/75 block">Limite Total</span>
                      <span className="font-mono font-bold text-sm sm:text-base">{formatCurrency(card.limit)}</span>
                    </div>
                  </div>
                </div>

                {/* Invoice Status Banner */}
                <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
                  isInvoiceClosed 
                    ? 'bg-amber-50/90 text-amber-900 border-amber-200' 
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CalendarClock className={`w-3.5 h-3.5 ${isInvoiceClosed ? 'text-amber-700' : 'text-slate-500'}`} />
                    <span>
                      {isInvoiceClosed
                        ? `Fatura Fechada (Fechou dia ${card.closingDay}) · Compras caem em ${monthNames.nextMonth}`
                        : `Fatura Aberta (Fecha todo dia ${card.closingDay})`}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    isInvoiceClosed ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isInvoiceClosed ? `Ciclo de ${monthNames.nextMonth}` : `Ciclo de ${monthNames.currentMonth}`}
                  </span>
                </div>

                {/* Card Usage & Metrics Section */}
                <div className="p-5 space-y-4">
                  {/* Progress bar of limit */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div>
                        <span className="text-slate-800 font-semibold block">Limite Utilizado</span>
                        <span className="text-[10px] text-slate-500 font-normal block">
                          Total lançado no cartão pendente ({card.name})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 tabular-nums text-base">
                        {formatCurrency(totalCommitted)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isNearLimit ? 'bg-rose-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, limitUsedPct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 mt-1.5 font-medium">
                      <span>{formatPercent(limitUsedPct)} do limite total ({formatCurrency(card.limit)})</span>
                      <span className="text-emerald-700 font-bold font-mono tabular-nums">
                        {formatCurrency(availableLimit)} disponível
                      </span>
                    </div>
                  </div>

                  {/* Summary row with Current Month, Next Month Invoice and Active Installments */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs sm:text-sm">
                    <div>
                      <span className="text-slate-500 block text-xs font-medium">Fatura de {monthNames.currentMonth}</span>
                      <span className="font-bold text-slate-900 text-sm font-mono tabular-nums">
                        {formatCurrency(currentInvoiceTotal)}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {currentMonthTxsCount} compras no ciclo
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs font-medium">Fatura de {monthNames.nextMonth}</span>
                      <span className="font-bold text-indigo-700 text-sm font-mono tabular-nums">
                        {formatCurrency(nextInvoiceTotal)}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {nextMonthTxsCount} compras programadas
                      </span>
                    </div>
                  </div>

                  {/* Action Link to Transactions & Pay Invoice */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={() => onOpenPayInvoice(card.id, currentMonthKey)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shadow-emerald-200 cursor-pointer"
                      title={`Pagar Fatura de ${monthNames.currentMonth} deste cartão`}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Pagar Fatura</span>
                    </button>

                    <button
                      onClick={() => onFilterTransactionsByCard(card.id)}
                      className="text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Ver Lançamentos do Cartão</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
