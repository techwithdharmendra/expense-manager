import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Filter,
  Wallet,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  History
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

type TabType = 'expenses' | 'income' | 'combined';

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'combined';
  const initialAccountId = searchParams.get('accountId') || 'all';
  const initialCategoryId = searchParams.get('categoryId') || 'all';

  const [trendView, setTrendView] = useState<'line' | 'bar'>('line');
  const [compositionView, setCompositionView] = useState<'pie' | 'bar'>('pie');

  const [filters, setFilters] = useState<FilterState>({
    type: initialTab === 'combined' ? 'all' : (initialTab as any),
    accountId: initialAccountId,
    categoryId: initialCategoryId,
    dateRange: 'month',
    startDate: '',
    endDate: '',
    searchTerm: ''
  });

  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get(1));

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      type: initialTab === 'combined' ? 'all' : (initialTab as any),
      accountId: initialAccountId,
      categoryId: initialCategoryId
    }));
  }, [initialTab, initialAccountId, initialCategoryId]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchType = filters.type === 'all' ? true : filters.type === t.type;
      const matchAccount = filters.accountId === 'all' || Number(t.accountId) === Number(filters.accountId);
      const matchCategory = filters.categoryId === 'all' || 
                           Number(t.categoryId) === Number(filters.categoryId) ||
                           Number(categories.find(c => Number(c.id) === Number(t.categoryId))?.parentId) === Number(filters.categoryId);
      
      const matchSearch = !filters.searchTerm || 
                         t.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                         t.note?.toLowerCase().includes(filters.searchTerm.toLowerCase());

      let matchDate = true;
      const now = new Date();
      const tDate = new Date(t.date);

      if (filters.dateRange === 'month') {
        matchDate = tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      } else if (filters.dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchDate = tDate >= weekAgo;
      } else if (filters.dateRange === 'year') {
        matchDate = tDate.getFullYear() === now.getFullYear();
      } else if (filters.dateRange === 'custom') {
        if (filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          matchDate = tDate >= start && tDate <= end;
        }
      }

      return matchType && matchAccount && matchCategory && matchDate && matchSearch;
    });
  }, [transactions, filters, categories]);

  const trendData = useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    
    const groups: { [key: string]: { date: string, income: number, expense: number } } = {};
    
    filteredTransactions.forEach(t => {
      const tDate = new Date(t.date);
      const dateKey = tDate.toISOString().split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = { 
          date: tDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), 
          income: 0, 
          expense: 0 
        };
      }
      if (t.type === 'income') groups[dateKey].income += t.amount;
      else groups[dateKey].expense += t.amount;
    });

    return Object.values(groups).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTransactions]);

  const catStats = useMemo(() => {
    const stats: { [key: string]: { id: string, amount: number, color: string, name: string, type: string } } = {};
    filteredTransactions.forEach(t => {
      const cat = categories.find(c => String(c.id) === String(t.categoryId));
      const catId = cat?.id?.toString() || 'unknown';
      if (!stats[catId]) {
        stats[catId] = { 
          id: catId,
          amount: 0, 
          color: cat?.color || '#cbd5e1', 
          name: cat?.name || 'Unknown',
          type: t.type
        };
      }
      stats[catId].amount += t.amount;
    });
    return Object.values(stats).sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categories]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalAmount = filters.type === 'all' ? (totalIncome - totalExpense) : (filters.type === 'expense' ? totalExpense : totalIncome);

  const getCategory = (id: string | number) => categories?.find(c => String(c.id) === String(id));
  const getAccount = (id: string | number) => accounts?.find(a => String(a.id) === String(id));

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between px-1 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
        <FilterSection 
          filters={filters}
          onFilterChange={setFilters}
          accounts={accounts}
          categories={categories}
          showTypeFilter={true}
          className="space-y-0"
        />
      </div>

      {/* Summary Highlight - Updated to match Dashboard light theme */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full -mr-12 -mt-12 blur-2xl" />
         
         <div className="relative z-10 text-gray-900">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                    {filters.type === 'all' ? 'Net Cashflow' : (filters.type === 'expense' ? 'Total Spending' : 'Total Earnings')}
                  </p>
                  <h2 className={cn(
                    "text-2xl font-bold tracking-tight",
                    (filters.type === 'expense' || (filters.type === 'all' && totalAmount < 0)) ? "text-rose-500" : "text-emerald-500"
                  )}>
                    {formatCurrency(totalAmount, settings?.currency)}
                  </h2>
               </div>
               <div className={cn(
                 "w-9 h-9 rounded-2xl flex items-center justify-center border",
                 filters.type === 'expense' ? "bg-indigo-50 border-indigo-100/50 text-indigo-600" : 
                 filters.type === 'income' ? "bg-emerald-50 border-emerald-100/50 text-emerald-600" :
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
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">Income</p>
                  <p className="font-bold text-sm text-emerald-500 truncate">{formatCurrency(totalIncome, settings?.currency)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 group transition-transform">
                <div className="w-1.5 h-6 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">Expense</p>
                  <p className="font-bold text-sm text-rose-500 truncate">{formatCurrency(totalExpense, settings?.currency)}</p>
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
                Cashflow History
              </h3>
              <div className="flex bg-gray-50 p-1 rounded-xl">
                 <button 
                  onClick={() => setTrendView('line')}
                  className={cn("px-3 py-1.5 text-[8px] font-bold uppercase rounded-lg transition-all", trendView === 'line' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}
                 >
                   Lines
                 </button>
                 <button 
                  onClick={() => setTrendView('bar')}
                  className={cn("px-3 py-1.5 text-[8px] font-bold uppercase rounded-lg transition-all", trendView === 'bar' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}
                 >
                   Bars
                 </button>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-4">
                <div className="flex items-center space-x-1">
                   <div className="w-2 h-2 rounded-full bg-emerald-400" />
                   <span className="text-[8px] font-bold text-gray-400 uppercase">In</span>
                </div>
                <div className="flex items-center space-x-1">
                   <div className="w-2 h-2 rounded-full bg-rose-400" />
                   <span className="text-[8px] font-bold text-gray-400 uppercase">Out</span>
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
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
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
                       contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
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
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detailed Breakdown</h3>
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
                <ResponsiveContainer width="100%" height="100%">
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
                      >
                        {catStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => formatCurrency(value, settings?.currency)}
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
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => formatCurrency(value, settings?.currency)}
                       />
                       <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                         {catStats.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                       </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
                {compositionView === 'pie' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filters.type === 'expense' ? 'Spent' : (filters.type === 'income' ? 'Earned' : 'Balance')}</p>
                     <p className={cn(
                       "text-xl font-bold leading-tight", 
                       (filters.type === 'expense' || (filters.type === 'all' && (totalIncome - totalExpense) < 0)) ? "text-rose-500" : "text-emerald-500"
                     )}>
                       {(filters.type === 'expense' || filters.type === 'income') ? formatCurrency(totalAmount, settings?.currency) : formatCurrency(totalIncome - totalExpense, settings?.currency)}
                     </p>
                  </div>
                )}
             </div>
          </div>
        )}

        {filters.type !== 'all' && (
          <div className="space-y-3">
            {catStats.length > 0 ? catStats.map((stat, i) => (
               <div 
                key={i} 
                onClick={() => setFilters(prev => ({ ...prev, categoryId: stat.id }))}
                className={cn(
                  "bg-white rounded-xl p-5 shadow-sm border border-gray-50 flex items-center justify-between group cursor-pointer transition-all active:scale-95",
                  filters.categoryId === stat.id && "ring-2 ring-indigo-500 ring-offset-2"
                )}
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
                     )}>{formatCurrency(stat.amount, settings?.currency)}</p>
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

      {/* Filtered Transactions List */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Transactions in this period</h3>
        <div className="space-y-3">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.sort((a,b) => b.date.getTime() - a.date.getTime() || (Number(b.id) - Number(a.id))).map(t => {
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
                />
              );
            })
          ) : (
            <div className="p-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-100">
               <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No matching transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

