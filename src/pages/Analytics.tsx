import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, cn } from '../lib/utils';
import { getMonthCycleStartEnd, isSameMonthCycle, formatYMD } from '../lib/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Filter,
  Wallet,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';
import TransactionItem from '../components/TransactionItem';
import FilterSection, { FilterState } from '../components/FilterSection';
import { filterStore } from '../lib/filterStore';
import { t } from '../lib/i18n';

type TabType = 'expenses' | 'income' | 'combined';

export default function Analytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'combined';
  const initialAccountId = useMemo(() => searchParams.getAll('accountId'), [searchParams]);
  const initialCategoryId = useMemo(() => searchParams.getAll('categoryId'), [searchParams]);

  const [filters, setFilters] = useState<FilterState>(() => {
    const saved = filterStore.getState();
    const hasParams = searchParams.has('tab') || searchParams.has('accountId') || searchParams.has('categoryId');
    
    if (hasParams) {
      return {
        ...saved,
        type: initialTab === 'combined' ? 'all' : (initialTab === 'expenses' ? 'expense' : 'income'),
        accountId: initialAccountId,
        categoryId: initialCategoryId,
      };
    }
    
    if (saved.type === 'transfer') {
      return { ...saved, type: 'all' };
    }
    return saved;
  });

  const [trendView, setTrendView] = useState<'line' | 'bar'>('line');
  const [compositionView, setCompositionView] = useState<'pie' | 'bar'>('pie');
  const [selectedDetailedCategory, setSelectedDetailedCategory] = useState<any>(null);
  const [selectedMonthDate, setSelectedMonthDate] = useState(() => new Date());
  
  const settings = useLiveQuery(() => db.settings.get(1));
  const lang = settings?.language;
  const isDark = settings?.isDarkMode;
  const tooltipStyle = { 
    borderRadius: '16px', 
    border: 'none', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
    backgroundColor: isDark ? '#0d1117' : '#ffffff', 
    color: isDark ? '#f9fafb' : '#111827'
  };
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

  const isCustomMonth = useMemo(() => {
    if (filters.dateRange !== 'custom' || !filters.startDate || !filters.endDate) return false;
    const start = new Date(filters.startDate + 'T00:00:00');
    const end = new Date(filters.endDate + 'T00:00:00');
    
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
      // to avoid infinite loops, check if it's different month/year
      if (!isSameMonthCycle(d, selectedMonthDate, startDay)) {
        setSelectedMonthDate(d);
      }
    }
  }, [isCustomMonth, filters.startDate, selectedMonthDate, startDay]);

  const [limit, setLimit] = useState(50); // Optional limit for list rendering, though charts require all data

  const categoriesLive = useLiveQuery(() => db.categories.toArray()) || [];
  const accountsLive = useLiveQuery(() => db.accounts.toArray()) || [];

  const categories = useMemo(() => {
    return [...categoriesLive].sort((a,b) => (a.order || 0) - (b.order || 0));
  }, [categoriesLive]);

  const accounts = useMemo(() => {
    return [...accountsLive].sort((a,b) => (a.order || 0) - (b.order || 0));
  }, [accountsLive]);

  useEffect(() => {
    filterStore.setState(filters);
  }, [filters]);

  useEffect(() => {
    const hasParams = searchParams.has('tab') || searchParams.has('accountId') || searchParams.has('categoryId');
    if (hasParams) {
      setFilters(prev => {
        // Compare to avoid infinite updates if they are already the same
        const newType = initialTab === 'combined' ? 'all' : (initialTab === 'expenses' ? 'expense' : 'income');
        
        const accountsMatch = prev.accountId.length === initialAccountId.length && prev.accountId.every((v, i) => v === initialAccountId[i]);
        const categoriesMatch = prev.categoryId.length === initialCategoryId.length && prev.categoryId.every((v, i) => v === initialCategoryId[i]);
        
        if (prev.type === newType && accountsMatch && categoriesMatch) {
          return prev;
        }
        
        return {
          ...prev,
          type: newType,
          accountId: initialAccountId,
          categoryId: initialCategoryId
        };
      });
    }
  }, [searchParams, initialTab, initialAccountId, initialCategoryId]);

  const filteredTransactions = useLiveQuery(async () => {
    let collection;
    let isDateIndexed = false;

    // Optimize: Prioritize date range filtering using index
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
      const matchType = filters.type === 'all' ? true : filters.type === t.type;
      const matchAccount = filters.accountId.length === 0 || 
                           filters.accountId.includes(String(t.accountId)) ||
                           (t.type === 'transfer' && filters.accountId.includes(String(t.toAccountId)));
      const matchCategory = filters.categoryId.length === 0 || 
                           filters.categoryId.includes(String(t.categoryId)) ||
                           (t.categoryId && categories.find(c => Number(c.id) === Number(t.categoryId))?.parentId !== undefined && filters.categoryId.includes(String(categories.find(c => Number(c.id) === Number(t.categoryId))?.parentId))) ||
                           (t.type === 'transfer');
      
      const matchSearch = !filters.searchTerm || 
                         t.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                         (t.note && t.note.toLowerCase().includes(filters.searchTerm.toLowerCase()));

      let matchDate = true;
      if (!isDateIndexed) {
        const tDate = new Date(t.date);
        if (filters.dateRange === 'week') {
          const now = new Date();
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          matchDate = tDate >= weekAgo;
        } else if (filters.dateRange === 'year') {
          const now = new Date();
          matchDate = tDate.getFullYear() === now.getFullYear();
        }
      }

      return matchType && matchAccount && matchCategory && matchDate && !!matchSearch;
    }).toArray();
    
    return result;
  }, [filters, categories, selectedMonthDate, startDay], []);

  const trendData = useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    
    const groups: { [key: string]: { date: string, income: number, expense: number } } = {};
    
    filteredTransactions.forEach(t => {
      const tDate = new Date(t.date);
      const dateKey = tDate.toISOString().split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = { 
          date: tDate.toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-GB', { day: 'numeric', month: 'short' }), 
          income: 0, 
          expense: 0 
        };
      }
      if (t.type === 'income') groups[dateKey].income = Math.round((groups[dateKey].income + t.amount) * 100) / 100;
      else groups[dateKey].expense = Math.round((groups[dateKey].expense + t.amount) * 100) / 100;
    });

    return Object.values(groups).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTransactions, lang]);

  const catStats = useMemo(() => {
    const stats: { [key: string]: { id: string | string[], amount: number, color: string, name: string, type: string, subcategories: any[] } } = {};
    filteredTransactions.filter(tx => tx.type !== 'transfer').forEach(tx => {
      let cat = categories.find(c => String(c.id) === String(tx.categoryId));
      
      let mainCat = cat;
      if (cat && cat.parentId) {
         mainCat = categories.find(c => String(c.id) === String(cat!.parentId)) || cat;
      }
      
      let catId = mainCat?.id?.toString() || 'unknown';
      let statKey = catId;
      
      if (filters.type === 'all' && mainCat?.name === 'Cashbook') {
         statKey = 'merged_cashbook';
      }

      if (!stats[statKey]) {
        stats[statKey] = { 
          id: statKey === 'merged_cashbook' ? [catId] : catId,
          amount: 0, 
          color: mainCat?.color || '#cbd5e1', 
          name: mainCat?.name || (t('unknown', lang) || 'Unknown'),
          type: statKey === 'merged_cashbook' ? 'cashbook' : tx.type,
          subcategories: []
        };
      } else if (statKey === 'merged_cashbook' && Array.isArray(stats[statKey].id) && !stats[statKey].id.includes(catId)) {
        (stats[statKey].id as string[]).push(catId);
      }

      stats[statKey].amount += tx.amount;
      
      // Track subcategory breakdown
      const trackingCat = (cat && cat.id !== mainCat?.id) ? cat : mainCat;
      if (trackingCat) {
         let subCatStat = stats[statKey].subcategories.find(sc => sc.id === trackingCat.id);
         if (!subCatStat) {
             subCatStat = { id: trackingCat.id, name: trackingCat.name, amount: 0, color: trackingCat.color, icon: trackingCat.icon };
             stats[statKey].subcategories.push(subCatStat);
         }
         subCatStat.amount += tx.amount;
      }
    });
    const result = Object.values(stats).sort((a, b) => b.amount - a.amount);
    result.forEach(stat => {
        stat.subcategories.sort((a, b) => b.amount - a.amount);
    });
    return result;
  }, [filteredTransactions, categories, lang, filters.type]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => Math.round((s + t.amount) * 100) / 100, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => Math.round((s + t.amount) * 100) / 100, 0);
  const totalTransfer = filteredTransactions.filter(t => t.type === 'transfer').reduce((s, t) => Math.round((s + t.amount) * 100) / 100, 0);
  const totalAmount = filters.type === 'all' ? Math.round((totalIncome - totalExpense) * 100) / 100 : 
                      (filters.type === 'expense' ? totalExpense : 
                      (filters.type === 'income' ? totalIncome : totalTransfer));

  const averages = useMemo(() => {
    if (!filteredTransactions || filteredTransactions.length === 0) return null;
    
    let minDate = filteredTransactions[0].date.getTime();
    let maxDate = filteredTransactions[0].date.getTime();

    filteredTransactions.forEach(t => {
      const time = t.date.getTime();
      if (time < minDate) minDate = time;
      if (time > maxDate) maxDate = time;
    });

    const spanDays = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);
    const spanWeeks = Math.max(1, spanDays / 7.0);
    const spanMonths = Math.max(1, spanDays / 30.436875);
    const spanYears = Math.max(1, spanDays / 365.2425);

    return {
      daily: { income: totalIncome / spanDays, expense: totalExpense / spanDays },
      weekly: { income: totalIncome / spanWeeks, expense: totalExpense / spanWeeks },
      monthly: { income: totalIncome / spanMonths, expense: totalExpense / spanMonths },
      yearly: { income: totalIncome / spanYears, expense: totalExpense / spanYears }
    };
  }, [filteredTransactions, totalIncome, totalExpense]);

  const periodLabel = useMemo(() => {
    if (filters.dateRange === 'month') {
      return selectedMonthDate.toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-GB', { month: 'long', year: 'numeric' });
    } else if (filters.dateRange === 'week') {
      return t('thisWeek', lang) || 'This Week';
    } else if (filters.dateRange === 'year') {
      return new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-GB', { year: 'numeric' });
    } else if (filters.dateRange === 'custom') {
      if (filters.startDate && filters.endDate) {
         return `${new Date(filters.startDate + 'T00:00:00').toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-GB', { month: 'short', day: 'numeric' })} - ${new Date(filters.endDate + 'T00:00:00').toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return t('customRange', lang) || 'Custom Range';
    }
    return t('allTime', lang) || 'All Time';
  }, [filters.dateRange, filters.startDate, filters.endDate, selectedMonthDate, lang]);

  const getCategory = (id: string | number) => categories?.find(c => String(c.id) === String(id));
  const getAccount = (id: string | number) => accounts?.find(a => String(a.id) === String(id));

  return (
    <div className="space-y-6 pb-6">
      <div className="mb-4 space-y-4">
        <div className="flex items-center justify-between px-1">
          {/* Left side: Calendar + Month or simply Analytics */}
          {(filters.dateRange === 'month' || isCustomMonth) ? (
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-800" strokeWidth={2.5} />
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                {selectedMonthDate.toLocaleString(lang || 'default', { month: 'long', year: 'numeric' })}
              </h1>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('analytics', lang) || 'Analytics'}</h1>
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
              accounts={accounts}
              categories={categories}
              showTypeFilter={true}
              excludeTransfer={true}
              className="space-y-0"
            />
          </div>
        </div>
      </div>

      {/* Summary Highlight - Updated to match Dashboard light theme */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full -mr-12 -mt-12 blur-2xl" />
         
         <div className="relative z-10 text-gray-900">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                    {filters.type === 'all' ? (t('netCashflow', lang) || 'Net Cashflow') : 
                     (filters.type === 'expense' ? (t('totalSpending', lang) || 'Total Spending') : 
                     (filters.type === 'income' ? (t('totalEarnings', lang) || 'Total Earnings') : (t('totalTransfers', lang) || 'Total Transfers')))}
                  </p>
                  <h2 className={cn(
                    "text-2xl font-bold tracking-tight",
                    (filters.type === 'expense' || (filters.type === 'all' && totalAmount < 0)) ? "text-rose-500" : 
                    (filters.type === 'transfer' ? "text-blue-500" : "text-emerald-500")
                  )}>
                    {formatCurrency(totalAmount, settings)}
                  </h2>
               </div>
               <div className={cn(
                 "w-9 h-9 rounded-2xl flex items-center justify-center border",
                 filters.type === 'expense' ? "bg-indigo-50 border-indigo-100/50 text-indigo-600" : 
                 filters.type === 'income' ? "bg-emerald-50 border-emerald-100/50 text-emerald-600" :
                 filters.type === 'transfer' ? "bg-blue-50 border-blue-100/50 text-blue-600" :
                 "bg-gray-50 border-gray-100 text-gray-600"
               )}>
                  <Wallet className="w-4 h-4" />
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 group transition-transform">
                <div className="w-1.5 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">{t('income', lang) || 'Income'}</p>
                  <p className="font-bold text-sm text-emerald-500 truncate">{settings?.showSignSymbol !== false ? '+' : ''}{formatCurrency(totalIncome, settings)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 group transition-transform">
                <div className="w-1.5 h-6 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">{t('expense', lang) || 'Expense'}</p>
                  <p className="font-bold text-sm text-rose-500 truncate">{settings?.showSignSymbol !== false ? '-' : ''}{formatCurrency(totalExpense, settings)}</p>
                </div>
              </div>
            </div>
         </div>
      </div>

      {/* Trend Chart */}
      {filters.type === 'all' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
          <div className="flex flex-col space-y-4 mb-8 px-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                {t('cashflowHistory', lang) || 'Cashflow History'}
              </h3>
              <div className="flex bg-gray-50 p-1 rounded-xl">
                 <button 
                  onClick={() => setTrendView('line')}
                  className={cn("px-3 py-1.5 text-[8px] font-bold uppercase rounded-lg transition-all", trendView === 'line' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}
                 >
                   {t('lines', lang) || 'Lines'}
                 </button>
                 <button 
                  onClick={() => setTrendView('bar')}
                  className={cn("px-3 py-1.5 text-[8px] font-bold uppercase rounded-lg transition-all", trendView === 'bar' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}
                 >
                   {t('bars', lang) || 'Bars'}
                 </button>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-4">
                <div className="flex items-center space-x-1">
                   <div className="w-2 h-2 rounded-full bg-emerald-400" />
                   <span className="text-[8px] font-bold text-gray-400 uppercase">{t('in', lang) || 'In'}</span>
                </div>
                <div className="flex items-center space-x-1">
                   <div className="w-2 h-2 rounded-full bg-rose-400" />
                   <span className="text-[8px] font-bold text-gray-400 uppercase">{t('out', lang) || 'Out'}</span>
                </div>
            </div>
          </div>
          <div className="h-64 w-full">
             {trendData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 {trendView === 'bar' ? (
                   <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} 
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={tooltipStyle} itemStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      />
                      <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 ) : (
                   <LineChart data={trendData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} 
                     />
                     <YAxis hide />
                     <Tooltip 
                       contentStyle={tooltipStyle} itemStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                     />
                     <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                     <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                   </LineChart>
                 )}
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-gray-300">
                 <p className="text-xs font-bold uppercase tracking-widest">No Trend Data</p>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Breakdown List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('detailedBreakdown', lang) || 'Detailed Breakdown'}</h3>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setCompositionView('pie')}
              className={cn("px-2 py-1 text-[8px] font-bold uppercase rounded-md transition-all", compositionView === 'pie' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}
            >
              Donut
            </button>
            <button 
              onClick={() => setCompositionView('bar')}
              className={cn("px-2 py-1 text-[8px] font-bold uppercase rounded-md transition-all", compositionView === 'bar' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}
            >
              Ranks
            </button>
          </div>
        </div>
        
        {catStats.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 flex flex-col items-center">
             <div className="relative h-64 w-full">
                {compositionView === 'pie' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filters.type === 'expense' ? (t('spent', lang) || 'Spent') : (filters.type === 'income' ? (t('earned', lang) || 'Earned') : (t('balance', lang) || 'Balance'))}</p>
                     <p className={cn(
                       "text-xl font-bold leading-tight", 
                       (filters.type === 'expense' || (filters.type === 'all' && (totalIncome - totalExpense) < 0)) ? "text-rose-500" : "text-emerald-500"
                     )}>
                       {settings?.showSignSymbol !== false && filters.type === 'expense' && '-' }
                       {settings?.showSignSymbol !== false && filters.type === 'income' && '+' }
                       {settings?.showSignSymbol !== false && filters.type === 'all' && (totalIncome - totalExpense >= 0 ? '+' : '-')}
                       {(filters.type === 'expense' || filters.type === 'income') ? formatCurrency(totalAmount, settings) : formatCurrency(Math.abs(totalIncome - totalExpense), settings)}
                     </p>
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%" className="z-10">
                  {compositionView === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={catStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="amount"
                        label={(props) => {
                          const RADIAN = Math.PI / 180;
                          const { cx, cy, midAngle, outerRadius, fill, name } = props;
                          const radius = outerRadius + 15;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          
                          const startX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
                          const startY = cy + outerRadius * Math.sin(-midAngle * RADIAN);
                          
                          const endX = cx + (outerRadius + 10) * Math.cos(-midAngle * RADIAN);
                          const endY = cy + (outerRadius + 10) * Math.sin(-midAngle * RADIAN);
                          
                          const textX = endX + (x > cx ? 1 : -1) * 5;
                          
                          return (
                            <g>
                              <path d={`M${startX},${startY} L${endX},${endY} L${textX},${endY}`} stroke={fill} fill="none" strokeWidth={2} />
                              <text x={textX + (x > cx ? 2 : -2)} y={endY} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={600}>
                                {name}
                              </text>
                            </g>
                          );
                        }}
                        labelLine={false}
                      >
                        {catStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={tooltipStyle} itemStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                        formatter={(value: number) => formatCurrency(value, settings)}
                      />
                    </PieChart>
                  ) : (
                    <BarChart layout="vertical" data={catStats} margin={{ left: 20, right: 20 }}>
                       <XAxis type="number" hide />
                       <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
                        width={60}
                       />
                       <Tooltip 
                        contentStyle={tooltipStyle} itemStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                        formatter={(value: number) => formatCurrency(value, settings)}
                       />
                       <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                         {catStats.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                       </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
             </div>
          </div>
        )}

        {filters.type !== 'all' && (
          <div className="space-y-3">
            {catStats.length > 0 ? catStats.map((stat, i) => (
               <div 
                key={i} 
                onClick={() => setSelectedDetailedCategory(stat)}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-50 flex items-center justify-between group cursor-pointer transition-all active:scale-95"
               >
                  <div className="flex items-center space-x-4">
                     <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110"
                      style={{ backgroundColor: stat.color }}
                     >
                       <Tag className="w-5 h-5" />
                     </div>
                     <div>
                       <h4 className="font-bold text-sm text-gray-900">{stat.name}</h4>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                         {stat.type} • {((stat.amount / (stat.type === 'income' ? totalIncome : totalExpense)) * 100).toFixed(0)}%
                       </p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className={cn(
                       "font-bold text-sm",
                       stat.type === 'income' ? "text-emerald-500" : "text-rose-500"
                     )}>{formatCurrency(stat.amount, settings)}</p>
                     <div className="w-20 h-1 mt-1.5 bg-gray-50 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: `${(stat.amount / (stat.type === 'income' ? totalIncome : totalExpense)) * 100}%`, 
                            backgroundColor: stat.color 
                          }}
                        />
                     </div>
                  </div>
               </div>
            )) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-100">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No activities found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subcategories Details Modal */}
      <AnimatePresence>
        {selectedDetailedCategory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetailedCategory(null)}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl z-50 overflow-hidden shadow-2xl pb-safe flex flex-col max-h-[85vh] sm:max-w-md sm:mx-auto sm:h-auto border border-gray-100"
            >
              <div className="p-5 pb-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                   <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: selectedDetailedCategory.color }}
                   >
                     <Tag className="w-5 h-5" />
                   </div>
                   <div>
                     <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-none">{selectedDetailedCategory.name}</h2>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{selectedDetailedCategory.type}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedDetailedCategory(null)}
                  className="w-8 h-8 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center active:scale-95 transition-transform"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto">
                <div className="mb-4 flex items-center justify-between pb-4 border-b border-gray-50">
                   <div>
                     <p className="text-sm font-bold text-gray-700 tracking-tight">{selectedDetailedCategory.type === 'income' ? 'Total Income' : 'Total Expense'}</p>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{periodLabel}</p>
                   </div>
                   <div className="text-right">
                     <p className={cn(
                       "text-xl font-bold leading-none tracking-tight",
                       selectedDetailedCategory.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                     )}>
                       {formatCurrency(selectedDetailedCategory.amount, settings)}
                     </p>
                   </div>
                </div>

                {selectedDetailedCategory.subcategories.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{t('subCategories', lang) || 'Subcategories'}</h3>
                    {selectedDetailedCategory.subcategories.map((sub: any, i: number) => (
                      <div key={i} className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs" style={{ backgroundColor: sub.color || selectedDetailedCategory.color }}>
                                <Tag className="w-4 h-4" />
                             </div>
                             <span className="font-bold text-sm text-gray-700">{sub.name}</span>
                           </div>
                           <div className="text-right">
                              <span className="font-bold text-sm text-gray-900">{formatCurrency(sub.amount, settings)}</span>
                              <p className="text-[10px] text-gray-400 font-bold mt-0.5">{((sub.amount / selectedDetailedCategory.amount) * 100).toFixed(0)}%</p>
                           </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${(sub.amount / selectedDetailedCategory.amount) * 100}%`, 
                              backgroundColor: sub.color || selectedDetailedCategory.color 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                   <button 
                     onClick={() => {
                        setFilters(prev => ({ ...prev, categoryId: Array.isArray(selectedDetailedCategory.id) ? selectedDetailedCategory.id.map(String) : [String(selectedDetailedCategory.id)] }));
                        setSelectedDetailedCategory(null);
                     }}
                     className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors active:scale-95"
                   >
                     <BarChart2 className="w-5 h-5" />
                   </button>
                   <button 
                     onClick={() => {
                        filterStore.setState({ ...filters, categoryId: Array.isArray(selectedDetailedCategory.id) ? selectedDetailedCategory.id.map(String) : [String(selectedDetailedCategory.id)] });
                        setSelectedDetailedCategory(null);
                        navigate('/transactions');
                     }}
                     className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors active:scale-95"
                   >
                     <History className="w-5 h-5" />
                   </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Averages Section */}
      {averages && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 flex flex-col space-y-4">
          <div className="mb-1">
             <h3 className="text-xl font-bold text-gray-900 tracking-tight">{t('average', lang) || 'Average'}</h3>
             <p className="text-sm text-gray-500 font-medium mt-0.5">{periodLabel}</p>
          </div>
          
          <div className="space-y-2.5 pt-1">
            {[
              { label: t('day', lang) || 'Day', data: averages.daily },
              { label: t('week', lang) || 'Week', data: averages.weekly }
            ].map((avg, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-base text-gray-600 font-medium">{avg.label}</span>
                <div className="flex space-x-6 text-right font-medium text-base">
                  <span className="text-emerald-500 w-24 truncate" title={formatCurrency(avg.data.income, settings)}>{formatCurrency(avg.data.income, settings)}</span>
                  <span className="text-rose-500 w-24 truncate" title={formatCurrency(avg.data.expense, settings)}>{formatCurrency(avg.data.expense, settings)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtered Transactions List */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('transactionsInPeriod', lang) || 'Transactions in this period'}</h3>
        <div className="space-y-3">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.slice(0, limit).map(t => {
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
                />
              );
            })
          ) : (
            <div className="p-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-100">
               <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No matching transactions</p>
            </div>
          )}

          {filteredTransactions.length > limit && (
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
    </div>
  );
}

