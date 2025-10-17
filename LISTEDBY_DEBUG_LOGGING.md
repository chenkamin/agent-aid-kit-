# ListedBy Debug Logging Guide

## What You'll See in the Logs

After deploying this version, you'll get **complete visibility** into why `listedBy` (agent info) is null. Here's what to look for:

### 1. Address Extraction (10% sample)
```
📍 URL: 1691-Harwich-Rd-Lyndhurst-OH-44124 → "1691 Harwich Rd, Lyndhurst, OH 44124"
```
**Check:** Is the address being parsed correctly now?

### 2. Address Collection
```
🔍 Collecting addresses for detailed scraping...
   ✓ Address 1: 1691 Harwich Rd, Lyndhurst, OH 44124
   ✓ Address 2: 6215 Hosmer Ave, Cleveland, OH 44105
📋 Prepared 85 addresses for detailed scraping
```
**Check:** Are addresses being collected? (should be > 0)

### 3. Detailed Scraping Function Call
```
🚀 Starting detailed property scraping...
   Total addresses to scrape: 85

   🔍 DETAILED SCRAPING FUNCTION CALLED
      Scraping detailed info for 50 properties...
      Actor ID: "YOUR_PROPERTY_DETAILS_ACTOR_ID"
```
**⚠️ CRITICAL CHECK:** Is the Actor ID still `YOUR_PROPERTY_DETAILS_ACTOR_ID`?
- **If YES** → That's your problem! Actor is not configured, returning empty array
- **If NO** → Good, continue checking

### 4. Actor ID Not Configured Error
```
   ⚠️⚠️⚠️ CRITICAL ERROR ⚠️⚠️⚠️
   Property Details Actor ID is NOT configured!
   Agent information will be NULL for all properties.
```
**If you see this:** You MUST configure the actor ID before agent info will work!

### 5. Apify API Call
```
      Making Apify API call...
      API endpoint: https://api.apify.com/v2/acts/YOUR_ACTOR_ID/runs
      Apify response status: 200
```
**Check:**
- Status should be `200` or `201`
- If `404`: Actor ID doesn't exist
- If `401`: API token invalid
- If `403`: Permission denied

### 6. Results Retrieved
```
      Fetching results from dataset...
      Results response status: 200
      ✅ Retrieved 50 detailed property records
      Sample record fields: address, listedBy, price, beds, ...
      Sample has listedBy: true
      Sample listedBy: [{"id":"LISTING_AGENT","elements":[{"id":"NAME","text":"John Smith"}...
```
**Check:**
- `Retrieved X detailed property records` - should be > 0
- `Sample has listedBy: true` - should be true!
- Look at the `Sample listedBy` structure

### 7. Batch Results
```
📦 Processing batch 1 (50 addresses)...
   Sample addresses in batch: 1691 Harwich Rd, Lyndhurst, OH 44124, ...
   ✅ Batch returned 50 results
   Sample result keys: address, listedBy, price, beds, ...
   Sample result has listedBy: true
```
**Check:** `Batch returned X results` should be > 0

### 8. Address Mapping
```
📋 Creating address map from 50 detailed property records...
   Mapping property: 1691 harwich rd, lyndhurst, oh 44124
     All address variants: 1691 harwich rd, lyndhurst, oh 44124 | 1691 harwich rd
✅ Mapped 100 unique address keys to detailed property data
```

### 9. Per-Property Agent Extraction
```
🔎 AGENT INFO EXTRACTION for: 1691 Harwich Rd, Lyndhurst, OH 44124
   Address lookup key: "1691 harwich rd, lyndhurst, oh 44124"
   Total detailed records in map: 100

✅ Found detailed data for 1691 Harwich Rd
   Detailed data keys: address, listedBy, price, beds, baths, ...

   🔍 LISTEDBY FIELD INSPECTION:
      - detailedData has 'listedBy': true
      - listedBy is array: true
      - listedBy type: object
   ✓ listedBy array found with 2 sections
   ✓ Full listedBy structure: [
       {
         "id": "LISTING_AGENT",
         "elements": [
           {"id": "NAME", "text": "John Smith"},
           {"id": "PHONE", "text": "216-555-0123"}
         ]
       },
       ...
     ]
     Section 0: id="LISTING_AGENT", elements=2
     Section 1: id="BROKER", elements=1
   ✓ LISTING_AGENT section found with 2 elements
   ✓ LISTING_AGENT full data: {...}
     Element: id="NAME", text="John Smith"
     Element: id="PHONE", text="216-555-0123"
   ✓ Name extracted: "John Smith"
   ✓ Phone extracted: "216-555-0123"
   ⚠️ EMAIL element not found (optional)

📞 ✅ AGENT INFO EXTRACTED - Name: John Smith, Phone: 216-555-0123, Email: null
```

### 10. Problems You Might See

#### Problem: Actor ID Not Configured
```
⚠️⚠️⚠️ CRITICAL ERROR ⚠️⚠️⚠️
Property Details Actor ID is NOT configured!
```
**Solution:** Configure the Actor ID in `functions/scrape-zillow/index.ts` line 150

#### Problem: No Addresses Collected
```
⚠️ WARNING: No valid addresses collected! Agent info will be null for all properties.
```
**Cause:** Address extraction from URLs is failing
**Check:** Look at address parsing logs

#### Problem: Batch Returned Zero Results
```
⚠️ WARNING: Batch returned ZERO results!
```
**Causes:**
- Actor ran but found no properties (check Apify dashboard)
- Actor configuration incorrect (wrong input format)
- Addresses not matching what the actor expects

#### Problem: No listedBy Field
```
❌ NO listedBy field in detailed data
Available fields: address, price, beds, baths, ...
```
**Cause:** The actor you're using doesn't return `listedBy` field
**Solution:** 
1. Check the actor's output in Apify dashboard
2. Verify you're using the right actor
3. May need to adjust field extraction logic

#### Problem: listedBy Not an Array
```
❌ listedBy exists but is NOT an array
listedBy value: "some string or object"
```
**Cause:** Actor returns listedBy in different format
**Solution:** Adjust extraction logic based on actual format

#### Problem: No LISTING_AGENT Section
```
❌ LISTING_AGENT section not found in listedBy array
Available section IDs: BROKER, SELLER, ...
```
**Cause:** Actor uses different section IDs
**Solution:** Check what IDs are available and adjust code

### 11. Success Rate Summary
```
📊 AGENT INFO EXTRACTION SUMMARY:
   ✅ Properties with agent info: 65
   ❌ Properties without agent info: 20
   📈 Success rate: 76%
```
**Target:** Success rate should be > 50%
- 0% → Actor ID not configured or actor not returning data
- 20-50% → Address matching issues
- 50-80% → Normal (some properties don't have agent info)
- 80-100% → Excellent!

## Quick Diagnostic Checklist

When you run "Create & Scrape", check these in order:

1. ☐ **Addresses collected?** Look for "Prepared X addresses" (X > 0)
2. ☐ **Actor ID configured?** Should NOT be `YOUR_PROPERTY_DETAILS_ACTOR_ID`
3. ☐ **Detailed scraping called?** Look for "🔍 DETAILED SCRAPING FUNCTION CALLED"
4. ☐ **Apify API success?** Look for "Apify response status: 200"
5. ☐ **Results returned?** Look for "Retrieved X detailed property records" (X > 0)
6. ☐ **Results have listedBy?** Look for "Sample has listedBy: true"
7. ☐ **Address matching working?** Look for "✅ Found detailed data"
8. ☐ **listedBy extraction working?** Look for "📞 ✅ AGENT INFO EXTRACTED"
9. ☐ **Success rate > 0%?** Look at summary

## Deploy and Test

```bash
# Deploy the updated function
supabase functions deploy scrape-zillow

# Then run "Create & Scrape" and watch the logs
# The logs will tell you EXACTLY what's happening at each step
```

---

**The logging is now extremely detailed for listedBy extraction!** 🔍

Every step is logged so you can pinpoint exactly where the process is failing.

