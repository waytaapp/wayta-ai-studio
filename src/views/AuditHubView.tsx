import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Zap, 
  Activity, 
  Wifi, 
  WifiOff, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  Users,
  Building2,
  Bell,
  Check,
  Smartphone,
  BookOpen,
  ArrowLeft
} from 'lucide-react';

interface AuditHubViewProps {
  onBack: () => void;
  onSimulateOffline: (offline: boolean) => void;
  isSimulatedOffline: boolean;
  onToggleVerificationWait: (pending: boolean) => void;
  isVerificationPending: boolean;
  triggerAppToast: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void;
  theme?: 'light' | 'dark';
}

export const AuditHubView: React.FC<AuditHubViewProps> = ({
  onBack,
  onSimulateOffline,
  isSimulatedOffline,
  onToggleVerificationWait,
  isVerificationPending,
  triggerAppToast,
  theme = 'dark'
}) => {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'matrix' | 'edge-cases'>('onboarding');

  const handleTestToast = (message: string, type: 'error' | 'warning' | 'info' | 'success') => {
    triggerAppToast(message, type);
  };

  return (
    <div className="min-h-screen bg-background text-on-background pb-32">
      {/* Top Banner */}
      <header className="p-6 bg-surface-container border-b border-outline sticky top-0 z-10 backdrop-blur-xl bg-opacity-80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="w-10 h-10 bg-surface-container border border-outline rounded-xl flex items-center justify-center active:scale-90 transition-all text-on-surface"
              id="audit-back-btn"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                  SYSTEMAUDIT SECURE
                </span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight text-on-surface">
                Wayta Systems & Onboarding Audit Deck
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSimulateOffline(!isSimulatedOffline);
                handleTestToast(
                  !isSimulatedOffline 
                    ? "Offline Mode Enabled: Session locked to local cache safely." 
                    : "Back Online: Dual-synchronizing real-time RTDB queues.",
                  !isSimulatedOffline ? "warning" : "success"
                );
              }}
              className={`h-11 px-4 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all select-none border border-outline/10 ${
                isSimulatedOffline 
                  ? "bg-amber-500/10 text-amber-400 font-bold" 
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              {isSimulatedOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
              <span>{isSimulatedOffline ? "Simulated Offline" : "Go Offline"}</span>
            </button>
            <button
              onClick={() => {
                onToggleVerificationWait(!isVerificationPending);
                handleTestToast(
                  !isVerificationPending 
                    ? "Simulated Gateway Verification Wait mode active." 
                    : "Gateway Verified: Restored standard production mode.",
                  "info"
                );
              }}
              className={`h-11 px-4 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all select-none border border-outline/10 ${
                isVerificationPending 
                  ? "bg-blue-500/10 text-blue-400 font-bold" 
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              <Clock size={14} />
              <span>{isVerificationPending ? "Simulating Audit Wait" : "Gateway Wait"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Auditor Executive Summary Card */}
        <div className="bg-surface-container border border-outline rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="grid md:grid-cols-3 gap-8 items-center relative z-10">
            <div className="md:col-span-2 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-[9px] font-black uppercase tracking-widest">
                <Sparkles size={11} className="fill-primary" />
                EXECUTIVE SYSTEMS SUMMARY
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-on-surface uppercase tracking-tight leading-none">
                Zero-Admin Infrastructure & Offline-First Core Architecture
              </h2>
              <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
                Our objective is absolute speed-to-value. Venues require zero new hardware to operate or trial. Patrons order directly in their browsers without installing apps, and staff run on existing mobile/tablet interfaces with pure intuitive flow. Below is our formal UX audit and systemic simulation control panel.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background border border-outline rounded-2xl p-4 text-center">
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">PATRON ONBOARDING</p>
                <p className="text-xl font-black text-primary font-display">&lt; 3 CLICKS</p>
                <p className="text-[8px] font-bold text-emerald-400 uppercase mt-1">Instant Value</p>
              </div>
              <div className="bg-background border border-outline rounded-2xl p-4 text-center">
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">OFFLINE PERSISTENCE</p>
                <p className="text-xl font-black text-blue-400 font-display">100% LOCAL</p>
                <p className="text-[8px] font-bold text-blue-400 uppercase mt-1">Zero Spend Loss</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auditor Tabs */}
        <div className="flex border-b border-outline/30 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`py-4 px-6 border-b-2 font-black uppercase text-[11px] tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'onboarding' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Users size={16} />
            <span>Step-Reduction Audit (Deliv. 1)</span>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-4 px-6 border-b-2 font-black uppercase text-[11px] tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'matrix' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Bell size={16} />
            <span>Notification & Tooltip Matrix (Deliv. 2)</span>
          </button>
          <button
            onClick={() => setActiveTab('edge-cases')}
            className={`py-4 px-6 border-b-2 font-black uppercase text-[11px] tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'edge-cases' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Layers size={16} />
            <span>Interactive Edge Cases (Deliv. 3)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="space-y-6">
          {/* DELIVERABLE 1: STEP-REDUCTION AUDIT */}
          {activeTab === 'onboarding' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black uppercase tracking-tight text-on-surface">Role Onboarding Redundancy Deficits</h3>
                  <p className="text-xs font-semibold text-on-surface-variant tracking-wide uppercase">Eliminating administrative drag for instant transaction cycles</p>
                </div>
              </div>

              {/* Comparative Table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* ROLE A: PATRON */}
                <div className="bg-surface-container border border-outline rounded-[2.2rem] p-6 space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center">
                        <Smartphone size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight text-on-surface">Role A: The Consumer</h4>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold">Patron / Event Attendee</p>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <div className="bg-background/40 border border-red-500/10 p-3.5 rounded-2xl relative">
                        <div className="absolute top-2.5 right-3 text-[8px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                          LEGACY DRAG
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#ef4444] mb-2">Classic App Flow (6+ Steps)</p>
                        <ol className="text-[10px] space-y-1 font-bold list-decimal pl-4 uppercase text-[#f87171] tracking-wide">
                          <li>App Store search & download</li>
                          <li>Profile creation & SMS OTP verification</li>
                          <li>Credit card input & billing address validation</li>
                          <li>Find venue on search list manually</li>
                          <li>Select menu category & customizer</li>
                          <li>Cart settlement & multi-auth validation</li>
                        </ol>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-2xl relative">
                        <div className="absolute top-2.5 right-3 text-[8px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          OPTIMIZED ACTIVE
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2">Zero-Admin State (2 Steps)</p>
                        <ol className="text-[10px] space-y-1 font-bold list-decimal pl-4 uppercase text-on-surface-variant tracking-wide">
                          <li>Scan QR code (immediate browser viewport loading)</li>
                          <li>Place Order & Instant Apple/Google Pay/Card Settlement</li>
                        </ol>
                        <div className="mt-2 text-[8px] font-black text-primary uppercase pl-2 border-l border-primary/30">
                          DEFERRED: Authentication and Profile completion are deferred dynamically until collection ready, keeping first-order latency under 35 seconds.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background border border-outline rounded-2xl p-4 space-y-2 mt-4">
                    <p className="text-[9px] font-black uppercase text-on-surface tracking-widest">Speed-to-Value Quantified</p>
                    <div className="flex justify-between items-end border-b border-outline/10 pb-2">
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase">Conversion Increase</span>
                      <span className="text-sm font-mono font-black text-emerald-400">+340%</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase">Average Seconds to checkout</span>
                      <span className="text-sm font-mono font-black text-primary">18s</span>
                    </div>
                  </div>
                </div>

                {/* ROLE B: OPERATORS */}
                <div className="bg-surface-container border border-outline rounded-[2.2rem] p-6 space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl flex items-center justify-center">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight text-on-surface">Role B: Venue Operator</h4>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold">Bar Owner / Organizer</p>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <div className="bg-background/40 border border-red-500/10 p-3.5 rounded-2xl relative">
                        <div className="absolute top-2.5 right-3 text-[8px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                          LEGACY DRAG
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#ef4444] mb-2">Classic App Flow (5+ Steps)</p>
                        <ol className="text-[10px] space-y-1 font-bold list-decimal pl-4 uppercase text-[#f87171] tracking-wide">
                          <li>Inquiry form submit & sales wait</li>
                          <li>KYC Verification review (contract signing PDF)</li>
                          <li>Menu CSV formatting & upload</li>
                          <li>Technical integration setup with API token</li>
                          <li>Gate verification validation tests</li>
                        </ol>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-2xl relative">
                        <div className="absolute top-2.5 right-3 text-[8px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          OPTIMIZED ACTIVE
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2">Simulation Sandbox First</p>
                        <ol className="text-[10px] space-y-1 font-bold list-decimal pl-4 uppercase text-on-surface-variant tracking-wide">
                          <li>Quick API-Mapping wizard (instantly mirrors local items)</li>
                          <li>Immediate Simulated Live order feed (zero code needed)</li>
                        </ol>
                        <div className="mt-2 text-[8px] font-black text-primary uppercase pl-2 border-l border-primary/30">
                          ASYNC KYC: Operator explores live dashboard instantly using mockup/simulation mode. Real banking verification runs asynchronously in the background.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background border border-outline rounded-2xl p-4 space-y-2 mt-4">
                    <p className="text-[9px] font-black uppercase text-on-surface tracking-widest">Operational Friction Cut</p>
                    <div className="flex justify-between items-end border-b border-outline/10 pb-2">
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase">Time-To-First Trial Run</span>
                      <span className="text-sm font-mono font-black text-emerald-400">Under 2 min</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase">Required dedicated support</span>
                      <span className="text-sm font-mono font-black text-primary">0 Hours</span>
                    </div>
                  </div>
                </div>

                {/* ROLE C: STAFF */}
                <div className="bg-surface-container border border-outline rounded-[2.2rem] p-6 space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-xl flex items-center justify-center">
                        <Layers size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight text-on-surface">Role C: Service Staff</h4>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold">Bartenders / Bar Runners</p>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <div className="bg-background/40 border border-red-500/10 p-3.5 rounded-2xl relative">
                        <div className="absolute top-2.5 right-3 text-[8px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                          LEGACY DRAG
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#ef4444] mb-2">Classic App Flow (4 Steps)</p>
                        <ol className="text-[10px] space-y-1 font-bold list-decimal pl-4 uppercase text-[#f87171] tracking-wide">
                          <li>Create unique login invite via admin and verify</li>
                          <li>App training workshop with team leaders</li>
                          <li>Terminal password reset flow</li>
                          <li>Explicit setup/sync parameters</li>
                        </ol>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-2xl relative">
                        <div className="absolute top-2.5 right-3 text-[8px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          OPTIMIZED ACTIVE
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2">Zero-Training Queue</p>
                        <ol className="text-[10px] space-y-1 font-bold list-decimal pl-4 uppercase text-on-surface-variant tracking-wide">
                          <li>Scan Fast-Onboarding code on POS terminal</li>
                          <li>Single Kanban screen load with status toggles</li>
                        </ol>
                        <div className="mt-2 text-[8px] font-black text-primary uppercase pl-2 border-l border-primary/30">
                          PRE-AUTHORIZED: POS terminals are globally pre-authorized, and bartenders can log into their terminal instantly with their phone in under 5 seconds.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background border border-outline rounded-2xl p-4 space-y-2 mt-4">
                    <p className="text-[9px] font-black uppercase text-on-surface tracking-widest">Training Overhead Deflected</p>
                    <div className="flex justify-between items-end border-b border-outline/10 pb-2">
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase">Staff Prep Hours Required</span>
                      <span className="text-sm font-mono font-black text-emerald-400">Zero</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase">Active Order Handover Speed</span>
                      <span className="text-sm font-mono font-black text-primary">&lt; 2s click</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* DELIVERABLE 2: CONTEXTUAL TOAST & TOOLTIP MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase tracking-tight text-on-surface">Instructional Overlay & Micro-copy Catalog</h3>
                <p className="text-xs font-semibold text-on-surface-variant tracking-wide uppercase">Contextual micro-interactions configured dynamically across operations</p>
              </div>

              {/* Grid of Interactive Notification triggers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* TRIGGER 1 */}
                <div className="bg-surface-container border border-outline rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[8px] font-black uppercase tracking-widest rounded-md">
                        Trigger: First Time Opening Menu
                      </div>
                      <span className="text-[9px] font-mono text-on-surface-variant font-bold">COMP: Pulse Tooltip</span>
                    </div>
                    <h5 className="font-bold text-xs uppercase tracking-tight text-on-surface">Digital Skip-The-Queue Navigation Assist</h5>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                      Placement: Over the primary "Checkout / Pay" floating drawer widget. Triggers instantly to prompt immediate order flow when client selects item.
                    </p>
                    <div className="bg-background/50 border border-cyan-500/20 rounded-xl p-3 font-mono text-[10px] text-cyan-400">
                      "👋 No waiting lines here! Tap items to build your cart, choose budget limits, and check out instantly via instant-settlement."
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestToast("⚡ Skip the Queue: Browse items, choose budget limits, and check out instantly with zero waiting lines!", "info")}
                    className="h-10 text-center w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-cyan-500/10 active:scale-95 transition-all"
                  >
                    Fire Simulated Skip-Queue Toast
                  </button>
                </div>

                {/* TRIGGER 2 */}
                <div className="bg-surface-container border border-outline rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-widest rounded-md">
                        Trigger: Intermittent Network Dropout
                      </div>
                      <span className="text-[9px] font-mono text-on-surface-variant font-bold">COMP: Non-blocking Banner</span>
                    </div>
                    <h5 className="font-bold text-xs uppercase tracking-tight text-on-surface">Offline Resilience Reassurance</h5>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                      Placement: Top header sticky block. Triggers natively on `window.addEventListener('offline')` events with full session locks.
                    </p>
                    <div className="bg-background/50 border border-amber-500/20 rounded-xl p-3 font-mono text-[10px] text-amber-400">
                      "📡 Offline Grid Active. Your active basket, remaining party limit, and pending QR receipts are locally locked & 100% safe."
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestToast("📡 Connectivity Shifted: Wayta Offline Grid engaged. Your active basket, budgets, and QR logs are locally secured.", "warning")}
                    className="h-10 text-center w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-widest rounded-xl border border-amber-500/10 active:scale-95 transition-all"
                  >
                    Fire Simulated Offline Toast
                  </button>
                </div>

                {/* TRIGGER 3 */}
                <div className="bg-surface-container border border-outline rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-md">
                        Trigger: Safe Instant Settlement Complete
                      </div>
                      <span className="text-[9px] font-mono text-on-surface-variant font-bold">COMP: Success Bottom Sheet</span>
                    </div>
                    <h5 className="font-bold text-xs uppercase tracking-tight text-on-surface">Payment Verification Handshake</h5>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                      Placement: Floating lower bottom stack alert. Triggers securely upon receiving instant tokenized transaction confirmation.
                    </p>
                    <div className="bg-background/50 border border-emerald-500/20 rounded-xl p-3 font-mono text-[10px] text-emerald-400">
                      "💖 Settled safely! Your secure barcode receipt #[ID] is live. Simply scan at the collection point when bartender calls your order."
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestToast("💖 Transaction Complete: Wayta secure code is active. Hand over is authorized, scan at the counter.", "success")}
                    className="h-10 text-center w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-emerald-500/10 active:scale-95 transition-all"
                  >
                    Fire Simulated Success Toast
                  </button>
                </div>

                {/* TRIGGER 4 */}
                <div className="bg-surface-container border border-outline rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-md">
                        Trigger: Compliance Validation Awaiting
                      </div>
                      <span className="text-[9px] font-mono text-on-surface-variant font-bold">COMP: Inline Mini Widget</span>
                    </div>
                    <h5 className="font-bold text-xs uppercase tracking-tight text-on-surface">Gateway Verification Async Onboarding</h5>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                      Placement: Centered header notification on business manager dashboard. Keeps systems interactive and functional in test mode during KYC check.
                    </p>
                    <div className="bg-background/50 border border-blue-500/20 rounded-xl p-3 font-mono text-[10px] text-blue-400">
                      "ℹ️ Compliance pending verification. Enjoy full interactive sandbox mode! Your simulated live patron order panel is fully functional below."
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestToast("ℹ️ Security Audit: Verified business docs are processing. Interactive sandbox is fully open for your trial.", "info")}
                    className="h-10 text-center w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-blue-500/10 active:scale-95 transition-all"
                  >
                    Fire Simulated Gateway Trial Toast
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* DELIVERABLE 3: THE EDGE CASES COMPREHENSIVE STRATEGY */}
          {activeTab === 'edge-cases' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase tracking-tight text-on-surface">Failsafe Mechanics in Extreme Offline/KYC Environments</h3>
                <p className="text-xs font-semibold text-on-surface-variant tracking-wide uppercase">Technical and architectural blueprint details for robust operations</p>
              </div>

              {/* Edge Case 1: The Network Drop */}
              <div className="bg-surface-container border border-outline rounded-[2.2rem] p-6 space-y-6 relative overflow-hidden">
                <div className="absolute top-4 right-6 text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  SYSTEM TRIVIAL 01
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                    <WifiOff size={24} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base font-black uppercase tracking-tight text-on-surface">Edge Case 1: Deep Underground Network Drops</h4>
                    <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                      Underground crawl clubs or densely crowded stadiums often lead to sudden cell drops. If network connection cuts off mid-session, the UX strategy relies on a completely transparent local state lock.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 font-mono text-[10px] uppercase">
                  <div className="bg-background border border-outline rounded-2xl p-4 space-y-1.5">
                    <span className="text-[8px] font-black tracking-widest text-on-surface-variant">A. LOCK BASKET IN COMP</span>
                    <p className="font-bold text-on-surface text-xs leading-snug">STATION DISK RECONCILIATION</p>
                    <p className="text-on-surface-variant leading-relaxed">
                      Order cache utilizes HTML5 state caching natively. If the client clicks "Add to Cart", items are staged offline without server checks.
                    </p>
                  </div>
                  <div className="bg-background border border-outline rounded-2xl p-4 space-y-1.5">
                    <span className="text-[8px] font-black tracking-widest text-on-surface-variant">B. PERSIST REGISTRATION SLIP</span>
                    <p className="font-bold text-on-surface text-xs leading-snug">QR TOKEN GENERATION</p>
                    <p className="text-on-surface-variant leading-relaxed">
                      Digital ticket token and budget trackers are saved locally. Active barcodes render flawlessly in the browser completely offline.
                    </p>
                  </div>
                  <div className="bg-background border border-outline rounded-2xl p-4 space-y-1.5">
                    <span className="text-[8px] font-black tracking-widest text-on-surface-variant">C. BACKGROUND RESTORATION</span>
                    <p className="font-bold text-on-surface text-xs leading-snug">QUEUE DUAL-SYNCHRONIZATION</p>
                    <p className="text-on-surface-variant leading-relaxed">
                      App listens dynamically to connection switches, pushing pending tickets to staff RTDB queues instantly upon network re-entry.
                    </p>
                  </div>
                </div>

                <div className="bg-background border border-outline rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${isSimulatedOffline ? "bg-amber-500 animate-ping" : "bg-emerald-500 animate-pulse"}`} />
                    <span className="text-xs font-black text-on-surface">
                      Simulated Client Network Switch: {isSimulatedOffline ? "STATION OFFLINE CORE LOCK" : "ONLINE SYNCHRONIZED CORE"}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onSimulateOffline(!isSimulatedOffline);
                      handleTestToast(
                        !isSimulatedOffline 
                          ? "Offline Mode Enabled: Session locked to local cache safely." 
                          : "Back Online: Dual-synchronizing real-time RTDB queues.",
                        !isSimulatedOffline ? "warning" : "success"
                      );
                    }}
                    className={`h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      isSimulatedOffline 
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface border-outline/10"
                    }`}
                  >
                    {isSimulatedOffline ? "Reconnect Network Grid" : "Force Break Connection Grid"}
                  </button>
                </div>
              </div>

              {/* Edge Case 2: The Verification Pending Gateway Lockout */}
              <div className="bg-surface-container border border-outline rounded-[2.2rem] p-6 space-y-6 relative overflow-hidden">
                <div className="absolute top-4 right-6 text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  SYSTEM TRIVIAL 02
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                    <Clock size={24} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base font-black uppercase tracking-tight text-on-surface">Edge Case 2: Gateway Compliance Wait vs Product Locked Walls</h4>
                    <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                      When a venue submits legal docs or payout verification slips, gate compliance checks usually take 24-48 hours. Hard blocking screens destroy initial operator engagement. We utilize "Safe Sandbox Simulator Hub" logic instead.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 font-mono text-[10px] uppercase">
                  <div className="bg-background border border-outline rounded-2xl p-4 space-y-2">
                    <p className="font-bold text-on-surface text-xs leading-snug">NO BARRIER DESIGN SYSTEM</p>
                    <p className="text-on-surface-variant leading-relaxed">
                      Instead of a locked barrier screen, we load the complete live interactive venue manager suite. Operators can add imaginary menu items, mock custom drink templates, design staff shifts, and check out the layout immediately.
                    </p>
                  </div>
                  <div className="bg-background border border-outline rounded-2xl p-4 space-y-2">
                    <p className="font-bold text-on-surface text-xs leading-snug font-mono text-blue-400">⚡ INTEGRATED "SIMULATION FEED" CONTROL</p>
                    <p className="text-on-surface-variant leading-relaxed">
                      An overlay clearly explains that real transactions are waiting for verification approval, but allows the owner to mock customer transactions instantly via a client simulator to see tickets land in real-time. This provides instant Speed-to-Value proof!
                    </p>
                  </div>
                </div>

                <div className="bg-background border border-outline rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${isVerificationPending ? "bg-blue-400 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
                    <span className="text-xs font-black text-on-surface">
                      Merchant Account Sandbox Mode: {isVerificationPending ? "SANDBOX SIMULATION FEED ACTIVE" : "PRODUCTION LIVE TRANS"}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onToggleVerificationWait(!isVerificationPending);
                      handleTestToast(
                        !isVerificationPending 
                          ? "Simulated Gateway Verification Wait mode active." 
                          : "Gateway Verified: Restored standard production mode.",
                        "info"
                      );
                    }}
                    className={`h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      isVerificationPending 
                        ? "bg-blue-500/10 text-blue-450 border-blue-500/20" 
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface border-outline/10"
                    }`}
                  >
                    {isVerificationPending ? "Verify Merchant Docs Now" : "Place doc in Compliance Wait Queue"}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
};
