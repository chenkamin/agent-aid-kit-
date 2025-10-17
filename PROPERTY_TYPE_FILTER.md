# Property Type Multi-Select Filter Feature

## Overview
Added a multi-select filter for property types in Buy Box configuration, allowing users to specify which types of properties they want to target (e.g., only lots, only single-family homes, or any combination).

## Features Implemented

### 1. Multi-Select UI in Buy Box
**File:** `src/pages/BuyBox.tsx`

- Replaced the comma-separated text input with an intuitive checkbox grid
- Added visual property type cards with icons:
  - 🏠 Single Family Home (SFH)
  - 🏘️ Multi Family
  - 🏢 Condo
  - 🏘️ Townhouse
  - 🌳 Lot / Land
  - 🏛️ Apartment
  - 🏬 Commercial

- Shows selected types as badges with icons in the saved Buy Box cards
- Empty selection = all property types allowed (no filtering)

### 2. Enhanced Property Type Recognition
**File:** `functions/scrape-zillow/index.ts`

Updated `normalizeHomeType()` function to recognize:
- "Lot" and "Land" → normalized to "Lot"
- Added "Apartment" type
- All other existing types remain unchanged

### 3. Zillow Scraping Filter
**File:** `functions/scrape-zillow/index.ts`

- Added automatic filtering during scraping process
- Only properties matching selected types are saved to database
- Filtering happens after price/sqft filtering
- Detailed logging shows which properties are filtered out by type

## How It Works

### User Experience
1. **Creating/Editing Buy Box:**
   - User sees a grid of property type checkboxes
   - Click any checkbox to toggle that type on/off
   - Selected types show below the grid
   - Save the Buy Box

2. **Scraping Properties:**
   - When scraping Zillow, only properties matching selected types are imported
   - If no types are selected, all property types are allowed
   - Console logs show filtering in action

3. **Viewing Buy Boxes:**
   - Property types display as colorful badges with icons
   - Easy to see at a glance which types each Buy Box targets

## Example Use Cases

### 1. Land Investor
```
Selected Types: [Lot]
Result: Only vacant lots/land will be scraped and saved
```

### 2. Residential Investor
```
Selected Types: [Single Family, Townhouse]
Result: Only SFH and townhouses, no condos or land
```

### 3. Multi-Family Focus
```
Selected Types: [Multi Family, Apartment]
Result: Only multi-family and apartment buildings
```

### 4. All Types
```
Selected Types: []
Result: No filtering - all property types included
```

## Technical Details

### Database Schema
- Uses existing `buy_boxes.home_types` column (text array)
- No migration needed - column already exists

### Filtering Logic
```typescript
// In scrape-zillow function
if (buyBox.home_types && buyBox.home_types.length > 0) {
  properties = properties.filter(prop => {
    const homeType = normalizeHomeType(prop.homeType || prop.propertyType);
    return buyBox.home_types.includes(homeType);
  });
}
```

### Property Type Normalization
Zillow returns various property type strings. We normalize them:
- "single family", "sfr" → "Single Family"
- "multi family", "duplex" → "Multi Family"
- "condo", "condominium" → "Condo"
- "townhouse", "townhome" → "Townhouse"
- "land", "lot" → "Lot"
- "apartment" → "Apartment"
- "commercial" → "Commercial"
- Everything else → "Other"

## UI Components Used
- `Checkbox` from shadcn/ui
- `Badge` for displaying selected types
- `Label` for form fields
- Grid layout for responsive design

## State Management
```typescript
const [selectedHomeTypes, setSelectedHomeTypes] = useState<string[]>([]);

const toggleHomeType = (type: string) => {
  setSelectedHomeTypes(prev =>
    prev.includes(type)
      ? prev.filter(t => t !== type)
      : [...prev, type]
  );
};
```

## Benefits
1. **Precision:** Only import properties you actually want
2. **Efficiency:** Save database space and reduce clutter
3. **Focus:** Keep your pipeline focused on specific property types
4. **Flexibility:** Combine multiple types or focus on one
5. **Visual:** Easy to see and modify type selections

## Testing
To test the feature:
1. Go to Buy Box page
2. Create/edit a Buy Box
3. Select only "Lot" in Property Types
4. Save
5. Run scraper for this Buy Box
6. Verify: Only lot/land properties are imported
7. Check logs: Should show properties filtered by type

## Logging
When scraping, you'll see detailed logs:
```
🏠 Filtering by property types: Lot, Single Family
  ✅ PASS - Single Family is an allowed type
  ❌ FILTERED OUT - Condo not in allowed types
  ✅ PASS - Lot is an allowed type
📊 After home type filtering: 45 of 78 properties passed
```

