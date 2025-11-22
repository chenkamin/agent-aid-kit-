# Duplicate Properties Fix - Summary

## Issue Reported
Property **7377 Greenleaf Ave, Parma, OH, 44130** appeared 3 times in the database for the same buy box.

## Investigation Results

### ✅ Database Constraint (Working Correctly)
The database has a proper unique constraint:
```sql
CREATE UNIQUE INDEX idx_properties_unique_address_per_buybox
ON public.properties (buy_box_id, address, city)
WHERE buy_box_id IS NOT NULL AND address <> '' AND city <> '';
```

This **should** prevent duplicates, but the code wasn't checking correctly before insertion.

### ❌ Bug in update-properties-daily Function

**Location:** `functions/update-properties-daily/index.ts` Line 883

**Problem:** The code created TWO maps for duplicate detection:
1. `existingByAddress` - maps by address+city ✅
2. `existingPropsMap` - maps by listing URL ✅

But it **ONLY used the URL map** to check for duplicates:
```typescript
const existingProp = existingPropsMap.get(listingUrl); // ❌ Only URL check
```

**Why This Caused Duplicates:**
- Zillow URLs can change (ZPID updates, URL structure changes)
- Same property might have multiple URLs over time
- Different scraping sessions might get different URLs for the same address
- Code thought it was a new property when it was actually an existing one

## Fix Applied

### Changed Line 883 from:
```typescript
const existingProp = existingPropsMap.get(listingUrl);
```

### To:
```typescript
// Check by BOTH URL and Address+City to prevent duplicates
// (Zillow can change URLs, so we need to check address too)
const existingPropByUrl = existingPropsMap.get(listingUrl);
const addressKey = `${addressData.address}|${addressData.city}`.toLowerCase();
const existingPropByAddress = existingByAddress.get(addressKey);
const existingProp = existingPropByUrl || existingPropByAddress;

if (existingPropByUrl) {
  console.log(`      🔗 Found existing property by URL`);
} else if (existingPropByAddress) {
  console.log(`      📍 Found existing property by Address+City (URL changed!)`);
  console.log(`         Old URL: ${existingPropByAddress.listing_url}`);
  console.log(`         New URL: ${listingUrl}`);
}
```

### Additional Fix: URL Update Detection
When a property is found by address but has a different URL, we now:
1. Track it as a change in the property_changes table
2. Update both `listing_url` and `url` columns with the new URL
3. Log the URL change for debugging

```typescript
// Check if URL changed (found by address but different URL)
if (existingProp.listing_url !== listingUrl) {
  console.log(`      🔗 URL updated for property`);
  changes.push({
    field: 'listing_url',
    oldValue: existingProp.listing_url || 'null',
    newValue: listingUrl
  });
}
```

## Verification

### ✅ scrape-zillow Function
Already had the correct logic:
```typescript
const existingPropByAddress = existingByAddress.get(addressKey);
const existingPropByUrl = existingByUrl.get(listingUrl);
const existingProp = existingPropByAddress || existingPropByUrl;
```

So this function wasn't creating duplicates.

## Cleanup Required

### Check for Existing Duplicates
```sql
SELECT 
  buy_box_id,
  address,
  city,
  COUNT(*) as duplicate_count
FROM properties
WHERE buy_box_id IS NOT NULL
GROUP BY buy_box_id, address, city
HAVING COUNT(*) > 1;
```

### Remove Duplicates (Keep Most Recent)
See `CLEANUP_DUPLICATE_PROPERTIES.sql` for detailed cleanup script.

**Summary:** The script will:
1. Identify all duplicates
2. Keep the most recent entry (by created_at)
3. Delete older entries
4. Verify cleanup was successful

## Testing Plan

1. ✅ **Code Fix Applied** - update-properties-daily now checks both URL and address
2. ⏳ **Run Cleanup Script** - Remove existing duplicates from database
3. ⏳ **Run Scraper** - Test with a buy box that had duplicates
4. ⏳ **Verify Results** - Confirm no new duplicates are created
5. ⏳ **Check Logs** - Look for "URL changed!" messages indicating working URL tracking

## Impact

### Before Fix
- ❌ Same property inserted 2-3 times with different URLs
- ❌ Confusing duplicate listings in UI
- ❌ Inaccurate property counts
- ❌ Wasted database storage

### After Fix
- ✅ One property per address+city per buy box
- ✅ URL changes update existing property
- ✅ Accurate property counts
- ✅ Clean data matching database constraints
- ✅ Better debugging with URL change logging

## Files Modified

1. ✅ `functions/update-properties-daily/index.ts` - Fixed duplicate checking logic
2. ✅ `DUPLICATE_PROPERTIES_BUG.md` - Detailed technical explanation
3. ✅ `CLEANUP_DUPLICATE_PROPERTIES.sql` - Database cleanup script
4. ✅ `DUPLICATE_FIX_SUMMARY.md` - This summary document

## Next Steps

1. **Review the fix** - Verify the logic makes sense
2. **Run cleanup script** - Remove existing duplicates
3. **Deploy changes** - Push to production
4. **Monitor logs** - Watch for "URL changed" messages
5. **Verify no new duplicates** - Check after next scraping run

## Questions?

- **Will this affect properties in different buy boxes?** No, same property can exist in multiple buy boxes (by design)
- **Will existing duplicates be auto-fixed?** No, you need to run the cleanup script first
- **What if address has typos?** The database constraint uses exact match, so slight variations could still create "duplicates"
- **What about concurrent scraping?** The database constraint will prevent duplicates even with concurrent runs

## Example Log Output (After Fix)

When scraper finds an existing property by address with a different URL:
```
📋 Processing property:
   URL: https://www.zillow.com/homedetails/7377-Greenleaf-Ave-Parma-OH-44130/NEW_ZPID/
   Address: 7377 Greenleaf Ave, Parma, OH 44130
   Price: $150,000
   Home Type: "SINGLE_FAMILY" → "Single Family"
   📍 Found existing property by Address+City (URL changed!)
      Old URL: https://www.zillow.com/homedetails/7377-Greenleaf-Ave-Parma-OH-44130/OLD_ZPID/
      New URL: https://www.zillow.com/homedetails/7377-Greenleaf-Ave-Parma-OH-44130/NEW_ZPID/
   🔄 Found in existing properties - checking for updates
   🔗 URL updated for property
   ✅ Updating URL to: https://www.zillow.com/homedetails/7377-Greenleaf-Ave-Parma-OH-44130/NEW_ZPID/
```


