# Update Single Buy Box

Updates properties for a specific buy box on-demand.

## Purpose

This Edge Function is identical to `update-properties-daily` but updates only one specific buy box instead of all buy boxes. This is useful for:

- Manual/on-demand updates triggered by users
- Updating a specific buy box immediately after configuration changes
- Testing/debugging a single buy box without affecting others
- Allowing users to refresh their buy box data via the UI

## Input

**Request body:**
```json
{
  "buyBoxId": "uuid-of-buy-box"
}
```

**Headers:**
- `Authorization`: Bearer token (required for authentication)
- `Content-Type`: application/json

## Output

**Success response:**
```json
{
  "message": "Buy box updated successfully",
  "buyBoxId": "uuid",
  "buyBoxName": "Cleveland Investment Properties",
  "totalScraped": 45,
  "newListings": 3,
  "duplicatesSkipped": 1,
  "updatedListings": 41,
  "skippedCount": 0,
  "errors": 0,
  "success": true
}
```

**Error response:**
```json
{
  "error": "Buy box not found"
}
```

## Logic

The function performs the exact same operations as `update-properties-daily`:

1. **Fetch buy box** - Gets the specific buy box by ID
2. **Validate company** - Ensures the buy box has a company_id
3. **Scrape Zillow** - Uses Apify to scrape properties matching the buy box criteria
4. **Apply filters:**
   - Price per sqft (if enabled)
   - Home types (if specified)
   - City/neighborhood (if enabled)
5. **Compare with existing** - Checks which properties are new vs existing
6. **Insert new properties** - Adds new listings to the database
7. **Update existing properties** - Updates prices/status for existing listings
8. **Record changes** - Logs all property changes to the property_changes table
9. **Update timestamp** - Sets last_scraped on the buy box

## Differences from update-properties-daily

| Feature | update-properties-daily | update-single-buy-box |
|---------|------------------------|----------------------|
| Input | None (processes all) | buyBoxId required |
| Scope | All buy boxes | One specific buy box |
| Use case | Automated cron job | Manual/on-demand updates |
| Authorization | Service role key | User authorization header |
| Output | Array of results for all buy boxes | Single result object |

## Usage Example

### From frontend (Supabase client):
```typescript
const { data, error } = await supabase.functions.invoke('update-single-buy-box', {
  body: { buyBoxId: 'abc-123-def-456' }
});

if (error) {
  console.error('Update failed:', error);
} else {
  console.log(`Updated! ${data.newListings} new, ${data.updatedListings} updated`);
}
```

### From curl:
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/update-single-buy-box' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"buyBoxId": "abc-123-def-456"}'
```

## Environment Variables

Required (same as update-properties-daily):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `APIFY_API_TOKEN` - Apify API token for Zillow scraping

## Performance

- **Duration:** 30-90 seconds (depending on # of properties)
- **Apify wait time:** ~20-60 seconds for scraping to complete
- **Database operations:** Sequential inserts to handle duplicates gracefully

## Error Handling

The function handles:
- Missing buyBoxId → 400 error
- Buy box not found → 400 error
- No company_id → Attempts to fetch from user's team membership
- Duplicate properties → Logs and skips (not counted as errors)
- Invalid addresses → Skips with warning
- Apify failures → Returns error with details
- Database errors → Returns error with details

## Integration with UI

This function can be called from a "Refresh" button in the buy box UI:

```typescript
const handleRefreshBuyBox = async (buyBoxId: string) => {
  setLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke('update-single-buy-box', {
      body: { buyBoxId }
    });
    
    if (error) throw error;
    
    toast.success(`Updated! ${data.newListings} new properties found`);
    // Refresh the properties list
    refetchProperties();
  } catch (error) {
    toast.error(`Failed to update: ${error.message}`);
  } finally {
    setLoading(false);
  }
};
```

