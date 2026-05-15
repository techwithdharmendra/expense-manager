
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  PieChart as PieChartIcon, 
  Wallet as WalletIcon, 
  Settings as SettingsIcon,
  Plus as PlusIcon,
  Target as TargetIcon
} from 'lucide-react';
import { db, initDefaultCategories, initDefaultSettings, initDefaultAccounts } from './db';
import { cn } from './lib/utils';
import { processRecurringTransactions } from './services/recurringService';
import PinLock from './components/PinLock';
import { useLiveQuery } from 'dexie-react-hooks';

// Pages
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Budget from './pages/Budget';
import Settings from './pages/Settings';
import AddTransaction from './pages/AddTransaction';
import ManageAccounts from './pages/ManageAccounts';
import ManageCategories from './pages/ManageCategories';

import { Toaster } from 'sonner';

function BottomNav() {
  return (
    <nav className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around px-1 z-40 pb-safe">
      <NavLink to="/" className={({ isActive }) => cn("flex flex-col items-center justify-center space-y-1 flex-1 h-full text-[10px] uppercase font-bold transition-colors", isActive ? "text-indigo-600" : "text-gray-400")}>
        <LayoutDashboard className="w-5 h-5" />
        <span>Home</span>
      </NavLink>
      <NavLink to="/analytics" className={({ isActive }) => cn("flex flex-col items-center justify-center space-y-1 flex-1 h-full text-[10px] uppercase font-bold transition-colors", isActive ? "text-indigo-600" : "text-gray-400")}>
        <PieChartIcon className="w-5 h-5" />
        <span>Stats</span>
      </NavLink>
      <div className="relative -top-6 flex-shrink-0">
        <NavLink to="/add" className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-100 active:scale-95 transition-transform ring-4 ring-white">
          <PlusIcon className="w-8 h-8" />
        </NavLink>
      </div>
      <NavLink to="/transactions" className={({ isActive }) => cn("flex flex-col items-center justify-center space-y-1 flex-1 h-full text-[10px] uppercase font-bold transition-colors", isActive ? "text-indigo-600" : "text-gray-400")}>
        <HistoryIcon className="w-5 h-5" />
        <span>History</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => cn("flex flex-col items-center justify-center space-y-1 flex-1 h-full text-[10px] uppercase font-bold transition-colors", isActive ? "text-indigo-600" : "text-gray-400")}>
        <SettingsIcon className="w-5 h-5" />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="pb-24 pt-4 px-4 min-h-screen bg-transparent"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const settings = useLiveQuery(() => db.settings.get(1));

  useEffect(() => {
    const setup = async () => {
      await initDefaultCategories();
      await initDefaultAccounts();
      await initDefaultSettings();
      await processRecurringTransactions();
      setTimeout(() => setInitialized(true), 1200);
    };
    setup();
  }, []);

  useEffect(() => {
    if (initialized && settings?.pinLock) {
      setIsLocked(true);
    }
  }, [initialized, settings?.pinLock]);

  if (!initialized) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-indigo-600 text-white overflow-hidden">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6 transform rotate-12">
           <WalletIcon className="w-10 h-10 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold tracking-tighter mb-2">Wallet Tracker</h1>
        <p className="text-indigo-200 text-sm font-medium uppercase tracking-[0.3em]">Offline First</p>
      </motion.div>
      <div className="absolute bottom-12 flex space-x-3">
         {[0, 1, 2].map(i => (
           <motion.div 
             key={i}
             animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.8, 0.2] }}
             transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
             className="w-2 h-2 bg-white rounded-full"
           />
         ))}
      </div>
    </div>
  );

  if (isLocked && settings?.pinLock) {
    return <PinLock correctPin={settings.pinLock} onSuccess={() => setIsLocked(false)} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 sm:p-4 font-sans">
        <Toaster position="top-center" richColors theme="light" />
        <div className="w-full max-w-md bg-white min-h-[100dvh] sm:min-h-[850px] sm:max-h-[850px] shadow-2xl relative overflow-hidden sm:rounded-[3rem] ring-1 ring-gray-100 flex flex-col">
          <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50/30">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
                <Route path="/transactions" element={<PageWrapper><Transactions /></PageWrapper>} />
                <Route path="/analytics" element={<PageWrapper><Analytics /></PageWrapper>} />
                <Route path="/budget" element={<PageWrapper><Budget /></PageWrapper>} />
                <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
                <Route path="/settings/accounts" element={<PageWrapper><ManageAccounts /></PageWrapper>} />
                <Route path="/settings/categories" element={<PageWrapper><ManageCategories /></PageWrapper>} />
                <Route path="/add" element={<PageWrapper><AddTransaction /></PageWrapper>} />
                <Route path="/edit/:id" element={<PageWrapper><AddTransaction /></PageWrapper>} />
              </Routes>
            </AnimatePresence>
          </div>
          <BottomNav />
        </div>
      </div>
    </BrowserRouter>
  );
}
