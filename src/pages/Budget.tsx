
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Target as TargetIcon, 
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';

import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Budget() {
  const categories = useLiveQuery(() => db.categories.toArray());
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const budgets = useLiveQuery(() => db.budgets.toArray());
  const settings = useLiveQuery(() => db.settings.get(1));

  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('total');
  const [amount, setAmount] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const budgetStats = useMemo(() => {
    if (!transactions || !budgets) return [];
    
    // Get this month's transactions
    const now = new Date();
    const monthTransactions = transactions.filter(t => 
      t.date.getMonth() === now.getMonth() && 
      t.date.getFullYear() === now.getFullYear() &&
      t.type === 'expense'
    );

    return budgets.map(b => {
      const spent = monthTransactions
        .filter(t => b.categoryId === 'total' || String(t.categoryId) === String(b.categoryId))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const category = categories?.find(c => String(c.id) === String(b.categoryId));
      const percentage = (spent / b.amount) * 100;
      
      return {
        id: b.id,
        name: b.categoryId === 'total' ? 'Total Monthly Budget' : category?.name || 'Unknown',
        limit: b.amount,
        spent,
        percentage,
        category
      };
    });
  }, [transactions, budgets, categories]);

  const addBudget = async () => {
    if (!amount) {
      toast.error('Please enter an amount');
      return;
    }
    
    try {
      await db.budgets.add({
        categoryId: selectedCategory === 'total' ? 'total' : Number(selectedCategory),
        amount: parseFloat(amount),
        period: 'monthly',
        startDate: new Date()
      });
      toast.success('Budget added successfully');
      setAmount('');
      setIsAdding(false);
    } catch (err) {
      toast.error('Failed to add budget');
    }
  };

  const deleteBudget = async () => {
    if (confirmDelete === null) return;
    try {
      await db.budgets.delete(confirmDelete);
      toast.success('Budget deleted');
    } catch (err) {
      toast.error('Failed to delete budget');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog 
        isOpen={confirmDelete !== null}
        title="Delete Budget?"
        message="This will remove the spending limit for this category."
        confirmText="Remove"
        variant="danger"
        onConfirm={deleteBudget}
        onCancel={() => setConfirmDelete(null)}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Budgeting</h1>
        <button 
           onClick={() => setIsAdding(!isAdding)}
           className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100"
        >
          <Plus className={cn("w-6 h-6 transition-transform", isAdding && "rotate-45")} />
        </button>
      </div>

      {isAdding && (
        <motion.div 
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-100 space-y-4"
        >
          <h3 className="text-sm font-bold text-gray-700">Set Monthly Limit</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
              <select 
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-50 rounded-xl p-3 text-sm focus:outline-none"
              >
                <option value="total">Total Spending</option>
                {categories?.filter(c => c.type === 'expense').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Limit Amount</label>
              <input 
                type="number" 
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-gray-50 rounded-xl p-3 text-sm focus:outline-none font-bold"
              />
            </div>
            <button 
              onClick={addBudget}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              Add Budget
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        {budgetStats.length === 0 && !isAdding && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-100">
             <TargetIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
             <p className="text-gray-500 font-medium">No budgets defined yet</p>
             <p className="text-xs text-gray-400 mt-1">Plan your spending to save more!</p>
          </div>
        )}

        {budgetStats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.id} 
            className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 space-y-4 relative overflow-hidden"
          >
            {stat.percentage >= 100 && (
              <div className="absolute top-0 right-0 py-1 px-3 bg-red-500 text-white text-[8px] font-bold uppercase rounded-bl-xl flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                Overspent
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: stat.category?.color || '#6366F1' }}
                >
                  <TargetIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{stat.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Remaining: {formatCurrency(Math.max(0, stat.limit - stat.spent), settings?.currency)}</p>
                </div>
              </div>
              <button 
                onClick={() => setConfirmDelete(stat.id!)}
                className="text-[10px] font-bold text-red-300 hover:text-red-500"
              >
                Delete
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-bold text-gray-400">
                  <span className="text-gray-900">{formatCurrency(stat.spent, settings?.currency)}</span> / {formatCurrency(stat.limit, settings?.currency)}
                </p>
                <p className={cn("text-[10px] font-bold", stat.percentage > 100 ? "text-red-500" : "text-indigo-600")}>
                  {Math.round(stat.percentage)}%
                </p>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${Math.min(100, stat.percentage)}%` }}
                   transition={{ duration: 1, ease: 'easeOut' }}
                   className={cn("h-full rounded-full", stat.percentage > 90 ? "bg-red-500" : stat.percentage > 70 ? "bg-orange-400" : "bg-indigo-600")}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-indigo-50 rounded-3xl p-5 border border-indigo-100 flex items-start space-x-3">
        <Info className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-indigo-700 leading-relaxed font-medium">
          Budgets are reset automatically on the first day of every month. Your progress is calculated based on transactions in the current month.
        </p>
      </div>
    </div>
  );
}
