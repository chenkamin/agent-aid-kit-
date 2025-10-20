-- Add description column to buy_boxes table
ALTER TABLE public.buy_boxes
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.buy_boxes.description IS 'Optional description or notes for the buy box';

