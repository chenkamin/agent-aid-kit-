-- Add urgency field to properties table
-- urgency: 1 = Not Urgent, 2 = Medium, 3 = Urgent

ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS urgency INTEGER DEFAULT 2 CHECK (urgency IN (1, 2, 3));

-- Add index for filtering by urgency
CREATE INDEX IF NOT EXISTS idx_properties_urgency ON public.properties(urgency);

-- Add comment for clarity
COMMENT ON COLUMN public.properties.urgency IS 'Property urgency level: 1 = Not Urgent, 2 = Medium, 3 = Urgent';

