# Backfill Agent Info Function

## Purpose

Backfills missing agent contact information (name, phone, email) for existing properties in the database by scraping Zillow property details.

## How It Works

1. Fetches all properties belonging to the user's company that have missing agent info
2. Collects addresses and calls Apify Property Details Actor
3. Extracts agent information from `listedBy` field
4. Updates properties with `seller_agent_name`, `seller_agent_phone`, `seller_agent_email`

## Usage

```bash
# Deploy
supabase functions deploy backfill-agent-info

# Call via curl
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/backfill-agent-info \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or via browser console
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch(
  'https://YOUR_PROJECT.supabase.co/functions/v1/backfill-agent-info',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }
);
console.log(await response.json());
```

## Configuration

**Actor ID**: `ENK9p4RZHg0iVso52` (hardcoded)

**Environment Variables Required**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APIFY_API_TOKEN`

## Limits

- Processes max 500 properties per run
- Batch size: 50 addresses per Apify call
- Only processes properties with missing agent info

## Response

```json
{
  "message": "Agent info backfill completed",
  "processed": 150,
  "updated": 123,
  "skipped": 27,
  "successRate": "82%"
}
```

See `../../BACKFILL_AGENT_INFO.md` for complete documentation.

