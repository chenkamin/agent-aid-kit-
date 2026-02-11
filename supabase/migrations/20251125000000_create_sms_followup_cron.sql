-- Schedule hourly cron job to check and process SMS follow-up sequences
-- This migration creates a cron job that runs every hour to:
-- 1. Find active follow-up sequences that are due
-- 2. Send follow-up SMS messages
-- 3. Update sequence tracking state

-- First, ensure we have the required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule existing job if it exists (for idempotent migrations)
DO $$
BEGIN
  PERFORM cron.unschedule('check-sms-followups');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignore error if job doesn't exist
END
$$;

-- Create the cron job to run every hour
-- The job calls the check-sms-followups edge function
SELECT cron.schedule(
  'check-sms-followups',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/check-sms-followups',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Add comment explaining the job
COMMENT ON EXTENSION pg_cron IS 'Includes check-sms-followups job that runs hourly to process SMS follow-up sequences for properties that have not received replies.';

-- Create a helper function to manually trigger the check (useful for testing)
CREATE OR REPLACE FUNCTION public.trigger_sms_followup_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/check-sms-followups',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
END;
$$;

COMMENT ON FUNCTION public.trigger_sms_followup_check IS 'Manually trigger the SMS follow-up check. Useful for testing or immediate processing.';
