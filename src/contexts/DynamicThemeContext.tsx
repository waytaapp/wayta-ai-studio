import React, { createContext, useContext, useState, useEffect } from 'react';
import { Venue, Event } from '../types';

export interface ThemeConfig {
  id?: string;
  name: string;
  primaryColor: string; // Hex e.g., #34d399
  secondaryColor: string; // Hex e.g., #6ee7b7
  accentColor: string; // Hex e.g., #FF0055
  backgroundColor: string; // Hex e.g., #000000
  cardColor: string; // Hex e.g., #0F0F11
  textColor: string; // Hex e.g., #F1F1F5
  textMutedColor: string; // Hex e.g., #9CA3AF
  fontHeading: string; // Google Font e.g., Space Grotesk, Playfair Display, Outfit
  fontBody: string; // Google Font e.g., Inter, JetBrains Mono
  uiDensity: 'compact' | 'comfortable' | 'minimalist';
  iconographyStyle: 'flat' | 'line' | 'glass';
  loaderStyle: 'ring' | 'pulse' | 'bar' | 'neon-spin';
}

export const defaultThemes: Record<'wayta-night' | 'wayta-day' | 'aesthetic-noir' | 'neon-pulse', ThemeConfig> = {
  'wayta-night': {
    name: 'Wayta Night',
    primaryColor: '#34d399', // Signal Green — emerald-400, dark-mode accent
    secondaryColor: '#6ee7b7', // emerald-300
    accentColor: '#10b981', // emerald-500
    backgroundColor: '#0a0a0a', // ink-0
    cardColor: '#141414', // ink-100
    textColor: '#fafaf9', // ink-900
    textMutedColor: '#a3a3a3', // ink-700
    fontHeading: 'Space Grotesk',
    fontBody: 'Manrope',
    uiDensity: 'comfortable',
    iconographyStyle: 'glass',
    loaderStyle: 'neon-spin',
  },
  'wayta-day': {
    name: 'Wayta Day',
    primaryColor: '#059669', // Signal Green — emerald-600, light-mode accent
    secondaryColor: '#047857', // emerald-700
    accentColor: '#34d399', // emerald-400
    backgroundColor: '#fafaf9', // paper
    cardColor: '#ffffff', // Pure White
    textColor: '#0a0a0a', // ink-0
    textMutedColor: '#57534e', // stone-600
    fontHeading: 'Space Grotesk',
    fontBody: 'Manrope',
    uiDensity: 'comfortable',
    iconographyStyle: 'glass',
    loaderStyle: 'ring',
  },
  'aesthetic-noir': {
    name: 'Aesthetic Noir',
    primaryColor: '#D4AF37', // Gold
    secondaryColor: '#111111', // Obsidian
    accentColor: '#E6C687', // Champagne Accent
    backgroundColor: '#050505', // Deep rich grey-black
    cardColor: '#0c0c0d', // Ultra dark matte card
    textColor: '#F3EFE0', // Alabaster white
    textMutedColor: '#8A8A8A', // Dim grey
    fontHeading: 'Playfair Display',
    fontBody: 'Inter',
    uiDensity: 'minimalist',
    iconographyStyle: 'line',
    loaderStyle: 'pulse',
  },
  'neon-pulse': {
    name: 'Neon Pulse',
    primaryColor: '#FF007F', // Neon Pink
    secondaryColor: '#00F0FF', // Neon Cyan
    accentColor: '#9D00FF', // Ultraviolet
    backgroundColor: '#0B001A', // Space Indigo
    cardColor: '#150030', // Deep Violet Card
    textColor: '#FFFFFF', // High-contrast White
    textMutedColor: '#9A8CB8', // Pastel Purple-gray
    fontHeading: 'Space Grotesk',
    fontBody: 'JetBrains Mono',
    uiDensity: 'compact',
    iconographyStyle: 'flat',
    loaderStyle: 'ring',
  },
};

interface DynamicThemeContextType {
  activeTheme: ThemeConfig;
  themeMode: 'light' | 'dark';
  currentVenue: Venue | null;
  currentEvent: Event | null;
  setVenue: (venue: Venue | null) => void;
  setEvent: (event: Event | null) => void;
  toggleThemeMode: () => void;
  updateThemeDynamically: (theme: Partial<ThemeConfig>) => void;
  contrastRatio: number;
  isContrastAccessible: boolean;
  calculateContrast: (fgHex: string, bgHex: string) => number;
}

const DynamicThemeContext = createContext<DynamicThemeContextType | undefined>(undefined);

// Helper to calculate relative luminance of an RGB channel
const getLuminance = (hex: string): number => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

// Calculate contrast ratio between two hex colors (returns ratio e.g. 4.5)
export const calculateContrastRatio = (fgHex: string, bgHex: string): number => {
  try {
    const l1 = getLuminance(fgHex);
    const l2 = getLuminance(bgHex);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
  } catch (e) {
    return 4.5; // fallback standard
  }
};

export const DynamicThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVenue, setVenueState] = useState<Venue | null>(null);
  const [currentEvent, setEventState] = useState<Event | null>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wayta_theme');
      return (saved as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });
  const [activeTheme, setActiveTheme] = useState<ThemeConfig>(themeMode === 'dark' ? defaultThemes['wayta-night'] : defaultThemes['wayta-day']);

  const toggleThemeMode = () => {
    setThemeMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('wayta_theme', next);
      return next;
    });
  };

  // Set Venue
  const setVenue = (v: Venue | null) => {
    setVenueState(v);
  };

  // Set Event
  const setEvent = (e: Event | null) => {
    setEventState(e);
  };

  // Temp manual edits (for customizer previews)
  const updateThemeDynamically = (themeUpdates: Partial<ThemeConfig>) => {
    setActiveTheme((prev) => ({
      ...prev,
      ...themeUpdates,
    }));
  };

  // Priority Theme Selector
  useEffect(() => {
    // If event theme exists, take precedence
    if (currentEvent && (currentEvent as any).theme) {
      setActiveTheme({
        ...(themeMode === 'dark' ? defaultThemes['wayta-night'] : defaultThemes['wayta-day']),
        ...(currentEvent as any).theme,
      });
    }
    // Else if venue theme exists
    else if (currentVenue && (currentVenue as any).theme) {
      setActiveTheme({
        ...(themeMode === 'dark' ? defaultThemes['wayta-night'] : defaultThemes['wayta-day']),
        ...(currentVenue as any).theme,
      });
    }
    // Else default to Wayta Night or Day
    else {
      setActiveTheme(themeMode === 'dark' ? defaultThemes['wayta-night'] : defaultThemes['wayta-day']);
    }

    // Sync HTML class + data-theme (the Signal Green token sheet keys off data-theme)
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', themeMode);
  }, [currentVenue, currentEvent, themeMode]);

  // Load Google Fonts dynamically and apply CSS Variables
  useEffect(() => {
    // 1. Google Font Injection
    const loadFont = (fontName: string) => {
      if (!fontName || fontName === 'Inter') return;
      const fontId = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
      if (document.getElementById(fontId)) return;

      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;500;700;800;900&display=swap`;
      document.head.appendChild(link);
    };

    loadFont(activeTheme.fontHeading);
    loadFont(activeTheme.fontBody);

    // 2. CSS Custom Variables Mapping
    const root = document.documentElement;
    
    // Determine if we should use absolute overrides or let CSS handle it
    // If there's an active venue or event, we want to force the colors
    // If it's just default, we might want to be more careful, but sticking to activeTheme is fine 
    // as long as activeTheme switches between night/day default properly.
    
    root.style.setProperty('--primary', activeTheme.primaryColor);
    root.style.setProperty('--secondary', activeTheme.secondaryColor);
    root.style.setProperty('--color-accent', activeTheme.accentColor);
    root.style.setProperty('--background', activeTheme.backgroundColor);
    root.style.setProperty('--surface', activeTheme.cardColor);
    root.style.setProperty('--surface-container', activeTheme.cardColor);
    root.style.setProperty('--on-surface', activeTheme.textColor);
    root.style.setProperty('--on-background', activeTheme.textColor);
    root.style.setProperty('--on-surface-variant', activeTheme.textMutedColor);

    // Inject fonts via dynamic typography styles
    const styleId = 'dynamic-typography-styles';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
      :root {
        --font-heading: '${activeTheme.fontHeading}', system-ui, sans-serif;
        --font-sans: '${activeTheme.fontBody}', system-ui, sans-serif;
      }
      
      h1, h2, h3, h4, h5, h6, .font-heading {
        font-family: var(--font-heading) !important;
      }
      
      body, .font-body {
        font-family: var(--font-sans) !important;
      }
      
      /* Dynamic transitions to ensure a cinematic experience */
      * {
        transition: background-color 0.8s cubic-bezier(0.16, 1, 0.3, 1), 
                    border-color 0.8s cubic-bezier(0.16, 1, 0.3, 1), 
                    color 0.4s ease, 
                    box-shadow 0.8s ease;
      }
    `;
  }, [activeTheme]);

  // Accessibility variables
  const contrastRatio = calculateContrastRatio(activeTheme.primaryColor, activeTheme.backgroundColor);
  const isContrastAccessible = contrastRatio >= 4.5; // WCAG AA requirement for body text

  return (
    <DynamicThemeContext.Provider
      value={{
        activeTheme,
        themeMode,
        currentVenue,
        currentEvent,
        setVenue,
        setEvent,
        toggleThemeMode,
        updateThemeDynamically,
        contrastRatio,
        isContrastAccessible,
        calculateContrast: calculateContrastRatio,
      }}
    >
      {children}
    </DynamicThemeContext.Provider>
  );
};

export const useDynamicTheme = () => {
  const context = useContext(DynamicThemeContext);
  if (!context) {
    throw new Error('useDynamicTheme must be used within a DynamicThemeProvider');
  }
  return context;
};
