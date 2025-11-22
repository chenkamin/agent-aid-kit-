# Queue-Based Property Update System

## Overview

The property update system has been refactored to use a **queue-based architecture** where each zip code is tracked in a dedicated `zip_code_queue` table. This eliminates the need for external orchestration and makes the system self-managing.

## Architecture

### Before (Parameter-Based) ❌
- Function required `buyBoxId` and `zipCode` parameters
- External scripts needed to orchestrate calls
- Complex state management
- No built-in retry mechanism

### After (Queue-Based) ✅
- Function automatically selects next zip code from queue
- No parameters needed
- Database manages all state
- Built-in retry mechanism (failed zips can be retried)
- Self-healing system

## Database Schema

### `zip_code_queue` Table

```sql
CREATE TABLE zip_code_queue (
  id UUID PRIMARY KEY,
  buy_box_id UUID REFERENCES buy_boxes(id),
  zip_code TEXT NOT NULL,
  
  -- Status tracking
  last_updated_at TIMESTAMPTZ,      -- When last processed
  last_status TEXT,                 -- 'success', 'failed', 'pending', NULL
  last_error TEXT,                  -- Error message if failed
  
  -- Statistics
  properties_found INTEGER,         -- Total properties scraped
  properties_added INTEGER,          -- New properties inserted
  properties_updated INTEGER,        -- Existing properties updated
  
  -- Metadata
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(buy_box_id, zip_code)
);
```

### Key Indexes

- `idx_zip_code_queue_next`: Optimizes "next zip code" selection (most important)
- `idx_zip_code_queue_buy_box`: Fast buy box queries
- `idx_zip_code_queue_status`: Filter by status

## How It Works

### 1. Queue Population (Automatic)

When a buy box is created or updated:
- Trigger `sync_zip_code_queue_trigger` fires
- New zip codes are inserted into queue
- Removed zip codes are deleted
- Existing zip codes remain unchanged

```sql
-- Trigger handles this automatically
INSERT OR UPDATE buy_boxes SET zip_codes = ARRAY['44124', '44125', '44126'];
-- → Queue automatically updated
```

### 2. Function Execution (Self-Managing)

```
┌──────────────────────────────────────────┐
│   Call function (no parameters!)        │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  SELECT next zip from queue              │
│  (ORDER BY last_updated_at NULLS FIRST)  │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Mark as 'pending' immediately           │
│  (prevents race conditions)              │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Process the zip code (scrape)           │
└──────────┬───────────────────────────────┘
           │
           ▼
      ┌────┴────┐
      │         │
   SUCCESS   FAILURE
      │         │
      ▼         ▼
┌──────────┐ ┌──────────────┐
│ Update:  │ │ Update:      │
│ status=  │ │ status=      │
│ 'success'│ │ 'failed'     │
│          │ │ last_error=  │
│ stats    │ │ error msg    │
└──────────┘ └──────────────┘
```

### 3. Priority Logic

Zip codes are processed in this order:

1. **Never processed** (`last_updated_at IS NULL`)
2. **Oldest processed** (earliest `last_updated_at`)

This ensures:
- New zip codes get processed first
- All zip codes eventually get updated
- Round-robin distribution across all zip codes

## Setup

### 1. Database (Already Done)

```bash
# Migrations were already applied:
# - create_zip_code_queue_table
# - create_zip_code_queue_sync_trigger
```

### 2. Simple Cron Job

**Just call the function every 5 minutes with NO parameters:**

```sql
-- Supabase pg_cron
SELECT cron.schedule(
  'update-properties-queue',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/update-properties-daily',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**OR use GitHub Actions:**

```yaml
name: Update Properties
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/update-properties-daily \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_KEY }}"
```

That's it! No scripts, no parameters, no complexity.

## Monitoring

### Quick Status Check

```sql
-- Run this in Supabase SQL Editor
SELECT * FROM monitoring_queries.sql; -- See Query #1
```

### Check Progress by Buy Box

```sql
SELECT 
  bb.name,
  COUNT(*) AS total_zips,
  COUNT(*) FILTER (WHERE zq.last_updated_at IS NULL) AS pending,
  COUNT(*) FILTER (WHERE zq.last_status = 'success') AS success,
  COUNT(*) FILTER (WHERE zq.last_status = 'failed') AS failed
FROM zip_code_queue zq
JOIN buy_boxes bb ON zq.buy_box_id = bb.id
GROUP BY bb.name;
```

### View Failed Zip Codes

```sql
SELECT 
  bb.name,
  zq.zip_code,
  zq.last_error,
  zq.last_updated_at
FROM zip_code_queue zq
JOIN buy_boxes bb ON zq.buy_box_id = bb.id
WHERE zq.last_status = 'failed';
```

See `sql/monitoring-queries.sql` for **13 comprehensive monitoring queries**.

## Error Handling & Retries

### Automatic Retry

Failed zip codes stay in the queue with `last_status = 'failed'`. They can be retried:

```sql
-- Retry all failed zip codes
UPDATE zip_code_queue
SET 
  last_status = NULL,
  last_error = NULL,
  last_updated_at = NULL
WHERE last_status = 'failed';
```

### Retry Specific Zip Code

```sql
UPDATE zip_code_queue
SET 
  last_status = NULL,
  last_error = NULL
WHERE zip_code = '44124'
  AND buy_box_id = (SELECT id FROM buy_boxes WHERE name = 'My Buy Box');
```

### Fresh Start (Reset All)

```sql
-- DANGEROUS: Resets everything
UPDATE zip_code_queue
SET 
  last_status = NULL,
  last_error = NULL,
  last_updated_at = NULL,
  properties_found = 0,
  properties_added = 0,
  properties_updated = 0;
```

## Function Response

### Success

```json
{
  "message": "Zip code update completed",
  "result": {
    "queueId": "uuid",
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

### No More Zip Codes

```json
{
  "message": "No zip codes pending",
  "queueEmpty": true
}
```

### Failure

```json
{
  "message": "Zip code update failed",
  "result": {
    "queueId": "uuid",
    "zipCode": "44124",
    "error": "Error message",
    "success": false
  }
}
```

## Benefits

✅ **No External Orchestration**: Function manages itself  
✅ **Simple Cron**: Just call periodically, no parameters  
✅ **Database-Driven**: All state in one place  
✅ **Built-in Retry**: Failed zips can be easily retried  
✅ **Historical Tracking**: See when each zip was processed  
✅ **Statistics**: Track properties found/added/updated per zip  
✅ **Race Condition Safe**: Atomic selection and status updates  
✅ **Auto-Sync**: Queue updates when buy boxes change  
✅ **Visibility**: Query database for real-time progress  
✅ **Self-Healing**: Automatically processes all zips round-robin  

## Performance

With a 5-minute cron interval:

- **1 buy box, 50 zips**: Complete cycle in ~4 hours (50 × 5min)
- **10 buy boxes, 20 zips each**: Complete cycle in ~16 hours (200 × 5min)
- **After first cycle**: Each zip updated every 4-16 hours (round-robin)

Adjust cron frequency as needed:
- `*/5 * * * *` = Every 5 minutes (recommended)
- `*/10 * * * *` = Every 10 minutes (slower)
- `*/2 * * * *` = Every 2 minutes (faster, more aggressive)

## Testing

### Manual Test

```bash
curl -X POST https://your-project.supabase.co/functions/v1/update-properties-daily \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

This will:
1. Select the next zip code from queue
2. Process it
3. Update queue with results

Call it multiple times to process multiple zip codes.

### Check What's Next

```sql
SELECT 
  bb.name,
  zq.zip_code,
  zq.last_updated_at
FROM zip_code_queue zq
JOIN buy_boxes bb ON zq.buy_box_id = bb.id
ORDER BY zq.last_updated_at NULLS FIRST
LIMIT 1;
```

## Troubleshooting

### No zip codes being processed

1. Check queue has entries:
   ```sql
   SELECT COUNT(*) FROM zip_code_queue;
   ```

2. Check cron is running:
   ```sql
   -- See monitoring-queries.sql Query #13
   ```

3. Check for errors:
   ```sql
   SELECT * FROM zip_code_queue WHERE last_status = 'failed';
   ```

### All zip codes showing 'pending'

The function might be stuck. Check Edge Function logs in Supabase Dashboard.

Reset stuck zip codes:
```sql
UPDATE zip_code_queue
SET last_status = NULL
WHERE last_status = 'pending'
  AND updated_at < NOW() - INTERVAL '30 minutes';
```

### Want to prioritize specific buy box

```sql
-- Reset specific buy box to process next
UPDATE zip_code_queue
SET last_updated_at = NULL
WHERE buy_box_id = (SELECT id FROM buy_boxes WHERE name = 'Priority Buy Box');
```

## Migration from Old System

If you had the old parameter-based system:

1. ✅ Database migrated (already done)
2. ✅ Function updated (already done)
3. ⏳ Update cron job (remove parameters)
4. ⏳ Remove old scripts (optional)

### Old Cron (REMOVE)

```sql
-- OLD - Don't use this anymore
SELECT process_all_zip_codes(); -- This is gone
```

### New Cron (USE THIS)

```sql
-- NEW - Simple!
SELECT net.http_post(
  url := 'https://your-project.supabase.co/functions/v1/update-properties-daily',
  headers := '{"Authorization": "Bearer KEY"}'::jsonb
);
```

## Next Steps

1. ✅ Database setup (DONE)
2. ✅ Function deployed (IN PROGRESS)
3. ⏳ Setup cron job (5-minute interval)
4. ⏳ Monitor first few runs
5. ⏳ Adjust cron frequency if needed

## Questions?

Check:
- Function logs: Supabase Dashboard → Edge Functions → update-properties-daily
- Queue status: Run queries from `sql/monitoring-queries.sql`
- This README for common troubleshooting

