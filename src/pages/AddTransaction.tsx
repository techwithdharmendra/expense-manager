import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { TransactionType, Transaction } from '../types';
import { cn } from '../lib/utils';
import { 
  ArrowLeft, 
  Check, 
  Calendar, 
  Tag, 
  FileText, 
  Plus, 
  Wallet as WalletIcon, 
  RefreshCcw,
  Camera,
  X,
  Image as ImageIcon,
  ScanLine,
  Mic
} from 'lucide-react';
import { motion } from 'motion/react';
import { getIconByName } from '../lib/icons';

import { toast } from 'sonner';

export default function AddTransaction() {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = useLiveQuery(() => db.categories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const settings = useLiveQuery(() => db.settings.get(1));

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string | number>('');
  const [accountId, setAccountId] = useState<string | number>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [attachment, setAttachment] = useState<string | undefined>();
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const [isScanning, setIsScanning] = useState(mode === 'scan');
  const [isListening, setIsListening] = useState(mode === 'voice');

  useEffect(() => {
    if (mode === 'scan') {
      const timer = setTimeout(() => {
        setIsScanning(false);
        setAmount('42.50');
        setTitle('Starbucks Coffee');
        if (categories) {
           const coffee = categories.find(c => c.name.toLowerCase().includes('coffee') || c.name.toLowerCase().includes('food'));
           if (coffee) setCategoryId(coffee.id!);
        }
        toast.info('Receipt scanned successfully');
      }, 3000);
      return () => clearTimeout(timer);
    }
    
    if (mode === 'voice') {
      const timer = setTimeout(() => {
        setIsListening(false);
        setAmount('1200');
        setTitle('Rent for May');
        setType('expense');
        if (categories) {
          const rent = categories.find(c => c.name.toLowerCase().includes('rent'));
          if (rent) setCategoryId(rent.id!);
        }
        toast.info('Voice command processed');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [mode, categories]);

  useEffect(() => {
    if (id) {
      db.transactions.get(Number(id)).then(t => {
        if (t) {
          setType(t.type);
          setAmount(t.amount.toString());
          setTitle(t.title);
          setCategoryId(t.categoryId);
          setAccountId(t.accountId);
          setDate(new Date(t.date).toISOString().split('T')[0]);
          setNote(t.note || '');
          setAttachment(t.attachment);
          setIsRecurring(!!t.isRecurring);
          setRecurringInterval(t.recurringInterval || 'monthly');
        }
      });
    }
  }, [id]);

  useEffect(() => {
    if (categories && !categoryId) {
      const defaultCat = categories.find(c => c.type === type && !c.parentId);
      if (defaultCat) setCategoryId(defaultCat.id!);
    }
  }, [categories, type]);

  useEffect(() => {
    if (accounts && !accountId && accounts.length > 0) {
      setAccountId(accounts[0].id!);
    }
  }, [accounts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
        toast.success('Image attached');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !title || !categoryId || !accountId) {
      toast.error('Please fill all required fields');
      return;
    }

    const data: Transaction = {
      title,
      amount: parseFloat(amount),
      type,
      categoryId: Number(categoryId),
      accountId: Number(accountId),
      date: new Date(date),
      note,
      attachment,
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined
    };

    try {
      if (id) {
         await db.transactions.put({ ...data, id: Number(id) });
         toast.success('Transaction updated');
      } else {
         await db.transactions.add(data);
         toast.success('Transaction saved');
      }
      navigate(-1);
    } catch (err) {
      toast.error('Failed to save transaction');
    }
  };

  if (isScanning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 bg-indigo-600 rounded-[2rem] text-white p-8">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-32 h-32 rounded-3xl bg-white/10 flex items-center justify-center border border-white/20"
        >
           <ScanLine className="w-16 h-16" />
        </motion.div>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">AI Receipt Scanning</h2>
          <p className="text-indigo-100/60 text-sm">Identifying amount, merchant and date...</p>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
           <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className="w-1/3 h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
           />
        </div>
      </div>
    );
  }

  if (isListening) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 bg-violet-600 rounded-[2rem] text-white p-8">
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 bg-white rounded-full"
          />
          <div className="relative w-24 h-24 rounded-full bg-white flex items-center justify-center text-violet-600 shadow-xl">
             <Mic className="w-12 h-12" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Listening...</h2>
          <p className="text-violet-100/60 text-sm">"Spent 1200 on rent for May"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{id ? 'Edit' : 'Add'} Transaction</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex p-1 bg-gray-100 rounded-2xl">
        <button 
          onClick={() => setType('expense')}
          className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all", type === 'expense' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500")}
        >
          Expense
        </button>
        <button 
          onClick={() => setType('income')}
          className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all", type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500")}
        >
          Income
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Amount</p>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl font-bold text-gray-400">{settings?.currency || '$'}</span>
            <input 
              type="number" 
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="text-5xl font-bold w-full max-w-[220px] text-center focus:outline-none placeholder:text-gray-200 bg-transparent"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Tag className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                placeholder="What was it for?" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="flex-1 text-sm font-bold focus:outline-none placeholder:text-gray-300"
                required
              />
            </div>
            
            <div className="h-px bg-gray-50" />

            <div className="grid grid-cols-2 gap-4">
               <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <input 
                  type="date" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="flex-1 text-xs font-bold focus:outline-none bg-transparent appearance-none"
                  required
                />
               </div>
               
               <div className="flex items-center space-x-3 border-l border-gray-100 pl-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <WalletIcon className="w-5 h-5" />
                </div>
                <select 
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="flex-1 text-xs font-bold focus:outline-none bg-transparent appearance-none truncate"
                  required
                >
                  {accounts?.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
               </div>
            </div>
          </div>

          {/* Recurring Toggle */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
                  <RefreshCcw className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-sm font-bold text-gray-900">Recurring</p>
                   <p className="text-[10px] text-gray-400 font-medium">Automatic entry</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  isRecurring ? "bg-indigo-600" : "bg-gray-200"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  isRecurring ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            {isRecurring && (
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(interval => (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => setRecurringInterval(interval)}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-bold uppercase rounded-xl transition-all border",
                      recurringInterval === interval 
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                        : "bg-white border-gray-100 text-gray-400"
                    )}
                  >
                    {interval}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 px-1">
             <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Category</p>
             <div className="grid grid-cols-4 gap-3">
                {categories?.filter(c => c.type === type && !c.parentId).map(c => {
                  const IconComp = getIconByName(c.icon || 'Tag');
                  return (
                    <button 
                      key={c.id} 
                      type="button"
                      onClick={() => setCategoryId(c.id!)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all space-y-2",
                        categoryId === c.id || categories.find(cat => cat.id === categoryId)?.parentId === c.id ? "border-indigo-600 bg-indigo-50 shadow-inner" : "border-transparent bg-white shadow-sm"
                      )}
                    >
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: c.color }}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-700 truncate w-full text-center">{c.name}</span>
                    </button>
                  );
                })}
             </div>
          </div>

          {/* Subcategories */}
          {categories?.some(c => c.parentId === categoryId || c.parentId === categories.find(cat => cat.id === categoryId)?.parentId) && (
            <div className="space-y-3 px-1">
               <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Sub-category</p>
               <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c.parentId === categoryId || (c.parentId && c.parentId === categories.find(cat => cat.id === categoryId)?.parentId)).map(c => (
                    <button 
                      key={c.id} 
                      type="button"
                      onClick={() => setCategoryId(c.id!)}
                      className={cn(
                        "px-4 py-2 rounded-full border text-xs font-bold transition-all shadow-sm",
                        categoryId === c.id ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-gray-50 bg-white text-gray-500"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
               </div>
            </div>
          )}

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 space-y-4">
            <div className="flex items-center space-x-3 text-gray-400">
              <FileText className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Notes & Attachments</span>
            </div>
            
            <textarea 
              placeholder="Add more details..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full text-sm font-medium focus:outline-none min-h-[80px] bg-gray-50/50 rounded-2xl p-4"
            />

            <div className="flex items-center space-x-3">
               {attachment ? (
                 <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-sm ring-2 ring-indigo-100">
                    <img src={attachment} className="w-full h-full object-cover" alt="receipt" />
                    <button 
                      type="button" 
                      onClick={() => setAttachment(undefined)}
                      className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                 </div>
               ) : (
                 <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-indigo-200 transition-colors"
                 >
                   <Camera className="w-5 h-5 mb-1" />
                   <span className="text-[8px] font-bold uppercase tracking-tighter">Add Photo</span>
                 </button>
               )}
               <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
               />
               <div className="flex-1 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Attachment</p>
                  <p className="text-[10px] text-gray-300 font-medium leading-tight">Keep a photo of your receipt for tax or returns.</p>
               </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-4 left-0 right-0 px-2 lg:relative lg:bottom-0">
          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-bold shadow-xl shadow-indigo-100 active:scale-[0.98] transition-transform flex items-center justify-center space-x-2"
          >
            <Check className="w-5 h-5" />
            <span>Save Transaction</span>
          </button>
        </div>
      </form>
    </div>
  );
}

