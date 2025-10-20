# Fix: "Lot" Home Type Enum Error

## Issue
Properties with home type "Lot" (land/vacant lots) were failing to insert into the database with error:
```
❌ Error inserting property 21181 Ball Ave: invalid input value for enum home_type: "Lot"
❌ Error inserting property 26171 Shoreview Ave: invalid input value for enum home_type: "Lot"
❌ Error inserting property 1545 E 214th St: invalid input value for enum home_type: "Lot"
```

Result: **3 properties scraped but 0 inserted** (all failed due to enum mismatch)

## Root Cause
The `normalizeHomeType()` function was returning `"Lot"` for land/vacant lot properties, but the database enum only accepts `"Land"`:

**Database enum values:**
- Single Family
- Multi Family
- Condo
- Townhouse
- **Land** ✅
- Commercial
- Other

**Function was returning:**
```typescript
if (type.includes('land') || type.includes('lot')) {
  return 'Lot';  // ❌ Not in enum!
}
```

## Solution
Updated the `normalizeHomeType()` function in **both** scraping functions to return `"Land"` instead of `"Lot"`:

### Files Modified
1. **`functions/scrape-zillow/index.ts`** (line 130)
2. **`functions/update-properties-daily/index.ts`** (line 76)

### Change
```typescript
if (type.includes('land') || type.includes('lot')) {
  return 'Land';  // ✅ Matches database enum
}
```

## Result
- Lot/Land properties will now insert successfully
- Properties **without agent info** are still inserted (agent fields are optional and set to null)
- The scraper will now report accurate counts:
  - ✅ Successful inserts
  - ⚠️ Duplicates skipped
  - ❌ Actual errors (not enum mismatches)

## Testing
After this fix, scraping zip codes with vacant lots should work correctly:
```
✅ Insert complete: 3 successful, 0 duplicates skipped, 0 errors
```

## Notes
- Agent information (seller_agent_name, seller_agent_phone, seller_agent_email) is **optional**
- Properties without agent info are inserted with these fields as `null`
- The message "Properties without agent info: 0" is informational, not an error
- Lot properties are common in real estate searches and should be captured for investment analysis

