import React, { useState } from 'react';
import { X, Save, Store, Mail, Briefcase } from 'lucide-react';
import { vendorService, Vendor } from '../../services/vendorService';

interface VendorFormProps {
  venueId: string;
  onClose: () => void;
  onSuccess?: (vendorId: string) => void;
}

export const VendorForm: React.FC<VendorFormProps> = ({ venueId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<Vendor, 'id'>>({
    name: '',
    category: 'Catering',
    contact: '',
    status: 'Pending'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const id = await vendorService.addVendor(venueId, formData);
      if (id && onSuccess) {
        onSuccess(id);
      }
      onClose();
    } catch (error) {
      console.error('Failed to create vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-outline/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-on-background">Onboard Vendor</h2>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Terminal • Partnership Protocol</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Vendor Entity Name</label>
              <div className="relative">
                <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. PREMIUM BEVERAGES LTD"
                  className="w-full h-12 bg-background border border-outline rounded-xl pl-12 pr-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Specialization</label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <select 
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-12 bg-background border border-outline rounded-xl pl-12 pr-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all appearance-none"
                >
                  <option value="Catering">Catering</option>
                  <option value="Audio Visual">Audio Visual</option>
                  <option value="Security">Security</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Ticketing">Ticketing</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Primary Contact</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input 
                  required
                  type="text"
                  value={formData.contact}
                  onChange={e => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="e.g. contact@premiumbev.com"
                  className="w-full h-12 bg-background border border-outline rounded-xl pl-12 pr-4 text-xs font-bold lowercase outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Initial Status</label>
              <div className="flex gap-4">
                {['Pending', 'Approved'].map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: status as any })}
                    className={`flex-1 h-10 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                      formData.status === status 
                        ? 'bg-primary border-primary text-on-primary' 
                        : 'border-outline text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {status}
                  </button>
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
              {loading ? 'Authenticating...' : 'Sign Agreement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
