# Daily Property Update Cron Job - Setup Complete ✅

## 🎉 Cron Job Successfully Created!

The daily property update cron job has been successfully configured and is now **ACTIVE**.

### ✅ What's Been Set Up:

1. **PostgreSQL Function**: `public.trigger_daily_property_update()`
   - Calls the `update-properties-daily` edge function
   - Logs execution to `cron_execution_log` table
   - Handles errors gracefully

2. **Cron Schedule**: 
   - **Job Name**: `daily-property-update`
   - **Schedule**: `0 20 * * *` (Every day at 20:00 UTC / 8:00 PM UTC)
   - **Status**: ✅ ACTIVE
   - **Database**: postgres
   - **Command**: `SELECT public.trigger_daily_property_update();`

3. **Monitoring View**: `public.active_cron_jobs`
   - Shows all active cron jobs
   - Displays execution history
   - Shows last execution status

## ⚠️ IMPORTANT: Final Configuration Step Required

The cron job needs the Supabase Service Role Key to call the edge function. You need to configure this **ONE TIME**:

### Step 1: Get Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ijgrelgzahireresdqvw
2. Navigate to **Settings** → **API**
3. Copy the **`service_role` key** (under "Project API keys" - it's the secret one)

### Step 2: Configure the Key in the Database

Run this SQL command in the Supabase SQL Editor (replace `YOUR_SERVICE_ROLE_KEY` with your actual key):

```sql
ALTER DATABASE postgres 
SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
```

**Example:**
```sql
ALTER DATABASE postgres 
SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlq...';
```

### Step 3: Verify the Configuration

After setting the key, verify it's configured:

```sql
SELECT current_setting('app.settings.service_role_key', true) IS NOT NULL as key_configured;
```

Should return `true`.

## 📊 Monitoring the Cron Job

### View Active Cron Jobs
```sql
SELECT * FROM public.active_cron_jobs;
```

### View Execution History
```sql
SELECT * 
FROM public.cron_execution_log 
WHERE job_name = 'daily-property-update'
ORDER BY executed_at DESC
LIMIT 10;
```

### Check Next Scheduled Run
```sql
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN schedule = '0 20 * * *' THEN 
      to_char(
        date_trunc('day', now() AT TIME ZONE 'UTC') + interval '20 hours' + 
        CASE WHEN extract(hour from now() AT TIME ZONE 'UTC') >= 20 
          THEN interval '1 day' 
          ELSE interval '0' 
        END,
        'YYYY-MM-DD HH24:MI:SS UTC'
      )
    ELSE 'N/A'
  END as next_run
FROM cron.job
WHERE jobname = 'daily-property-update';
```

## 🧪 Manual Testing

Test the cron job manually before waiting for 20:00 UTC:

```sql
-- Trigger the function manually
SELECT public.trigger_daily_property_update();

-- Check the logs
SELECT * 
FROM public.cron_execution_log 
WHERE job_name = 'daily-property-update'
ORDER BY executed_at DESC 
LIMIT 1;
```

## ⏰ Schedule Details

- **Cron Expression**: `0 20 * * *`
- **Frequency**: Once per day
- **Time**: 20:00 (8:00 PM) UTC
- **Timezone Conversion**:
  - **UTC**: 8:00 PM
  - **EST/EDT**: 3:00 PM / 4:00 PM
  - **PST/PDT**: 12:00 PM / 1:00 PM
  - **Israel (IST)**: 10:00 PM / 11:00 PM

### Change Schedule Time

If you want to change the time, update the cron schedule:

```sql
-- Example: Change to 2:00 AM UTC
SELECT cron.schedule(
  'daily-property-update',
  '0 2 * * *',
  $$SELECT public.trigger_daily_property_update();$$
);
```

## 🔧 Management Commands

### Pause the Cron Job
```sql
SELECT cron.unschedule('daily-property-update');
```

### Re-enable the Cron Job
```sql
SELECT cron.schedule(
  'daily-property-update',
  '0 20 * * *',
  $$SELECT public.trigger_daily_property_update();$$
);
```

### View All Cron Jobs
```sql
SELECT * FROM cron.job;
```

## 📝 How It Works

1. **At 20:00 UTC every day**, pg_cron triggers the scheduled job
2. The job calls `public.trigger_daily_property_update()` function
3. The function makes an HTTP POST request to the edge function:
   - URL: `https://ijgrelgzahireresdqvw.supabase.co/functions/v1/update-properties-daily`
   - Uses Service Role Key for authentication
4. The edge function:
   - Fetches all buy boxes from the database
   - Scrapes Zillow for each buy box
   - Updates existing properties
   - Inserts new properties
   - Records all changes to `property_changes` table
5. Execution is logged to `cron_execution_log` table

## 🐛 Troubleshooting

### Cron Job Not Running

1. **Check if job is active:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'daily-property-update';
   ```

2. **Check for errors:**
   ```sql
   SELECT * FROM cron_execution_log 
   WHERE job_name = 'daily-property-update' AND status = 'error'
   ORDER BY executed_at DESC;
   ```

3. **Verify service role key is set:**
   ```sql
   SELECT current_setting('app.settings.service_role_key', true) IS NOT NULL;
   ```

### Edge Function Errors

Check the edge function logs:
```bash
supabase functions logs update-properties-daily --tail
```

Or in Supabase Dashboard: **Edge Functions** → **update-properties-daily** → **Logs**

### No Properties Being Updated

1. Verify buy boxes exist and have valid criteria
2. Check Apify API quota hasn't been exceeded
3. Review edge function logs for scraping errors
4. Ensure `APIFY_API_TOKEN` environment variable is set

## 📈 What the Job Does

The daily update job:
- ✅ Scrapes Zillow for all active buy boxes
- ✅ Identifies new listings (marked with "NEW" badge)
- ✅ Tracks price changes
- ✅ Tracks status changes (For Sale → Under Contract, etc.)
- ✅ Updates `last_scraped_at` timestamp
- ✅ Logs all changes to `property_changes` table
- ✅ Processes all users' buy boxes automatically

## 🎯 Next Steps

1. **Set the service role key** (see instructions above) ⚠️ **REQUIRED**
2. Test manually using `SELECT public.trigger_daily_property_update();`
3. Wait for the first automatic run at 20:00 UTC
4. Monitor execution logs to ensure it's working
5. Adjust schedule time if needed for your timezone

---

## Quick Reference

**Project URL**: https://ijgrelgzahireresdqvw.supabase.co
**Cron Job Name**: `daily-property-update`
**Schedule**: Daily at 20:00 UTC
**Status**: ✅ ACTIVE (pending service role key configuration)



