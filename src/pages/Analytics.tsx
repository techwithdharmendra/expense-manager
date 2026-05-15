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

type TabType = 'expenses' | 'income' | 'combined';

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'expenses';
  const initialAccountId = searchParams.get('accountId') || 'all';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>(initialAccountId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');
  const [dateRange, setDateRange] = useState<'month' | 'week' | 'year' | 'all' | 'custom'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get(1));

  useEffect(() => {
    setActiveTab(initialTab);
    setSelectedAccountId(initialAccountId);
  }, [initialTab, initialAccountId]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchType = activeTab === 'combined' ? true : (activeTab === 'expenses' ? 'expense' : 'income') === t.type;
      const matchAccount = selectedAccountId === 'all' || Number(t.accountId) === Number(selectedAccountId);
      const matchCategory = selectedCategoryId === 'all' || 
                           Number(t.categoryId) === Number(selectedCategoryId) ||
                           Number(categories.find(c => Number(c.id) === Number(t.categoryId))?.parentId) === Number(selectedCategoryId);
      
      let matchDate = true;
      const now = new Date();
      const tDate = new Date(t.date);

      if (dateRange === 'month') {
        matchDate = tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      } else if (dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchDate = tDate >= weekAgo;
      } else if (dateRange === 'year') {
        matchDate = tDate.getFullYear() === now.getFullYear();
      } else if (dateRange === 'custom') {
        if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchDate = tDate >= start && tDate <= end;
        }
      }

      return matchType && matchAccount && matchCategory && matchDate;
    });
  }, [transactions, activeTab, selectedAccountId, selectedCategoryId, dateRange, categories]);

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
    const stats: { [key: string]: { amount: number, color: string, name: string, type: string } } = {};
    filteredTransactions.forEach(t => {
      const cat = categories.find(c => String(c.id) === String(t.categoryId));
      const catId = cat?.id?.toString() || 'unknown';
      if (!stats[catId]) {
        stats[catId] = { 
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
  const totalAmount = activeTab === 'combined' ? (totalIncome - totalExpense) : (activeTab === 'expenses' ? totalExpense : totalIncome);

  const getCategory = (id: string | number) => categories?.find(c => String(c.id) === String(id));
  const getAccount = (id: string | number) => accounts?.find(a => String(a.id) === String(id));

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col space-y-4 px-1">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
        <div className="flex p-1 bg-gray-100 rounded-2xl w-full">
           <button 
            onClick={() => setActiveTab('expenses')}
            className={cn("flex-1 py-2 text-[10px] font-bold uppercase rounded-xl transition-all", activeTab === 'expenses' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500")}
           >
             Expenses
           </button>
           <button 
            onClick={() => setActiveTab('income')}
            className={cn("flex-1 py-2 text-[10px] font-bold uppercase rounded-xl transition-all", activeTab === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500")}
           >
             Income
           </button>
           <button 
            onClick={() => setActiveTab('combined')}
            className={cn("flex-1 py-2 text-[10px] font-bold uppercase rounded-xl transition-all", activeTab === 'combined' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}
           >
             Total
           </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 space-y-4">
         <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <Filter className="w-3 h-3" />
            <span>Refine Report</span>
         </div>
         <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
               <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">By Account</label>
               <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <select 
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-700 appearance-none focus:outline-none ring-1 ring-transparent focus:ring-indigo-100"
                  >
                    <option value="all">All Wallets</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
               </div>
            </div>
            <div className="space-y-1.5 col-span-2">
               <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Period</label>
               <select 
                  value={dateRange}
                  onChange={e => setDateRange(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-700 appearance-none focus:outline-none ring-1 ring-transparent focus:ring-indigo-100"
                >
                  <option value="month">This Month</option>
                  <option value="week">Past Week</option>
                  <option value="year">Full Year</option>
                  <option value="custom">Custom Range</option>
                  <option value="all">Always</option>
                </select>
            </div>
            {dateRange === 'custom' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-gray-50"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">From</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-700 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">To</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-700 focus:outline-none"
                  />
                </div>
              </motion.div>
            )}
         </div>
      </div>

      {/* Summary Highlight */}
      <div className={cn(
        "rounded-[2rem] p-8 shadow-xl relative overflow-hidden transition-colors duration-500",
        activeTab === 'expenses' ? "bg-indigo-600 shadow-indigo-100" : 
        activeTab === 'income' ? "bg-emerald-600 shadow-emerald-100" :
        "bg-gray-900 shadow-gray-200"
      )}>
         <div className="relative z-10 text-white">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] mb-2">
              {activeTab === 'combined' ? 'Net Cashflow' : (activeTab === 'expenses' ? 'Total Spending' : 'Total Earnings')}
            </p>
            <h2 className="text-4xl font-bold tracking-tight">
              {formatCurrency(totalAmount, settings?.currency)}
            </h2>
            
            <div className="flex gap-4 mt-8">
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center space-x-1.5 mb-1">
                  <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                  <span className="text-[8px] font-bold text-white/60 uppercase">Income</span>
                </div>
                <p className="text-sm font-bold">{formatCurrency(totalIncome, settings?.currency)}</p>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center space-x-1.5 mb-1">
                  <ArrowUpRight className="w-3 h-3 text-rose-400" />
                  <span className="text-[8px] font-bold text-white/60 uppercase">Expense</span>
                </div>
                <p className="text-sm font-bold">{formatCurrency(totalExpense, settings?.currency)}</p>
              </div>
            </div>
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-2xl" />
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50">
        <div className="flex items-center justify-between mb-8 px-1">
           <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">
             {activeTab === 'combined' ? 'Cashflow History' : 'Activity Trends'}
           </h3>
           <div className="flex items-center space-x-4">
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
               {activeTab === 'combined' ? (
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
               ) : (
                 <AreaChart data={trendData}>
                   <defs>
                     <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                       <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15}/>
                       <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
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
                   { (activeTab === 'income' || activeTab === 'combined') && (
                     <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                   )}
                   { (activeTab === 'expenses' || activeTab === 'combined') && (
                     <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                   )}
                 </AreaChart>
               )}
             </ResponsiveContainer>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-300">
               <p className="text-xs font-bold uppercase tracking-widest">No Trend Data</p>
             </div>
           )}
        </div>
      </div>

      {/* Breakdown List */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Detailed Breakdown</h3>
        
        {activeTab !== 'combined' && catStats.length > 0 && (
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 flex flex-col items-center">
             <div className="relative h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
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
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activeTab === 'expenses' ? 'Spent' : 'Earned'}</p>
                   <p className={cn("text-xl font-bold leading-tight", activeTab === 'expenses' ? "text-rose-500" : "text-emerald-500")}>
                     {formatCurrency(totalAmount, settings?.currency)}
                   </p>
                </div>
             </div>
          </div>
        )}

        <div className="space-y-3">
          {catStats.length > 0 ? catStats.map((stat, i) => (
             <div key={i} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 flex items-center justify-between group">
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
                   <p className="font-bold text-sm text-gray-900">{formatCurrency(stat.amount, settings?.currency)}</p>
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
      </div>

      {/* Filtered Transactions List */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Transactions in this period</h3>
        <div className="space-y-3">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.sort((a,b) => b.date.getTime() - a.date.getTime()).map(t => (
              <TransactionItem 
                key={t.id}
                transaction={t}
                category={getCategory(t.categoryId)}
                account={getAccount(t.accountId)}
                currency={settings?.currency}
              />
            ))
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

