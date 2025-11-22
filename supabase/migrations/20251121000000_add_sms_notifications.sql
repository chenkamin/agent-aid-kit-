-- Add sms_message_id to notifications table
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS sms_message_id UUID REFERENCES public.sms_messages(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_sms_message_id ON public.notifications(sms_message_id);

-- Update the notification type comment to include 'sms_received'
COMMENT ON COLUMN public.notifications.type IS 'Notification type: activity_due, property_notification, sms_received, system';

-- Create RLS policy to allow service role to create SMS notifications
-- This is needed because the webhook runs as service role, not as a user
CREATE POLICY "Service role can create SMS notifications"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (type = 'sms_received');

