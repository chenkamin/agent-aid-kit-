# Backfill AI Scores Function

This Edge Function analyzes incoming SMS messages that don't have AI scores and adds `ai_score` and `ai_analysis` to them retroactively.

## Purpose

If you received SMS messages before setting up the `OPENAI_API_KEY`, those messages won't have AI scores. This function goes through all messages without scores and analyzes them using OpenAI.

## How It Works

1. Fetches all incoming SMS messages where `ai_score IS NULL`
2. Analyzes each message with OpenAI GPT-4o-mini
3. Updates each message with:
   - `ai_score` (1-3: Cold, Warm, Hot)
   - `ai_analysis` (Brief explanation)
4. Processes up to 100 messages at a time (configurable)

## Requirements

- `OPENAI_API_KEY` must be set in Supabase secrets
- Service role key for database access

## Usage

### Basic Usage (All Companies)

```bash
curl -X POST https://[your-project].supabase.co/functions/v1/backfill-ai-scores \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Filter by Company

```bash
curl -X POST https://[your-project].supabase.co/functions/v1/backfill-ai-scores \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "your-company-uuid",
    "limit": 50
  }'
```

### Parameters

- `company_id` (optional): Filter messages by specific company
- `limit` (optional): Max number of messages to process (default: 100)

## Response

```json
{
  "status": "success",
  "message": "Backfill complete",
  "total_found": 45,
  "processed": 43,
  "skipped": 2,
  "failed": 0,
  "details": {
    "processed_ids": ["uuid1", "uuid2", ...]
  }
}
```

## Cost Estimate

- **Model**: GPT-4o-mini
- **Cost per message**: ~$0.0001 USD
- **100 messages**: ~$0.01 USD
- **1000 messages**: ~$0.10 USD

Very affordable for backfilling!

## Rate Limiting

The function includes a 100ms delay between messages to avoid OpenAI rate limits. For large batches:
- 100 messages = ~10 seconds
- 1000 messages = ~100 seconds

## Logging

Check function logs to see progress:

```bash
supabase functions logs backfill-ai-scores --tail
```

You'll see:
- 🤖 AI analysis progress
- ✅ Successful updates
- ❌ Failed updates
- 📊 Final summary

## Error Handling

- If OpenAI API fails, sets score to 2 (warm) with error message
- Empty messages are skipped
- Database errors are logged but don't stop processing
- Failed messages are counted and reported

## Running Multiple Times

Safe to run multiple times - only processes messages where `ai_score IS NULL`, so already-processed messages are skipped automatically.

## Example Output

```
🔄 Backfill AI Scores - Starting...
📊 Fetching messages without AI scores...
   Company filter: ALL
   Limit: 100
📝 Found 45 messages to process

📨 Processing message ID: abc-123
   Message: "Yes, I'm interested in selling my property..."
🤖 Analyzing message with OpenAI: "Yes, I'm interested in selling my property..."
📊 OpenAI response: {"score": 3, "analysis": "Very interested, motivated seller"}
   ✅ Updated - Score: 3, Analysis: "Very interested, motivated seller"

[... more messages ...]

🎉 Backfill Complete!
   ✅ Processed: 43
   ⏭️ Skipped: 2
   ❌ Failed: 0
```

## Deployment

```bash
supabase functions deploy backfill-ai-scores
```

Or use the MCP Supabase tool to deploy.


