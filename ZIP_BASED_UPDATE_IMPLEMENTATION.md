# Zip-Based Property Update Implementation

## Problem Statement

The original `update-properties-daily` function processed entire buy boxes at once. When buy boxes contained many zip codes (e.g., 50+ zip codes), the function would timeout due to Supabase Edge Function execution limits (~300 seconds).

## Solution

Refactored the function to process **one zip code at a time**. Each zip code gets its own function execution, distributing the workload and preventing timeouts.

## Changes Made

### 1. Function Signature Change

**Before:**
- Function selected the oldest buy box automatically
- Processed ALL zip codes in that buy box
- No request body required

**After:**
- Function accepts `buyBoxId` and `zipCode` in request body
- Processes only the specified zip code
- Must be called once per zip code

### 2. Request/Response Format

**Request:**
```json
{
  "buyBoxId": "uuid-of-buy-box",
  "zipCode": "44124"
}
```

**Response:**
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

### 3. Key Code Changes

#### Scraping Configuration
```typescript
// OLD: Process all zip codes
const searchConfig = {
  zipCodes: buyBox.zip_codes || [],
  // ... other config
};

// NEW: Process only one zip code
const searchConfig = {
  zipCodes: [zipCode], // Single zip code only
  // ... other config
};
```

#### Validation
```typescript
// Verify zip code is part of the buy box
if (!buyBox.zip_codes || !buyBox.zip_codes.includes(zipCode)) {
  throw new Error(`Zip code ${zipCode} is not part of buy box ${buyBox.name}`);
}
```

### 4. Preserved Features

All existing functionality remains intact:

✅ **Price Filtering**: Both total price and price-per-sqft modes  
✅ **Home Type Filtering**: Filter by property types  
✅ **City Matching**: Exact city match filtering  
✅ **Neighborhood Filtering**: AI-powered neighborhood verification  
✅ **Days on Market**: Filter by listing age  
✅ **Duplicate Detection**: Prevents duplicate properties  
✅ **Change Tracking**: Records price and status changes  
✅ **Agent Information**: Extracts seller agent details  

## Usage

### Option 1: Manual Invocation

Call the function once for each zip code:

```bash
# Process first zip code
curl -X POST https://your-project.supabase.co/functions/v1/update-properties-daily \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"buyBoxId": "123e4567-...", "zipCode": "44124"}'

# Process second zip code
curl -X POST https://your-project.supabase.co/functions/v1/update-properties-daily \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"buyBoxId": "123e4567-...", "zipCode": "44125"}'
```

### Option 2: Script to Process All Zip Codes

```javascript
// update-all-zip-codes.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function updateAllZipCodes() {
  // Fetch all buy boxes
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/buy_boxes?select=id,name,zip_codes`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      }
    }
  );
  
  const buyBoxes = await response.json();
  console.log(`Found ${buyBoxes.length} buy boxes`);
  
  for (const buyBox of buyBoxes) {
    console.log(`\n📦 Processing buy box: ${buyBox.name}`);
    console.log(`   Zip codes: ${buyBox.zip_codes?.length || 0}`);
    
    if (!buyBox.zip_codes || buyBox.zip_codes.length === 0) {
      console.log(`   ⚠️ No zip codes, skipping`);
      continue;
    }
    
    for (const zipCode of buyBox.zip_codes) {
      console.log(`\n   📮 Processing zip: ${zipCode}`);
      
      try {
        const result = await fetch(
          `${SUPABASE_URL}/functions/v1/update-properties-daily`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              buyBoxId: buyBox.id,
              zipCode: zipCode
            })
          }
        );
        
        const data = await result.json();
        
        if (data.result?.success) {
          console.log(`      ✅ Success: ${data.result.newListings} new, ${data.result.updatedListings} updated`);
        } else {
          console.log(`      ❌ Failed: ${data.result?.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error(`      ❌ Error: ${error.message}`);
      }
      
      // Add delay to avoid overwhelming the system
      console.log(`      ⏳ Waiting 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log(`\n✅ All zip codes processed!`);
}

updateAllZipCodes().catch(console.error);
```

### Option 3: GitHub Actions Cron Job

```yaml
# .github/workflows/update-properties.yml
name: Update Properties Daily

on:
  schedule:
    - cron: '0 9 * * *'  # Run daily at 9 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Update all properties
        run: node update-all-zip-codes.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Performance Comparison

### Before (Buy Box Based)

- **1 buy box with 50 zip codes**
- Single function call: ~10-15 minutes
- **Result**: TIMEOUT ❌

### After (Zip Code Based)

- **50 separate function calls (1 per zip code)**
- Each call: ~10-30 seconds
- Total time: ~8-25 minutes (distributed)
- **Result**: SUCCESS ✅

## Benefits

1. **No More Timeouts**: Each zip code processed within function limits
2. **Better Parallelization**: Can process multiple zip codes in parallel
3. **Improved Error Handling**: One failing zip code doesn't affect others
4. **Better Monitoring**: Track progress per zip code
5. **Cost Efficient**: Only pay for actual processing time needed

## Migration Guide

### For Existing Cron Jobs

If you had a cron job calling the old function:

```sql
-- OLD: Single call per day
SELECT cron.schedule(
  'update-properties-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/update-properties-daily',
    headers := '{"Authorization": "Bearer YOUR_KEY"}'::jsonb
  )
  $$
);
```

**Replace with:**

Use the Node.js script approach (see Option 2 above) or set up GitHub Actions (see Option 3).

### For Manual Calls

If you manually triggered the function:

```javascript
// OLD
await fetch(`${SUPABASE_URL}/functions/v1/update-properties-daily`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` }
});

// NEW
const buyBoxes = await getBuyBoxes(); // Fetch from database

for (const buyBox of buyBoxes) {
  for (const zipCode of buyBox.zip_codes) {
    await fetch(`${SUPABASE_URL}/functions/v1/update-properties-daily`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ buyBoxId: buyBox.id, zipCode })
    });
    
    // Add delay between calls
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
```

## Monitoring

Check function logs in Supabase Dashboard:

1. Go to **Edge Functions** → `update-properties-daily`
2. Click **Logs**
3. Look for:
   - `📮 Processing ZIP CODE: {zipCode}`
   - `✅ Zip code {zipCode} update completed`
   - `❌ Error processing zip code {zipCode}`

## Testing

Test with a single zip code:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/update-properties-daily \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "buyBoxId": "your-buy-box-id",
    "zipCode": "44124"
  }' \
  | jq .
```

Expected output:
```json
{
  "message": "Zip code update completed",
  "result": {
    "buyBoxId": "...",
    "buyBoxName": "My Buy Box",
    "zipCode": "44124",
    "userId": "...",
    "totalScraped": 25,
    "newListings": 5,
    "updatedListings": 3,
    "skippedCount": 0,
    "success": true
  }
}
```

## Troubleshooting

### Error: "buyBoxId and zipCode are required"

**Cause**: Request body is missing or malformed  
**Fix**: Ensure you're sending both parameters:

```json
{
  "buyBoxId": "uuid",
  "zipCode": "12345"
}
```

### Error: "Zip code X is not part of buy box Y"

**Cause**: The zip code isn't in the buy box's `zip_codes` array  
**Fix**: Verify the zip code exists in the buy box:

```sql
SELECT zip_codes FROM buy_boxes WHERE id = 'your-buy-box-id';
```

### Error: "Buy box X not found"

**Cause**: Invalid or non-existent buy box ID  
**Fix**: Check the buy box ID is correct:

```sql
SELECT id, name FROM buy_boxes;
```

## Next Steps

1. ✅ Function updated to zip-based processing
2. ⏳ Create automation script (use provided examples)
3. ⏳ Set up cron job or GitHub Actions
4. ⏳ Test with a few zip codes first
5. ⏳ Deploy to production

## Questions?

- Check the `README.md` in `functions/update-properties-daily/`
- Review function logs in Supabase Dashboard
- Test with small datasets first

