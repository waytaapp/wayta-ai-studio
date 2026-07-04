import React, { useState } from 'react';
import { X, Save, MapPin, Tag, Image as ImageIcon } from 'lucide-react';
import { venueService } from '../../services/venueService';
import { Venue } from '../../types';

interface VenueFormProps {
  onClose: () => void;
  onSuccess?: (venueId: string) => void;
}

export const VenueForm: React.FC<VenueFormProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<Venue, 'id'>>({
    name: '',
    location: '',
    distance: '0.0km',
    type: 'Festival',
    status: 'Upcoming',
    rating: 0,
    image: '',
    icon: 'Store',
    description: '',
    address: '',
    created_at: new Date().toISOString()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const id = await venueService.createVenue({
        ...formData,
        location: formData.address // Use address as location if not specified
      });
      if (id && onSuccess) {
        onSuccess(id);
      }
      onClose();
    } catch (error) {
      console.error('Failed to create venue:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-outline/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-on-background">Create Venue</h2>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Terminal • New Location Entry</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Venue Name</label>
              <div className="relative">
                <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. ULTIMATE FESTIVAL 2024"
                  className="w-full h-12 bg-background border border-outline rounded-xl pl-12 pr-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Address / Location</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input 
                  required
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Cape Town Waterfront"
                  className="w-full h-12 bg-background border border-outline rounded-xl pl-12 pr-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Description</label>
              <textarea 
                required
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="PROXIMITY BASED ORDERING INTERFACE DESCRIPTION..."
                className="w-full h-24 bg-background border border-outline rounded-xl p-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Venue Type</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full h-12 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                >
                  <option value="Festival">Festival</option>
                  <option value="Club">Club</option>
                  <option value="Outdoor">Outdoor</option>
                  <option value="Lounge">Lounge</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Image URL</label>
                <div className="relative">
                  <ImageIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    type="text"
                    value={formData.image}
                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full h-12 bg-background border border-outline rounded-xl pl-12 pr-4 text-xs font-bold lowercase outline-none focus:border-primary transition-all"
                  />
                </div>
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
              {loading ? 'Registering...' : 'Save Venue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
