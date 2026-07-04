import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserPersona = 'PATRON' | 'BARTENDER' | 'MANAGER' | 'EVENT_MANAGER' | 'VENDOR' | 'ADMIN' | null;

interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
}

interface OnboardingContextType {
  persona: UserPersona;
  setPersona: (persona: UserPersona) => void;
  currentStepIndex: number;
  steps: TourStep[];
  isActive: boolean;
  startTour: (persona: UserPersona) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completedTours: Set<string>;
}

const TOUR_STEPS: Record<string, TourStep[]> = {
  PATRON: [
    { id: 'p1', target: 'nav-explore', title: 'The Pulse of Sandton', content: "Discover venues with active throughput. No more guessing where the vibe is; follow the live metrics." },
    { id: 'p2', target: 'qr-scan-trigger', title: 'Seamless Check-in', content: "Scan any table or station QR to sync your session. Fast, wireless, and completely immersive." },
    { id: 'p3', target: 'nav-budget', title: 'Financial Guardrails', content: "Set your spend limit before the first round. We'll notify you before you hit the red zone." },
    { id: 'p4', target: 'nav-safety', title: 'Safety Protocol', content: "Your security is our priority. Access SOS and 'Return Safe' trackers with a single tap." }
  ],
  BARTENDER: [
    { id: 'b1', target: 'nav-dashboard', title: 'Active Terminal', content: "Welcome to the front lines. This dashboard tracks your station's active throughput and prep efficiency." },
    { id: 'b2', target: 'workflow-board', title: 'Visual Flow Control', content: "Manage orders using our high-velocity Kanban. Drag to prep, tap to notify patrons." },
    { id: 'b3', target: 'ai-priority-prep', title: '✨ Batch Intelligence', content: "Gemini groups similar orders to maximize your speed. Follow the suggestions for peak performance." },
    { id: 'b4', target: 'nav-profile', title: 'Mode Selector', content: "Finished your shift? Switch to Patron mode to enjoy the club without switching accounts." }
  ],
  MANAGER: [
    { id: 'm1', target: 'sales-metrics', title: 'Macro Performance', content: "View total revenue velocity across all your venues. Optimized for real-time decision making." },
    { id: 'm2', target: 'ai-decoder', title: '✨ Revenue Decoding', content: "Let AI analyze transaction patterns to suggest stock optimizations and staff scaling." },
    { id: 'm3', target: 'staff-performance', title: 'Unit Efficiency', content: "Benchmark your bartenders. identify top performers and optimize station assignments." },
    { id: 'm4', target: 'register-venue-btn', title: 'Scale Your Domain', content: "Adding a temporary stage or new bar? Onboard new assets in seconds with the platform tools." }
  ],
  EVENT_MANAGER: [
    { id: 'em1', target: 'sales-metrics', title: 'Ticket Velocity', content: "Monitor live ticket sales and entry rates for your active festivals." },
    { id: 'em2', target: 'ai-decoder', title: '✨ Crowd Intelligence', content: "Predict peak entry times and optimize security deployment based on AI analysis." },
    { id: 'em3', target: 'staff-performance', title: 'Service Health', content: "Ensure vendors are keeping up with the crowd. Watch wait times across the floor." },
    { id: 'em4', target: 'register-venue-btn', title: 'Phase Deployment', content: "Launched a new stage? Add it to the map instantly to start processing orders." }
  ],
  VENDOR: [
    { id: 'v1', target: 'sales-metrics', title: 'Merchant Pulse', content: "Track your specific stall's revenue and most popular items in real-time." },
    { id: 'v2', target: 'extension-hub', title: 'Payout Status', content: "Monitor your clearing status. We ensure your funds are settled securely via Stripe." },
    { id: 'v3', target: 'staff-performance', title: 'Prep Speed', content: "Analyze your team's throughput. Identify bottlenecks before the rush hits." },
    { id: 'v4', target: 'nav-profile', title: 'Stock & Scale', content: "Update your inventory or menu items directly from your merchant profile." }
  ],
  ADMIN: [
    { id: 'a1', target: 'sales-metrics', title: 'Gros Platform Revenue', content: "High-level overview of total ecosystem throughput and commission health." },
    { id: 'a2', target: 'extension-hub', title: 'Infrastructure Health', content: "Monitor critical Firebase extensions. From image resizing to global search indexing." },
    { id: 'a3', target: 'ai-decoder', title: '✨ Macro Intelligence', content: "Global strategy suggestions for platform-wide fee optimizations." },
    { id: 'a4', target: 'register-venue-btn', title: 'Protocol Control', content: "Whitelist new enterprise partners or suspend non-compliant merchants." }
  ]
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [persona, setInternalPersona] = useState<UserPersona>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('wayta_completed_tours');
    if (saved) {
      setCompletedTours(new Set(JSON.parse(saved)));
    }
  }, []);

  const steps = persona ? (TOUR_STEPS[persona] || []) : [];
  const isActive = currentStepIndex >= 0 && currentStepIndex < steps.length;

  const startTour = (p: UserPersona) => {
    if (!p) return;
    setInternalPersona(p);
    setCurrentStepIndex(0);
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      skipTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const skipTour = () => {
    if (persona) {
      const newCompleted = new Set(completedTours);
      newCompleted.add(persona);
      setCompletedTours(newCompleted);
      localStorage.setItem('wayta_completed_tours', JSON.stringify(Array.from(newCompleted)));
    }
    setCurrentStepIndex(-1);
  };

  return (
    <OnboardingContext.Provider value={{
      persona,
      setPersona: setInternalPersona,
      currentStepIndex,
      steps,
      isActive,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      completedTours
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
};
