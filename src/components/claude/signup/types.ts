export type SignupRole = 'patron' | 'venue' | 'brand';

/* ─── Stage 1 data (collected during onboarding) ────────── */

export interface PatronStage1 {
  firstName: string;
  lastName: string;
  mobile: string;
  dob: string;
  city: string;
}

export interface VenueStage1 {
  venueName: string;
  venueType: string;
  suburb: string;
  email: string;
  capacity: number;
  goLiveDate: string;
}

export interface BrandStage1 {
  eventName: string;
  hostBrand: string;
  venue: string;
  eventDate: string;
  managerEmail: string;
}

/* ─── Stage 2 data (deferred until intent) ──────────────── */

export interface PatronStage2 {
  idVerified: boolean;
  idNumber: string;
}

export interface VenueStage2 {
  companyDocUploaded: boolean;
  bankingSetup: boolean;
  ficaComplete: boolean;
  liquorLicenceUploaded: boolean;
}

export interface BrandStage2 {
  brandVerified: boolean;
  dohConsentGiven: boolean;
}

/* ─── Combined status ──────────────────────────────────── */

export interface SignupStatus {
  role: SignupRole | null;
  stage1Complete: boolean;
  stage2Complete: boolean;
  stage1: PatronStage1 | VenueStage1 | BrandStage1 | null;
  stage2: PatronStage2 | VenueStage2 | BrandStage2 | null;
}

export const DEFAULT_PATRON_1: PatronStage1 = { firstName: '', lastName: '', mobile: '', dob: '', city: '' };
export const DEFAULT_VENUE_1: VenueStage1 = { venueName: '', venueType: 'Bar', suburb: '', email: '', capacity: 200, goLiveDate: '' };
export const DEFAULT_BRAND_1: BrandStage1 = { eventName: '', hostBrand: '', venue: '', eventDate: '', managerEmail: '' };
export const DEFAULT_PATRON_2: PatronStage2 = { idVerified: false, idNumber: '' };
export const DEFAULT_VENUE_2: VenueStage2 = { companyDocUploaded: false, bankingSetup: false, ficaComplete: false, liquorLicenceUploaded: false };
export const DEFAULT_BRAND_2: BrandStage2 = { brandVerified: false, dohConsentGiven: false };
