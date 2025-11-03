-- Create property_documentation table
CREATE TABLE public.property_documentation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    documentation_date date NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_documentation ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company members can view their property documentation"
ON public.property_documentation FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.company_id = property_documentation.company_id 
        AND team_members.user_id = auth.uid()
    )
);

CREATE POLICY "Company members can insert their property documentation"
ON public.property_documentation FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.company_id = property_documentation.company_id 
        AND team_members.user_id = auth.uid()
    )
);

CREATE POLICY "Company members can update their property documentation"
ON public.property_documentation FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.company_id = property_documentation.company_id 
        AND team_members.user_id = auth.uid()
    )
);

CREATE POLICY "Company members can delete their property documentation"
ON public.property_documentation FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.company_id = property_documentation.company_id 
        AND team_members.user_id = auth.uid()
    )
);

-- Indexes
CREATE INDEX idx_property_documentation_property_id ON public.property_documentation (property_id);
CREATE INDEX idx_property_documentation_company_id ON public.property_documentation (company_id);
CREATE INDEX idx_property_documentation_date ON public.property_documentation (documentation_date DESC);

COMMENT ON TABLE public.property_documentation IS 'Stores documentation entries for properties with free text content and dates.';

