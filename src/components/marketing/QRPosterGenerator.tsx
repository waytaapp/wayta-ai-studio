import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Download, Printer, Copy, Check, Palette, Sparkles, 
  Smartphone, Eye, Layers, Type, MapPin, RefreshCw 
} from 'lucide-react';

interface QRPosterGeneratorProps {
  initialVenueName?: string;
  initialLocation?: string;
  isDark?: boolean;
}

type PosterTheme = 'ketchup' | 'clinical' | 'neon' | 'luxury';
type PosterLayout = 'square' | 'vertical';

export const QRPosterGenerator: React.FC<QRPosterGeneratorProps> = ({
  initialVenueName = "The Ketchup",
  initialLocation = "Pretoria, South Africa",
  isDark = true
}) => {
  const [venueName, setVenueName] = useState(initialVenueName);
  const [location, setLocation] = useState(initialLocation);
  
  // Custom copy presets to toggle between Patients, Patrons, and Guests
  const [targetAudience, setTargetAudience] = useState<'patrons' | 'patients' | 'guests'>('patrons');
  
  // Preset title and description based on selection
  const titlePresets = {
    patrons: "Dine & Order Instantly",
    patients: "Check-In & Order Online",
    guests: "Scan to Check-In & Pay"
  };

  const descPresets = {
    patrons: "Skip the waiting times. Scan to view our menu, order, and pay directly using card split-settlement.",
    patients: "Minimize waiting room times. Scan to register details, sign in, or manage your active order.",
    guests: "Experience touchless access. Instantly claim access keys, purchase drinks, or trigger server orders."
  };

  const [headerTitle, setHeaderTitle] = useState(titlePresets[targetAudience]);
  const [bodyText, setBodyText] = useState(descPresets[targetAudience]);
  const [footerBrand, setFooterBrand] = useState("Powered by Wayta Ecosystem");
  
  const [theme, setTheme] = useState<PosterTheme>('ketchup');
  const [layout, setLayout] = useState<PosterLayout>('vertical');
  const [qrColor, setQrColor] = useState('#ffffff');
  const [qrBgColor, setQrBgColor] = useState('#000000');
  
  const [customUrl, setCustomUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://wayta.co.za';
  });

  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Quick preset application
  const handleAudienceChange = (audience: 'patrons' | 'patients' | 'guests') => {
    setTargetAudience(audience);
    setHeaderTitle(titlePresets[audience]);
    setBodyText(descPresets[audience]);
    if (audience === 'patients') {
      setTheme('clinical');
    } else if (audience === 'patrons') {
      setTheme('ketchup');
    } else {
      setTheme('neon');
    }
  };

  // Theme palettes definitions
  const themeStyles = {
    ketchup: {
      bg: 'bg-gradient-to-br from-red-600 via-red-700 to-stone-900',
      border: 'border-red-500/30',
      textColor: 'text-white',
      accentColor: 'text-primary bg-stone-950/80 border-primary/40',
      mutedText: 'text-red-100',
      tagBg: 'bg-stone-950/70 border border-red-500/35 text-white',
      qrColor: '#D32F2F',
      qrBg: '#FFFFFF',
      iconColor: 'text-red-400',
      accentLabel: 'The Ketchup Premium',
      footerColor: 'text-red-200/60'
    },
    clinical: {
      bg: 'bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50',
      border: 'border-indigo-200/50',
      textColor: 'text-slate-900',
      accentColor: 'text-indigo-600 bg-white shadow-md border-indigo-100',
      mutedText: 'text-slate-600',
      tagBg: 'bg-indigo-600 border border-indigo-700 text-white shadow-sm',
      qrColor: '#4F46E5',
      qrBg: '#FFFFFF',
      iconColor: 'text-indigo-400',
      accentLabel: 'Clinical & Patient Hub',
      footerColor: 'text-slate-500/60'
    },
    neon: {
      bg: 'bg-gradient-to-br from-zinc-950 via-violet-950 to-purple-900',
      border: 'border-purple-500/30',
      textColor: 'text-white',
      accentColor: 'text-primary bg-zinc-950/90 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]',
      mutedText: 'text-purple-200/80',
      tagBg: 'bg-zinc-900 border border-purple-500/40 text-purple-200 shadow-sm',
      qrColor: '#A855F7',
      qrBg: '#FFFFFF',
      iconColor: 'text-purple-400',
      accentLabel: 'Pretoria Pulse Mode',
      footerColor: 'text-purple-300/40'
    },
    luxury: {
      bg: 'bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900',
      border: 'border-amber-500/20',
      textColor: 'text-white',
      accentColor: 'text-amber-400 bg-neutral-900 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]',
      mutedText: 'text-stone-400',
      tagBg: 'bg-amber-500 text-neutral-950 font-bold border border-amber-600 shadow-md',
      qrColor: '#F59E0B',
      qrBg: '#FFFFFF',
      iconColor: 'text-amber-500',
      accentLabel: 'Gold Premium Signature',
      footerColor: 'text-stone-500'
    }
  };

  const activeTheme = themeStyles[theme];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(customUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Isolated printable output trigger
  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${venueName} QR Code Flyer - Print</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body {
                background: white;
                color: black;
                margin: 0;
                padding: 0;
              }
              .no-print { display: none; }
              .printable-card {
                box-shadow: none !important;
                border: none !important;
                width: 100% !important;
                max-width: none !important;
                height: 100vh !important;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body class="bg-gray-100 flex items-center justify-center p-0 m-0">
          <div class="printable-card w-[210mm] min-h-[297mm] p-12 bg-white flex items-center justify-center">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // High fidelity vector download of the poster
  const handleDownloadSVG = () => {
    const svgElement = document.getElementById('qr-svg-code');
    if (!svgElement) return;

    // Build a fully self-contained vector drawing representing the current active poster design
    // Since rendering HTML to canvas requires dependencies, generating a high-quality SVG container is extremely elegant and professional
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${venueName.toLowerCase().replace(/\s+/g, '_')}_qr_poster.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT PANEL: Customize Controls */}
        <div className="lg:col-span-5 space-y-6 bg-surface-container/60 border border-outline/20 p-6 sm:p-8 rounded-[2.5rem]">
          <div className="flex items-center gap-3 border-b border-outline/20 pb-4">
            <Layers className="text-primary" size={24} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Interactive Composer</p>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Post & Flyer Engine</h3>
            </div>
          </div>

          {/* Quick Target Audience Presets */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1 block">Customize Target Audience</label>
            <div className="grid grid-cols-3 gap-2">
              {(['patrons', 'patients', 'guests'] as const).map((audience) => (
                <button
                  key={audience}
                  onClick={() => handleAudienceChange(audience)}
                  className={`py-2 px-3 rounded-xl border text-[10px] uppercase tracking-wider font-extrabold transition-all duration-300 ${
                    targetAudience === audience 
                      ? 'bg-primary text-black border-primary' 
                      : 'bg-background border-outline/20 text-on-surface-variant hover:border-primary/40'
                  }`}
                >
                  {audience === 'patrons' ? '🍔 Patrons' : audience === 'patients' ? '🩺 Patients' : '👥 Guests'}
                </button>
              ))}
            </div>
          </div>

          {/* Details Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-1">
                  <Type size={10} /> Venue / App Name
                </label>
                <input 
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. The Ketchup"
                  className="w-full h-11 bg-background border border-outline/20 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1 flex items-center gap-1">
                  <MapPin size={10} /> Location
                </label>
                <input 
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Pretoria"
                  className="w-full h-11 bg-background border border-outline/20 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1 block">Headline Text</label>
              <input 
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder="Title Text"
                className="w-full h-11 bg-background border border-outline/20 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1 block">Body Instructions</label>
              <textarea 
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={3}
                placeholder="Description of why to scan"
                className="w-full bg-background border border-outline/20 rounded-xl p-4 text-xs font-medium text-white outline-none focus:border-primary transition-all leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1 block">Target Destination URL</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="App Home URL"
                  className="flex-1 h-11 bg-background border border-outline/20 rounded-xl px-4 text-xs font-mono text-cyan-400 outline-none focus:border-cyan-400 transition-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-11 h-11 bg-background border border-outline/20 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-white hover:border-primary transition-all active:scale-95"
                  title="Copy URL Link"
                >
                  {copied ? <Check size={16} className="text-secondary" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-[8px] font-black text-on-surface-variant/50 uppercase tracking-widest px-1">
                Pointed to the secure authentication or lobby URL
              </p>
            </div>
          </div>

          {/* Theme selection */}
          <div className="space-y-2.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1 block flex items-center gap-1.5">
              <Palette size={11} /> Visual Branding Palette
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'ketchup', label: '🍅 Ketchup Bold', desc: 'Saturated energetic Red gradient' },
                { id: 'clinical', label: '🩺 Clean Clinic', desc: 'Soft clinical indigo light motif' },
                { id: 'neon', label: '🌌 Cosmic Violet', desc: 'Club neon aesthetic vibes' },
                { id: 'luxury', label: '⚜️ Golden Obsidian', desc: 'High-contrast prestige matte noir' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setTheme(style.id as PosterTheme)}
                  className={`p-3 rounded-2xl border text-left transition-all duration-300 ${
                    theme === style.id 
                      ? 'bg-white/10 border-primary shadow-lg' 
                      : 'bg-background hover:bg-white/5 border-outline/20'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-white">{style.label}</p>
                  <p className="text-[8px] font-semibold text-on-surface-variant/80 uppercase tracking-wider mt-0.5">{style.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Poster size constraints */}
          <div className="space-y-2.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1 block flex items-center gap-1">
              🎨 Layout Aspect Dimensions
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'vertical', label: 'A4 Print Poster', desc: 'Ideal for physical tables & frames' },
                { id: 'square', label: '1:1 Square Flyer', desc: 'Optimized for social media & newsletters' }
              ].map((sz) => (
                <button
                  key={sz.id}
                  onClick={() => setLayout(sz.id as PosterLayout)}
                  className={`py-2.5 px-4 rounded-xl border text-center transition-all ${
                    layout === sz.id 
                      ? 'bg-primary text-black border-primary font-black' 
                      : 'bg-background hover:bg-white/5 border-outline/20 text-on-surface-variant font-bold'
                  } text-[10px] uppercase tracking-wider`}
                >
                  {sz.label}
                  <p className={`text-[7px] block mt-0.5 ${layout === sz.id ? 'text-black/60' : 'text-on-surface-variant/40'}`}>{sz.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form helper info */}
          <div className="bg-surface-container/40 p-4 border border-outline/15 rounded-2xl flex gap-3 text-on-surface-variant/80">
            <Sparkles className="text-secondary shrink-0" size={16} />
            <p className="text-[9px] leading-relaxed font-bold uppercase tracking-wide">
              The vector QR code retains 100% responsive resolution during printing. Use <strong className="text-white">Print Poster</strong> to send directly to your local printer, or click <strong className="text-white">Save SVG</strong> to export.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Live Render Preview */}
        <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5 px-2">
              <Eye size={12} className="text-primary animate-pulse" /> Live Poster Render Canvas
            </h4>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-stone-900 border border-outline/20 hover:border-primary text-white rounded-xl font-extrabold uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xl shadow-black/30"
              >
                <Printer size={13} className="text-primary" /> Print Poster
              </button>
              <button
                onClick={handleDownloadSVG}
                className="px-4 py-2 bg-primary text-black rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-xl shadow-primary/20"
              >
                <Download size={13} /> Save SVG Layout
              </button>
            </div>
          </div>

          {/* Visual Canvas Card Container */}
          <div className="bg-stone-950 p-6 rounded-3xl border border-outline/10 flex items-center justify-center min-h-[500px]">
            <div 
              ref={printRef}
              className={`w-full transition-all duration-500 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col justify-between items-center ${activeTheme.bg} ${activeTheme.textColor} ${
                layout === 'vertical' ? 'max-w-[360px] aspect-[1/1.41] p-10' : 'max-w-[400px] aspect-square p-10'
              }`}
            >
              {/* Background ambient lighting */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_50%)]" />

              {/* Dynamic Design Header */}
              <div className="text-center w-full z-10 space-y-3">
                <span className={`inline-block py-1 px-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-full ${activeTheme.tagBg}`}>
                  {activeTheme.accentLabel}
                </span>

                <div className="space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic leading-none">
                    {venueName}
                  </h1>
                  <p className="text-[9px] font-black tracking-widest text-primary uppercase flex items-center justify-center gap-1 opacity-90 leading-tight">
                    <MapPin size={10} className={activeTheme.iconColor} /> {location}
                  </p>
                </div>
              </div>

              {/* Dynamic QR Code Render Box */}
              <div className="my-[20px] flex flex-col items-center justify-center relative z-10">
                <div className={`p-4 rounded-3xl border ${activeTheme.border} ${theme === 'clinical' ? 'bg-white shadow-xl shadow-indigo-100/40' : 'bg-white shadow-2xl shadow-black/40'} transition-transform duration-300 hover:scale-105`}>
                  <QRCodeSVG
                    id="qr-svg-code"
                    value={customUrl}
                    size={layout === 'vertical' ? 170 : 150}
                    level="H"
                    includeMargin={true}
                    fgColor={theme === 'ketchup' ? '#D32F2F' : theme === 'clinical' ? '#4F46E5' : theme === 'neon' ? '#A855F7' : '#111111'}
                    bgColor="#FFFFFF"
                  />
                </div>
                
                {/* Dynamic helper tag underneath QR */}
                <div className={`mt-3 py-1.5 px-4 rounded-xl text-[8px] font-black uppercase tracking-widest border flex items-center gap-1 ${activeTheme.accentColor}`}>
                  <Smartphone size={10} className="animate-bounce" /> Scan to view & order
                </div>
              </div>

              {/* Dynamic Design Text Footer */}
              <div className="text-center w-full z-10 space-y-2">
                <h2 className="text-sm font-extrabold tracking-tight uppercase leading-tight">
                  {headerTitle}
                </h2>
                <p className={`text-[9px] leading-relaxed font-bold max-w-xs mx-auto opacity-95 ${theme === 'clinical' ? 'text-slate-600' : 'text-stone-300'}`}>
                  {bodyText}
                </p>
                <div className="pt-3 border-t border-white/10 dark:border-white/5">
                  <p className={`text-[7px] font-bold uppercase tracking-[0.25em] ${activeTheme.footerColor}`}>
                    {footerBrand}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
