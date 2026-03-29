-- 1. Create the tracking table
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL, -- The unique string order ID from your Next.js app
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id)
);

-- 2. Allow anonymous read/writes since ZoomBxu seems to use custom phone auth instead of native auth.uid()
ALTER TABLE order_tracking DISABLE ROW LEVEL SECURITY;

-- 3. Enable Realtime on the table
ALTER PUBLICATION supabase_realtime ADD TABLE order_tracking;
