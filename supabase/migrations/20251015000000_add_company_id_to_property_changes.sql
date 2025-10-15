-- Add company_id to property_changes table to support team collaboration

-- Add company_id column
ALTER TABLE public.property_changes 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_property_changes_company_id ON public.property_changes(company_id);

-- Update existing property_changes to have company_id from their properties
UPDATE public.property_changes pc
SET company_id = p.company_id
FROM public.properties p
WHERE pc.property_id = p.id
  AND pc.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- Add trigger to auto-assign company_id to property_changes
DROP TRIGGER IF EXISTS auto_assign_company_to_property_change ON public.property_changes;
CREATE TRIGGER auto_assign_company_to_property_change
  BEFORE INSERT ON public.property_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_company_id();

