-- Create automations table
CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Automation details
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Canvas data (stores the React Flow graph)
  flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}'::jsonb,
  
  -- Execution stats
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create automation_logs table
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Execution details
  trigger_type TEXT NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  
  -- Result
  status TEXT NOT NULL, -- 'success', 'error', 'skipped'
  actions_executed JSONB,
  error_message TEXT,
  
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_automations_company_id ON public.automations(company_id);
CREATE INDEX idx_automations_active ON public.automations(is_active);
CREATE INDEX idx_automation_logs_automation_id ON public.automation_logs(automation_id);
CREATE INDEX idx_automation_logs_executed_at ON public.automation_logs(executed_at DESC);
CREATE INDEX idx_automation_logs_company_id ON public.automation_logs(company_id);

-- Enable RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automations
CREATE POLICY "Company members can view automations"
ON public.automations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.company_id = automations.company_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can create automations"
ON public.automations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.company_id = automations.company_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can update automations"
ON public.automations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.company_id = automations.company_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can delete automations"
ON public.automations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.company_id = automations.company_id 
    AND team_members.user_id = auth.uid()
  )
);

-- RLS Policies for automation_logs
CREATE POLICY "Company members can view automation logs"
ON public.automation_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.company_id = automation_logs.company_id 
    AND team_members.user_id = auth.uid()
  )
);

-- Update timestamp trigger
CREATE TRIGGER update_automations_updated_at 
  BEFORE UPDATE ON public.automations 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.automations IS 'Visual workflow automations for property management';
COMMENT ON TABLE public.automation_logs IS 'Execution logs for automations';
COMMENT ON COLUMN public.automations.flow_data IS 'React Flow graph data (nodes, edges, viewport)';
COMMENT ON COLUMN public.automations.is_active IS 'Whether the automation is currently active';

