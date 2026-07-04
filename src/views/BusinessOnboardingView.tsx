import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Building2, 
  Music, 
  ShoppingBag, 
  Send, 
  CheckCircle2, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  ShieldCheck,
  Zap,
  Globe,
  Clock,
  Search
} from 'lucide-react';
import { cn } from '../lib/utils';
import { WaytaLogo } from '../components/WaytaLogo';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { verificationService } from '../services/verificationService';

interface BusinessOnboardingViewProps {
  onBack: () => void;
}

type PartnerType = 'VENDOR' | 'VENUE' | 'EVENT';

export const BusinessOnboardingView: React.FC<BusinessOnboardingViewProps> = ({ onBack }) => {
  const [partnerType, setPartnerType] = useState<PartnerType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    contactPerson: '',
    email: '',
    phone: '',
    location: '',
    category: '',
    description: '',
    vatNumber: '',
    expectedCapacity: '',
    eventDate: '',
    eventType: '',
    budget: '',
    socialMedia: '',
    venuePreference: '',
    venueCapacity: '',
    venueType: '',
    startDay: '',
    endDay: '',
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    if (partnerType === 'EVENT') {
      getDocs(collection(db, 'venues')).then(snapshot => {
        setVenues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }).catch(err => {
        console.error("Failed to load venues", err);
      });
    }
  }, [partnerType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create real request in Realtime Database
      await verificationService.createRequest({
        type: partnerType as 'VENUE' | 'EVENT' | 'VENDOR' | 'USER',
        business_name: formData.businessName,
        contact_email: formData.email,
        details: {
          ...formData,
          partnerType
        }
      });

      console.log('--- NEW ONBOARDING REQUEST ---');
      console.log('Destination: o3sharenet@gmail.com');
      console.log('Type:', partnerType);
      console.log('Data:', formData);
      
      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to submit onboarding request:', err);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-emerald-500/20"
        >
          <CheckCircle2 size={40} />
        </motion.div>
        <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Application Received</h2>
        <p className="text-on-surface-variant text-sm font-medium leading-relaxed max-w-xs mb-8">
          We've securely received your partnership request. Our terminal team will review the details and reach out to you via <span className="text-primary font-bold">{formData.email}</span> within 24-48 hours.
        </p>
        <div className="bg-surface-container border border-outline p-4 rounded-xl mb-12 w-full max-w-xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Confirmation Note</p>
          <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Details sent to: o3sharenet@gmail.com</p>
        </div>
        <button 
          onClick={onBack}
          className="w-full max-w-xs h-14 bg-primary text-black rounded-xl font-black text-[11px] uppercase tracking-[0.3em] shadow-lg active:scale-95 transition-all"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col w-full pb-12">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-outline px-6 h-20 flex items-center justify-between">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-surface-container border border-outline flex items-center justify-center active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
           <WaytaLogo size={20} />
           <span className="text-sm font-black text-on-background uppercase tracking-[0.3em]">Partnerships</span>
        </div>
        <div className="w-10" />
      </header>

      <main className="pt-28 px-6 max-w-md mx-auto w-full">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black uppercase tracking-tight leading-tight">Scale Your Pulse</h1>
          <p className="text-on-surface-variant text-xs mt-2 font-medium tracking-wide uppercase">Join the Wayta mesh network of elite vendors and venues.</p>
        </div>

        {!partnerType ? (
          <div className="space-y-4">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant mb-4 px-2">Select Partnership Path</p>
             
             {[
               { id: 'VENDOR', title: 'Service Provider', desc: 'Drinks, Food, Logistics or Security', icon: ShoppingBag, color: 'bg-primary' },
               { id: 'VENUE', title: 'Venue Operator', desc: 'Nightclubs, Lounges, or Bars', icon: Building2, color: 'bg-secondary', btnId: 'register-venue-btn' },
               { id: 'EVENT', title: 'Event Organizer', desc: 'Music Festivals, Concerts, or Pop-ups', icon: Music, color: 'bg-tertiary' }
             ].map((type) => (
                <button 
                  key={type.id}
                  id={(type as any).btnId}
                  onClick={() => setPartnerType(type.id as PartnerType)}
                  className="w-full bg-surface-container border border-outline p-5 rounded-2xl flex items-center gap-5 hover:border-primary/50 transition-all group active:scale-[0.98]"
                >
                  <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center text-black shadow-lg", type.color)}>
                    <type.icon size={28} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-sm uppercase tracking-tight">{type.title}</h3>
                    <p className="text-[11px] font-medium text-on-surface-variant leading-tight mt-1">{type.desc}</p>
                  </div>
                </button>
             ))}
          </div>
        ) : (
          <motion.form 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
             <button 
               type="button"
               onClick={() => setPartnerType(null)}
               className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 mb-2"
             >
               <ArrowLeft size={12} />
               Change Partnership Type
             </button>

             <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                   {/* Business Details */}
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">
                       {partnerType === 'EVENT' ? 'Event Name' : partnerType === 'VENUE' ? 'Venue Name' : 'Business Name'}
                     </label>
                     <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                        <input name="businessName" placeholder={partnerType === 'EVENT' ? "e.g. ULTRA SOUTH AFRICA" : partnerType === 'VENUE' ? "e.g. The Grand" : "Wayta Enterprises"} required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors" />
                     </div>
                   </div>

                   {/* Conditional Fields based on type */}
                   {partnerType === 'VENDOR' && (
                     <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Service Category</label>
                       <select name="category" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors appearance-none">
                          <option value="">Select Category</option>
                          <option value="BEVERAGES">Drinks / Beverages</option>
                          <option value="FOOD">Food / Catering</option>
                          <option value="SECURITY">Event Security</option>
                          <option value="LOGISTICS">Logistics / Equipment</option>
                       </select>
                     </div>
                   )}

                   {partnerType === 'VENUE' && (
                     <>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Venue Location / Address</label>
                         <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                            <input name="location" placeholder="e.g. 123 Sandton Drive, Johannesburg" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors" />
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Venue Type</label>
                           <select name="venueType" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors appearance-none">
                              <option value="">Select Type</option>
                              <option value="CLUB">Nightclub</option>
                              <option value="BAR">Bar / Pub</option>
                              <option value="LOUNGE">Lounge</option>
                              <option value="FESTIVAL_GROUNDS">Festival Grounds</option>
                              <option value="RESTAURANT">Restaurant / Dining</option>
                           </select>
                         </div>
                         
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Max Capacity</label>
                           <div className="relative">
                              <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                              <input name="venueCapacity" type="number" placeholder="e.g. 1500" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors" />
                           </div>
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Operating Days</label>
                           <div className="flex items-center gap-2">
                             <select name="startDay" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl px-2 font-bold text-[12px] outline-none focus:border-primary transition-colors appearance-none text-center">
                                <option value="">Start</option>
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <option key={d} value={d}>{d}</option>)}
                             </select>
                             <span className="text-on-surface-variant text-xs font-bold">-</span>
                             <select name="endDay" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl px-2 font-bold text-[12px] outline-none focus:border-primary transition-colors appearance-none text-center">
                                <option value="">End</option>
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <option key={d} value={d}>{d}</option>)}
                             </select>
                           </div>
                         </div>
                         
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Hours</label>
                           <div className="flex items-center gap-2">
                             <div className="relative w-full">
                                <input name="startTime" type="time" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl px-1 text-center font-bold text-[12px] outline-none focus:border-primary transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full" />
                             </div>
                             <span className="text-on-surface-variant text-xs font-bold">-</span>
                             <div className="relative w-full">
                                <input name="endTime" type="time" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl px-1 text-center font-bold text-[12px] outline-none focus:border-primary transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full" />
                             </div>
                           </div>
                         </div>
                       </div>
                     </>
                   )}

                   {partnerType === 'EVENT' && (
                     <div className="grid grid-cols-1 gap-4">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Planned Event Date & Time</label>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                           <div className="relative col-span-1 md:col-span-1">
                              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                              <input type="date" name="eventDate" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors color-scheme-dark" />
                           </div>
                           <div className="relative">
                              <input type="time" name="startTime" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl px-4 text-center font-bold text-sm outline-none focus:border-primary transition-colors color-scheme-dark [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full" placeholder="Start Time" />
                              <div className="absolute top-1 left-2 text-[8px] font-black uppercase text-on-surface-variant">Start</div>
                           </div>
                           <div className="relative">
                              <input type="time" name="endTime" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl px-4 text-center font-bold text-sm outline-none focus:border-primary transition-colors color-scheme-dark [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full" placeholder="End Time" />
                              <div className="absolute top-1 left-2 text-[8px] font-black uppercase text-on-surface-variant">End</div>
                           </div>
                         </div>
                       </div>
                       
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Event Type</label>
                         <select name="eventType" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-colors appearance-none">
                            <option value="">Select Genre/Type</option>
                            <option value="FESTIVAL">Music Festival</option>
                            <option value="CLUB_NIGHT">Club Night / DJ Set</option>
                            <option value="CONCERT">Concert / Live Band</option>
                            <option value="CORPORATE">Corporate Event</option>
                            <option value="PRIVATE">Private Party / Launch</option>
                         </select>
                       </div>

                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Estimated Attendance</label>
                         <div className="relative">
                            <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                            <input name="expectedCapacity" placeholder="e.g. 5000+" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors" />
                         </div>
                       </div>

                       <div className="space-y-2 relative">
                         <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Venue Preference</label>
                         <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10" size={16} />
                            <input 
                              name="venuePreference" 
                              value={formData.venuePreference}
                              placeholder="Search or enter venue name..." 
                              required 
                              onFocus={() => setShowVenueDropdown(true)}
                              onBlur={() => setTimeout(() => setShowVenueDropdown(false), 200)}
                              onChange={(e) => {
                                handleChange(e);
                                setShowVenueDropdown(true);
                              }} 
                              className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors" 
                            />
                         </div>
                         <AnimatePresence>
                           {showVenueDropdown && (
                             <motion.div 
                               initial={{ opacity: 0, y: -10 }} 
                               animate={{ opacity: 1, y: 0 }} 
                               exit={{ opacity: 0, y: -10 }} 
                               className="absolute top-full left-0 right-0 mt-2 bg-surface-container-high border border-outline rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto overflow-hidden"
                             >
                               {venues
                                  .filter(v => (v.name || '').toLowerCase().includes(formData.venuePreference.toLowerCase()))
                                  .map(v => (
                                 <button 
                                   key={v.id} 
                                   type="button"
                                   onClick={() => {
                                     setFormData(prev => ({ ...prev, venuePreference: v.name, venue_id: v.id }));
                                     setShowVenueDropdown(false);
                                   }}
                                   className="w-full text-left px-4 py-3 hover:bg-primary/10 border-b border-outline/50 last:border-0 font-bold text-sm"
                                 >
                                   {v.name}
                                 </button>
                               ))}
                               {formData.venuePreference && venues.filter(v => (v.name || '').toLowerCase().includes(formData.venuePreference.toLowerCase())).length === 0 && (
                                 <div className="px-4 py-3 text-xs font-bold text-on-surface-variant italic">
                                   Venue not found. Using "{formData.venuePreference}" as unregistered venue.
                                 </div>
                               )}
                             </motion.div>
                           )}
                         </AnimatePresence>
                       </div>

                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Total Budget (ZAR)</label>
                         <div className="relative">
                            <Send className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                            <input type="number" name="budget" placeholder="e.g. 50000" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors" />
                         </div>
                       </div>
                     </div>
                   )}

                   {/* Contact Matrix */}
                   <div className="grid grid-cols-1 gap-4 pt-2">
                     <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Contact Person</label>
                       <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                          <input name="contactPerson" placeholder="Full Name" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors" />
                       </div>
                     </div>
                     <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Business Email</label>
                       <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                          <input type="email" name="email" placeholder="partner@domain.co.za" required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors" />
                       </div>
                     </div>
                     <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Contact Number</label>
                       <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                          <input type="tel" name="phone" placeholder="+27 ..." required onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors" />
                       </div>
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Social Media / Website</label>
                     <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                        <input name="socialMedia" placeholder="Instagram, X, or Website link" onChange={handleChange} className="w-full h-14 bg-surface-container border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-colors" />
                     </div>
                   </div>

                   <div className="space-y-2">
                     <textarea 
                        name="description" 
                        placeholder="Tell us about your services and how you plan to scale with Wayta..." 
                        rows={4}
                        required
                        onChange={handleChange}
                        className="w-full bg-surface-container border border-outline rounded-2xl p-4 font-bold text-sm outline-none focus:border-primary transition-colors resize-none"
                     ></textarea>
                   </div>
                </div>
             </div>

             <div className="bg-surface-container-high/50 p-4 rounded-2xl border border-outline flex gap-4 items-center">
                <ShieldCheck className="text-secondary shrink-0" size={24} />
                <p className="text-[9px] font-medium leading-relaxed text-on-surface-variant uppercase tracking-widest"> By submitting, you agree to our <span className="text-on-surface font-black">Pulse Protocol & Data Standards</span>. Details will be encrypted and sent to the Wayta Central Hub.</p>
             </div>

             <button 
               type="submit"
               disabled={isSubmitting}
               className="w-full h-16 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-2xl amber-glow flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale transition-all"
             >
               {isSubmitting ? (
                 <>
                   <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                   <span>Securing Transmission...</span>
                 </>
               ) : (
                 <>
                   <span>Submit Proposal</span>
                   <Send size={16} />
                 </>
               )}
             </button>
          </motion.form>
        )}
      </main>
    </div>
  );
};
