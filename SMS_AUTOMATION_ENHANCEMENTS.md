# SMS Automation: Template Selection & AI Auto-Pilot

## New Features Added

### 1. Template Selection
Users can now select from their saved SMS templates directly in the automation configuration dialog instead of typing template names manually.

**How it works:**
- Dropdown list shows all saved SMS templates
- Selecting a template auto-populates the message field
- Users can still edit the message after selection
- Option for "Custom Message" if no template is needed

### 2. AI Auto-Pilot Mode
Revolutionary feature that uses OpenAI to automatically generate personalized SMS messages for each property.

**How it works:**
- Toggle "🤖 AI Auto-Pilot" in the SMS configuration
- AI generates unique messages based on:
  - Property details (address, price, beds, baths, sqft)
  - Days on market
  - Agent name
  - Custom instructions (optional)
- Messages are professional, concise (160 chars max), and personalized
- No manual template needed!

## Usage

### Using Templates

1. Create an automation with "Send SMS" action
2. Click the SMS node to configure
3. Select a template from the dropdown
4. The message will load automatically
5. Edit if needed or use as-is
6. Save and activate

### Using AI Auto-Pilot

1. Create an automation with "Send SMS" action
2. Click the SMS node to configure
3. **Toggle ON** "🤖 AI Auto-Pilot"
4. (Optional) Add special instructions like:
   - "Be professional and mention we're cash buyers"
   - "Focus on quick closing"
   - "Emphasize no inspection needed"
5. Set delay if needed
6. Save and activate

**Example AI Instructions:**
```
Be friendly and professional. Mention we're a cash buyer interested in a quick close. 
Ask if they're open to offers below asking price.
```

## Configuration Options

### Template Mode (AI Off)
```typescript
{
  template_id: "uuid-of-template",
  message: "Hi {{AGENT_NAME}}, interested in {{ADDRESS}}...",
  delay_hours: 0
}
```

### AI Auto-Pilot Mode (AI On)
```typescript
{
  ai_autopilot: true,
  ai_instructions: "Be professional, mention cash buyer, focus on quick closing",
  delay_hours: 24
}
```

## Backend Changes

The `execute-automation` function now:
1. Checks if `config.ai_autopilot` is enabled
2. If YES:
   - Gathers property context
   - Calls OpenAI GPT-4 API
   - Generates a professional SMS message (max 160 chars)
   - Includes custom instructions if provided
   - Logs that AI was used
3. If NO:
   - Uses manual message with template variables
   - Replaces {{VARIABLES}} as before

## API Requirements

**Environment Variable Required:**
- `OPENAI_API_KEY` - Must be set in Supabase Edge Function secrets

**To set:**
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

## Example AI-Generated Messages

**Property:** 123 Main St, $250K, 3bed/2bath, 1,500 sqft

**Generated Message:**
```
Hi Sarah! Interested in 123 Main St at $250K. Cash buyer, quick close possible. Can we discuss? - John
```

**With Instructions: "Be professional, mention investment property"**
```
Hello Sarah, considering 123 Main St as investment property. $250K listed. Would you entertain offers? Thank you.
```

## Visual Indicators

- **AI Auto-Pilot ON**: Node displays "🤖 AI Auto-Pilot" badge
- **Template Used**: Shows template-loaded message preview
- **Custom Message**: Shows message preview

## Cost Considerations

**AI Auto-Pilot:**
- Uses OpenAI GPT-4 API
- ~$0.01-0.02 per message generated
- Worth it for high-quality, personalized messages at scale

**Alternatives:**
- Use templates (free)
- Use custom messages with variables (free)

## Error Handling

If AI generation fails:
- Error is logged
- SMS is NOT sent (prevents sending broken messages)
- Action marked as "error" in automation log
- User can retry or switch to manual mode

## Best Practices

1. **Test First**: Run automation on 1-2 properties to see AI output quality
2. **Provide Instructions**: Give AI context about your business/style
3. **Monitor Results**: Check automation logs to see generated messages
4. **Mix Approaches**: Use AI for initial outreach, templates for follow-ups
5. **Set Delays**: Avoid overwhelming agents with immediate AI-generated messages

## Troubleshooting

**AI not generating messages?**
- Check `OPENAI_API_KEY` is set in Supabase secrets
- Verify OpenAI account has credits
- Check automation logs for specific error messages

**Messages too generic?**
- Add more detailed AI instructions
- Include specific business context
- Mention your unique selling points

**Messages too long?**
- AI is constrained to 160 chars by default
- If still too long, adjust system prompt in code

## Future Enhancements

- [ ] A/B testing different AI prompts
- [ ] Learning from successful responses
- [ ] Multi-language support
- [ ] Sentiment analysis of agent responses
- [ ] Auto-follow-up based on response tone

