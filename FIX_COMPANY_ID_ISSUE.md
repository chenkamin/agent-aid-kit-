# Fix: Company ID Missing in Daily Update Function

## Problem
The daily update function was failing with the error:
```
❌ Error inserting property: null value in column "company_id" of relation "properties" violates not-null constraint
```

## Root Cause
Some buy boxes in the database were created before the companies migration and don't have a `company_id` set. When these buy boxes try to create new properties, the insert fails because `company_id` is a required field.

## Solution

### Update Properties Daily Function (`functions/update-properties-daily/index.ts`)

Added logic at the start of each buy box processing:

```typescript
// Ensure buy box has company_id, if not try to get it from user's team membership
let companyId = buyBox.company_id;
if (!companyId) {
  console.log(`⚠️ Buy box ${buyBox.name} has no company_id, attempting to fetch from user...`);
  const { data: userCompany } = await supabase
    .from('team_members')
    .select('company_id')
    .eq('user_id', buyBox.user_id)
    .single();
  
  if (userCompany?.company_id) {
    companyId = userCompany.company_id;
    // Update the buy box with the company_id
    await supabase
      .from('buy_boxes')
      .update({ company_id: companyId })
      .eq('id', buyBox.id);
    console.log(`✅ Updated buy box ${buyBox.name} with company_id: ${companyId}`);
  } else {
    console.log(`❌ Skipping buy box ${buyBox.name} - no company found for user ${buyBox.user_id}`);
    // Skip this buy box and continue to the next one
    continue;
  }
}
```

### Zillow Scraper Function (`functions/scrape-zillow/index.ts`)

Added similar safeguard:

```typescript
// Ensure buy box has company_id (should already be set by the query above, but double check)
const companyId = buyBox.company_id || userCompany.company_id;
if (!companyId) {
  throw new Error('No company_id found for buy box or user');
}
```

## How It Works

1. **Check for company_id**: When processing a buy box, check if it has a `company_id`
2. **Fetch from user**: If missing, look up the user's company from their `team_members` record
3. **Update buy box**: Automatically update the buy box with the found `company_id` for future runs
4. **Use for inserts**: Use the resolved `companyId` variable when creating new properties
5. **Skip if not found**: If no company can be found, skip that buy box and log a warning

## Benefits

1. **Automatic migration**: Old buy boxes are automatically updated with company_id on first run
2. **No data loss**: Properties can now be inserted successfully
3. **Better error handling**: Clear logging shows what's happening
4. **Graceful degradation**: If a user truly has no company, the buy box is skipped rather than crashing

## Files Modified

- ✅ `functions/update-properties-daily/index.ts` (lines 145-174)
- ✅ `functions/scrape-zillow/index.ts` (lines 177-181)

## Testing

After deploying these changes, the next daily update run should:
1. Detect any buy boxes without company_id
2. Automatically fix them by fetching from team_members
3. Successfully insert new properties with the correct company_id
4. Log all actions for verification

## Console Output Examples

**Success case:**
```
⚠️ Buy box My Buy Box has no company_id, attempting to fetch from user...
✅ Updated buy box My Buy Box with company_id: 123e4567-e89b-12d3-a456-426614174000
```

**Skip case:**
```
⚠️ Buy box Orphaned Buy Box has no company_id, attempting to fetch from user...
❌ Skipping buy box Orphaned Buy Box - no company found for user 987e6543-e21b-98d7-a654-123456789abc
```

## Next Steps

If you have buy boxes that don't belong to any company:
1. Manually assign them to a company in the database, OR
2. Delete them if they're no longer needed

Query to find buy boxes without company_id:
```sql
SELECT id, name, user_id 
FROM buy_boxes 
WHERE company_id IS NULL;
```

