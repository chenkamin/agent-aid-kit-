-- Add city/neighborhood matching filter option to buy boxes
ALTER TABLE public.buy_boxes 
  ADD COLUMN IF NOT EXISTS filter_by_city_match BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.buy_boxes.filter_by_city_match IS 'If true, filter properties to only include those where city or neighborhood matches the specified cities/neighborhoods. Useful when zip codes span multiple cities (e.g., 44105 includes both Garfield Heights and Cleveland).';

