-- =====================================================
-- ZIP CODE QUEUE MONITORING QUERIES
-- =====================================================
-- Use these queries to monitor the zip code queue status
-- and track property update progress

-- =====================================================
-- 1. QUEUE OVERVIEW
-- =====================================================
-- Shows overall progress across all buy boxes
SELECT 
  COUNT(*) AS total_zip_codes,
  COUNT(*) FILTER (WHERE last_updated_at IS NULL) AS never_processed,
  COUNT(*) FILTER (WHERE last_status = 'pending') AS currently_processing,
  COUNT(*) FILTER (WHERE last_status = 'success') AS successful,
  COUNT(*) FILTER (WHERE last_status = 'failed') AS failed,
  MAX(last_updated_at) AS most_recent_update,
  MIN(last_updated_at) FILTER (WHERE last_updated_at IS NOT NULL) AS oldest_update
FROM zip_code_queue;

-- =====================================================
-- 2. QUEUE STATUS BY BUY BOX
-- =====================================================
-- Shows progress for each buy box
SELECT 
  bb.name AS buy_box_name,
  bb.id AS buy_box_id,
  COUNT(*) AS total_zips,
  COUNT(*) FILTER (WHERE zq.last_updated_at IS NULL) AS pending,
  COUNT(*) FILTER (WHERE zq.last_status = 'pending') AS in_progress,
  COUNT(*) FILTER (WHERE zq.last_status = 'success') AS success,
  COUNT(*) FILTER (WHERE zq.last_status = 'failed') AS failed,
  SUM(zq.properties_added) AS total_properties_added,
  SUM(zq.properties_updated) AS total_properties_updated,
  MAX(zq.last_updated_at) AS last_run,
  ROUND(
    COUNT(*) FILTER (WHERE zq.last_status = 'success')::NUMERIC / 
    NULLIF(COUNT(*) FILTER (WHERE zq.last_updated_at IS NOT NULL), 0) * 100,
    1
  ) AS success_rate_pct
FROM zip_code_queue zq
JOIN buy_boxes bb ON zq.buy_box_id = bb.id
GROUP BY bb.name, bb.id
ORDER BY bb.name;

-- =====================================================
-- 3. NEXT ZIP CODE TO PROCESS
-- =====================================================
-- Shows which zip code will be processed next
SELECT 
  bb.name AS buy_box_name,
  zq.zip_code,
  zq.last_updated_at,
  zq.last_status,
  CASE 
    WHEN zq.last_updated_at IS NULL THEN 'Never processed'
    ELSE 'Last processed ' || 
         EXTRACT(EPOCH FROM (NOW() - zq.last_updated_at))/3600 || ' hours ago'
  END AS status_info
FROM zip_code_queue zq
JOIN buy_boxes bb ON zq.buy_box_id = bb.id
ORDER BY zq.last_updated_at NULLS FIRST
LIMIT 1;

-- =====================================================
-- 4. FAILED ZIP CODES
-- =====================================================
-- Shows all zip codes that failed processing
SELECT 
  bb.name AS buy_box_name,
  zq.zip_code,
  zq.last_error,
  zq.last_updated_at,
  zq.updated_at,
  EXTRACT(EPOCH FROM (NOW() - zq.last_updated_at))/3600 AS hours_since_failure
FROM zip_code_queue zq
JOIN buy_boxes bb ON zq.buy_box_id = bb.id
WHERE zq.last_status = 'failed'
ORDER BY zq.last_updated_at DESC;

-- =====================================================
-- 5. TOP PERFORMING ZIP CODES
-- =====================================================
-- Shows zip codes with most properties found
SELECT 
  bb.name AS buy_box_name,
  zq.zip_code,
  zq.properties_found,
  zq.properties_added,
  zq.properties_updated,
  zq.last_updated_at
FROM zip_code_queue zq
JOIN buy_boxes bb ON zq.buy_box_id = bb.id
WHERE zq.properties_found > 0
ORDER BY zq.properties_found DESC
LIMIT 20;

-- =====================================================
-- 6. STALE ZIP CODES (Not Processed Recently)
-- =====================================================
-- Shows zip codes that haven't been processed in over 24 hours
SELECT 
  bb.name AS buy_box_name,
  zq.zip_code,
  zq.last_status,
  zq.last_updated_at,
  EXTRACT(EPOCH FROM (NOW() - zq.last_updated_at))/3600 AS hours_since_update
FROM zip_code_queue zq
JOIN buy_boxes bb ON zq.buy_box_id = bb.id
WHERE zq.last_updated_at < NOW() - INTERVAL '24 hours'
  OR zq.last_updated_at IS NULL
ORDER BY zq.last_updated_at NULLS FIRST
LIMIT 50;

-- =====================================================
-- 7. PROCESSING TIME ANALYSIS
-- =====================================================
-- Shows when zip codes were last processed (timeline view)
SELECT 
  DATE_TRUNC('hour', zq.last_updated_at) AS hour,
  COUNT(*) AS zip_codes_processed,
  COUNT(*) FILTER (WHERE zq.last_status = 'success') AS successful,
  COUNT(*) FILTER (WHERE zq.last_status = 'failed') AS failed,
  SUM(zq.properties_added) AS total_properties_added
FROM zip_code_queue zq
WHERE zq.last_updated_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', zq.last_updated_at)
ORDER BY hour DESC;

-- =====================================================
-- 8. DETAILED STATUS FOR SPECIFIC BUY BOX
-- =====================================================
-- Replace 'Your Buy Box Name' with the actual buy box name
SELECT 
  zq.zip_code,
  zq.last_status,
  zq.last_updated_at,
  zq.properties_found,
  zq.properties_added,
  zq.properties_updated,
  zq.last_error,
  CASE 
    WHEN zq.last_updated_at IS NULL THEN 'Pending'
    ELSE EXTRACT(EPOCH FROM (NOW() - zq.last_updated_at))/3600 || ' hours ago'
  END AS time_since_update
FROM zip_code_queue zq
JOIN buy_boxes bb ON zq.buy_box_id = bb.id
WHERE bb.name = 'Your Buy Box Name'
ORDER BY zq.last_updated_at NULLS FIRST;

-- =====================================================
-- 9. RESET FAILED ZIP CODES (RETRY)
-- =====================================================
-- Use this to retry all failed zip codes
-- UNCOMMENT TO USE (be careful!)
/*
UPDATE zip_code_queue
SET 
  last_status = NULL,
  last_error = NULL,
  last_updated_at = NULL
WHERE last_status = 'failed';
*/

-- =====================================================
-- 10. RESET SPECIFIC ZIP CODE (RETRY ONE)
-- =====================================================
-- Use this to retry a specific zip code
-- Replace '44124' with actual zip code
/*
UPDATE zip_code_queue
SET 
  last_status = NULL,
  last_error = NULL,
  last_updated_at = NULL
WHERE zip_code = '44124'
  AND buy_box_id = (SELECT id FROM buy_boxes WHERE name = 'Your Buy Box Name');
*/

-- =====================================================
-- 11. CLEAR ALL QUEUE STATUS (FRESH START)
-- =====================================================
-- DANGEROUS: This resets ALL zip codes to unprocessed state
-- UNCOMMENT TO USE (be very careful!)
/*
UPDATE zip_code_queue
SET 
  last_status = NULL,
  last_error = NULL,
  last_updated_at = NULL,
  properties_found = 0,
  properties_added = 0,
  properties_updated = 0;
*/

-- =====================================================
-- 12. QUEUE HEALTH CHECK
-- =====================================================
-- Quick health check of the queue
SELECT 
  'Total Zip Codes' AS metric,
  COUNT(*)::TEXT AS value
FROM zip_code_queue
UNION ALL
SELECT 
  'Pending (Never Processed)' AS metric,
  COUNT(*)::TEXT AS value
FROM zip_code_queue
WHERE last_updated_at IS NULL
UNION ALL
SELECT 
  'Failed' AS metric,
  COUNT(*)::TEXT AS value
FROM zip_code_queue
WHERE last_status = 'failed'
UNION ALL
SELECT 
  'Success Rate' AS metric,
  ROUND(
    COUNT(*) FILTER (WHERE last_status = 'success')::NUMERIC / 
    NULLIF(COUNT(*) FILTER (WHERE last_updated_at IS NOT NULL), 0) * 100,
    1
  )::TEXT || '%' AS value
FROM zip_code_queue
UNION ALL
SELECT 
  'Avg Properties Per Zip' AS metric,
  ROUND(AVG(properties_found), 1)::TEXT AS value
FROM zip_code_queue
WHERE properties_found > 0;

-- =====================================================
-- 13. CHECK IF CRON IS RUNNING
-- =====================================================
-- Shows recent successful completions (indicates cron is working)
SELECT 
  bb.name AS buy_box_name,
  zq.zip_code,
  zq.last_updated_at,
  zq.properties_added,
  EXTRACT(EPOCH FROM (NOW() - zq.last_updated_at))/60 AS minutes_ago
FROM zip_code_queue zq
JOIN buy_boxes bb ON zq.buy_box_id = bb.id
WHERE zq.last_status = 'success'
  AND zq.last_updated_at > NOW() - INTERVAL '1 hour'
ORDER BY zq.last_updated_at DESC
LIMIT 10;

