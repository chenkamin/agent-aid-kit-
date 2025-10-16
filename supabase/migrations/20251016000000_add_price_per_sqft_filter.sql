-- Add fields for price per square foot filtering in buy boxes
ALTER TABLE public.buy_boxes 
  ADD COLUMN IF NOT EXISTS filter_by_ppsf BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_max NUMERIC,
  ADD COLUMN IF NOT EXISTS days_on_zillow INTEGER,
  ADD COLUMN IF NOT EXISTS for_sale_by_agent BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS for_sale_by_owner BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS for_rent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.buy_boxes.filter_by_ppsf IS 'If true, price_max represents max price per square foot. If false, price_max represents total max price.';
COMMENT ON COLUMN public.buy_boxes.price_max IS 'Maximum price (either total price or price per sqft depending on filter_by_ppsf flag)';
COMMENT ON COLUMN public.buy_boxes.days_on_zillow IS 'Filter by days on Zillow market (e.g., 1, 7, 14, 30)';
COMMENT ON COLUMN public.buy_boxes.for_sale_by_agent IS 'Include properties listed by agent';
COMMENT ON COLUMN public.buy_boxes.for_sale_by_owner IS 'Include properties listed by owner (FSBO)';
COMMENT ON COLUMN public.buy_boxes.for_rent IS 'Include rental properties';
COMMENT ON COLUMN public.buy_boxes.assigned_to IS 'User assigned to work this buy box';

