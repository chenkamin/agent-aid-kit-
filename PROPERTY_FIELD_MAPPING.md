# Property Field Mapping Guide

## Agent Information Extraction

### From `listedBy` Array
The agent information is nested in the `listedBy` array with this structure:

```json
{
  "listedBy": [
    {
      "id": "LISTING_AGENT",
      "elements": [
        { "id": "NAME", "text": "Yukichi \"kee Hagins" },
        { "id": "PHONE", "text": "864-915-2926" },
        { "id": "EMAIL", "text": "agent@example.com" }  // If available
      ]
    },
    {
      "id": "BROKER",
      "elements": [
        { "id": "NAME", "text": "Realty One Group Freedom" }
      ]
    }
  ]
}
```

### Extraction Logic
```typescript
// 1. Find LISTING_AGENT section
const listingAgentSection = detailedData.listedBy.find(
  section => section.id === 'LISTING_AGENT'
);

// 2. Extract from elements array
agentName  = elements.find(el => el.id === 'NAME')?.text
agentPhone = elements.find(el => el.id === 'PHONE')?.text
agentEmail = elements.find(el => el.id === 'EMAIL')?.text
```

## Current Field Mappings

### ✅ Already Implemented
| Zillow Search Field | Database Field | Notes |
|---------------------|----------------|-------|
| `detailUrl` / `url` | `listing_url` | Property URL |
| `price` / `unformattedPrice` | `price` | Listing price |
| `beds` / `bedrooms` | `bedrooms` / `bed` | Number of bedrooms |
| `baths` / `bathrooms` | `bathrooms` / `bath` | Number of bathrooms |
| `livingArea` / `area` | `square_footage` / `living_sqf` | Square footage |
| `homeType` / `propertyType` | `home_type` | Normalized to: Single Family, Multi Family, Condo, etc. |
| `homeStatus` / `statusText` | `status` | For Sale, Sold, etc. |
| `daysOnZillow` | `days_on_market` | Days listed |
| `listedBy[LISTING_AGENT].NAME` | `seller_agent_name` | Agent name |
| `listedBy[LISTING_AGENT].PHONE` | `seller_agent_phone` | Agent phone |
| `listedBy[LISTING_AGENT].EMAIL` | `seller_agent_email` | Agent email |

### Address Extraction (from URL)
The URL is parsed to extract:
- `address` - Street address
- `city` - City name
- `state` - State abbreviation
- `zip` - Zip code

Example URL: 
```
https://www.zillow.com/homedetails/6215-Hosmer-Ave-Cleveland-OH-44105/33423858_zpid/
                                      └─address─┘ └─city─┘└state┘└zip┘
```

## 🔧 Additional Fields You Might Want to Map

### From Detailed Property Data

Here are other fields commonly available from the property details scraper:

#### Property Details
```typescript
// Lot size
lotAreaValue: number           → Could map to `lot_size`
lotAreaUnit: string            → Usually "sqft" or "acres"

// Year built
yearBuilt: number              → Could map to `year_built`

// Property tax
taxAssessedValue: number       → Could map to `tax_assessed_value`
annualHomeownerInsurance: number → Could map to `insurance_estimate`

// HOA
monthlyHoaFee: number          → Could map to `hoa_fees`

// Zestimate
zestimate: number              → Could map to `zestimate` (already in search)
rentZestimate: number          → Could map to `rent_estimate`
```

#### Additional Agent/Broker Info
```typescript
// From listedBy[BROKER]
brokerName: string             → Could map to `broker_name`
brokerLicense: string          → Could map to `broker_license`
```

#### Property Features
```typescript
// From resoFacts or other sections
parking: string                → e.g., "2 car garage"
cooling: string                → e.g., "Central"
heating: string                → e.g., "Forced air"
appliances: string[]           → Array of included appliances
```

## 📊 Example: Full Property Details Structure

```json
{
  "zpid": "33423858",
  "address": "6215 Hosmer Ave",
  "city": "Cleveland",
  "state": "OH",
  "zipcode": "44105",
  "price": 0,
  "bedrooms": 2,
  "bathrooms": 1,
  "livingArea": 864,
  "homeType": "SINGLE_FAMILY",
  "daysOnZillow": 22,
  "zestimate": 51800,
  "rentZestimate": 1078,
  "taxAssessedValue": 49400,
  "lotAreaValue": 4791.6,
  "lotAreaUnit": "sqft",
  "yearBuilt": 1920,
  
  "listedBy": [
    {
      "id": "LISTING_AGENT",
      "elements": [
        { "id": "NAME", "text": "John Smith" },
        { "id": "PHONE", "text": "216-555-0123" },
        { "id": "EMAIL", "text": "john@realty.com" }
      ]
    },
    {
      "id": "BROKER",
      "elements": [
        { "id": "NAME", "text": "ABC Realty" },
        { "id": "PHONE", "text": "216-555-9999" }
      ]
    }
  ]
}
```

## 🎯 How to Add More Fields

If you want to map additional fields:

### 1. Add to Database Schema
```sql
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS lot_size NUMERIC,
  ADD COLUMN IF NOT EXISTS year_built INTEGER,
  ADD COLUMN IF NOT EXISTS broker_name TEXT;
```

### 2. Update TypeScript Types
In `src/integrations/supabase/types.ts`, add to the `properties` table types.

### 3. Update Scraping Function
In `functions/scrape-zillow/index.ts`, add to the `newListings.push()` section:

```typescript
newListings.push({
  // ... existing fields ...
  
  // New fields from detailed data
  lot_size: parseNumber(detailedData?.lotAreaValue),
  year_built: parseInteger(detailedData?.yearBuilt),
  broker_name: getBrokerName(detailedData?.listedBy),
  // ... etc
});
```

### 4. Helper Function for Broker
```typescript
function getBrokerName(listedBy: any[]): string | null {
  if (!listedBy || !Array.isArray(listedBy)) return null;
  
  const brokerSection = listedBy.find(s => s.id === 'BROKER');
  if (!brokerSection?.elements) return null;
  
  const nameElement = brokerSection.elements.find(el => el.id === 'NAME');
  return nameElement?.text || null;
}
```

## 📝 Notes

1. **Field Availability**: Not all properties will have all fields. Always use fallbacks and null checks.

2. **Data Types**: Use appropriate parsing:
   - `parseNumber()` for decimals (price, sqft, etc.)
   - `parseInteger()` for whole numbers (beds, year, etc.)
   - Direct string assignment for text fields

3. **Arrays**: Some fields might be arrays (like appliances). Consider storing as JSONB or comma-separated strings.

4. **Nested Data**: Always check if nested objects exist before accessing:
   ```typescript
   detailedData?.listedBy?.[0]?.elements?.[0]?.text
   ```

5. **Console Logging**: Add logs for new fields to help with debugging:
   ```typescript
   console.log(`🏠 Lot size: ${lotSize}, Year: ${yearBuilt}`);
   ```

## 🔍 Debugging Tips

To see all available fields in your scraper's output:

```typescript
if (detailedData) {
  console.log('📦 Full detailed data:', JSON.stringify(detailedData, null, 2));
}
```

This will show you exactly what fields are available in your specific Apify actor's output.

