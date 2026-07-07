import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wand2, Palette, Sparkles, Smartphone, ShieldCheck, Check, 
  AlertTriangle, RefreshCw, Eye, Sliders, ChevronRight, MapPin, 
  Database, Layout, Image, Type, Info, CheckCircle, Smartphone as PhoneIcon,
  Trash2, Plus, Heart, Save
} from 'lucide-react';
import { ThemeConfig, defaultThemes, calculateContrastRatio } from '../contexts/DynamicThemeContext';
import { Venue } from '../types';
import { db, rtdb } from '../lib/firebase';
import { doc, setDoc, collection, getDocs, query, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, update } from 'firebase/database';

interface ThemePreviewerProps {
  venues: Venue[];
  onThemeSaved?: () => void;
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

export const ThemePreviewer: React.FC<ThemePreviewerProps> = ({ venues, onThemeSaved }) => {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>({
    ...defaultThemes['wayta-night']
  });

  const [activePreviewScreen, setActivePreviewScreen] = useState<'menu' | 'loader' | 'budget' | 'safety'>('menu');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [applyGlobally, setApplyGlobally] = useState(false);
  const [saveAsDefaultFallback, setSaveAsDefaultFallback] = useState(false);

  // Load first venue as default if available
  useEffect(() => {
    if (venues.length > 0 && !selectedVenue) {
      setSelectedVenue(venues[0]);
    }
  }, [venues, selectedVenue]);

  // Load selected venue's stored theme
  useEffect(() => {
    if (selectedVenue) {
      const venueTheme = (selectedVenue as any).theme || defaultThemes['wayta-night'];
      setCurrentTheme({
        ...defaultThemes['wayta-night'],
        ...venueTheme
      });
    }
  }, [selectedVenue]);

  const [activePresetTab, setActivePresetTab] = useState<'system' | 'library' | 'venues'>('system');
  const [libraryThemes, setLibraryThemes] = useState<ThemeConfig[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [themeSaveName, setThemeSaveName] = useState('');

  // Load Custom Theme Library from Firestore
  const fetchLibraryThemes = async () => {
    setIsLoadingLibrary(true);
    try {
      const q = query(collection(db, 'themes'));
      const querySnapshot = await getDocs(q);
      const loaded: ThemeConfig[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loaded.push({
          id: docSnap.id,
          ...data
        } as any);
      });
      setLibraryThemes(loaded);
    } catch (err: any) {
      console.error("Failed to load themes library:", err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    fetchLibraryThemes();
  }, []);

  // Save current customizer setup to Firestore Themes Library
  const handleSaveToLibrary = async () => {
    if (!themeSaveName.trim()) {
      triggerToast('Please provide a name for the custom library theme.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const newThemeDoc = {
        name: themeSaveName.trim(),
        primaryColor: currentTheme.primaryColor,
        secondaryColor: currentTheme.secondaryColor,
        accentColor: currentTheme.accentColor || currentTheme.secondaryColor,
        backgroundColor: currentTheme.backgroundColor,
        cardColor: currentTheme.cardColor,
        textColor: currentTheme.textColor,
        textMutedColor: currentTheme.textMutedColor,
        fontHeading: currentTheme.fontHeading,
        fontBody: currentTheme.fontBody,
        uiDensity: currentTheme.uiDensity,
        iconographyStyle: currentTheme.iconographyStyle,
        loaderStyle: currentTheme.loaderStyle,
        createdAt: new Date().toISOString()
      };
      
      const colRef = collection(db, 'themes');
      await addDoc(colRef, newThemeDoc);
      
      triggerToast(`Theme "${themeSaveName}" saved to Library!`, 'success');
      setThemeSaveName('');
      fetchLibraryThemes();
    } catch (err: any) {
      triggerToast(`Save to library failed: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete theme from Firestore Library
  const handleDeleteFromLibrary = async (themeId: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'themes', themeId));
      triggerToast(`Theme "${name}" deleted from library.`, 'success');
      fetchLibraryThemes();
    } catch (err: any) {
      triggerToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  // Handle color or text updates
  const handleFieldChange = (key: keyof ThemeConfig, value: string) => {
    setCurrentTheme(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Load templates/presets
  const applyPreset = (presetKey: 'wayta-night' | 'aesthetic-noir' | 'neon-pulse') => {
    setCurrentTheme(defaultThemes[presetKey]);
    triggerToast(`Applied Preset: ${defaultThemes[presetKey].name}`, 'success');
  };

  // Toast Helper
  const triggerToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // WCAG Relative Luminance
  function getRelativeLuminance(hex: string): number {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  // Smart Contrast Auto-Correction
  const handleAutoCorrectContrast = () => {
    const isBgDark = getRelativeLuminance(currentTheme.backgroundColor) < 0.5;
    
    // Shift color arrays to satisfy WCAG AA (>= 4.5:1 ratio)
    let correctedPrimary = currentTheme.primaryColor;
    let correctedText = currentTheme.textColor;
    let correctedMuted = currentTheme.textMutedColor;

    if (isBgDark) {
      // If dark background, force primary & text to be bright and high contrast
      if (calculateContrastRatio(correctedPrimary, currentTheme.backgroundColor) < 4.5) {
        correctedPrimary = '#39FF14'; // Wayta Vibrant Green
      }
      if (calculateContrastRatio(correctedText, currentTheme.backgroundColor) < 4.5) {
        correctedText = '#FFFFFF';
      }
      if (calculateContrastRatio(correctedMuted, currentTheme.backgroundColor) < 3.0) {
        correctedMuted = '#9CA3AF';
      }
    } else {
      // If light background, force primary & text to be dark and legible
      if (calculateContrastRatio(correctedPrimary, currentTheme.backgroundColor) < 4.5) {
        correctedPrimary = '#052e16'; // Deep forest green
      }
      if (calculateContrastRatio(correctedText, currentTheme.backgroundColor) < 4.5) {
        correctedText = '#000000';
      }
      if (calculateContrastRatio(correctedMuted, currentTheme.backgroundColor) < 3.0) {
        correctedMuted = '#4B5563';
      }
    }

    setCurrentTheme(prev => ({
      ...prev,
      primaryColor: correctedPrimary,
      textColor: correctedText,
      textMutedColor: correctedMuted
    }));

    triggerToast('Smart accessibility guard applied contrast corrections.', 'success');
  };

  // WCAG Calculations
  const contrastPrimaryToBg = calculateContrastRatio(currentTheme.primaryColor, currentTheme.backgroundColor);
  const contrastTextToBg = calculateContrastRatio(currentTheme.textColor, currentTheme.backgroundColor);
  const isPrimaryAccessible = contrastPrimaryToBg >= 4.5;
  const isTextAccessible = contrastTextToBg >= 4.5;

  // Save Theme to selected Venue (Updates both RTDB & Firestore)
  const handleCommitTheme = async () => {
    if (!selectedVenue) {
      triggerToast('Select a venue terminal first.', 'error');
      return;
    }
    
    setIsSaving(true);
    try {
      const venueId = selectedVenue.id;
      const updatedTheme = { ...currentTheme };
      
      // 1. Update RTDB counterpart for active venue
      const rtdbRef = ref(rtdb, `venues/${venueId}`);
      await update(rtdbRef, { theme: updatedTheme });

      // 2. Update Firestore Counterpart for active venue
      const fsDocRef = doc(db, 'venues', venueId);
      await setDoc(fsDocRef, { theme: updatedTheme }, { merge: true });

      // 3. Handle applying throughout the platform to ALL venues
      if (applyGlobally && venues && venues.length > 0) {
        for (const v of venues) {
          if (v.id !== venueId) {
            // Update RTDB for other venues
            const vRtdbRef = ref(rtdb, `venues/${v.id}`);
            await update(vRtdbRef, { theme: updatedTheme });

            // Update Firestore for other venues
            const vFsDocRef = doc(db, 'venues', v.id);
            await setDoc(vFsDocRef, { theme: updatedTheme }, { merge: true });
          }
        }
      }

      // 4. Handle saving as the central platform default fallback
      if (saveAsDefaultFallback) {
        const centralRef = doc(db, 'system', 'theme');
        await setDoc(centralRef, {
          ...updatedTheme,
          isGlobalFallback: true,
          updatedAt: new Date().toISOString()
        });
      }

      // Generate precise feedback message
      let successMessage = `Theme successfully committed & synced for ${selectedVenue.name}!`;
      if (applyGlobally) {
        successMessage = `Theme successfully deployed throughout the platform across all ${venues.length} venues!`;
      } else if (saveAsDefaultFallback) {
        successMessage = `Theme synced for ${selectedVenue.name} and established as the global default fallback!`;
      }

      triggerToast(successMessage, 'success');
      if (onThemeSaved) onThemeSaved();
    } catch (err: any) {
      triggerToast(`Theme commit failed: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Design UI classes based on UI density
  const getRadiusClass = () => {
    if (currentTheme.uiDensity === 'minimalist') return 'rounded-none';
    if (currentTheme.uiDensity === 'compact') return 'rounded-lg';
    return 'rounded-2xl';
  };

  const getPaddingClass = () => {
    if (currentTheme.uiDensity === 'minimalist') return 'p-2';
    if (currentTheme.uiDensity === 'compact') return 'p-3';
    return 'p-4';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Branding Header Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-md text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
              <Sparkles size={11} className="animate-pulse" /> Live Dynamic Theming Matrix
            </span>
            <span className="text-xs font-bold text-on-surface-variant font-mono">Real-time Preview Engine</span>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight mt-2 flex items-center gap-2">
            <Wand2 className="text-primary" /> Multi-Tenant Theme Previewer
          </h2>
          <p className="text-on-surface-variant text-sm mt-1 max-w-2xl">
            Toggle between saved venue configurations, test templates, and preview real-time customer app experiences. Maintain Wayta brand integrity and WCAG accessibility standards before deploying.
          </p>
        </div>

        {/* Venue Selection Vector */}
        <div className="flex flex-col gap-1.5 min-w-[220px]">
          <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
            <MapPin size={10} /> Select Target Venue
          </span>
          <select
            value={selectedVenue?.id || ''}
            onChange={(e) => {
              const v = venues.find(v => v.id === e.target.value) || null;
              setSelectedVenue(v);
            }}
            className="h-11 bg-surface border border-outline rounded-xl px-4 text-xs font-black uppercase tracking-wider outline-none focus:border-primary transition-all cursor-pointer"
          >
            {venues.map((v, idx) => (
              <option key={`theme-v-${v.id || idx}-${idx}`} value={v.id}>🏢 {v.name}</option>
            ))}
            {venues.length === 0 && <option value="">No Venues Loaded</option>}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Control Panel Column (7/12 width) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Theme Library & Presets (Allows toggling between saved configurations) */}
          <div className="bg-surface border border-outline rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline/10 pb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <Palette size={14} className="text-primary" /> Saved Themes Matrix
              </h3>
              
              {/* Tab Toggles */}
              <div className="flex bg-background border border-outline p-1 rounded-xl">
                {[
                  { id: 'system', label: 'System Presets' },
                  { id: 'library', label: 'Custom Library' },
                  { id: 'venues', label: 'Other Venues' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivePresetTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      activePresetTab === tab.id
                        ? 'bg-primary text-black font-black'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTENT: SYSTEM PRESETS */}
            {activePresetTab === 'system' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-300">
                {(['wayta-night', 'aesthetic-noir', 'neon-pulse'] as const).map(presetKey => {
                  const preset = defaultThemes[presetKey];
                  const isCurrent = currentTheme.name === preset.name || 
                    (currentTheme.primaryColor === preset.primaryColor && currentTheme.backgroundColor === preset.backgroundColor);
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => {
                        setCurrentTheme(preset);
                        triggerToast(`Applied System Theme: ${preset.name}`, 'success');
                      }}
                      className={`group relative border bg-background/50 hover:bg-surface-variant/20 p-4 rounded-2xl text-left transition-all active:scale-[0.98] ${
                        isCurrent ? 'border-primary shadow-lg shadow-primary/5' : 'border-outline hover:border-primary/40'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black uppercase tracking-wider group-hover:text-primary transition-colors flex items-center gap-1">
                          {preset.name} {isCurrent && <Check size={12} className="text-primary" />}
                        </span>
                      </div>
                      
                      {/* Tiny Color Swatches representation */}
                      <div className="flex gap-1.5 mt-3">
                        <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: preset.primaryColor }} title="Primary" />
                        <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: preset.secondaryColor }} title="Secondary" />
                        <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: preset.backgroundColor }} title="Canvas" />
                        <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: preset.cardColor }} title="Card" />
                      </div>
                      
                      <span className="text-[9px] font-mono opacity-40 group-hover:opacity-100 transition-opacity mt-2.5 block uppercase tracking-widest">
                        {preset.fontHeading} / {preset.fontBody}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: CUSTOM LIBRARY */}
            {activePresetTab === 'library' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {isLoadingLibrary ? (
                  <div className="py-8 text-center text-xs font-mono text-on-surface-variant flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-primary" /> Accessing Firestore Saved Themes...
                  </div>
                ) : libraryThemes.length === 0 ? (
                  <div className="py-8 border border-dashed border-outline rounded-2xl text-center text-xs text-on-surface-variant">
                    No custom templates saved in library yet. Complete calibration below and name to store permanently.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                    {libraryThemes.map((libTheme, idx) => {
                      const isCurrent = currentTheme.name === libTheme.name ||
                        (currentTheme.primaryColor === libTheme.primaryColor && currentTheme.backgroundColor === libTheme.backgroundColor);
                      return (
                        <div
                          key={`lib-theme-${libTheme.id || idx}-${idx}`}
                          className={`relative border bg-background/50 p-4 rounded-2xl text-left transition-all flex flex-col justify-between ${
                            isCurrent ? 'border-primary' : 'border-outline'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentTheme(libTheme);
                              triggerToast(`Loaded Custom Theme: ${libTheme.name}`, 'success');
                            }}
                            className="flex-1 w-full text-left"
                          >
                            <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:text-primary transition-colors">
                              {libTheme.name} {isCurrent && <Check size={12} className="text-primary" />}
                            </span>
                            
                            {/* Tiny Color Swatches representation */}
                            <div className="flex gap-1.5 mt-3">
                              <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: libTheme.primaryColor }} title="Primary" />
                              <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: libTheme.secondaryColor }} title="Secondary" />
                              <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: libTheme.backgroundColor }} title="Canvas" />
                              <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: libTheme.cardColor }} title="Card" />
                            </div>
                            
                            <span className="text-[9px] font-mono opacity-40 mt-2.5 block uppercase tracking-widest">
                              {libTheme.fontHeading} / {libTheme.fontBody}
                            </span>
                          </button>

                          {/* Delete button from Library */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (libTheme.id) handleDeleteFromLibrary(libTheme.id, libTheme.name);
                            }}
                            className="absolute top-3 right-3 text-on-surface-variant hover:text-error transition-colors p-1 animate-in fade-in"
                            title="Delete configuration"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline Form to Save Current Setup */}
                <div className="border-t border-outline/10 pt-4 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    Save current setup as custom template
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g., Ultra Sunset Festival Theme"
                      value={themeSaveName}
                      onChange={(e) => setThemeSaveName(e.target.value)}
                      className="flex-1 h-10 bg-background border border-outline rounded-xl px-4 text-xs font-bold outline-none focus:border-primary transition-all text-on-surface"
                    />
                    <button
                      type="button"
                      onClick={handleSaveToLibrary}
                      disabled={isSaving}
                      className="h-10 px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <Save size={13} /> Store Template
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: THEMES FROM OTHER VENUES */}
            {activePresetTab === 'venues' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                  {venues
                    .filter(v => v.id !== selectedVenue?.id && (v as any).theme)
                    .map((v, idx) => {
                      const venueTheme = (v as any).theme as ThemeConfig;
                      const isCurrent = currentTheme.primaryColor === venueTheme.primaryColor && 
                        currentTheme.backgroundColor === venueTheme.backgroundColor;
                      return (
                        <button
                          key={`other-venue-theme-${v.id || idx}-${idx}`}
                          type="button"
                          onClick={() => {
                            setCurrentTheme({
                              ...defaultThemes['wayta-night'],
                              ...venueTheme,
                              name: `${v.name} Theme`
                            });
                            triggerToast(`Cloned active theme from ${v.name}!`, 'success');
                          }}
                          className={`group relative border bg-background/50 hover:bg-surface-variant/20 p-4 rounded-2xl text-left transition-all active:scale-[0.98] ${
                            isCurrent ? 'border-primary' : 'border-outline hover:border-primary/40'
                          }`}
                        >
                          <span className="text-xs font-black uppercase tracking-wider group-hover:text-primary transition-colors flex items-center gap-1.5">
                            🏢 {v.name} {isCurrent && <Check size={12} className="text-primary" />}
                          </span>

                          {/* Swatches */}
                          <div className="flex gap-1.5 mt-3">
                            <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: venueTheme.primaryColor }} title="Primary" />
                            <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: venueTheme.secondaryColor }} title="Secondary" />
                            <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: venueTheme.backgroundColor }} title="Canvas" />
                            <span className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: venueTheme.cardColor }} title="Card" />
                          </div>

                          <span className="text-[9px] font-mono opacity-40 group-hover:opacity-100 transition-opacity mt-2.5 block uppercase tracking-widest">
                            {venueTheme.fontHeading || 'Outfit'} / {venueTheme.fontBody || 'Inter'}
                          </span>
                        </button>
                      );
                    })}

                  {venues.filter(v => v.id !== selectedVenue?.id && (v as any).theme).length === 0 && (
                    <div className="col-span-2 py-8 border border-dashed border-outline rounded-2xl text-center text-xs text-on-surface-variant">
                      No other venues have stored themes configured yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Core Customizer Fields Table */}
          <div className="bg-surface border border-outline rounded-3xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-outline/10 pb-4">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Sliders size={16} className="text-primary" /> Theme Customization Vectors
              </h3>
              <span className="text-[10px] font-mono text-on-surface-variant">Live Calibration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Primary Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>Primary Brand Hue</span>
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
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Secondary Accent */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>Secondary Accent Hue</span>
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
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Canvas Background */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>App Canvas Background</span>
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
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Card Surface */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>Card Surface Color</span>
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
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Typography Primary */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>Primary Typo Color</span>
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
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Typography Muted */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex justify-between">
                  <span>Secondary Muted Color</span>
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
                    className="flex-1 h-11 bg-background border border-outline rounded-xl px-4 text-xs font-semibold font-mono uppercase outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Headings Google Font */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Headings Typography</label>
                <select
                  value={currentTheme.fontHeading}
                  onChange={(e) => handleFieldChange('fontHeading', e.target.value)}
                  className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all cursor-pointer"
                >
                  {GOOGLE_FONTS_HEADING.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Body Google Font */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Body Typography</label>
                <select
                  value={currentTheme.fontBody}
                  onChange={(e) => handleFieldChange('fontBody', e.target.value)}
                  className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all cursor-pointer"
                >
                  {GOOGLE_FONTS_BODY.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Layout Density */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">UI Spacing Density</label>
                <select
                  value={currentTheme.uiDensity}
                  onChange={(e) => handleFieldChange('uiDensity', e.target.value as any)}
                  className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="comfortable">Comfortable (Balanced padding)</option>
                  <option value="compact">Compact (Tighter high density)</option>
                  <option value="minimalist">Minimalist (Extreme luxury padding)</option>
                </select>
              </div>

              {/* Iconography */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Icon Style Vector</label>
                <select
                  value={currentTheme.iconographyStyle}
                  onChange={(e) => handleFieldChange('iconographyStyle', e.target.value as any)}
                  className="w-full h-11 bg-background border border-outline rounded-xl px-4 text-xs font-bold uppercase tracking-wider outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="glass">Glassmorphic Glow</option>
                  <option value="line">Thin Line Art</option>
                  <option value="flat">Flat Minimal Vector</option>
                </select>
              </div>

              {/* Wait Indicator loading style */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Dynamic Spinner Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ring', label: '⭕ Halo Ring' },
                    { id: 'pulse', label: '💓 Heartbeat' },
                    { id: 'bar', label: '📊 Ledger Bar' },
                    { id: 'neon-spin', label: '🌀 Neon Vortex' }
                  ].map(loader => (
                    <button
                      key={loader.id}
                      type="button"
                      onClick={() => handleFieldChange('loaderStyle', loader.id)}
                      className={`py-2 text-xs font-black uppercase tracking-widest rounded-xl border transition-all ${
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

          {/* WCAG Accessibility Guardian Grid */}
          <div className="bg-surface border border-outline rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <ShieldCheck size={14} className="text-primary" /> WCAG 2.1 Contrast Auditing Console
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-background border border-outline rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Primary Contrast</span>
                <div className="mt-2 flex items-baseline gap-1 font-mono font-black text-xl">
                  <span>{contrastPrimaryToBg.toFixed(2)}:1</span>
                </div>
                <div className="mt-3">
                  {isPrimaryAccessible ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-success bg-success/10 border border-success/20 px-2.5 py-0.5 rounded-full">
                      <Check size={10} /> Compliant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-error bg-error/10 border border-error/20 px-2.5 py-0.5 rounded-full">
                      <AlertTriangle size={10} /> Bad Contrast
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-background border border-outline rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Text Contrast</span>
                <div className="mt-2 flex items-baseline gap-1 font-mono font-black text-xl">
                  <span>{contrastTextToBg.toFixed(2)}:1</span>
                </div>
                <div className="mt-3">
                  {isTextAccessible ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-success bg-success/10 border border-success/20 px-2.5 py-0.5 rounded-full">
                      <Check size={10} /> Legible
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-error bg-error/10 border border-error/20 px-2.5 py-0.5 rounded-full">
                      <AlertTriangle size={10} /> Bad Contrast
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-background border border-outline rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Smart Healing</span>
                <p className="text-[9px] text-on-surface-variant mt-1.5 leading-relaxed">Fix visual readability checks automatically with zero downtime.</p>
                <button
                  type="button"
                  onClick={handleAutoCorrectContrast}
                  className="mt-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Auto-Correct
                </button>
              </div>
            </div>
          </div>

          {/* Scope of Theme Deployment Option Switches */}
          <div className="bg-surface border border-outline rounded-3xl p-5 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
              <Sliders size={12} className="text-primary" /> Scope of Theme Deployment
            </h4>
            
            <div className="space-y-3">
              {/* Option 1: Apply Throughout the Platform */}
              <label className="flex items-start gap-3 p-3 bg-background/50 hover:bg-surface-variant/15 border border-outline rounded-2xl cursor-pointer transition-all select-none group">
                <input
                  type="checkbox"
                  checked={applyGlobally}
                  onChange={(e) => setApplyGlobally(e.target.checked)}
                  className="mt-1 rounded border-outline text-primary focus:ring-primary/20 accent-primary w-4 h-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-black uppercase tracking-wider group-hover:text-primary transition-colors block">
                    Apply throughout the platform
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-relaxed block">
                    Synchronizes this theme setup across all {venues.length} active venue terminals throughout the entire platform database.
                  </span>
                </div>
              </label>

              {/* Option 2: Save as Global Default Fallback */}
              <label className="flex items-start gap-3 p-3 bg-background/50 hover:bg-surface-variant/15 border border-outline rounded-2xl cursor-pointer transition-all select-none group">
                <input
                  type="checkbox"
                  checked={saveAsDefaultFallback}
                  onChange={(e) => setSaveAsDefaultFallback(e.target.checked)}
                  className="mt-1 rounded border-outline text-primary focus:ring-primary/20 accent-primary w-4 h-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-black uppercase tracking-wider group-hover:text-primary transition-colors block">
                    Establish as system default fallback
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-relaxed block">
                    Saves this setup in Firestore as the central default fallback theme for newly provisioned venue terminals.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Save Action Callout */}
          <div className="pt-2">
            <button
              onClick={handleCommitTheme}
              disabled={isSaving || !selectedVenue}
              className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-primary/95 shadow-xl shadow-primary/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Synchronizing Themes Across Clusters...
                </>
              ) : (
                <>
                  <Database size={16} /> Deploy & Save Live Visual Theme
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Simulated Screen column (5/12 width) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
              <PhoneIcon size={14} className="text-primary" /> Visual Core Emulator
            </h3>
            <div className="flex gap-1">
              {[
                { id: 'menu', label: 'Menu' },
                { id: 'loader', label: 'Loader' },
                { id: 'budget', label: 'Budget' },
                { id: 'safety', label: 'Safety' }
              ].map(screen => (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => setActivePreviewScreen(screen.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    activePreviewScreen === screen.id 
                      ? "bg-primary text-black" 
                      : "bg-surface border border-outline hover:border-outline-variant text-on-surface"
                  }`}
                >
                  {screen.label}
                </button>
              ))}
            </div>
          </div>

          {/* Smartphone Simulator Mock */}
          <div className="relative mx-auto max-w-[340px] aspect-[9/18.5] bg-black rounded-[40px] border-4 border-zinc-800 p-2.5 shadow-2xl shadow-black/80 flex flex-col overflow-hidden">
            
            {/* Camera Cutout notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-5 bg-black rounded-b-2xl z-40 flex items-center justify-center gap-1.5">
              <div className="w-10 h-1 bg-zinc-800 rounded-full" />
              <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full border border-zinc-800" />
            </div>

            {/* Screen Content Wrapper */}
            <div 
              className="flex-1 w-full rounded-[30px] overflow-hidden flex flex-col relative"
              style={{ 
                backgroundColor: currentTheme.backgroundColor,
                color: currentTheme.textColor,
                fontFamily: `'${currentTheme.fontBody}', sans-serif`
              }}
            >
              
              {/* StatusBar */}
              <div className="h-6 flex justify-between items-center px-6 text-[9px] font-mono opacity-50 z-20 mt-1">
                <span>12:00 UTC</span>
                <div className="flex items-center gap-1">
                  <span>5G MESH</span>
                  <div className="w-4 h-2.5 border border-current rounded-sm p-0.5 flex items-center">
                    <div className="w-full h-full bg-current" />
                  </div>
                </div>
              </div>

              {/* Wayta Logo Brand Header Guard (Wayta Brand Cohesion) */}
              <div className="border-b border-white/5 py-1.5 px-4 flex justify-between items-center bg-black/40 backdrop-blur-md z-20">
                <span className="text-[10px] font-black tracking-widest text-[#39FF14] flex items-center gap-1">
                  ⚡ WAYTA
                </span>
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1">
                  {selectedVenue?.name || 'VENUE TERMINAL'}
                </span>
              </div>

              {/* Scrolling Screen viewport */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 pb-20 relative scrollbar-hide z-10">
                
                {activePreviewScreen === 'menu' && (
                  /* SCREEN 1: WAYTA PATRON MENU VIEW */
                  <div className="space-y-4">
                    
                    {/* Venue Title Banner */}
                    <div className={`relative overflow-hidden ${getRadiusClass()} border border-white/5 bg-gradient-to-br from-white/10 to-transparent p-4`}>
                      <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Palette size={48} style={{ color: currentTheme.primaryColor }} />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {selectedVenue?.image && (
                          <img 
                            src={selectedVenue.image} 
                            alt="logo" 
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                          />
                        )}
                        <div>
                          <h4 
                            className="text-sm font-black uppercase tracking-tight"
                            style={{ fontFamily: `'${currentTheme.fontHeading}', sans-serif` }}
                          >
                            {selectedVenue?.name || 'Club Wayta'}
                          </h4>
                          <span className="text-[8px] opacity-60 block uppercase tracking-widest">
                            {selectedVenue?.type || selectedVenue?.venue_type || 'STANDARD'} • Cape Town
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Drink Categories Slider */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
                      {['House Beers', 'Signature Gins', 'Luxury Shots'].map((cat, i) => (
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

                    {/* Menu Drinks Grid */}
                    <div className="space-y-2">
                      {[
                        { name: 'Soweto Gold Ale', desc: 'Craft microbrew South African lager', price: 'R48' },
                        { name: 'Klipdrift Premium Neat', desc: 'Aged South African luxury brandy neat', price: 'R65' },
                        { name: 'Amapiano Sunrise Punch', desc: 'Wayta original wild berry tequila infusion', price: 'R90' },
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
                            className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 text-black flex items-center gap-1 transition-all ${
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
                )}

                {activePreviewScreen === 'loader' && (
                  /* SCREEN 2: ACTIVE ORDER TRACKER WITH LOADER STYLE */
                  <div className="space-y-4">
                    
                    {/* Active Ticket Status Indicator */}
                    <div className={`p-4 border border-white/5 flex flex-col items-center justify-center text-center space-y-3 ${getRadiusClass()}`} style={{ backgroundColor: currentTheme.cardColor }}>
                      <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Live Order Status</span>
                      
                      {/* Interactive Animation loader based on selected loaderStyle */}
                      <div className="h-14 flex items-center justify-center">
                        {currentTheme.loaderStyle === 'ring' && (
                          <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${currentTheme.primaryColor} transparent ${currentTheme.primaryColor} ${currentTheme.primaryColor}` }} />
                        )}
                        {currentTheme.loaderStyle === 'pulse' && (
                          <div className="w-10 h-10 rounded-full animate-ping opacity-75" style={{ backgroundColor: currentTheme.primaryColor }} />
                        )}
                        {currentTheme.loaderStyle === 'bar' && (
                          <div className="flex gap-1.5 items-end h-8">
                            {[1, 2, 3, 4].map(b => (
                              <div key={b} className="w-2 h-full animate-pulse rounded-full" style={{ backgroundColor: currentTheme.primaryColor }} />
                            ))}
                          </div>
                        )}
                        {currentTheme.loaderStyle === 'neon-spin' && (
                          <div className="relative w-10 h-10">
                            <div className="absolute inset-0 rounded-full border-4 border-dashed animate-spin" style={{ borderColor: currentTheme.primaryColor }} />
                            <div className="absolute inset-2 rounded-full border border-dotted opacity-50" style={{ borderColor: currentTheme.secondaryColor }} />
                          </div>
                        )}
                      </div>

                      <div>
                        <h5 className="text-[11px] font-black uppercase tracking-widest">Order Queued at Main Bar</h5>
                        <p className="text-[8px] text-on-surface-variant mt-1">Average Wait: 2.4 Minutes</p>
                      </div>
                    </div>

                    {/* Order Receipt Details */}
                    <div className={`p-4 border border-white/5 space-y-2.5 ${getRadiusClass()}`} style={{ backgroundColor: currentTheme.cardColor }}>
                      <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant block">Verification Token</span>
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-mono font-bold">#WT-9082-SA</span>
                        <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[8px] font-mono text-primary font-bold">QUEUED</span>
                      </div>
                      <div className="space-y-1 text-[9px] font-mono">
                        <div className="flex justify-between text-on-surface-variant">
                          <span>1x Soweto Gold Ale</span>
                          <span>R48.00</span>
                        </div>
                        <div className="flex justify-between text-on-surface-variant">
                          <span>1x Amapiano Sunrise Punch</span>
                          <span>R90.00</span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {activePreviewScreen === 'budget' && (
                  /* SCREEN 3: WAYTA BUDGET PROTECTOR / PARTY STATEMENT */
                  <div className="space-y-4">
                    
                    {/* Budget Protection Alert */}
                    <div className={`p-4 border border-white/5 space-y-3 ${getRadiusClass()}`} style={{ backgroundColor: currentTheme.cardColor }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#39FF14]">🛡️ Party Statement Shield</span>
                        <span className="text-[8px] font-mono opacity-60">Verified Guard</span>
                      </div>
                      
                      <p className="text-[9px] text-on-surface-variant leading-relaxed">
                        Skip queues safely. Wayta monitors transaction safety to ensure no unapproved charges are added to your ledger.
                      </p>

                      <div className="border-t border-white/10 pt-3 space-y-1 text-[9px] font-mono">
                        <div className="flex justify-between">
                          <span>Cart Total</span>
                          <span>R138.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Wayta Fast-track Levy</span>
                          <span>R6.90</span>
                        </div>
                        <div className="border-t border-white/5 pt-2 flex justify-between font-bold text-[10px]">
                          <span>SECURE DEBIT TOTAL</span>
                          <span style={{ color: currentTheme.primaryColor }}>R144.90</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          className="w-full py-2.5 px-4 text-black text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 transition-all"
                          style={{ backgroundColor: currentTheme.primaryColor }}
                        >
                          💸 Confirm & Authorize Checkout
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {activePreviewScreen === 'safety' && (
                  /* SCREEN 4: SECURE CHECK-IN FLOW (SAFETY MATRIX) */
                  <div className="space-y-4">
                    
                    {/* Checkin Safety Shield */}
                    <div className={`p-5 border border-white/5 space-y-4 text-center flex flex-col items-center justify-center ${getRadiusClass()}`} style={{ backgroundColor: currentTheme.cardColor }}>
                      <span className="p-3 bg-primary/10 border border-primary/20 rounded-full inline-block" style={{ color: currentTheme.primaryColor }}>
                        <ShieldCheck size={28} />
                      </span>

                      <div className="space-y-1">
                        <h4 
                          className="text-xs font-black uppercase tracking-widest"
                          style={{ fontFamily: `'${currentTheme.fontHeading}', sans-serif` }}
                        >
                          You are Checked In
                        </h4>
                        <p className="text-[8px] text-on-surface-variant">Security and speed combined at Cape Town venues.</p>
                      </div>

                      <div className="w-full bg-background border border-white/5 p-3 rounded-xl flex items-center justify-between text-left">
                        <div className="space-y-0.5">
                          <span className="text-[7px] font-mono uppercase tracking-wider block opacity-50">Local S.A. Jurisdiction</span>
                          <span className="text-[9px] font-black uppercase">Rapid Queue Bypass</span>
                        </div>
                        <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: currentTheme.primaryColor }} />
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Wayta safety footer stamp (Wayta Brand Cohesion element) */}
              <div className="absolute bottom-3 left-0 right-0 text-center z-20 flex justify-center">
                <span className="px-3 py-1 bg-black/80 backdrop-blur-md rounded-full border border-white/10 text-[7px] font-mono uppercase tracking-widest opacity-65">
                  🛡️ Secure Pay South Africa
                </span>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Floating alert notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-6 right-6 z-[120] p-4 rounded-xl flex items-center gap-3 shadow-2xl border ${
              toastMessage.type === 'success' 
                ? "bg-surface border-success/30 text-white shadow-success/10" 
                : "bg-surface border-error/30 text-white shadow-error/10"
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle size={16} className="text-success" />
            ) : (
              <AlertTriangle size={16} className="text-error" />
            )}
            <p className="text-xs font-black uppercase tracking-tight">{toastMessage.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
