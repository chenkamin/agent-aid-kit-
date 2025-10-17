# Scrape Zillow Edge Function

## Description
Scrapes property listings from Zillow based on buy box criteria (zip codes, price, etc.) and inserts/updates properties in the database.

## Features
- **Two-Step Scraping Process**:
  1. Search results scraping for property discovery
  2. Detailed property scraping for agent contact information
- Integrates with Apify Zillow Scraper Actors
- Extracts agent name, phone, and email from property details
- Detects duplicate properties by address+city (not just URL)
- Updates existing properties when found again
- Tracks property changes (price, status) in `property_changes` table
- Triggers ARV estimation for new properties
- Prevents duplicate inserts with address validation
- Batch processing for efficient API usage

## Deployment
```bash
supabase functions deploy scrape-zillow
```

## Usage
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/scrape-zillow`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${USER_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    buyBoxId: 'uuid-of-buy-box'
  })
});
```

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APIFY_API_TOKEN`

## ⚠️ Important Setup Required

You need to configure the Property Details Actor ID in the code:

1. Open `functions/scrape-zillow/index.ts`
2. Find the line: `const PROPERTY_DETAILS_ACTOR_ID = 'YOUR_PROPERTY_DETAILS_ACTOR_ID';`
3. Replace with your actual Apify actor ID

The actor should accept this input format:
```json
{
  "addresses": ["8949 W Ridge Rd APT B, Elyria, OH 44035"],
  "extractBuildingUnits": "all",
  "propertyStatus": "FOR_SALE"
}
```

## Apify Actors Used

1. **Search Actor**: `l7auNT3I30CssRrvO` - Zillow property search
2. **Details Actor**: `YOUR_PROPERTY_DETAILS_ACTOR_ID` - ⚠️ Needs configuration

## Response
```json
{
  "message": "Properties scraped successfully",
  "count": 50,
  "newCount": 10,
  "updatedCount": 5,
  "skippedCount": 2,
  "buyBoxName": "Cleveland Investment Properties"
}
```


