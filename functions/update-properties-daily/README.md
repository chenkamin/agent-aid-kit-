# Update Properties Daily - Zip Code Based Function

## Overview

This Edge Function updates property data by processing **one zip code at a time** to avoid timeout issues. Each zip code gets its own function execution, making it suitable for buy boxes with many zip codes.

## Why Zip-Based Processing?

**Problem**: Processing entire buy boxes with many zip codes caused timeouts due to Supabase Edge Function execution time limits.

**Solution**: Process one zip code per function call. This distributes the workload and prevents timeouts.

## API

### Request

**Method**: `POST`

**Body**:
```json
{
  "buyBoxId": "uuid-of-buy-box",
  "zipCode": "44124"
}
```

**Parameters**:
- `buyBoxId` (required): The UUID of the buy box to process
- `zipCode` (required): The zip code to scrape (must be part of the buy box's zip_codes array)

### Response

**Success**:
```json
{
  "message": "Zip code update completed",
  "result": {
    "buyBoxId": "uuid",
    "buyBoxName": "My Buy Box",
    "zipCode": "44124",
    "userId": "uuid",
    "totalScraped": 25,
    "newListings": 5,
    "updatedListings": 3,
    "skippedCount": 0,
    "success": true
  }
}
```

**Error**:
```json
{
  "message": "Zip code update failed",
  "result": {
    "buyBoxId": "uuid",
    "buyBoxName": "My Buy Box",
    "zipCode": "44124",
    "userId": "uuid",
    "error": "Error message",
    "success": false
  }
}
```

## Usage Examples

### Single Zip Code

```bash
curl -X POST https://your-project.supabase.co/functions/v1/update-properties-daily \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "buyBoxId": "123e4567-e89b-12d3-a456-426614174000",
    "zipCode": "44124"
  }'
```

### Process All Zip Codes in a Buy Box

To process all zip codes in a buy box, call the function once for each zip code:

```javascript
const buyBox = await supabase
  .from('buy_boxes')
  .select('id, zip_codes')
  .eq('id', buyBoxId)
  .single();

for (const zipCode of buyBox.zip_codes) {
  await fetch(`${SUPABASE_URL}/functions/v1/update-properties-daily`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ buyBoxId: buyBox.id, zipCode })
  });
  
  // Optional: Add delay between requests to avoid rate limits
  await new Promise(resolve => setTimeout(resolve, 2000));
}
```

## Cron Job Setup

### Option 1: Use GitHub Actions or External Cron Service

Create a script that:
1. Fetches all buy boxes
2. For each buy box, loops through its zip codes
3. Calls the function for each zip code

**Example with GitHub Actions**:

```yaml
# .github/workflows/update-properties.yml
name: Update Properties Daily
on:
  schedule:
    - cron: '0 9 * * *'  # Run daily at 9 AM UTC
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Update Properties
        run: |
          node update-properties.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

**update-properties.js**:
```javascript
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function updateAllProperties() {
  // Fetch all buy boxes
  const response = await fetch(`${SUPABASE_URL}/rest/v1/buy_boxes?select=id,zip_codes,name`, {
    headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY }
  });
  
  const buyBoxes = await response.json();
  
  for (const buyBox of buyBoxes) {
    console.log(`Processing buy box: ${buyBox.name}`);
    
    for (const zipCode of buyBox.zip_codes || []) {
      console.log(`  Processing zip code: ${zipCode}`);
      
      const result = await fetch(`${SUPABASE_URL}/functions/v1/update-properties-daily`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ buyBoxId: buyBox.id, zipCode })
      });
      
      const data = await result.json();
      console.log(`    Result: ${data.message}`, data.result);
      
      // Add delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
    }
  }
}

updateAllProperties().catch(console.error);
```

### Option 2: Use Supabase Cron Extension

If you have the pg_cron extension enabled:

```sql
-- Create a function to process all zip codes
CREATE OR REPLACE FUNCTION process_all_zip_codes()
RETURNS void AS $$
DECLARE
  buy_box RECORD;
  zip TEXT;
BEGIN
  FOR buy_box IN 
    SELECT id, name, zip_codes 
    FROM buy_boxes 
    WHERE zip_codes IS NOT NULL
  LOOP
    FOREACH zip IN ARRAY buy_box.zip_codes
    LOOP
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/update-properties-daily',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_key')
        ),
        body := jsonb_build_object(
          'buyBoxId', buy_box.id,
          'zipCode', zip
        )
      );
      
      -- Add delay between calls
      PERFORM pg_sleep(5);
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily at 9 AM
SELECT cron.schedule(
  'update-properties-daily',
  '0 9 * * *',
  'SELECT process_all_zip_codes()'
);
```

## Features Preserved

All filtering and processing logic from the original function is preserved:

✅ Price filtering (total price or price per sqft)  
✅ Home type filtering  
✅ City matching  
✅ Neighborhood verification (AI-powered)  
✅ Days on market filtering  
✅ Duplicate detection  
✅ Property change tracking  
✅ Agent information extraction  
✅ Status updates  

## Performance

- **Before**: Processing 50 zip codes → ~10-15 minutes → TIMEOUT ❌
- **After**: Processing 1 zip code → ~10-30 seconds → SUCCESS ✅

**Total time for 50 zip codes**: 8-25 minutes (distributed across 50 function calls)

## Error Handling

The function validates:
- ✅ Buy box exists
- ✅ Zip code is part of the buy box
- ✅ User has a company_id
- ✅ All environment variables are set

If a single zip code fails, it doesn't affect other zip codes.

## Monitoring

Check logs in Supabase Dashboard → Edge Functions → update-properties-daily

Each log will show:
- 📮 Zip code being processed
- 🏠 Buy box name
- 📊 Properties found, added, updated
- ✅ Success or ❌ Error messages

## Environment Variables

Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APIFY_API_TOKEN`

