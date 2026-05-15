
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
  ScanLine,
  Mic,
  ArrowRight,
  PieChart as PieChartIcon,
  BarChart2
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
    db.transactions.orderBy('date').reverse().limit(10).toArray()
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
    const stats: { [key: string]: { name: string, value: number, color: string, icon: string } } = {};
    
    filtered.forEach(t => {
      const cat = getCategory(t.categoryId);
      const catName = cat?.name || 'Other';
      if (!stats[catName]) {
        stats[catName] = { 
          name: catName, 
          value: 0, 
          color: cat?.color || '#CBD5E1',
          icon: cat?.icon || 'Tag'
        };
      }
      stats[catName].value += t.amount;
    });
    
    return Object.values(stats).sort((a, b) => b.value - a.value);
  }, [allTransactions, categories, chartType]);

  const totalType = categoryChartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Morning,</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">Wallet Tracker</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Link to="/settings" className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <span className="text-xs font-bold">{settings?.currency || '$'}</span>
          </Link>
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-indigo-600 rounded-[2rem] p-8 text-white overflow-hidden shadow-2xl shadow-indigo-200"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 blur-xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-indigo-100/60 text-[10px] font-bold uppercase tracking-widest mb-1">Total Balance</p>
              <h2 className="text-4xl font-bold tracking-tight">
                {settings?.hideBalance ? '••••••' : formatCurrency(stats.balance, settings?.currency)}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
               <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <Link to="/analytics?tab=income" className="space-y-1 block active:scale-95 transition-transform">
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <p className="text-[10px] text-indigo-100/60 font-bold uppercase tracking-wider">Income</p>
              </div>
              <p className="font-bold text-lg">{formatCurrency(stats.income, settings?.currency)}</p>
            </Link>
            <Link to="/analytics?tab=expenses" className="space-y-1 block active:scale-95 transition-transform">
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <p className="text-[10px] text-indigo-100/60 font-bold uppercase tracking-wider">Expense</p>
              </div>
              <p className="font-bold text-lg">{formatCurrency(stats.expense, settings?.currency)}</p>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 px-1">
        <Link to="/add" className="bg-white p-4 rounded-3xl border border-gray-50 shadow-sm flex flex-col items-center space-y-2 active:scale-95 transition-transform group">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase">Add</span>
        </Link>
        <Link to="/add?mode=scan" className="bg-white p-4 rounded-3xl border border-gray-50 shadow-sm flex flex-col items-center space-y-2 active:scale-95 transition-transform group">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
            <ScanLine className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase">Scan</span>
        </Link>
        <Link to="/add?mode=voice" className="bg-white p-4 rounded-3xl border border-gray-50 shadow-sm flex flex-col items-center space-y-2 active:scale-95 transition-transform group">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:bg-violet-100 transition-colors">
            <Mic className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase">Voice</span>
        </Link>
      </div>

      {/* Accounts Horizontal Scroll */}
      <div className="space-y-3 px-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Accounts</h3>
          <Link to="/settings/accounts" className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">Manage</Link>
        </div>
        <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar -mx-1 px-1">
          {accStats.map(acc => (
            <Link 
              key={acc.id} 
              to={`/analytics?tab=combined&accountId=${acc.id}`}
              className="flex-shrink-0 w-36 bg-white p-4 rounded-3xl border border-gray-50 shadow-sm space-y-3 active:scale-95 transition-transform"
            >
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                style={{ backgroundColor: acc.color }}
              >
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase truncate">{acc.name}</h4>
                <p className="font-bold text-sm text-gray-900">{formatCurrency(acc.currentBalance, settings?.currency)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>


      {/* Overview Charts */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 space-y-6">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Category Overview</h3>
          <div className="flex p-0.5 bg-gray-50 rounded-xl">
             <button 
              onClick={() => setChartType('expense')}
              className={cn(
                "px-3 py-1.5 text-[8px] font-bold uppercase rounded-lg transition-all",
                chartType === 'expense' ? "bg-white text-rose-500 shadow-sm" : "text-gray-400"
              )}
             >
               Expense
             </button>
             <button 
              onClick={() => setChartType('income')}
              className={cn(
                "px-3 py-1.5 text-[8px] font-bold uppercase rounded-lg transition-all",
                chartType === 'income' ? "bg-white text-emerald-500 shadow-sm" : "text-gray-400"
              )}
             >
               Income
             </button>
          </div>
        </div>

        <div className="relative h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
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
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{chartType}</p>
               <p className="text-lg font-bold text-gray-900 leading-tight">
                 {formatCurrency(totalType, settings?.currency)}
               </p>
            </div>
        </div>

        <div className="space-y-4">
          {categoryChartData.slice(0, 3).map((item, i) => (
            <div key={i} className="space-y-1.5">
               <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                     <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">
                    {((item.value / totalType) * 100).toFixed(0)}%
                  </span>
               </div>
               <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / totalType) * 100}%` }}
                    className="h-full rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
               </div>
            </div>
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
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-gray-700">Recent Transactions</h3>
          <Link to="/transactions" className="text-xs text-indigo-600 font-medium flex items-center">
            See all <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
        
        <div className="space-y-3">
          {transactions?.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200">
               <p className="text-gray-400 text-sm">No transactions yet.</p>
               <Link to="/add" className="text-xs text-indigo-600 font-bold mt-2 inline-block">Add your first expense</Link>
            </div>
          ) : (
            transactions?.map((t) => (
              <TransactionItem 
                key={t.id} 
                transaction={t} 
                category={getCategory(t.categoryId)}
                account={getAccount(t.accountId)}
                currency={settings?.currency}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
