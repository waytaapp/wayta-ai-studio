import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, MapPin, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import { updateUserProfile } from '../../services/authService';
import { cn } from '../../lib/utils';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  user: any;
  onComplete?: () => void;
  onClose?: () => void;
}

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({ isOpen, user, onComplete, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    dob: user?.dob || '',
    gender: user?.gender || '',
    idNumber: user?.idNumber || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.firstName || !formData.lastName || !formData.dob || !formData.idNumber) {
      alert('All fields are mandatory for identity verification.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateUserProfile(user.uid, {
        ...formData,
        full_name: `${formData.firstName} ${formData.lastName}`,
        is_profile_complete: true
      });
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Update failed. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-surface-container border border-outline rounded-[3rem] p-8 w-full max-w-lg space-y-8 shadow-2xl relative my-auto"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-8 p-3 text-on-surface-variant/40 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center space-y-2">
               <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
                  <ShieldCheck size={32} />
               </div>
               <h2 className="text-2xl font-black uppercase tracking-tight">Identity Activation</h2>
               <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Profile Protocol for W-Caps & Secured Access</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">First Name</label>
                  <input name="firstName" required value={formData.firstName} onChange={handleChange} placeholder="First Name" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Last Name</label>
                  <input name="lastName" required value={formData.lastName} onChange={handleChange} placeholder="Last Name" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Date of Birth</label>
                  <input name="dob" type="date" required value={formData.dob} onChange={handleChange} className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Gender</label>
                  <select name="gender" required value={formData.gender} onChange={handleChange} className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all appearance-none">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">ID / Passport Number</label>
                <input name="idNumber" required value={formData.idNumber} onChange={handleChange} placeholder="Verification ID" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" size={16} />
                  <input name="phone" required type="tel" value={formData.phone} onChange={handleChange} placeholder="+27 ..." className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-all" />
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3 items-center">
                 <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
                 <p className="text-[8px] font-bold text-on-surface-variant leading-relaxed uppercase tracking-wider">Your identity details are encrypted and used solely for age verification and secured transactions within the Wayta mesh.</p>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-20 bg-primary text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm Activation</span>
                    <Sparkles size={16} />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

  );
};
