-- Add ARV (After Repair Value) estimate field to properties
ALTER TABLE public.properties 
ADD COLUMN arv_estimate numeric;

COMMENT ON COLUMN public.properties.arv_estimate IS 'After Repair Value estimate for the property';

-- Insert fake property data for testing (removed price_per_sqft as it's generated)
INSERT INTO public.properties (
  address, city, state, zip, neighborhood,
  price, bedrooms, bathrooms, square_footage,
  home_type, status, year_built, lot_size,
  description, arv_estimate,
  mls_number, date_listed, days_on_market
) VALUES
(
  '123 Main Street', 'Los Angeles', 'CA', '90001', 'Downtown',
  450000, 3, 2, 1800,
  'Single Family', 'For Sale', 1995, '5000',
  'Beautiful single family home with updated kitchen and hardwood floors',
  550000, 'MLS-001', '2025-09-15', 21
),
(
  '456 Oak Avenue', 'San Diego', 'CA', '92101', 'Hillcrest',
  680000, 4, 3, 2400,
  'Single Family', 'Under Contract', 2005, '6500',
  'Spacious home with large backyard, perfect for families',
  750000, 'MLS-002', '2025-08-20', 46
),
(
  '789 Pine Road', 'San Francisco', 'CA', '94102', 'Mission District',
  1200000, 3, 2.5, 2000,
  'Condo', 'For Sale', 2018, NULL,
  'Modern condo with city views and amenities',
  1350000, 'MLS-003', '2025-09-25', 11
),
(
  '321 Elm Street', 'Sacramento', 'CA', '95814', 'Midtown',
  385000, 2, 2, 1500,
  'Townhouse', 'Sold', 2010, '3000',
  'Charming townhouse in desirable location',
  480000, 'MLS-004', '2025-07-10', 62
),
(
  '654 Maple Drive', 'San Jose', 'CA', '95113', 'Willow Glen',
  950000, 4, 3.5, 2800,
  'Single Family', 'For Sale', 2000, '8000',
  'Updated family home with pool and outdoor entertainment area',
  1100000, 'MLS-005', '2025-09-30', 6
);