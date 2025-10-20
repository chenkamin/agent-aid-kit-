-- Allow the same property to exist in multiple buy boxes
-- by changing the unique constraint from company_id to buy_box_id

-- Drop the old company-level unique constraint
DROP INDEX IF EXISTS idx_properties_unique_address_per_company;

-- Create a new buy box-level unique constraint
-- This allows the same property to exist in different buy boxes (even within the same company)
-- but prevents duplicates within the same buy box
CREATE UNIQUE INDEX idx_properties_unique_address_per_buybox
ON public.properties (buy_box_id, address, city)
WHERE buy_box_id IS NOT NULL 
  AND address <> '' 
  AND city <> '';

-- Keep the legacy user-level constraint for backward compatibility
-- (for properties created before the company/buy_box system)
-- This is already in place: idx_properties_unique_address_per_user_legacy

