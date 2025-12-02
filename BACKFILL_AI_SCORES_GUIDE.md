# 🤖 Backfill AI Scores - Complete Guide

## ✅ Deployment Status: LIVE

Your `backfill-ai-scores` Edge Function has been successfully deployed!

**Function ID:** `5f028f85-d4b6-4685-a4a7-6cd10c596a64`  
**Status:** ACTIVE  
**Version:** 1

---

## 📋 What This Function Does

This function analyzes all incoming SMS messages that don't have AI scores and adds:
- **AI Score** (1-3): Cold, Warm, or Hot lead
- **AI Analysis**: Brief explanation of the score

Perfect for backfilling messages that were received before you set up `OPENAI_API_KEY`!

---

## 🚀 How to Use

### Method 1: Via Supabase Dashboard (Easiest)

1. Go to: [Supabase Dashboard](https://supabase.com/dashboard/project/ijgrelgzahireresdqvw/functions/backfill-ai-scores)
2. Click **"Invoke"** button
3. Leave body empty for default settings, or add JSON:
   ```json
   {
     "company_id": "your-company-uuid",
     "limit": 50
   }
   ```
4. Click **"Send"**
5. Watch the response!

### Method 2: Via cURL (Command Line)

#### Process All Messages (All Companies)

```bash
curl -X POST https://ijgrelgzahireresdqvw.supabase.co/functions/v1/backfill-ai-scores \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### Process Specific Company

```bash
curl -X POST https://ijgrelgzahireresdqvw.supabase.co/functions/v1/backfill-ai-scores \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "uuid-of-your-company",
    "limit": 100
  }'
```

#### Process with Custom Limit

```bash
curl -X POST https://ijgrelgzahireresdqvw.supabase.co/functions/v1/backfill-ai-scores \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'
```

### Method 3: Via JavaScript/Frontend

```typescript
const { data, error } = await supabase.functions.invoke('backfill-ai-scores', {
  body: {
    company_id: 'your-company-uuid', // optional
    limit: 100 // optional, default is 100
  }
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success:', data);
  console.log(`Processed: ${data.processed} messages`);
}
```

---

## 📊 Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `company_id` | UUID | No | null | Filter messages by company |
| `limit` | Number | No | 100 | Max messages to process (1-100) |

---

## 📤 Response Format

### Success Response

```json
{
  "status": "success",
  "message": "Backfill complete",
  "total_found": 45,
  "processed": 43,
  "skipped": 2,
  "failed": 0,
  "details": {
    "processed_ids": [
      "uuid-1",
      "uuid-2",
      "uuid-3"
    ]
  }
}
```

### No Messages Response

```json
{
  "status": "success",
  "message": "No messages to process",
  "processed": 0,
  "skipped": 0,
  "failed": 0
}
```

### Error Response

```json
{
  "status": "error",
  "message": "OPENAI_API_KEY not configured"
}
```

---

## 💰 Cost Estimate

**Model:** GPT-4o-mini  
**Cost per message:** ~$0.0001 USD

| Messages | Estimated Cost | Time |
|----------|----------------|------|
| 10 | $0.001 | ~1 second |
| 50 | $0.005 | ~5 seconds |
| 100 | $0.01 | ~10 seconds |
| 500 | $0.05 | ~50 seconds |
| 1000 | $0.10 | ~100 seconds |

**Very affordable!** 💸

---

## 🔍 How to Check Results

### View in Dashboard

1. Go to SMS page in your app
2. Filter by "Hot Leads" or "All"
3. Check if messages now have AI scores

### Query Database

```sql
SELECT 
  id,
  message,
  ai_score,
  ai_analysis,
  created_at
FROM sms_messages
WHERE direction = 'incoming'
  AND ai_score IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

### Count Messages

```sql
-- Messages WITHOUT AI scores
SELECT COUNT(*) as without_score
FROM sms_messages
WHERE direction = 'incoming' 
  AND ai_score IS NULL;

-- Messages WITH AI scores
SELECT COUNT(*) as with_score
FROM sms_messages
WHERE direction = 'incoming' 
  AND ai_score IS NOT NULL;

-- Score distribution
SELECT 
  ai_score,
  COUNT(*) as count
FROM sms_messages
WHERE direction = 'incoming'
GROUP BY ai_score
ORDER BY ai_score;
```

---

## 📝 View Function Logs

### Real-time Logs

```bash
supabase functions logs backfill-ai-scores --tail
```

### Recent Logs

```bash
supabase functions logs backfill-ai-scores
```

### What You'll See

```
🔄 Backfill AI Scores - Starting...
📊 Fetching messages without AI scores...
   Company filter: ALL
   Limit: 100
📝 Found 45 messages to process

📨 Processing message ID: abc-123
   Message: "Yes, I'm interested in selling..."
🤖 Analyzing message with OpenAI: "Yes, I'm interested in selling..."
📊 OpenAI response: {"score": 3, "analysis": "Very interested, motivated"}
   ✅ Updated - Score: 3, Analysis: "Very interested, motivated"

[... more messages ...]

🎉 Backfill Complete!
   ✅ Processed: 43
   ⏭️ Skipped: 2
   ❌ Failed: 0
```

---

## ⚡ Best Practices

### 1. Process in Batches

If you have 500+ messages, process in batches of 100:

```bash
# Batch 1
curl -X POST ... -d '{"limit": 100}'

# Wait a minute, then Batch 2
curl -X POST ... -d '{"limit": 100}'

# etc.
```

### 2. Test with Small Batch First

```bash
curl -X POST ... -d '{"limit": 10}'
```

Check results before processing all messages.

### 3. Filter by Company

If you have multiple companies, process one at a time:

```bash
curl -X POST ... -d '{"company_id": "company-uuid-1", "limit": 100}'
curl -X POST ... -d '{"company_id": "company-uuid-2", "limit": 100}'
```

### 4. Run During Off-Peak Hours

For large batches (500+), run during low-traffic times to avoid rate limits.

---

## 🛡️ Safety Features

✅ **Idempotent**: Safe to run multiple times - only processes messages without scores  
✅ **Rate Limited**: 100ms delay between messages to avoid OpenAI limits  
✅ **Error Handling**: Failed messages don't stop the entire batch  
✅ **Logging**: Detailed logs for debugging  
✅ **Validation**: Ensures scores are always 1-3  

---

## ❓ Troubleshooting

### Issue: "OPENAI_API_KEY not configured"

**Solution:** Set your OpenAI API key:

```bash
supabase secrets set OPENAI_API_KEY=sk-your-actual-key-here
```

### Issue: "No messages to process"

**Possible Causes:**
1. All messages already have AI scores ✅ (Good!)
2. No incoming messages in database
3. Company filter doesn't match any messages

**Check:**
```sql
SELECT COUNT(*) FROM sms_messages 
WHERE direction = 'incoming' AND ai_score IS NULL;
```

### Issue: Some messages failed

**Common Reasons:**
- Message is too long (>1000 chars)
- OpenAI API rate limit hit
- Invalid characters in message

**Solution:** Check logs for specific error messages

### Issue: Function times out

**Solution:** Reduce batch size:
```json
{"limit": 20}
```

---

## 🔄 Running Regularly

Want to automatically backfill new messages daily? You can:

### Option 1: Manual Schedule

Run once a day manually:
```bash
# Add to your daily routine or cron job
curl -X POST https://ijgrelgzahireresdqvw.supabase.co/functions/v1/backfill-ai-scores \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Option 2: Add to Your App

Add a button in your admin panel:

```tsx
<Button 
  onClick={async () => {
    const { data } = await supabase.functions.invoke('backfill-ai-scores');
    toast.success(`Processed ${data.processed} messages!`);
  }}
>
  Backfill AI Scores
</Button>
```

---

## 📞 Support

**Function URL:**  
`https://ijgrelgzahireresdqvw.supabase.co/functions/v1/backfill-ai-scores`

**Function ID:**  
`5f028f85-d4b6-4685-a4a7-6cd10c596a64`

**Documentation:**  
See `functions/backfill-ai-scores/README.md`

---

## 🎯 Quick Start Checklist

- [ ] Make sure `OPENAI_API_KEY` is set in Supabase secrets
- [ ] Test with small batch first (`limit: 10`)
- [ ] Check results in database
- [ ] Process remaining messages in batches of 100
- [ ] Verify all messages have scores
- [ ] Celebrate! 🎉

---

## 📈 Example Workflow

```bash
# 1. Check how many messages need processing
# Run this SQL query in Supabase SQL Editor:
SELECT COUNT(*) FROM sms_messages 
WHERE direction = 'incoming' AND ai_score IS NULL;
# Result: 237 messages

# 2. Process first batch (test with 10)
curl -X POST https://ijgrelgzahireresdqvw.supabase.co/functions/v1/backfill-ai-scores \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# 3. Check results look good
# Verify in your SMS page that scores appear correctly

# 4. Process all remaining
curl -X POST https://ijgrelgzahireresdqvw.supabase.co/functions/v1/backfill-ai-scores \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'

# 5. Repeat until all processed
# Keep running until you get: "No messages to process"

# 6. Verify completion
SELECT COUNT(*) FROM sms_messages 
WHERE direction = 'incoming' AND ai_score IS NULL;
# Result: 0 messages ✅
```

---

**🎊 Your function is ready to use! Go ahead and backfill those AI scores!**









