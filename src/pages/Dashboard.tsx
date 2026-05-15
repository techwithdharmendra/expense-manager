
import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Plus,
  TrendingUp,
  CircleCheck,
  ChevronRight,
  ArrowRight,
  PieChart as PieChartIcon,
  BarChart2,
  CreditCard,
  LayoutGrid
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { getIconByName } from '../lib/icons';
import TransactionItem from '../components/TransactionItem';

export default function Dashboard() {
  const navigate = useNavigate();
  const [chartType, setChartType] = useState<'expense' | 'income'>('expense');
  const transactions = useLiveQuery(() => 
    db.transactions.toArray().then(items => 
      items.sort((a, b) => b.date.getTime() - a.date.getTime() || (Number(b.id) - Number(a.id))).slice(0, 10)
    )
  );
  
  const allTransactions = useLiveQuery(() => db.transactions.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const settings = useLiveQuery(() => db.settings.get(1));

  const stats = useMemo(() => {
    if (!allTransactions) return { balance: 0, income: 0, expense: 0, savings: 0 };
    const income = allTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const expense = allTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
    return {
      income,
      expense,
      balance: income - expense,
      savings: income > 0 ? ((income - expense) / income) * 100 : 0
    };
  }, [allTransactions]);

  const accStats = useMemo(() => {
    if (!accounts || !allTransactions) return [];
    return accounts.map(acc => {
      const accTransactions = allTransactions.filter(t => Number(t.accountId) === Number(acc.id));
      const total = accTransactions.reduce((sum, t) => {
        return sum + (t.type === 'income' ? t.amount : -t.amount);
      }, acc.balance);
      return { ...acc, currentBalance: total };
    });
  }, [accounts, allTransactions]);

  const chartData = useMemo(() => {
    if (!allTransactions) return [];
    // Last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return days.map(day => {
      const dayT = allTransactions.filter(t => new Date(t.date).toISOString().split('T')[0] === day);
      return {
        name: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
        expense: dayT.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0),
        income: dayT.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0),
      };
    });
  }, [allTransactions]);

  const getCategory = (id: string | number) => categories?.find(c => String(c.id) === String(id));
  const getAccount = (id: string | number) => accounts?.find(a => String(a.id) === String(id));

  const categoryChartData = useMemo(() => {
    if (!allTransactions || !categories) return [];
    
    const filtered = allTransactions.filter(t => t.type === chartType);
    const stats: { [key: string]: { name: string, value: number, color: string, icon: string, id: string | number } } = {};
    
    filtered.forEach(t => {
      const cat = getCategory(t.categoryId);
      const catName = cat?.name || 'Other';
      const catId = cat?.id || 'unknown';
      if (!stats[catName]) {
        stats[catName] = { 
          name: catName, 
          value: 0, 
          color: cat?.color || '#CBD5E1',
          icon: cat?.icon || 'Tag',
          id: catId
        };
      }
      stats[catName].value += t.amount;
    });
    
    return Object.values(stats).sort((a, b) => b.value - a.value);
  }, [allTransactions, categories, chartType]);

  const totalType = categoryChartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-4 pb-4 px-1">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-0.5">Morning,</p>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">Wallet Tracker</h1>
        </div>
        <div className="flex items-center space-x-1.5">
          <Link to="/settings/accounts" className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors border border-gray-100" title="Accounts">
            <CreditCard className="w-4 h-4" />
          </Link>
          <Link to="/settings/categories" className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors border border-gray-100" title="Categories">
            <LayoutGrid className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Main Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-white rounded-2xl p-5 text-gray-900 overflow-hidden shadow-sm border border-gray-50"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-12 -mt-12 blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">Total Balance</p>
              <h2 className={cn(
                "text-2xl font-bold tracking-tight",
                stats.balance >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {settings?.hideBalance ? '••••••' : formatCurrency(stats.balance, settings?.currency)}
              </h2>
            </div>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
               <Wallet className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Link to="/analytics?tab=income" className="flex items-center space-x-3 group active:scale-95 transition-transform">
              <div className="w-1.5 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">Income</p>
                <p className="font-bold text-sm text-emerald-500 truncate">{formatCurrency(stats.income, settings?.currency)}</p>
              </div>
            </Link>
            <Link to="/analytics?tab=expenses" className="flex items-center space-x-3 group active:scale-95 transition-transform">
              <div className="w-1.5 h-6 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">Expense</p>
                <p className="font-bold text-sm text-rose-500 truncate">{formatCurrency(stats.expense, settings?.currency)}</p>
              </div>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Accounts Section - Updated to match app theme with grid layout */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 space-y-5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Accounts</h3>
          <Link to="/settings/accounts" className="p-1 -mr-1 text-gray-400 hover:text-indigo-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 gap-y-5 gap-x-4">
          {accStats.map(acc => {
            const IconComp = getIconByName(acc.icon);
            return (
              <Link 
                key={acc.id} 
                to={`/analytics?tab=combined&accountId=${acc.id}`}
                className="flex items-center space-x-3 active:scale-95 transition-transform group"
              >
                <div 
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: acc.color }}
                >
                  <IconComp className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase truncate tracking-wider group-hover:text-indigo-600 transition-colors">{acc.name}</h4>
                  <p className={cn(
                    "font-bold text-sm leading-tight",
                    acc.currentBalance >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {formatCurrency(acc.currentBalance, settings?.currency)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>


      {/* Overview Charts */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 space-y-5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category Overview</h3>
          <div className="flex p-0.5 bg-gray-50 rounded-xl">
             <button 
              onClick={() => setChartType('expense')}
              className={cn(
                "px-2.5 py-1 text-[8px] font-bold uppercase rounded-lg transition-all",
                chartType === 'expense' ? "bg-white text-rose-500 shadow-sm" : "text-gray-400"
              )}
             >
               Expense
             </button>
             <button 
              onClick={() => setChartType('income')}
              className={cn(
                "px-2.5 py-1 text-[8px] font-bold uppercase rounded-lg transition-all",
                chartType === 'income' ? "bg-white text-emerald-500 shadow-sm" : "text-gray-400"
              )}
             >
               Income
             </button>
          </div>
        </div>

        <div className="relative h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  formatter={(value: number) => formatCurrency(value, settings?.currency)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{chartType}</p>
               <p className="text-base font-bold text-gray-900 leading-tight">
                 {formatCurrency(totalType, settings?.currency)}
               </p>
            </div>
        </div>

        <div className="space-y-3">
          {categoryChartData.slice(0, 3).map((item, i) => (
            <Link 
              key={i} 
              to={`/analytics?tab=${chartType === 'expense' ? 'expenses' : 'income'}&categoryId=${item.id}`}
              className="block space-y-1 group active:scale-95 transition-transform"
            >
               <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                     <span className="text-[9px] font-bold text-gray-700 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{item.name}</span>
                  </div>
                  <span className="text-[8px] font-bold text-gray-400">
                    {((item.value / totalType) * 100).toFixed(0)}%
                  </span>
               </div>
               <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / totalType) * 100}%` }}
                    className="h-full rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
               </div>
            </Link>
          ))}
          {categoryChartData.length > 3 && (
            <Link 
              to={`/analytics?tab=${chartType === 'expense' ? 'expenses' : 'income'}`}
              className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight text-center block w-full hover:underline mt-2"
            >
              See all categories
            </Link>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Transactions</h3>
          <Link to="/transactions" className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight flex items-center">
            See all <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
        
        <div className="space-y-2">
          {transactions?.length === 0 ? (
            <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-gray-100">
               <p className="text-gray-400 text-xs">No transactions yet.</p>
               <Link to="/add" className="text-[10px] text-indigo-600 font-bold mt-1 inline-block uppercase tracking-wider">Add first</Link>
            </div>
          ) : (
            transactions?.slice(0, 5).map((t) => {
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
          )}
        </div>
      </div>
    </div>
  );
}
