-- Add onboarding viewed columns for additional pages
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_viewed_dashboard BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_viewed_contacts BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_viewed_activities BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_viewed_automations BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_viewed_kpi BOOLEAN DEFAULT false;
