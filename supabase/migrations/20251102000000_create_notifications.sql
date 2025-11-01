-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Who receives the notification
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL, -- 'activity_due', 'property_notification', 'system'
  
  -- Related entities
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  
  -- Sender (for team notifications)
  sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Extra data
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications for team members in their company"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm1
      WHERE tm1.user_id = auth.uid()
      AND tm1.company_id = company_id
    )
  );

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_property_id ON public.notifications(property_id);
CREATE INDEX idx_notifications_activity_id ON public.notifications(activity_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Update timestamp trigger
CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON public.notifications 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create activity due notifications
CREATE OR REPLACE FUNCTION create_activity_due_notifications()
RETURNS void AS $$
BEGIN
  -- Create notifications for activities due today that don't already have notifications
  INSERT INTO public.notifications (user_id, company_id, title, message, type, property_id, activity_id)
  SELECT 
    COALESCE(a.assigned_to, a.user_id) as user_id,
    a.company_id,
    'Activity Due Today: ' || a.title as title,
    'You have an activity due today' || CASE WHEN p.address IS NOT NULL THEN ' for property: ' || p.address ELSE '' END as message,
    'activity_due' as type,
    a.property_id,
    a.id as activity_id
  FROM public.activities a
  LEFT JOIN public.properties p ON p.id = a.property_id
  WHERE a.due_at::date = CURRENT_DATE
    AND a.status = 'open'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n 
      WHERE n.activity_id = a.id 
      AND n.type = 'activity_due'
      AND n.created_at::date = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_activity_due_notifications() TO authenticated;

COMMENT ON TABLE public.notifications IS 'User notifications for activities and property updates';
COMMENT ON FUNCTION create_activity_due_notifications() IS 'Creates notifications for activities due today';

