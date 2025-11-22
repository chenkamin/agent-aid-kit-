# Apify HTML Error Fix

## Issue
The `update-properties-daily` function was failing with the error:
```
❌ Error processing zip code 44110 for buy box WATERLOO: Unexpected token '<', "<html> <h"... is not valid JSON
```

## Root Cause
The Apify API was returning HTML error pages instead of JSON responses in certain cases (rate limiting, temporary service issues, etc.). The code was checking for HTTP status codes but not verifying that the response body was actually JSON before trying to parse it.

When Apify returns a 200 status but with an HTML error page (e.g., CloudFlare error pages, maintenance pages), the `response.json()` call would fail with a confusing JSON parsing error.

## Solution
Added comprehensive content-type checking before attempting to parse JSON responses from Apify API. This is now applied to **all** Apify API calls:

### 1. Initial Scraping Run Start
```typescript
// Check if response is JSON
const runContentType = apifyResponse.headers.get('content-type');
if (!runContentType || !runContentType.includes('application/json')) {
  const responseText = await apifyResponse.text();
  console.error(`❌ Apify returned non-JSON response when starting run`);
  console.error(`   Content-Type: ${runContentType}`);
  console.error(`   Response preview: ${responseText.substring(0, 500)}`);
  throw new Error(`Apify API returned non-JSON response. This usually indicates rate limiting or service issues.`);
}
```

### 2. Scraping Results Fetch
```typescript
// Check if response is actually JSON before parsing
const resultsContentType = resultsResponse.headers.get('content-type');
if (!resultsContentType || !resultsContentType.includes('application/json')) {
  const responseText = await resultsResponse.text();
  console.error(`❌ Apify returned non-JSON response for zip ${zipCode}`);
  console.error(`   Content-Type: ${resultsContentType}`);
  console.error(`   Response preview: ${responseText.substring(0, 500)}`);
  throw new Error(`Apify returned non-JSON response (Content-Type: ${resultsContentType}). This usually means rate limiting or API issues.`);
}
```

### 3. Detailed Property Scraping Start
```typescript
// Check if response is JSON
const detailsContentType = apifyResponse.headers.get('content-type');
if (!detailsContentType || !detailsContentType.includes('application/json')) {
  const responseText = await apifyResponse.text();
  console.error(`      ❌ Apify detailed scraping returned non-JSON when starting run`);
  console.error(`      Content-Type: ${detailsContentType}`);
  console.error(`      Response preview: ${responseText.substring(0, 500)}`);
  return [];
}
```

### 4. Detailed Property Results Fetch
```typescript
// Check if response is actually JSON before parsing
const detailsResultsContentType = resultsResponse.headers.get('content-type');
if (!detailsResultsContentType || !detailsResultsContentType.includes('application/json')) {
  const responseText = await resultsResponse.text();
  console.error(`      ❌ Apify detailed scraping returned non-JSON response`);
  console.error(`      Content-Type: ${detailsResultsContentType}`);
  console.error(`      Response preview: ${responseText.substring(0, 500)}`);
  return [];
}
```

## Benefits

1. **Better Error Messages**: Instead of cryptic JSON parsing errors, we now get clear messages indicating:
   - What type of content was received
   - A preview of the actual response
   - A hint about what the issue might be (rate limiting, service issues)

2. **Graceful Degradation**: For detailed property scraping, we return an empty array instead of crashing, allowing the main scraping to continue even if agent info lookup fails.

3. **Easier Debugging**: The error logs now show:
   - The exact content-type received
   - The first 500 characters of the response
   - Which specific API call failed
   - Which zip code was being processed

4. **Queue Continues**: The queue-based system will mark the zip code as failed with a descriptive error message, but won't crash the entire cron job.

## What to Do When This Error Occurs

When you see this error in the logs:

1. **Check Apify Status**: Visit https://apify.com/status to see if there are any service issues
2. **Check Rate Limits**: Verify your Apify account hasn't hit rate limits
3. **Review Error Message**: The preview will show what Apify actually returned (CloudFlare error, maintenance page, etc.)
4. **Wait and Retry**: The zip code will be retried on the next cron job run
5. **Manual Retry**: You can manually trigger a retry for the specific buy box if needed

## Testing

To test this fix:
1. The next cron job run will automatically use this new error handling
2. If Apify returns HTML again, you'll see clear error messages in the logs
3. The queue will mark the zip code as failed with the descriptive error
4. Other zip codes in the queue will continue processing

## Files Modified

- `functions/update-properties-daily/index.ts` - Added content-type checking to all 4 Apify API response parsing locations


