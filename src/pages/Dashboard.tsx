
import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, cn } from '../lib/utils';
import { getMonthCycleStartEnd } from '../lib/dateUtils';
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
  LayoutGrid,
  Moon,
  Sun
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
  
  const categoriesLive = useLiveQuery(() => db.categories.toArray());
  const accountsLive = useLiveQuery(() => db.accounts.toArray());
  const settings = useLiveQuery(() => db.settings.get(1));

  const categories = useMemo(() => {
    return categoriesLive ? [...categoriesLive].sort((a,b) => (a.order || 0) - (b.order || 0)) : undefined;
  }, [categoriesLive]);

  const accounts = useMemo(() => {
    return accountsLive ? [...accountsLive].sort((a,b) => (a.order || 0) - (b.order || 0)) : undefined;
  }, [accountsLive]);

  const stats = useLiveQuery(async () => {
    let income = 0;
    let expense = 0;
    let balance = 0;
    
    const accs = await db.accounts.toArray();
    accs.forEach(a => balance += (a.balance || 0));

    // Optimize: only fetch current month's income/expense for the summary
    const startDay = settings?.monthStartDate || 1;
    const { start, end } = getMonthCycleStartEnd(new Date(), startDay);
    
    await db.transactions.where('date').between(start, end, true, true).each(t => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    });

    return {
      income,
      expense,
      balance,
      savings: income > 0 ? ((income - expense) / income) * 100 : 0
    };
  }, [settings?.monthStartDate], { balance: 0, income: 0, expense: 0, savings: 0 });

  const accStats = useLiveQuery(async () => {
    const accs = await db.accounts.toArray();
    return accs.map(a => ({ ...a, currentBalance: a.balance || 0 })).sort((a,b) => (a.order || 0) - (b.order || 0));
  }, [], []);

  const chartData = useLiveQuery(async () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    
    // Only fetch last 7 days
    const recentTxs = await db.transactions
      .where('date')
      .aboveOrEqual(d)
      .toArray();
      
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - i);
      return day.toISOString().split('T')[0];
    }).reverse();

    return days.map(day => {
      const dayT = recentTxs.filter(t => new Date(t.date).toISOString().split('T')[0] === day);
      return {
        name: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
        expense: dayT.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0),
        income: dayT.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0),
      };
    });
  }, [], []);

  const getCategory = (id: string | number) => categories?.find(c => String(c.id) === String(id));
  const getAccount = (id: string | number) => accounts?.find(a => String(a.id) === String(id));

  const categoryChartData = useLiveQuery(async () => {
    if (!categories) return [];
    
    // For categories pie chart, use current month cycle
    const startDay = settings?.monthStartDate || 1;
    const { start: startOfMonth, end: endOfMonth } = getMonthCycleStartEnd(new Date(), startDay);

    const monthTxs = await db.transactions
      .where('date')
      .between(startOfMonth, endOfMonth, true, true)
      .toArray();

    const filtered = monthTxs.filter(t => t.type === chartType);
    const stats_map: { [key: string]: { name: string, value: number, color: string, icon: string, id: string | number } } = {};
    
    filtered.forEach(t => {
      let cat = categories.find(c => String(c.id) === String(t.categoryId));
      
      let mainCat = cat;
      if (cat && cat.parentId) {
         mainCat = categories.find(c => String(c.id) === String(cat!.parentId)) || cat;
      }
      
      const catName = mainCat?.name || 'Other';
      const catId = mainCat?.id || 'unknown';
      if (!stats_map[catName]) {
        stats_map[catName] = { 
          name: catName, 
          value: 0, 
          color: mainCat?.color || '#CBD5E1',
          icon: mainCat?.icon || 'Tag',
          id: catId
        };
      }
      stats_map[catName].value += t.amount;
    });
    
    return Object.values(stats_map).sort((a, b) => b.value - a.value);
  }, [categories, chartType], []);

  const toggleTheme = async () => {
    if (settings) {
      await db.settings.update(1, { isDarkMode: !settings.isDarkMode });
    }
  };

  const totalType = (categoryChartData || []).reduce((sum: number, item: any) => sum + item.value, 0);

  return (
    <div className="space-y-4 pb-4 px-1">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-0.5">Dharmendra's</p>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">Wallet Tracker</h1>
        </div>
        <div className="flex items-center space-x-1.5">
          <button onClick={toggleTheme} className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors border border-gray-100" title="Toggle Theme">
            {settings?.isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
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
                {settings?.hideBalance ? '••••••' : (
                  <>{settings?.showSignSymbol !== false && (stats.balance >= 0 ? '+' : '-')}{formatCurrency(Math.abs(stats.balance), settings)}</>
                )}
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
                <p className="font-bold text-sm text-emerald-500 truncate">{settings?.showSignSymbol !== false ? '+' : ''}{formatCurrency(stats.income, settings)}</p>
              </div>
            </Link>
            <Link to="/analytics?tab=expenses" className="flex items-center space-x-3 group active:scale-95 transition-transform">
              <div className="w-1.5 h-6 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">Expense</p>
                <p className="font-bold text-sm text-rose-500 truncate">{settings?.showSignSymbol !== false ? '-' : ''}{formatCurrency(stats.expense, settings)}</p>
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
                    {settings?.showSignSymbol !== false && (acc.currentBalance >= 0 ? '+' : '-')}{formatCurrency(Math.abs(acc.currentBalance), settings)}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{chartType}</p>
               <p className="text-base font-bold text-gray-900 leading-tight flex items-center space-x-1">
                 <span>{formatCurrency(totalType, settings)}</span>
               </p>
            </div>
            <ResponsiveContainer width="100%" height="100%" className="z-10">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
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
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  formatter={(value: number) => formatCurrency(value, settings)}
                />
              </PieChart>
            </ResponsiveContainer>
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
                  toAccount={t.toAccountId ? getAccount(t.toAccountId) : undefined}
                  settings={settings}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
