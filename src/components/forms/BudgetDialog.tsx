import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, DollarSign, Sparkles } from 'lucide-react';

interface BudgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
  onUpdate: (newAmount: number) => void;
}

export const BudgetDialog: React.FC<BudgetDialogProps> = ({
  isOpen,
  onClose,
  currentBudget,
  onUpdate,
}) => {
  const [amount, setAmount] = useState(currentBudget);

  React.useEffect(() => {
    if (isOpen) {
      setAmount(currentBudget);
    }
  }, [isOpen, currentBudget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(amount);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-hidden"
          >
            {/* Signature Gemini Gradient */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-400/20 blur-[60px] rounded-full" />
            
            <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="text-cyan-600" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Spending Limit</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Financial Guardrails</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 relative z-10">
              <div className="space-y-6 sm:space-y-8">
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                      R
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-gray-50 border-none rounded-3xl px-14 py-5 sm:py-6 text-2xl sm:text-3xl font-black text-gray-900 focus:ring-4 focus:ring-cyan-500/10 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                
                <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 rounded-2xl border border-blue-100">
                  <Sparkles size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] sm:text-[11px] text-blue-700 font-bold leading-tight">
                    Gemini Tip: Users who set strict limits report a 25% better overall night satisfaction score.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[500, 1000, 2500].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className="py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-xs sm:text-sm font-bold text-gray-600 transition-all border border-transparent hover:border-gray-200"
                    >
                      R{val}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 sm:py-5 bg-gray-900 text-white rounded-[1.5rem] sm:rounded-[2rem] font-bold text-[10px] sm:text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-gray-900/20 active:scale-[0.98] transition-all"
                >
                  Set New Limit
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
