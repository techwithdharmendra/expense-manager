import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, cn, formatNumberOnly, formatDate } from '../lib/utils';
import { ArrowLeft, Plus, Send, Download as Receive, Calendar, MoreVertical, Trash2, CheckCircle2, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { CashbookEntry } from '../types';
import { t } from '../lib/i18n';
import ConfirmDialog from '../components/ConfirmDialog';

export default function CashbookCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const settings = useLiveQuery(() => db.settings.get(1));
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const customerId = Number(id);
  const lang = settings?.language;

  const customer = useLiveQuery(() => db.cashbookCustomers.get(customerId), [customerId]);
  const entries = useLiveQuery(() => 
    db.cashbookEntries.where('customerId').equals(customerId).reverse().sortBy('date'), 
    [customerId]
  );

  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryType, setEntryType] = useState<'gave' | 'took'>('gave');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  
  // Use localized ISO string taking timezone into account
  const initDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(initDate());
  const [dueDate, setDueDate] = useState('');
  const [accountId, setAccountId] = useState<number | ''>('');

  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [deleteCustomerConfirm, setDeleteCustomerConfirm] = useState(false);
  const [deleteEntryConfirm, setDeleteEntryConfirm] = useState<CashbookEntry | null>(null);

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      await db.cashbookCustomers.update(customerId, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        updatedAt: new Date()
      });
      toast.success('Customer updated');
      setShowEditCustomer(false);
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    if (settings?.syncCashbookWithExpenses && accountId === '') {
      toast.error('Please select an account for syncing');
      return;
    }
    
    const val = Number(amount);
    let newBalance = customer?.balance || 0;
    
    if (entryType === 'gave') {
      newBalance += val;
    } else {
      newBalance -= val;
    }

    try {
      await db.transaction('rw', [db.cashbookEntries, db.cashbookCustomers, db.transactions, db.accounts, db.categories], async () => {
        let linkedTxId: number | string | undefined = undefined;

        if (settings?.syncCashbookWithExpenses && accountId !== '') {
          // Find or create 'Cashbook' category
          const txType = entryType === 'took' ? 'income' : 'expense';
          let cat = await db.categories.where('name').equals('Cashbook').filter(c => c.type === txType).first();
          if (!cat) {
            const catId = await db.categories.add({
              name: 'Cashbook',
              icon: 'Book',
              color: '#3B82F6',
              type: txType
            });
            cat = await db.categories.get(catId);
          }

          linkedTxId = await db.transactions.add({
            title: `Cashbook: ${customer?.name || 'Customer'}`,
            amount: val,
            type: txType,
            categoryId: cat!.id!,
            accountId: Number(accountId),
            date: new Date(date + 'T00:00:00'),
            note: note.trim() || undefined
          });

          // Update account balance
          const account = await db.accounts.get(Number(accountId));
          if (account) {
            let accBalance = account.balance;
            if (txType === 'income') {
              accBalance += val;
            } else {
              accBalance -= val;
            }
            await db.accounts.update(account.id!, { balance: accBalance });
          }
        }

        await db.cashbookEntries.add({
          customerId,
          type: entryType,
          amount: val,
          note: note.trim() || undefined,
          date: new Date(date + 'T00:00:00'),
          dueDate: dueDate ? new Date(dueDate + 'T00:00:00') : undefined,
          isCleared: false,
          accountId: accountId !== '' ? Number(accountId) : undefined,
          linkedTransactionId: linkedTxId
        });
        
        await db.cashbookCustomers.update(customerId, {
          balance: newBalance,
          updatedAt: new Date()
        });
      });
      toast.success('Entry added');
      setShowAddEntry(false);
      setAmount('');
      setNote('');
      setDueDate('');
      setAccountId('');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to add entry');
    }
  };

  const deleteCustomer = async () => {
    await db.transaction('rw', [db.cashbookEntries, db.cashbookCustomers, db.transactions, db.accounts], async () => {
      const customerEntries = await db.cashbookEntries.where('customerId').equals(customerId).toArray();
      for (const entry of customerEntries) {
        if (entry.linkedTransactionId) {
          const tx = await db.transactions.get(entry.linkedTransactionId as number);
          if (tx && tx.accountId) {
            const account = await db.accounts.get(Number(tx.accountId));
            if (account) {
              // reverse transaction effect on account
              let accBalance = account.balance;
              if (tx.type === 'income') accBalance -= tx.amount;
              if (tx.type === 'expense') accBalance += tx.amount;
              await db.accounts.update(account.id!, { balance: accBalance });
            }
          }
          await db.transactions.delete(entry.linkedTransactionId as number);
        }
      }

      await db.cashbookEntries.where('customerId').equals(customerId).delete();
      await db.cashbookCustomers.delete(customerId);
    });
    toast.success('Customer deleted');
    navigate('/cashbook');
  };

  const markAsCleared = async (entryId: number) => {
    try {
      await db.cashbookEntries.update(entryId, { isCleared: true });
      toast.success('Reminder cleared');
    } catch (e) {
      toast.error('Failed to clear');
    }
  };

  const deleteEntry = async (entry: CashbookEntry) => {
    try {
      let newBalance = customer?.balance || 0;
      
      // Reverse calculation
      if (entry.type === 'gave') {
        newBalance -= entry.amount; // We gave, so it previously increased they owed us. Reverse it.
      } else {
        newBalance += entry.amount; // We took, so it previously decreased. Reverse it.
      }

      await db.transaction('rw', [db.cashbookEntries, db.cashbookCustomers, db.transactions, db.accounts], async () => {
        if (entry.id) {
          await db.cashbookEntries.delete(entry.id);
        }
        await db.cashbookCustomers.update(customerId, {
          balance: newBalance,
          updatedAt: new Date()
        });

        if (entry.linkedTransactionId) {
          const tx = await db.transactions.get(entry.linkedTransactionId as number);
          if (tx && tx.accountId) {
            const account = await db.accounts.get(Number(tx.accountId));
            if (account) {
              // reverse transaction effect on account
              let accBalance = account.balance;
              if (tx.type === 'income') accBalance -= tx.amount;
              if (tx.type === 'expense') accBalance += tx.amount;
              await db.accounts.update(account.id!, { balance: accBalance });
            }
          }
          await db.transactions.delete(entry.linkedTransactionId as number);
        }
      });
      toast.success('Entry deleted');
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

  if (!customer) return null;

  return (
    <div className="space-y-3 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-1.5 pt-1">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-50 active:scale-95 transition-transform shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center flex-1 px-2 min-w-0">
           <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate">{customer.name}</h1>
           {customer.phone && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{customer.phone}</p>}
        </div>
        <div className="flex space-x-1.5 shrink-0">
          <button 
            onClick={() => {
              setEditName(customer.name);
              setEditPhone(customer.phone || '');
              setShowEditCustomer(true);
            }} 
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 hover:text-indigo-600 shadow-sm border border-gray-50 active:scale-95 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteCustomerConfirm(true)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-400 shadow-sm border border-gray-50 active:scale-95 transition-transform">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Net Balance Card */}
      <div className={cn(
        "rounded-2xl p-5 text-white text-center relative overflow-hidden shadow-lg mx-1.5",
        customer.balance === 0 ? "bg-slate-800 shadow-slate-200/20" :
        customer.balance > 0 ? "bg-rose-500 shadow-rose-200" : "bg-emerald-500 shadow-emerald-200"
      )}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl" />
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1 shadow-sm">{t('netBalance', lang)}</p>
          <h2 className="text-4xl font-bold tracking-tight mb-2">
            {formatCurrency(Math.abs(customer.balance), settings)}
          </h2>
          <div className="inline-flex items-center space-x-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
             {customer.balance === 0 ? (
               <span>{t('settled', lang)}</span>
             ) : customer.balance > 0 ? (
               <span>{t('youWillGet', lang)}</span>
             ) : (
               <span>{t('youWillGive', lang)}</span>
             )}
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-2xl border border-gray-50 shadow-sm mx-1.5 overflow-hidden">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest py-3 px-4 bg-gray-50/50 border-b border-gray-50">{t('transactionHistory', lang)}</h3>
        
        <div className="divide-y divide-gray-50">
          {entries?.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-gray-400 font-medium">{t('noHistory', lang)}</p>
            </div>
          ) : (
            entries?.map(entry => (
              <div key={entry.id} className="p-4 relative hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                      entry.type === 'gave' ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"
                    )}>
                      {entry.type === 'gave' ? <Receive className="w-5 h-5 rotate-180" /> : <Receive className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {entry.type === 'gave' ? t('youGave', lang) : t('youGot', lang)}
                      </p>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">
                          {formatDate(entry.date, settings)}
                        </p>
                        {entry.accountId && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                            {accounts?.find(a => a.id === entry.accountId)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold",
                       entry.type === 'gave' ? "text-rose-500" : "text-emerald-500"
                    )}>
                      {formatCurrency(entry.amount, settings)}
                    </p>
                    <button 
                      onClick={() => setDeleteEntryConfirm(entry)}
                      className="inline-block p-1 text-gray-300 hover:text-red-500 transition-colors mt-1"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {entry.note && (
                  <p className="text-xs text-gray-500 mt-3 font-medium bg-gray-50 p-2.5 rounded-xl border border-gray-100/50 ml-13">
                    {entry.note}
                  </p>
                )}
                {entry.dueDate && (
                  <div className="flex items-center justify-between mt-3 ml-13">
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg w-max uppercase tracking-wider">
                      <Calendar className="w-3 h-3" />
                      <span>{t('due', lang)}: {formatDate(entry.dueDate, settings)}</span>
                    </div>
                    {!entry.isCleared && (
                      <button 
                        onClick={() => entry.id && markAsCleared(entry.id)}
                        className="flex items-center space-x-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-max uppercase tracking-wider active:scale-95 transition-transform"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t('clearDue', lang)}</span>
                      </button>
                    )}
                    {entry.isCleared && (
                      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg w-max uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t('cleared', lang)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-20 left-0 right-0 px-3 py-4 max-w-md mx-auto grid grid-cols-2 gap-3 z-30">
        <button
          onClick={() => { setEntryType('gave'); setShowAddEntry(true); }}
          className="bg-rose-500 text-white rounded-2xl py-3.5 shadow-xl shadow-rose-200 active:scale-95 transition-transform flex items-center justify-center space-x-2 font-bold"
        >
          <Receive className="w-5 h-5 rotate-180" />
          <span>{t('youGave', lang)} ₹</span>
        </button>
        <button
          onClick={() => { setEntryType('took'); setShowAddEntry(true); }}
          className="bg-emerald-500 text-white rounded-2xl py-3.5 shadow-xl shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center space-x-2 font-bold"
        >
          <Receive className="w-5 h-5" />
          <span>{t('youGot', lang)} ₹</span>
        </button>
      </div>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {showAddEntry && (
           <>
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
               onClick={() => setShowAddEntry(false)}
             />
             <motion.div 
               initial={{ y: '100%' }}
               animate={{ y: 0 }}
               exit={{ y: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl z-50 p-6 shadow-2xl pb-safe h-[85vh] overflow-y-auto"
             >
               <div className="max-w-md mx-auto">
                 <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                 <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
                   <div className={cn(
                     "w-8 h-8 rounded-full flex items-center justify-center text-white",
                     entryType === 'gave' ? "bg-rose-500" : "bg-emerald-500"
                   )}>
                     {entryType === 'gave' ? <Receive className="w-4 h-4 rotate-180" /> : <Receive className="w-4 h-4" />}
                   </div>
                   <span>{entryType === 'gave' ? t('addAmountGiven', lang) : t('addAmountReceived', lang)}</span>
                 </h2>
                 
                 <form onSubmit={handleAddEntry} className="space-y-4">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('amount', lang)}</label>
                     <input 
                       autoFocus
                       type="text" 
                       inputMode="decimal"
                       required
                       placeholder="0.00"
                       value={amount ? formatNumberOnly(amount, settings) : ''}
                       onChange={e => {
                         const raw = e.target.value.replace(/[^\d.-]/g, '');
                         setAmount(raw);
                       }}
                       className="w-full bg-gray-50 focus:bg-white rounded-2xl px-4 py-3.5 text-2xl font-bold border border-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all text-gray-900"
                     />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('noteOptional', lang)}</label>
                     <input 
                       type="text" 
                       placeholder="e.g. For project X"
                       value={note}
                       onChange={e => setNote(e.target.value)}
                       className="w-full bg-gray-50 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-medium border border-gray-100  focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all"
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('date', lang)}</label>
                       <input 
                         type="date" 
                         required
                         value={date}
                         onChange={e => setDate(e.target.value)}
                         className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-sm font-medium border border-gray-100  focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all"
                       />
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 text-amber-500">{t('dueDateOptional', lang)}</label>
                       <input 
                         type="date" 
                         value={dueDate}
                         onChange={e => setDueDate(e.target.value)}
                         className="w-full bg-amber-50/30 rounded-2xl px-4 py-3.5 text-sm font-medium border border-amber-100  focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30 transition-all"
                       />
                     </div>
                   </div>
                   
                   {settings?.syncCashbookWithExpenses && (
                     <div className="space-y-1.5 mt-4">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('syncWithAccount', lang)}</label>
                       <select
                         required
                         value={accountId}
                         onChange={e => setAccountId(e.target.value === '' ? '' : Number(e.target.value))}
                         className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-sm font-medium border border-gray-100  focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all appearance-none"
                       >
                         <option value="">{t('selectAccount', lang)}</option>
                         {accounts?.map(acc => (
                           <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance, settings)})</option>
                         ))}
                       </select>
                     </div>
                   )}
                   
                   <div className="pt-6 flex space-x-3">
                     <button 
                       type="button"
                       onClick={() => setShowAddEntry(false)}
                       className="flex-1 bg-gray-50 text-gray-600 py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                     >
                       {t('cancel', lang)}
                     </button>
                     <button 
                       type="submit"
                       disabled={!amount}
                       className={cn(
                         "flex-1 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-50",
                         entryType === 'gave' ? "bg-rose-500 shadow-rose-200" : "bg-emerald-500 shadow-emerald-200"
                       )}
                     >
                       {t('saveEntry', lang)}
                     </button>
                   </div>
                 </form>
               </div>
             </motion.div>
           </>
        )}
      </AnimatePresence>

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {showEditCustomer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowEditCustomer(false)}
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
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <Edit2 className="w-5 h-5 mr-2 text-indigo-600" />
                  {t('editCustomer', lang)}
                </h2>
                
                <form onSubmit={handleEditCustomer} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('customerName', lang)}</label>
                    <input 
                      autoFocus
                      type="text" 
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-sm font-medium border border-gray-100  focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('phoneOptional', lang)}</label>
                    <input 
                      type="tel" 
                      placeholder="+91..."
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-sm font-medium border border-gray-100  focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all"
                    />
                  </div>
                  
                  <div className="pt-4 flex space-x-3">
                    <button 
                      type="button"
                      onClick={() => setShowEditCustomer(false)}
                      className="flex-1 bg-gray-50 text-gray-600 py-3.5 rounded-2xl font-bold active:scale-95 transition-transform"
                    >
                      {t('cancel', lang)}
                    </button>
                    <button 
                      type="submit"
                      disabled={!editName.trim()}
                      className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {t('saveChanges', lang)}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={deleteCustomerConfirm}
        title="Delete Customer"
        message="Are you sure you want to delete this customer and all their records?"
        onConfirm={() => {
          setDeleteCustomerConfirm(false);
          deleteCustomer();
        }}
        onCancel={() => setDeleteCustomerConfirm(false)}
        variant="danger"
      />

      <ConfirmDialog 
        isOpen={!!deleteEntryConfirm}
        title="Delete Entry"
        message="Are you sure you want to delete this entry? Balance will be updated."
        onConfirm={() => {
          if (deleteEntryConfirm) deleteEntry(deleteEntryConfirm);
          setDeleteEntryConfirm(null);
        }}
        onCancel={() => setDeleteEntryConfirm(null)}
        variant="danger"
      />
    </div>
  );
}
