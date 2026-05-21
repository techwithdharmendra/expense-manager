
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Account {
  id?: number | string;
  name: string;
  balance: number; // Initial balance or current? We'll calculate current in UI, this is starting balance.
  icon: string;
  color: string;
  order?: number;
}

export interface Category {
  id?: number | string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  parentId?: number | string;
  order?: number;
}

export interface Transaction {
  id?: number | string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: number | string;
  accountId: number | string;
  toAccountId?: number | string; // For transfers
  date: Date;
  note?: string;
  tags?: string[];
  paymentMethod?: string;
  attachment?: string;
  isRecurring?: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface Budget {
  id?: number | string;
  categoryId: number | string;
  amount: number;
  period: 'weekly' | 'monthly';
  startDate: Date;
}

export interface CashbookCustomer {
  id?: number;
  name: string;
  phone?: string;
  balance: number; // Positive = we have to TAKE from them (they owe us), Negative = we have to GIVE to them (we owe them)
  createdAt: Date;
  updatedAt: Date;
}

export interface CashbookEntry {
  id?: number;
  customerId: number;
  type: 'took' | 'gave'; // 'took' means we took money FROM them (we owe them, balance decreases). 'gave' means we gave money TO them (they owe us, balance increases).
  amount: number;
  note?: string;
  date: Date;
  dueDate?: Date;
  isCleared: boolean;
  accountId?: number | string;
  linkedTransactionId?: number | string;
}

export interface AppSettings {
  id?: number;
  currency: string;
  isDarkMode: boolean;
  hideBalance: boolean;
  pinLock?: string;
  useFingerprint: boolean;
  lastProcessedRecurring?: Date; 
  numberFormat?: 'us' | 'in' | 'eu';
  showDecimals?: boolean;
  showSignSymbol?: boolean;
  dateFormat?: 'dd MMM yyyy' | 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';
  monthStartDate?: number;
  cashbookReminderDays?: number;
  syncCashbookWithExpenses?: boolean;
  language?: 'en' | 'hi' | 'gu';
}
