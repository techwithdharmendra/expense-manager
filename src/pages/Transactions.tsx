
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
import FilterSection, { FilterState } from '../components/FilterSection';

export default function Transactions() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    accountId: 'all',
    categoryId: 'all',
    dateRange: 'month',
    startDate: '',
    endDate: '',
    searchTerm: ''
  });

  const [limit, setLimit] = useState(50);

  const categories = useLiveQuery(() => db.categories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const settings = useLiveQuery(() => db.settings.get(1));

  const filteredTransactions = useLiveQuery(
    async () => {
      if (!categories) return []; // Wait until categories are loaded

      const collection = db.transactions.orderBy('date').reverse();

      const result = await collection.filter(t => {
        // Type filter
        if (filters.type !== 'all' && t.type !== filters.type) return false;
        
        // Account filter
        if (filters.accountId !== 'all' && Number(t.accountId) !== Number(filters.accountId)) return false;
        
        // Category filter
        if (filters.categoryId !== 'all') {
          const catId = Number(t.categoryId);
          const selectedId = Number(filters.categoryId);
          const category = categories.find(c => Number(c.id) === catId);
          const isMatch = catId === selectedId || Number(category?.parentId) === selectedId;
          if (!isMatch) return false;
        }
        
        // Date filter
        const tDate = new Date(t.date);
        const now = new Date();
        if (filters.dateRange === 'month') {
          if (tDate.getMonth() !== now.getMonth() || tDate.getFullYear() !== now.getFullYear()) return false;
        } else if (filters.dateRange === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          if (tDate < weekAgo) return false;
        } else if (filters.dateRange === 'year') {
          if (tDate.getFullYear() !== now.getFullYear()) return false;
        } else if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          if (tDate < start || tDate > end) return false;
        }

        // Search filter
        if (filters.searchTerm) {
          const search = filters.searchTerm.toLowerCase();
          const matchesTitle = t.title.toLowerCase().includes(search);
          const matchesNote = t.note?.toLowerCase().includes(search);
          if (!matchesTitle && !matchesNote) return false;
        }

        return true;
      }).limit(limit).toArray();
      
      // Dexie limits cursors, but we should double check sort since we reversed on date
      return result.sort((a, b) => b.date.getTime() - a.date.getTime() || (Number(b.id) - Number(a.id)));
    },
    [filters, categories, limit],
    []
  );

  const getCategory = (id: string | number) => categories?.find(c => String(c.id) === String(id));
  const getAccount = (id: string | number) => accounts?.find(a => String(a.id) === String(id));

  // Group by specific date
  const groupedTransactions = useMemo(() => {
    const groups: { date: string; items: Transaction[] }[] = [];
    filteredTransactions.forEach(t => {
      const dateObj = new Date(t.date);
      // Format: dd MMM yyyy
      const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateStr) {
        lastGroup.items.push(t);
      } else {
        groups.push({ date: dateStr, items: [t] });
      }
    });
    return groups;
  }, [filteredTransactions]);

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between px-1 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Transactions</h1>
        
        <FilterSection 
          filters={filters}
          onFilterChange={setFilters}
          accounts={accounts || []}
          categories={categories || []}
          showSearch={true}
          className="space-y-0"
        />
      </div>

        <div className="space-y-8">
          {groupedTransactions.map((group) => (
            <div key={group.date} className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{group.date}</h3>
            <div className="space-y-3">
                {group.items.map((t) => {
                  const cat = getCategory(t.categoryId);
                  const pCat = cat?.parentId ? getCategory(cat.parentId) : undefined;
                  return (
                    <TransactionItem 
                      key={t.id} 
                      transaction={t} 
                      category={cat}
                      parentCategory={pCat}
                      account={getAccount(t.accountId)}
                      currency={settings?.currency}
                      showDate={false}
                    />
                  );
                })}
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

        {filteredTransactions.length >= limit && (
          <div className="flex justify-center pt-4 pb-8">
            <button
              onClick={() => setLimit(l => l + 50)}
              className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold text-sm tracking-tight rounded-2xl shadow-sm active:scale-95 transition-transform"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
