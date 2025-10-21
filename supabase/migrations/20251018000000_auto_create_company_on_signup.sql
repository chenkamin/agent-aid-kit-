-- =====================================================
-- AUTO CREATE COMPANY ON USER SIGNUP
-- =====================================================
-- When a new user signs up (not through invitation), 
-- automatically create a personal company for them with owner role

-- Function to auto-create company for new users
CREATE OR REPLACE FUNCTION public.auto_create_company_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
  user_email TEXT;
  company_name TEXT;
BEGIN
  -- Get user's email
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  
  -- Check if user already has a company (invited user)
  IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = NEW.id) THEN
    -- User was invited, don't create a company
    RETURN NEW;
  END IF;
  
  -- Create default company name from email
  company_name := COALESCE(
    SPLIT_PART(user_email, '@', 1),
    'My Company'
  ) || '''s Company';
  
  -- Create company
  INSERT INTO public.companies (name, owner_id)
  VALUES (company_name, NEW.id)
  RETURNING id INTO new_company_id;
  
  -- Add user as team member with 'owner' role
  INSERT INTO public.team_members (company_id, user_id, role, accepted_at)
  VALUES (new_company_id, NEW.id, 'owner', now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table (created after auth.users signup)
DROP TRIGGER IF EXISTS auto_create_company_on_signup ON public.profiles;
CREATE TRIGGER auto_create_company_on_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_company_for_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.auto_create_company_for_new_user() TO authenticated;




