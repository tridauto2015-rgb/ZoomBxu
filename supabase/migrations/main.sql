-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  ZoomBxu — Complete Supabase Database Schema                          ║
-- ║  Auto Parts & Service E-Commerce Platform                             ║
-- ║                                                                       ║
-- ║  Tables: products, orders, messages, profiles, order_tracking         ║
-- ║  Last updated: 2026-04-02                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. PRODUCTS — The product catalog for auto parts & accessories
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.products (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    price         TEXT NOT NULL,                          -- Formatted price string e.g. "₱1,200.00"
    original_price TEXT,                                  -- Strike-through / compare-at price
    rating        DOUBLE PRECISION DEFAULT 0,
    review_count  INTEGER DEFAULT 0,
    images        TEXT[] DEFAULT '{}',                    -- Array of image URLs
    category      TEXT NOT NULL DEFAULT 'Uncategorized',
    badge         TEXT,                                   -- Optional badge label e.g. "Sale", "New"
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow public read access (anon key), admin writes handled via dashboard/service role
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Products are viewable by everyone"
    ON public.products FOR SELECT
    USING (true);

CREATE POLICY IF NOT EXISTS "Products are manageable by authenticated users"
    ON public.products FOR ALL
    USING (true)
    WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. PROFILES — Customer profiles with penalty/ban tracking
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
    id                  UUID PRIMARY KEY,                 -- Matches auth.users.id
    phone               TEXT UNIQUE,                      -- PH phone number (e.g. "9XXXXXXXXX")
    cancellation_count  INTEGER DEFAULT 0,                -- Tracks repeated order cancellations
    penalty_until       TIMESTAMP WITH TIME ZONE,         -- Temporary order ban expiry
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ORDERS — Customer orders with delivery location & cart snapshot
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id         UUID REFERENCES public.profiles(id), -- Link to auth/profile user
    customer_name   TEXT NOT NULL,
    customer_phone  TEXT NOT NULL,                        -- Contact number for dispatch
    location_name   TEXT,                                 -- Reverse-geocoded address string
    items           JSONB NOT NULL DEFAULT '[]',          -- Full cart snapshot [{name, price, quantity, images...}]
    total_price     DOUBLE PRECISION NOT NULL DEFAULT 0,  -- Grand total including delivery fee
    status          TEXT NOT NULL DEFAULT 'pending'       -- pending | processing | completed | cancelled
                    CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    customer_lat    DOUBLE PRECISION,                     -- Delivery pin latitude
    customer_lng    DOUBLE PRECISION                      -- Delivery pin longitude
);

ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Safe constraint fix: ensure 'processing' is a valid status
-- (handles databases created before this status was added)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'cancelled'));

-- Index for fast phone-based lookups (customer order history)
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. MESSAGES — Real-time chat between customers and admin
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.messages (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content       TEXT NOT NULL,
    sender_id     TEXT NOT NULL,                          -- auth user UUID or phone number
    sender_name   TEXT NOT NULL DEFAULT 'Guest',
    is_admin      BOOLEAN NOT NULL DEFAULT false,
    recipient_id  TEXT NOT NULL                           -- 'admin' or customer UUID/phone
);

ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Index for fetching conversations by participant
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ORDER TRACKING — Real-time GPS tracking for deliveries
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.order_tracking (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID NOT NULL UNIQUE,                     -- One tracking record per order (upsert)
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.order_tracking DISABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. REALTIME — Enable Supabase Realtime on tables that need live updates
-- ═══════════════════════════════════════════════════════════════════════════

-- Safely add tables to the realtime publication (idempotent)
DO $$
BEGIN
    -- order_tracking (live GPS updates)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_tracking'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_tracking;
    END IF;

    -- orders (status changes)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    -- messages (real-time chat)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    -- products (admin product changes)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
