import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, User as UserIcon, Phone, Mail, AtSign, CheckCircle2, Moon, Sun, ArrowLeft, LogIn, MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WaytaLogo } from '../WaytaLogo';

type Role = 'patron' | 'staff' | 'venue' | 'organiser' | null;

interface ProfileData {
  name: string;
  phone: string;
  email: string;
  handle: string;
}

interface UserOnboardingFlowProps {
  onComplete: () => void;
  onLoginClick?: () => void;
}

export const UserOnboardingFlow: React.FC<UserOnboardingFlowProps> = ({ onComplete, onLoginClick }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<ProfileData>({ name: '', phone: '', email: '', handle: '' });
  const [role, setRole] = useState<Role>(null);
  const [darkMode, setDarkMode] = useState(false);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const progress = (step / 4) * 100;

  const featureCards = [
    { id: 'D1', title: 'Locate', desc: 'Auto-detect your venue.', icon: MapPin },
    { id: 'D2', title: 'Order & Pay', desc: 'One tap from cart.', icon: CreditCard },
    { id: 'D3', title: 'Collect', desc: 'Skip the bar line.', icon: ShoppingBag }
  ];

  const roles = [
    { id: 'patron' as Role, label: 'Patron', icon: '🎉', desc: 'Nightlife goer — order drinks & pay on-site.' },
    { id: 'staff' as Role, label: 'Staff', icon: '🍸', desc: 'Bartender or server at a Wayta venue.' },
    { id: 'venue' as Role, label: 'Venue Partner', icon: '🏟️', desc: 'Operator managing a Wayta-enabled venue.' },
    { id: 'organiser' as Role, label: 'Event Organiser', icon: '📋', desc: 'Running events and managing guest flow.' }
  ];

  return (
    <div className="min-h-screen flex flex-col font-display bg-white text-[#0a0f0d] relative overflow-hidden">
      {/* Import Space Grotesk dynamically via inline styling */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;900&family=Inter:wght@400;500;600;700;800&display=swap');
        .font-display {
          font-family: 'Space Grotesk', 'Inter', system-ui, -apple-system, sans-serif;
        }
      `}</style>

      {/* Top Navbar */}
      <nav id="onboarding-nav" className="flex items-center justify-between px-8 py-4 border-b border-gray-100 z-20 sticky top-0 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <WaytaLogo size={32} />
          <span className="font-bold text-xl tracking-tighter text-[#0a0f0d]">wayta</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-4 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span>
            <span className="font-mono text-xs font-bold tracking-widest text-[#059669] uppercase">
              0{step} / 04
            </span>
          </div>
        </div>
      </nav>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-gray-100 overflow-hidden">
        <motion.div 
          id="onboarding-progress-bar"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-[#059669]"
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - 40% Emerald Gradient Hero (Desktop only/responsive hidden) */}
        <aside id="onboarding-left-panel" className="hidden lg:flex w-[40%] bg-gradient-to-br from-[#059669] to-[#047857] p-16 flex-col justify-between relative overflow-hidden">
          {/* Animated background patterns */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-[10px] tracking-[0.2em] uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Nightlife Infrastructure
              </div>
              <h1 className="text-7xl font-black text-white leading-[0.9] tracking-tighter font-display">
                Skip<br />the queue.
              </h1>
              <p className="text-emerald-100/80 text-lg max-w-sm leading-relaxed font-medium">
                Order, pay and collect at packed clubs and festival peaks without losing the night to lines.
              </p>
            </motion.div>
          </div>

          <div className="relative z-10 flex flex-col gap-3">
            {featureCards.map((card, i) => {
              const IconComp = card.icon;
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * (i + 1) }}
                  className="group p-5 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/20 transition-all cursor-default"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
                      <IconComp size={20} />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] font-bold text-emerald-300 tracking-widest uppercase mb-1">
                        {card.id}
                      </div>
                      <div className="font-bold text-white text-lg leading-none mb-1 font-display">{card.title}</div>
                      <div className="text-emerald-100/70 text-xs font-medium">{card.desc}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </aside>

        {/* Right Panel - 60% Form Content */}
        <main id="onboarding-right-panel" className="flex-1 overflow-y-auto bg-white flex flex-col items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[#059669] font-bold text-[10px] tracking-[0.2em] uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                      Setup Your Profile
                    </div>
                    <h2 className="text-5xl font-black text-gray-900 leading-[0.95] tracking-tight font-display">
                      Welcome to Wayta.
                    </h2>
                    <p className="text-lg leading-relaxed font-medium text-gray-500">
                      Order drinks, secure tables and pay on-site at South Africa's premium nightlife venues.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button 
                      id="onboarding-start-btn"
                      onClick={nextStep}
                      className="w-full h-16 bg-[#059669] hover:bg-[#047857] text-white rounded-full font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/10 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest"
                    >
                      GET STARTED
                      <ArrowRight size={20} />
                    </button>
                    <button 
                      id="onboarding-login-btn"
                      onClick={onLoginClick}
                      className="w-full h-16 bg-transparent border-2 border-[#059669]/20 text-[#059669] rounded-full font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#059669]/5 transition-all text-center tracking-widest"
                    >
                      LOGIN
                      <LogIn size={20} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-6 pt-10 border-t border-gray-100">
                    <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                      Or continue with
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button className="h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center gap-3 font-bold text-sm text-gray-700 hover:bg-gray-100 hover:border-gray-200 transition-all">
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Google
                      </button>
                      <button className="h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center gap-3 font-bold text-sm text-gray-700 hover:bg-gray-100 hover:border-gray-200 transition-all">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.75.8.01 2.04-.84 3.65-.67 1.69.17 2.94 1.12 3.61 2.15-4.04 2.17-2.92 7.7.99 9.39-.32.8-.76 1.63-1.33 2.35zM12.03 7.25c-.02-2.13 1.6-3.89 3.51-3.93.2 2.32-2.14 4.19-3.51 3.93z"/></svg>
                        Apple
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <button onClick={prevStep} className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-gray-400 hover:text-[#059669] transition-colors">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight font-display">Identity.</h2>
                    <p className="text-gray-500 font-medium">How should we address you at the venue?</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#059669] uppercase px-1">Full Name</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                          type="text" 
                          placeholder="John Doe"
                          value={profile.name}
                          onChange={e => setProfile({...profile, name: e.target.value})}
                          className="w-full h-14 bg-gray-50 border border-gray-150 rounded-2xl pl-12 pr-4 font-bold text-gray-800 outline-none focus:border-[#059669] focus:bg-white focus:ring-1 focus:ring-[#059669] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#059669] uppercase px-1">Phone Number</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-4 font-bold text-sm text-gray-400">🇿🇦 +27</div>
                        <input 
                          type="tel" 
                          placeholder="82 123 4567"
                          value={profile.phone}
                          onChange={e => setProfile({...profile, phone: e.target.value})}
                          className="w-full h-14 bg-gray-50 border border-gray-150 rounded-2xl pl-20 pr-4 font-bold text-gray-800 outline-none focus:border-[#059669] focus:bg-white focus:ring-1 focus:ring-[#059669] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[#059669] uppercase px-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                          type="email" 
                          placeholder="john@example.com"
                          value={profile.email}
                          onChange={e => setProfile({...profile, email: e.target.value})}
                          className="w-full h-14 bg-gray-50 border border-gray-150 rounded-2xl pl-12 pr-4 font-bold text-gray-800 outline-none focus:border-[#059669] focus:bg-white focus:ring-1 focus:ring-[#059669] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={nextStep}
                    disabled={!profile.name || !profile.phone}
                    className="w-full h-16 bg-[#059669] hover:bg-[#047857] text-white rounded-full font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-45 disabled:hover:scale-100 disabled:shadow-none uppercase tracking-widest"
                  >
                    CONTINUE
                    <ArrowRight size={20} />
                  </button>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <button onClick={prevStep} className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-gray-400 hover:text-[#059669] transition-colors">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight font-display">Role.</h2>
                    <p className="text-gray-500 font-medium">We'll tailor your experience based on your role.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {roles.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setRole(r.id)}
                        className={cn(
                          "p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4",
                          role === r.id 
                            ? "bg-[#ecfdf5] border-[#059669] text-gray-900" 
                            : "bg-gray-50 border-transparent hover:border-gray-200 text-gray-700"
                        )}
                      >
                        <div className="text-3xl bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                          {r.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm leading-none mb-1 font-display">{r.label}</div>
                          <div className="text-[11px] opacity-75 font-medium leading-tight">{r.desc}</div>
                        </div>
                        {role === r.id && <CheckCircle2 className="text-[#059669]" size={20} />}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={nextStep}
                    disabled={!role}
                    className="w-full h-16 bg-[#059669] hover:bg-[#047857] text-white rounded-full font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-45 disabled:hover:scale-100 disabled:shadow-none uppercase tracking-widest"
                  >
                    FINISH SETUP
                    <ArrowRight size={20} />
                  </button>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-8"
                >
                  <div className="w-24 h-24 bg-[#ecfdf5] border-2 border-[#d1fae5] text-[#059669] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm animate-pulse">
                    <CheckCircle2 size={48} />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-5xl font-black text-gray-900 tracking-tight font-display">You're in.</h2>
                    <p className="text-gray-500 font-medium px-4">
                      Your {role} profile for {profile.name} is ready. Welcome to the Wayta architecture.
                    </p>
                  </div>

                  <div className="pt-8">
                    <button 
                      onClick={onComplete}
                      className="w-full h-16 bg-[#059669] hover:bg-[#047857] text-white rounded-full font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest"
                    >
                      ENTER WAYTA
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserOnboardingFlow;
