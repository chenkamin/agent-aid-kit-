-- Fix address/city field mapping by re-parsing listing URLs
-- This migration corrects properties where the address field is empty/null
-- and the city field contains the full address

-- Create a temporary function to parse address from URL
CREATE OR REPLACE FUNCTION parse_address_from_url(url TEXT)
RETURNS TABLE(address TEXT, city TEXT, state TEXT, zip TEXT) AS $$
DECLARE
  url_path TEXT;
  parts TEXT[];
  address_parts TEXT[];
  city_parts TEXT[];
  parsed_zip TEXT;
  parsed_state TEXT;
  city_indicators TEXT[] := ARRAY['heights', 'park', 'hills', 'beach', 'city', 'lake', 'springs', 'grove', 'falls'];
BEGIN
  -- Extract the path part between /homedetails/ and /_zpid/
  url_path := substring(url from '/homedetails/([^/]+)/\d+_zpid/');
  
  IF url_path IS NULL THEN
    RETURN;
  END IF;
  
  -- Split by dashes
  parts := string_to_array(url_path, '-');
  
  IF array_length(parts, 1) < 3 THEN
    RETURN;
  END IF;
  
  -- Last part is zip, second to last is state
  parsed_zip := parts[array_length(parts, 1)];
  parsed_state := UPPER(parts[array_length(parts, 1) - 1]);
  
  -- Remove state and zip from parts
  address_parts := parts[1:array_length(parts, 1) - 2];
  
  -- Determine city vs address parts
  -- If the last word is a city indicator or the second-to-last is, assume 2-word city
  IF array_length(address_parts, 1) > 3 THEN
    IF LOWER(address_parts[array_length(address_parts, 1)]) = ANY(city_indicators) OR 
       LOWER(address_parts[array_length(address_parts, 1) - 1]) = ANY(city_indicators) THEN
      -- Two-word city
      city_parts := address_parts[array_length(address_parts, 1) - 1:array_length(address_parts, 1)];
      address_parts := address_parts[1:array_length(address_parts, 1) - 2];
    ELSE
      -- One-word city
      city_parts := address_parts[array_length(address_parts, 1):array_length(address_parts, 1)];
      address_parts := address_parts[1:array_length(address_parts, 1) - 1];
    END IF;
  ELSE
    -- Short format, assume last word is city
    city_parts := address_parts[array_length(address_parts, 1):array_length(address_parts, 1)];
    address_parts := address_parts[1:array_length(address_parts, 1) - 1];
  END IF;
  
  -- Return parsed values
  RETURN QUERY SELECT 
    array_to_string(address_parts, ' '),
    array_to_string(city_parts, ' '),
    parsed_state,
    parsed_zip;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Identify all broken properties with their corrected address/city
WITH broken_properties AS (
  SELECT 
    p.id,
    p.company_id,
    p.listing_url,
    p.created_at,
    parsed.*
  FROM properties p
  CROSS JOIN LATERAL parse_address_from_url(p.listing_url) AS parsed
  WHERE (p.address IS NULL OR p.address = '')
    AND p.listing_url IS NOT NULL
    AND p.listing_url LIKE '%zillow.com/homedetails/%'
    AND parsed.address IS NOT NULL
    AND parsed.address != ''
),
-- Find properties where a correct version already exists
duplicates_with_correct_version AS (
  SELECT bp.id
  FROM broken_properties bp
  INNER JOIN properties p ON 
    p.company_id = bp.company_id 
    AND p.address = bp.address 
    AND p.city = bp.city
    AND p.id != bp.id
  WHERE p.address IS NOT NULL AND p.address != ''
),
-- Among broken properties that would have the same corrected address, keep only the oldest
duplicates_among_broken AS (
  SELECT bp1.id
  FROM broken_properties bp1
  INNER JOIN broken_properties bp2 ON 
    bp1.company_id = bp2.company_id 
    AND bp1.address = bp2.address 
    AND bp1.city = bp2.city
    AND bp1.id != bp2.id
    AND bp1.created_at > bp2.created_at  -- Keep older one, delete newer one
),
-- Combine all duplicates to delete
all_duplicates AS (
  SELECT id FROM duplicates_with_correct_version
  UNION
  SELECT id FROM duplicates_among_broken
)
DELETE FROM properties
WHERE id IN (SELECT id FROM all_duplicates);

-- Now update the remaining broken properties with correct address/city
UPDATE properties
SET 
  address = parsed.address,
  city = parsed.city,
  state = COALESCE(parsed.state, properties.state),
  zip = COALESCE(parsed.zip, properties.zip),
  updated_at = now()
FROM (
  SELECT 
    id,
    (parse_address_from_url(listing_url)).*
  FROM properties
  WHERE (address IS NULL OR address = '')
    AND listing_url IS NOT NULL
    AND listing_url LIKE '%zillow.com/homedetails/%'
) AS parsed
WHERE properties.id = parsed.id
  AND parsed.address IS NOT NULL
  AND parsed.address != '';

-- Clean up the temporary function
DROP FUNCTION IF EXISTS parse_address_from_url(TEXT);

-- Log the results
DO $$
DECLARE
  fixed_count INTEGER;
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM properties
  WHERE address IS NOT NULL AND address != '';
  
  SELECT COUNT(*) INTO null_count
  FROM properties
  WHERE address IS NULL OR address = '';
  
  RAISE NOTICE 'Fixed address/city mapping.';
  RAISE NOTICE 'Properties with valid addresses: %', fixed_count;
  RAISE NOTICE 'Properties with null/empty addresses remaining: %', null_count;
END $$;

