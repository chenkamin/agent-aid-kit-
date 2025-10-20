-- Add price_min column to buy_boxes table
ALTER TABLE public.buy_boxes
ADD COLUMN IF NOT EXISTS price_min NUMERIC;

-- Add comment to explain the column
COMMENT ON COLUMN public.buy_boxes.price_min IS 'Minimum price filter - can be total price or price per sqft depending on filter_by_ppsf';

