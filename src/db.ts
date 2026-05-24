
import Dexie, { type Table } from 'dexie';
import { Transaction, Category, Budget, AppSettings, Account, CashbookCustomer, CashbookEntry } from './types';

export class ExpenseDB extends Dexie {
  transactions!: Table<Transaction>;
  categories!: Table<Category>;
  budgets!: Table<Budget>;
  settings!: Table<AppSettings>;
  accounts!: Table<Account>;
  cashbookCustomers!: Table<CashbookCustomer>;
  cashbookEntries!: Table<CashbookEntry>;

  constructor() {
    super('ExpenseFlowDB');
    this.version(4).stores({
      transactions: '++id, title, amount, type, categoryId, accountId, date, isRecurring',
      categories: '++id, name, type, parentId',
      budgets: '++id, categoryId, period',
      settings: 'id',
      accounts: '++id, name',
      cashbookCustomers: '++id, name, phone, balance',
      cashbookEntries: '++id, customerId, type, date, dueDate, isCleared'
    });
  }
}

let dbInstance: ExpenseDB;
try {
  dbInstance = new ExpenseDB();
} catch (error) {
  console.error("Failed to initialize Dexie Database:", error);
  // Re-throw so at least it's known, but typically it doesn't fail on new Dexie(), it fails on open().
  dbInstance = new ExpenseDB();
}
export const db = dbInstance;

// Initialize default categories if none exist
export async function initDefaultCategories() {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd([
      // Expenses
      { name: 'Food & Dining', icon: 'Utensils', color: '#FF6B6B', type: 'expense' },
      { name: 'Shopping', icon: 'ShoppingBag', color: '#FFD93D', type: 'expense' },
      { name: 'Transportation', icon: 'Car', color: '#4D96FF', type: 'expense' },
      { name: 'Entertainment', icon: 'Gamepad2', color: '#6BCB77', type: 'expense' },
      { name: 'Health', icon: 'HeartPulse', color: '#FF4D4D', type: 'expense' },
      { name: 'Housing', icon: 'Home', color: '#4F2E1E', type: 'expense' },
      { name: 'Utilities', icon: 'Zap', color: '#F59E0B', type: 'expense' },
      { name: 'Education', icon: 'Book', color: '#3B82F6', type: 'expense' },
      { name: 'Personal Care', icon: 'Sparkles', color: '#F472B6', type: 'expense' },
      // Income
      { name: 'Salary', icon: 'Banknote', color: '#10B981', type: 'income' },
      { name: 'Freelance', icon: 'Briefcase', color: '#6366F1', type: 'income' },
      { name: 'Gifts', icon: 'Gift', color: '#F472B6', type: 'income' },
      { name: 'Investments', icon: 'TrendingUp', color: '#8B5CF6', type: 'income' },
    ]);
  }
}

// Initialize default accounts
export async function initDefaultAccounts() {
  const count = await db.accounts.count();
  if (count === 0) {
    await db.accounts.bulkAdd([
      { name: 'Personal Cash', balance: 0, icon: 'Wallet', color: '#10B981' },
      { name: 'Main Bank', balance: 0, icon: 'Building', color: '#6366F1' },
      { name: 'Savings Pot', balance: 0, icon: 'PiggyBank', color: '#F472B6' },
      { name: 'Credit Card', balance: 0, icon: 'CreditCard', color: '#EF4444' },
    ]);
  }
}

// Initialize default settings
export async function initDefaultSettings() {
  const settings = await db.settings.get(1);
  if (!settings) {
    await db.settings.add({
      id: 1,
      currency: 'INR',
      isDarkMode: false,
      hideBalance: false,
      useFingerprint: false,
      lastProcessedRecurring: new Date(),
      numberFormat: 'in',
      showDecimals: false,
      showSignSymbol: false,
      dateFormat: 'dd MMM yyyy',
      monthStartDate: 1,
      cashbookReminderDays: 1,
      syncCashbookWithExpenses: false,
      language: 'en',
      showRecentTransactionsWidget: true,
      showCategoryOverviewWidget: true,
      showCashbookSummaryWidget: true,
      autoBackupType: 'none',
      backupFrequencyDays: 7
    });
  } else {
    // Add missing settings if updating from older version
    let updated = false;
    if (settings.numberFormat === undefined) { settings.numberFormat = 'in'; updated = true; }
    if (settings.showDecimals === undefined) { settings.showDecimals = false; updated = true; }
    if (settings.showSignSymbol === undefined) { settings.showSignSymbol = false; updated = true; }
    if (settings.dateFormat === undefined) { settings.dateFormat = 'dd MMM yyyy'; updated = true; }
    if (settings.monthStartDate === undefined) { settings.monthStartDate = 1; updated = true; }
    if (settings.cashbookReminderDays === undefined) { settings.cashbookReminderDays = 1; updated = true; }
    if (settings.syncCashbookWithExpenses === undefined) { settings.syncCashbookWithExpenses = false; updated = true; }
    if (settings.language === undefined) { settings.language = 'en'; updated = true; }
    if (settings.showRecentTransactionsWidget === undefined) { settings.showRecentTransactionsWidget = true; updated = true; }
    if (settings.showCategoryOverviewWidget === undefined) { settings.showCategoryOverviewWidget = true; updated = true; }
    if (settings.showCashbookSummaryWidget === undefined) { settings.showCashbookSummaryWidget = true; updated = true; }
    if (settings.autoBackupType === undefined) { settings.autoBackupType = 'none'; updated = true; }
    if (settings.backupFrequencyDays === undefined) { settings.backupFrequencyDays = 7; updated = true; }
    if (updated) await db.settings.put(settings);
  }
}

// Full Reset with Sample Data
export async function resetWithSampleData() {
  await db.transactions.clear();
  await db.budgets.clear();
  await db.accounts.clear();
  await db.categories.clear();
  await db.cashbookCustomers.clear();
  await db.cashbookEntries.clear();

  // Categories
  const catIds = await db.categories.bulkAdd([
    { name: 'Food & Dining', icon: 'Utensils', color: '#FF6B6B', type: 'expense' },
    { name: 'Shopping', icon: 'ShoppingBag', color: '#FFD93D', type: 'expense' },
    { name: 'Salary', icon: 'Banknote', color: '#10B981', type: 'income' },
    { name: 'Transport', icon: 'Car', color: '#4D96FF', type: 'expense' },
  ], { allKeys: true });

  // Accounts
  const accIds = await db.accounts.bulkAdd([
    { name: 'Cash', balance: 500, icon: 'Wallet', color: '#10B981' },
    { name: 'Bank Account', balance: 2500, icon: 'Building', color: '#6366F1' },
  ], { allKeys: true });

  // Transactions
  await db.transactions.bulkAdd([
    { title: 'Grocery Shopping', amount: 45.2, type: 'expense', categoryId: catIds[0], accountId: accIds[1], date: new Date() },
    { title: 'Monthly Salary', amount: 3000, type: 'income', categoryId: catIds[2], accountId: accIds[1], date: new Date() },
    { title: 'Coffee', amount: 4.5, type: 'expense', categoryId: catIds[0], accountId: accIds[0], date: new Date() },
    { title: 'Bus Ticket', amount: 2.5, type: 'expense', categoryId: catIds[3], accountId: accIds[0], date: new Date(Date.now() - 86400000) },
  ]);
}
