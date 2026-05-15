
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TriangleAlert, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info'
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative space-y-4"
          >
            <div className="flex items-center space-x-3 text-gray-900 mb-2">
              <div className={cn(
                "p-2 rounded-xl",
                variant === 'danger' ? "bg-rose-50 text-rose-500" : "bg-indigo-50 text-indigo-600"
              )}>
                <TriangleAlert className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg">{title}</h3>
            </div>
            
            <p className="text-sm text-gray-500 leading-relaxed">
              {message}
            </p>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  "flex-1 py-3 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform",
                  variant === 'danger' ? "bg-rose-500 shadow-rose-100 shadow-lg" : "bg-indigo-600 shadow-indigo-100 shadow-lg"
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
