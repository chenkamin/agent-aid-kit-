# Duplicate Properties Bug - CRITICAL

## Problem
Properties are being inserted multiple times in the same buy box, violating the database unique constraint. Example: **7377 Greenleaf Ave, Parma, OH, 44130** appears 3 times.

## Root Cause

### Database Constraint (CORRECT)
```sql
CREATE UNIQUE INDEX idx_properties_unique_address_per_buybox
ON public.properties (buy_box_id, address, city)
WHERE buy_box_id IS NOT NULL 
  AND address <> '' 
  AND city <> '';
```
This prevents duplicates by `(buy_box_id, address, city)`.

### Code Logic (INCORRECT)
**Line 437-445 in update-properties-daily/index.ts:**
```typescript
// Create maps by address+city and by URL for duplicate detection within this buy box
const existingByAddress = new Map(
  (existingProperties || []).map(p => [`${p.address}|${p.city}`.toLowerCase(), p])
);
const existingPropsMap = new Map(
  (existingProperties || []).map(p => [p.listing_url, p])
);
```

**Line 883 - THE BUG:**
```typescript
const existingProp = existingPropsMap.get(listingUrl);  // ❌ ONLY checks by URL!
```

The code creates BOTH maps but **only uses `existingPropsMap` (by URL)**, ignoring the `existingByAddress` map!

## Why This Causes Duplicates

1. **Different Zillow URLs for the Same Property**: Zillow can have multiple URLs for the same property:
   - Sold history page
   - For sale listing page
   - Different ZPID variants
   - Forwarding URLs

2. **URL Changes**: When Zillow changes a listing URL (ZPID update, URL structure change), the code thinks it's a new property

3. **Result**: Same property gets inserted multiple times with different URLs

## Example Scenario
```
Run 1: Property scraped with URL: zillow.com/homedetails/7377-Greenleaf-Ave.../12345_zpid/
  -> No match in existingPropsMap (new URL) -> INSERTED ✅

Run 2: Same property, different URL: zillow.com/homedetails/7377-Greenleaf-Ave.../67890_zpid/
  -> No match in existingPropsMap (different URL) -> INSERTED ✅ (DUPLICATE!)

Run 3: Zillow URL updated: zillow.com/homedetails/7377-Greenleaf-Ave-Parma-OH.../12345_zpid/
  -> No match in existingPropsMap (URL changed) -> INSERTED ✅ (DUPLICATE!)
```

## How Duplicates Get Through

Even though there's a database constraint, duplicates can occur if:

1. **Address normalization differs slightly** (extra spaces, abbreviations)
2. **Database INSERT catches the constraint** but code continues without checking the error code
3. **Concurrent runs** - two scrapes running at the same time for different zip codes in the same buy box

## The Fix

### Current Code (Line 883):
```typescript
const existingProp = existingPropsMap.get(listingUrl);
```

### Should Be:
```typescript
// Check by BOTH URL and Address+City
const existingPropByUrl = existingPropsMap.get(listingUrl);
const addressKey = `${addressData.address}|${addressData.city}`.toLowerCase();
const existingPropByAddress = existingByAddress.get(addressKey);
const existingProp = existingPropByUrl || existingPropByAddress;
```

This ensures:
- ✅ Existing properties are updated even if URL changes
- ✅ No duplicates even if Zillow provides different URLs
- ✅ Matches database constraint logic (`buy_box_id, address, city`)

## Impact

**Before Fix:**
- ❌ Same property inserted 2-3 times with different URLs
- ❌ Database constraint violations (silent failures)
- ❌ Duplicate listings confuse users
- ❌ Wrong property counts in buy boxes

**After Fix:**
- ✅ One property per address+city per buy box
- ✅ URL changes update existing property instead of creating duplicate
- ✅ Matches database constraint
- ✅ Clean, accurate property data

## Testing
After fixing:
1. Check for existing duplicates: 
   ```sql
   SELECT address, city, buy_box_id, COUNT(*) 
   FROM properties 
   GROUP BY address, city, buy_box_id 
   HAVING COUNT(*) > 1;
   ```

2. Clean up existing duplicates (keep most recent):
   ```sql
   DELETE FROM properties 
   WHERE id IN (
     SELECT id FROM (
       SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY buy_box_id, address, city 
           ORDER BY created_at DESC
         ) as rn
       FROM properties
     ) t WHERE rn > 1
   );
   ```

3. Run scraper and verify no new duplicates

## Files to Fix
- `functions/update-properties-daily/index.ts` - Line 883
- Consider adding this check to `functions/scrape-zillow/index.ts` as well


