# Supabase Edge Functions

This directory contains all Supabase Edge Functions for the Agent Aid Kit application.

## Functions Overview

### 1. **scrape-zillow**
Scrapes property listings from Zillow based on buy box criteria.
- **Endpoint**: `/functions/v1/scrape-zillow`
- **Method**: POST
- **Auth**: Required
- **Env Vars**: `APIFY_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### 2. **update-properties-daily**
Cron job that updates all buy boxes daily, checking for property changes.
- **Endpoint**: `/functions/v1/update-properties-daily`
- **Method**: POST (triggered by cron)
- **Auth**: Required
- **Env Vars**: `APIFY_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### 3. **get-zip-codes-from-location**
Converts location names (city, neighborhood, county) to zip codes using AI.
- **Endpoint**: `/functions/v1/get-zip-codes-from-location`
- **Method**: POST
- **Auth**: Required
- **Env Vars**: `OPEN_AI_KEY`

### 4. **generate-template**
Generates email/SMS templates using AI based on user prompts.
- **Endpoint**: `/functions/v1/generate-template`
- **Method**: POST
- **Auth**: Required
- **Env Vars**: `OPEN_AI_KEY`

### 5. **estimate-arv**
Estimates After Repair Value (ARV) for properties using AI vision and comps analysis.
- **Endpoint**: `/functions/v1/estimate-arv`
- **Method**: POST
- **Auth**: Required
- **Env Vars**: `OPEN_AI_KEY`

## Deployment

### Deploy all functions:
```bash
supabase functions deploy
```

### Deploy a single function:
```bash
supabase functions deploy scrape-zillow
```

### Deploy with environment variables:
```bash
supabase secrets set APIFY_API_TOKEN=your_token
supabase secrets set OPEN_AI_KEY=your_key
```

## Development

### Run locally:
```bash
supabase functions serve
```

### Test a function:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/scrape-zillow' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"buyBoxId":"uuid-here"}'
```

## Environment Variables

Required environment variables for each function:

| Function | APIFY_API_TOKEN | OPEN_AI_KEY | SUPABASE_URL | SUPABASE_SERVICE_ROLE_KEY |
|----------|----------------|-------------|--------------|---------------------------|
| scrape-zillow | ✅ | ❌ | ✅ | ✅ |
| update-properties-daily | ✅ | ❌ | ✅ | ✅ |
| get-zip-codes-from-location | ❌ | ✅ | ✅ | ✅ |
| generate-template | ❌ | ✅ | ✅ | ✅ |
| estimate-arv | ❌ | ✅ | ✅ | ✅ |

## Architecture

All functions follow these patterns:
- CORS headers for web requests
- Authentication via Supabase JWT
- Error handling with detailed logging
- TypeScript with Deno runtime
- JSR imports for dependencies

## Monitoring

View function logs:
```bash
supabase functions logs scrape-zillow
```

View live logs:
```bash
supabase functions logs scrape-zillow --tail
```


