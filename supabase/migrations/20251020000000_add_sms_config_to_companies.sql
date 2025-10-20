-- Add SMS configuration fields to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS sms_provider TEXT CHECK (sms_provider IN ('openphone', 'twilio')),
ADD COLUMN IF NOT EXISTS sms_api_key TEXT,
ADD COLUMN IF NOT EXISTS sms_phone_number TEXT;

-- Add comments to explain the columns
COMMENT ON COLUMN public.companies.sms_provider IS 'SMS provider: openphone or twilio';
COMMENT ON COLUMN public.companies.sms_api_key IS 'API key for the SMS provider';
COMMENT ON COLUMN public.companies.sms_phone_number IS 'Phone number to send SMS from';

