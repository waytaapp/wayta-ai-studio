import React, { useState, useEffect } from 'react';
import { 
  Trophy, Zap, Settings, ShieldCheck, 
  RefreshCw, Save, AlertCircle, Info,
  TrendingUp, Users, Smartphone, Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import { Venue, Event, WCapConfig, WCapReward } from '../types';
import { wcapsService } from '../services/wcapsService';
import { cn } from '../lib/utils';

interface WCapsManagerProps {
  venueId: string;
  source: 'venue' | 'event';
  sourceData: Venue | Event;
  theme?: 'light' | 'dark';
}

export const WCapsManager: React.FC<WCapsManagerProps> = ({ venueId, source, sourceData, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [config, setConfig] = useState<WCapConfig>(
    sourceData.wcaps_config || {
      earnRate: 1.0,
      boostActive: false,
      boostMultiplier: 1.5,
      redemptionPin: '1234',
      isEnabled: true
    }
  );
  const [rewards, setRewards] = useState<WCapReward[]>(sourceData.wcaps_rewards || []);
  const [isSaving, setIsSaving] = useState(false);
  const [newReward, setNewReward] = useState<Partial<WCapReward>>({
    name: '',
    cost: 100,
    inventoryCap: 50
  });

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await wcapsService.updateConfig(venueId, source, config);
      alert('W-Caps configuration updated successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to update configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddReward = async () => {
    if (!newReward.name || !newReward.cost) return;
    setIsSaving(true);
    try {
      const reward: WCapReward = {
        id: Math.random().toString(36).substr(2, 9),
        name: newReward.name,
        cost: newReward.cost,
        inventoryCap: newReward.inventoryCap || 50,
        claimedCount: 0
      };
      const updatedRewards = [...rewards, reward];
      await wcapsService.updateRewards(venueId, source, updatedRewards);
      setRewards(updatedRewards);
      setNewReward({ name: '', cost: 100, inventoryCap: 50 });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveReward = async (id: string) => {
    setIsSaving(true);
    try {
      const updatedRewards = rewards.filter(r => r.id !== id);
      await wcapsService.updateRewards(venueId, source, updatedRewards);
      setRewards(updatedRewards);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-surface-container border border-outline/30 p-8 rounded-[2.5rem]">
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
             <Trophy className="text-primary" size={24} /> W-Caps Economy
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">Configure Loyalty Currency & Redemption Mesh</p>
        </div>
        <button 
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="h-12 px-8 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} 
          Commit Config
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Econ Config */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container border border-outline rounded-[2rem] p-8 space-y-8">
             <div className="flex items-center gap-3 border-b border-outline pb-6">
                <Settings size={20} className="text-primary" />
                <h4 className="text-sm font-black uppercase tracking-[0.2em]">Mesh Economics</h4>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="flex justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Earn Rate</label>
                      <span className="text-[10px] font-mono font-bold text-primary">{config.earnRate} Caps / R1</span>
                   </div>
                   <input 
                     type="range" 
                     min="0.5" 
                     max="1.5" 
                     step="0.1"
                     value={config.earnRate}
                     onChange={(e) => setConfig(prev => ({ ...prev, earnRate: parseFloat(e.target.value) }))}
                     className="w-full accent-primary h-1 bg-background rounded-full appearance-none flex-1"
                   />
                   <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest italic opacity-60">Higher rates incentivize higher average order values.</p>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Redemption PIN</label>
                      <Lock size={12} className="text-on-surface-variant/40" />
                   </div>
                   <input 
                     type="text" 
                     maxLength={4}
                     value={config.redemptionPin}
                     onChange={(e) => setConfig(prev => ({ ...prev, redemptionPin: e.target.value.replace(/\D/g, '') }))}
                     placeholder="4 Digit PIN"
                     className="w-full h-12 bg-background border border-outline rounded-xl px-4 font-mono font-black tracking-[1em] text-center outline-none focus:border-primary transition-all"
                   />
                   <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest italic opacity-60">Verified at Point of Sale for high-value rewards.</p>
                </div>
             </div>

             <div className={cn(
                "p-6 rounded-2xl border transition-all",
                config.boostActive ? "bg-primary/5 border-primary/30" : "bg-background/40 border-outline/30 grayscale opacity-60"
             )}>
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-3">
                      <Zap size={20} className={config.boostActive ? "text-primary animate-pulse" : "text-on-surface-variant"} />
                      <div>
                         <h5 className="text-[10px] font-black uppercase tracking-widest">Active Boost Campaign</h5>
                         <p className="text-[8px] font-bold text-on-surface-variant uppercase">Global earning multiplier</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => setConfig(prev => ({ ...prev, boostActive: !prev.boostActive }))}
                     className={cn(
                       "w-12 h-6 rounded-full relative transition-colors p-1",
                       config.boostActive ? "bg-primary" : "bg-outline"
                     )}
                   >
                     <motion.div 
                       animate={{ x: config.boostActive ? 24 : 0 }}
                       className="w-4 h-4 bg-white rounded-full shadow-lg"
                     />
                   </button>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Multiplier</label>
                      <span className="text-[10px] font-mono font-bold text-primary">{config.boostMultiplier}x Yield</span>
                   </div>
                   <input 
                     type="range" 
                     min="1.0" 
                     max="3.0" 
                     step="0.5"
                     disabled={!config.boostActive}
                     value={config.boostMultiplier}
                     onChange={(e) => setConfig(prev => ({ ...prev, boostMultiplier: parseFloat(e.target.value) }))}
                     className="w-full accent-primary h-1 bg-background rounded-full appearance-none flex-1"
                   />
                </div>
             </div>
          </div>

          <div className="bg-surface-container border border-outline rounded-[2rem] p-8 space-y-6">
             <div className="flex items-center gap-3 border-b border-outline pb-6">
                <Trophy size={20} className="text-primary" />
                <h4 className="text-sm font-black uppercase tracking-[0.2em]">Reward Mesh</h4>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-background/40 border border-outline/30 rounded-2xl p-6 space-y-4 border-dashed">
                   <p className="text-[10px] font-black uppercase tracking-widest text-primary">Add New Reward</p>
                   <div className="space-y-3">
                      <input 
                        placeholder="Reward Name (e.g. Free Beer)"
                        value={newReward.name}
                        onChange={e => setNewReward(p => ({ ...p, name: e.target.value }))}
                        className="w-full h-10 bg-surface-container border border-outline rounded-xl px-4 text-xs font-bold outline-none focus:border-primary"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest opacity-40 ml-1">Cost (Caps)</label>
                          <input 
                            type="number"
                            value={newReward.cost}
                            onChange={e => setNewReward(p => ({ ...p, cost: parseInt(e.target.value) }))}
                            className="w-full h-10 bg-surface-container border border-outline rounded-xl px-4 text-xs font-bold outline-none focus:border-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest opacity-40 ml-1">Inventory Cap</label>
                          <input 
                            type="number"
                            value={newReward.inventoryCap}
                            onChange={e => setNewReward(p => ({ ...p, inventoryCap: parseInt(e.target.value) }))}
                            className="w-full h-10 bg-surface-container border border-outline rounded-xl px-4 text-xs font-bold outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleAddReward}
                        className="w-full h-10 bg-white/5 border border-white/10 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                      >
                        Push to Mesh
                      </button>
                   </div>
                </div>

                {rewards.map((reward, idx) => (
                  <div key={`${reward.id || 'reward'}-${idx}`} className="bg-background/40 border border-outline/30 rounded-2xl p-6 flex flex-col justify-between group">
                     <div className="flex justify-between items-start">
                        <div>
                           <p className="text-xs font-black uppercase tracking-tight">{reward.name}</p>
                           <p className="text-[10px] font-mono font-bold text-primary mt-1">{reward.cost} W-Caps</p>
                        </div>
                        <button 
                          onClick={() => handleRemoveReward(reward.id)}
                          className="p-2 opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"
                        >
                           <ShieldCheck size={16} />
                        </button>
                     </div>
                     <div className="mt-4 pt-4 border-t border-outline/10 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <Users size={12} className="opacity-40" />
                           <span className="text-[9px] font-bold uppercase opacity-40">{reward.claimedCount} / {reward.inventoryCap} Claimed</span>
                        </div>
                        <div className="h-1 flex-1 mx-4 bg-background rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-primary" 
                             style={{ width: `${Math.min(100, (reward.claimedCount / reward.inventoryCap) * 100)}%` }}
                           />
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Intelligence Sidecard */}
        <div className="space-y-6">
           <div className="bg-primary/5 border border-primary/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[1.7] transition-transform">
                 <TrendingUp size={120} className="text-primary" />
              </div>
              <div className="relative z-10 space-y-6">
                 <div>
                   <h5 className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Economy Pulse</h5>
                   <p className="text-lg font-black tracking-tight leading-tight uppercase">Strategy: Growth</p>
                 </div>
                 
                 <p className="text-[10px] font-bold text-white/70 leading-relaxed uppercase tracking-wide">
                    Loyalty mesh is currently <span className="text-emerald-500">Deflationary</span>. Users are earning caps 1.4x faster than redemption. Consider adding high-value limited rewards to drain liquidity.
                 </p>

                 <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Earn Velocity</span>
                       <span className="text-[9px] font-black uppercase text-emerald-500">+42 Caps/sec</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Redeem Velocity</span>
                       <span className="text-[9px] font-black uppercase text-red-500">-12 Caps/sec</span>
                    </div>
                 </div>

                 <button className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Generate Optimization Report
                 </button>
              </div>
           </div>

           <div className="bg-surface-container border border-outline rounded-[2rem] p-8">
              <h4 className="text-[10px] font-black uppercase tracking-widest mb-6">W-Caps Protocol</h4>
              <div className="space-y-6">
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-primary shrink-0">
                       <Smartphone size={16} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-tight">Real-time Sync</p>
                       <p className="text-[8px] font-bold text-on-surface-variant uppercase mt-0.5">Points are awarded instantly upon order fulfillment confirmation.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-primary shrink-0">
                       <ShieldCheck size={16} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-tight">Fraud Protection</p>
                       <p className="text-[8px] font-bold text-on-surface-variant uppercase mt-0.5">W-Caps EARNING is пропорционально tied to the patron's verified budget limit.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
