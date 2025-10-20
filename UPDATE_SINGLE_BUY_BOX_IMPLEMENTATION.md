# Update Single Buy Box Edge Function

## Overview

Created a new Edge Function `update-single-buy-box` that updates properties for one specific buy box on-demand. This is a copy of `update-properties-daily` with modifications to accept a `buyBoxId` parameter.

## Files Created

1. **`functions/update-single-buy-box/index.ts`** - Main Edge Function
2. **`functions/update-single-buy-box/README.md`** - Documentation

## Key Differences from update-properties-daily

| Aspect | update-properties-daily | update-single-buy-box |
|--------|------------------------|----------------------|
| **Trigger** | Cron job (automated) | Manual/API call (on-demand) |
| **Input** | None | `{ buyBoxId: "uuid" }` |
| **Scope** | All buy boxes | Single specified buy box |
| **Authorization** | Service role only | User authorization required |
| **Output** | Array of results | Single result object |
| **Use Case** | Daily background updates | User-triggered refresh |

## Logic (Identical to update-properties-daily)

1. ✅ Fetch buy box configuration
2. ✅ Validate company_id (auto-fetch if missing)
3. ✅ Scrape Zillow via Apify with buy box criteria
4. ✅ Apply all filters:
   - Price per sqft filtering
   - Home type filtering
   - City/neighborhood filtering
5. ✅ Parse addresses from URLs
6. ✅ Skip properties with incomplete addresses
7. ✅ Compare with existing properties
8. ✅ Insert new properties (with duplicate handling)
9. ✅ Update existing properties (price/status changes)
10. ✅ Record all changes to property_changes table
11. ✅ Update buy box last_scraped timestamp

## API Usage

### Request
```http
POST /functions/v1/update-single-buy-box
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "buyBoxId": "abc-123-def-456"
}
```

### Response
```json
{
  "message": "Buy box updated successfully",
  "buyBoxId": "abc-123-def-456",
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

## Integration Examples

### Frontend (React/TypeScript)
```typescript
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const refreshBuyBox = async (buyBoxId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke(
      'update-single-buy-box',
      { body: { buyBoxId } }
    );
    
    if (error) throw error;
    
    toast({
      title: "Success!",
      description: `Found ${data.newListings} new properties, updated ${data.updatedListings} existing ones`,
    });
    
    // Refresh the properties list
    queryClient.invalidateQueries(['properties']);
    
  } catch (error) {
    toast({
      title: "Update Failed",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

### Add Refresh Button to Buy Box Card
```tsx
<Button 
  onClick={() => refreshBuyBox(buyBox.id)}
  disabled={isRefreshing}
>
  {isRefreshing ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Updating...
    </>
  ) : (
    <>
      <RefreshCw className="mr-2 h-4 w-4" />
      Refresh Properties
    </>
  )}
</Button>
```

## Benefits

### For Users
- **Immediate updates** - Don't wait for the daily cron job
- **On-demand refresh** - Update after changing buy box filters
- **Faster feedback** - See results immediately after configuration
- **Better UX** - Visual feedback on update progress

### For Developers
- **Testing** - Test single buy boxes without affecting others
- **Debugging** - Easier to trace issues with specific buy boxes
- **Flexibility** - Users control when updates happen
- **Scalability** - Distribute load across user actions vs single cron

## Use Cases

1. **User changes filters** → Click "Refresh" to see new results immediately
2. **User adds new zip codes** → Trigger update to scrape new area
3. **Price drops expected** → Check for updates without waiting for cron
4. **Testing buy box config** → Validate filters work as expected
5. **Onboarding** → Immediate results for new users' first buy box

## Error Handling

The function handles all the same errors as `update-properties-daily`:

✅ Duplicate properties (skipped gracefully)  
✅ Invalid home type enums (normalized)  
✅ Incomplete addresses (skipped with warning)  
✅ Missing company_id (auto-fetched from user)  
✅ Apify failures (clear error messages)  
✅ Database errors (proper error responses)  

## Performance

- **Duration:** 30-90 seconds (typical)
- **Apify scraping:** 20-60 seconds
- **Database operations:** Sequential inserts for error handling
- **Rate limiting:** Respects Apify API limits

## Security

- ✅ Requires user authentication (Authorization header)
- ✅ Service role key for database access (server-side only)
- ✅ CORS enabled for frontend access
- ✅ Validates buy box ownership through company_id

## Next Steps

### Recommended UI Updates

1. **Add Refresh Button** to Buy Box cards or detail pages
2. **Show loading state** during update (spinner + disabled state)
3. **Display results** in a toast notification
4. **Auto-refresh properties** list after successful update
5. **Show last updated** timestamp on buy box card
6. **Add update history** (optional - show recent updates)

### Example Buy Box Card Enhancement
```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>{buyBox.name}</CardTitle>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refreshBuyBox(buyBox.id)}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn(
            "h-4 w-4",
            isRefreshing && "animate-spin"
          )} />
        </Button>
      </div>
    </div>
    <CardDescription>
      Last updated: {formatDistanceToNow(buyBox.last_scraped)} ago
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Buy box details */}
  </CardContent>
</Card>
```

## Deployment

The function will be automatically deployed when you push to your repository (if you have CI/CD set up) or manually deploy using:

```bash
supabase functions deploy update-single-buy-box
```

## Testing

Test the function using curl:
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/update-single-buy-box' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"buyBoxId": "your-buy-box-id"}'
```

Or from the Supabase dashboard Edge Functions page.

