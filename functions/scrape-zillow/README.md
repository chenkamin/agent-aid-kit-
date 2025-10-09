# Scrape Zillow Edge Function

## Description
Scrapes property listings from Zillow based on buy box criteria (zip codes, price, etc.) and inserts/updates properties in the database.

## Features
- Integrates with Apify Zillow Scraper Actor
- Detects duplicate properties by address+city (not just URL)
- Updates existing properties when found again
- Tracks property changes (price, status) in `property_changes` table
- Triggers ARV estimation for new properties
- Prevents duplicate inserts with address validation

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


