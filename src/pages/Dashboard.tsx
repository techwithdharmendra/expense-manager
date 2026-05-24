
import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { t } from '../lib/i18n';
import { formatCurrency, cn, formatDate } from '../lib/utils';
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
  Sun,
  Settings as SettingsIcon,
  Bell,
  Calendar
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
  const setLive = useLiveQuery(() => db.settings.get(1));
  const cashbookCustomers = useLiveQuery(() => db.cashbookCustomers.toArray());
  const settings = setLive;
  const lang = settings?.language;

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
      if (t.type === 'income') income = Math.round((income + t.amount) * 100) / 100;
      else if (t.type === 'expense') expense = Math.round((expense + t.amount) * 100) / 100;
    });

    return {
      income,
      expense,
      balance: Math.round(balance * 100) / 100,
      savings: income > 0 ? ((income - expense) / income) * 100 : 0
    };
  }, [settings?.monthStartDate], { balance: 0, income: 0, expense: 0, savings: 0 });

  const accStats = useLiveQuery(async () => {
    const accs = await db.accounts.toArray();
    return accs.map(a => ({ ...a, currentBalance: a.balance || 0 })).sort((a,b) => (a.order || 0) - (b.order || 0));
  }, [], []);

  const cashbookSummary = useMemo(() => {
    if (!cashbookCustomers) return { toGet: 0, toGive: 0 };
    return cashbookCustomers.reduce((acc, c) => {
      if (c.balance > 0) acc.toGet += c.balance;
      else if (c.balance < 0) acc.toGive += Math.abs(c.balance);
      return acc;
    }, { toGet: 0, toGive: 0 });
  }, [cashbookCustomers]);

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
        name: new Date(day).toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-GB', { weekday: 'short' }),
        expense: Math.round((dayT.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)) * 100) / 100,
        income: Math.round((dayT.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0)) * 100) / 100,
      };
    });
  }, [lang], []);

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
    
    filtered.forEach(tx => {
      let cat = categories.find(c => String(c.id) === String(tx.categoryId));
      
      let mainCat = cat;
      if (cat && cat.parentId) {
         mainCat = categories.find(c => String(c.id) === String(cat!.parentId)) || cat;
      }
      
      const catName = mainCat?.name || (t('other', lang) || 'Other');
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
      stats_map[catName].value = Math.round((stats_map[catName].value + tx.amount) * 100) / 100;
    });
    
    return Object.values(stats_map).sort((a, b) => b.value - a.value);
  }, [categories, chartType, lang], []);

  const toggleTheme = async () => {
    if (settings) {
      await db.settings.update(1, { isDarkMode: !settings.isDarkMode });
    }
  };

  const totalType = (categoryChartData || []).reduce((sum: number, item: any) => sum + item.value, 0);

  const dueReminders = useLiveQuery(async () => {
    const days = settings?.cashbookReminderDays ?? 1;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + days);

    const customers = await db.cashbookCustomers.toArray();
    const customerMap = new Map(customers.map(c => [c.id, c.name]));

    const entries = await db.cashbookEntries
      .where('dueDate')
      .aboveOrEqual(now)
      .toArray();

    return entries
      .filter(e => !e.isCleared && e.dueDate && new Date(e.dueDate) <= targetDate)
      .map(e => ({
        ...e,
        customerName: customerMap.get(e.customerId) || (t('unknown', lang) || 'Unknown')
      }));
  }, [settings?.cashbookReminderDays, lang]);

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
            {settings?.isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link to="/settings" className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors border border-gray-100" title="Settings">
            <SettingsIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Main Card */}
      {dueReminders && dueReminders.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 shadow-sm border border-amber-100/50 mb-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center space-x-2 mb-3">
             <Bell className="w-4 h-4 text-amber-500 animate-bounce" />
             <h3 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{t('due', lang) || 'Upcoming Dues'}</h3>
          </div>
          <div className="space-y-2">
            {dueReminders.map(r => (
              <Link 
                key={r.id} 
                to={`/cashbook/${r.customerId}`}
                className="flex items-center justify-between bg-white/60 p-2.5 rounded-xl block active:scale-95 transition-transform"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">{r.customerName}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center mt-0.5">
                    <Calendar className="w-3 h-3 mr-1 inline" />
                    {t('due', lang) || 'Due'}: {formatDate(r.dueDate!, settings)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold", r.type === 'gave' ? "text-rose-500" : "text-emerald-500")}>
                    {formatCurrency(r.amount, settings)}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">
                    {r.type === 'gave' ? (t('youWillGet', lang) || 'To Receive') : (t('youWillGive', lang) || 'To Pay')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-white rounded-2xl p-5 text-gray-900 overflow-hidden shadow-sm border border-gray-50"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-12 -mt-12 blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">{t('totalBalance', lang)}</p>
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
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">{t('income', lang)}</p>
                <p className="font-bold text-sm text-emerald-500 truncate">{settings?.showSignSymbol !== false ? '+' : ''}{formatCurrency(stats.income, settings)}</p>
              </div>
            </Link>
            <Link to="/analytics?tab=expenses" className="flex items-center space-x-3 group active:scale-95 transition-transform">
              <div className="w-1.5 h-6 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">{t('expense', lang)}</p>
                <p className="font-bold text-sm text-rose-500 truncate">{settings?.showSignSymbol !== false ? '-' : ''}{formatCurrency(stats.expense, settings)}</p>
              </div>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Accounts Section - Updated to match app theme with grid layout */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 space-y-5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('accounts', lang)}</h3>
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

      {/* Cashbook Summary Section */}
      {settings?.showCashbookSummaryWidget !== false && settings?.syncCashbookWithExpenses && cashbookCustomers && cashbookCustomers.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 space-y-5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('cashbook', lang)}</h3>
            <Link to="/cashbook" className="p-1 -mr-1 text-gray-400 hover:text-indigo-600 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
            <Link to="/cashbook" className="flex items-center space-x-3 active:scale-95 transition-transform group">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 shadow-sm group-hover:bg-emerald-100 transition-colors">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">{t('youWillGet', lang)}</p>
                <p className="text-sm font-bold text-emerald-500 leading-tight mt-0.5">{formatCurrency(cashbookSummary.toGet, settings)}</p>
              </div>
            </Link>
            
            <Link to="/cashbook" className="flex items-center space-x-3 active:scale-95 transition-transform group">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0 shadow-sm group-hover:bg-rose-100 transition-colors">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">{t('youWillGive', lang)}</p>
                <p className="text-sm font-bold text-rose-500 leading-tight mt-0.5">{formatCurrency(cashbookSummary.toGive, settings)}</p>
              </div>
            </Link>
          </div>
        </div>
      )}


      {/* Overview Charts */}
      {settings?.showCategoryOverviewWidget !== false && (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 space-y-5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('overview', lang) || 'Category Overview'}</h3>
          <div className="flex p-0.5 bg-gray-50 rounded-xl">
             <button 
              onClick={() => setChartType('expense')}
              className={cn(
                "px-2.5 py-1 text-[8px] font-bold uppercase rounded-lg transition-all",
                chartType === 'expense' ? "bg-white text-rose-500 shadow-sm" : "text-gray-400"
              )}
             >
               {t('expense', lang) || 'Expense'}
             </button>
             <button 
              onClick={() => setChartType('income')}
              className={cn(
                "px-2.5 py-1 text-[8px] font-bold uppercase rounded-lg transition-all",
                chartType === 'income' ? "bg-white text-emerald-500 shadow-sm" : "text-gray-400"
              )}
             >
               {t('income', lang) || 'Income'}
             </button>
          </div>
        </div>

        <div className="relative h-44 flex items-center justify-center">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{chartType === 'expense' ? (t('expense', lang) || 'Expense') : (t('income', lang) || 'Income')}</p>
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
              {t('seeAll', lang) || 'See all'}
            </Link>
          )}
        </div>
      </div>
      )}

      {/* Recent Transactions */}
      {settings?.showRecentTransactionsWidget !== false && (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('recentTransactions', lang)}</h3>
          <Link to="/transactions" className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight flex items-center">
            {t('viewAll', lang)} <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
        
        <div className="space-y-2">
          {transactions?.length === 0 ? (
            <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-gray-100">
               <p className="text-gray-400 text-xs">{t('noTransactionsYet', lang) || 'No transactions yet.'}</p>
               <Link to="/add" className="text-[10px] text-indigo-600 font-bold mt-1 inline-block uppercase tracking-wider">{t('addFirst', lang) || 'Add first'}</Link>
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
      )}
    </div>
  );
}
