
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

export interface AppSettings {
  id?: number;
  currency: string;
  isDarkMode: boolean;
  hideBalance: boolean;
  pinLock?: string;
  useFingerprint: boolean;
  lastProcessedRecurring?: Date; 
}
