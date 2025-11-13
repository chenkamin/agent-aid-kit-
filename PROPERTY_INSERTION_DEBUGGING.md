# Property Insertion Debugging - Enhanced Logging

## Issue
Property at **21561 Maydale Ave, Euclid, OH 44123** (Zillow URL: https://www.zillow.com/homedetails/21561-Maydale-Ave-Euclid-OH-44123/33627522_zpid/) was not inserted into the database for the Euclid buy box (zip codes: 44117, 44132, 44123).

## Changes Made

### 1. **Enhanced Home Type Normalization**
- **File**: `functions/scrape-zillow/index.ts`
- **Change**: Added support for "House" and "House for sale" to be treated as "Single Family"
- **Why**: Zillow sometimes returns "House for sale" as the property type, which wasn't being normalized properly

```typescript
// Handle generic "house" or "house for sale" as Single Family
if (type.includes('house')) {
  console.log(`📍 Treating "${homeType}" as "Single Family"`);
  return 'Single Family';
}
```

### 2. **Comprehensive Filtering Logs**
Added detailed logging at each filtering stage to track why properties are excluded:

#### Price per SqFt Filtering
- Logs each property that's filtered out due to missing data
- Logs each property that's filtered out due to being outside the price/sqft range
- Shows the calculated price per sqft and the expected range

#### Home Type Filtering
- Logs each property filtered out with its raw home type, normalized type, and expected types
- Shows type mismatch clearly

#### City Filtering
- Logs each property filtered out with its extracted city and the expected cities
- Shows city mismatch clearly

#### Property Processing
- Added detailed logging when processing each property after all filters
- Shows full property data including URL, address, city, state, zip, price, and home type
- Clearly identifies NEW properties vs EXISTING properties

### 3. **Enhanced Summary Logging**
Added comprehensive summary sections:
- Section header before processing properties
- Final summary showing total properties after filters, new properties to insert, and agent info stats

## How to Use the New Logging

### Step 1: Trigger a Buy Box Scrape
Run the scrape for the Euclid buy box and check the Supabase Edge Function logs:

1. Go to Supabase Dashboard → Edge Functions → Logs
2. Select the `scrape-zillow` function
3. Look for logs from your buy box scrape

### Step 2: Check Each Filter Stage

#### Look for these log sections:

**1. Initial Property Count:**
```
🎯 Found X properties from Zillow (before filtering)
```

**2. Price per SqFt Filter (if enabled):**
```
🔍 Filtering by price per sqft range: $X/sqft - $Y/sqft...
   ❌ FILTERED OUT by price/sqft: 21561 Maydale Ave, Euclid - $114,900 / 1200 sqft = $95.75/sqft (range: $50-$90/sqft)
📊 After price per sqft filtering: X of Y properties passed
```

**3. Home Type Filter (if enabled):**
```
🏠 Filtering by property types: Single Family, Multi Family
   ❌ FILTERED OUT by home type: 21561 Maydale Ave, Euclid - Type: "House for sale" → "Other" (looking for: Single Family, Multi Family)
📊 After home type filtering: X of Y properties passed
```

**4. City Filter (if enabled):**
```
🎯 Filtering by city match
   ❌ FILTERED OUT by city: 21561 Maydale Ave, Euclid - City: "euclid" not in [cleveland, lakewood]
📊 After city filtering: X of Y properties passed
```

**5. Property Processing:**
```
🏘️  PROCESSING X PROPERTIES AFTER ALL FILTERS

📋 Processing property: {
  url: "https://www.zillow.com/homedetails/21561-Maydale-Ave-Euclid-OH-44123/33627522_zpid/",
  address: "21561 Maydale Ave",
  city: "Euclid",
  state: "OH",
  zip: "44123",
  price: 114900,
  homeType: "House for sale",
  ...
}

✅ NEW PROPERTY - Will be added to database
   Address: 21561 Maydale Ave, Euclid, OH 44123
   Price: $114,900
   Buy Box ID: xxx-xxx-xxx
```

**6. Insertion Results:**
```
💾 Inserting listing 1/X:
   Address: 21561 Maydale Ave, Euclid, OH 44123
   ...
   ✅ INSERT SUCCESSFUL
   🔍 Inserted property ID: xxx-xxx-xxx
```

OR

```
   ❌ INSERT FAILED
   Error code: 23505
   Error message: duplicate key value violates unique constraint...
```

### Step 3: Identify the Issue

Based on the logs, you can determine:

1. **Did the property get scraped from Zillow?**
   - Check the initial count and look for the address in early logs

2. **Was it filtered out by price/sqft?**
   - Look for the "FILTERED OUT by price/sqft" log

3. **Was it filtered out by home type?**
   - Look for the "FILTERED OUT by home type" log
   - Note: After the fix, "House for sale" should now be treated as "Single Family"

4. **Was it filtered out by city?**
   - Look for the "FILTERED OUT by city" log
   - Check if the buy box has `filter_by_city_match` enabled

5. **Was it processed but failed to insert?**
   - Look for "INSERT FAILED" with error details

## Common Issues and Solutions

### Issue 1: Home Type Filter
**Problem**: Property has type "House for sale" but buy box only accepts "Single Family"
**Solution**: ✅ FIXED - "House" is now normalized to "Single Family"

### Issue 2: City Filter Mismatch
**Problem**: Buy box has `filter_by_city_match: true` with cities that don't include "Euclid"
**Solution**: 
- Check buy box `filter_by_city_match` setting
- Check buy box `cities` array includes "Euclid" (case-insensitive)
- If using zip code filtering, consider disabling city matching or adding all cities in those zips

### Issue 3: Price per SqFt Filter
**Problem**: Property's calculated price/sqft is outside the buy box range
**Solution**:
- Check buy box `filter_by_ppsf` setting
- Check buy box `price_min` and `price_max` values
- Verify property has both price and square footage data

### Issue 4: Duplicate Entry
**Problem**: Property already exists in database with same address+city or URL
**Solution**: Check if property exists in a different buy box or was previously deleted

### Issue 5: Missing Required Fields
**Problem**: Property is missing `address`, `city`, or `company_id`
**Solution**: 
- Check extraction from Zillow URL
- Verify buy box has `company_id` set
- Check user has a team membership with a company

## Database Constraints

The `properties` table has these requirements:
- **Required fields**: `company_id` (must have a valid company)
- **Home type enum**: Must be one of: "Single Family", "Multi Family", "Condo", "Townhouse", "Land", "Commercial", "Other"
- **No unique constraint**: Multiple properties with same address can exist (across different buy boxes)

## Next Steps

1. Run a scrape on the Euclid buy box
2. Check the logs following the steps above
3. Look for the specific property (21561 Maydale Ave, Euclid, OH 44123)
4. Identify at which filtering stage it was excluded (if any)
5. Verify the fix for "House" home type is working
6. Adjust buy box filters as needed

## Testing the Fix

To test if the "House for sale" fix is working:

1. Look for this log when a property with type "House" is processed:
   ```
   📍 Treating "House for sale" as "Single Family"
   ```

2. Verify that properties with "House" type now pass the home type filter (if "Single Family" is in the allowed types)

3. Check that such properties are successfully inserted into the database


