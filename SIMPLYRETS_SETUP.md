# SimplyRETS Setup Guide

## Quick Start (5 minutes)

### Step 1: Set Environment Variables

You need to add SimplyRETS credentials to your Supabase Edge Function environment:

```bash
# Navigate to your project directory
cd your-project

# Set the credentials (use test credentials first)
supabase secrets set SIMPLYRETS_USERNAME=simplyrets
supabase secrets set SIMPLYRETS_PASSWORD=simplyrets
```

**Or via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Edge Functions → Settings
4. Add these secrets:
   - `SIMPLYRETS_USERNAME` = `simplyrets`
   - `SIMPLYRETS_PASSWORD` = `simplyrets`

### Step 2: Deploy the Updated Function

```bash
# Deploy the scrape-zillow function
supabase functions deploy scrape-zillow
```

### Step 3: Test It!

1. Go to your app
2. Navigate to Buy Boxes page
3. Create a new buy box with zip codes: `77096` (test data)
4. Click "Scrape"
5. Should complete in ~2-3 seconds
6. Check that properties have agent contact info

## What Changed?

### Before (Apify):
```
1. Call Apify Zillow Search → Get 200 properties (2 min)
2. Extract addresses → 200 addresses
3. Call Apify Details Scraper → Get agent info (5-8 min)
4. Combine data → Insert into database
⏱️ Total: 7-10 minutes (often timed out)
💰 Cost: ~$210/month
📊 Agent info: ~40% missing
```

### After (SimplyRETS):
```
1. Call SimplyRETS API → Get 200 properties WITH agent info (2-3 sec)
2. Insert into database
⏱️ Total: 2-3 seconds
💰 Cost: $49-99/month (unlimited calls)
📊 Agent info: 100% included
```

## Using Test Data

The integration is configured to work with SimplyRETS test credentials:

**Test Credentials:**
- Username: `simplyrets`
- Password: `simplyrets`

**Test Data Coverage:**
- ~30 sample properties
- Location: Houston, TX area
- Includes all fields (beds, baths, price, agent info)
- Perfect for development and testing

**Test Zip Codes:**
- 77096
- 77027
- 77019

## Moving to Production

### Requirements:
1. Real estate license OR partnership with licensed broker
2. MLS access credentials
3. SimplyRETS account

### Steps:
1. **Sign up for SimplyRETS**
   - Go to https://simplyrets.com
   - Choose your plan ($49-99/month)
   - Connect your MLS

2. **Get Your Credentials**
   - SimplyRETS will provide your production username/password
   - Each MLS has separate credentials

3. **Update Supabase Secrets**
   ```bash
   supabase secrets set SIMPLYRETS_USERNAME=your_prod_username
   supabase secrets set SIMPLYRETS_PASSWORD=your_prod_password
   ```

4. **Redeploy**
   ```bash
   supabase functions deploy scrape-zillow
   ```

5. **Test with Real Zip Codes**
   - Use zip codes from your MLS region
   - Properties will be real, current listings

## Pricing Comparison

### Apify (Old System)
- $49/month base
- ~$0.50 per search
- ~$0.001 per property detail scrape
- **Total for 10 buy boxes/day:** ~$210/month

### SimplyRETS (New System)
- **$49/month** - Unlimited calls, 1 MLS region
- **$99/month** - Unlimited calls, 3 MLS regions
- No per-call charges
- No usage limits
- **Total for 10+ buy boxes/day:** $49/month

**Savings: ~$160/month for typical usage**

## Features Included

✅ **All property details:**
- Address, city, state, zip
- Price, beds, baths, sqft
- Year built, lot size
- Days on market
- MLS number

✅ **Agent contact info:**
- Full name
- Office phone
- Cell phone
- Email address

✅ **All your filters work:**
- Price range
- Price per sqft
- Home types
- Cities
- Neighborhoods (with OpenAI verification)
- Days on market

## Troubleshooting

### "SIMPLYRETS credentials not configured"
**Solution:** Set environment variables as shown in Step 1

### "SimplyRETS API error: 401"
**Problem:** Invalid credentials
**Solution:** Double-check username/password in Supabase secrets

### "SimplyRETS API error: 403"
**Problem:** MLS region not authorized
**Solution:** Verify your SimplyRETS account has access to the MLS for those zip codes

### No properties returned
**Problem:** Zip codes not in test data or your MLS
**Solution:**
- For testing: Use 77096, 77027, 77019
- For production: Use zip codes from your MLS region

### Properties missing agent info
**Problem:** Some MLS listings don't include agent data
**Solution:** This is normal - not all listings have complete agent info in the MLS

## API Rate Limits

SimplyRETS has generous rate limits:

| Plan | Requests/Minute | Daily Limit |
|------|-----------------|-------------|
| **Starter ($49)** | 5 req/min | ~7,200/day |
| **Pro ($99)** | 10 req/min | ~14,400/day |

**Your typical usage:**
- 10 buy boxes × 1 call each = 10 calls/day
- Well under limits ✅

## Support

### SimplyRETS Support
- Documentation: https://docs.simplyrets.com
- Support: support@simplyrets.com
- API Status: https://status.simplyrets.com

### Testing the API Directly

Test that SimplyRETS is working:

```bash
curl -u simplyrets:simplyrets \
  "https://api.simplyrets.com/properties?limit=5"
```

Should return JSON with property data.

## Next Steps

1. ✅ Set up test credentials
2. ✅ Deploy updated function
3. ✅ Test with sample data
4. 📅 Sign up for production account
5. 📅 Connect your MLS
6. 📅 Update to production credentials
7. 📅 Start scraping real listings!

