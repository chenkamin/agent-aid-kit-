-- Create sms_followup_sequences table to track SMS follow-up automation state
CREATE TABLE public.sms_followup_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Sequence state
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stopped')),
  stop_reason TEXT CHECK (stop_reason IN ('reply_received', 'max_attempts', 'max_days', 'workflow_changed', 'manual', NULL)),
  
  -- Tracking
  initial_sms_id UUID REFERENCES public.sms_messages(id) ON DELETE SET NULL,
  initial_sms_sent_at TIMESTAMPTZ NOT NULL,
  followup_count INTEGER NOT NULL DEFAULT 0,
  last_followup_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  current_step INTEGER NOT NULL DEFAULT 0,
  
  -- Configuration snapshot (from automation at time of creation)
  sequence_config JSONB NOT NULL,
  
  -- Workflow state at sequence start (to detect changes)
  initial_workflow_state TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_sms_followup_sequences_company_id ON public.sms_followup_sequences(company_id);
CREATE INDEX idx_sms_followup_sequences_automation_id ON public.sms_followup_sequences(automation_id);
CREATE INDEX idx_sms_followup_sequences_property_id ON public.sms_followup_sequences(property_id);
CREATE INDEX idx_sms_followup_sequences_status ON public.sms_followup_sequences(status);
CREATE INDEX idx_sms_followup_sequences_next_followup ON public.sms_followup_sequences(next_followup_at) 
  WHERE status = 'active';

-- Unique constraint to prevent duplicate active sequences for same property/automation
CREATE UNIQUE INDEX idx_sms_followup_sequences_active_unique 
  ON public.sms_followup_sequences(automation_id, property_id) 
  WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.sms_followup_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company members can view their sequences"
ON public.sms_followup_sequences FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.company_id = sms_followup_sequences.company_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can create sequences"
ON public.sms_followup_sequences FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.company_id = sms_followup_sequences.company_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can update their sequences"
ON public.sms_followup_sequences FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.company_id = sms_followup_sequences.company_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can delete their sequences"
ON public.sms_followup_sequences FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.company_id = sms_followup_sequences.company_id 
    AND team_members.user_id = auth.uid()
  )
);

-- Service role policy for edge functions
CREATE POLICY "Service role can manage all sequences"
ON public.sms_followup_sequences FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Update timestamp trigger
CREATE TRIGGER update_sms_followup_sequences_updated_at 
  BEFORE UPDATE ON public.sms_followup_sequences 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.sms_followup_sequences IS 'Tracks SMS follow-up automation sequences per property';
COMMENT ON COLUMN public.sms_followup_sequences.status IS 'Sequence status: active, completed (all steps done), stopped (stopped early)';
COMMENT ON COLUMN public.sms_followup_sequences.stop_reason IS 'Why the sequence was stopped: reply_received, max_attempts, max_days, workflow_changed, manual';
COMMENT ON COLUMN public.sms_followup_sequences.sequence_config IS 'Snapshot of automation config at sequence start: steps array, stop conditions';
COMMENT ON COLUMN public.sms_followup_sequences.current_step IS 'Current step index in the sequence (0-based)';
COMMENT ON COLUMN public.sms_followup_sequences.initial_workflow_state IS 'Property workflow state when sequence started, used to detect changes';
