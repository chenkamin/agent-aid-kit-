# Apify Zillow Scraping Setup

This document explains how to set up and use the Zillow scraping functionality with Apify.

## Overview

The application uses Apify to scrape property listings from Zillow based on user-defined search criteria (Buy Boxes/Lists). The scraping is performed via a Supabase Edge Function that:

1. Fetches the list criteria from the database
2. Calls the Apify Actor API to scrape Zillow
3. Processes and saves the results to the properties table

## Required Setup

### 1. Get an Apify API Token

1. Sign up for an account at [Apify](https://apify.com)
2. Go to Settings → Integrations → API tokens
3. Create a new API token or copy your existing one
4. The format should be: `apify_api_XXXXXXXXXXXX`

### 2. Configure Supabase Edge Function

You need to add the Apify API token as a secret in your Supabase project:

```bash
# Using Supabase CLI
supabase secrets set APIFY_API_TOKEN=your_apify_api_token_here
```

Or via the Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add a new secret: `APIFY_API_TOKEN`
3. Set the value to your Apify API token

### 3. Apify Actor ID

The application uses the following Apify Actor:
- **Actor ID**: `l7auNT3I30CssRrvO` (Zillow Property Search Actor)
- This actor searches for properties on Zillow based on zip codes and other criteria

## How It Works

### 1. Create a Property List

Users create a "Property List" (Buy Box) with search criteria:
- **Zip Codes**: Array of zip codes to search (e.g., ["44125", "44137"])
- **Max Price**: Maximum property price
- **Days on Zillow**: Optional filter for listing age
- **Listing Type**: For Sale By Agent, For Sale By Owner, For Rent

### 2. Trigger Scraping

From the Lists page, users can click "Scrape Now" to trigger the Apify scraping process:

1. Edge function receives the Buy Box ID
2. Fetches criteria from `buy_boxes` table
3. Calls Apify Actor with search configuration
4. Waits for scraping to complete (max 5 minutes)
5. Fetches results from Apify dataset
6. Maps results to property schema
7. Inserts properties into database

### 3. View Results

Scraped properties appear in the Properties page with:
- Linked to the originating Buy Box via `buy_box_id`
- All property details from Zillow (address, price, beds, baths, etc.)
- Agent information (name, phone, email)

## Database Schema

### Properties Table Fields from Scraping

The scraper populates these fields:

```typescript
{
  user_id: string;           // User who created the list
  buy_box_id: string;        // Reference to the list that generated this property
  address: string;           // Street address
  city: string;              // City
  state: string;             // State
  zip: string;               // Zip code
  price: number;             // Listing price
  bedrooms: number;          // Number of bedrooms
  bathrooms: number;         // Number of bathrooms
  square_footage: number;    // Living area in sq ft
  home_type: string;         // Property type (Single Family, Condo, etc.)
  status: string;            // Property status (For Sale, Sold, etc.)
  days_on_market: number;    // Days listed on Zillow
  listing_url: string;       // Zillow property URL
  seller_agent_name: string; // Listing agent name
  seller_agent_phone: string;// Agent phone
  seller_agent_email: string;// Agent email
}
```

## API Reference

### Edge Function: `/functions/v1/scrape-zillow`

**Method**: POST

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <supabase_auth_token>
```

**Request Body**:
```json
{
  "buyBoxId": "uuid-of-buy-box"
}
```

**Response** (Success):
```json
{
  "message": "Properties scraped and saved successfully",
  "count": 15,
  "buyBoxName": "Cleveland Investment Properties",
  "properties": [...]
}
```

**Response** (Error):
```json
{
  "error": "Error message here"
}
```

## Usage Example

```typescript
// Trigger scraping from frontend
const scrapeProperties = async (buyBoxId: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${supabase.supabaseUrl}/functions/v1/scrape-zillow`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ buyBoxId }),
    }
  );
  
  const result = await response.json();
  console.log(`Scraped ${result.count} properties`);
};
```

## Limitations & Notes

1. **Scraping Duration**: The edge function waits up to 5 minutes for Apify to complete. If scraping takes longer, it will timeout.

2. **Apify Costs**: Apify charges based on compute units used. Monitor your usage in the Apify dashboard.

3. **Rate Limits**: Zillow may rate limit requests. If you encounter errors, try reducing the number of zip codes or spacing out scraping jobs.

4. **Data Accuracy**: Scraped data is as accurate as what's available on Zillow at the time of scraping.

5. **Duplicate Prevention**: The current implementation does not prevent duplicate properties. Consider adding unique constraints on address fields if needed.

## Troubleshooting

### Error: "APIFY_API_TOKEN not configured"
- Make sure you've set the secret in Supabase (see step 2 above)

### Error: "Apify run did not complete successfully"
- Check your Apify dashboard for run logs
- Verify the Actor ID is correct
- Ensure you have sufficient Apify credits

### Error: "Failed to insert properties"
- Check database permissions
- Verify the property schema matches the data being inserted
- Check Supabase logs for detailed error messages

### No Properties Found
- Verify zip codes are valid
- Check if properties exist in those zip codes on Zillow
- Try broadening search criteria (increase max price, etc.)

## Future Enhancements

Potential improvements:
- Add detailed property scraping (get full property details for each listing)
- Implement duplicate detection/prevention
- Add scheduling for automated scraping
- Support for sold properties comparison
- Batch processing for multiple lists
- Progress notifications during long-running scrapes

