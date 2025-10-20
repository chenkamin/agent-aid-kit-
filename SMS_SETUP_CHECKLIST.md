# SMS Webhook & AI Scoring - Setup Checklist

## ✅ What's Been Done

### Database
- [x] Created `sms_messages` table with all fields
- [x] Added `sms_direction` enum (outgoing/incoming)
- [x] Set up RLS policies for company-level access
- [x] Created indexes for performance
- [x] Added automated `updated_at` trigger

### Edge Functions
- [x] Created `sms-webhook` function (v1) - Receives incoming SMS
- [x] Updated `send-sms` function (v3) - Logs outgoing SMS
- [x] Deployed both functions to Supabase
- [x] Added phone number normalization (E.164 format)
- [x] Integrated OpenAI GPT-4 for AI analysis
- [x] Added property matching by phone number

### UI
- [x] Added SMS Communication section to Property Detail page
- [x] Visual indicators for hot/warm/cold leads
- [x] Display AI analysis and reasoning
- [x] Show message timestamps and phone numbers
- [x] Color-coded incoming vs outgoing messages

---

## 🔧 What You Need to Do

### 1. Set OpenAI API Key (REQUIRED)

The AI scoring system needs your OpenAI API key to work.

```bash
# Get your API key from: https://platform.openai.com/api-keys
supabase secrets set OPENAI_API_KEY=sk-your-api-key-here
```

**Cost:** ~$0.0001 per message analysis (GPT-4o-mini)

---

### 2. Configure Webhook URL

You need to set up the webhook in your SMS provider (OpenPhone or Twilio).

#### Option A: OpenPhone
1. Log in to [OpenPhone Dashboard](https://app.openphone.com)
2. Go to **Settings** > **Webhooks**
3. Click **Add Webhook**
4. Enter URL: `https://ijgrelgzahireresdqvw.supabase.co/functions/v1/sms-webhook`
5. Select event: **message.created**
6. Save

#### Option B: Twilio
1. Log in to [Twilio Console](https://console.twilio.com)
2. Go to **Phone Numbers** > **Manage** > **Active Numbers**
3. Select your phone number
4. Under **Messaging**, find "A MESSAGE COMES IN"
5. Set webhook to: `https://ijgrelgzahireresdqvw.supabase.co/functions/v1/sms-webhook`
6. Method: **HTTP POST**
7. Save

---

### 3. Ensure Company Phone Number is Set

The system matches incoming SMS to your company by phone number.

**Check in UI:**
1. Go to **Communication** page
2. Click **Connection Settings**
3. Verify **SMS Phone Number** is set correctly
4. Format: `+12345678900` (include country code)

**Or check in database:**
```sql
SELECT id, name, sms_phone_number 
FROM companies 
WHERE sms_phone_number IS NOT NULL;
```

---

### 4. Test the System

#### Step 1: Send a test SMS
1. Go to **Communication** page
2. Click **Send SMS**
3. Enter a test phone number (your own)
4. Send a test message

#### Step 2: Reply to trigger webhook
Reply to the message from your phone

#### Step 3: Check the results
1. Go to **Properties** page
2. Find a property with the sender's phone number as `seller_agent_phone`
3. Open the property detail
4. Scroll to **SMS Communication** section
5. You should see:
   - Your outgoing message
   - The incoming reply
   - AI score (🔥 HOT, Warm, or Cold)
   - AI analysis explaining the score

---

## 📊 Verify Everything Works

### Check Logs
```bash
# View webhook logs
supabase functions logs sms-webhook

# View send-sms logs
supabase functions logs send-sms
```

### Check Database
```sql
-- See recent SMS messages
SELECT 
  direction,
  message,
  ai_score,
  ai_analysis,
  created_at
FROM sms_messages
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Expected Behavior

### When you send an SMS:
1. Message appears in Communication page
2. Message is logged in `sms_messages` table
3. Message appears in Property Detail (if associated)

### When a seller replies:
1. Webhook receives the message
2. System finds your company by phone number
3. System matches to property by seller's phone
4. OpenAI analyzes the message
5. Message + score + analysis saved to database
6. Automatically appears in Property Detail page
7. Hot leads (score 3) show 🔥 indicator

---

## 🔥 Hot Lead Scoring

**Score 3 - HOT 🔥**
- Very interested
- Motivated to sell
- Eager to talk
- Shows urgency
- Example: "Yes! When can we meet? I need to sell ASAP!"

**Score 2 - WARM 🌡️**
- Somewhat interested
- Asking questions
- Open to discussion
- Example: "Tell me more about your offer"

**Score 1 - COLD ❄️**
- Not interested
- Hostile response
- Not motivated
- Example: "Stop texting me"

---

## 🚨 Troubleshooting

### "No messages appearing"
- ✓ Check webhook is configured correctly
- ✓ Verify OpenAI API key is set
- ✓ Ensure `sms_phone_number` matches in companies table
- ✓ Check Edge Function logs for errors

### "Property not matched"
- ✓ Verify `seller_agent_phone` is set on the property
- ✓ Phone numbers must be in same format (E.164)
- ✓ System picks most recent property if multiple matches

### "AI score not showing"
- ✓ OpenAI API key must be set
- ✓ Check for API errors in logs
- ✓ Ensure incoming message has content
- ✓ Verify OpenAI account has credits

---

## 📚 Documentation

See `SMS_WEBHOOK_AND_AI_SCORING.md` for complete documentation including:
- Detailed architecture
- API reference
- Database schema
- Testing procedures
- Security considerations

---

## ✨ You're All Set!

Once you complete steps 1-3 above, your SMS system will be fully operational with AI-powered lead scoring!

Every incoming message will be automatically analyzed and scored, helping you focus on the hottest leads first.

