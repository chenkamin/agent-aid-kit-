# Update Properties Daily - Debugging Guide

## Summary of Changes

Added comprehensive debugging logs to the `update-properties-daily` edge function to identify why properties are not being inserted.

## What Was Added

### 1. **Initial Data Check**
- Logs the first scraped property from Zillow to verify data structure
- Warns if no properties are returned from scraper
- Shows the search configuration used

### 2. **Existing Properties Check**
- Logs how many properties already exist in the database for this buy box
- Shows a sample existing property
- Displays the size of the existing URLs map

### 3. **Per-Property Processing**
- Logs each property being processed
- Shows extracted address data
- Indicates whether property is NEW or EXISTING
- For new properties: logs the complete data being prepared for insertion

### 4. **Insertion Details**
- Logs each insertion attempt with:
  - Property address and URL
  - Buy box ID, Company ID, User ID
  - Success/failure status
  - Full error details including error code
  - Inserted property ID on success

### 5. **Summary Statistics**
- Final summary showing:
  - Properties after all filters
  - New listings identified
  - Existing listings updated
  - Properties skipped due to incomplete data
  - Total existing properties in DB for the buy box

## Common Issues to Look For

### Issue 1: No Properties from Zillow
**Log signature:** `⚠️ WARNING - No properties returned from Zillow scraper!`

**Possible causes:**
- Invalid zip codes in buy box
- Apify API issue
- Search criteria too restrictive

**What to check:**
- Look at the `Search config used` log
- Verify zip codes are valid
- Check Apify API status

### Issue 2: All Properties Filtered Out
**Log signature:** Multiple "After X filtering" logs showing decreasing counts

**Possible causes:**
- Price per sqft filter too restrictive
- Home type filter eliminating all properties
- City filter too restrictive
- Neighborhood AI filter rejecting all properties

**What to check:**
- Look at each filter stage count
- Check buy box filter settings
- Review the sample property data structure

### Issue 3: All Properties Already Exist
**Log signature:** `🔄 Found in existing properties - checking for updates`

**Possible causes:**
- Properties were already scraped previously
- No new listings in the area
- Buy box was recently processed

**What to check:**
- `Existing properties in database for this buy box` count
- Check `last_scraped_at` timestamp on the buy box
- Look at existing property URLs vs scraped URLs

### Issue 4: Incomplete Address Data
**Log signature:** `⚠️ Skipping - incomplete address data`

**Possible causes:**
- URL parsing failing for certain Zillow URLs
- Zillow changed their URL format
- Invalid/malformed URLs from scraper

**What to check:**
- Look at the extracted address data: `Address extracted: ...`
- Check the property URL format
- Review `extractAddressFromUrl` function logic

### Issue 5: Database Insertion Errors
**Log signature:** `❌ INSERT FAILED`

**Possible causes:**
- Unique constraint violations (duplicate)
- Foreign key constraint violations
- Data type mismatches
- Missing required fields

**What to check:**
- Error code (23505 = duplicate)
- Error message details
- Company ID, User ID, Buy Box ID validity
- Data types match database schema

### Issue 6: Duplicate Properties
**Log signature:** `⚠️ Duplicate property skipped`

**Possible causes:**
- Property already exists with same address+city+buy_box_id
- Unique constraint on listing_url per buy box

**What to check:**
- Review unique constraints in database
- Check if property was already inserted in previous run
- Verify `existingPropsMap` is working correctly

## How to Use This Debug Information

1. **Run the edge function** (it processes ONE buy box per run)

2. **Review the logs in order:**
   ```
   🔄 Starting daily property update job...
   🏠 Processing buy box: [Name]
   📊 Progress: Processing 1 of [X] total buy boxes
   ⏰ Last scraped: [timestamp]
   📋 DEBUG - Existing properties in database: [count]
   ✅ Found [X] properties from Zillow
   🔍 DEBUG - Sample property: [JSON]
   📊 After [filter] filtering: [count] properties
   🔄 Processing [X] scraped properties...
   🏠 Checking property: [URL]
   💾 Attempting to insert [X] new listings...
   📊 INSERTION SUMMARY
   📊 ===== FINAL SUMMARY =====
   ```

3. **Identify the bottleneck:**
   - If no properties from Zillow → Check Apify/search config
   - If properties filtered out → Check filter settings
   - If all existing → Check last_scraped_at timing
   - If insertion fails → Check error codes and messages

4. **Compare numbers at each stage:**
   - Properties from Zillow (before filtering)
   - After price filtering
   - After home type filtering
   - After city filtering
   - After neighborhood filtering
   - New vs existing
   - Skipped due to incomplete data
   - Successfully inserted

## Next Steps

Once you identify the issue:

1. **If filters are too restrictive**: Adjust buy box settings
2. **If no data from Zillow**: Check Apify configuration and API status
3. **If URL parsing fails**: Update `extractAddressFromUrl` function
4. **If database errors**: Check schema, constraints, and data types
5. **If all properties exist**: This is normal - function working as expected

## Testing Recommendations

1. Test with a buy box that has minimal filters first
2. Gradually add filters to identify which one causes issues
3. Check that buy box has valid zip codes
4. Ensure company_id is set on buy box
5. Verify user has proper permissions


