
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Delete, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface PinLockProps {
  correctPin: string;
  onSuccess: () => void;
}

import { t } from '../lib/i18n';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

export default function PinLock({ correctPin, onSuccess }: PinLockProps) {
  const settings = useLiveQuery(() => db.settings.get(1));
  const lang = settings?.language;

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 500);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-12 text-center"
      >
        <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t('appLock', lang) || 'Enter PIN'}</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{t('appLockDesc', lang) || 'Locked for your safety'}</p>
      </motion.div>

      <div className="flex space-x-4 mb-16">
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            className={cn(
              "w-4 h-4 rounded-full border-2 transition-all duration-200",
              pin.length > i ? "bg-indigo-600 border-indigo-600 scale-110" : "border-gray-200 bg-transparent"
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-8 w-full max-w-[280px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            onClick={() => handlePress(num)}
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-gray-700 active:bg-gray-100 active:scale-90 transition-all"
          >
            {num}
          </button>
        ))}
        <div />
        <button
          onClick={() => handlePress('0')}
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-gray-700 active:bg-gray-100 active:scale-90 transition-all"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="w-16 h-16 rounded-full flex items-center justify-center text-gray-400 active:bg-gray-100 active:scale-90 transition-all"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      <div className="mt-12">
        <button className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Forgot PIN?</button>
      </div>
    </div>
  );
}
