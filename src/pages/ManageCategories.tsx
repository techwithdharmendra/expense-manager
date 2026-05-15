import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Category, TransactionType } from '../types';
import { cn } from '../lib/utils';
import { ArrowLeft, Plus, Tag, Trash2, Edit2, Check, X, Palette, Type, ChevronRight, Layers, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORY_ICONS, getIconByName } from '../lib/icons';

import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ManageCategories() {
  const navigate = useNavigate();
  const categories = useLiveQuery(() => db.categories.toArray());

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [activeType, setActiveType] = useState<TransactionType>('expense');
  const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);
  
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [icon, setIcon] = useState('Tag');
  const [parentId, setParentId] = useState<string | number | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const resetForm = () => {
    setName('');
    setColor('#6366F1');
    setIcon('Tag');
    setParentId(null);
    setIsAdding(false);
    setEditingId(null);
    setShowIconPicker(false);
  };

  const handleSave = async () => {
    if (!name) {
      toast.error('Category name is required');
      return;
    }

    // Unique name validation within same level and type
    const exists = categories?.find(c => 
      c.name.toLowerCase() === name.toLowerCase() && 
      c.type === activeType &&
      c.parentId === (parentId || undefined) && 
      c.id !== editingId
    );
    if (exists) {
      toast.error('A category with this name already exists at this level');
      return;
    }

    const data: Category = {
      name,
      color,
      type: activeType,
      icon,
      parentId: parentId || undefined
    };

    try {
      if (editingId) {
        await db.categories.update(editingId, data);
        toast.success('Category updated successfully');
      } else {
        await db.categories.add(data);
        toast.success('Category created successfully');
      }
      resetForm();
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const numId = Number(confirmDelete);
      if (!isNaN(numId)) {
        await db.categories.delete(numId);
        toast.success('Category deleted successfully');
      }
    } catch (err) {
      toast.error('Failed to delete category');
    } finally {
      setConfirmDelete(null);
    }
  };

  const startEdit = (cat: Category) => {
    setName(cat.name);
    setColor(cat.color);
    setIcon(cat.icon || 'Tag');
    setActiveType(cat.type);
    setParentId(cat.parentId || null);
    setEditingId(cat.id!);
    setIsAdding(true);
  };

  const mainCategories = categories?.filter(c => c.type === activeType && !c.parentId) || [];

  return (
    <div className="space-y-6 pb-6">
      <ConfirmDialog 
        isOpen={!!confirmDelete}
        title="Delete Category?"
        message="Sub-categories and transactions will lose their linkage to this category."
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Categories</h1>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-90 transition-all"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex p-1 bg-gray-100 rounded-2xl">
        <button 
          onClick={() => setActiveType('expense')}
          className={cn("flex-1 py-2.5 text-xs font-bold rounded-xl transition-all", activeType === 'expense' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500")}
        >
          Expenses
        </button>
        <button 
          onClick={() => setActiveType('income')}
          className={cn("flex-1 py-2.5 text-xs font-bold rounded-xl transition-all", activeType === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500")}
        >
          Income
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
                <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Category' : 'New Category'}</h2>
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
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Category Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Coffee" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {!parentId && !editingId && (
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Parent Category (Optional)</label>
                    <div className="relative">
                      <select 
                        value={parentId || ''}
                        onChange={e => setParentId(e.target.value || null)}
                        className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-100 appearance-none"
                      >
                        <option value="">None (Top Level)</option>
                        {mainCategories.map(c => (
                          <option key={c.id} value={c.id}>Sub-category of {c.name}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Accent Color</label>
                   <div className="flex flex-wrap gap-2.5">
                      {['#FF6B6B', '#4D96FF', '#FFD93D', '#6BCB77', '#FF4D4D', '#8B5CF6', '#10B981', '#000000'].map(c => (
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
                {editingId ? 'Update' : 'Create'} Category
              </button>

              {showIconPicker && (
                <div className="absolute inset-0 z-10 bg-white rounded-xl p-6 space-y-4">
                   <div className="flex items-center justify-between">
                     <h3 className="font-bold text-sm">Select Icon</h3>
                     <button onClick={() => setShowIconPicker(false)} className="p-1.5 bg-gray-50 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                   </div>
                   <div className="grid grid-cols-4 gap-3 max-h-60 overflow-y-auto no-scrollbar">
                      {CATEGORY_ICONS.map(i => (
                        <button 
                          key={i.name}
                          onClick={() => { setIcon(i.name); setShowIconPicker(false); }}
                          className={cn("p-3 rounded-xl bg-gray-50 flex items-center justify-center transition-colors", icon === i.name ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-gray-100")}
                        >
                          <i.icon className="w-5 h-5" />
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-3 px-1">
        {mainCategories.map(cat => {
          const IconComponent = getIconByName(cat.icon || 'Tag');
          return (
            <div key={cat.id} className="space-y-2">
              <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-50 flex items-center justify-between group">
                <div className="flex items-center space-x-3.5">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: cat.color }}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">{cat.name}</h4>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => {
                      resetForm();
                      setParentId(cat.id!);
                      setIsAdding(true);
                    }}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"
                    title="Add Sub-category"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => startEdit(cat)} className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-lg">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(cat.id!)} className="p-2 bg-gray-50 text-gray-400 hover:text-rose-600 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-categories */}
              <div className="pl-6 space-y-2">
                {categories?.filter(c => c.parentId === cat.id).map(sub => (
                   <div key={sub.id} className="bg-white/50 rounded-xl p-2.5 border border-gray-50 flex items-center justify-between group">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                        <span className="text-xs font-bold text-gray-600">{sub.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button onClick={() => startEdit(sub)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(sub.id!)} className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                   </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

