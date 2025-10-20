# Allow Duplicate Properties Per Buy Box

## Issue
Properties could not exist in multiple buy boxes within the same company. The unique constraint was at the company level `(company_id, address, city)`, which prevented different users or buy boxes from tracking the same properties.

## Use Case
- **Multiple users** in a company want to track the same properties
- **Different buy boxes** (lists) within the same company want to include the same property
- Each buy box represents different search criteria/investment strategies

## Solution

### 1. Database Migration (`20251019130000_allow_duplicate_properties_per_buybox.sql`)

**Changed:**
- ❌ **Old:** Unique constraint on `(company_id, address, city)`
- ✅ **New:** Unique constraint on `(buy_box_id, address, city)`

**Result:**
- ✅ Same property CAN exist in multiple buy boxes
- ✅ Same property CANNOT be duplicated within the same buy box
- ✅ Prevents accidental duplicates per list
- ✅ Allows intentional tracking across multiple lists

### 2. Updated Edge Functions

#### `scrape-zillow/index.ts`
**Changed:**
```typescript
// OLD - Company-wide duplicate detection
const { data: existingProperties } = await supabase
  .from('properties')
  .select('id, address, city, listing_url, price, status')
  .eq('company_id', userCompany.company_id);  // ❌ Checks entire company

// NEW - Buy box-specific duplicate detection
const { data: existingProperties } = await supabase
  .from('properties')
  .select('id, address, city, listing_url, price, status')
  .eq('buy_box_id', buyBoxId);  // ✅ Checks only this buy box
```

#### `update-properties-daily/index.ts`
**Changed:**
- Same logic update as scrape-zillow
- Duplicate detection now per buy box
- Allows same property in multiple buy boxes during daily updates

## Behavior Examples

### Before This Change
```
User A creates Buy Box 1 → Scrapes property "123 Main St"
User B creates Buy Box 2 → Tries to scrape "123 Main St"
❌ FAILS: "Duplicate property - already exists in company"
```

### After This Change
```
User A creates Buy Box 1 → Scrapes property "123 Main St" ✅
User B creates Buy Box 2 → Scrapes "123 Main St" ✅
Both users can track the same property independently
```

### Duplicate Prevention (Still Works)
```
User A creates Buy Box 1 → Scrapes property "123 Main St" ✅
User A re-scrapes Buy Box 1 → Finds "123 Main St" again
✅ UPDATES existing property (no duplicate within same buy box)
```

## Benefits

### For Users
- **Track overlapping properties** across different investment strategies
- **Multiple team members** can maintain separate buy boxes with overlapping criteria
- **Different search strategies** (wholesale vs fix-and-flip) can track the same properties

### For the System
- **Maintains data integrity** - no duplicates within a single buy box
- **Enables collaboration** - multiple users can track same market areas
- **Flexible organization** - properties can belong to multiple lists/strategies

## Database Schema

### Unique Indexes After Migration
```sql
-- Primary key (always unique)
CREATE UNIQUE INDEX properties_pkey 
ON properties (id);

-- NEW: Per buy box uniqueness
CREATE UNIQUE INDEX idx_properties_unique_address_per_buybox 
ON properties (buy_box_id, address, city)
WHERE buy_box_id IS NOT NULL 
  AND address <> '' 
  AND city <> '';

-- Legacy: For old properties without buy boxes
CREATE UNIQUE INDEX idx_properties_unique_address_per_user_legacy 
ON properties (user_id, address, city)
WHERE company_id IS NULL 
  AND address <> '' 
  AND city <> '';
```

## Impact on Existing Data

### No Data Loss
- ✅ Existing properties remain unchanged
- ✅ Old duplicate prevention rules removed
- ✅ New rules applied going forward

### Potential Duplicates
After this change, if you scrape the same ZIP codes in multiple buy boxes, you will get duplicate properties across buy boxes. This is **intentional and desired**.

## Testing

To verify the change works:

1. **User A** creates Buy Box 1 with ZIP 44137
2. **User A** scrapes Buy Box 1 → Gets properties
3. **User B** creates Buy Box 2 with ZIP 44137  
4. **User B** scrapes Buy Box 2 → Gets same properties ✅ (Previously would fail)
5. **User B** re-scrapes Buy Box 2 → Updates existing properties, no new duplicates ✅

## Related Files

- `supabase/migrations/20251019130000_allow_duplicate_properties_per_buybox.sql`
- `functions/scrape-zillow/index.ts` (line 320-335)
- `functions/update-properties-daily/index.ts` (line 178-190)
- `functions/update-single-buy-box/index.ts` (will need same update)

## Migration Status
- ✅ Database migration applied successfully
- ✅ `scrape-zillow` updated (ready to deploy)
- ✅ `update-properties-daily` updated  
- ⏳ Need to deploy updated edge functions

