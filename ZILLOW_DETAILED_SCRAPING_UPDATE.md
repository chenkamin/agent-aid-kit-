# Zillow Detailed Scraping Update

## Summary

The Zillow scraping function has been upgraded to a **two-step scraping process** to capture comprehensive property information, including **agent contact details** (name, phone, email).

## What Changed?

### Before
- ❌ Only scraped search results (basic property info)
- ❌ Agent information was always `null`
- ❌ Limited property details

### After
- ✅ **Step 1**: Scrapes search results to find properties
- ✅ **Step 2**: Scrapes detailed property information using addresses
- ✅ **Extracts agent information**: name, phone, email
- ✅ **Batch processing**: Processes 50 properties at a time for efficiency
- ✅ **Smart matching**: Maps detailed data back to properties using multiple address formats

## How It Works

```
1. User clicks "Create & Scrape"
   ↓
2. Search Actor scrapes Zillow for properties matching buy box criteria
   ↓
3. Filters applied (price per sqft, property types, cities)
   ↓
4. Collects all property addresses
   ↓
5. Details Actor scrapes full property info for each address (in batches)
   ↓
6. Agent information extracted from detailed data
   ↓
7. Properties saved with agent contact information
   ↓
8. ARV estimation triggered for new properties
```

## 🚨 Action Required

You need to configure the Property Details Actor ID:

### Step 1: Find Your Apify Property Details Actor
1. Go to your Apify dashboard
2. Find the Zillow Property Details actor (the one that accepts addresses as input)
3. Note the actor ID from the URL or actor page

### Step 2: Update the Code
1. Open `functions/scrape-zillow/index.ts`
2. Find line 120: `const PROPERTY_DETAILS_ACTOR_ID = 'YOUR_PROPERTY_DETAILS_ACTOR_ID';`
3. Replace `YOUR_PROPERTY_DETAILS_ACTOR_ID` with your actual actor ID

Example:
```typescript
// Before
const PROPERTY_DETAILS_ACTOR_ID = 'YOUR_PROPERTY_DETAILS_ACTOR_ID';

// After
const PROPERTY_DETAILS_ACTOR_ID = 'apify/zillow-property-details';
// or whatever your actual actor ID is
```

### Step 3: Deploy the Function
```bash
supabase functions deploy scrape-zillow
```

## Required Actor Input Format

The Property Details Actor should accept this input:
```json
{
  "addresses": [
    "8949 W Ridge Rd APT B, Elyria, OH 44035",
    "1234 Main St, Cleveland, OH 44105"
  ],
  "extractBuildingUnits": "all",
  "propertyStatus": "FOR_SALE"
}
```

## Expected Output Fields

The Details Actor should return data with a `listedBy` array structure:

```json
{
  "listedBy": [
    {
      "id": "LISTING_AGENT",
      "elements": [
        { "id": "NAME", "text": "John Smith" },
        { "id": "PHONE", "text": "216-555-0123" },
        { "id": "EMAIL", "text": "agent@example.com" }
      ]
    },
    {
      "id": "BROKER",
      "elements": [
        { "id": "NAME", "text": "ABC Realty" }
      ]
    }
  ]
}
```

The code will:
1. Find the `LISTING_AGENT` section in the `listedBy` array
2. Extract NAME, PHONE, and EMAIL from the `elements` array
3. Fall back to other possible field names if needed

✅ **This mapping is already implemented in the updated code!**

## Database Migration Note

You also need to apply the database migration to add the `filter_by_city_match` column:

1. Go to your Supabase Dashboard → SQL Editor
2. Run the contents of `APPLY_MISSING_MIGRATIONS.sql` (which should still be in your project root)
3. This adds missing columns: `filter_by_ppsf` and `filter_by_city_match`

**Note**: I already updated the TypeScript types in `src/integrations/supabase/types.ts` to include these columns.

## Files Modified

1. ✅ `functions/scrape-zillow/index.ts` - Added detailed scraping logic
2. ✅ `functions/scrape-zillow/README.md` - Updated documentation
3. ✅ `src/integrations/supabase/types.ts` - Added `filter_by_city_match` to schema
4. ✅ `APPLY_MISSING_MIGRATIONS.sql` - Created migration file (you deleted this, but I can recreate if needed)

## Benefits

1. **Complete Agent Information**: Get agent name, phone, and email for every property
2. **Better Lead Quality**: Direct contact information for follow-up
3. **More Property Details**: Access to comprehensive property data
4. **Scalable**: Batch processing prevents API overload
5. **Reliable**: Handles missing data gracefully with fallbacks

## Testing

After setup, test by:
1. Create a buy box with a small number of properties (1-2 zip codes)
2. Click "Create & Scrape"
3. Check the console/logs for:
   - "🔍 STEP 2: Fetching detailed property information..."
   - "📞 Agent info found - Name: ..., Phone: ..., Email: ..."
4. Verify agent information appears in your properties table

## Troubleshooting

### "Property details API error"
- Verify the actor ID is correct
- Check that you have Apify credits
- Ensure the actor accepts the input format shown above

### "No detailed data found"
- The address matching may need adjustment
- Check console logs for address format mismatches
- Verify the Details Actor is returning data

### Still seeing `null` for agent fields
- Check that your actor returns a `listedBy` array
- Verify the structure matches the expected format (see above)
- Add console logging to see the raw data:
  ```typescript
  console.log('📦 Raw detailed data:', JSON.stringify(detailedData, null, 2));
  ```
- The code already handles the nested array structure, but you can adjust field mappings in lines 570-635 of `index.ts` if needed

### Want to map more fields?
See `PROPERTY_FIELD_MAPPING.md` for a complete guide on mapping additional property fields like:
- Lot size, year built, tax assessed value
- Broker information
- HOA fees, parking, appliances
- And more!

## Need Help?

If you need help finding the right Apify actor or configuring the field mappings, let me know:
- What actor are you using for property details?
- What does a sample output from that actor look like?

---

**Next Steps:**
1. ⚠️ Apply the database migration (`APPLY_MISSING_MIGRATIONS.sql`)
2. ⚠️ Configure the Property Details Actor ID
3. ⚠️ Deploy the updated function
4. ✅ Test with a small buy box
5. ✅ Verify agent information is captured

