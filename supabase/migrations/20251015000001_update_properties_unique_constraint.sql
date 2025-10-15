-- Update unique constraint from per-user to per-company

-- Drop the old per-user unique constraint if it exists
DROP INDEX IF EXISTS idx_properties_unique_address_per_user;

-- Create new unique constraint per company
-- This prevents duplicate properties within the same company
-- but allows the same property address across different companies
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_unique_address_per_company
  ON public.properties(company_id, address, city)
  WHERE company_id IS NOT NULL;

-- For properties without company_id (legacy data), keep user-based uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_unique_address_per_user_legacy
  ON public.properties(user_id, address, city)
  WHERE company_id IS NULL;

