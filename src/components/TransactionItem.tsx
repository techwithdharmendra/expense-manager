import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Wallet, 
  Tag, 
  Copy, 
  Edit2, 
  Trash2, 
  X 
} from 'lucide-react';
import { Transaction, Category, Account } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { getIconByName } from '../lib/icons';
import { db } from '../db';

interface TransactionItemProps {
  key?: string | number;
  transaction: Transaction;
  category?: Category;
  account?: Account;
  currency?: string;
  onDelete?: (id: number) => void;
  onDuplicate?: (id: number) => void;
}

import { toast } from 'sonner';
import ConfirmDialog from './ConfirmDialog';

export default function TransactionItem({ 
  transaction, 
  category, 
  account, 
  currency,
  onDelete,
  onDuplicate
}: TransactionItemProps) {
  const navigate = useNavigate();
  const [showDetail, setShowDetail] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const IconComp = getIconByName(category?.icon || 'Tag');

  const handleDelete = async () => {
    try {
      const id = Number(transaction.id);
      if (!isNaN(id)) {
        await db.transactions.delete(id);
        toast.success('Transaction deleted');
        onDelete?.(id);
        setShowDetail(false);
      }
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const { id, ...rest } = transaction;
      const newId = await db.transactions.add({
        ...rest,
        date: new Date()
      });
      toast.success('Transaction duplicated');
      onDuplicate?.(Number(newId));
      setShowDetail(false);
    } catch (err) {
      toast.error('Duplicate failed');
    }
  };

  return (
    <>
      <ConfirmDialog 
        isOpen={confirmDelete}
        title="Delete Transaction?"
        message="This action will permanently remove this record from your history."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <motion.div 
        layout
        onClick={() => setShowDetail(true)}
        className="flex items-center justify-between p-4 bg-white rounded-3xl border border-gray-50 shadow-sm active:bg-gray-100 transition-all cursor-pointer group hover:border-indigo-100"
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
            style={{ backgroundColor: category?.color || '#CBD5E1' }}
          >
            <IconComp className="w-5 h-5" /> 
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-gray-900 truncate">{transaction.title}</h4>
            <p className="text-[10px] text-gray-400 uppercase tracking-tight truncate">
              {category?.name} • {new Date(transaction.date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className={cn("font-bold text-sm shrink-0", transaction.type === 'income' ? "text-emerald-500" : "text-gray-900 text-opacity-80")}>
          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
        </div>
      </motion.div>

      <AnimatePresence>
        {showDetail && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
             <motion.div 
               initial={{ y: '100%' }}
               animate={{ y: 0 }}
               exit={{ y: '100%' }}
               className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative space-y-6"
             >
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Details</p>
                   <button onClick={() => setShowDetail(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex items-center justify-between">
                   <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-gray-900">{transaction.title}</h2>
                      <p className={cn("text-lg font-bold", transaction.type === 'income' ? "text-emerald-500" : "text-gray-900")}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
                      </p>
                   </div>
                   <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                      style={{ backgroundColor: category?.color || '#6366F1' }}
                    >
                      {transaction.type === 'income' ? <ArrowDownLeft className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                         <Calendar className="w-3 h-3" />
                         <span>Date</span>
                      </div>
                      <p className="text-sm font-bold text-gray-700">{new Date(transaction.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                   </div>
                   <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                         <Wallet className="w-3 h-3" />
                         <span>Wallet</span>
                      </div>
                      <p className="text-sm font-bold text-gray-700">{account?.name || 'Unknown'}</p>
                   </div>
                   <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                         <Tag className="w-3 h-3" />
                         <span>Category</span>
                      </div>
                      <p className="text-sm font-bold text-gray-700">{category?.name || 'Unknown'}</p>
                   </div>
                   {transaction.note && (
                      <div className="p-4 bg-gray-50 rounded-2xl space-y-1 col-span-2">
                        <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                           <span>Note</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{transaction.note}</p>
                      </div>
                   )}
                </div>

                <div className="flex gap-3">
                   <button 
                     onClick={handleDuplicate}
                     className="flex-1 flex items-center justify-center py-4 bg-indigo-50 text-indigo-600 rounded-3xl font-bold active:scale-95 transition-transform"
                   >
                     <Copy className="w-5 h-5 mr-2" /> Duplicate
                   </button>
                   <button 
                     onClick={() => navigate(`/edit/${transaction.id}`)}
                     className="flex-1 flex items-center justify-center py-4 bg-indigo-600 text-white rounded-3xl font-bold active:scale-95 transition-transform"
                   >
                     <Edit2 className="w-5 h-5 mr-2" /> Edit
                   </button>
                </div>
                
                <button 
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center py-4 text-rose-500 font-bold active:scale-95 transition-transform"
                >
                  <Trash2 className="w-5 h-5 mr-2" /> Delete Transaction
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
