# Backfill Agent Info Edge Function

## Overview

This edge function loops through all properties in your database and adds missing agent information (name, phone, email) by scraping the `listedBy` data from Zillow.

## What It Does

1. ✅ Fetches all properties in your company that are missing agent info
2. ✅ Collects their addresses
3. ✅ Calls the Apify Property Details Actor (`ENK9p4RZHg0iVso52`)
4. ✅ Extracts `seller_agent_name`, `seller_agent_phone`, `seller_agent_email`
5. ✅ Updates the properties in the database

## Deployment

```bash
supabase functions deploy backfill-agent-info
```

## How to Use

### Option 1: Call from Command Line (curl)

```bash
# Get your auth token from Supabase Dashboard or from browser dev tools
# It will be in the format: Bearer eyJhbGc...

curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/backfill-agent-info \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### Option 2: Call from Browser Console

1. Go to your Properties page
2. Open browser console (F12)
3. Run this:

```javascript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/backfill-agent-info',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }
);

const result = await response.json();
console.log(result);
```

### Option 3: Add a Button to the UI

Add this to `src/pages/Properties.tsx`:

```typescript
// Add state
const [isBackfillingAgentInfo, setIsBackfillingAgentInfo] = useState(false);

// Add mutation
const backfillAgentInfoMutation = useMutation({
  mutationFn: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${supabase.supabaseUrl}/functions/v1/backfill-agent-info`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to backfill agent info');
    }

    return await response.json();
  },
  onSuccess: (data) => {
    toast({
      title: "Agent Info Backfilled!",
      description: `Updated ${data.updated} properties. Success rate: ${data.successRate}`,
    });
    queryClient.invalidateQueries({ queryKey: ["properties"] });
    setIsBackfillingAgentInfo(false);
  },
  onError: (error: any) => {
    toast({
      title: "Backfill Failed",
      description: error.message,
      variant: "destructive",
    });
  },
});

// Add button (place next to "Add Property" button)
<Button
  onClick={() => backfillAgentInfoMutation.mutate()}
  disabled={backfillAgentInfoMutation.isPending}
  variant="outline"
  size="lg"
>
  {backfillAgentInfoMutation.isPending ? (
    <>Loading...</>
  ) : (
    <>
      <Phone className="mr-2 h-5 w-5" />
      Backfill Agent Info
    </>
  )}
</Button>
```

## Response Format

```json
{
  "message": "Agent info backfill completed",
  "processed": 150,
  "updated": 123,
  "skipped": 27,
  "successRate": "82%"
}
```

## Features

- ✅ **Smart Processing**: Only processes properties with missing agent info
- ✅ **Batch Processing**: Handles 50 addresses at a time to respect API limits
- ✅ **Company-Scoped**: Only updates properties for your company
- ✅ **Safe Limits**: Processes max 500 properties per run (can be run multiple times)
- ✅ **Detailed Logging**: Shows progress and results for each batch
- ✅ **Error Handling**: Continues processing even if some properties fail

## Logs

When running, you'll see detailed logs in Supabase Functions dashboard:

```
🔄 BACKFILLING AGENT INFO FOR COMPANY: abc-123-def

📋 Found 150 properties needing agent info

📋 Prepared 150 addresses for scraping

📦 Processing batch 1 (50 addresses)...
   Making Apify API call to actor ENK9p4RZHg0iVso52...
   ✅ Run started: abc123
   📊 Status: RUNNING (5/60)
   ✅ Retrieved 48 detailed records

📋 Mapped 96 address keys

🔄 Updating properties...
   ✅ Updated 1234 Main St - Name: John Smith, Phone: 216-555-0123
   ✅ Updated 5678 Elm St - Name: Jane Doe, Phone: 216-555-9999
   ⚠️ No agent info found for 9012 Oak Ave

📊 BACKFILL COMPLETE
   ✅ Updated: 123
   ⚠️ Skipped: 27
   📈 Success rate: 82%
```

## Troubleshooting

### No properties updated
**Cause**: All properties already have agent info
**Check**: Query the database for properties with `seller_agent_name IS NULL`

### Low success rate (< 50%)
**Cause**: Address matching issues or actor returning incomplete data
**Solution**: Check the logs to see which addresses failed to match

### Actor API errors
**Cause**: Invalid actor ID or Apify token
**Solution**: Verify `APIFY_API_TOKEN` is set in Supabase environment variables

### Timeout errors
**Cause**: Processing too many properties at once
**Solution**: Function processes max 500 per run. Run multiple times if needed.

## Running Multiple Times

If you have more than 500 properties, run the function multiple times:

1. First run: processes first 500 properties missing agent info
2. Second run: processes next 500
3. Continue until all properties are updated

The function automatically only processes properties with missing agent info.

## Cost Considerations

- Each batch of 50 addresses = 1 Apify actor run
- 150 properties = ~3 actor runs
- Check your Apify usage dashboard for costs
- Function execution time: ~5-10 minutes for 500 properties

## Notes

- ⚠️ The function processes properties with `seller_agent_name IS NULL OR seller_agent_phone IS NULL`
- ⚠️ If a property has no agent info in Zillow, it will be skipped
- ⚠️ Some properties (like auctions, FSBOs) may not have agent info
- ✅ The function is safe to run multiple times
- ✅ It won't re-process properties that already have agent info

---

## Quick Start

**Fastest way to backfill all properties:**

1. Deploy the function:
   ```bash
   supabase functions deploy backfill-agent-info
   ```

2. Open your app in browser, go to Properties page

3. Open console (F12) and run:
   ```javascript
   const { data: { session } } = await supabase.auth.getSession();
   
   const response = await fetch(
     window.location.origin.replace('localhost:5173', 'YOUR_PROJECT_REF.supabase.co') + '/functions/v1/backfill-agent-info',
     {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${session.access_token}`,
         'Content-Type': 'application/json'
       }
     }
   );
   
   const result = await response.json();
   console.log('✅ Result:', result);
   ```

4. Check Supabase Functions logs to see progress

5. Refresh your Properties page to see updated agent info!

🎉 Done!

