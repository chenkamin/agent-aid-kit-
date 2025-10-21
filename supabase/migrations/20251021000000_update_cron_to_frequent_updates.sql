-- Update cron schedule to every 15 minutes for one-at-a-time buy box processing
-- This migration updates the existing 'frequent-property-update' cron job
-- from every 30 minutes to every 15 minutes

-- Note: If the job doesn't exist, this will create it
-- If it exists with a different schedule, unschedule and recreate

-- Unschedule existing job (if exists)
DO $$
BEGIN
  PERFORM cron.unschedule('frequent-property-update');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignore error if job doesn't exist
END
$$;

-- Create new frequent update schedule (every 15 minutes)
SELECT cron.schedule(
  'frequent-property-update',
  '*/15 * * * *',  -- Every 15 minutes (4 times per hour, 96 per day)
  $$SELECT public.trigger_daily_property_update();$$
);

-- Add comment explaining the strategy
COMMENT ON EXTENSION pg_cron IS 'Scheduled job runs every 15 minutes to process one buy box at a time, cycling through all buy boxes in round-robin fashion based on last_scraped_at timestamp. With this frequency: 4 buy boxes/hour, 96 buy boxes/day, all 100 buy boxes updated every ~25 hours.';

