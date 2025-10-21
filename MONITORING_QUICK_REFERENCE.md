# 🔍 One-at-a-Time Processing - Quick Monitoring Reference

## 📊 Current System Status (As of Oct 21, 2025)

| Metric | Value | Status |
|--------|-------|--------|
| **Total Buy Boxes** | 21 | ✅ Active |
| **Cron Frequency** | Every 15 minutes | ✅ Running |
| **Processing Rate** | 4 per hour / 96 per day | ✅ Optimal |
| **Full Refresh Time** | 5.3 hours | ✅ Excellent |
| **Never Scraped** | 3 buy boxes | 🔴 Will process first |
| **Stale (>24h)** | 18 buy boxes | 🟡 Being processed |
| **Fresh (<24h)** | 0 buy boxes | ⏳ Will improve |

---

## 🎯 Next 5 Buy Boxes in Queue

| Position | Buy Box Name | Last Scraped | Status |
|----------|--------------|--------------|--------|
| 1 | test | Never | 🔴 Never scraped |
| 2 | 44035, 44036 | Never | 🔴 Never scraped |
| 3 | 44129 44130 44134 | Never | 🔴 Never scraped |
| 4 | SOUTH EUCLID | Oct 19, 07:52 | 🟡 Stale |
| 5 | GARFIELD HEIGHTS | Oct 19, 07:54 | 🟡 Stale |

**Expected Processing**:
- Next 5 buy boxes will be processed in the next **1 hour 15 minutes**
- All 21 buy boxes will be refreshed within **5.3 hours**

---

## ⚡ Quick SQL Commands

### Check Cron Job Status
```sql
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'frequent-property-update';
```
**Expected**: `*/15 * * * *` and `active = true`

---

### View Processing Queue
```sql
SELECT 
  ROW_NUMBER() OVER (ORDER BY last_scraped_at NULLS FIRST) as position,
  name,
  CASE 
    WHEN last_scraped_at IS NULL THEN 'Never'
    ELSE to_char(last_scraped_at, 'Mon DD, HH24:MI')
  END as last_scraped,
  CASE 
    WHEN last_scraped_at IS NULL THEN '🔴 Never'
    WHEN last_scraped_at < NOW() - INTERVAL '24 hours' THEN '🟡 Stale'
    ELSE '🟢 Fresh'
  END as status
FROM buy_boxes
ORDER BY last_scraped_at NULLS FIRST
LIMIT 10;
```

---

### View Recent Cron Executions
```sql
SELECT 
  start_time,
  status,
  return_message,
  EXTRACT(EPOCH FROM (end_time - start_time))::integer as duration_seconds
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'frequent-property-update')
ORDER BY start_time DESC 
LIMIT 10;
```

---

### Count Buy Boxes by Status
```sql
SELECT 
  COUNT(*) FILTER (WHERE last_scraped_at IS NULL) as never_scraped,
  COUNT(*) FILTER (WHERE last_scraped_at < NOW() - INTERVAL '24 hours') as stale_24h,
  COUNT(*) FILTER (WHERE last_scraped_at >= NOW() - INTERVAL '24 hours') as fresh_24h,
  COUNT(*) as total
FROM buy_boxes;
```

---

### Find Which Buy Box Will Process Next
```sql
SELECT 
  id,
  name,
  user_id,
  last_scraped_at,
  CASE 
    WHEN last_scraped_at IS NULL THEN 'Never scraped - NEXT IN QUEUE'
    ELSE EXTRACT(EPOCH FROM (NOW() - last_scraped_at))/3600 || ' hours ago'
  END as status
FROM buy_boxes
ORDER BY last_scraped_at NULLS FIRST
LIMIT 1;
```

---

### Manually Trigger Update (For Testing)
```sql
SELECT public.trigger_daily_property_update();
```
⚠️ **Note**: This will process ONE buy box immediately (the next in queue)

---

### Check Edge Function Logs (CLI)
```bash
supabase functions logs update-properties-daily --tail
```

---

## 🎯 Health Thresholds

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| **Never Scraped** | 0 | 1-5 | >5 |
| **Stale >24h** | 0-21 | 22-50 | >50 |
| **Fresh <24h** | 21 | 10-20 | <10 |
| **Cron Job Active** | Yes | - | No |
| **Last Execution** | <15 min ago | 15-30 min | >30 min |

---

## 📈 Expected Timeline (Starting Now)

Assuming cron runs every 15 minutes starting now:

| Time from Now | Buy Boxes Processed | Milestone |
|---------------|---------------------|-----------|
| +15 minutes | 1 | First buy box (test) |
| +30 minutes | 2 | Second buy box (44035, 44036) |
| +45 minutes | 3 | Third buy box (44129 44130 44134) |
| +1 hour | 4 | All never-scraped processed |
| +2 hours | 8 | ~40% complete |
| +3 hours | 12 | ~60% complete |
| +4 hours | 16 | ~75% complete |
| +5 hours | 20 | ~95% complete |
| +5.3 hours | 21 | ✅ All buy boxes refreshed |

After the first cycle completes, the system will maintain a rolling refresh where each buy box is updated every ~5.3 hours.

---

## 🚨 Troubleshooting

### Problem: Cron job not running
```sql
-- Check if job exists and is active
SELECT * FROM cron.job WHERE jobname = 'frequent-property-update';

-- If missing, recreate it
SELECT cron.schedule(
  'frequent-property-update',
  '*/15 * * * *',
  $$SELECT public.trigger_daily_property_update();$$
);
```

---

### Problem: Buy boxes not updating
```sql
-- Check for recent executions
SELECT COUNT(*) as recent_runs
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'frequent-property-update')
AND start_time > NOW() - INTERVAL '1 hour';

-- If 0 results, cron may not be running
-- Check edge function logs for errors
```

---

### Problem: Specific buy box stuck
```sql
-- Reset a specific buy box to high priority
UPDATE buy_boxes 
SET last_scraped_at = NULL 
WHERE name = 'YOUR_BUY_BOX_NAME';

-- It will be processed on the next cron run
```

---

## 📞 Support

**Documentation**:
- Full guide: `ONE_AT_A_TIME_IMPLEMENTATION_COMPLETE.md`
- Original problem: `FIX_UPDATE_PROPERTIES_TIMEOUT.md`

**Edge Function Code**:
- `functions/update-properties-daily/index.ts` (lines 122-140)

**Database Migration**:
- `supabase/migrations/20251019000000_add_last_scraped_to_buy_boxes.sql`
- `supabase/migrations/20251021000000_update_cron_to_frequent_updates.sql`

---

**Last Updated**: October 21, 2025  
**Status**: 🟢 **FULLY OPERATIONAL**


