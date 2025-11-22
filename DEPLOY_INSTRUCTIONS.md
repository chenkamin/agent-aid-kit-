# Deployment Instructions

## Changes to Deploy

### 1. Updated Edge Function
- **File**: `functions/update-properties-daily/index.ts`
- **Changes**:
  - ✅ Fixed duplicate property detection (checks by both URL and address)
  - ✅ Added HTML error handling for Apify responses
  - ✅ URL change tracking and updates

## Deployment Steps

### Step 1: Deploy the Edge Function

Run this command in your terminal:

```bash
npx supabase functions deploy update-properties-daily
```

Or if you have Supabase CLI installed globally:

```bash
supabase functions deploy update-properties-daily
```

**Expected Output:**
```
Deploying Functions...
    update-properties-daily (typescript) 
Deployed Functions in 2.3s
✅ update-properties-daily deployed successfully
```

### Step 2: Verify Deployment

Check that the function is deployed:

```bash
npx supabase functions list
```

You should see `update-properties-daily` in the list with status "Active".

### Step 3: Test the Function (Optional)

Trigger a test run to verify it works:

```bash
curl -X POST https://ijgrelgzahireresdqvw.supabase.co/functions/v1/update-properties-daily \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Step 4: Clean Up Existing Duplicates

After deployment, run the cleanup script to remove existing duplicates:

1. Open Supabase Dashboard → SQL Editor
2. Run the queries from `CLEANUP_DUPLICATE_PROPERTIES.sql`

**First, check for duplicates:**
```sql
SELECT 
  buy_box_id,
  address,
  city,
  COUNT(*) as duplicate_count
FROM properties
WHERE buy_box_id IS NOT NULL
GROUP BY buy_box_id, address, city
HAVING COUNT(*) > 1;
```

**Then delete duplicates (keeps most recent):**
```sql
DELETE FROM properties 
WHERE id IN (
  SELECT id 
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY buy_box_id, address, city 
        ORDER BY created_at DESC, id DESC
      ) as row_num
    FROM properties
    WHERE buy_box_id IS NOT NULL
      AND address <> ''
      AND city <> ''
  ) ranked
  WHERE row_num > 1
);
```

### Step 5: Monitor Next Cron Run

1. Go to Supabase Dashboard → Functions → update-properties-daily → Logs
2. Watch for the next cron job execution
3. Look for these log messages indicating the fix is working:
   - `📍 Found existing property by Address+City (URL changed!)`
   - `🔗 URL updated for property`
   - `✅ Updating URL to: ...`

### Step 6: Verify No New Duplicates

After a few cron runs, check again for duplicates:

```sql
SELECT 
  buy_box_id,
  address,
  city,
  COUNT(*) as count
FROM properties
WHERE buy_box_id IS NOT NULL
GROUP BY buy_box_id, address, city
HAVING COUNT(*) > 1;
```

Should return 0 rows! ✅

## Alternative: Deploy via Supabase Dashboard

If CLI doesn't work, you can deploy manually:

1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Find `update-properties-daily`
4. Click "Edit"
5. Copy the contents of `functions/update-properties-daily/index.ts`
6. Paste into the editor
7. Click "Deploy"

## Troubleshooting

### Command Not Found: supabase
Install the Supabase CLI:
```bash
npm install -g supabase
```

Or use npx (no installation needed):
```bash
npx supabase functions deploy update-properties-daily
```

### Authentication Error
Make sure you're logged in:
```bash
npx supabase login
```

### Deployment Fails
Check your `supabase/config.toml` has the correct project_id:
```toml
project_id = "ijgrelgzahireresdqvw"
```

## What Gets Deployed

Only the Edge Function files are deployed:
- ✅ `functions/update-properties-daily/index.ts`
- ❌ Not deployed: markdown files, SQL scripts (these are documentation only)

The SQL cleanup script needs to be run manually in Supabase SQL Editor.

## Rollback (If Needed)

If something goes wrong, the previous version is still available:

```bash
npx supabase functions download update-properties-daily --previous
npx supabase functions deploy update-properties-daily
```

## Summary

**Quick Commands:**
```bash
# 1. Deploy function
npx supabase functions deploy update-properties-daily

# 2. Verify
npx supabase functions list

# 3. Clean up duplicates (in Supabase SQL Editor)
# Run queries from CLEANUP_DUPLICATE_PROPERTIES.sql

# 4. Monitor logs
# Check Supabase Dashboard → Functions → Logs
```

That's it! The fix is now live. 🚀


