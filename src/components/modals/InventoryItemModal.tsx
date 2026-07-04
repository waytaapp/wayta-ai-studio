import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, X, Package, Hash, Tag, Layers, 
  MapPin, Scale, Landmark, DollarSign, 
  ArrowRight, Save, Trash2, AlertTriangle, Zap, Sparkles
} from 'lucide-react';
import { InventoryItem, inventoryService } from '../../services/inventoryService';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueId: string;
  eventId?: string;
  item?: InventoryItem | null;
}

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({ 
  isOpen, 
  onClose, 
  venueId, 
  eventId,
  item 
}) => {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    code: '',
    name: '',
    description: '',
    category: '',
    type: 'Ordinary',
    department: '',
    unit_of_measure: 'Each',
    tax_type: 'Standard',
    price: 0,
    stock: 0,
    status: 'Available',
    is_active: true,
    is_premium: false,
    eventId: eventId
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEditing = !!item;

  useEffect(() => {
    setErrorMessage(null);
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        category: '',
        type: 'Ordinary',
        department: '',
        unit_of_measure: 'Each',
        tax_type: 'Standard',
        price: 0,
        stock: 0,
        status: 'Available',
        is_active: true,
        is_premium: false,
        eventId: eventId
      });
    }
  }, [item, isOpen, eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    // if (!venueId) return; // Removed strict venueId check to allow event-only inventory

    setIsSubmitting(true);
    try {
      if (isEditing && item?.id) {
        await inventoryService.updateItem(item.id, formData as any);
      } else {
        const result = await inventoryService.addItem({ 
          ...formData as any, 
          venue_id: venueId, 
          eventId: eventId 
        }, auth.currentUser?.uid || 'anonymous');
        
        if (!result) {
          throw new Error('Operation failed. Check permissions.');
        }
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save item:', err);
      setErrorMessage(err.message || 'Verification failed. Permissions required.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.id) return;
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    setIsDeleting(true);
    try {
      await inventoryService.deleteItem(item.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData(prev => {
      let val: any = type === 'checkbox' ? checked : value;
      let status = prev.status;

      if (name === 'price' || name === 'stock') {
        val = parseFloat(value);
        if (isNaN(val)) val = 0;

        if (name === 'stock') {
          if (val <= 0) status = 'Sold Out';
          else if (val < 10) status = 'Low Stock';
          else status = 'Available';
        }
      }
      
      return {
        ...prev,
        [name]: val,
        status: status
      };
    });
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
            {/* Header */}
            <div className="p-6 border-b border-outline flex items-center justify-between sticky top-0 bg-surface-container z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Package size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">
                    {isEditing ? 'Item Details' : 'Add New Item'}
                  </h2>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                    Inventory Control Registry
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-background rounded-full transition-colors text-on-surface-variant"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Code Field */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                    <Hash size={12} /> Unique Code
                  </label>
                  <input 
                    type="text"
                    name="code"
                    maxLength={15}
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="E.g. PRD-001"
                    className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Name Field */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                    <Tag size={12} /> Item Name
                  </label>
                  <input 
                    required
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Product Name"
                    className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Type Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                    <Layers size={12} /> Stock Type
                  </label>
                  <select 
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all appearance-none"
                  >
                    <option value="Ordinary">Ordinary</option>
                    <option value="Manufactured">Manufactured</option>
                    <option value="Non-stock">Non-stock</option>
                  </select>
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                    <MapPin size={12} /> Department
                  </label>
                  <input 
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="E.g. Kitchen, Bar"
                    className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Unit of Measure */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                    <Scale size={12} /> Unit of Measure
                  </label>
                  <input 
                    type="text"
                    name="unit_of_measure"
                    value={formData.unit_of_measure}
                    onChange={handleChange}
                    placeholder="E.g. Each, kg, Litre"
                    className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Tax Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                    <Landmark size={12} /> Tax Classification
                  </label>
                  <input 
                    type="text"
                    name="tax_type"
                    value={formData.tax_type}
                    onChange={handleChange}
                    placeholder="E.g. Standard, Zero-rated"
                    className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                    <DollarSign size={12} /> Unit Price
                  </label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Stock Level */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                    <Plus size={12} /> Initial Stock Level
                  </label>
                  <input 
                    required
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Image URL Field */}
                <div className="space-y-2 md:col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                    <Zap size={12} /> Image URL (Optional)
                  </label>
                  <input 
                    type="url"
                    name="image"
                    value={formData.image || ''}
                    onChange={handleChange}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full h-14 bg-background border border-outline rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Premium Toggle */}
                <div className="space-y-2 md:col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                    <Sparkles size={12} /> Menu Tier
                  </label>
                  <div 
                    onClick={() => setFormData(prev => ({ ...prev, is_premium: !prev.is_premium }))}
                    className={cn(
                      "w-full h-14 bg-background border rounded-2xl px-4 flex items-center justify-between cursor-pointer transition-all",
                      formData.is_premium ? "border-primary bg-primary/5" : "border-outline"
                    )}
                  >
                    <span className={cn("text-xs font-black uppercase tracking-widest", formData.is_premium ? "text-primary" : "text-on-surface-variant")}>
                      {formData.is_premium ? "Premium Item" : "General Item"}
                    </span>
                    <div className={cn(
                      "w-10 h-6 rounded-full relative transition-colors",
                      formData.is_premium ? "bg-primary" : "bg-outline/20"
                    )}>
                      <div className={cn(
                        "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                        formData.is_premium ? "translate-x-4" : "translate-x-0"
                      )} />
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    name="is_premium"
                    checked={formData.is_premium}
                    onChange={handleChange}
                    className="sr-only"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-2">
                  Description
                </label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-background border border-outline rounded-2xl p-4 font-bold text-sm outline-none focus:border-primary transition-all"
                  placeholder="Additional item details..."
                />
              </div>

              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500"
                >
                  <AlertTriangle size={18} />
                  <p className="text-[10px] font-black uppercase tracking-widest">{errorMessage}</p>
                </motion.div>
              )}

              {/* Status Banner */}
              {isEditing && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                  formData.status === 'Available' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                  formData.status === 'Low Stock' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                  'bg-red-500/10 border-red-500/20 text-red-500'
                }`}>
                  <AlertTriangle size={16} />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Current Status: {formData.status}
                  </p>
                </div>
              )}
            </form>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-outline flex gap-3 sticky bottom-0 bg-surface-container z-10">
              {isEditing && (
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-14 h-14 rounded-2xl border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Delete Item"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={24} />
                  )}
                </button>
              )}
              <button 
                onClick={onClose}
                className="flex-1 h-14 rounded-2xl border border-outline font-black text-[10px] uppercase tracking-widest hover:bg-background transition-colors"
                type="button"
              >
                Discard
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-[2] h-14 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    {isEditing ? 'Sync Changes' : 'Commit Registry'}
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
