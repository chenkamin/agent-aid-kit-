# City/Neighborhood Filtering Feature

## Problem Solved
Zip codes often span multiple cities. For example:
- **44105** includes both **Garfield Heights** and **Cleveland**
- **44125** includes properties from multiple cities
- **44128** spans across different neighborhoods

When you want properties only from **Garfield Heights** but not Cleveland, you need city/neighborhood filtering.

## Solution
Added a **City/Neighborhood Match Filter** option to Buy Boxes that filters properties to match only the specified cities or neighborhoods - even when zip codes span multiple areas.

## How It Works

### 1. Setup Your Buy Box
1. Go to **Buy Box** page or **Create List** in Properties
2. Add your **Cities** (e.g., "Garfield Heights")
3. Add your **Neighborhoods** (optional)
4. Add your **Zip Codes** (e.g., "44105, 44125, 44128")
5. **Enable** the "🎯 Filter by City/Neighborhood Match" toggle

### 2. What Happens
- Scraper fetches all properties in those zip codes
- **Automatically filters** to only include properties where:
  - City matches your specified cities (case-insensitive), OR
  - Neighborhood matches your specified neighborhoods (case-insensitive)
- Properties from other cities in the same zip are excluded

### 3. Case Sensitivity
All comparisons are **case-insensitive** and **trimmed**:
- "Garfield Heights" = "garfield heights" = "GARFIELD HEIGHTS"
- "Cleveland" = "cleveland" = "CLEVELAND"

## Example Use Case

### Scenario: Garfield Heights Properties Only
```
Zip Codes: 44105, 44125, 44128
Cities: Garfield Heights
Filter by City Match: ✅ Enabled
```

**Result:**
- ✅ Properties in Garfield Heights from any of these zips
- ❌ Properties in Cleveland from these zips (filtered out)
- ❌ Properties in other cities from these zips (filtered out)

### Scenario: Multiple Cities
```
Zip Codes: 44105, 44125
Cities: Garfield Heights, Maple Heights
Filter by City Match: ✅ Enabled
```

**Result:**
- ✅ Properties in Garfield Heights
- ✅ Properties in Maple Heights
- ❌ All other cities (filtered out)

### Scenario: Neighborhood-Specific
```
Zip Codes: 78701, 78702
Neighborhoods: Downtown, East Side
Filter by City Match: ✅ Enabled
```

**Result:**
- ✅ Properties in Downtown neighborhood
- ✅ Properties in East Side neighborhood
- ❌ All other neighborhoods (filtered out)

## UI Features

### In Buy Box Form
- Toggle switch with helpful description
- Shows which cities/neighborhoods will be filtered for
- Disabled if no cities or neighborhoods are specified
- Warning if trying to enable without cities/neighborhoods

### In Create List Modal (Properties Page)
- Same toggle functionality
- Compact grid layout for easy selection
- Real-time feedback on selected options

## Technical Implementation

### Database
**Migration:** `20251016120000_add_city_filter_option.sql`
```sql
ALTER TABLE public.buy_boxes 
  ADD COLUMN IF NOT EXISTS filter_by_city_match BOOLEAN DEFAULT false;
```

### Filtering Logic (Both Scraping & Daily Updates)
```typescript
// Normalize to lowercase for comparison
const allowedCities = buyBox.cities.map(c => c.toLowerCase().trim());
const allowedNeighborhoods = buyBox.neighborhoods.map(n => n.toLowerCase().trim());

// Filter properties
properties = properties.filter(prop => {
  const propCity = addressData.city.toLowerCase().trim();
  const propNeighborhood = prop.neighborhood.toLowerCase().trim();
  
  const cityMatches = allowedCities.includes(propCity);
  const neighborhoodMatches = allowedNeighborhoods.includes(propNeighborhood);
  
  // Pass if either city OR neighborhood matches
  return (allowedCities.length > 0 && cityMatches) || 
         (allowedNeighborhoods.length > 0 && neighborhoodMatches);
});
```

### Files Modified
1. **src/pages/BuyBox.tsx**
   - Added toggle UI
   - State management for filter option
   - Visual feedback

2. **src/pages/Properties.tsx**
   - Added to Create List modal
   - Integrated with list creation

3. **functions/scrape-zillow/index.ts**
   - City/neighborhood filtering logic
   - Case-insensitive matching
   - Detailed logging

4. **functions/update-properties-daily/index.ts**
   - Same filtering for daily updates
   - Ensures consistency

5. **supabase/migrations/20251016120000_add_city_filter_option.sql**
   - Database schema update

## Benefits

1. **Precision**: Get exactly the properties you want
2. **No Manual Filtering**: Automatic filtering during scraping
3. **Saves Time**: Don't review irrelevant properties
4. **Saves Money**: Fewer API calls for unwanted properties
5. **Consistency**: Applied to both initial scraping and daily updates
6. **Flexible**: Works with cities, neighborhoods, or both

## Logging

When enabled, you'll see detailed logs:
```
🎯 Filtering by city/neighborhood match
   Cities: Garfield Heights
   Neighborhoods: none
  ✅ PASS - City: "garfield heights" - Match found
  ❌ FILTERED OUT - City: "cleveland" - No match
📊 After city/neighborhood filtering: 45 of 78 properties passed
```

## When to Use

✅ **Use This Filter When:**
- Zip codes span multiple cities
- You want specific neighborhoods only
- You're targeting a particular city within a broader zip code area
- You want to exclude certain areas

❌ **Don't Use When:**
- You want all properties in the zip codes
- Zip codes don't overlap cities
- You're already filtering adequately with other criteria

## Testing

1. Create a Buy Box with overlapping zip codes
2. Add specific city (e.g., "Garfield Heights")
3. Enable city filter
4. Run scraper
5. Check logs - should show filtering in action
6. Verify: Only properties from specified city are imported

