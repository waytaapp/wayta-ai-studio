import React from 'react';
import { Theme } from './theme';
import { Welcome, Phone, OTP, Profile } from './screens-a';
import { Location, Payment, Done } from './screens-b';

export interface Step {
  id: string;
  Component: React.FC<{ theme: Theme }>;
  cta: { primary: string; primaryIcon?: 'arrow'; secondary?: string; };
}

export const STEPS: Step[] = [
  { id: 'welcome',  Component: Welcome,  cta: { primary: 'Get started',    primaryIcon: 'arrow', secondary: 'I already have an account' } },
  { id: 'phone',    Component: Phone,    cta: { primary: 'Send code',      primaryIcon: 'arrow' } },
  { id: 'otp',      Component: OTP,      cta: { primary: 'Verify',         primaryIcon: 'arrow' } },
  { id: 'profile',  Component: Profile,  cta: { primary: 'Continue',       primaryIcon: 'arrow' } },
  { id: 'location', Component: Location, cta: { primary: 'Allow location', primaryIcon: 'arrow', secondary: "I'll use QR scan instead" } },
  { id: 'payment',  Component: Payment,  cta: { primary: 'Add payment',    primaryIcon: 'arrow', secondary: "Skip — I'll add it later" } },
  { id: 'done',     Component: Done,     cta: { primary: 'Find a venue',   primaryIcon: 'arrow', secondary: 'Invite my crew first' } },
];
