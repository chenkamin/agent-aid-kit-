# Address/City Field Mapping Fix

## Issue
Properties in the database had incorrect address/city field mapping:
- **address** column was NULL or empty
- **city** column contained the full address (e.g., "5882 Kings Hwy Parma Heights")

This affected **663 out of 1,499 properties (44%)**.

## Root Cause
The `update-properties-daily` Edge Function was using empty strings as fallbacks when address parsing failed:
```typescript
address: addressData.address || '',  // ❌ Bad - allows empty strings
city: addressData.city || '',
```

This caused properties with failed URL parsing to be inserted with empty addresses and incorrect city values.

## Solution

### 1. Database Migration (`20251019120000_fix_address_city_mapping.sql`)
Created a migration that:
1. **Parses listing URLs** to extract correct address/city values using a temporary SQL function
2. **Identifies duplicates** in two categories:
   - Broken properties that have a correct version already in the database
   - Multiple broken properties that would result in the same corrected address
3. **Deletes 160 duplicate properties** (keeping the correct/oldest versions)
4. **Updates remaining broken properties** with correctly parsed address/city values

### 2. Updated `update-properties-daily` Function
Added validation to prevent future occurrences:
```typescript
// Skip properties with incomplete addresses
if (!addressData.address || !addressData.city) {
  console.log(`⚠️ Skipping property with incomplete address: ${listingUrl}`);
  skippedCount++;
  continue;
}

// Use direct values (no empty string fallbacks)
address: addressData.address,  // ✅ Good - requires valid value
city: addressData.city,
```

## Results

### Before Fix
- **Total properties**: 1,499
- **Null/empty addresses**: 663 (44%)
- **Valid addresses**: 836 (56%)

### After Fix
- **Total properties**: 1,339 (160 duplicates removed)
- **Null/empty addresses**: 29 (2%)
- **Valid addresses**: 1,310 (98%)

### Example (from original issue)
**Before:**
- address: `NULL`
- city: `5882 Kings Hwy Parma Heights`

**After:**
- address: `5882 Kings Hwy` ✅
- city: `Parma Heights` ✅

## Files Modified
1. `supabase/migrations/20251019120000_fix_address_city_mapping.sql` - Database migration
2. `functions/update-properties-daily/index.ts` - Added address validation

## Prevention
The updated validation in `update-properties-daily` ensures that:
- Properties with incomplete addresses are skipped (not inserted with empty values)
- Only properties with valid parsed addresses are added to the database
- The `skippedCount` is tracked and reported for monitoring

## Notes
- The 29 remaining properties with null addresses likely don't have valid `listing_url` values
- Both `scrape-zillow` and `update-properties-daily` functions now have consistent address validation
- The unique constraint `idx_properties_unique_address_per_company` on (company_id, address, city) helps prevent future duplicates

