import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Account } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { ArrowLeft, Plus, Wallet, Trash2, Edit2, Check, X, Palette, Type, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORY_ICONS, getIconByName } from '../lib/icons';

import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ManageAccounts() {
  const navigate = useNavigate();
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const settings = useLiveQuery(() => db.settings.get(1));
  const transactions = useLiveQuery(() => db.transactions.toArray());

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);
  
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [icon, setIcon] = useState('Wallet');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const resetForm = () => {
    setName('');
    setBalance('');
    setColor('#6366F1');
    setIcon('Wallet');
    setIsAdding(false);
    setEditingId(null);
    setShowIconPicker(false);
  };

  const handleSave = async () => {
    if (!name) {
      toast.error('Wallet name is required');
      return;
    }

    // Unique name validation
    const exists = accounts?.find(a => a.name.toLowerCase() === name.toLowerCase() && a.id !== editingId);
    if (exists) {
      toast.error('A wallet with this name already exists');
      return;
    }

    const data: Account = {
      name,
      balance: parseFloat(balance) || 0,
      color,
      icon
    };

    try {
      if (editingId) {
        await db.accounts.update(editingId, data);
        toast.success('Wallet updated successfully');
      } else {
        await db.accounts.add(data);
        toast.success('Wallet created successfully');
      }
      resetForm();
    } catch (error) {
      toast.error('Failed to save wallet');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const numId = Number(confirmDelete);
      if (!isNaN(numId)) {
        await db.accounts.delete(numId);
        toast.success('Wallet deleted successfully');
      }
    } catch (err) {
      toast.error('Failed to delete wallet');
    } finally {
      setConfirmDelete(null);
    }
  };

  const startEdit = (acc: Account) => {
    setName(acc.name);
    setBalance(acc.balance.toString());
    setColor(acc.color);
    setIcon(acc.icon || 'Wallet');
    setEditingId(acc.id!);
    setIsAdding(true);
  };

  const getAccountBalance = (acc: Account) => {
    const accTransactions = transactions?.filter(t => Number(t.accountId) === Number(acc.id)) || [];
    const total = accTransactions.reduce((sum, t) => {
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, acc.balance);
    return total;
  };

  return (
    <div className="space-y-6 pb-20">
      <ConfirmDialog 
        isOpen={!!confirmDelete}
        title="Delete Wallet?"
        message="All associated transactions will remain but will lose their link to this wallet."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      <div className="flex items-center justify-between px-1">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Wallets</h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl space-y-6 relative"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Wallet' : 'New Wallet'}</h2>
                <button onClick={resetForm} className="p-2 bg-gray-100 rounded-full text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setShowIconPicker(true)}
                    className="w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-lg transition-transform active:scale-90"
                    style={{ backgroundColor: color }}
                  >
                    {React.createElement(getIconByName(icon), { className: "w-8 h-8" })}
                  </button>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Account Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Savings Account" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Initial Balance</label>
                   <input 
                      type="number" 
                      placeholder="0.00" 
                      value={balance}
                      onChange={e => setBalance(e.target.value)}
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Accent Color</label>
                   <div className="flex flex-wrap gap-3">
                      {['#6366F1', '#10B981', '#F472B6', '#F59E0B', '#EF4444', '#3B82F6', '#6B7280', '#000000'].map(c => (
                        <button 
                          key={c}
                          onClick={() => setColor(c)}
                          className={cn(
                            "w-8 h-8 rounded-full transition-all",
                            color === c ? "scale-125 ring-4 ring-offset-2 ring-gray-100" : "opacity-60 hover:opacity-100"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                   </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-bold shadow-xl shadow-indigo-100 active:scale-95 transition-transform"
              >
                {editingId ? 'Update' : 'Create'} Account
              </button>

              {showIconPicker && (
                <div className="absolute inset-0 z-10 bg-white rounded-[2.5rem] p-8 space-y-6">
                   <div className="flex items-center justify-between">
                     <h3 className="font-bold">Select Icon</h3>
                     <button onClick={() => setShowIconPicker(false)} className="p-2 bg-gray-50 rounded-full"><X className="w-4 h-4" /></button>
                   </div>
                   <div className="grid grid-cols-4 gap-4 max-h-64 overflow-y-auto no-scrollbar">
                      {CATEGORY_ICONS.map(i => (
                        <button 
                          key={i.name}
                          onClick={() => { setIcon(i.name); setShowIconPicker(false); }}
                          className={cn("p-4 rounded-2xl bg-gray-50 flex items-center justify-center transition-colors", icon === i.name ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-gray-100")}
                        >
                          <i.icon className="w-6 h-6" />
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-4 px-1">
        {accounts?.map(acc => {
          const IconComponent = getIconByName(acc.icon || 'Wallet');
          return (
            <div key={acc.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 flex items-center justify-between group hover:border-indigo-100 transition-all">
              <div className="flex items-center space-x-5">
                <div 
                  className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: acc.color }}
                >
                  <IconComponent className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{acc.name}</h4>
                  <p className="text-xs text-gray-400 font-medium">Balance: {formatCurrency(getAccountBalance(acc), settings?.currency)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                 <button onClick={() => startEdit(acc)} className="p-3 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-2xl transition-colors">
                    <Edit2 className="w-5 h-5" />
                 </button>
                 <button onClick={() => setConfirmDelete(acc.id!)} className="p-3 bg-gray-50 text-gray-400 hover:text-rose-600 rounded-2xl transition-colors">
                    <Trash2 className="w-5 h-5" />
                 </button>
              </div>
            </div>
          );
        })}
        
        {accounts?.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
             <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No wallets found</p>
          </div>
        )}
      </div>
    </div>
  );
}

