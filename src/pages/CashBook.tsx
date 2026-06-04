import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  ChevronRight,
  UserPlus,
  X
} from 'lucide-react';
import { formatCurrency, cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { t } from '../lib/i18n';

export default function CashBook() {
  const [search, setSearch] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  
  const settings = useLiveQuery(() => db.settings.get(1));
  const lang = settings?.language;
  
  const customers = useLiveQuery(async () => {
    let result = await db.cashbookCustomers.toArray();
    result.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(s) || (c.phone && c.phone.includes(s)));
    }
    
    return Promise.all(result.map(async (c) => {
      const entries = await db.cashbookEntries
        .where('customerId')
        .equals(c.id!)
        .toArray();
        
      const unclearedWithDue = entries.filter(e => !e.isCleared && e.dueDate);
      unclearedWithDue.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
      
      return {
        ...c,
        nextDueDate: unclearedWithDue.length > 0 ? unclearedWithDue[0].dueDate : undefined
      };
    }));
  }, [search]);

  const stats = useMemo(() => {
    if (!customers) return { toGive: 0, toTake: 0, net: 0 };
    let toGive = 0; // negative balances
    let toTake = 0; // positive balances
    customers.forEach(c => {
      if (c.balance < 0) toGive += Math.abs(c.balance);
      else if (c.balance > 0) toTake += c.balance;
    });
    return { toGive, toTake, net: toTake - toGive };
  }, [customers]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    
    try {
      await db.cashbookCustomers.add({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      toast.success('Customer added');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setShowAddCustomer(false);
    } catch (err) {
      toast.error('Failed to add customer');
    }
  };

  return (
    <div className="space-y-3 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1.5 pt-1">
        <div>
           <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">{t('letiDeti', lang)}</p>
           <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">{t('cashbook', lang)}</h1>
        </div>
        <button 
          onClick={() => setShowAddCustomer(true)}
          className="w-10 h-10 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 flex items-center justify-center active:scale-95 transition-transform"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 px-1.5">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
           <div className="flex items-center space-x-2 mb-2">
             <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
               <ArrowDownLeft className="w-3.5 h-3.5" />
             </div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('youWillGive', lang)}</p>
           </div>
           <p className="text-lg font-bold text-emerald-500">{formatCurrency(stats.toGive, settings)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
           <div className="flex items-center space-x-2 mb-2">
             <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
               <ArrowUpRight className="w-3.5 h-3.5" />
             </div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('youWillGet', lang)}</p>
           </div>
           <p className="text-lg font-bold text-rose-500">{formatCurrency(stats.toTake, settings)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-1.5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder={t('searchCustomers', lang)}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white rounded-2xl pl-11 pr-4 py-3 text-sm font-medium border border-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all shadow-sm shadow-gray-50/50 placeholder:text-gray-300"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-50 shadow-sm mx-1.5 divide-y divide-gray-50">
        {customers?.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">{t('noCustomers', lang)}</h3>
            <p className="text-xs text-gray-400 font-medium">{t('addCustomerMsg', lang)}</p>
          </div>
        ) : (
          customers?.map(c => (
            <Link 
              to={`/cashbook/${c.id}`} 
              key={c.id}
              className="flex items-center justify-between p-4 active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm uppercase">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{c.name}</h3>
                  <div className="flex flex-col mt-0.5 space-y-0.5">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                      {c.updatedAt ? formatDate(c.updatedAt, settings) : 'New'}
                    </p>
                    {(c as any).nextDueDate && (
                      <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">
                        {t('due', lang) || 'Due'}: {formatDate((c as any).nextDueDate, settings)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {c.balance === 0 ? (
                  <p className="text-xs font-bold text-gray-400">{t('settled', lang)}</p>
                ) : (
                  <>
                    <p className={cn(
                      "text-sm font-bold",
                      c.balance > 0 ? "text-rose-500" : "text-emerald-500"
                    )}>
                      {formatCurrency(Math.abs(c.balance), settings)}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {c.balance > 0 ? t('youWillGet', lang) : t('youWillGive', lang)}
                    </p>
                  </>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {showAddCustomer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowAddCustomer(false)}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl z-50 p-6 shadow-2xl pb-safe"
            >
              <div className="max-w-md mx-auto">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                <h2 className="text-lg font-bold text-gray-900 mb-6">{t('addCustomer', lang)}</h2>
                
                <form onSubmit={handleAddCustomer} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('customerName', lang)}</label>
                    <input 
                      autoFocus
                      type="text" 
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={newCustomerName}
                      onChange={e => setNewCustomerName(e.target.value)}
                      className="w-full bg-gray-50 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-medium border border-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('phoneOptional', lang)}</label>
                    <input 
                      type="tel" 
                      placeholder="+91..."
                      value={newCustomerPhone}
                      onChange={e => setNewCustomerPhone(e.target.value)}
                      className="w-full bg-gray-50 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-medium border border-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all"
                    />
                  </div>
                  
                  <div className="pt-4 flex space-x-3">
                    <button 
                      type="button"
                      onClick={() => setShowAddCustomer(false)}
                      className="flex-1 bg-gray-50 text-gray-600 py-3.5 rounded-2xl font-bold active:scale-95 transition-transform"
                    >
                      {t('cancel', lang)}
                    </button>
                    <button 
                      type="submit"
                      disabled={!newCustomerName.trim()}
                      className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {t('saveCustomer', lang)}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
