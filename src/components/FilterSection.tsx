
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Filter, 
  Wallet, 
  Tag, 
  Calendar, 
  X, 
  Search,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface FilterState {
  type: 'all' | 'income' | 'expense' | 'transfer';
  accountId: string | 'all';
  categoryId: string | 'all';
  dateRange: 'month' | 'week' | 'year' | 'all' | 'custom';
  startDate: string;
  endDate: string;
  searchTerm: string;
}

interface FilterSectionProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  accounts: any[];
  categories: any[];
  showSearch?: boolean;
  className?: string;
  showTypeFilter?: boolean;
}

export default function FilterSection({ 
  filters, 
  onFilterChange, 
  accounts, 
  categories,
  showSearch = true,
  className,
  showTypeFilter = true
}: FilterSectionProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const updateFilter = (updates: Partial<FilterState>) => {
    onFilterChange({ ...filters, ...updates });
  };

  const filteredCategories = React.useMemo(() => {
    if (filters.type === 'all') return categories;
    return categories.filter(c => c.type === filters.type);
  }, [categories, filters.type]);

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.accountId !== 'all') count++;
    if (filters.categoryId !== 'all') count++;
    if (filters.dateRange !== 'month') count++; // 'month' is default
    if (filters.searchTerm) count++;
    return count;
  }, [filters]);

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {showSearch && (
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search..."
              value={filters.searchTerm}
              onChange={e => updateFilter({ searchTerm: e.target.value })}
              className="w-24 sm:w-40 md:w-60 bg-gray-50/50 border border-gray-100/80 rounded-xl py-2 pl-8 pr-3 text-[10px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white focus:w-40 sm:focus:w-52 md:focus:w-72 transition-all shadow-sm"
            />
          </div>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "p-2 sm:p-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 relative", 
            isOpen ? "bg-indigo-600 text-white" : "bg-white border border-gray-100 text-gray-500 hover:bg-gray-50"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          <span className="text-[9px] font-bold uppercase tracking-widest hidden md:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold border border-white",
              isOpen ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
            )}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: 'auto', opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] max-w-sm origin-top-right overflow-hidden shadow-2xl rounded-2xl"
          >
            <div className="bg-white p-5 border border-gray-100 space-y-5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adjust Filters</h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {showTypeFilter && (
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Transaction Type</label>
                  <div className="flex p-1 bg-gray-50 rounded-xl">
                    {(['all', 'income', 'expense', 'transfer'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => updateFilter({ type: f })}
                        className={cn(
                          "flex-1 py-1.5 text-[9px] font-bold rounded-lg capitalize transition-all",
                          filters.type === f ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Wallet</label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <select 
                      value={filters.accountId}
                      onChange={e => updateFilter({ accountId: e.target.value })}
                      className="w-full pl-8 pr-4 py-2 bg-gray-50 rounded-xl text-[10px] font-bold text-gray-700 appearance-none focus:outline-none"
                    >
                      <option value="all">All Wallets</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Category</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <select 
                      value={filters.categoryId}
                      onChange={e => updateFilter({ categoryId: e.target.value })}
                      className="w-full pl-8 pr-4 py-2 bg-gray-50 rounded-xl text-[10px] font-bold text-gray-700 appearance-none focus:outline-none"
                    >
                      <option value="all">All Categories</option>
                      {filteredCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Date Period</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <select 
                      value={filters.dateRange}
                      onChange={e => updateFilter({ dateRange: e.target.value as any })}
                      className="w-full pl-8 pr-4 py-2 bg-gray-50 rounded-xl text-[10px] font-bold text-gray-700 appearance-none focus:outline-none"
                    >
                      <option value="month">This Month</option>
                      <option value="week">Past Week</option>
                      <option value="year">Current Year</option>
                      <option value="custom">Specific Dates</option>
                      <option value="all">Beginning of Time</option>
                    </select>
                  </div>
                </div>

                {filters.dateRange === 'custom' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-2 grid grid-cols-2 gap-3 pt-2 border-t border-gray-50"
                  >
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Start</label>
                      <input 
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => updateFilter({ startDate: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-[10px] font-bold text-gray-700 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">End</label>
                      <input 
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => updateFilter({ endDate: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-[10px] font-bold text-gray-700 focus:outline-none"
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
