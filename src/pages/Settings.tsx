
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { auditBalances } from '../lib/dbUtils';
import { filterStore } from '../lib/filterStore';
import { 
  Download, 
  Upload,
  EyeOff, 
  Eye, 
  Coins, 
  Trash2, 
  ChevronRight,
  Moon,
  Sun,
  FileSpreadsheet,
  Wallet,
  Tag,
  RefreshCw,
  Database
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export default function Settings() {
  const settings = useLiveQuery(() => db.settings.get(1));
  const [confirmClear, setConfirmClear] = useState(false);
  const [importPending, setImportPending] = useState<any>(null);

  const [isAuditing, setIsAuditing] = useState(false);

  const handleAuditBalances = async () => {
    setIsAuditing(true);
    try {
      await auditBalances();
      toast.success('Account balances recalculated successfully');
    } catch (err) {
      toast.error('Balance audit failed');
    } finally {
      setIsAuditing(false);
    }
  };

  const toggleHideBalance = async () => {
    if (settings) {
      await db.settings.update(1, { hideBalance: !settings.hideBalance });
      toast.success(settings.hideBalance ? 'Balance visible' : 'Balance hidden');
    }
  };

  const toggleTheme = async () => {
    if (settings) {
      await db.settings.update(1, { isDarkMode: !settings.isDarkMode });
    }
  };

  const changeCurrency = async (curr: string) => {
    if (settings) {
      await db.settings.update(1, { currency: curr });
      toast.success(`Currency changed to ${curr}`);
    }
  };

  const exportData = async () => {
    try {
      const [transactions, categories, budgets, accounts, settingsData] = await Promise.all([
        db.transactions.toArray(),
        db.categories.toArray(),
        db.budgets.toArray(),
        db.accounts.toArray(),
        db.settings.get(1)
      ]);
      
      const data = { 
        version: 1,
        transactions, 
        categories, 
        budgets, 
        accounts, 
        settings: settingsData,
        exportedAt: new Date().toISOString()
      };
      const jsonData = JSON.stringify(data);
      const fileName = `expenseflow_backup_${new Date().getTime()}.json`;

      if (Capacitor.isNativePlatform()) {
        try {
          await Filesystem.writeFile({
            path: fileName,
            data: jsonData,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });
          
          toast.success('Backup exported successfully');
          
          try {
            const { uri: fileUri } = await Filesystem.getUri({
              path: fileName,
              directory: Directory.Cache
            });

            await Share.share({
              title: 'Export Backup',
              files: [fileUri],
            });
          } catch (shareErr) {
            console.log('Share dismissed/cancelled');
          }
          return; 
        } catch (fileErr: any) {
          console.error('File write error:', fileErr);
          toast.error(`Export failed: ${fileErr.message || 'Check storage permissions'}`);
          return;
        }
      } else {
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Backup exported successfully');
      }
    } catch (err) {
      toast.error('Export generation failed');
    }
  };

  const exportCSV = async () => {
    try {
       const transactions = await db.transactions.toArray();
       const categories = await db.categories.toArray();
       const accounts = await db.accounts.toArray();
       
       let csv = 'Date,Title,Type,Category,Amount,Account,Note\n';
       transactions.forEach(t => {
         const cat = categories.find(c => c.id === t.categoryId);
         const acc = accounts.find(a => a.id === t.accountId);
         const dateFormatted = new Date(t.date).toISOString().split('T')[0];
         csv += `${dateFormatted},"${t.title.replace(/"/g, '""')}",${t.type},"${cat?.name || ''}",${t.amount},"${acc?.name || ''}","${(t.note || '').replace(/"/g, '""')}"\n`;
       });
       
       const fileName = `expenses_${new Date().getTime()}.csv`;

       if (Capacitor.isNativePlatform()) {
         try {
           await Filesystem.writeFile({
              path: fileName,
              data: csv,
              directory: Directory.Cache,
              encoding: Encoding.UTF8,
           });
           
           toast.success('CSV exported successfully');

           try {
             const { uri } = await Filesystem.getUri({
               path: fileName,
               directory: Directory.Cache
             });

             await Share.share({
                title: 'Export Transactions',
                files: [uri],
             });
           } catch (shareErr) {
             console.log('CSV Share dismissed');
           }
           return;
         } catch (nativeErr: any) {
           console.error('CSV Native Export Error:', nativeErr);
           toast.error(`CSV Export failed: ${nativeErr.message || 'Check storage permissions'}`);
           return;
         }
       } else {
         const blob = new Blob([csv], { type: 'text/csv' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = fileName;
         a.click();
         URL.revokeObjectURL(url);
         toast.success('CSV exported successfully');
       }
     } catch (err) {
       toast.error('CSV generation failed');
     }
  }

  const handleClearData = async () => {
    try {
      await Promise.all([
        db.transactions.clear(),
        db.budgets.clear(),
        db.accounts.clear(),
        db.categories.clear(),
        db.settings.clear()
      ]);
      toast.success('All data cleared');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error('Clear data failed');
    } finally {
      setConfirmClear(false);
    }
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.error('Please select a JSON backup file');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('Empty file');
        const data = JSON.parse(text);
        
        // More robust check - allow even if empty arrays (after clear all)
        const hasProps = data && typeof data === 'object' && (
          Array.isArray(data.transactions) || 
          Array.isArray(data.categories) || 
          Array.isArray(data.accounts) ||
          data.settings
        );

        if (hasProps) {
           setImportPending(data);
        } else {
          toast.error('Invalid backup: Missing data structure');
        }
      } catch (err) {
        console.error('Import Parse Error:', err);
        toast.error('Invalid file: JSON parsing failed');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importPending) return;
    try {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.budgets.clear(),
        db.accounts.clear(),
        db.settings.clear()
      ]);
      
      const transactions = (importPending.transactions || []).map((t: any) => ({
        ...t,
        date: new Date(t.date)
      }));
      
      if (transactions.length > 0) await db.transactions.bulkAdd(transactions);
      if (importPending.categories?.length > 0) await db.categories.bulkAdd(importPending.categories);
      if (importPending.budgets?.length > 0) await db.budgets.bulkAdd(importPending.budgets);
      if (importPending.accounts?.length > 0) await db.accounts.bulkAdd(importPending.accounts);
      if (importPending.settings) {
        await db.settings.put(importPending.settings);
      }
      
      toast.success('Backup restored successfully. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Import failed during database write');
    } finally {
      setImportPending(null);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <ConfirmDialog 
        isOpen={confirmClear}
        title="Delete All Data?"
        message="This is permanent and cannot be undone. All your history, accounts and categories will be lost."
        confirmText="Clear Everything"
        variant="danger"
        onConfirm={handleClearData}
        onCancel={() => setConfirmClear(false)}
      />

      <ConfirmDialog 
        isOpen={!!importPending}
        title="Import Data?"
        message="This will overwrite all current data with the backup file."
        confirmText="Import"
        variant="danger"
        onConfirm={handleConfirmImport}
        onCancel={() => setImportPending(null)}
      />

      <div className="flex items-center justify-between px-1 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <button 
          onClick={toggleTheme} 
          className="w-9 h-9 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors border border-gray-100" 
          title="Toggle Theme"
        >
          {settings?.isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Management */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Structure</h3>
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-50 flex flex-col">
          <Link to="/settings/accounts" className="flex items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Manage Accounts</p>
                <p className="text-[10px] text-gray-400 font-medium tracking-tight">Add cash, bank or digital wallets</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </Link>

          <Link to="/settings/categories" className="flex items-center justify-between p-4 active:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Categories & Sub-cats</p>
                <p className="text-[10px] text-gray-400 font-medium tracking-tight">Customize labels for your spends</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </Link>
        </div>
      </section>

      {/* Account Preferences */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Account Preferences</h3>
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center space-x-3">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-colors", settings?.hideBalance ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600")}>
                {settings?.hideBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Hide Balance</p>
                <p className="text-[10px] text-gray-400 font-medium">Conceal total balance on dashboard</p>
              </div>
            </div>
            <button 
              onClick={toggleHideBalance}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                settings?.hideBalance ? "bg-indigo-600" : "bg-gray-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                settings?.hideBalance ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Currency</p>
                <p className="text-[10px] text-gray-400 font-medium">Primary money formatting</p>
              </div>
            </div>
            <select 
              value={settings?.currency || 'INR'}
              onChange={e => changeCurrency(e.target.value)}
              className="text-sm font-bold text-indigo-600 focus:outline-none bg-transparent whitespace-nowrap px-1"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold font-mono">
                $
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Number Format</p>
                <p className="text-[10px] text-gray-400 font-medium">Comma & dot style</p>
              </div>
            </div>
            <select 
              value={settings?.numberFormat || 'in'}
              onChange={e => db.settings.update(1, { numberFormat: e.target.value as any })}
              className="text-sm font-bold text-indigo-600 focus:outline-none bg-transparent whitespace-nowrap px-1"
            >
              <option value="in">Indian (1,23,456.78)</option>
              <option value="us">US (1,234.56)</option>
              <option value="eu">European (1.234,56)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold font-mono">
                .00
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Show Decimals</p>
                <p className="text-[10px] text-gray-400 font-medium">Show points after zero</p>
              </div>
            </div>
            <button 
              onClick={() => db.settings.update(1, { showDecimals: settings?.showDecimals === false ? true : false })}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative shrink-0",
                settings?.showDecimals !== false ? "bg-indigo-600" : "bg-gray-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                settings?.showDecimals !== false ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center pb-1 text-lg font-bold font-mono">
                ±
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Show Sign (+ / -)</p>
                <p className="text-[10px] text-gray-400 font-medium">Income +$ / Expense -$</p>
              </div>
            </div>
            <button 
              onClick={() => db.settings.update(1, { showSignSymbol: settings?.showSignSymbol === false ? true : false })}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative shrink-0",
                settings?.showSignSymbol !== false ? "bg-indigo-600" : "bg-gray-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                settings?.showSignSymbol !== false ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-sm font-bold">
                M
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Month Start Date</p>
                <p className="text-[10px] text-gray-400 font-medium">Day a new month cycle begins</p>
              </div>
            </div>
            <select 
              value={settings?.monthStartDate || 1}
              onChange={e => {
                const newDay = parseInt(e.target.value);
                db.settings.update(1, { monthStartDate: newDay });
                const currentFilters = filterStore.getState();
                if (currentFilters.dateRange === 'custom') {
                  filterStore.setState({ ...currentFilters, dateRange: 'month' });
                }
              }}
              className="text-sm font-bold text-indigo-600 focus:outline-none bg-transparent text-right"
            >
              {Array.from({length: 28}, (_, i) => i + 1).map(day => (
                 <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Maintenance & Optimization</h3>
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-50 flex flex-col">
          <button 
            onClick={handleAuditBalances} 
            disabled={isAuditing}
            className="flex w-full items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50 disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <RefreshCw className={cn("w-5 h-5", isAuditing && "animate-spin")} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 text-left">Repair Balances</p>
                <p className="text-[10px] text-gray-400 font-medium">Recalculate account totals from history</p>
              </div>
            </div>
            {isAuditing && <span className="text-[10px] font-bold text-amber-500 uppercase">Wait...</span>}
          </button>

          <div className="flex w-full items-center justify-between p-4 active:bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 text-left">Cache Mode</p>
                <p className="text-[10px] text-gray-400 font-medium">Performance optimized for large history</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase bg-emerald-50 px-2 py-1 rounded-lg">Enabled</span>
          </div>
        </div>
      </section>

      {/* Data Management backup */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Data & Backup</h3>
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-50 flex flex-col">
          <button onClick={exportCSV} className="flex w-full items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 text-left">Export to CSV</p>
                <p className="text-[10px] text-gray-400 font-medium">Open your transactions in Excel</p>
              </div>
            </div>
          </button>

          <button onClick={exportData} className="flex w-full items-center p-4 border-b border-gray-50 active:bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 text-left">Backup Data (JSON)</p>
                <p className="text-[10px] text-gray-400 font-medium">Create a restorable backup file</p>
              </div>
            </div>
          </button>

          <label className="flex w-full items-center p-4 border-b border-gray-50 active:bg-gray-50 cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 text-left">Restore Backup</p>
                <p className="text-[10px] text-gray-400 font-medium">Upload previously exported JSON</p>
              </div>
            </div>
            <input type="file" accept=".json" onChange={importData} className="hidden" />
          </label>
          
          <button onClick={() => setConfirmClear(true)} className="flex w-full items-center justify-between p-4 text-red-500 active:bg-red-50 w-full text-left">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-red-500">Clear All Data</p>
              </div>
            </div>
          </button>
        </div>
      </section>

      <div className="text-center pb-8 opacity-30">
         <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 italic">ExpenseFlow v1.0.0 (Alpha)</p>
         <p className="text-[8px] text-gray-400 mt-1 uppercase tracking-widest font-medium">Brought to you by Gemini Build</p>
      </div>
    </div>
  );
}
