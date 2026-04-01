-- Revert: Remove payment_method column from orders table
-- Run this in your Supabase SQL Editor

-- 1. Drop the payment_method column
ALTER TABLE public.orders
DROP COLUMN IF EXISTS payment_method;

-- 2. Reset any orders stuck in 'pending_payment' status back to 'pending'
UPDATE public.orders
SET status = 'pending'
WHERE status = 'pending_payment';
