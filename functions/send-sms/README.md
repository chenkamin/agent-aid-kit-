# Send SMS Edge Function

This edge function sends SMS messages using either OpenPhone or Twilio, with dynamic provider configuration from the company settings.

## Features

- **Single SMS**: Send one SMS to a specific number
- **Bulk SMS**: Send SMS to multiple properties with template variables
- **Multi-Provider Support**: Works with OpenPhone or Twilio
- **Dynamic Configuration**: API keys and settings stored per company
- **Template Variables**: Use property data in bulk messages

## Configuration

### Database Setup

The function requires SMS configuration in the `companies` table:

```sql
-- Fields in companies table:
sms_provider      TEXT  -- 'openphone' or 'twilio'
sms_api_key       TEXT  -- API key/credentials
sms_phone_number  TEXT  -- Phone number to send from
```

### OpenPhone Setup

1. Get your OpenPhone API key from [OpenPhone Dashboard](https://dashboard.openphone.com)
2. Update company record:
   - `sms_provider`: `'openphone'`
   - `sms_api_key`: Your OpenPhone API key
   - `sms_phone_number`: Your OpenPhone number (e.g., `+12345678900`)

### Twilio Setup

1. Get your Account SID and Auth Token from [Twilio Console](https://console.twilio.com)
2. Update company record:
   - `sms_provider`: `'twilio'`
   - `sms_api_key`: `'AccountSid:AuthToken'` (colon-separated)
   - `sms_phone_number`: Your Twilio number (e.g., `+12345678900`)

## Usage

### Single SMS

Send one SMS to a specific number:

```typescript
const response = await supabase.functions.invoke('send-sms', {
  body: {
    type: 'single',
    to: '+12345678900',
    message: 'Hello! Are you interested in selling your property?'
  }
});
```

### Bulk SMS

Send SMS to multiple properties using a template:

```typescript
const response = await supabase.functions.invoke('send-sms', {
  body: {
    type: 'bulk',
    propertyIds: ['uuid1', 'uuid2', 'uuid3'],
    messageTemplate: 'Hi {agentName}, interested in your listing at {address}. Price: {price}. Call me!'
  }
});
```

### Template Variables

Available variables for bulk messages:

- `{address}` - Property street address
- `{city}` - City
- `{state}` - State
- `{zip}` - ZIP code
- `{price}` - Formatted price (e.g., $250,000)
- `{agentName}` - Seller agent name
- `{agentPhone}` - Seller agent phone
- `{beds}` - Number of bedrooms
- `{baths}` - Number of bathrooms
- `{sqft}` - Square footage
- `{homeType}` - Property type

## Response Format

```json
{
  "message": "SMS sending complete: 3 successful, 0 failed",
  "totalSent": 3,
  "successCount": 3,
  "errorCount": 0,
  "results": [
    {
      "to": "+12345678900",
      "propertyId": "uuid1",
      "success": true
    }
  ]
}
```

## Error Handling

Common errors:

- **Not configured**: SMS provider settings not found in company table
- **Invalid provider**: Provider must be 'openphone' or 'twilio'
- **Invalid Twilio credentials**: API key must be `AccountSid:AuthToken`
- **No phone numbers**: Properties don't have agent phone numbers
- **Rate limiting**: Function includes 500ms delay between messages

## Security

- User authentication required
- Company-scoped data access (users can only send SMS for their company's properties)
- API keys stored securely in database
- No hardcoded credentials

## Example React Component

```tsx
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

function SendSMSButton({ propertyIds }: { propertyIds: string[] }) {
  const [loading, setLoading] = useState(false);

  const sendBulkSMS = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          type: 'bulk',
          propertyIds,
          messageTemplate: 'Hi {agentName}! Interested in {address} at {price}. Please call back!'
        }
      });

      if (error) throw error;
      
      console.log(`SMS sent: ${data.successCount} successful`);
      alert(`SMS sent to ${data.successCount} recipients`);
    } catch (error) {
      console.error('SMS error:', error);
      alert('Failed to send SMS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={sendBulkSMS} disabled={loading}>
      {loading ? 'Sending...' : 'Send SMS to Agents'}
    </button>
  );
}
```

## Testing

### Test Single SMS

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/send-sms' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "single",
    "to": "+12345678900",
    "message": "Test message"
  }'
```

### Test Bulk SMS

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/send-sms' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "bulk",
    "propertyIds": ["uuid1", "uuid2"],
    "messageTemplate": "Hello {agentName}, interested in {address}"
  }'
```

## Rate Limits

- OpenPhone: Check your plan limits
- Twilio: Check your account limits
- Function includes 500ms delay between messages to avoid hitting rate limits

## Best Practices

1. **Test first**: Send to yourself before bulk sending
2. **Keep messages short**: SMS has character limits (160 for standard)
3. **Include opt-out**: Add "Reply STOP to unsubscribe" for compliance
4. **Timing**: Don't send SMS late at night or early morning
5. **Personalize**: Use template variables to make messages relevant
6. **Track results**: Check the response to see which messages failed

## Troubleshooting

**"SMS not configured"**
- Add provider, API key, and phone number to companies table

**"No valid phone numbers found"**
- Ensure properties have `seller_agent_phone` values

**"Twilio API key must be in format: AccountSid:AuthToken"**
- Format: `ACxxxxxxxx:your_auth_token_here`

**Messages not sending**
- Check API key is valid
- Verify phone number format (+1XXXXXXXXXX)
- Check provider account balance/status

