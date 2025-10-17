-- =====================================================
-- APPLY THIS SQL DIRECTLY IN SUPABASE SQL EDITOR
-- Navigation: Supabase Dashboard > SQL Editor > New Query
-- =====================================================

-- This file contains recent migrations that need to be applied
-- to fix the "filter_by_city_match column not found" error

-- =====================================================
-- MIGRATION 1: Add Price Per Square Foot Filter
-- From: 20251016000000_add_price_per_sqft_filter.sql
-- =====================================================

-- Add price per square foot filter option to buy boxes
ALTER TABLE public.buy_boxes 
  ADD COLUMN IF NOT EXISTS filter_by_ppsf BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.buy_boxes.filter_by_ppsf IS 'If true, filter by price_max divided by square_footage instead of max_price';

-- =====================================================
-- MIGRATION 2: Add City/Neighborhood Matching Filter
-- From: 20251016120000_add_city_filter_option.sql
-- =====================================================

-- Add city/neighborhood matching filter option to buy boxes
ALTER TABLE public.buy_boxes 
  ADD COLUMN IF NOT EXISTS filter_by_city_match BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.buy_boxes.filter_by_city_match IS 'If true, filter properties to only include those where city or neighborhood matches the specified cities/neighborhoods. Useful when zip codes span multiple cities (e.g., 44105 includes both Garfield Heights and Cleveland).';

-- =====================================================
-- SUCCESS! 
-- After running this, your "Create & Scrape" should work!
-- =====================================================

