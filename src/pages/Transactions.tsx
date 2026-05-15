
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Search, 
  Filter, 
  Trash2, 
  Copy, 
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  History as HistoryIcon,
  RefreshCcw,
  Image as ImageIcon
} from 'lucide-react';
import { Transaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TransactionItem from '../components/TransactionItem';

export default function Transactions() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const transactions = useLiveQuery(() => db.transactions.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const settings = useLiveQuery(() => db.settings.get(1));

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    let result = transactions.filter(t => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.note?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }

    return result.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, searchTerm, filterType]);

  const getCategory = (id: string | number) => categories?.find(c => String(c.id) === String(id));
  const getAccount = (id: string | number) => accounts?.find(a => String(a.id) === String(id));

  // Group by month/year
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
      const dateObj = new Date(t.date);
      const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Transactions</h1>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "p-2.5 rounded-2xl transition-all shadow-sm", 
            showFilters ? "bg-indigo-600 text-white" : "bg-white border border-gray-100 text-gray-500"
          )}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
        />
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl">
              {(['all', 'income', 'expense'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all",
                    filterType === f ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        <div className="space-y-8">
          {(Object.entries(groupedTransactions) as [string, Transaction[]][]).map(([group, groupT]) => (
            <div key={group} className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{group}</h3>
            <div className="space-y-3">
              {groupT.map((t) => (
                <TransactionItem 
                  key={t.id} 
                  transaction={t} 
                  category={getCategory(t.categoryId)}
                  account={getAccount(t.accountId)}
                  currency={settings?.currency}
                />
              ))}
            </div>
          </div>
        ))}

        {filteredTransactions.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
               <HistoryIcon className="w-8 h-8" />
            </div>
            <p className="text-gray-500 font-medium tracking-tight">No transactions found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );
}
