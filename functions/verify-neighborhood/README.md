# Verify Neighborhood Edge Function

This edge function uses OpenAI to verify if a property address is located in one of the specified neighborhoods.

## Purpose

When a buy box has `filter_by_neighborhoods` enabled, this function is called to verify each property's location using AI, providing more accurate neighborhood matching than simple string comparison.

## Environment Variables

Required:
- `OPENAI_API_KEY` - Your OpenAI API key

## Request Body

```json
{
  "address": "123 Main St",
  "city": "Cleveland",
  "state": "OH",
  "neighborhoods": ["Tremont", "Ohio City", "Downtown"]
}
```

## Response

```json
{
  "address": "123 Main St, Cleveland, OH",
  "neighborhoods": ["Tremont", "Ohio City", "Downtown"],
  "isInNeighborhood": true,
  "matchedNeighborhood": "Tremont",
  "raw_response": "Tremont"
}
```

Or if not in any neighborhood:

```json
{
  "address": "456 Oak Ave, Cleveland, OH",
  "neighborhoods": ["Tremont", "Ohio City", "Downtown"],
  "isInNeighborhood": false,
  "matchedNeighborhood": null,
  "raw_response": "NO"
}
```

## Usage

This function is automatically called by:
- `scrape-zillow` - when creating new property listings with neighborhood filter
- `update-properties-daily` - when updating existing properties with neighborhood filter

## How it works

1. Receives a property address and list of target neighborhoods
2. Uses OpenAI GPT-4o-mini to determine if the address is in any of the neighborhoods
3. Returns:
   - `isInNeighborhood`: boolean indicating if property is in any neighborhood
   - `matchedNeighborhood`: the specific neighborhood name (or null if not matched)
4. The matched neighborhood is stored in the `neighborhood` field of the properties table

## Notes

- Uses GPT-4o-mini for cost efficiency
- Temperature set to 0.1 for consistent results
- Defaults to "NO" on errors or ambiguous cases
- Returns the specific neighborhood name (not just YES/NO)
- The matched neighborhood is stored in properties table for future reference
- Provides detailed logging for debugging


