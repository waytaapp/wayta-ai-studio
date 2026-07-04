import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ChevronRight, Sun, Smartphone, HelpCircle, Check, Info } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader-container";

  // State to manage onboarding guide display
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem('wayta_scanner_guide_seen');
  });
  const [onboardingStep, setOnboardingStep] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const initScanner = async () => {
      // Small delay to ensure DOM is ready
      await new Promise(r => setTimeout(r, 200));
      if (!isMounted) return;

      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (isMounted) {
              onScan(decodedText);
            }
          },
          () => {} // Ignore frame errors
        );
      } catch (err) {
        console.error("Scanner start error:", err);
      }
    };

    // Only start scanner process if onboarding is done/closed
    if (!showOnboarding) {
      initScanner();
    }

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        if (scanner.isScanning) {
          scanner.stop().then(() => {
            try {
              scanner.clear();
            } catch (e) {
              // Ignore clear errors during unmount
            }
          }).catch(err => {
            if (!err?.message?.includes('Node')) {
              console.error("Scanner stop error:", err);
            }
          });
        }
      }
    };
  }, [onScan, showOnboarding]);

  const handleFinishOnboarding = () => {
    localStorage.setItem('wayta_scanner_guide_seen', 'true');
    setShowOnboarding(false);
  };

  return (
    <div className="w-full aspect-square relative rounded-3xl overflow-hidden border border-outline bg-black flex flex-col justify-between shadow-2xl">
      {/* The HTML5 QR Canvas container */}
      <div id={containerId} className="w-full h-full absolute inset-0 z-0" />

      {/* Onboarding Overlay Portal */}
      {showOnboarding && (
        <div id="scanner-onboarding-portal" className="absolute inset-x-0 inset-y-0 bg-neutral-950/95 backdrop-blur-md z-30 flex flex-col justify-between p-6 text-white animate-in fade-in duration-200">
          <div className="flex justify-between items-center pb-3 border-b border-white/10">
            <span className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1">
              <Info size={10} /> Gate Scanner Setup
            </span>
            <span className="text-[9px] font-mono font-bold text-white/50 uppercase">
              Step {onboardingStep + 1} of 2
            </span>
          </div>

          {onboardingStep === 0 ? (
            <div className="space-y-4 my-auto select-none py-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto animate-bounce" style={{ animationDuration: '3s' }}>
                <Smartphone size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase tracking-wider text-white">Optimal Distance</h4>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wide leading-relaxed px-4">
                  Hold your camera steady about <span className="text-primary font-black">15 to 20 cm</span> (6-8 inches) away from the ticket barcode.
                </p>
              </div>
              <div className="flex justify-center gap-1 max-w-[200px] mx-auto">
                <div className="flex-1 h-1 rounded bg-primary" />
                <div className="flex-1 h-1 rounded bg-white/20" />
              </div>
            </div>
          ) : (
            <div className="space-y-4 my-auto select-none py-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto animate-pulse">
                <Sun size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase tracking-wider text-white">Avoid Direct Glare</h4>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wide leading-relaxed px-4">
                  Tilt the user's phone screen slightly if under bright sunshine to avoid direct reflection blocks.
                </p>
              </div>
              <div className="flex justify-center gap-1 max-w-[200px] mx-auto">
                <div className="flex-1 h-1 rounded bg-white/20" />
                <div className="flex-1 h-1 rounded bg-primary" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            {onboardingStep === 0 ? (
              <button 
                onClick={() => setOnboardingStep(1)}
                className="w-full h-11 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Next Guideline <ChevronRight size={14} />
              </button>
            ) : (
              <button 
                onClick={handleFinishOnboarding}
                className="w-full h-11 bg-emerald-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
              >
                Got It, Start Scanner <Check size={14} />
              </button>
            )}
            <button 
              onClick={handleFinishOnboarding}
              className="w-full text-center text-[8px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors py-1"
            >
              Skip Walkthrough
            </button>
          </div>
        </div>
      )}

      {/* Target Reticle box & Quick Guide HUD (Only when active) */}
      {!showOnboarding && (
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4">
          <div className="flex justify-end">
            {/* Quick access info triggers onboarding back */}
            <button 
              onClick={() => {
                // Instantly trigger guide
                if (scannerRef.current) {
                  try {
                    scannerRef.current.stop().then(() => {
                      scannerRef.current?.clear();
                    }).catch(() => {});
                  } catch (e) {}
                }
                setOnboardingStep(0);
                setShowOnboarding(true);
              }}
              className="pointer-events-auto w-8 h-8 rounded-xl bg-black/70 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-neutral-950 transition-all active:scale-95"
              title="Scanning Guidelines"
            >
              <HelpCircle size={15} />
            </button>
          </div>

          {/* Central Target Scanner Box */}
          <div className="w-48 h-48 border-2 border-dashed border-primary/50 rounded-[2rem] self-center relative flex items-center justify-center">
            {/* Corner Bracket Highlights */}
            <div className="absolute -top-[3px] -left-[3px] w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
            <div className="absolute -top-[3px] -right-[3px] w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
            <div className="absolute -bottom-[3px] -left-[3px] w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
            <div className="absolute -bottom-[3px] -right-[3px] w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />
            
            {/* Laser scanning beam line */}
            <div className="absolute left-4 right-4 h-[2px] bg-primary/70 animate-pulse" />
          </div>

          {/* Bottom telemetry overlay text */}
          <div className="bg-black/80 px-4 py-2 rounded-2xl border border-white/5 text-center flex items-center justify-center gap-2 max-w-[240px] mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <p className="text-[8px] font-black uppercase text-white/90 tracking-widest font-mono">
              Distance: 15-20cm • Avoid Sunlight Glare
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

