import React, { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { toast } from 'sonner';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { saveToExpenseManagerDir, readFromExpenseManagerDir, ensureExpenseManagerDir, EXPENSE_MANAGER_DIR } from '../lib/storageUtils';

export default function AutoBackupService() {
  const settings = useLiveQuery(() => db.settings.get(1));

  useEffect(() => {
    if (!settings) return;
    const freqDays = settings.backupFrequencyDays || 0;
    if (freqDays === 0) return;

    const checkBackup = async () => {
      const lastBackup = settings.lastBackupDate?.getTime() || 0;
      const freqMs = freqDays * 24 * 60 * 60 * 1000;
      
      if (Date.now() - lastBackup > freqMs) {
         // Do silent backup to app storage
         try {
           const backupData = await getBackupData();
           if (Capacitor.isNativePlatform()) {
             await saveToExpenseManagerDir('expense_manager_auto_backup.json', JSON.stringify(backupData, null, 2));
             
             // Monthly CSV export
             await handleMonthlyCSVExport();
             
           } else {
             // Fallback for web testing
             localStorage.setItem('expense_manager_auto_backup', JSON.stringify(backupData));
           }
           await db.settings.update(1, { lastBackupDate: new Date() });
           console.log('Automated app backup successful');
         } catch (e) {
           console.error('Auto backup failed', e);
         }
      }
    }
    
    checkBackup();
  }, [settings?.lastBackupDate, settings?.backupFrequencyDays]);

  const handleMonthlyCSVExport = async () => {
    const transactions = await db.transactions.toArray();
    const categories = await db.categories.toArray();
    const accounts = await db.accounts.toArray();
    
    // Group transactions by month (YYYY-MM)
    const grouped: Record<string, typeof transactions> = {};
    for (const t of transactions) {
       const monthStr = new Date(t.date).toISOString().slice(0, 7); // e.g., 2024-05
       if (!grouped[monthStr]) grouped[monthStr] = [];
       grouped[monthStr].push(t);
    }
    
    for (const [month, txs] of Object.entries(grouped)) {
       let totalIncome = 0;
       let totalExpense = 0;
       let csv = 'Date,Title,Type,Category,Amount,Account,Note\n';
       txs.forEach(t => {
         const cat = categories.find(c => c.id === t.categoryId);
         const acc = accounts.find(a => a.id === t.accountId);
         const dateFormatted = new Date(t.date).toISOString().split('T')[0];
         csv += `${dateFormatted},"${t.title.replace(/"/g, '""')}",${t.type},"${cat?.name || ''}",${t.amount},"${acc?.name || ''}","${(t.note || '').replace(/"/g, '""')}"\n`;
         if (t.type === 'income') totalIncome += t.amount;
         else if (t.type === 'expense') totalExpense += t.amount;
       });
       
       csv += `\n,,,"Total Income",${totalIncome},,\n`;
       csv += `,,,"Total Expense",${totalExpense},,\n`;
       csv += `,,,"Balance",${totalIncome - totalExpense},,\n`;
       
       const fileName = `expenses_${month}.csv`;
       await saveToExpenseManagerDir(fileName, csv, true);
    }
  };

  const getBackupData = async () => {
    const [transactions, categories, budgets, accounts, settingsData, cashbookCustomers, cashbookEntries] = await Promise.all([
      db.transactions.toArray(),
      db.categories.toArray(),
      db.budgets.toArray(),
      db.accounts.toArray(),
      db.settings.toArray(),
      db.cashbookCustomers.toArray(),
      db.cashbookEntries.toArray()
    ]);
    return {
      version: 1,
      transactions,
      categories,
      budgets,
      accounts,
      settings: settingsData,
      cashbookCustomers,
      cashbookEntries
    };
  };

  return null;
}
