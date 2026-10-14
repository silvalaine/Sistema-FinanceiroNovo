export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 
  | 'pix' 
  | 'credit_card' 
  | 'debit_card' 
  | 'cash' 
  | 'bank_transfer' 
  | 'boleto' 
  | 'other';

export type TransactionStatus = 'completed' | 'pending';

export type CardBrand = 'mastercard' | 'visa' | 'elo' | 'amex' | 'hipercard' | 'other';

export interface CreditCard {
  id: string;
  name: string;
  brand: CardBrand;
  lastFourDigits?: string;
  limit: number; // Limite de crédito em R$
  closingDay: number; // Dia do mês em que fecha a fatura (ex: 25)
  dueDay: number; // Dia do mês em que vence a fatura (ex: 5)
  color: string; // Cor visual do cartão (ex: #8B5CF6)
}

export interface InstallmentInfo {
  current: number; // ex: 1
  total: number; // ex: 10
  groupId: string; // ID compartilhado entre todas as parcelas da compra
}

export interface Subcategory {
  id: string;
  name: string;
  budgetLimit?: number; // Limite / Orçamento mensal da subcategoria em R$
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  subcategories: Subcategory[];
  budgetLimit?: number; // Monthly budget limit in R$
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  subcategoryId: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  cardId?: string; // Cartão de crédito utilizado, se aplicável
  installment?: InstallmentInfo; // Detalhes de parcelamento se for compra parcelada
  notes?: string;
  purchaseDate?: string; // Data em que a compra foi realizada no cartão (YYYY-MM-DD)
  dueDate?: string; // Data de vencimento da fatura do cartão de crédito (YYYY-MM-DD)
  createdAt: string;
}

export type PeriodFilter = 
  | 'current_month' 
  | 'next_month'
  | 'last_month' 
  | 'last_3_months' 
  | 'last_6_months' 
  | 'current_year' 
  | 'all' 
  | 'custom';

export interface TransactionFilter {
  period: PeriodFilter;
  startDate?: string;
  endDate?: string;
  type?: 'all' | TransactionType;
  status?: 'all' | TransactionStatus;
  categoryId?: string;
  subcategoryId?: string;
  paymentMethod?: 'all' | PaymentMethod;
  cardId?: 'all' | string;
  onlyInstallments?: boolean;
  searchQuery?: string;
}

export type ReportType = 
  | 'category_subcategory' 
  | 'income_statement' 
  | 'monthly_comparison' 
  | 'payment_methods'
  | 'credit_cards'
  | 'card_category'
  | 'future_installments';
