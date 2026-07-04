import React from 'react';
import { TrendingUp, Beer, Ticket, Plus, Search, Filter, CheckCircle2, XCircle } from 'lucide-react';
import { Transaction, User } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface BudgetViewProps {
  budget: number;
  spent: number;
  transactions: Transaction[];
  onUpdateBudget: (amount: number) => void;
  user?: User | null;
}

const MOCK_HISTORY: Transaction[] = [
  { id: '1', venueName: 'Neon Lounge', amount: 34, date: '10:24 PM', status: 'Success', category: 'Drinks', image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=100&q=80' },
  { id: '2', venueName: 'Festival Pass', amount: 85, date: '08:15 PM', status: 'Success', category: 'Entrance', image: 'https://images.unsplash.com/photo-1514525253344-984656910695?auto=format&fit=crop&w=100&q=80' },
  { id: '3', venueName: 'Electric Oasis', amount: 25, date: '07:30 PM', status: 'Declined', category: 'Service', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=100&q=80' },
];

export const BudgetView: React.FC<BudgetViewProps> = ({ budget, spent, onUpdateBudget, user }) => {
  const percentage = Math.min((spent / budget) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="p-6 space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background text-on-background">
      <header className="flex justify-between items-end">
        <div>
           <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">Night Budget</span>
           <h2 className="text-4xl font-mono font-bold tracking-tighter text-on-background">{formatCurrency(budget - spent)}</h2>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-mono font-bold text-primary">{Math.round(100 - percentage)}% Left</span>
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Synced • Table 42</span>
        </div>
      </header>

      {/* Main Ring Chart Card */}
      <section className="relative w-full flex flex-col items-center mt-4">
        <div className="bg-surface-container border border-outline relative w-full p-8 rounded-3xl shadow-2xl flex flex-col items-center">
          <div className="relative w-56 h-56 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                className="text-surface-container-high stroke-[6]"
                fill="none"
                stroke="currentColor"
              />
              <motion.circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ strokeDasharray: circumference }}
                className={cn(
                  "transition-all duration-1000",
                  percentage > 90 ? "text-error" : "text-primary"
                )}
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] font-black uppercase text-on-surface-variant tracking-[0.3em] mb-1">Spent</span>
               <span className="text-3xl font-mono font-black text-on-background">{formatCurrency(spent)}</span>
               <div className={cn(
                 "flex items-center gap-1 mt-2 font-black text-[10px] uppercase tracking-widest",
                 percentage > 90 ? "text-error" : "text-on-surface-variant"
               )}>
                 <span>{Math.round(percentage)}% Alcohol Tax Incl.</span>
               </div>
            </div>
          </div>

          <div className="w-full grid grid-cols-1 gap-3 mt-8">
             <div className="bg-surface border border-outline p-4 rounded-xl flex flex-col gap-1">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Budget Limit</span>
                   <span className="text-[10px] font-black text-primary uppercase">
                     {user?.statusTier || user?.tier || 'BRONZE'} TIER
                   </span>
                </div>
                <span className="text-lg font-mono font-black text-on-background">{formatCurrency(budget)}</span>
             </div>
          </div>
        </div>
      </section>

      {/* Transaction History */}
      <section className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-on-surface-variant">History Feed</h3>
          <Filter size={16} className="text-on-surface-variant opacity-50" />
        </div>

        <div className="space-y-3">
          {MOCK_HISTORY.map((t) => (
            <div key={t.id} className="bg-surface-container p-4 rounded-xl border border-outline flex items-center gap-4 active:bg-surface-container-high transition-all">
              <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center font-bold text-amber-500/50 text-xl overflow-hidden grayscale">
                 <img src={t.image || undefined} className="w-full h-full object-cover opacity-50" alt="" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-on-background">{t.venueName}</h4>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{t.category} • {t.date}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold text-on-background">-{formatCurrency(t.amount)}</p>
                <div className={cn(
                  "inline-flex items-center text-[9px] font-black uppercase tracking-widest mt-1",
                  t.status === 'Success' ? "text-emerald-500" : "text-error"
                )}>
                  {t.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button className="fixed right-6 bottom-24 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-outline amber-glow font-black">
        <Plus size={28} />
      </button>
    </div>
  );
};
