-- Add neighborhoods column and filter back to buy_boxes table
ALTER TABLE public.buy_boxes 
  ADD COLUMN IF NOT EXISTS neighborhoods TEXT[],
  ADD COLUMN IF NOT EXISTS filter_by_neighborhoods BOOLEAN DEFAULT false;

-- Add comments to explain the columns
COMMENT ON COLUMN public.buy_boxes.neighborhoods IS 'Array of neighborhood names to filter properties by (when filter_by_neighborhoods is true). Uses OpenAI to verify if property address is in specified neighborhoods.';
COMMENT ON COLUMN public.buy_boxes.filter_by_neighborhoods IS 'If true, use OpenAI to verify each property address is in one of the specified neighborhoods. More accurate than city matching for precise neighborhood targeting.';


