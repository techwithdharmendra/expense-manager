
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, resetWithSampleData } from '../db';
import { 
  Download, 
  Upload, 
  EyeOff, 
  Eye, 
  Coins, 
  Trash2, 
  ChevronRight,
  Moon,
  FileJson,
  FileSpreadsheet,
  Wallet,
  Tag,
  RotateCcw
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Settings() {
  const settings = useLiveQuery(() => db.settings.get(1));
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importPending, setImportPending] = useState<any>(null);

  const toggleHideBalance = async () => {
    if (settings) {
      await db.settings.update(1, { hideBalance: !settings.hideBalance });
      toast.success(settings.hideBalance ? 'Balance visible' : 'Balance hidden');
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
      const transactions = await db.transactions.toArray();
      const categories = await db.categories.toArray();
      const budgets = await db.budgets.toArray();
      const accounts = await db.accounts.toArray();
      
      const data = { transactions, categories, budgets, accounts, settings };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenseflow_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported successfully');
    } catch (err) {
      toast.error('Export failed');
    }
  };
  
  const exportCSV = async () => {
     try {
       const transactions = await db.transactions.toArray();
       const categories = await db.categories.toArray();
       
       let csv = 'Date,Title,Type,Category,Amount,Note\n';
       transactions.forEach(t => {
         const cat = categories.find(c => c.id === t.categoryId);
         csv += `${t.date.toISOString()},"${t.title}",${t.type},"${cat?.name || ''}",${t.amount},"${t.note || ''}"\n`;
       });
       
       const blob = new Blob([csv], { type: 'text/csv' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
       a.click();
       URL.revokeObjectURL(url);
       toast.success('CSV exported successfully');
     } catch (err) {
       toast.error('CSV export failed');
     }
  }

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.transactions) {
           setImportPending(data);
        } else {
          toast.error('Invalid backup file structure');
        }
      } catch (err) {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importPending) return;
    try {
      await db.transactions.clear();
      await db.categories.clear();
      await db.budgets.clear();
      await db.accounts.clear();
      
      const transactions = importPending.transactions.map((t: any) => ({
        ...t,
        date: new Date(t.date)
      }));
      
      await db.transactions.bulkAdd(transactions);
      await db.categories.bulkAdd(importPending.categories);
      await db.budgets.bulkAdd(importPending.budgets || []);
      await db.accounts.bulkAdd(importPending.accounts || []);
      
      toast.success('Import successful. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error('Import failed during database write');
    } finally {
      setImportPending(null);
    }
  };

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

  const handleConfirmReset = async () => {
    try {
      await resetWithSampleData();
      toast.success('Sample data loaded');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error('Reset failed');
    } finally {
      setConfirmReset(false);
    }
  };

  return (
    <div className="space-y-8 pb-6">
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
        isOpen={confirmReset}
        title="Reset to Sample?"
        message="Current data will be replaced with sample data for exploration."
        confirmText="Reset Now"
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmReset(false)}
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

      <div className="flex items-center px-1">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
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

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-gray-700">Currency</p>
            </div>
            <select 
              value={settings?.currency}
              onChange={e => changeCurrency(e.target.value)}
              className="text-sm font-bold text-indigo-600 focus:outline-none bg-transparent"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Data & Backup</h3>
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-50 flex flex-col">
          <button onClick={exportData} className="flex w-full items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 text-left">Internal Backup (JSON)</p>
                <p className="text-[10px] text-gray-400 font-medium">Complete app data dump for restore</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-gray-300" />
          </button>

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
            <Download className="w-4 h-4 text-emerald-300" />
          </button>
          
          <label className="flex w-full items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50 cursor-pointer">
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

          <button onClick={() => setConfirmReset(true)} className="flex w-full items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-700">Reset with Sample Data</p>
                <p className="text-[10px] text-gray-400 font-medium whitespace-nowrap">Clear app and load test data</p>
              </div>
            </div>
          </button>

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
