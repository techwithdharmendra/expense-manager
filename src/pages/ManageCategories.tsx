import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Category, TransactionType } from '../types';
import { cn } from '../lib/utils';
import { ArrowLeft, Plus, Tag, Trash2, Edit2, X, ChevronRight, GripVertical, FolderTree } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORY_ICONS, getIconByName } from '../lib/icons';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ManageCategories() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<TransactionType>('expense');
  
  const categoriesLive = useLiveQuery(
    () => db.categories.where('type').equals(activeType).filter(c => !c.parentId).toArray(),
    [activeType]
  );
  
  const [mainCategories, setMainCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (categoriesLive) {
      setMainCategories([...categoriesLive].sort((a,b) => (a.order || 0) - (b.order || 0)));
    }
  }, [categoriesLive]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);
  
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [icon, setIcon] = useState('Tag');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const resetForm = () => {
    setName('');
    setColor('#6366F1');
    setIcon('Tag');
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
    const exists = mainCategories.find(c => 
      c.name.toLowerCase() === name.toLowerCase() && 
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
      order: mainCategories.length
    };

    try {
      if (editingId) {
        const existing = mainCategories.find(c => c.id === editingId);
        if (existing && existing.order !== undefined) data.order = existing.order;
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
    setEditingId(cat.id!);
    setIsAdding(true);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(mainCategories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setMainCategories(items);
    
    try {
      const updates = items.map((item, index) => ({
         ...item,
         order: index
      }));
      await db.categories.bulkPut(updates);
    } catch (err) {
       toast.error('Failed to reorder categories');
       if (categoriesLive) {
         setMainCategories([...categoriesLive].sort((a,b) => (a.order || 0) - (b.order || 0)));
       }
    }
  };

  return (
    <div className="space-y-6 pb-6 mt-safe">
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

      <div className="px-1">
        <div className="flex p-1 bg-gray-100 rounded-2xl">
          <button 
            onClick={() => setActiveType('expense')}
            className={cn("flex-1 py-2.5 text-sm font-bold rounded-xl transition-all", activeType === 'expense' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500")}
          >
            Expenses
          </button>
          <button 
            onClick={() => setActiveType('income')}
            className={cn("flex-1 py-2.5 text-sm font-bold rounded-xl transition-all", activeType === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500")}
          >
            Income
          </button>
        </div>
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
        <Droppable droppableId="maincategories">
          {(provided) => (
             <div className="space-y-3 px-1" {...provided.droppableProps} ref={provided.innerRef}>
               {mainCategories.map((cat, index) => {
                 const IconComponent = getIconByName(cat.icon || 'Tag');
                 return (
                   <Draggable key={String(cat.id)} draggableId={String(cat.id)} index={index}>
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
                             className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                             style={{ backgroundColor: cat.color }}
                           >
                             <IconComponent className="w-6 h-6" />
                           </div>
                           <h4 className="font-bold text-sm text-gray-900 truncate max-w-[100px] sm:max-w-full">{cat.name}</h4>
                         </div>
                         <div className="flex items-center space-x-1.5 flex-shrink-0">
                           <button 
                             onClick={() => navigate(`/settings/categories/${cat.id}`)}
                             className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors"
                             title="Manage Sub-categories"
                           >
                             <FolderTree className="w-4 h-4" />
                           </button>
                           <button onClick={() => startEdit(cat)} className="p-2.5 bg-gray-50 text-gray-500 hover:text-indigo-600 rounded-xl transition-colors">
                             <Edit2 className="w-4 h-4" />
                           </button>
                           <button onClick={() => setConfirmDelete(cat.id!)} className="p-2.5 bg-gray-50 text-gray-500 hover:text-rose-600 rounded-xl transition-colors">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       </div>
                     )}
                   </Draggable>
                 );
               })}
               {provided.placeholder}
             </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

