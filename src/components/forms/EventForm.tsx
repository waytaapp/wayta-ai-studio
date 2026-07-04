import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Users, Activity, CheckCircle2, MoreVertical, Plus, Trash2, Clock, ListOrdered, Tag } from 'lucide-react';
import { eventService } from '../../services/eventService';
import { auth } from '../../lib/firebase';
import { Event, TicketTier, TimelineStep, Venue } from '../../types';
import { venueService } from '../../services/venueService';

interface EventFormProps {
  venueId?: string; // Optional if selecting
  event?: Event; // If provided, we are editing
  onClose: () => void;
  onSuccess?: (eventId: string) => void;
}

export const EventForm: React.FC<EventFormProps> = ({ venueId: initialVenueId, event, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(event?.image || null);
  const [formData, setFormData] = useState<Omit<Event, 'id'>>({
    venueId: event?.venueId || initialVenueId || '',
    title: event?.title || event?.name || event?.business_name || '',
    date: event?.date || new Date().toISOString().split('T')[0],
    startTime: event?.startTime || '20:00',
    endTime: event?.endTime || '02:00',
    genre: event?.genre || 'House / Techno',
    ticketsSold: event?.ticketsSold || 0,
    ticketsTotal: event?.ticketsTotal || 100,
    ticketPrice: event?.ticketPrice || 150,
    budget: event?.budget || '',
    socialMedia: event?.socialMedia || '',
    status: event?.status || 'PENDING_APPROVAL',
    ticketTiers: event?.ticketTiers || [
      { id: 'standard', name: 'General Admission', price: 150, capacity: 100, sold: 0 }
    ],
    timeline: event?.timeline || [
      { id: '1', time: '18:00', task: 'Sound Check', status: 'pending' },
      { id: '2', time: '20:00', task: 'Doors Open', status: 'pending' }
    ]
  });

  useEffect(() => {
    // Fetch venues if we need to select one
    venueService.getAllVenues()
      .then(setVenues)
      .catch(err => console.error("Error fetching all venues inside EventForm component:", err));
    
    const venueToFetch = event?.venueId || initialVenueId;
    if (venueToFetch) {
      venueService.getVenueById(venueToFetch)
        .then(setSelectedVenue)
        .catch(err => console.error("Error fetching single venue inside EventForm component:", err));
    }
  }, [initialVenueId, event]);

  const handleVenueChange = async (vid: string) => {
    const v = venues.find(v => v.id === vid);
    if (v) {
      setSelectedVenue(v);
      setFormData({
        ...formData,
        venueId: v.id,
        ticketsTotal: formData.ticketsTotal || (v as any).capacity || 100
      });
    }
  };

  const addTicketTier = () => {
    const newTier: TicketTier = {
      id: crypto.randomUUID(),
      name: '',
      price: 0,
      capacity: 0,
      sold: 0
    };
    setFormData({
      ...formData,
      ticketTiers: [...(formData.ticketTiers || []), newTier]
    });
  };

  const removeTicketTier = (id: string) => {
    setFormData({
      ...formData,
      ticketTiers: (formData.ticketTiers || []).filter(t => t.id !== id)
    });
  };

  const updateTicketTier = (id: string, updates: Partial<TicketTier>) => {
    setFormData({
      ...formData,
      ticketTiers: (formData.ticketTiers || []).map(t => t.id === id ? { ...t, ...updates } : t)
    });
  };

  const addTimelineStep = () => {
    const newStep: TimelineStep = {
      id: crypto.randomUUID(),
      time: '00:00',
      task: '',
      status: 'pending'
    };
    setFormData({
      ...formData,
      timeline: [...(formData.timeline || []), newStep]
    });
  };

  const removeTimelineStep = (id: string) => {
    setFormData({
      ...formData,
      timeline: (formData.timeline || []).filter(s => s.id !== id)
    });
  };

  const updateTimelineStep = (id: string, updates: Partial<TimelineStep>) => {
    setFormData({
      ...formData,
      timeline: (formData.timeline || []).map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData({ ...formData, image: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.venueId) return;
    setLoading(true);
    
    try {
      const eventToSave = {
        ...formData,
        ticketsTotal: Number(formData.ticketsTotal) || 0,
        ticketsSold: Number(formData.ticketsSold) || 0,
        ticketPrice: Number(formData.ticketPrice) || 0,
        ticketTiers: formData.ticketTiers?.map(t => ({
          ...t,
          price: Number(t.price) || 0,
          capacity: Number(t.capacity) || 0
        }))
      };
      
      if (event?.id) {
        // Mode: Edit
        await eventService.updateEvent(formData.venueId, event.id, eventToSave);
        console.log('[EventForm] Event updated:', event.id);
        if (onSuccess) onSuccess(event.id);
      } else {
        // Mode: Create
        const id = await eventService.createEvent(formData.venueId, eventToSave, auth.currentUser?.uid || 'anonymous');
        console.log('[EventForm] Event created with ID:', id);
        if (id && onSuccess) onSuccess(id);
      }
      onClose();
    } catch (error) {
      console.error('[EventForm] Error in handleSubmit:', error);
      alert('Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
        <div className="p-6 border-b border-outline/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-on-background">{event ? 'Edit Event' : 'Create Event'}</h2>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Terminal • {event ? 'Update' : 'New'} Sequence</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Event Image</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-outline bg-background flex flex-col items-center justify-center text-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-on-surface-variant">No Image</span>
                  )}
                </div>
                <input 
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-xs text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-outline file:text-[10px] file:font-black file:uppercase file:bg-surface-container file:cursor-pointer hover:file:bg-surface-container-high"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Venue</label>
              <select 
                value={formData.venueId}
                onChange={e => handleVenueChange(e.target.value)}
                className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
              >
                <option value="">Select Venue</option>
                {venues.map((v, i) => (
                  <option key={`eventform-v-${v.id || i}-${i}`} value={v.id}>{v.name}</option>
                ))}
              </select>
              {selectedVenue && (
                <p className="text-[9px] font-bold text-primary uppercase tracking-widest px-1 mt-1 flex items-center gap-1">
                   <Activity size={10} /> {selectedVenue.location || 'Location Loaded'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Event Title</label>
              <div className="relative">
                <Activity size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input 
                  required
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. VIP AFTER PARTY"
                  className="w-full h-12 bg-background border border-outline rounded-xl pl-12 pr-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Event Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    required
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-12 bg-background border border-outline rounded-xl pl-12 pr-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Genre / Vibes</label>
                <input 
                  required
                  type="text"
                  value={formData.genre}
                  onChange={e => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="e.g. Techno / Afrobeat"
                  className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Start Time</label>
                <input 
                  required
                  type="time"
                  value={formData.startTime}
                  onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">End Time</label>
                <input 
                  required
                  type="time"
                  value={formData.endTime}
                  onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Total Capacity</label>
                <div className="relative">
                  <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    required
                    type="number"
                    value={formData.ticketsTotal}
                    onChange={e => setFormData({ ...formData, ticketsTotal: parseInt(e.target.value) })}
                    className="w-full h-12 bg-background border border-outline rounded-xl pl-12 pr-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Ticket Price (R)</label>
                <input 
                  required
                  type="number"
                  value={formData.ticketPrice}
                  onChange={e => setFormData({ ...formData, ticketPrice: parseInt(e.target.value) })}
                  className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Planned Budget</label>
                <input 
                  type="text"
                  value={formData.budget}
                  onChange={e => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="e.g. R50,000"
                  className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Social Media</label>
                <input 
                  type="text"
                  value={formData.socialMedia}
                  onChange={e => setFormData({ ...formData, socialMedia: e.target.value })}
                  placeholder="Insta/X/Website"
                  className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Initial Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
              >
                <option value="Draft">Draft</option>
                <option value="Live">Live</option>
                <option value="Past">Past</option>
              </select>
            </div>

            {/* Ticket Tiers Section */}
            <div className="space-y-4 pt-4 border-t border-outline/10">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Ticket Tiers</label>
                <button 
                  type="button" 
                  onClick={addTicketTier}
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary hover:opacity-80 transition-opacity"
                >
                  <Plus size={12} /> Add Tier
                </button>
              </div>
              <div className="space-y-3">
                {formData.ticketTiers?.map((tier, idx) => (
                  <div key={`form-tier-${idx}-${tier.name}`} className="p-4 bg-surface-container-low border border-outline rounded-2xl space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input 
                          type="text"
                          placeholder="Tier Name (e.g. VIP)"
                          value={tier.name}
                          onChange={e => updateTicketTier(tier.id, { name: e.target.value })}
                          className="w-full h-10 bg-background border border-outline rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-primary"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeTicketTier(tier.id)}
                        className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase text-on-surface-variant px-1">Price (R)</span>
                        <input 
                          type="number"
                          value={tier.price}
                          onChange={e => updateTicketTier(tier.id, { price: parseInt(e.target.value) || 0 })}
                          className="w-full h-10 bg-background border border-outline rounded-lg px-3 text-[10px] font-bold outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase text-on-surface-variant px-1">Capacity</span>
                        <input 
                          type="number"
                          value={tier.capacity}
                          onChange={e => updateTicketTier(tier.id, { capacity: parseInt(e.target.value) || 0 })}
                          className="w-full h-10 bg-background border border-outline rounded-lg px-3 text-[10px] font-bold outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Production Timeline Section */}
            <div className="space-y-4 pt-4 border-t border-outline/10">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Production Timeline</label>
                <button 
                  type="button" 
                  onClick={addTimelineStep}
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary hover:opacity-80 transition-opacity"
                >
                  <Plus size={12} /> Add Step
                </button>
              </div>
              <div className="space-y-3">
                {formData.timeline?.map((step, idx) => (
                  <div key={`form-step-${idx}-${step.time}`} className="flex gap-3 items-start bg-background border border-outline p-3 rounded-xl group">
                    <div className="w-20 shrink-0">
                      <input 
                        type="time"
                        value={step.time}
                        onChange={e => updateTimelineStep(step.id, { time: e.target.value })}
                        className="w-full h-10 bg-surface-container-low border border-outline rounded-lg px-2 text-[10px] font-bold outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text"
                        placeholder="Task / Milestone"
                        value={step.task}
                        onChange={e => updateTimelineStep(step.id, { task: e.target.value })}
                        className="w-full h-10 bg-surface-container-low border border-outline rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-primary"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeTimelineStep(step.id)}
                      className="text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-red-500 p-2 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-outline text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 h-12 bg-primary text-on-primary rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary/20 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {loading ? 'Initializing...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
