
import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, cn, formatDate } from '../lib/utils';
import { getMonthCycleStartEnd, isSameMonthCycle, formatYMD } from '../lib/dateUtils';
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
  Image as ImageIcon,
  Calendar,
  ChevronLeft,
  Sigma
} from 'lucide-react';
import { Transaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TransactionItem from '../components/TransactionItem';
import FilterSection, { FilterState } from '../components/FilterSection';
import { filterStore } from '../lib/filterStore';
import { t } from '../lib/i18n';

export default function Transactions() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>(() => filterStore.getState());
  const [selectedMonthDate, setSelectedMonthDate] = useState(() => new Date());

  const settings = useLiveQuery(() => db.settings.get(1));
  const lang = settings?.language;
  const startDay = settings?.monthStartDate || 1;

  const handlePrevMonth = () => {
    setSelectedMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      const { start, end } = getMonthCycleStartEnd(d, startDay);
      
      const newFilters = {
        ...filters,
        dateRange: 'custom' as const,
        startDate: formatYMD(start),
        endDate: formatYMD(end)
      };
      setFilters(newFilters);
      return d;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      const { start, end } = getMonthCycleStartEnd(d, startDay);
      
      const newFilters = {
        ...filters,
        dateRange: 'custom' as const,
        startDate: formatYMD(start),
        endDate: formatYMD(end)
      };
      setFilters(newFilters);
      return d;
    });
  };

  // Sync with global store when filters change
  useEffect(() => {
    filterStore.setState(filters);
  }, [filters]);

  const isCustomMonth = useMemo(() => {
    if (filters.dateRange !== 'custom' || !filters.startDate || !filters.endDate) return false;
    const start = new Date(filters.startDate + 'T00:00:00');
    const end = new Date(filters.endDate + 'T00:00:00');
    
    // Use the reference date from the start
    const cycle = getMonthCycleStartEnd(start, startDay);
    return formatYMD(start) === formatYMD(cycle.start) && formatYMD(end) === formatYMD(cycle.end);
  }, [filters.dateRange, filters.startDate, filters.endDate, startDay]);

  useEffect(() => {
    if (filters.dateRange === 'month') {
      const now = new Date();
      if (!isSameMonthCycle(now, selectedMonthDate, startDay)) {
        setSelectedMonthDate(now);
      }
    }
  }, [filters.dateRange, selectedMonthDate, startDay]);

  // Sync selectedMonthDate when custom month is set from filters drawer
  useEffect(() => {
    if (isCustomMonth && filters.startDate) {
      const d = new Date(filters.startDate + 'T00:00:00');
      if (!isSameMonthCycle(d, selectedMonthDate, startDay)) {
        setSelectedMonthDate(d);
      }
    }
  }, [isCustomMonth, filters.startDate, selectedMonthDate, startDay]);

  const [limit, setLimit] = useState(50);

  const categoriesLive = useLiveQuery(() => db.categories.toArray());
  const accountsLive = useLiveQuery(() => db.accounts.toArray());

  const categories = useMemo(() => {
    return categoriesLive ? [...categoriesLive].sort((a,b) => (a.order || 0) - (b.order || 0)) : undefined;
  }, [categoriesLive]);

  const accounts = useMemo(() => {
    return accountsLive ? [...accountsLive].sort((a,b) => (a.order || 0) - (b.order || 0)) : undefined;
  }, [accountsLive]);

  const filteredTransactions = useLiveQuery(
    async () => {
      if (!categories) return [];

      let collection;
      let isDateIndexed = false;

      // Optimize: Only fetch current month if viewing month or custom month
      if (filters.dateRange === 'month' || (filters.dateRange === 'custom' && filters.startDate && filters.endDate)) {
        let start, end;
        if (filters.dateRange === 'month') {
          const cycle = getMonthCycleStartEnd(selectedMonthDate, startDay);
          start = cycle.start;
          end = cycle.end;
        } else {
          start = new Date(filters.startDate + 'T00:00:00');
          end = new Date(filters.endDate + 'T23:59:59');
        }
        collection = db.transactions.where('date').between(start, end, true, true).reverse();
        isDateIndexed = true;
      } else {
        collection = db.transactions.orderBy('date').reverse();
      }

      const result = await collection.filter(t => {
        // Type filter
        if (filters.type !== 'all' && t.type !== filters.type) return false;
        
        // Account filter
        if (filters.accountId.length > 0) {
          const accMatch = filters.accountId.includes(String(t.accountId)) || 
                          (t.type === 'transfer' && filters.accountId.includes(String(t.toAccountId)));
          if (!accMatch) return false;
        }
        
        // Category filter
        if (filters.categoryId.length > 0) {
          const catId = Number(t.categoryId);
          const category = categories.find(c => Number(c.id) === catId);
          const isMatch = filters.categoryId.includes(String(catId)) || (category?.parentId !== undefined && filters.categoryId.includes(String(category.parentId)));
          if (!isMatch) return false;
        }
        
        // Date filter (already handled by between if isDateIndexed is true)
        if (!isDateIndexed) {
          const tDate = new Date(t.date);
          const now = new Date();
          if (filters.dateRange === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            if (tDate < weekAgo) return false;
          } else if (filters.dateRange === 'year') {
            if (tDate.getFullYear() !== now.getFullYear()) return false;
          }
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
      
      return result;
    },
    [filters, categories, limit, selectedMonthDate, startDay],
    []
  );

  const getCategory = (id: string | number) => categories?.find(c => String(c.id) === String(id));
  const getAccount = (id: string | number) => accounts?.find(a => String(a.id) === String(id));

  // Group by specific date
  const groupedTransactions = useMemo(() => {
    const groups: { date: string; items: Transaction[] }[] = [];
    filteredTransactions.forEach(t => {
      const dateObj = new Date(t.date);
      // Use user-defined format for grouping header
      const dateStr = formatDate(dateObj, settings);
      
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateStr) {
        lastGroup.items.push(t);
      } else {
        groups.push({ date: dateStr, items: [t] });
      }
    });
    return groups;
  }, [filteredTransactions]);

  const monthTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  return (
    <div className="space-y-6 pb-6">
      <div className="mb-4 space-y-4">
        <div className="flex items-center justify-between px-1">
          {/* Left side: Calendar + Month or simply Transactions */}
          {(filters.dateRange === 'month' || isCustomMonth) ? (
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-800" strokeWidth={2.5} />
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                {selectedMonthDate.toLocaleString(lang || 'default', { month: 'long', year: 'numeric' })}
              </h1>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('transactions', lang)}</h1>
          )}
          
          {/* Right side: arrows and filter */}
          <div className="flex items-center">
            {(filters.dateRange === 'month' || isCustomMonth) && (
              <div className="flex items-center space-x-0.5 mr-2">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
            <FilterSection 
              filters={filters}
              onFilterChange={setFilters}
              accounts={accounts || []}
              categories={categories || []}
              showSearch={true}
              className="space-y-0"
            />
          </div>
        </div>

        {(filters.dateRange === 'month' || isCustomMonth) && (
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="text-emerald-500 font-medium tracking-tight">
              {formatCurrency(monthTotals.income, settings)}
            </div>
            <div className="text-rose-500 font-medium tracking-tight">
              {formatCurrency(monthTotals.expense, settings)}
            </div>
            <div className={cn(
              "font-medium tracking-tight flex items-center space-x-0.5",
              monthTotals.balance >= 0 ? "text-emerald-500" : "text-rose-500"
            )}>
              <Sigma className="w-4 h-4" />
              <span>
                {settings?.showSignSymbol !== false && (monthTotals.balance >= 0 ? '+' : '-')}{formatCurrency(Math.abs(monthTotals.balance), settings)}
              </span>
            </div>
          </div>
        )}
      </div>

        <div className="space-y-6">
          {groupedTransactions.map((group) => {
            const dayIncome = group.items.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0);
            const dayExpense = group.items.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);
            const dayBalance = dayIncome - dayExpense;

            return (
              <div key={group.date} className="space-y-2">
              <div className="flex items-center justify-between px-1 py-1 border-b border-gray-100 pb-2">
                <div className="flex flex-col">
                  <h3 className="text-[13px] font-bold text-gray-800 tracking-tight">{group.date}</h3>
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">{new Date(group.items[0].date).toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-GB', { weekday: 'long' })}</span>
                </div>
                <div className={cn("flex items-center space-x-0.5 font-bold text-base tracking-tight", dayBalance < 0 ? "text-rose-500" : "text-emerald-500")}>
                  <Sigma className="w-4 h-4" />
                  <span>
                    {settings?.showSignSymbol !== false && (dayBalance >= 0 ? '+' : '-')}{formatCurrency(Math.abs(dayBalance), settings)}
                  </span>
                </div>
              </div>
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
                        toAccount={t.toAccountId ? getAccount(t.toAccountId) : undefined}
                        settings={settings}
                        showDate={false}
                      />
                    );
                  })}
              </div>
            </div>
            );
          })}

        {filteredTransactions.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
               <HistoryIcon className="w-8 h-8" />
            </div>
            <p className="text-gray-500 font-medium tracking-tight">{t('noTransactionsMain', lang)}</p>
            <p className="text-xs text-gray-400 mt-1">{t('noTransactionsSub', lang)}</p>
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
