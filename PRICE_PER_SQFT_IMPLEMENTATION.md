# Price Per Square Foot Filter Implementation

## Overview
Implemented complete price per square foot (PPSF) filtering functionality across the application. Users can now choose to filter properties by either total price or price per square foot.

## Database Changes

### Migration: `20251016000000_add_price_per_sqft_filter.sql`
Added the following columns to `buy_boxes` table:
- `filter_by_ppsf` (boolean, default false) - Toggle between total price and PPSF filtering
- `price_max` (numeric) - Maximum price (interpretation depends on filter_by_ppsf)
- `days_on_zillow` (integer) - Days on market filter
- `for_sale_by_agent` (boolean, default true) - Include agent listings
- `for_sale_by_owner` (boolean, default true) - Include FSBO listings
- `for_rent` (boolean, default false) - Include rental properties
- `assigned_to` (UUID) - User assigned to work this buy box

## Implementation Details

### How It Works

**When `filter_by_ppsf = false` (Total Price Mode - Default):**
- `price_max` is passed directly to Apify as the maximum total price filter
- Apify returns only properties under this total price
- No additional filtering needed

**When `filter_by_ppsf = true` (Price Per SqFt Mode):**
- `price_max` is NOT passed to Apify (to get all properties)
- After receiving results from Apify, the function calculates: `ppsf = price / square_footage`
- Properties are filtered where `ppsf <= price_max`
- Properties without price or square footage data are excluded

### Files Modified

#### 1. `functions/scrape-zillow/index.ts`
✅ **Already had complete implementation**
- Lines 197-212: Conditionally passes `price_max` to Apify based on `filter_by_ppsf` flag
- Lines 273-301: Manual PPSF filtering after scraping
- Detailed logging for transparency

#### 2. `functions/update-properties-daily/index.ts`
✅ **Added complete implementation**
- Line 124: Added `filter_by_ppsf` to select query
- Lines 156-171: Conditionally passes `price_max` to Apify based on flag
- Lines 228-257: Manual PPSF filtering after scraping (mirroring scraper logic)

#### 3. `src/pages/BuyBox.tsx`
✅ **Added UI controls**
- Added `Switch` component import
- Added `filter_by_ppsf` to BuyBox interface
- Added `filterByPpsf` state variable
- Added toggle switch in UI with clear description
- Added `price_max` field with dynamic label based on toggle state
- Display logic shows appropriate labels in saved buy boxes

## User Interface

### Create/Edit Buy Box
```
┌─────────────────────────────────────────┐
│ Filter by Price per Square Foot  [OFF] │
│ When enabled, max price = $/sqft       │
├─────────────────────────────────────────┤
│ Min Price:        [________]            │
│ Max Price:        [________]            │
│ Max Total Price:  [________]            │
│ (for scraper)                           │
└─────────────────────────────────────────┘
```

When toggled ON:
```
┌─────────────────────────────────────────┐
│ Filter by Price per Square Foot  [ON]  │
│ When enabled, max price = $/sqft       │
├─────────────────────────────────────────┤
│ Min Price:                [________]    │
│ Max Price:                [________]    │
│ Max Price per Square Foot: [150____]   │
│ Properties filtered by $/sqft           │
└─────────────────────────────────────────┘
```

### Display Logic
Saved buy boxes show:
- **PPSF Mode**: "Max Price/SqFt: $150/sqft"
- **Total Price Mode**: "Max Scraper Price: $500,000"

## Example Use Cases

### Use Case 1: Total Price Filter (Default)
```javascript
{
  filter_by_ppsf: false,
  price_max: 500000
}
```
→ Apify returns properties under $500,000
→ No additional filtering

### Use Case 2: Price Per SqFt Filter
```javascript
{
  filter_by_ppsf: true,
  price_max: 150
}
```
→ Apify returns all properties (no price filter)
→ Calculate PPSF for each property
→ Filter: Keep only properties where (price / sqft) ≤ $150

**Example:**
- Property A: $300,000 / 2,000 sqft = $150/sqft ✅ PASSES
- Property B: $400,000 / 2,000 sqft = $200/sqft ❌ FILTERED OUT
- Property C: $450,000 / 3,000 sqft = $150/sqft ✅ PASSES

## Testing

### Manual Testing Steps
1. Create a buy box with `filter_by_ppsf = false` and `price_max = 500000`
   - Verify scraper respects total price limit
2. Edit buy box to enable `filter_by_ppsf = true` and set `price_max = 150`
   - Verify scraper calculates PPSF and filters accordingly
3. Check daily update function processes both modes correctly
4. Verify UI displays correct labels and values

### Console Logs
The implementation includes detailed console logging:
```
💰 Price filter mode: Price per SqFt
📏 Will filter by max price per sqft: $150/sqft
🎯 Found 45 properties from Zillow (before filtering)
🔍 Filtering by price per sqft (max: $150/sqft)...
  ✅ PASS - $300,000 / 2000 sqft = $150.00/sqft
  ❌ FILTERED OUT - $400,000 / 2000 sqft = $200.00/sqft (exceeds $150/sqft)
📊 After price per sqft filtering: 32 of 45 properties passed
```

## Benefits

1. **Flexibility**: Users can filter by either total price or price per sqft
2. **Accuracy**: Manual calculation ensures precise filtering
3. **Transparency**: Detailed logging shows exactly why properties pass/fail
4. **User-Friendly**: Clear UI with helpful descriptions
5. **Backwards Compatible**: Defaults to total price mode (existing behavior)

## Notes

- Properties without price or square footage data are automatically excluded in PPSF mode
- The `min_price` and `max_price` fields remain separate for general filtering
- `price_max` is specifically for the scraper filter/PPSF calculation
- Daily update function now has parity with manual scraper function

