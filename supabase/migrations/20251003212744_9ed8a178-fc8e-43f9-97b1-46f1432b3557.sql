-- Create enum types
CREATE TYPE public.property_status AS ENUM ('For Sale', 'Under Contract', 'Sold', 'Off Market', 'Pending');
CREATE TYPE public.home_type AS ENUM ('Single Family', 'Multi Family', 'Condo', 'Townhouse', 'Land', 'Commercial', 'Other');
CREATE TYPE public.contact_type AS ENUM ('Agent', 'Seller', 'Buyer', 'Contractor', 'Wholesaler', 'Lender', 'Inspector', 'Title', 'Other');
CREATE TYPE public.activity_type AS ENUM ('call', 'sms', 'whatsapp', 'email', 'site-visit', 'offer-sent', 'comp-analysis', 'inspection', 'price-reduction-ask', 'closing', 'other');
CREATE TYPE public.activity_status AS ENUM ('open', 'done', 'snoozed');

-- Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  neighborhood TEXT,
  
  -- Basic data
  price DECIMAL(12, 2),
  bedrooms INTEGER,
  bed INTEGER, -- duplicate for import compatibility
  bathrooms DECIMAL(3, 1),
  bath DECIMAL(3, 1), -- duplicate
  full_bath INTEGER,
  square_footage INTEGER,
  living_sqf INTEGER,
  building_sqf INTEGER,
  above_ground_sqf INTEGER,
  basement BOOLEAN DEFAULT false,
  finished_basement BOOLEAN DEFAULT false,
  basement_sqf INTEGER,
  lot_size TEXT,
  lot_sqf INTEGER,
  year_built INTEGER,
  home_type public.home_type,
  home_sub_type TEXT,
  property_type TEXT,
  
  -- Calculated fields
  price_per_sqft DECIMAL(10, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN square_footage > 0 THEN price / square_footage
      ELSE NULL
    END
  ) STORED,
  ppsf DECIMAL(10, 2), -- duplicate for import
  
  -- Status
  status public.property_status DEFAULT 'For Sale',
  initial_status TEXT,
  sub_status TEXT,
  
  -- Lead source
  source TEXT,
  sub_source TEXT,
  source_contact_details TEXT,
  
  -- Marketing
  listing_url TEXT,
  url TEXT,
  mls_number TEXT,
  description TEXT,
  agent_notes TEXT,
  
  -- Dates
  date_listed DATE,
  days_on_market INTEGER,
  last_sold_date DATE,
  previous_sold_date DATE,
  
  -- Historical prices
  last_sold_price DECIMAL(12, 2),
  previous_sold_price DECIMAL(12, 2),
  
  -- Offer/Deal (stored as JSONB for flexibility)
  offer JSONB,
  deal JSONB,
  
  -- Key people
  seller_agent_name TEXT,
  seller_agent_email TEXT,
  seller_agent_phone TEXT,
  owner TEXT,
  owner_properties TEXT,
  client_email TEXT,
  
  -- Investment
  rentometer_monthly_rent DECIMAL(10, 2),
  
  -- Linked comps
  linked_comp_1 UUID REFERENCES public.properties(id),
  linked_comp_2 UUID REFERENCES public.properties(id),
  linked_comp_3 UUID REFERENCES public.properties(id),
  linked_comp_4 UUID REFERENCES public.properties(id),
  linked_comp_5 UUID REFERENCES public.properties(id),
  
  -- Metadata
  notes TEXT,
  tags TEXT[]
);

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  type public.contact_type DEFAULT 'Other',
  full_name TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  tags TEXT[],
  related_properties UUID[] DEFAULT ARRAY[]::UUID[]
);

-- Activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  
  type public.activity_type DEFAULT 'other',
  title TEXT,
  body TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status public.activity_status DEFAULT 'open'
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public access for now - can add auth later)
CREATE POLICY "Allow all access to properties" ON public.properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to activities" ON public.activities FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_properties_price ON public.properties(price);
CREATE INDEX idx_properties_created_at ON public.properties(created_at DESC);
CREATE INDEX idx_contacts_type ON public.contacts(type);
CREATE INDEX idx_activities_property_id ON public.activities(property_id);
CREATE INDEX idx_activities_status ON public.activities(status);
CREATE INDEX idx_activities_due_at ON public.activities(due_at);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();