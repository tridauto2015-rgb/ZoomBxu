-- Migration to add customer delivery location to orders

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS customer_lng DOUBLE PRECISION;
