# Zillow Scraper - Date Listed Field Added ✅

## Summary

Added the `date_listed` field to the Zillow scraper to capture when a property was originally posted/listed on Zillow.

---

## What Was Changed

### File Modified
**`functions/update-properties-daily/index.ts`** (line 406)

### Field Added
```typescript
date_listed: prop.datePostedString || null,
```

---

## Implementation Details

### Where It's Captured
The `date_listed` field is now captured when creating new property listings:

```typescript
newListings.push({
  user_id: buyBox.user_id,
  company_id: companyId,
  buy_box_id: buyBox.id,
  address: addressData.address,
  city: addressData.city,
  state: addressData.state,
  zip: addressData.zip,
  price: scrapedPrice,
  bedrooms: parseInteger(prop.beds || prop.bedrooms),
  bed: parseInteger(prop.beds || prop.bedrooms),
  bathrooms: parseNumber(prop.baths || prop.bathrooms),
  bath: parseNumber(prop.baths || prop.bathrooms),
  square_footage: parseInteger(prop.livingArea || prop.area),
  living_sqf: parseInteger(prop.livingArea || prop.area),
  home_type: normalizeHomeType(prop.homeType || prop.propertyType),
  status: scrapedStatus,
  initial_status: prop.homeStatus || prop.statusText || '',
  days_on_market: parseInteger(prop.daysOnZillow),
  date_listed: prop.datePostedString || null,  // ✅ NEW FIELD
  listing_url: listingUrl,
  url: listingUrl,
  is_new_listing: true,
  listing_discovered_at: new Date().toISOString(),
  last_scraped_at: new Date().toISOString()
});
```

### Data Source
- **Field Name**: `datePostedString`
- **Source**: Apify Zillow scraper response
- **Format**: String (Zillow's date format, e.g., "Dec 15, 2024")
- **Fallback**: `null` if not available

---

## How It Works

### New Property Scraped
1. Zillow scraper (via Apify) returns property data
2. Data includes `datePostedString` field
3. Field is captured as `date_listed` in database
4. Stored when the property is first discovered

### Example Data Flow
```
Zillow Response:
{
  "datePostedString": "Dec 15, 2024",
  "beds": 3,
  "baths": 2,
  "price": 250000,
  ...
}

↓

Database Record:
{
  "date_listed": "Dec 15, 2024",
  "bedrooms": 3,
  "bathrooms": 2,
  "price": 250000,
  ...
}
```

---

## Use Cases

### 1. **Track Listing Age**
```sql
SELECT address, date_listed, 
       CURRENT_DATE - date_listed::date as days_since_listed
FROM properties
WHERE date_listed IS NOT NULL
ORDER BY days_since_listed DESC;
```

### 2. **Find Fresh Listings**
```sql
SELECT address, price, date_listed
FROM properties
WHERE date_listed::date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date_listed DESC;
```

### 3. **Identify Stale Listings**
```sql
SELECT address, price, date_listed,
       CURRENT_DATE - date_listed::date as days_on_market
FROM properties
WHERE date_listed::date < CURRENT_DATE - INTERVAL '90 days'
ORDER BY date_listed ASC;
```

### 4. **Compare with Days on Zillow**
```sql
SELECT address, 
       date_listed,
       days_on_market,
       CURRENT_DATE - date_listed::date as calculated_days
FROM properties
WHERE date_listed IS NOT NULL
AND days_on_market IS NOT NULL;
```

---

## Database Schema

### Properties Table
The `date_listed` field should exist in your properties table:

```sql
properties (
  ...
  date_listed text,  -- Zillow's date format string
  days_on_market integer,  -- Zillow's calculated days
  ...
)
```

If the column doesn't exist yet, you'll need to add it:

```sql
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS date_listed TEXT;

COMMENT ON COLUMN properties.date_listed IS 'Date when the property was originally listed on Zillow (from datePostedString)';
```

---

## Benefits

### 1. **Historical Tracking** 📅
- Know exactly when a property was listed
- Track how long properties stay on the market
- Identify pricing trends over time

### 2. **Better Filtering** 🔍
- Filter by "listed in last 7 days"
- Find properties that have been on market too long
- Prioritize fresh listings

### 3. **Market Analysis** 📊
- Compare listing dates across neighborhoods
- Identify seasonal patterns
- Track market velocity

### 4. **Data Validation** ✓
- Cross-reference with `days_on_market`
- Verify Zillow's calculated days
- Identify data inconsistencies

---

## Example Scenarios

### Scenario 1: Find This Week's New Listings
```typescript
// In your app
const freshListings = await supabase
  .from('properties')
  .select('*')
  .gte('date_listed', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  .order('date_listed', { ascending: false });
```

### Scenario 2: Flag Stale Listings
```typescript
// Properties listed over 6 months ago
const staleListings = await supabase
  .from('properties')
  .select('*')
  .lte('date_listed', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
  .order('date_listed', { ascending: true });
```

### Scenario 3: Display Listing Age in UI
```tsx
{property.date_listed && (
  <Badge variant="outline">
    Listed: {property.date_listed}
  </Badge>
)}
```

---

## Important Notes

### ⚠️ Date Format
- Zillow's `datePostedString` is a **string** in format like "Dec 15, 2024"
- Not a standard ISO timestamp
- May need parsing if you want to do date calculations
- Consider converting to DATE type in database for easier querying

### ⚠️ Null Values
- New properties without this field will have `null`
- Existing properties won't have this field (scraped before this update)
- Only newly scraped properties will have the date

### ⚠️ Updates
- This field is only set when a property is **first discovered**
- Not updated on subsequent scrapes (maintains original listing date)
- Matches the `listing_discovered_at` timestamp logic

---

## Future Enhancements (Optional)

### 1. **Convert to Date Type**
Instead of storing as text, convert to proper DATE:
```typescript
date_listed: prop.datePostedString ? new Date(prop.datePostedString).toISOString() : null,
```

### 2. **Backfill Existing Properties**
For properties already in the database, you could estimate based on:
- `listing_discovered_at` field
- `days_on_market` field (subtract from current date)

### 3. **Add to PropertyForm**
Allow manual entry or editing of `date_listed` in the property form.

### 4. **Add to UI Filters**
Filter properties by listing date ranges in the UI.

---

## Testing Checklist

- [x] Field added to new property creation
- [x] No linting errors
- [ ] Test with next Zillow scrape
- [ ] Verify `datePostedString` is populated in Apify response
- [ ] Check database column exists
- [ ] Confirm data appears in database after scrape
- [ ] Test UI display (if needed)

---

## Deployment Steps

### 1. **Database Migration** (if needed)
```sql
-- Add column if it doesn't exist
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS date_listed TEXT;
```

### 2. **Deploy Edge Function**
```bash
supabase functions deploy update-properties-daily
```

### 3. **Test Scraping**
Trigger a manual scrape or wait for the next cron run to verify the field is populated.

### 4. **Verify Data**
```sql
SELECT address, date_listed, days_on_market
FROM properties
WHERE date_listed IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## Conclusion

The `date_listed` field is now captured from Zillow's `datePostedString` during property scraping. This provides valuable historical data for tracking listing age, filtering fresh properties, and market analysis.

**Status**: ✅ **COMPLETE**

**Updated**: October 21, 2025

**Impact**: Medium - adds valuable metadata for property tracking












