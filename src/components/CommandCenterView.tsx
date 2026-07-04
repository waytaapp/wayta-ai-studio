import React from 'react';
import { 
  X, TrendingUp, Users, DollarSign, Activity, 
  MapPin, AlertCircle, Zap, Shield, Power, BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';

import { Venue } from '../types';

interface CommandCenterViewProps {
  onClose: () => void;
  venue: Venue;
  isDark?: boolean;
  onUpdateVenue?: (updates: Partial<Venue>) => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({ 
  onClose, 
  venue,
  isDark = true,
  onUpdateVenue
}) => {
  const metrics = [
    { label: 'Orders / Hour', value: venue.stats?.avg_velocity || '0', trend: '+12%', icon: BarChart3, color: 'text-primary' },
    { label: 'Revenue Today', value: formatCurrency(venue.stats?.live_revenue || 0), trend: '+8%', icon: DollarSign, color: 'text-emerald-500' },
    { label: 'Active Tables', value: '28/45', trend: 'High Load', icon: MapPin, color: 'text-blue-500' },
    { label: 'Staff On Floor', value: '18', trend: 'Optimal', icon: Users, color: 'text-purple-500' },
  ];

  const quickActions = [
    { id: 'status', label: venue.status === 'Open' ? 'Close Venue' : 'Open Venue', icon: Power, color: venue.status === 'Open' ? 'bg-emerald-500' : 'bg-gray-500', active: venue.status === 'Open' },
    { id: 'ordering', label: venue.isOrderingEnabled !== false ? 'Stop Orders' : 'Allow Orders', icon: Shield, color: venue.isOrderingEnabled !== false ? 'bg-primary' : 'bg-surface-container-highest', active: venue.isOrderingEnabled !== false },
    { id: 'alert', label: 'Staff Alert', icon: AlertCircle, color: 'bg-red-500', active: false },
    { id: 'info', label: 'Broadcast Info', icon: Zap, color: 'bg-blue-500', active: false },
  ];

  const handleAction = (id: string) => {
    if (!onUpdateVenue) return;
    if (id === 'status') {
      onUpdateVenue({ status: venue.status === 'Open' ? 'Closed' : 'Open' });
    } else if (id === 'ordering') {
      console.log('[DEBUG] Toggling ordering enabled. Current:', venue.isOrderingEnabled);
      onUpdateVenue({ isOrderingEnabled: venue.isOrderingEnabled === false });
    } else {
      alert(`Action ${id} initiated across mesh network.`);
    }
  };

  const activityLog = [
    { id: 1, time: '2m ago', action: 'VIP Order #A24B', status: 'Priority' },
    { id: 2, time: '5m ago', action: 'Table 14 Low Stock Alert', status: 'Warning' },
    { id: 3, time: '8m ago', action: 'Staff Member "John" Signed In', status: 'Log' },
    { id: 4, time: '12m ago', action: 'Payment Terminal Alpha Reset', status: 'System' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "fixed inset-0 z-[200] p-4 md:p-8 flex items-center justify-center bg-black/60 backdrop-blur-md"
      )}
    >
      <div className={cn(
        "w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[3rem] border flex flex-col",
        isDark ? "bg-background border-white/10" : "bg-background border-outline"
      )}>
        {/* Header */}
        <div className="p-8 border-b border-outline/10 flex justify-between items-center bg-surface-container shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-black shadow-lg shadow-primary/20">
                <Activity size={24} />
             </div>
             <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Command Center</h2>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mt-1">{venue.name} • Global Control</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
           {/* Metrics Grid */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((m, i) => (
                <div key={i} className="bg-surface-container border border-outline/10 p-6 rounded-[2rem] space-y-3">
                   <div className="flex justify-between items-start">
                      <m.icon className={m.color} size={20} />
                      <span className="text-[10px] font-black text-emerald-500 uppercase">{m.trend}</span>
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">{m.label}</p>
                      <p className="text-3xl font-black tracking-tighter">{m.value}</p>
                   </div>
                </div>
              ))}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quick Actions */}
              <div className="lg:col-span-2 space-y-4">
                 <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/40 px-2">Operational Triggers</h3>
                 <div className="grid grid-cols-2 gap-4">
                    {quickActions.map((action, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleAction(action.id)}
                        className={cn(
                          "p-8 rounded-[2.5rem] border border-outline/10 flex flex-col gap-4 text-left group transition-all active:scale-95",
                          action.active ? "bg-primary/5 border-primary/20" : "bg-surface-container"
                        )}
                      >
                         <div className={cn(
                           "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                           action.color,
                           action.active ? "text-white" : "text-on-surface-variant/40 group-hover:text-on-surface"
                         )}>
                            <action.icon size={28} />
                         </div>
                         <div>
                            <p className="text-xl font-black uppercase tracking-tight">{action.label}</p>
                            <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">Status: {action.active ? 'Active' : 'Offline'}</p>
                         </div>
                      </button>
                    ))}
                 </div>
              </div>

              {/* Real-time Activity Log */}
              <div className="space-y-4">
                 <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/40 px-2">Live Activity Stream</h3>
                 <div className="bg-surface-container border border-outline/10 rounded-[2.5rem] overflow-hidden">
                    {activityLog.map((log, i) => (
                      <div key={log.id} className="p-4 border-b border-outline/5 last:border-0 hover:bg-white/5 transition-colors">
                         <div className="flex justify-between items-start mb-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">{log.time}</span>
                            <span className={cn(
                              "text-[7px] font-black uppercase px-2 py-0.5 rounded border",
                              log.status === 'Priority' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                              log.status === 'Warning' ? "bg-primary/10 text-primary border-primary/20" :
                              "bg-on-surface-variant/10 text-on-surface-variant/40 border-outline/20"
                            )}>{log.status}</span>
                         </div>
                         <p className="text-sm font-black uppercase tracking-tight italic">"{log.action}"</p>
                      </div>
                    ))}
                 </div>
                 <button className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 hover:text-primary transition-colors">
                    View Complete Audit Trail
                 </button>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
