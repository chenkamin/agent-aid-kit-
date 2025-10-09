# Daily Property Updates System

## Overview
This system automatically scrapes Zillow daily at 20:00 (8 PM) server time to keep property data fresh. It updates existing properties and discovers new listings for all users' buy boxes (property lists).

## Features

### 1. **Automatic Daily Scraping**
- Runs every day at 20:00 (8 PM) via PostgreSQL cron job
- Processes all active buy boxes across all users
- Uses Apify's Zillow scraper for reliable data collection

### 2. **Delta Detection**
- **New Listings**: Automatically identifies properties that weren't in the database before
- **Existing Properties**: Tracks properties already in the system for updates
- Properties are matched by their `listing_url` (Zillow URL)

### 3. **Change Tracking**
The system monitors and logs two critical fields:
- **Price Changes**: When a property's price changes up or down
- **Status Changes**: When a property moves between states (For Sale, Under Contract, etc.)

All changes are logged to the `property_changes` table with:
- Property ID and User ID
- Field that changed (price or status)
- Old value and new value
- Timestamp of change

### 4. **Visual Indicators**
- **NEW Badge**: Green badge appears on newly discovered listings in the UI
- Properties track when they were first discovered via `listing_discovered_at` timestamp
- `last_scraped_at` field shows when a property was last verified

## Database Schema

### New Tables

#### `property_changes`
Tracks all historical changes to property data:
```sql
CREATE TABLE property_changes (
  id uuid PRIMARY KEY,
  property_id uuid REFERENCES properties(id),
  user_id uuid REFERENCES auth.users(id),
  field_changed text NOT NULL,  -- 'price' or 'status'
  old_value text,
  new_value text,
  changed_at timestamptz DEFAULT now()
);
```

#### `cron_execution_log`
Logs cron job executions for monitoring:
```sql
CREATE TABLE cron_execution_log (
  id uuid PRIMARY KEY,
  job_name text NOT NULL,
  executed_at timestamptz DEFAULT now(),
  status text,
  details jsonb
);
```

### Updated Fields in `properties` table
- `last_scraped_at`: Last time the property was verified via scraping
- `is_new_listing`: Boolean flag for newly discovered properties
- `listing_discovered_at`: When the listing was first found

## Edge Function: `update-properties-daily`

### Purpose
Main worker function that:
1. Fetches all buy boxes from the database
2. Scrapes Zillow for each buy box's criteria
3. Compares scraped data with existing properties
4. Updates changed properties and records changes
5. Inserts new listings with the `is_new_listing` flag

### Key Logic

#### New Listing Detection
```typescript
const existingPropsMap = new Map(
  existingProperties.map(p => [p.listing_url, p])
);

for (const scrapedProp of scrapedProperties) {
  const listingUrl = scrapedProp.detailUrl;
  const existingProp = existingPropsMap.get(listingUrl);
  
  if (!existingProp) {
    // NEW LISTING - insert with is_new_listing = true
    newListings.push({
      ...propertyData,
      is_new_listing: true,
      listing_discovered_at: new Date().toISOString()
    });
  }
}
```

#### Change Detection
```typescript
if (existingProp) {
  const changes = [];
  
  if (existingProp.price !== scrapedPrice) {
    changes.push({
      field: 'price',
      oldValue: String(existingProp.price),
      newValue: String(scrapedPrice)
    });
  }
  
  if (existingProp.status !== scrapedStatus) {
    changes.push({
      field: 'status',
      oldValue: existingProp.status,
      newValue: scrapedStatus
    });
  }
  
  // Record changes to property_changes table
  if (changes.length > 0) {
    await recordPropertyChanges(supabase, changes);
    // Update the property with new values
    await supabase.from('properties').update({
      price: scrapedPrice,
      status: scrapedStatus,
      last_scraped_at: new Date()
    }).eq('id', existingProp.id);
  }
}
```

### Response Format
```json
{
  "message": "Daily update completed",
  "processedBuyBoxes": 5,
  "results": [
    {
      "buyBoxId": "uuid",
      "buyBoxName": "Cleveland Deals",
      "userId": "uuid",
      "totalScraped": 42,
      "newListings": 5,
      "updatedListings": 3,
      "success": true
    }
  ]
}
```

## Cron Job Setup

### PostgreSQL Function
```sql
CREATE FUNCTION trigger_daily_property_update()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/update-properties-daily',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) INTO request_id;
END;
$$;
```

### Cron Schedule
```sql
SELECT cron.schedule(
  'daily-property-update',
  '0 20 * * *',  -- Daily at 8 PM
  $$SELECT public.trigger_daily_property_update();$$
);
```

## Configuration

### Required Environment Variables
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `APIFY_API_TOKEN`: Apify API token for Zillow scraping

### Supabase Secrets Setup
Set these in your Supabase project settings:
```sql
-- Set in Supabase dashboard or via SQL:
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
```

## Monitoring

### Check Cron Job Status
```sql
-- View scheduled jobs
SELECT * FROM cron.job WHERE jobname = 'daily-property-update';

-- View execution history (last 10)
SELECT * FROM cron_execution_log 
ORDER BY executed_at DESC 
LIMIT 10;
```

### View Recent Property Changes
```sql
-- Price changes in the last 24 hours
SELECT 
  pc.*,
  p.address,
  p.city,
  p.state
FROM property_changes pc
JOIN properties p ON pc.property_id = p.id
WHERE pc.field_changed = 'price'
  AND pc.changed_at > NOW() - INTERVAL '24 hours'
ORDER BY pc.changed_at DESC;

-- New listings discovered today
SELECT *
FROM properties
WHERE listing_discovered_at::date = CURRENT_DATE
  AND is_new_listing = TRUE;
```

### Edge Function Logs
Check logs in Supabase Dashboard:
- Go to Edge Functions → `update-properties-daily` → Logs
- Look for emoji indicators:
  - 🔄 Starting daily update
  - 📦 Processing buy boxes
  - 🏠 Processing individual buy box
  - ✅ Found properties from Zillow
  - 🆕 Added new listings
  - 📊 Updated properties
  - ✅ Job completed

## User Experience

### In the Properties Page

1. **New Listing Badge**
   - Green "NEW" badge appears next to property address
   - Indicates listings discovered in the last scrape
   - Helps users quickly identify fresh opportunities

2. **Filters**
   - Can filter by list to see specific buy box results
   - Can filter by status, price, bedrooms, etc.
   - Shows count of filtered vs total properties

3. **Property Details Modal**
   - View full property information in tabs
   - See last scraped timestamp
   - Access change history (future feature)

## Future Enhancements

### Potential Additions
1. **Change History Tab**: View all historical price/status changes for a property
2. **Email Notifications**: Alert users about new listings or price drops
3. **Custom Schedules**: Allow users to set their preferred update time
4. **Timezone Support**: Run updates at 20:00 in each user's local timezone
5. **Gone Listings**: Track when properties disappear from Zillow
6. **Price Drop Alerts**: Highlight properties with significant price reductions
7. **Status Change Notifications**: Alert on Under Contract → For Sale changes
8. **Bulk Actions**: Mark multiple new listings as reviewed/not interested

## Troubleshooting

### Job Not Running
1. Check if pg_cron extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Verify the cron schedule: `SELECT * FROM cron.job;`
3. Check database settings for secrets: `SHOW app.settings.supabase_url;`

### No New Properties Found
1. Check Apify API quota/limits
2. Verify buy box search criteria (zip codes, price ranges)
3. Check Edge Function logs for Apify errors
4. Confirm APIFY_API_TOKEN is valid

### Properties Not Updating
1. Verify `listing_url` matching is correct
2. Check property_changes table for logged updates
3. Review Edge Function logs for parse errors
4. Ensure price/status data is being correctly extracted from Apify response

## API Reference

### Manual Trigger (for testing)
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/update-properties-daily \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Expected Response
```json
{
  "message": "Daily update completed",
  "processedBuyBoxes": 3,
  "results": [...]
}
```

## Performance Considerations

- **Execution Time**: Approximately 5-10 seconds per buy box (Apify polling)
- **Rate Limits**: Respects Apify rate limits with polling delays
- **Database Load**: Batch inserts/updates minimize connection overhead
- **Scalability**: Can handle hundreds of buy boxes per run
- **Timeout**: Edge Function has 60-attempt limit (5 minutes) per Apify run

## Security

- Service role key only accessible via Supabase secrets (not in code)
- Row Level Security (RLS) policies prevent cross-user data access
- Cron function runs with SECURITY DEFINER (admin privileges)
- All property data isolated by `user_id`
- Edge Function validates user authentication before operations

