import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Account } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { ArrowLeft, Plus, Wallet, Trash2, Edit2, Check, X, Palette, Type, Search, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORY_ICONS, getIconByName } from '../lib/icons';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ManageAccounts() {
  const navigate = useNavigate();
  const accountsLive = useLiveQuery(() => db.accounts.toArray());
  const settings = useLiveQuery(() => db.settings.get(1));
  const transactions = useLiveQuery(() => db.transactions.toArray());

  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (accountsLive) {
      setAccounts([...accountsLive].sort((a,b) => (a.order || 0) - (b.order || 0)));
    }
  }, [accountsLive]);

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
      icon,
      order: accounts.length
    };

    try {
      if (editingId) {
        const existing = accounts.find(a => a.id === editingId);
        if (existing && existing.order !== undefined) data.order = existing.order;
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

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(accounts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setAccounts(items);
    
    try {
      const updates = items.map((item, index) => ({
         ...item,
         order: index
      }));
      await db.accounts.bulkPut(updates);
    } catch (err) {
       toast.error('Failed to reorder wallets');
       if (accountsLive) {
         setAccounts([...accountsLive].sort((a,b) => (a.order || 0) - (b.order || 0)));
       }
    }
  };

  const getAccountBalance = (acc: Account) => {
    const accTransactions = transactions?.filter(t => 
      Number(t.accountId) === Number(acc.id) || 
      (t.type === 'transfer' && Number(t.toAccountId) === Number(acc.id))
    ) || [];
    const total = accTransactions.reduce((sum, t) => {
      if (t.type === 'transfer') {
        if (Number(t.accountId) === Number(acc.id)) {
          return sum - t.amount;
        } else if (Number(t.toAccountId) === Number(acc.id)) {
          return sum + t.amount;
        }
      }
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, acc.balance);
    return total;
  };

  return (
    <div className="space-y-6 pb-6">
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
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-white shadow-sm border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Wallets</h1>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-90 transition-all"
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
              className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4 relative"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Wallet' : 'New Wallet'}</h2>
                <button onClick={resetForm} className="p-1.5 bg-gray-100 rounded-lg text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setShowIconPicker(true)}
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-md transition-transform active:scale-90"
                    style={{ backgroundColor: color }}
                  >
                    {React.createElement(getIconByName(icon), { className: "w-7 h-7" })}
                  </button>
                  <div className="flex-1 space-y-0.5">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Account Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Savings Account" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                   <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Initial Balance</label>
                   <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      value={balance}
                      onChange={e => setBalance(e.target.value)}
                      className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-100"
                    />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Accent Color</label>
                   <div className="flex flex-wrap gap-2.5">
                      {['#6366F1', '#10B981', '#F472B6', '#F59E0B', '#EF4444', '#3B82F6', '#6B7280', '#000000'].map(c => (
                        <button 
                          key={c}
                          onClick={() => setColor(c)}
                          className={cn(
                            "w-7 h-7 rounded-full transition-all",
                            color === c ? "scale-110 ring-2 ring-offset-2 ring-gray-100" : "opacity-60 hover:opacity-100"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                   </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 active:scale-95 transition-transform"
              >
                {editingId ? 'Update' : 'Create'} Account
              </button>

              {showIconPicker && (
                <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex flex-col rounded-xl">
                   <div className="p-4 pt-5 pr-5 flex items-center justify-end shrink-0">
                     <button onClick={() => setShowIconPicker(false)} className="p-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"><X className="w-4 h-4" /></button>
                   </div>
                   <div className="flex-1 overflow-y-auto content-start px-6 pb-6 grid grid-cols-5 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                      {CATEGORY_ICONS.map(i => (
                        <button 
                          key={i.name}
                          onClick={() => { setIcon(i.name); setShowIconPicker(false); }}
                          className={cn("aspect-square rounded-xl bg-gray-50 flex items-center justify-center transition-colors hover:shadow-sm active:scale-95", icon === i.name ? "bg-indigo-600 text-white shadow-indigo-200" : "text-gray-500 hover:bg-white border border-transparent hover:border-gray-200")}
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="accounts">
          {(provided) => (
             <div className="space-y-3 px-1" {...provided.droppableProps} ref={provided.innerRef}>
               {accounts?.map((acc, index) => {
                 const IconComponent = getIconByName(acc.icon || 'Wallet');
                 return (
                   <Draggable key={String(acc.id)} draggableId={String(acc.id)} index={index}>
                     {(provided, snapshot) => (
                       <div 
                         ref={provided.innerRef}
                         {...provided.draggableProps}
                         className={cn(
                           "bg-white rounded-xl p-4 shadow-sm border border-gray-50 flex items-center justify-between relative",
                           snapshot.isDragging && "shadow-xl ring-2 ring-indigo-500 z-50 opacity-90"
                         )}
                       >
                         <div className="flex items-center space-x-3 sm:space-x-4">
                           <div 
                             {...provided.dragHandleProps}
                             className="p-1 -ml-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                           >
                             <GripVertical className="w-5 h-5" />
                           </div>
                           <div 
                             className="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center text-white shadow-sm"
                             style={{ backgroundColor: acc.color }}
                           >
                             <IconComponent className="w-6 h-6" />
                           </div>
                           <div>
                             <h4 className="font-bold text-sm text-gray-900 truncate max-w-[120px] sm:max-w-full">{acc.name}</h4>
                             <p className="text-[10px] text-gray-400 font-medium">Balance: <span className={cn(getAccountBalance(acc) >= 0 ? "text-emerald-500" : "text-rose-500")}>{formatCurrency(getAccountBalance(acc), settings?.currency)}</span></p>
                           </div>
                         </div>
                         
                         <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <button onClick={() => startEdit(acc)} className="p-2.5 bg-gray-50 text-gray-500 hover:text-indigo-600 rounded-xl transition-colors">
                               <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setConfirmDelete(acc.id!)} className="p-2.5 bg-gray-50 text-gray-500 hover:text-rose-600 rounded-xl transition-colors">
                               <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                       </div>
                     )}
                   </Draggable>
                 );
               })}
               {provided.placeholder}
               
               {accounts?.length === 0 && (
                 <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No wallets found</p>
                 </div>
               )}
             </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

