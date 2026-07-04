import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { MenuItem } from '../types';

// Mock menu items for now
const MOCK_MENU: MenuItem[] = [
  { id: 'test-paystack', name: 'Paystack Test Item', price: 10, category: 'Premium Selection', description: 'Test item for Paystack billing verification.', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400', is_available: true },
  { id: '1', name: 'Neon Gin Tonic', price: 95, category: 'Gin', description: 'Electric neon gin.', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400', is_available: true },
  { id: '2', name: 'Gold Rush Shot', price: 60, category: 'Drinks', description: 'Shimmering gold tequila.', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400', is_available: true },
];

export const WaytaMenu: React.FC<{ 
  onViewChange: (view: string) => void;
  theme?: 'light' | 'dark';
}> = ({ onViewChange, theme }) => {
    const isDark = theme === 'dark';
    const venueName = "Neon Nights";
    const venueLocation = "Johannesburg, SA";
    const budgetRemaining = 75; // R
    const totalCart = 250;

    return (
        <div className={cn("flex flex-col h-screen", isDark ? "bg-black text-white" : "bg-background text-on-background")}>
            <header className="p-4 border-b border-outline">
                <h1 className="text-2xl font-black tracking-tight text-primary uppercase font-display">{venueName}</h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{venueLocation}</p>
                <div className="mt-4">
                    <div className="flex justify-between text-[9px] mb-1.5 font-black uppercase tracking-[0.2em] text-on-surface-variant">
                        <span>Budget Mesh</span>
                        <span className="text-primary">R{budgetRemaining} remaining</span>
                    </div>
                    <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden border border-outline">
                        <div className="h-full bg-secondary shadow-[0_0_10px_rgba(255,215,0,0.3)]" style={{ width: '60%' }}></div>
                    </div>
                </div>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {MOCK_MENU.map(item => (
                    <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-surface-container rounded-2xl p-4 flex gap-4 border border-outline"
                    >
                        <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover grayscale" />
                        <div>
                            <h3 className="font-black uppercase text-sm tracking-tight">{item.name}</h3>
                            <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest leading-relaxed mt-1">{item.description}</p>
                            <p className="text-primary font-black mt-2">R{item.price}</p>
                        </div>
                    </motion.div>
                ))}
            </main>

            <footer className="p-4 border-t border-outline bg-background/80 backdrop-blur-md">
                <button 
                    onClick={() => onViewChange('wayta-checkout')}
                    className="w-full bg-primary text-black font-black py-4 rounded-2xl flex justify-between px-6 items-center shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                >
                    <span className="uppercase tracking-widest text-xs">View Pulse Cart</span>
                    <span className="font-mono">R{totalCart}</span>
                </button>
            </footer>
        </div>
    );
};
