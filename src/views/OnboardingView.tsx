import React from 'react';
import { SignupProvider } from '../components/claude/signup';
import { OnboardingShell } from '../components/claude/onboarding';
import type { UserRole } from '../components/claude/types';

interface OnboardingViewProps {
  /** Fired when the guided flow finishes; receives the role picked on the Role screen. */
  onComplete?: (role: UserRole | null) => void;
  /** Fired when the user backs out of the first step. */
  onExit?: () => void;
}

/**
 * First-run onboarding — Wayta Signal Green edition.
 * Renders the Claude-designed 7-screen flow (Welcome → Role → Phone → OTP →
 * Profile/Stage-1 signup → Venue → Payment → Done) on top of the app's
 * view-state routing.
 */
export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, onExit }) => (
  <SignupProvider>
    <OnboardingShell onComplete={onComplete} onExit={onExit} />
  </SignupProvider>
);
