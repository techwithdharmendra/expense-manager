
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  PieChart as PieChartIcon, 
  Wallet as WalletIcon, 
  Settings as SettingsIcon,
  Plus as PlusIcon,
  Target as TargetIcon,
  Loader2
} from 'lucide-react';
import { db, initDefaultCategories, initDefaultSettings, initDefaultAccounts } from './db';
import { cn } from './lib/utils';
import PinLock from './components/PinLock';
import { useLiveQuery } from 'dexie-react-hooks';

// Lazy load Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Budget = lazy(() => import('./pages/Budget'));
const Settings = lazy(() => import('./pages/Settings'));
const AddTransaction = lazy(() => import('./pages/AddTransaction'));
const ManageAccounts = lazy(() => import('./pages/ManageAccounts'));
const ManageCategories = lazy(() => import('./pages/ManageCategories'));
const ManageSubCategories = lazy(() => import('./pages/ManageSubCategories'));

import { Toaster } from 'sonner';

function BottomNav() {
  return (
    <nav className="h-16 bg-white border-t border-gray-100 flex items-center justify-around px-2 z-40 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
      <NavLink to="/" className={({ isActive }) => cn("flex flex-col items-center justify-center space-y-0.5 flex-1 h-full text-[10px] uppercase font-bold transition-all duration-300", isActive ? "text-indigo-600 scale-105" : "text-gray-400 hover:text-gray-600")}>
        <LayoutDashboard className="w-5 h-5" />
        <span>Home</span>
      </NavLink>
      <NavLink to="/analytics" className={({ isActive }) => cn("flex flex-col items-center justify-center space-y-0.5 flex-1 h-full text-[10px] uppercase font-bold transition-all duration-300", isActive ? "text-indigo-600 scale-105" : "text-gray-400 hover:text-gray-600")}>
        <PieChartIcon className="w-5 h-5" />
        <span>Stats</span>
      </NavLink>
      <div className="relative -top-4 flex-shrink-0 px-2">
        <NavLink to="/add" className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 active:scale-90 hover:scale-105 transition-all ring-4 ring-white">
          <PlusIcon className="w-7 h-7" />
        </NavLink>
      </div>
      <NavLink to="/transactions" className={({ isActive }) => cn("flex flex-col items-center justify-center space-y-0.5 flex-1 h-full text-[10px] uppercase font-bold transition-all duration-300", isActive ? "text-indigo-600 scale-105" : "text-gray-400 hover:text-gray-600")}>
        <HistoryIcon className="w-5 h-5" />
        <span>History</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => cn("flex flex-col items-center justify-center space-y-0.5 flex-1 h-full text-[10px] uppercase font-bold transition-all duration-300", isActive ? "text-indigo-600 scale-105" : "text-gray-400 hover:text-gray-600")}>
        <SettingsIcon className="w-5 h-5" />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}

function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="pb-4 pt-3 px-4 md:px-6 min-h-full bg-transparent"
    >
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
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
      setTimeout(() => setInitialized(true), 1200);
    };
    setup();
  }, []);

  useEffect(() => {
    if (initialized && settings?.pinLock) {
      setIsLocked(true);
    }
  }, [initialized, settings?.pinLock]);

  useEffect(() => {
    if (initialized && !isLocked) {
      const checkData = async () => {
        const catCount = await db.categories.count();
        const accCount = await db.accounts.count();
        if (catCount === 0 || accCount === 0) {
           await Promise.all([initDefaultCategories(), initDefaultAccounts()]);
        }
      };
      checkData();
    }
  }, [initialized, isLocked]);

  useEffect(() => {
    if (settings) {
      if (settings.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings?.isDarkMode]);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 sm:p-4 font-sans selection:bg-indigo-100">
        <Toaster position="top-center" richColors theme="light" />
        <div className="w-full max-w-md bg-white h-[100dvh] sm:min-h-[850px] sm:max-h-[850px] shadow-2xl relative overflow-hidden sm:rounded-[3rem] ring-1 ring-gray-100 flex flex-col">
          <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50/10">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
                <Route path="/transactions" element={<PageWrapper><Transactions /></PageWrapper>} />
                <Route path="/analytics" element={<PageWrapper><Analytics /></PageWrapper>} />
                <Route path="/budget" element={<PageWrapper><Budget /></PageWrapper>} />
                <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
                <Route path="/settings/accounts" element={<PageWrapper><ManageAccounts /></PageWrapper>} />
                <Route path="/settings/categories" element={<PageWrapper><ManageCategories /></PageWrapper>} />
                <Route path="/settings/categories/:parentId" element={<PageWrapper><ManageSubCategories /></PageWrapper>} />
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
