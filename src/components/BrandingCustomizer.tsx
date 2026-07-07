import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wand2, Palette, Sparkles, Smartphone, ShieldCheck, Check, 
  AlertTriangle, RefreshCw, RefreshCw as LoopIcon, HelpCircle, Eye, Sliders, ChevronRight
} from 'lucide-react';
import { ThemeConfig, defaultThemes, calculateContrastRatio } from '../contexts/DynamicThemeContext';
import { Venue, Event } from '../types';

interface BrandingCustomizerProps {
  venue: Venue;
  onUpdateVenue: (updates: Partial<Venue>) => Promise<void>;
  events: Event[];
  onUpdateEvent?: (eventId: string, updates: Partial<Event>) => Promise<void>;
  theme?: 'light' | 'dark';
}

const GOOGLE_FONTS_HEADING = [
  'Outfit',
  'Space Grotesk',
  'Playfair Display',
  'Cinzel',
  'Syne',
  'Montserrat',
  'Inter',
  'JetBrains Mono'
];

const GOOGLE_FONTS_BODY = [
  'Inter',
  'Fira Sans',
  'Plus Jakarta Sans',
  'Roboto',
  'JetBrains Mono',
  'Fira Code'
];

export const BrandingCustomizer: React.FC<BrandingCustomizerProps> = ({
  venue,
  onUpdateVenue,
  events,
  onUpdateEvent,
  theme = 'dark'
}) => {
  // Use venue's stored theme or fallback to default
  const initialTheme: ThemeConfig = (venue as any).theme || defaultThemes['wayta-night'];
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>({
    ...defaultThemes['wayta-night'],
    ...initialTheme
  });

  const [activePreviewScreen, setActivePreviewScreen] = useState<'menu' | 'statement'>('menu');
  const [selectedEventId, setSelectedEventId] = useState<string>('VENUE_DEFAULT');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto calculate accessibility stats
  const contrastPrimaryToBg = calculateContrastRatio(currentTheme.primaryColor, currentTheme.backgroundColor);
  const contrastTextToBg = calculateContrastRatio(currentTheme.textColor, currentTheme.backgroundColor);
  const isPrimaryAccessible = contrastPrimaryToBg >= 4.5;

  // Sync state if venue theme changes in database
  useEffect(() => {
    if (selectedEventId === 'VENUE_DEFAULT') {
      const vTheme = (venue as any).theme || defaultThemes['wayta-night'];
      setCurrentTheme({
        ...defaultThemes['wayta-night'],
        ...vTheme
      });
    } else {
      const selectedEvent = events.find(e => e.id === selectedEventId);
      if (selectedEvent) {
        const eTheme = (selectedEvent as any).theme || (venue as any).theme || defaultThemes['wayta-night'];
        setCurrentTheme({
          ...defaultThemes['wayta-night'],
          ...eTheme
        });
      }
    }
  }, [venue, selectedEventId, events]);

  const handleFieldChange = (key: keyof ThemeConfig, value: string) => {
    setCurrentTheme(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyPreset = (presetKey: 'wayta-night' | 'aesthetic-noir' | 'neon-pulse') => {
    setCurrentTheme(defaultThemes[presetKey]);
    showToast(`Loaded "${defaultThemes[presetKey].name}" Preset`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Self-Healing Smart Accessibility Correction
  const handleSmartAccessibilityCorrection = () => {
    // Generate a lighter or darker version of the primary color based on background luminance
    // Simplistic smart shift to maximize contrast:
    const isBgDark = getRelativeLuminance(currentTheme.backgroundColor) < 0.5;
    
    // Shift primary color towards high contrast
    const correctedPrimary = isBgDark ? '#39FF14' : '#14532D'; // green neon or dark forest green
    const correctedText = isBgDark ? '#FFFFFF' : '#000000';
    
    setCurrentTheme(prev => ({
      ...prev,
      primaryColor: correctedPrimary,
      textColor: correctedText
    }));
    
    showToast('Smart contrast correction applied!');
  };

  // Helper relative luminance
  function getRelativeLuminance(hex: string): number {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  const handleSaveTheme = async () => {
    setIsSaving(true);
    try {
      if (selectedEventId === 'VENUE_DEFAULT') {
        await onUpdateVenue({
          theme: currentTheme as any
        });
        showToast('Venue visual theme synced with live mesh!');
      } else {
        if (onUpdateEvent) {
          await onUpdateEvent(selectedEventId, {
            theme: currentTheme as any
          } as any);
          showToast('Event specific override theme published!');
        } else {
          showToast('Update event handler not linked.');
        }
      }
    } catch (err: any) {
      showToast(`Sync failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Determine border-radius from density
  const getRadiusClass = () => {
    if (currentTheme.uiDensity === 'minimalist') return 'rounded-none';
    if (currentTheme.uiDensity === 'compact') return 'rounded-lg';
    return 'rounded-2xl';
  };

  // Determine padding from density
  const getPaddingClass = () => {
    if (currentTheme.uiDensity === 'minimalist') return 'p-2';
    if (currentTheme.uiDensity === 'compact') return 'p-3';
    return 'p-4';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Dynamic Theming Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-md text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
              <Sparkles size={11} className="animate-spin" /> Engine v2.0
            </span>
            <span className="text-xs font-bold text-on-surface-variant font-mono">Dynamic Multi-Tenancy</span>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight mt-2 flex items-center gap-2">
            <Wand2 className="text-primary" /> Branding Matrix
          </h2>
          <p className="text-on-surface-variant text-sm mt-1 max-w-2xl">
            Customize the colors, typography, and density rules for your venue or specific events. Wayta will transition client apps dynamically as patrons check in.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mr-1 font-mono">Scope:</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="h-11 bg-surface border border-outline rounded-xl px-4 text-xs font-black uppercase tracking-wider outline-none focus:border-primary transition-all max-w-[200px]"
          >
            <option value="VENUE_DEFAULT">🏢 Venue Default (Fallback)</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>🎉 Override: {ev.title || ev.name}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Theme Configuration Controls (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Quick Preset Cards */}
          <div className="bg-surface border border-outline rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <Palette size={14} className="text-primary" /> Instant Aesthetic Templates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['wayta-night', 'aesthetic-noir', 'neon-pulse'] as const).map(presetKey => {
                const preset = defaultThemes[presetKey];
                return (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => applyPreset(presetKey)}
                    className="group relative border border-outline hover:border-primary/40 bg-background/50 hover:bg-surface-variant/20 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-black uppercase tracking-wider group-hover:text-primary transition-colors">
                        {preset.name}
                      </span>
                    </div>
                    
                    {/* Visual Color Dots representing the preset palette */}
                    <div className="flex gap-1.5 mt-3">
                      <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: preset.primaryColor }} title="Primary" />
                      <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: preset.secondaryColor }} title="Secondary" />
                      <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: preset.backgroundColor }} title="Background" />
                      <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: preset.cardColor }} title="Cards" />
                    </div>
                    
                    <span className="text-[9px] font-mono opacity-40 group-hover:opacity-100 transition-opacity mt-2.5 block uppercase tracking-widest">
                      {preset.fontHeading}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color & Visual Details Form */}
          <div className="bg-surface border border-outline rounded-3xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-outline/10 pb-4">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Sliders size={16} className="text-primary" /> Visual Parameter Vectors
              </h3>
              <span className="text-[10px] font-mono text-on-surface-variant">Live Customization</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Primary Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>Brand Primary Color</span>
                  <span className="font-mono text-[9px]">{currentTheme.primaryColor}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={currentTheme.primaryColor}
                    onChange={(e) => handleFieldChange('primaryColor', e.target.value)}
                    className="w-12 h-11 bg-background border border-outline rounded-xl p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentTheme.primaryColor}
                    onChange={(e) => handleFieldChange('primaryColor', e.target.value)}
                    placeholder="#39FF14"
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>Accent Accent Vector</span>
                  <span className="font-mono text-[9px]">{currentTheme.secondaryColor}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={currentTheme.secondaryColor}
                    onChange={(e) => handleFieldChange('secondaryColor', e.target.value)}
                    className="w-12 h-11 bg-background border border-outline rounded-xl p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentTheme.secondaryColor}
                    onChange={(e) => handleFieldChange('secondaryColor', e.target.value)}
                    placeholder="#FFD700"
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>Canvas Background</span>
                  <span className="font-mono text-[9px]">{currentTheme.backgroundColor}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={currentTheme.backgroundColor}
                    onChange={(e) => handleFieldChange('backgroundColor', e.target.value)}
                    className="w-12 h-11 bg-background border border-outline rounded-xl p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentTheme.backgroundColor}
                    onChange={(e) => handleFieldChange('backgroundColor', e.target.value)}
                    placeholder="#000000"
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Card Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>Card/Panel Container</span>
                  <span className="font-mono text-[9px]">{currentTheme.cardColor}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={currentTheme.cardColor}
                    onChange={(e) => handleFieldChange('cardColor', e.target.value)}
                    className="w-12 h-11 bg-background border border-outline rounded-xl p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentTheme.cardColor}
                    onChange={(e) => handleFieldChange('cardColor', e.target.value)}
                    placeholder="#0F0F11"
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Text Main Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>Primary Typography Color</span>
                  <span className="font-mono text-[9px]">{currentTheme.textColor}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={currentTheme.textColor}
                    onChange={(e) => handleFieldChange('textColor', e.target.value)}
                    className="w-12 h-11 bg-background border border-outline rounded-xl p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentTheme.textColor}
                    onChange={(e) => handleFieldChange('textColor', e.target.value)}
                    placeholder="#FFFFFF"
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Text Muted Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>Secondary Muted Typography</span>
                  <span className="font-mono text-[9px]">{currentTheme.textMutedColor}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={currentTheme.textMutedColor}
                    onChange={(e) => handleFieldChange('textMutedColor', e.target.value)}
                    className="w-12 h-11 bg-background border border-outline rounded-xl p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentTheme.textMutedColor}
                    onChange={(e) => handleFieldChange('textMutedColor', e.target.value)}
                    placeholder="#9CA3AF"
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Headings Font Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Display/Headings Font</label>
                <select
                  value={currentTheme.fontHeading}
                  onChange={(e) => handleFieldChange('fontHeading', e.target.value)}
                  className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all cursor-pointer"
                >
                  {GOOGLE_FONTS_HEADING.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <span className="text-[9px] text-primary block mt-1 px-1 font-mono uppercase tracking-wider" style={{ fontFamily: currentTheme.fontHeading }}>
                  Sample: Skip Queues with {venue.name}
                </span>
              </div>

              {/* Body Font Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Body Text Font</label>
                <select
                  value={currentTheme.fontBody}
                  onChange={(e) => handleFieldChange('fontBody', e.target.value)}
                  className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all cursor-pointer"
                >
                  {GOOGLE_FONTS_BODY.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <span className="text-[9px] text-on-surface-variant block mt-1 px-1 font-mono uppercase tracking-wider" style={{ fontFamily: currentTheme.fontBody }}>
                  Sample: Secure checkout fully monitored by Wayta South Africa.
                </span>
              </div>

              {/* UI Density */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">UI Density Engine</label>
                <select
                  value={currentTheme.uiDensity}
                  onChange={(e) => handleFieldChange('uiDensity', e.target.value as any)}
                  className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="comfortable">Comfortable (Generous Space)</option>
                  <option value="compact">Compact (Higher Stock Density)</option>
                  <option value="minimalist">Minimalist (Artistic & Sharp)</option>
                </select>
              </div>

              {/* Iconography Style */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Iconography Aesthetic</label>
                <select
                  value={currentTheme.iconographyStyle}
                  onChange={(e) => handleFieldChange('iconographyStyle', e.target.value as any)}
                  className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="glass">Glassmorphism (Polished Glow)</option>
                  <option value="line">Line Art (Minimalist Elegance)</option>
                  <option value="flat">Flat Vector (Bold Pop)</option>
                </select>
              </div>

              {/* Wait-Indicator Style */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Wait-Indicator Loading Animation</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ring', label: '⭕ Halo Ring' },
                    { id: 'pulse', label: '💓 Heartbeat Pulse' },
                    { id: 'bar', label: '📊 Ledger Bar' },
                    { id: 'neon-spin', label: '🌀 Neon Spin' }
                  ].map(loader => (
                    <button
                      key={loader.id}
                      type="button"
                      onClick={() => handleFieldChange('loaderStyle', loader.id)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        currentTheme.loaderStyle === loader.id 
                          ? "bg-primary border-primary text-black" 
                          : "bg-background border-outline hover:border-outline-variant text-on-surface"
                      }`}
                    >
                      {loader.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Real-time Accessibility Verification Gauge */}
          <div className="bg-surface border border-outline rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <ShieldCheck size={14} className="text-primary" /> Automated WCAG 2.1 Accessibility Guard
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-background border border-outline rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Primary Contrast</span>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-mono font-black">{contrastPrimaryToBg.toFixed(2)}:1</span>
                  <span className="text-[8px] uppercase tracking-wider opacity-60">Ratio</span>
                </div>
                <div className="mt-3">
                  {isPrimaryAccessible ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
                      <Check size={10} /> AA Compliant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-error bg-error/10 border border-error/20 px-2.5 py-1 rounded-full">
                      <AlertTriangle size={10} /> Non-Compliant
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-background border border-outline rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Heading Contrast</span>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-mono font-black">{contrastTextToBg.toFixed(2)}:1</span>
                  <span className="text-[8px] uppercase tracking-wider opacity-60">Ratio</span>
                </div>
                <div className="mt-3">
                  {contrastTextToBg >= 4.5 ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
                      <Check size={10} /> AAA Compliant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-warning bg-warning/10 border border-warning/20 px-2.5 py-1 rounded-full">
                      <AlertTriangle size={10} /> Low Contrast
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-background border border-outline rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Smart Correction</span>
                <p className="text-[9px] text-on-surface-variant mt-1">If contrast checks fail, dynamically balance color values automatically.</p>
                <button
                  type="button"
                  onClick={handleSmartAccessibilityCorrection}
                  className="mt-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Auto-Correct Contrast
                </button>
              </div>
            </div>
            
            <p className="text-[9px] text-on-surface-variant leading-relaxed">
              * WCAG 2.1 compliance is strictly calculated to ensure readability of menu descriptions and checkout details in dimly lit environments such as bars and nightclubs. Wayta retains secondary brand badges for high security.
            </p>
          </div>

          {/* Action Trigger Block */}
          <div className="pt-2">
            <button
              onClick={handleSaveTheme}
              disabled={isSaving}
              className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-primary/95 shadow-xl shadow-primary/20 disabled:opacity-55 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Publishing Theme to Wayta Mesh Nodes...
                </>
              ) : (
                <>
                  <Wand2 size={16} /> Sync & Publish Live Dynamic Theme
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Side: Interactive Mock Phone Preview (5 columns) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
              <Smartphone size={14} className="text-primary" /> Live Handset Simulation
            </h3>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setActivePreviewScreen('menu')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  activePreviewScreen === 'menu' 
                    ? "bg-primary text-black" 
                    : "bg-surface border border-outline hover:border-outline-variant text-on-surface"
                }`}
              >
                Wayta Menu
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewScreen('statement')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  activePreviewScreen === 'statement' 
                    ? "bg-primary text-black" 
                    : "bg-surface border border-outline hover:border-outline-variant text-on-surface"
                }`}
              >
                Checkout & Load
              </button>
            </div>
          </div>

          {/* Beautiful Smartphone Container Mockup */}
          <div className="relative mx-auto max-w-[340px] aspect-[9/18.5] bg-black rounded-[40px] border-4 border-zinc-800 p-2.5 shadow-2xl shadow-black/80 flex flex-col overflow-hidden">
            
            {/* Phone Speaker & Camera Cutout Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-5 bg-black rounded-b-2xl z-40 flex items-center justify-center gap-1.5">
              <div className="w-10 h-1 bg-zinc-800 rounded-full" />
              <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full border border-zinc-800" />
            </div>

            {/* Simulated Live Screen Frame */}
            <div 
              className="flex-1 w-full rounded-[30px] overflow-hidden flex flex-col relative select-none"
              style={{ 
                backgroundColor: currentTheme.backgroundColor,
                color: currentTheme.textColor,
                fontFamily: `'${currentTheme.fontBody}', sans-serif`
              }}
            >
              
              {/* StatusBar Mock */}
              <div className="h-6 flex justify-between items-center px-6 text-[9px] font-mono opacity-50 z-20 mt-1">
                <span>12:00 UTC</span>
                <div className="flex items-center gap-1">
                  <span>5G LTE</span>
                  <div className="w-4 h-2.5 border border-current rounded-sm p-0.5 flex items-center">
                    <div className="w-full h-full bg-current" />
                  </div>
                </div>
              </div>

              {/* Wayta Top Branding Guard (Wayta Brand Cohesion element) */}
              <div className="border-b border-white/5 py-1.5 px-4 flex justify-between items-center bg-black/40 backdrop-blur-md z-20">
                <span className="text-[10px] font-black tracking-widest text-[#39FF14] flex items-center gap-1">
                  ⚡ WAYTA
                </span>
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1">
                  South Africa
                </span>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 pb-20 relative scrollbar-hide z-10">
                
                {activePreviewScreen === 'menu' ? (
                  /* SCREEN 1: WAYTA MENU PREVIEW */
                  <div className="space-y-4">
                    
                    {/* Venue Brand Banner with Custom Heading Font */}
                    <div className={`relative overflow-hidden ${getRadiusClass()} border border-white/5 bg-gradient-to-br from-white/10 to-transparent p-4`}>
                      <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Palette size={48} style={{ color: currentTheme.primaryColor }} />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <img 
                          src={venue.image || '/placeholder.png'} 
                          alt="logo" 
                          className="w-10 h-10 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <h4 
                            className="text-sm font-black uppercase tracking-tight"
                            style={{ fontFamily: `'${currentTheme.fontHeading}', sans-serif` }}
                          >
                            {venue.name}
                          </h4>
                          <span className="text-[8px] opacity-60 block uppercase tracking-widest">
                            ⚡ On-Site Order & Pay
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Filter Category Tabs with Dynamic styles */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
                      {['Drinks', 'Bottle Service', 'General'].map((cat, i) => (
                        <span 
                          key={cat} 
                          className={`text-[8px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap tracking-wider uppercase transition-all ${
                            i === 0 
                              ? "text-black shadow-md" 
                              : "border border-white/5 bg-white/5"
                          }`}
                          style={i === 0 ? { backgroundColor: currentTheme.primaryColor } : {}}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Dynamic Menu items styled based on Density & Colors */}
                    <div className="space-y-2">
                      {[
                        { name: 'Castle Lite Draught', desc: '440ml Cold Brew Draught Beer', price: 'R45' },
                        { name: 'Belvedere Vodka Premium', desc: 'Premium luxury French Vodka pour', price: 'R95' },
                        { name: 'Wayta Cosmic Gin Cocktail', desc: 'Local artisan gin with elderflower', price: 'R85' },
                      ].map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`border border-white/5 bg-opacity-30 flex items-center justify-between transition-all ${getPaddingClass()} ${getRadiusClass()}`}
                          style={{ backgroundColor: currentTheme.cardColor }}
                        >
                          <div className="space-y-0.5 max-w-[70%]">
                            <h5 className="text-[10px] font-bold uppercase tracking-wide truncate">{item.name}</h5>
                            <p className="text-[8px] opacity-60 truncate">{item.desc}</p>
                            <span 
                              className="text-[10px] font-black font-mono"
                              style={{ color: currentTheme.primaryColor }}
                            >
                              {item.price}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            className={`text-[8px] font-black uppercase tracking-widest px-2 py-1.5 text-black flex items-center gap-1 transition-all ${
                              currentTheme.uiDensity === 'minimalist' ? 'rounded-none' : 'rounded-lg'
                            }`}
                            style={{ backgroundColor: currentTheme.primaryColor }}
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>

                  </div>
                ) : (
                  /* SCREEN 2: PAYMENT & STATEMENT LOAD PREVIEW */
                  <div className="space-y-4">
                    
                    {/* Brand confirmation alert */}
                    <div className={`p-4 border border-white/5 flex flex-col items-center justify-center text-center space-y-3 ${getRadiusClass()}`} style={{ backgroundColor: currentTheme.cardColor }}>
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Skip the Queue Checkout</span>
                      
                      {/* Dynamic Loader Wait-Indicator simulation */}
                      <div className="h-12 flex items-center justify-center">
                        {currentTheme.loaderStyle === 'ring' && (
                          <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${currentTheme.primaryColor} transparent ${currentTheme.primaryColor} ${currentTheme.primaryColor}` }} />
                        )}
                        {currentTheme.loaderStyle === 'pulse' && (
                          <div className="w-8 h-8 rounded-full animate-ping opacity-75" style={{ backgroundColor: currentTheme.primaryColor }} />
                        )}
                        {currentTheme.loaderStyle === 'bar' && (
                          <div className="flex gap-1 items-end h-6">
                            {[1, 2, 3].map(bar => (
                              <div key={bar} className="w-1.5 h-full animate-pulse" style={{ backgroundColor: currentTheme.primaryColor }} />
                            ))}
                          </div>
                        )}
                        {currentTheme.loaderStyle === 'neon-spin' && (
                          <div className="relative w-8 h-8">
                            <div className="absolute inset-0 rounded-full border-4 border-dashed animate-spin" style={{ borderColor: currentTheme.primaryColor }} />
                          </div>
                        )}
                      </div>

                      <span className="text-[9px] font-bold uppercase tracking-wider animate-pulse">Securing transaction connection...</span>
                    </div>

                    {/* Party Statement / Budget Shield mockup */}
                    <div className={`p-4 border border-white/5 space-y-3 ${getRadiusClass()}`} style={{ backgroundColor: currentTheme.cardColor }}>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#39FF14] block">🛡️ Party Statement Protection</span>
                      
                      <div className="space-y-1 text-[9px] font-mono">
                        <div className="flex justify-between">
                          <span>Subtotal (Drinks)</span>
                          <span>R225.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Wayta Fast-track Fee</span>
                          <span>R11.25</span>
                        </div>
                        <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold text-[10px]">
                          <span>TOTAL DEBIT</span>
                          <span style={{ color: currentTheme.primaryColor }}>R236.25</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          className="w-full py-2 px-4 text-black text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: currentTheme.primaryColor }}
                        >
                          💸 Pay & Skip Queue
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Wayta bottom safety footer bar */}
              <div className="absolute bottom-3 left-0 right-0 text-center z-20 flex justify-center">
                <span className="px-3 py-1 bg-black/80 backdrop-blur-md rounded-full border border-white/10 text-[7px] font-mono uppercase tracking-widest opacity-65">
                  🛡️ Secure Pay South Africa
                </span>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Floating alert/success message container */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 right-6 z-[120] bg-surface-container border border-primary/30 p-4 rounded-xl flex items-center gap-3 shadow-2xl shadow-primary/10"
          >
            <LoopIcon size={16} className="text-primary animate-spin" />
            <p className="text-xs font-black uppercase tracking-tight text-white">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
