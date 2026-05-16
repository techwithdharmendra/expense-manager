import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Category, TransactionType } from '../types';
import { cn } from '../lib/utils';
import { ArrowLeft, Plus, Tag, Trash2, Edit2, Check, X, Palette, Type, ChevronRight, Layers, Search, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORY_ICONS, getIconByName } from '../lib/icons';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ManageSubCategories() {
  const { parentId } = useParams<{ parentId: string }>();
  const navigate = useNavigate();
  
  const parentIdNum = Number(parentId);
  
  const parentCategory = useLiveQuery(() => db.categories.get(parentIdNum), [parentIdNum]);
  const categoriesLive = useLiveQuery(() => db.categories.where('parentId').equals(parentIdNum).toArray(), [parentIdNum]);
  
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (categoriesLive) {
      setCategories([...categoriesLive].sort((a,b) => (a.order || 0) - (b.order || 0)));
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
    setColor(parentCategory?.color || '#6366F1');
    setIcon('Tag');
    setIsAdding(false);
    setEditingId(null);
    setShowIconPicker(false);
  };

  const handleSave = async () => {
    if (!name) {
      toast.error('Sub-category name is required');
      return;
    }

    const type = parentCategory?.type || 'expense';

    const exists = categories.find(c => 
      c.name.toLowerCase() === name.toLowerCase() && 
      c.id !== editingId
    );
    if (exists) {
      toast.error('A sub-category with this name already exists here');
      return;
    }

    const data: Category = {
      name,
      color,
      type,
      icon,
      parentId: parentIdNum,
      order: categories.length
    };

    try {
      if (editingId) {
         // preserve order
         const existing = categories.find(c => c.id === editingId);
         if (existing && existing.order !== undefined) data.order = existing.order;
         await db.categories.update(editingId, data);
         toast.success('Sub-category updated successfully');
      } else {
         await db.categories.add(data);
         toast.success('Sub-category created successfully');
      }
      resetForm();
    } catch (error) {
      toast.error('Failed to save sub-category');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const numId = Number(confirmDelete);
      if (!isNaN(numId)) {
        await db.categories.delete(numId);
        toast.success('Sub-category deleted successfully');
      }
    } catch (err) {
      toast.error('Failed to delete sub-category');
    } finally {
      setConfirmDelete(null);
    }
  };

  const startEdit = (cat: Category) => {
    setName(cat.name);
    setColor(cat.color);
    setIcon(cat.icon || 'Tag');
    setEditingId(cat.id!);
    setIsAdding(true);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update local state temporarily
    setCategories(items);
    
    // Update DB
    try {
      const updates = items.map((item, index) => ({
         ...item,
         order: index
      }));
      await db.categories.bulkPut(updates);
    } catch (err) {
       toast.error('Failed to reorder categories');
       // Revert
       if (categoriesLive) {
         setCategories([...categoriesLive].sort((a,b) => (a.order || 0) - (b.order || 0)));
       }
    }
  };

  if (!parentCategory) return null;

  return (
    <div className="space-y-6 pb-6">
      <ConfirmDialog 
        isOpen={!!confirmDelete}
        title="Delete Sub-category?"
        message="Transactions will lose their linkage to this sub-category."
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
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{parentCategory.name}</h1>
            <p className="text-[11px] text-gray-500 font-medium">Manage Sub-categories</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setColor(parentCategory.color);
            setIsAdding(true);
          }}
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
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Sub-category' : 'New Sub-category'}</h2>
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
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Uber" 
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
                {editingId ? 'Update' : 'Create'} Sub-category
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="subcategories">
          {(provided) => (
             <div className="space-y-3 px-1" {...provided.droppableProps} ref={provided.innerRef}>
               {categories.map((cat, index) => {
                 const IconComponent = getIconByName(cat.icon || 'Tag');
                 return (
                   <Draggable key={String(cat.id)} draggableId={String(cat.id)} index={index}>
                     {(provided, snapshot) => (
                         <div 
                         ref={provided.innerRef}
                         {...provided.draggableProps}
                         className={cn(
                           "bg-white rounded-xl p-3.5 shadow-sm border border-gray-50 flex items-center justify-between relative",
                           snapshot.isDragging && "shadow-xl ring-2 ring-indigo-500 z-50 opacity-90"
                         )}
                       >
                         <div className="flex items-center space-x-3.5">
                           <div 
                             {...provided.dragHandleProps}
                             className="p-1 -ml-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                           >
                             <GripVertical className="w-5 h-5" />
                           </div>
                           <div 
                             className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                             style={{ backgroundColor: cat.color }}
                           >
                             <IconComponent className="w-5 h-5" />
                           </div>
                           <h4 className="font-bold text-sm text-gray-900">{cat.name}</h4>
                         </div>
                         <div className="flex items-center space-x-1">
                           <button onClick={() => startEdit(cat)} className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-lg">
                             <Edit2 className="w-3.5 h-3.5" />
                           </button>
                           <button onClick={() => setConfirmDelete(cat.id!)} className="p-2 bg-gray-50 text-gray-400 hover:text-rose-600 rounded-lg">
                             <Trash2 className="w-3.5 h-3.5" />
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
