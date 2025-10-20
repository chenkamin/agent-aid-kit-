# SMS Webhook Function

This Edge Function acts as a webhook endpoint for incoming SMS messages from OpenPhone or Twilio. It automatically:

1. Receives incoming SMS messages
2. Analyzes the message using OpenAI to score seller interest (1-3)
3. Stores the message in the database
4. Attempts to match the message to a property

## Setup

### 1. Deploy the Function

```bash
supabase functions deploy sms-webhook
```

### 2. Set Environment Variable

Set your OpenAI API key:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Configure Your SMS Provider

#### OpenPhone Webhook Setup

1. Log in to OpenPhone Dashboard
2. Go to Settings > Webhooks
3. Add a new webhook with URL:
   ```
   https://[your-project-ref].supabase.co/functions/v1/sms-webhook
   ```
4. Select event: `message.created`
5. Save the webhook

#### Twilio Webhook Setup

1. Log in to Twilio Console
2. Go to Phone Numbers > Manage > Active Numbers
3. Select your phone number
4. Under "Messaging", set "A MESSAGE COMES IN" webhook to:
   ```
   https://[your-project-ref].supabase.co/functions/v1/sms-webhook
   ```
5. Method: HTTP POST
6. Save

## How It Works

### AI Scoring System

The function uses OpenAI GPT-4 to analyze incoming messages and score them:

- **1 = COLD**: Not interested, hostile, or clearly not motivated
- **2 = WARM**: Somewhat interested, asking questions, open to discussion
- **3 = HOT**: Very interested, motivated, eager to talk, showing urgency

### Property Matching

The function attempts to match incoming SMS to properties by:
1. Finding the company based on the receiving phone number
2. Searching for properties where `seller_agent_phone` matches the sender's number

### Data Storage

All messages are stored in the `sms_messages` table with:
- Message content
- AI score (1-3)
- AI analysis (reasoning)
- Property association (if matched)
- Provider metadata

## Testing

Test the webhook locally:

```bash
curl -X POST http://localhost:54321/functions/v1/sms-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-123",
    "object": "message",
    "from": "+15555551234",
    "to": ["+15555555678"],
    "body": "Yes, I am interested in selling! When can we talk?",
    "direction": "incoming"
  }'
```

## Monitoring

View logs in Supabase Dashboard:
1. Go to Edge Functions
2. Select `sms-webhook`
3. View Logs tab

Look for:
- `📨 SMS Webhook received` - Webhook triggered
- `🤖 Analyzing message` - AI analysis started
- `✅ SMS stored` - Message saved successfully
- `🏠 Property matched` - Associated with property

