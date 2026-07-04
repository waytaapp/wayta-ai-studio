import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Users, DollarSign, Globe, AlignLeft, Send, Sparkles, User, Mail, Phone } from 'lucide-react';
import { eventService } from '../../services/eventService';
import { cn } from '../../lib/utils';

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: any;
  user: any;
}

export const NewEventModal: React.FC<NewEventModalProps> = ({ isOpen, onClose, venue, user }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    eventType: 'FESTIVAL',
    expectedCapacity: '',
    budget: '',
    description: '',
    socialMedia: '',
    contactPerson: user?.full_name || user?.displayName || '',
    contactEmail: user?.email || '',
    contactPhone: (user as any)?.phone || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const eventData = {
        ...formData,
        venue_id: venue.id,
        venueName: venue.name,
        status: 'Live', // Auto-accepted as per request
        organizer_id: user.uid,
        date: formData.eventDate,
        time: `${formData.startTime} - ${formData.endTime}`,
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80', // Default event image
      };
      
      await eventService.createEvent(venue.id, eventData as any, user.uid);
      onClose();
    } catch (err) {
      console.error('Failed to create event:', err);
      alert('Event creation failed.');
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
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-surface-container border border-outline rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-outline flex items-center justify-between sticky top-0 bg-surface-container z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Deploy New Event</h2>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Venue Activation System</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-background rounded-full transition-colors text-on-surface-variant"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Event Title</label>
                  <div className="relative">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                    <input name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. SUMMER SOLSTICE 2024" className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Planned Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                    <input type="date" name="eventDate" required value={formData.eventDate} onChange={handleChange} className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-all color-scheme-dark" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Event Type</label>
                  <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all appearance-none">
                    <option value="FESTIVAL">Music Festival</option>
                    <option value="CLUB_NIGHT">Club Night / DJ Set</option>
                    <option value="CONCERT">Concert / Live Band</option>
                    <option value="CORPORATE">Corporate Event</option>
                    <option value="PRIVATE">Private Party / Launch</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Start Time</label>
                  <input type="time" name="startTime" required value={formData.startTime} onChange={handleChange} className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-center font-bold text-sm outline-none focus:border-primary transition-all color-scheme-dark" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">End Time</label>
                  <input type="time" name="endTime" required value={formData.endTime} onChange={handleChange} className="w-full h-14 bg-background border border-outline rounded-2xl px-4 text-center font-bold text-sm outline-none focus:border-primary transition-all color-scheme-dark" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Expected Capacity</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                    <input name="expectedCapacity" type="number" required value={formData.expectedCapacity} onChange={handleChange} placeholder="e.g. 1500" className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Estimated Budget (ZAR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">R</span>
                    <input name="budget" type="number" required value={formData.budget} onChange={handleChange} placeholder="e.g. 50000" className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Contact Person</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                    <input name="contactPerson" required value={formData.contactPerson} onChange={handleChange} className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Contact Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                    <input name="contactEmail" required value={formData.contactEmail} onChange={handleChange} className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Contact Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                    <input name="contactPhone" required value={formData.contactPhone} onChange={handleChange} className="w-full h-14 bg-background border border-outline rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                  <AlignLeft size={12} /> Description
                </label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} required placeholder="Describe the activation vibe..." className="w-full bg-background border border-outline rounded-2xl p-4 font-bold text-sm outline-none focus:border-primary transition-all resize-none" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                  <Globe size={12} /> Social / Website
                </label>
                <input name="socialMedia" value={formData.socialMedia} onChange={handleChange} placeholder="Instagram or Web link" className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all" />
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                   <Users size={12} /> Auto-Contact (Manager Details)
                 </p>
                 <div className="grid grid-cols-2 gap-4 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                    <div>Person: {formData.contactPerson}</div>
                    <div>Email: {formData.contactEmail}</div>
                 </div>
              </div>
            </form>

            <div className="p-6 border-t border-outline flex gap-3 sticky bottom-0 bg-surface-container z-10">
              <button onClick={onClose} className="flex-1 h-14 rounded-2xl border border-outline font-black text-[10px] uppercase tracking-widest hover:bg-background transition-colors">Abort</button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="flex-[2] h-14 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    Activate Event
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
