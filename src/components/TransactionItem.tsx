import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Wallet } from 'lucide-react';
import { Transaction, Category, Account } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { getIconByName } from '../lib/icons';

interface TransactionItemProps {
  key?: React.Key;
  transaction: Transaction;
  category?: Category;
  parentCategory?: Category;
  account?: Account;
  currency?: string;
  showDate?: boolean;
}

export default function TransactionItem({ 
  transaction, 
  category, 
  parentCategory,
  account, 
  currency,
  showDate = true
}: TransactionItemProps) {
  const navigate = useNavigate();
  const IconComp = getIconByName(category?.icon || 'Tag');

  return (
    <motion.div 
      layout
      onClick={() => navigate(`/edit/${transaction.id}`)}
      className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-50 shadow-sm active:bg-gray-100 transition-all cursor-pointer group hover:border-indigo-100"
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
          <div className="flex flex-col space-y-0.5">
            <p className="text-[9px] text-gray-400 uppercase font-medium tracking-tight truncate">
              {parentCategory ? `${parentCategory.name} • ${category?.name}` : category?.name}
              {showDate && ` • ${new Date(transaction.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            </p>
            {transaction.note && (
              <p className="text-[10px] text-gray-500 truncate leading-tight italic">
                {transaction.note}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 ml-3">
        <div className={cn("font-bold text-sm", transaction.type === 'income' ? "text-emerald-500" : "text-rose-500")}>
          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
        </div>
        <div 
          className="flex items-center space-x-1.5 mt-1 px-2 py-0.5 rounded-full border" 
          style={{ 
            borderColor: account?.color ? `${account.color}30` : '#F3F4F6', 
            backgroundColor: account?.color ? `${account.color}10` : '#F9FAFB' 
          }}
        >
          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: account?.color || '#94A3B8' }} />
          <span 
            className="text-[8px] font-bold uppercase tracking-tight truncate max-w-[65px]"
            style={{ color: account?.color || '#64748B' }}
          >
            {account?.name || 'Wallet'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
