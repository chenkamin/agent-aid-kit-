# SMS Webhook and AI Scoring System

## Overview

This system provides a complete SMS communication tracking and AI-powered lead scoring solution for real estate investors. It automatically:

1. **Receives incoming SMS messages** via webhook
2. **Analyzes responses** using OpenAI to score seller interest (1-3)
3. **Stores all communications** in the database
4. **Displays SMS history** in the Property Detail page with visual indicators

---

## Database Schema

### Table: `sms_messages`

Stores all SMS communications (incoming and outgoing) with AI analysis.

**Columns:**
- `id` (UUID) - Primary key
- `company_id` (UUID) - Foreign key to companies
- `property_id` (UUID) - Foreign key to properties (nullable)
- `direction` (ENUM: 'outgoing', 'incoming') - Message direction
- `from_number` (TEXT) - Sender's phone number (E.164 format)
- `to_number` (TEXT) - Recipient's phone number (E.164 format)
- `message` (TEXT) - Message content
- `status` (TEXT) - Message status (sent, delivered, failed, received)
- `ai_score` (INTEGER 1-3) - AI-generated lead score (1=cold, 2=warm, 3=hot)
- `ai_analysis` (TEXT) - OpenAI's reasoning for the score
- `provider_message_id` (TEXT) - OpenPhone/Twilio message ID
- `metadata` (JSONB) - Additional provider-specific data
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Indexes:**
- `idx_sms_messages_company_id` - Company lookups
- `idx_sms_messages_property_id` - Property lookups
- `idx_sms_messages_direction` - Direction filtering
- `idx_sms_messages_created_at` - Time-based queries
- `idx_sms_messages_phone_numbers` - Phone number lookups

**RLS Policies:**
- Users can view/insert/update messages for their company only

---

## Edge Functions

### 1. `sms-webhook` - Incoming SMS Handler

**Purpose:** Receives incoming SMS from OpenPhone/Twilio and processes them with AI.

**URL:** `https://[your-project-ref].supabase.co/functions/v1/sms-webhook`

**Features:**
- Supports both OpenPhone (JSON) and Twilio (form-urlencoded) webhooks
- Normalizes phone numbers to E.164 format
- Matches incoming SMS to properties by phone number
- Uses OpenAI GPT-4 to analyze and score seller responses
- Stores messages with AI analysis in database

**AI Scoring System:**
- **1 = COLD**: Not interested, hostile, or clearly not motivated to sell
- **2 = WARM**: Somewhat interested, asking questions, open to discussion but hesitant
- **3 = HOT**: Very interested, motivated to sell, eager to talk, showing urgency

**Setup:**
```bash
# Deploy the function
supabase functions deploy sms-webhook

# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-...
```

**Webhook Configuration:**

**OpenPhone:**
1. Dashboard > Settings > Webhooks
2. Add webhook URL: `https://[your-project-ref].supabase.co/functions/v1/sms-webhook`
3. Event: `message.created`

**Twilio:**
1. Console > Phone Numbers > Active Numbers
2. Select your number
3. Messaging > "A MESSAGE COMES IN": `https://[your-project-ref].supabase.co/functions/v1/sms-webhook`
4. Method: HTTP POST

---

### 2. `send-sms` - Outgoing SMS Handler (Updated)

**Purpose:** Sends SMS messages and logs them to the database.

**Changes:**
- Now logs all outgoing messages to `sms_messages` table
- Stores provider message IDs for tracking
- Associates messages with properties when available

**Features:**
- Single or bulk SMS sending
- Phone number normalization
- Automatic database logging
- Template variable replacement for bulk messages

---

## UI Components

### Property Detail Page - SMS Communication Section

**Location:** `src/pages/PropertyDetail.tsx`

**Features:**
- Displays all SMS messages for a property
- Visual distinction between incoming/outgoing messages
- AI score indicators with icons:
  - 🔥 **HOT LEAD** (Red flame icon, score 3)
  - **Warm Lead** (Orange thermometer icon, score 2)
  - **Cold Lead** (Blue snowflake icon, score 1)
- Shows AI analysis reasoning
- Timestamps for each message
- Phone numbers displayed

**Visual Design:**
- **Incoming messages**: Blue background
- **Outgoing messages**: Gray background
- **Score badges**: Color-coded (red/orange/blue)
- **Icons**: Flame, Thermometer, Snowflake

---

## Usage Flow

### Outgoing SMS
1. User sends SMS from Communication page
2. `send-sms` function sends via OpenPhone/Twilio
3. Message logged to database with status
4. Appears in Property Detail > SMS Communication

### Incoming SMS
1. Seller replies to your message
2. OpenPhone/Twilio sends webhook to `sms-webhook`
3. Function identifies company by phone number
4. Matches to property by seller's phone number
5. OpenAI analyzes message and generates score
6. Message + score + analysis stored in database
7. Real-time update in Property Detail page

---

## Testing

### Test Webhook Locally

```bash
# Test OpenPhone format
curl -X POST http://localhost:54321/functions/v1/sms-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "msg_123",
    "object": "message",
    "from": "+15555551234",
    "to": ["+15555555678"],
    "body": "Yes, I am very interested! Can we talk today?",
    "direction": "incoming"
  }'

# Test Twilio format
curl -X POST http://localhost:54321/functions/v1/sms-webhook \
  -H "Content-Type": application/x-www-form-urlencoded" \
  -d "MessageSid=SM123&From=%2B15555551234&To=%2B15555555678&Body=Not+interested"
```

### Verify Database

```sql
-- Check SMS messages
SELECT 
  id, 
  direction, 
  message, 
  ai_score, 
  ai_analysis,
  created_at 
FROM sms_messages 
ORDER BY created_at DESC 
LIMIT 10;

-- Check property associations
SELECT 
  p.address,
  sm.direction,
  sm.message,
  sm.ai_score
FROM sms_messages sm
JOIN properties p ON sm.property_id = p.id
WHERE sm.ai_score = 3;  -- Hot leads only
```

---

## Monitoring

### View Logs

**Supabase Dashboard:**
1. Go to Edge Functions
2. Select `sms-webhook` or `send-sms`
3. View Logs tab

**Key Log Messages:**
- `📨 SMS Webhook received` - Webhook triggered
- `🤖 Analyzing message with OpenAI` - AI analysis started
- `✅ SMS stored` - Message saved successfully
- `🏠 Property matched` - Associated with property
- `🔥 Score` - AI score assigned

---

## Security

1. **RLS Policies**: Users can only access their company's messages
2. **Phone Number Matching**: Properties only matched within same company
3. **Webhook Authentication**: Returns 200 for invalid data to avoid retries
4. **API Key Storage**: OpenAI key stored as Supabase secret
5. **E.164 Normalization**: Prevents phone number spoofing

---

## Troubleshooting

### Messages not appearing in UI
- Check if `property_id` is set (match by phone number)
- Verify company's `sms_phone_number` matches webhook recipient
- Check RLS policies allow user to view messages

### AI analysis not working
- Verify `OPENAI_API_KEY` is set: `supabase secrets list`
- Check Edge Function logs for API errors
- Ensure OpenAI API key has credits

### Webhook not triggered
- Verify webhook URL is correct
- Check provider (OpenPhone/Twilio) webhook settings
- Test with curl to ensure function is deployed

### Property not matched
- Ensure `seller_agent_phone` is set on property
- Phone numbers must match exactly (after E.164 normalization)
- Check if multiple properties have same agent phone (picks most recent)

---

## Future Enhancements

- **Auto-reply** based on AI score
- **Bulk SMS** from Properties page with property selection
- **SMS templates** for common responses
- **Conversation threading** to group messages
- **Sentiment analysis** beyond just hot/warm/cold
- **Notification system** for hot leads
- **Analytics dashboard** for SMS engagement metrics

---

## Files Modified/Created

**Database:**
- `supabase/migrations/[timestamp]_create_sms_messages_table.sql`

**Edge Functions:**
- `functions/sms-webhook/index.ts` (NEW)
- `functions/sms-webhook/README.md` (NEW)
- `functions/send-sms/index.ts` (UPDATED)

**UI:**
- `src/pages/PropertyDetail.tsx` (UPDATED)

**Documentation:**
- `SMS_WEBHOOK_AND_AI_SCORING.md` (NEW)

---

## Summary

This system provides a complete SMS communication solution with AI-powered lead scoring, helping real estate investors:

1. **Track all communications** automatically
2. **Identify hot leads** instantly with AI
3. **View conversation history** in property details
4. **Make data-driven decisions** about which sellers to prioritize

The AI scoring system uses OpenAI's GPT-4 to analyze seller responses and provide actionable insights, saving time and helping focus on the most motivated sellers.

