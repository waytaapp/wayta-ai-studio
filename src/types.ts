export type VerificationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Suspended';

export interface OnboardingRequest {
  id: string;
  type: 'VENUE' | 'EVENT' | 'VENDOR' | 'USER';
  business_name?: string;
  contact_email?: string;
  name?: string; 
  email?: string; 
  timestamp: string;
  status: VerificationStatus;
  rejectionReason?: string;
  adminNotes?: string;
  firestoreId?: string;
  details: Record<string, any>;
  venue_id?: string;
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  distance: string;
  type: 'Club' | 'Festival' | 'Outdoor' | 'Lounge';
  venue_type?: 'Club' | 'Pub' | 'Festival';
  status: 'Live' | 'Open' | 'Closed' | 'Upcoming';
  rating: number;
  image: string;
  image_thumb?: string; // Resize Images Extension
  search_keywords?: string[]; // Search Extension Indexing Indexing
  short_url?: string; // Shorten URLs Extension
  name_translated?: Record<string, string>; // Translate Text Extension
  icon: string;
  description?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  coordinates?: [number, number];
  location_coords?: { lat: number; lng: number };
  location_lat?: number;
  location_long?: number;
  operating_hours?: any;
  opening_hours?: string;
  is_active?: boolean;
  isOrderingEnabled?: boolean;
  has_used_quickstart?: boolean;
  wcaps_config?: WCapConfig;
  wcaps_rewards?: WCapReward[];
  ownerId?: string;
  created_at?: string;
  stats?: {
    live_revenue?: number;
    active_pulse?: number;
    avg_velocity?: string;
    efficiency?: number;
  };
  theme?: any;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'Drinks' | 'Food' | 'Bottle Service' | 'Beer' | 'Gin' | 'Energy Drink' | 'Premium Selection' | 'Tickets' | 'Other';
  description: string;
  image: string;
  brand_name?: string;
  stock_quantity?: number;
  is_available?: boolean;
  is_premium?: boolean;
  isSoldOut?: boolean;
  isFavorite?: boolean;
  eventId?: string;
  assigned_vendor_id?: string;
}

export interface Product extends MenuItem {
  venue_id: string;
}

export interface Budget {
  id: string;
  user_id: string;
  venue_id: string;
  amount_limit: number;
  current_spend: number;
  status: 'Active' | 'Completed';
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  venue_id?: string;
  event_id?: string;
  venueName?: string;
  order_id?: string;
  payment_gateway_ref?: string;
  payment_method?: string;
  amount: number;
  date?: string;
  processed_at?: string;
  status: 'Success' | 'Declined' | 'Pending' | 'success' | 'failed' | 'refunded';
  category?: string;
  image?: string;
}

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  isDefault: boolean;
  expiry?: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  name?: string; // For UI display
}

export interface Order {
  id: string;
  user_id: string;
  venue_id: string;
  event_id?: string;
  eventId?: string;
  items: { item: MenuItem; quantity: number }[]; // Existing format
  tickets?: { event: Event; quantity: number }[]; // Task 8
  status: 'Pending' | 'Preparing' | 'Ready' | 'Collected' | 'Completed' | 'pending' | 'paid' | 'preparing' | 'ready' | 'collected' | 'completed' | 'cancelled';
  payment_status: 'Pending' | 'Paid' | 'Failed';
  collection_code?: string;
  customer_name?: string;
  total_amount: number;
  wayta_commission?: number;
  timestamp: string;
  total: number; // For compatibility
  isVip?: boolean;
  staff_assigned?: string;
  order_number?: number | string;
  payment_method?: string;
  table_number?: string;
  customer_id?: string;
  payment_gateway_ref?: string;
}

export interface Ticket {
  id: string;
  order_id: string;
  user_id: string;
  venue_id: string;
  venue_name?: string;
  event_id: string;
  tier_name: string;
  price: number;
  status: 'valid' | 'used' | 'expired';
  timestamp: string;
  event_title: string;
  event_date: string;
  event_image?: string;
  customer_name: string;
  scanned_at?: string;
  scanned_by?: string;
  createdAt?: any;
}

export type UserRole = 'PATRON' | 'BARTENDER' | 'MANAGER' | 'EVENT_MANAGER' | 'VENDOR' | 'ADMIN' | 'WAITER' | 'STAFF' | 'SUPER_ADMIN';

export interface User {
  uid: string;
  email: string;
  full_name?: string;
  displayName?: string; 
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phone_number?: string;
  pin?: string;
  pin_hash?: string;
  hashed_pin?: string;
  date_of_birth?: string;
  home_city?: string;
  address?: string;
  bio?: string;
  gender?: string;
  id_number?: string;
  employment_status?: string;
  working_status?: string;
  is_profile_complete?: boolean;
  role: UserRole;
  assigned_venue_id?: string;
  assigned_event_id?: string;
  isAuthorized: boolean;
  isVerified: boolean;
  id_verified?: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  budgetLimit?: number;
  budget_limit?: number; 
  points?: number;
  tier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'TITANIUM';
  statusTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'TITANIUM';
  wcaps_balance?: number;
  photoURL?: string;
  photoURL_thumb?: string; // Resize Images Extension
  photoURL_medium?: string; // Resize Images Extension
  search_keywords?: string[]; // Search Extension Indexing
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  capacity: number;
  sold: number;
  description?: string;
}

export interface TimelineStep {
  id: string;
  time: string;
  task: string;
  status: 'pending' | 'active' | 'done';
}

export interface Event {
  id: string;
  venueId: string;
  title: string;
  name?: string;
  business_name?: string;
  genre: string;
  type?: string; // For UI categories like "Club Night", "Festival"
  venueName?: string; // For display without extra lookups
  startTime: string;
  endTime: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  ticketsTotal: number;
  ticketsSold: number;
  ticketPrice?: number;
  status: 'Draft' | 'Live' | 'Past' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'Cancelled';
  eventType?: string;
  image?: string;
  budget?: string;
  socialMedia?: string;
  ownerId?: string;
  ticketTiers?: TicketTier[];
  timeline?: TimelineStep[];
  staffIds?: string[];
  venueManagerId?: string;
  wcaps_config?: WCapConfig;
  wcaps_rewards?: WCapReward[];
  approvalNotes?: string;
  theme?: any;
}

export interface GuestListItem {
  id: string;
  eventId: string;
  venueId: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'Invited' | 'Confirmed' | 'Checked-in' | 'No-show';
  addedBy: string; // userId
  addedAt: string;
  checkedInAt?: string;
  notes?: string;
  isVip?: boolean;
}

export interface BehaviorLog {
  id: string;
  user_id: string;
  action: 'Add_to_cart' | 'Remove_from_cart' | 'Budget_Warning_Triggered';
  product_id: string;
  timestamp: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
}

export interface LocationCheckin {
  id: string;
  user_id: string;
  venue_id: string;
  is_visible_to_friends: boolean;
  expires_at: string;
  created_at: string;
}

export interface WCapTransaction {
  id: string;
  timestamp: string;
  amount: number;
  type: 'earn' | 'redeem';
  sourceId: string; // venueId or eventId
  sourceName: string;
  description: string;
}

export interface WCapReward {
  id: string;
  name: string;
  description?: string;
  cost: number;
  inventoryCap: number;
  claimedCount: number;
  category?: string;
}

export interface WCapConfig {
  earnRate: number; // points per currency unit
  boostActive: boolean;
  boostMultiplier: number;
  redemptionPin: string;
  isEnabled: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contactEmail: string;
  status: 'Pending' | 'Approved' | 'Suspended';
}

export interface Review {
  id: string;
  user_id: string;
  user_name: string;
  venue_id: string;
  rating: number;
  comment: string;
  created_at: string;
}
