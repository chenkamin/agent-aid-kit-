-- Remove neighborhoods column from buy_boxes table
ALTER TABLE public.buy_boxes
DROP COLUMN IF EXISTS neighborhoods;

-- Update comment on cities column to clarify it's the only location filter now
COMMENT ON COLUMN public.buy_boxes.cities IS 'Array of city names to filter properties by (when filter_by_city_match is true)';

