-- Cleanup Script for Duplicate Properties
-- This script identifies and removes duplicate properties in the same buy box
-- Keeps the most recently created entry for each duplicate

-- STEP 1: IDENTIFY DUPLICATES
-- Run this first to see what will be deleted
SELECT 
  buy_box_id,
  address,
  city,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as property_ids,
  STRING_AGG(listing_url, ' | ') as urls
FROM properties
WHERE buy_box_id IS NOT NULL
  AND address <> ''
  AND city <> ''
GROUP BY buy_box_id, address, city
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, address;

-- STEP 2: COUNT TOTAL DUPLICATES
SELECT 
  COUNT(*) as total_duplicate_groups,
  SUM(cnt - 1) as properties_to_delete
FROM (
  SELECT 
    buy_box_id,
    address,
    city,
    COUNT(*) as cnt
  FROM properties
  WHERE buy_box_id IS NOT NULL
    AND address <> ''
    AND city <> ''
  GROUP BY buy_box_id, address, city
  HAVING COUNT(*) > 1
) t;

-- STEP 3: DELETE DUPLICATES (keeps most recent by created_at)
-- ⚠️ WARNING: This will permanently delete duplicate entries!
-- ⚠️ Make sure to backup your data first!
-- ⚠️ Review STEP 1 results before running this!

-- Uncomment to execute:
/*
DELETE FROM properties 
WHERE id IN (
  SELECT id 
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY buy_box_id, address, city 
        ORDER BY created_at DESC, id DESC
      ) as row_num
    FROM properties
    WHERE buy_box_id IS NOT NULL
      AND address <> ''
      AND city <> ''
  ) ranked
  WHERE row_num > 1
);
*/

-- STEP 4: VERIFY CLEANUP
-- Run this after deletion to confirm no duplicates remain
SELECT 
  buy_box_id,
  address,
  city,
  COUNT(*) as count
FROM properties
WHERE buy_box_id IS NOT NULL
  AND address <> ''
  AND city <> ''
GROUP BY buy_box_id, address, city
HAVING COUNT(*) > 1;

-- Should return 0 rows if successful

-- STEP 5: SPECIFIC EXAMPLE - Find duplicates for "7377 Greenleaf Ave"
SELECT 
  id,
  buy_box_id,
  address,
  city,
  state,
  zip,
  listing_url,
  created_at,
  last_scraped_at
FROM properties
WHERE address ILIKE '%7377%Greenleaf%'
  AND city ILIKE '%Parma%'
ORDER BY buy_box_id, created_at DESC;

-- STEP 6: MANUAL DELETION for specific address (if needed)
-- After reviewing which IDs to keep, you can manually delete specific ones
-- Example (DO NOT RUN unless you've verified the IDs):
/*
DELETE FROM properties 
WHERE id IN ('id-to-delete-1', 'id-to-delete-2');
*/

-- NOTES:
-- 1. The ROW_NUMBER() keeps the most recent entry (highest created_at)
-- 2. If created_at is the same, it keeps the one with higher ID
-- 3. This respects the unique constraint: buy_box_id + address + city
-- 4. Properties in different buy boxes are NOT affected (allowed duplicates)
-- 5. Properties without buy_box_id are NOT affected (legacy data)


