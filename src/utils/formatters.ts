import { CardBrand, CreditCard, PaymentMethod, PeriodFilter, Transaction, TransactionType } from '../types/finance';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

export const formatMonthName = (yearMonthStr: string): string => {
  // expects 'YYYY-MM'
  const [year, month] = yearMonthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
};

export const formatShortMonth = (yearMonthStr: string): string => {
  const [year, month] = yearMonthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${year.slice(2)}`;
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  bank_transfer: 'Transferência',
  boleto: 'Boleto',
  other: 'Outro',
};

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  mastercard: 'Mastercard',
  visa: 'Visa',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  other: 'Outro',
};

export const addMonthsToDate = (baseDateStr: string, monthsToAdd: number): string => {
  const [year, month, day] = baseDateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1 + monthsToAdd, day);
  
  // Guard against day overflow (e.g. Feb 30)
  if (targetDate.getDate() !== day) {
    targetDate.setDate(0); // last day of previous month
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const capitalize = (s: string): string => {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const getMonthNamesForRelativePeriods = () => {
  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth();

  const lastDate = new Date(currentY, currentM - 1, 1);
  const currentDate = new Date(currentY, currentM, 1);
  const nextDate = new Date(currentY, currentM + 1, 1);

  const formatM = (d: Date) => capitalize(d.toLocaleDateString('pt-BR', { month: 'long' }));

  return {
    lastMonth: formatM(lastDate),       // e.g. "Setembro"
    currentMonth: formatM(currentDate), // e.g. "Outubro"
    nextMonth: formatM(nextDate),       // e.g. "Novembro"
  };
};

export const getDateRangeForPeriod = (
  period: PeriodFilter,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const pad = (n: number) => String(n).padStart(2, '0');

  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (period) {
    case 'current_month': {
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 0);
      const label = capitalize(start.toLocaleDateString('pt-BR', { month: 'long' }));
      return {
        startDate: toYMD(start),
        endDate: toYMD(end),
        label,
      };
    }
    case 'next_month': {
      const start = new Date(currentYear, currentMonth + 1, 1);
      const end = new Date(currentYear, currentMonth + 2, 0);
      const label = capitalize(start.toLocaleDateString('pt-BR', { month: 'long' }));
      return {
        startDate: toYMD(start),
        endDate: toYMD(end),
        label,
      };
    }
    case 'last_month': {
      const start = new Date(currentYear, currentMonth - 1, 1);
      const end = new Date(currentYear, currentMonth, 0);
      const label = capitalize(start.toLocaleDateString('pt-BR', { month: 'long' }));
      return {
        startDate: toYMD(start),
        endDate: toYMD(end),
        label,
      };
    }
    case 'last_3_months': {
      const start = new Date(currentYear, currentMonth - 2, 1);
      const end = new Date(currentYear, currentMonth + 1, 0);
      return {
        startDate: toYMD(start),
        endDate: toYMD(end),
        label: 'Últimos 3 Meses',
      };
    }
    case 'last_6_months': {
      const start = new Date(currentYear, currentMonth - 5, 1);
      const end = new Date(currentYear, currentMonth + 1, 0);
      return {
        startDate: toYMD(start),
        endDate: toYMD(end),
        label: 'Últimos 6 Meses',
      };
    }
    case 'current_year': {
      const start = new Date(currentYear, 0, 1);
      const end = new Date(currentYear, 11, 31);
      return {
        startDate: toYMD(start),
        endDate: toYMD(end),
        label: `Ano Atual (${currentYear})`,
      };
    }
    case 'custom': {
      return {
        startDate: customStart || toYMD(new Date(currentYear, currentMonth, 1)),
        endDate: customEnd || toYMD(new Date(currentYear, currentMonth + 1, 0)),
        label: 'Período Personalizado',
      };
    }
    case 'all':
    default: {
      return {
        startDate: '1970-01-01',
        endDate: '2099-12-31',
        label: 'Todo o Período',
      };
    }
  }
};

export interface CardInvoiceCalculation {
  isClosed: boolean;
  closingDay: number;
  dueDay: number;
  purchaseDate: string; // YYYY-MM-DD
  targetDueDate: string; // YYYY-MM-DD (invoice due date)
  targetMonthKey: string; // YYYY-MM
  targetMonthLabel: string; // e.g. "Novembro de 2026"
  targetMonthName: string; // e.g. "Novembro"
  closingDateStr: string; // YYYY-MM-DD
  message: string;
}

/**
 * Calculates whether a credit card purchase fell after the invoice closing date
 * and determines the invoice closing date, due date, and target month.
 */
export const calculateCardInvoiceDueDate = (
  purchaseDateStr: string,
  card: CreditCard
): CardInvoiceCalculation => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const baseDate = purchaseDateStr || new Date().toISOString().split('T')[0];
  const [yearStr, monthStr, dayStr] = baseDate.split('-');
  const year = Number(yearStr) || new Date().getFullYear();
  const month = Number(monthStr) || new Date().getMonth() + 1; // 1-12
  const day = Number(dayStr) || new Date().getDate();

  const closingDay = card.closingDay;
  const dueDay = card.dueDay;

  // Invoice is closed if the purchase is made on or after the closing day
  const isClosed = day >= closingDay;

  // 1. Determine the closing month for the purchase
  let closingYear = year;
  let closingMonth = month;
  if (isClosed) {
    const nextCloseDate = new Date(year, month, 1); // 1st of month+1
    closingYear = nextCloseDate.getFullYear();
    closingMonth = nextCloseDate.getMonth() + 1;
  }

  const daysInClosingMonth = new Date(closingYear, closingMonth, 0).getDate();
  const finalClosingDay = Math.min(closingDay, daysInClosingMonth);
  const closingDateStr = `${closingYear}-${pad(closingMonth)}-${pad(finalClosingDay)}`;

  // 2. Determine due date:
  // If dueDay > closingDay: due date is in the same month as closing.
  // If dueDay <= closingDay: due date is in the following month after closing.
  let dueYear = closingYear;
  let dueMonth = closingMonth;
  if (dueDay <= closingDay) {
    const nextDueDate = new Date(closingYear, closingMonth, 1);
    dueYear = nextDueDate.getFullYear();
    dueMonth = nextDueDate.getMonth() + 1;
  }

  const daysInDueMonth = new Date(dueYear, dueMonth, 0).getDate();
  const finalDueDay = Math.min(dueDay, daysInDueMonth);

  const targetDueDate = `${dueYear}-${pad(dueMonth)}-${pad(finalDueDay)}`;
  const targetMonthKey = `${dueYear}-${pad(dueMonth)}`;

  const targetDateObj = new Date(dueYear, dueMonth - 1, 1);
  const targetMonthLabel = capitalize(
    targetDateObj.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })
  );
  const targetMonthName = capitalize(
    targetDateObj.toLocaleDateString('pt-BR', {
      month: 'long',
    })
  );

  return {
    isClosed,
    closingDay,
    dueDay,
    purchaseDate: baseDate,
    targetDueDate,
    targetMonthKey,
    targetMonthLabel,
    targetMonthName,
    closingDateStr,
    message: isClosed
      ? `Fatura fechada (fechou dia ${closingDay}). Lançado automaticamente na fatura de ${targetMonthName} com vencimento em ${pad(finalDueDay)}/${pad(dueMonth)}/${dueYear}.`
      : `Fatura aberta (fecha dia ${closingDay}). Vencimento previsto da fatura em ${pad(finalDueDay)}/${pad(dueMonth)}/${dueYear}.`,
  };
};

/**
 * Extracts and calculates purchaseDate and dueDate for a transaction.
 * Seamlessly handles legacy transactions and future installments.
 */
export const getTransactionCardDates = (
  tx: Transaction,
  cards?: CreditCard[]
): { purchaseDate: string; dueDate?: string; isCreditCard: boolean; card?: CreditCard } => {
  const isCreditCard = tx.paymentMethod === 'credit_card';
  const card = cards?.find((c) => c.id === tx.cardId);

  if (!isCreditCard) {
    return {
      purchaseDate: tx.purchaseDate || tx.date,
      dueDate: tx.dueDate,
      isCreditCard: false,
      card,
    };
  }

  // 1. Determine purchaseDate
  let purchaseDate = tx.purchaseDate;
  if (!purchaseDate && tx.notes) {
    const match = tx.notes.match(/Compra (?:original )?em (\d{2})\/(\d{2})\/(\d{4})/i);
    if (match) {
      purchaseDate = `${match[3]}-${match[2]}-${match[1]}`;
    }
  }
  if (!purchaseDate) {
    purchaseDate = tx.date;
  }

  // 2. Determine dueDate
  let dueDate = tx.dueDate;
  if (!dueDate && card) {
    if (tx.installment && tx.installment.current > 1) {
      const baseCalc = calculateCardInvoiceDueDate(purchaseDate, card);
      dueDate = addMonthsToDate(baseCalc.targetDueDate, tx.installment.current - 1);
    } else {
      const calc = calculateCardInvoiceDueDate(purchaseDate, card);
      dueDate = calc.targetDueDate;
    }
  }

  return {
    purchaseDate,
    dueDate,
    isCreditCard: true,
    card,
  };
};

