import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Wallet, Paperclip } from 'lucide-react';
import { Transaction, Category, Account } from '../types';
import { formatCurrency, cn, formatDate } from '../lib/utils';
import { getIconByName } from '../lib/icons';

interface TransactionItemProps {
  key?: React.Key;
  transaction: Transaction;
  category?: Category;
  parentCategory?: Category;
  account?: Account;
  toAccount?: Account;
  settings?: any;
  showDate?: boolean;
}

export default function TransactionItem({ 
  transaction, 
  category, 
  parentCategory,
  account, 
  toAccount,
  settings,
  showDate = true
}: TransactionItemProps) {
  const navigate = useNavigate();
  const IconComp = getIconByName(category?.icon || 'Tag');
  const TransferIcon = getIconByName('ArrowRight');
  const showSignSymbol = settings?.showSignSymbol !== false;

  return (
    <motion.div 
      layout
      onClick={() => navigate(`/edit/${transaction.id}`)}
      className="flex items-center justify-between px-3.5 py-2.5 bg-white rounded-[16px] border border-gray-50 shadow-xs active:bg-gray-100 transition-all cursor-pointer group hover:border-indigo-100"
    >
      <div className="flex items-center space-x-3 overflow-hidden">
        <div 
          className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0", 
            transaction.type === 'transfer' ? "bg-blue-500" : ""
          )}
          style={{ backgroundColor: transaction.type !== 'transfer' ? (category?.color || '#CBD5E1') : undefined }}
        >
          {transaction.type === 'transfer' ? (
             <TransferIcon className="w-5 h-5" />
          ) : (
             <IconComp className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5">
            <h4 className="font-semibold text-sm text-gray-900 truncate">{transaction.title}</h4>
            {transaction.attachment && <Paperclip className="w-3 h-3 text-indigo-400 shrink-0" />}
          </div>
          <div className="flex flex-col space-y-0.5">
            <p className="text-[9px] text-gray-400 uppercase font-medium tracking-tight truncate">
              {transaction.type === 'transfer' 
                 ? `Transfer` 
                 : (parentCategory ? `${parentCategory.name} • ${category?.name}` : category?.name)}
              {showDate && ` • ${formatDate(transaction.date, settings)}`}
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
        <div className={cn("font-bold text-sm", 
          transaction.type === 'income' ? "text-emerald-500" : 
          transaction.type === 'expense' ? "text-rose-500" : "text-blue-500"
        )}>
          {showSignSymbol && (transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '')}{formatCurrency(transaction.amount, settings)}
        </div>
        {transaction.type === 'transfer' ? (
          <div className="flex items-center space-x-1 mt-1 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 flex-shrink-0 max-w-[140px]">
             <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: account?.color || '#3B82F6' }} />
             <span className="text-[8px] font-bold uppercase tracking-tight text-blue-600 truncate max-w-[50px]">
               {account?.name || 'Wallet'}
             </span>
             <TransferIcon className="w-2.5 h-2.5 text-blue-400 shrink-0" />
             <span className="text-[8px] font-bold uppercase tracking-tight text-blue-600 truncate max-w-[50px]">
               {toAccount?.name || 'Wallet'}
             </span>
          </div>
        ) : (
          <div 
            className="flex items-center space-x-1.5 mt-1 px-2 py-0.5 rounded-full border max-w-[80px]" 
            style={{ 
              borderColor: account?.color ? `${account.color}30` : '#F3F4F6', 
              backgroundColor: account?.color ? `${account.color}10` : '#F9FAFB' 
            }}
          >
            <div className="w-1.5 h-1.5 shrink-0 rounded-full" style={{ backgroundColor: account?.color || '#94A3B8' }} />
            <span 
              className="text-[8px] font-bold uppercase tracking-tight truncate flex-1"
              style={{ color: account?.color || '#64748B' }}
            >
              {account?.name || 'Wallet'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
