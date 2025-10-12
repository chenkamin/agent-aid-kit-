-- =====================================================
-- APPLY THIS SQL DIRECTLY IN SUPABASE SQL EDITOR
-- Navigation: Supabase Dashboard > SQL Editor > New Query
-- =====================================================

-- Step 1: Run the Team Collaboration Migration
-- Copy and paste this entire section, then click "Run"

-- =====================================================
-- COMPANIES AND TEAM MEMBERS IMPLEMENTATION
-- =====================================================

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(name)
);

-- Team members junction table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(company_id, user_id)
);

-- Team invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Add company_id to existing tables
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.buy_boxes 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.activities 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.email_templates 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add urgency to properties
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS urgency INTEGER DEFAULT 2 CHECK (urgency IN (1, 2, 3));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_company_id ON public.team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_company_id ON public.team_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_properties_company_id ON public.properties(company_id);
CREATE INDEX IF NOT EXISTS idx_buy_boxes_company_id ON public.buy_boxes(company_id);
CREATE INDEX IF NOT EXISTS idx_properties_urgency ON public.properties(urgency);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view their own buy_boxes" ON public.buy_boxes;
DROP POLICY IF EXISTS "Users can insert their own buy_boxes" ON public.buy_boxes;
DROP POLICY IF EXISTS "Users can update their own buy_boxes" ON public.buy_boxes;
DROP POLICY IF EXISTS "Users can delete their own buy_boxes" ON public.buy_boxes;

-- Create RLS policies for companies
CREATE POLICY "Users can view their companies"
  ON public.companies FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.company_id = companies.id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their companies"
  ON public.companies FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their companies"
  ON public.companies FOR DELETE
  USING (auth.uid() = owner_id);

-- Create RLS policies for team members
CREATE POLICY "Users can view team members of their companies"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.company_id = team_members.company_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can add team members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.company_id = team_members.company_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update team members"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.company_id = team_members.company_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete team members"
  ON public.team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.company_id = team_members.company_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Create RLS policies for team invitations
CREATE POLICY "Users can view invitations for their companies"
  ON public.team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.company_id = team_invitations.company_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by AND
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.company_id = team_invitations.company_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can accept invitations"
  ON public.team_invitations FOR UPDATE
  USING (true);

-- Update RLS policies for properties
CREATE POLICY "Users can view their company properties or own properties"
  ON public.properties FOR SELECT
  USING (
    user_id = auth.uid() OR
    (company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.company_id = properties.company_id
      AND team_members.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert properties"
  ON public.properties FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their company properties or own properties"
  ON public.properties FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.company_id = properties.company_id
      AND team_members.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete their company properties or own properties"
  ON public.properties FOR DELETE
  USING (
    user_id = auth.uid() OR
    (company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.company_id = properties.company_id
      AND team_members.user_id = auth.uid()
    ))
  );

-- Update RLS policies for buy boxes
CREATE POLICY "Users can view their company buy boxes or own buy boxes"
  ON public.buy_boxes FOR SELECT
  USING (
    user_id = auth.uid() OR
    (company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.company_id = buy_boxes.company_id
      AND team_members.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert buy boxes"
  ON public.buy_boxes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their company buy boxes or own buy boxes"
  ON public.buy_boxes FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.company_id = buy_boxes.company_id
      AND team_members.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete their company buy boxes or own buy boxes"
  ON public.buy_boxes FOR DELETE
  USING (
    user_id = auth.uid() OR
    (company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.company_id = buy_boxes.company_id
      AND team_members.user_id = auth.uid()
    ))
  );

-- Create helper functions
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT company_id 
  FROM public.team_members 
  WHERE user_id = user_uuid 
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  company_name TEXT,
  owner_uuid UUID
)
RETURNS UUID AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create company
  INSERT INTO public.companies (name, owner_id)
  VALUES (company_name, owner_uuid)
  RETURNING id INTO new_company_id;
  
  -- Add owner as team member with 'owner' role
  INSERT INTO public.team_members (company_id, user_id, role, accepted_at)
  VALUES (new_company_id, owner_uuid, 'owner', now());
  
  RETURN new_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auto_assign_company_id()
RETURNS TRIGGER AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Get user's company ID
  SELECT public.get_user_company_id(NEW.user_id) INTO user_company_id;
  
  -- If user has a company and company_id is not set, assign it
  IF user_company_id IS NOT NULL AND NEW.company_id IS NULL THEN
    NEW.company_id := user_company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS auto_assign_company_to_property ON public.properties;
CREATE TRIGGER auto_assign_company_to_property
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_company_id();

DROP TRIGGER IF EXISTS auto_assign_company_to_buy_box ON public.buy_boxes;
CREATE TRIGGER auto_assign_company_to_buy_box
  BEFORE INSERT ON public.buy_boxes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_company_id();

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create view
CREATE OR REPLACE VIEW public.team_members_with_emails AS
SELECT 
  tm.id,
  tm.created_at,
  tm.company_id,
  tm.user_id,
  tm.role,
  tm.invited_by,
  tm.invited_at,
  tm.accepted_at,
  c.name as company_name,
  p.email as user_email
FROM public.team_members tm
JOIN public.companies c ON tm.company_id = c.id
LEFT JOIN public.profiles p ON tm.user_id = p.id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.team_invitations TO authenticated;
GRANT SELECT ON public.team_members_with_emails TO authenticated;

-- SUCCESS! Your database is now ready for team collaboration

