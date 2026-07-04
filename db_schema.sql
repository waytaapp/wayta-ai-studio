-- Wayta Backend Schema (PostgreSQL)
-- Optimized for high-concurrency ordering and deep consumer behavior analytics.
-- Architected for Wayta: Real-time Club Ordering & Analytics Platform.

-- Enable UUID extension for scalable, non-sequential primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENTITY DEFINITIONS
-- ==========================================

-- Venues: Clubs, Bars, and Lounges
CREATE TABLE venues (
    venue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    location_lat DECIMAL(9, 6),
    location_long DECIMAL(9, 6),
    merchant_account_id VARCHAR(100), -- For automated payouts
    service_fee_percent DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_service_fee CHECK (service_fee_percent >= 0 AND service_fee_percent <= 100),
    CONSTRAINT check_valid_lat CHECK (location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90)),
    CONSTRAINT check_valid_long CHECK (location_long IS NULL OR (location_long >= -180 AND location_long <= 180))
);

-- Users: Club Patrons
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    full_name VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_sa_phone CHECK (phone_number IS NULL OR phone_number ~ '^\+27[0-9]{9}$')
);

-- Events: Themed nights or hosted sessions
CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(venue_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Menu Items: Drinks, Bottles, Mixers
CREATE TABLE menu_items (
    menu_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(venue_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50), 
    price DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_price CHECK (price > 0)
);

-- Budgets: Consumer spending safety limits
CREATE TABLE budgets (
    budget_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(venue_id) ON DELETE CASCADE,
    total_limit DECIMAL(10, 2) NOT NULL,
    spent_amount DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_limit CHECK (total_limit > 0)
);

-- ==========================================
-- 2. TRANSACTIONAL LAYER
-- ==========================================

-- Orders: Core transaction header with built-in commission logic
CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    venue_id UUID REFERENCES venues(venue_id) ON DELETE RESTRICT,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, preparing, ready, served, cancelled
    
    -- Financial Precision & Automation
    total_amount DECIMAL(10, 2) NOT NULL,
    wayta_commission_fee DECIMAL(10, 2) GENERATED ALWAYS AS (total_amount * 0.05) STORED,
    net_venue_payout DECIMAL(10, 2) GENERATED ALWAYS AS (total_amount * 0.95) STORED,
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_total CHECK (total_amount >= 0)
);

-- Order Items: Granular item-level details
CREATE TABLE order_items (
    order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(order_id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(menu_item_id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    CONSTRAINT check_positive_quantity CHECK (quantity > 0)
);

-- ==========================================
-- 3. ANALYTICS & MONITORING
-- ==========================================

-- Behavior Logs: Captures purchase decision metrics and friction points
CREATE TABLE behavior_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(venue_id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL, -- e.g., 'ADD_ITEM', 'REMOVE_ITEM', 'BUDGET_WARNING', 'ABANDON_CHECKOUT'
    metadata JSONB, -- Contextual data (product choice, wallet status, etc.)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions: Finalized payment state
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(order_id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL, -- success, failed, refunded, pending_verification
    payment_method VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_valid_payment_status CHECK (status IN ('success', 'failed', 'refunded', 'pending_verification'))
);

-- ==========================================
-- 4. PERFORMANCE OPTIMIZATION (INDEXING)
-- ==========================================

-- Real-time reporting indexes (optimized for high-concurrency read/write)
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_timestamp ON orders(timestamp DESC);
CREATE INDEX idx_behavior_logs_venue_id ON behavior_logs(venue_id);
CREATE INDEX idx_behavior_logs_timestamp ON behavior_logs(timestamp DESC);
CREATE INDEX idx_behavior_logs_user_id ON behavior_logs(user_id);

-- Operational indexes
CREATE INDEX idx_menu_items_venue_id ON menu_items(venue_id);
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
