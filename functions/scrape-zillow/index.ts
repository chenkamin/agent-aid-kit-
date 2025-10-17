import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === 'undefined') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseInteger(value: any): number | null {
  const num = parseNumber(value);
  return num !== null ? Math.floor(num) : null;
}

function extractAddressFromUrl(url: string) {
  try {
    // Example: https://www.zillow.com/homedetails/1691-Harwich-Rd-Lyndhurst-OH-44124/33423858_zpid/
    const match = url.match(/\/homedetails\/(.+?)\/(\d+)_zpid/);
    if (match && match[1]) {
      const urlPart = match[1];
      const parts = urlPart.split('-');
      
      // Last part is zip, second to last is state
      if (parts.length < 3) {
        console.error(`⚠️ URL format unexpected: ${url}`);
        return { address: '', city: '', state: '', zip: '' };
      }
      
      const zip = parts[parts.length - 1];
      const state = parts[parts.length - 2];
      
      // Everything before state and zip
      const addressAndCity = parts.slice(0, -2);
      
      // Strategy: Cities are typically the LAST 1-2 words before state
      // Common patterns:
      // - "Cleveland" (1 word)
      // - "Maple Heights" (2 words) 
      // - "University Heights" (2 words)
      // Addresses are everything before the city
      
      let cityParts: string[] = [];
      let addressParts: string[] = [];
      
      // Check if last word is likely a city (capitalized, no numbers, common city indicators)
      // For now, assume last 1 word is city if total parts > 3, otherwise last 2 words
      if (addressAndCity.length > 3) {
        // Most common: city is last word, but could be last 2
        // Check if second-to-last looks like part of city name (no numbers, short words like "Heights", "Park")
        const lastWord = addressAndCity[addressAndCity.length - 1];
        const secondToLast = addressAndCity[addressAndCity.length - 2];
        
        // Common multi-word city indicators
        const cityIndicators = ['heights', 'park', 'hills', 'beach', 'city', 'lake', 'springs', 'grove', 'falls'];
        
        if (cityIndicators.includes(lastWord.toLowerCase()) || cityIndicators.includes(secondToLast.toLowerCase())) {
          // Two-word city
          cityParts = addressAndCity.slice(-2);
          addressParts = addressAndCity.slice(0, -2);
        } else {
          // One-word city
          cityParts = addressAndCity.slice(-1);
          addressParts = addressAndCity.slice(0, -1);
        }
      } else {
        // Short format, assume last word is city
        cityParts = addressAndCity.slice(-1);
        addressParts = addressAndCity.slice(0, -1);
      }

      const result = {
        address: addressParts.join(' '),
        city: cityParts.join(' '),
        state: state.toUpperCase(),
        zip: zip
      };
      
      // Log for debugging first few
      if (Math.random() < 0.1) { // Log ~10% of addresses to avoid spam
        console.log(`   📍 URL: ${urlPart} → "${result.address}, ${result.city}, ${result.state} ${result.zip}"`);
      }
      
      return result;
    }
  } catch (e) {
    console.error('❌ Error extracting address from URL:', e);
  }
  return {
    address: '',
    city: '',
    state: '',
    zip: ''
  };
}

function normalizeHomeType(homeType: string): string {
  if (!homeType || homeType === 'undefined') {
    return 'Other';
  }

  const type = homeType.toLowerCase();

  if (type.includes('single') || type.includes('sfr')) {
    return 'Single Family';
  }
  if (type.includes('multi') || type.includes('duplex')) {
    return 'Multi Family';
  }
  if (type.includes('condo')) {
    return 'Condo';
  }
  if (type.includes('town')) {
    return 'Townhouse';
  }
  if (type.includes('land') || type.includes('lot')) {
    return 'Lot';
  }
  if (type.includes('commercial')) {
    return 'Commercial';
  }
  if (type.includes('apartment')) {
    return 'Apartment';
  }

  // Only log when we can't normalize a non-empty type
  console.log(`⚠️ Unknown home type: "${homeType}" - defaulting to "Other"`);
  return 'Other';
}

async function scrapePropertyDetails(addresses: string[], apifyToken: string) {
  console.log(`\n   🔍 DETAILED SCRAPING FUNCTION CALLED`);
  console.log(`      Scraping detailed info for ${addresses.length} properties...`);
  
  // Apify Property Details Actor ID - CONFIGURED
  const PROPERTY_DETAILS_ACTOR_ID = 'ENK9p4RZHg0iVso52';
  
  console.log(`      Actor ID: "${PROPERTY_DETAILS_ACTOR_ID}"`);
  
  const detailsConfig = {
    addresses: addresses,
    extractBuildingUnits: "all",
    propertyStatus: "FOR_SALE"
  };

  console.log(`      Making Apify API call...`);
  console.log(`      API endpoint: https://api.apify.com/v2/acts/${PROPERTY_DETAILS_ACTOR_ID}/runs`);
  console.log(`      Config: ${JSON.stringify(detailsConfig).substring(0, 200)}...`);

  const apifyResponse = await fetch(
    `https://api.apify.com/v2/acts/${PROPERTY_DETAILS_ACTOR_ID}/runs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apifyToken}`
      },
      body: JSON.stringify(detailsConfig)
    }
  );

  console.log(`      Apify response status: ${apifyResponse.status}`);

  if (!apifyResponse.ok) {
    const errorText = await apifyResponse.text();
    console.error(`      ❌ Property details API error: ${apifyResponse.status}`);
    console.error(`      Error details: ${errorText.substring(0, 500)}`);
    return [];
  }

  const runData = await apifyResponse.json();
  const runId = runData.data.id;
  const defaultDatasetId = runData.data.defaultDatasetId;

  console.log(`✅ Property details scrape started: ${runId}`);

  // Wait for completion
  let runStatus = 'RUNNING';
  let attempts = 0;
  const maxAttempts = 60;

  while (runStatus === 'RUNNING' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}`,
      { headers: { 'Authorization': `Bearer ${apifyToken}` } }
    );

    const statusData = await statusResponse.json();
    runStatus = statusData.data.status;
    attempts++;

    console.log(`📊 Details scraping status: ${runStatus} (attempt ${attempts}/${maxAttempts})`);
  }

  if (runStatus !== 'SUCCEEDED') {
    console.error(`⚠️ Property details scraping failed: ${runStatus}`);
    return [];
  }

  console.log(`      Fetching results from dataset...`);
  const resultsResponse = await fetch(
    `https://api.apify.com/v2/datasets/${defaultDatasetId}/items`,
    { headers: { 'Authorization': `Bearer ${apifyToken}` } }
  );

  console.log(`      Results response status: ${resultsResponse.status}`);

  if (!resultsResponse.ok) {
    const errorText = await resultsResponse.text();
    console.error(`      ❌ Failed to fetch property details: ${resultsResponse.status}`);
    console.error(`      Error: ${errorText.substring(0, 500)}`);
    return [];
  }

  const detailedProperties = await resultsResponse.json();
  console.log(`      ✅ Retrieved ${detailedProperties.length} detailed property records`);
  
  if (detailedProperties.length > 0) {
    const sample = detailedProperties[0];
    console.log(`      Sample record fields: ${Object.keys(sample).join(', ')}`);
    console.log(`      Sample has listedBy: ${!!sample.listedBy}`);
    if (sample.listedBy) {
      console.log(`      Sample listedBy: ${JSON.stringify(sample.listedBy).substring(0, 300)}...`);
    }
  }
  
  return detailedProperties;
}

async function triggerARVEstimation(propertyId: string, listingUrl: string, authHeader: string) {
  try {
    console.log(`🔮 Triggering ARV estimation for property ${propertyId}`);
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/estimate-arv`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ propertyId, listingUrl })
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ ARV estimated for ${propertyId}: $${result.arv_estimate}`);
    } else {
      console.log(`⚠️ ARV estimation failed for ${propertyId}`);
    }
  } catch (error) {
    console.log(`⚠️ ARV estimation error for ${propertyId}:`, error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { buyBoxId } = await req.json();
    if (!buyBoxId) throw new Error('buyBoxId is required');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Get user's company
    const { data: userCompany, error: companyError } = await supabase
      .from('team_members')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (companyError || !userCompany) throw new Error('No company found for user');

    const { data: buyBox, error: buyBoxError } = await supabase
      .from('buy_boxes')
      .select('*')
      .eq('id', buyBoxId)
      .eq('company_id', userCompany.company_id)
      .single();

    if (buyBoxError || !buyBox) throw new Error('Buy box not found');

    // Ensure buy box has company_id (should already be set by the query above, but double check)
    const companyId = buyBox.company_id || userCompany.company_id;
    if (!companyId) {
      throw new Error('No company_id found for buy box or user');
    }

    const apifyToken = Deno.env.get('APIFY_API_TOKEN');
    if (!apifyToken) throw new Error('APIFY_API_TOKEN not configured');

    // Get existing properties for this COMPANY (not just buy box) - CHECK BY ADDRESS + CITY
    console.log('📊 Fetching existing properties for this company...');
    const { data: existingProperties } = await supabase
      .from('properties')
      .select('id, address, city, listing_url, price, status')
      .eq('company_id', userCompany.company_id);

    // Create two maps: one by address+city (for duplicate prevention), one by URL (for updates)
    const existingByAddress = new Map(
      (existingProperties || []).map(p => [`${p.address}|${p.city}`.toLowerCase(), p])
    );
    const existingByUrl = new Map(
      (existingProperties || []).map(p => [p.listing_url, p])
    );

    console.log(`✅ Found ${existingByAddress.size} existing unique properties for this company`);

    // If filtering by price per sqft, don't pass price filter to Apify
    // We'll filter manually after getting all results
    const searchConfig = {
      zipCodes: buyBox.zip_codes || [],
      priceMax: buyBox.filter_by_ppsf ? undefined : (buyBox.price_max || undefined),
      daysOnZillow: buyBox.days_on_zillow || '',
      forSaleByAgent: buyBox.for_sale_by_agent ?? true,
      forSaleByOwner: buyBox.for_sale_by_owner ?? true,
      forRent: buyBox.for_rent ?? false,
      sold: false
    };

    console.log(`💰 Price filter mode: ${buyBox.filter_by_ppsf ? 'Price per SqFt' : 'Total Price'}`);
    if (buyBox.filter_by_ppsf && buyBox.price_max) {
      console.log(`📏 Will filter by max price per sqft: $${buyBox.price_max}/sqft`);
    }

    const apifyResponse = await fetch(
      `https://api.apify.com/v2/acts/l7auNT3I30CssRrvO/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apifyToken}`
        },
        body: JSON.stringify(searchConfig)
      }
    );

    if (!apifyResponse.ok) {
      throw new Error(`Apify API error: ${apifyResponse.status}`);
    }

    const runData = await apifyResponse.json();
    const runId = runData.data.id;
    const defaultDatasetId = runData.data.defaultDatasetId;

    console.log(`✅ Apify run started: ${runId}`);

    // Wait for completion
    let runStatus = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 60;

    while (runStatus === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const statusResponse = await fetch(
        `https://api.apify.com/v2/acts/l7auNT3I30CssRrvO/runs/${runId}`,
        { headers: { 'Authorization': `Bearer ${apifyToken}` } }
      );

      const statusData = await statusResponse.json();
      runStatus = statusData.data.status;
      attempts++;

      console.log(`📊 Scraping status: ${runStatus} (attempt ${attempts}/${maxAttempts})`);
    }

    if (runStatus !== 'SUCCEEDED') {
      throw new Error(`Apify run failed: ${runStatus}`);
    }

    const resultsResponse = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items`,
      { headers: { 'Authorization': `Bearer ${apifyToken}` } }
    );

    if (!resultsResponse.ok) {
      throw new Error(`Failed to fetch results: ${resultsResponse.status}`);
    }

    let properties = await resultsResponse.json();
    console.log(`🎯 Found ${properties.length} properties from Zillow (before filtering)`);
    
    // Debug: Log first property to see structure
    if (properties.length > 0) {
      console.log('📦 Sample property structure:', JSON.stringify({
        homeType: properties[0].homeType,
        propertyType: properties[0].propertyType,
        hdpData_homeType: properties[0].hdpData?.homeInfo?.homeType,
        availableFields: Object.keys(properties[0]).filter(k => k.toLowerCase().includes('type') || k.toLowerCase().includes('home'))
      }, null, 2));
    }

    // If filtering by price per sqft, filter properties based on calculated ppsf
    if (buyBox.filter_by_ppsf && buyBox.price_max) {
      const maxPpsf = parseFloat(buyBox.price_max);
      console.log(`\n🔍 Filtering by price per sqft (max: $${maxPpsf}/sqft)...`);
      
      const originalCount = properties.length;
      let missingDataCount = 0;
      
      properties = properties.filter((prop: any) => {
        const price = parseNumber(prop.price || prop.unformattedPrice || prop.hdpData?.homeInfo?.price);
        const sqft = parseInteger(prop.livingArea || prop.area || prop.hdpData?.homeInfo?.livingArea);
        
        // If we don't have both price and sqft, skip this property
        if (!price || !sqft || sqft === 0) {
          missingDataCount++;
          return false;
        }
        
        const ppsf = price / sqft;
        const passes = ppsf <= maxPpsf;
        
        return passes;
      });
      
      if (missingDataCount > 0) {
        console.log(`⚠️ Skipped ${missingDataCount} properties with missing price/sqft data`);
      }
      console.log(`📊 After price per sqft filtering: ${properties.length} of ${originalCount} properties passed`);
    }

    // Filter by home types if specified
    if (buyBox.home_types && Array.isArray(buyBox.home_types) && buyBox.home_types.length > 0) {
      console.log(`🏠 Filtering by property types: ${buyBox.home_types.join(', ')}`);
      const beforeTypeFilter = properties.length;
      
      // Track types for summary
      const typeCounts: Record<string, number> = {};
      
      properties = properties.filter(prop => {
        // Try multiple possible locations for home type
        const homeTypeValue = prop.homeType || 
                             prop.propertyType || 
                             prop.hdpData?.homeInfo?.homeType ||
                             'undefined';
        
        const homeType = normalizeHomeType(homeTypeValue);
        
        // Count this type
        typeCounts[homeType] = (typeCounts[homeType] || 0) + 1;
        
        const matches = buyBox.home_types.includes(homeType);
        return matches;
      });
      
      console.log(`📊 Property types found:`, typeCounts);
      console.log(`📊 After home type filtering: ${properties.length} of ${beforeTypeFilter} properties passed`);
    }

    // Filter by city/neighborhood match if specified
    if (buyBox.filter_by_city_match && (buyBox.cities?.length > 0 || buyBox.neighborhoods?.length > 0)) {
      console.log(`🎯 Filtering by city/neighborhood match`);
      console.log(`   Cities: ${buyBox.cities?.join(', ') || 'none'}`);
      console.log(`   Neighborhoods: ${buyBox.neighborhoods?.join(', ') || 'none'}`);
      
      const beforeCityFilter = properties.length;
      
      // Normalize cities and neighborhoods to lowercase for comparison
      const allowedCities = (buyBox.cities || []).map(c => c.toLowerCase().trim());
      const allowedNeighborhoods = (buyBox.neighborhoods || []).map(n => n.toLowerCase().trim());
      
      const cityCounts: Record<string, number> = {};
      
      properties = properties.filter(prop => {
        const addressData = extractAddressFromUrl(prop.detailUrl || prop.url || '');
        const propCity = (addressData.city || '').toLowerCase().trim();
        const propNeighborhood = (prop.neighborhood || '').toLowerCase().trim();
        
        // Track cities
        if (propCity) {
          cityCounts[propCity] = (cityCounts[propCity] || 0) + 1;
        }
        
        // Check if city matches
        const cityMatches = allowedCities.length === 0 || allowedCities.includes(propCity);
        // Check if neighborhood matches
        const neighborhoodMatches = allowedNeighborhoods.length === 0 || allowedNeighborhoods.includes(propNeighborhood);
        
        // Property passes if it matches either city OR neighborhood (when both are specified)
        // If only cities specified, must match city. If only neighborhoods specified, must match neighborhood.
        const passes = (allowedCities.length > 0 && cityMatches) || (allowedNeighborhoods.length > 0 && neighborhoodMatches);
        
        return passes;
      });
      
      console.log(`📊 Cities found:`, cityCounts);
      console.log(`📊 After city/neighborhood filtering: ${properties.length} of ${beforeCityFilter} properties passed`);
    }

    if (properties.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No properties found matching criteria',
          count: 0,
          newCount: 0,
          updatedCount: 0,
          skippedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============================================
    // STEP 2: Scrape detailed property information
    // ============================================
    console.log('\n🔍 STEP 2: Fetching detailed property information...');
    
    // Collect all full addresses for detailed scraping
    const addressesForDetailScraping: string[] = [];
    const addressToPropertyMap = new Map();
    
    console.log(`\n🔍 Collecting addresses for detailed scraping...`);
    for (const prop of properties) {
      const listingUrl = prop.detailUrl || prop.url || '';
      const addressData = extractAddressFromUrl(listingUrl);
      
      if (addressData.address && addressData.city && addressData.state && addressData.zip) {
        const fullAddress = `${addressData.address}, ${addressData.city}, ${addressData.state} ${addressData.zip}`;
        addressesForDetailScraping.push(fullAddress);
        addressToPropertyMap.set(fullAddress.toLowerCase(), prop);
        
        // Log first 3 addresses as samples
        if (addressesForDetailScraping.length <= 3) {
          console.log(`   ✓ Address ${addressesForDetailScraping.length}: ${fullAddress}`);
        }
      } else {
        console.log(`   ⚠️ Skipping URL (incomplete address): ${listingUrl}`);
      }
    }
    
    console.log(`📋 Prepared ${addressesForDetailScraping.length} addresses for detailed scraping`);
    if (addressesForDetailScraping.length === 0) {
      console.log(`⚠️ WARNING: No valid addresses collected! Agent info will be null for all properties.`);
    }
    
    // Scrape property details in batches to get agent info
    const detailedPropertiesData: any[] = [];
    if (addressesForDetailScraping.length > 0) {
      console.log(`\n🚀 Starting detailed property scraping...`);
      console.log(`   Total addresses to scrape: ${addressesForDetailScraping.length}`);
      
      // Batch size of 50 to avoid overwhelming the API
      const batchSize = 50;
      for (let i = 0; i < addressesForDetailScraping.length; i += batchSize) {
        const batch = addressesForDetailScraping.slice(i, i + batchSize);
        console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} addresses)...`);
        console.log(`   Sample addresses in batch: ${batch.slice(0, 2).join(', ')}`);
        
        const batchResults = await scrapePropertyDetails(batch, apifyToken);
        
        console.log(`   ✅ Batch returned ${batchResults.length} results`);
        if (batchResults.length > 0) {
          console.log(`   Sample result keys: ${Object.keys(batchResults[0]).join(', ')}`);
          console.log(`   Sample result has listedBy: ${!!batchResults[0].listedBy}`);
        } else {
          console.log(`   ⚠️ WARNING: Batch returned ZERO results!`);
        }
        
        detailedPropertiesData.push(...batchResults);
        
        // Small delay between batches to be respectful to the API
        if (i + batchSize < addressesForDetailScraping.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`\n✅ Detailed scraping complete! Total results: ${detailedPropertiesData.length}`);
    } else {
      console.log(`\n⚠️ Skipping detailed scraping - no addresses collected`);
    }
    
    // Create a map of address -> detailed property data
    const detailsMap = new Map();
    console.log(`\n📋 Creating address map from ${detailedPropertiesData.length} detailed property records...`);
    
    for (const detailedProp of detailedPropertiesData) {
      // Try multiple address formats to match
      // Ensure all values are strings before calling toLowerCase
      const addresses = [
        detailedProp.address,
        detailedProp.streetAddress && detailedProp.city && detailedProp.state && detailedProp.zipcode 
          ? `${detailedProp.streetAddress}, ${detailedProp.city}, ${detailedProp.state} ${detailedProp.zipcode}`
          : null,
        detailedProp.streetAddress || detailedProp.address
      ]
        .filter(a => a && typeof a === 'string') // Only keep actual strings
        .map(a => a.toLowerCase());
      
      if (addresses.length > 0) {
        console.log(`   Mapping property: ${addresses[0]}`);
        console.log(`     All address variants: ${addresses.join(' | ')}`);
        
        for (const addr of addresses) {
          detailsMap.set(addr, detailedProp);
        }
      } else {
        console.log(`   ⚠️ Skipping property - no valid address strings`);
      }
    }
    
    console.log(`✅ Mapped ${detailsMap.size} unique address keys to detailed property data`);
    console.log(`   Sample keys: ${Array.from(detailsMap.keys()).slice(0, 3).join(', ')}...`);

    const newListings = [];
    const updatedListings = [];
    const propertyChanges = [];
    const newPropertyIds = [];
    let skippedCount = 0;
    let agentInfoFoundCount = 0;
    let agentInfoMissingCount = 0;

    for (const prop of properties) {
      const listingUrl = prop.detailUrl || prop.url || '';
      const addressData = extractAddressFromUrl(listingUrl);
      const scrapedPrice = parseNumber(prop.price || prop.unformattedPrice);
      const scrapedStatus = 'For Sale';

      // Log property data from Apify
      console.log(`\n📋 Processing property:`, {
        address: addressData.address,
        city: addressData.city,
        homeType: prop.homeType,
        propertyType: prop.propertyType,
        homeStatus: prop.homeStatus,
        statusText: prop.statusText
      });

      // Create address key for duplicate checking
      const addressKey = `${addressData.address}|${addressData.city}`.toLowerCase();

      // Check if property already exists by address+city (primary check)
      const existingPropByAddress = existingByAddress.get(addressKey);
      const existingPropByUrl = existingByUrl.get(listingUrl);
      const existingProp = existingPropByAddress || existingPropByUrl;

      if (!existingProp) {
        // NEW LISTING - Check if address is valid before inserting
        if (!addressData.address || !addressData.city) {
          console.log(`⚠️ Skipping property with incomplete address: ${listingUrl}`);
          skippedCount++;
          continue;
        }

        // Look up detailed property data for agent information
        const fullAddress = `${addressData.address}, ${addressData.city}, ${addressData.state} ${addressData.zip}`;
        const detailedData = detailsMap.get(fullAddress.toLowerCase());
        
        // Extract agent information from detailed data
        let agentName = null;
        let agentPhone = null;
        let agentEmail = null;
        
        console.log(`\n🔎 AGENT INFO EXTRACTION for: ${fullAddress}`);
        console.log(`   Address lookup key: "${fullAddress.toLowerCase()}"`);
        console.log(`   Total detailed records in map: ${detailsMap.size}`);
        
        if (detailedData) {
          console.log(`✅ Found detailed data for ${addressData.address}`);
          console.log(`   Detailed data keys: ${Object.keys(detailedData).join(', ')}`);
          
          // Parse listedBy array structure for agent info
          console.log(`\n   🔍 LISTEDBY FIELD INSPECTION:`);
          console.log(`      - detailedData has 'listedBy': ${!!detailedData.listedBy}`);
          console.log(`      - listedBy is array: ${Array.isArray(detailedData.listedBy)}`);
          console.log(`      - listedBy type: ${typeof detailedData.listedBy}`);
          
          if (detailedData.listedBy && Array.isArray(detailedData.listedBy)) {
            console.log(`   ✓ listedBy array found with ${detailedData.listedBy.length} sections`);
            console.log(`   ✓ Full listedBy structure: ${JSON.stringify(detailedData.listedBy, null, 2)}`);
            
            // Log all sections
            detailedData.listedBy.forEach((section: any, idx: number) => {
              console.log(`     Section ${idx}: id="${section.id}", elements=${section.elements?.length || 0}`);
            });
            
            const listingAgentSection = detailedData.listedBy.find(
              (section: any) => section.id === 'LISTING_AGENT'
            );
            
            if (listingAgentSection && listingAgentSection.elements) {
              console.log(`   ✓ LISTING_AGENT section found with ${listingAgentSection.elements.length} elements`);
              console.log(`   ✓ LISTING_AGENT full data: ${JSON.stringify(listingAgentSection, null, 2)}`);
              
              // Log all elements
              listingAgentSection.elements.forEach((el: any) => {
                console.log(`     Element: id="${el.id}", text="${el.text}"`);
              });
              
              // Extract name
              const nameElement = listingAgentSection.elements.find(
                (el: any) => el.id === 'NAME'
              );
              if (nameElement) {
                agentName = nameElement.text;
                console.log(`   ✓ Name extracted: "${agentName}"`);
              } else {
                console.log(`   ❌ NAME element not found in LISTING_AGENT`);
              }
              
              // Extract phone
              const phoneElement = listingAgentSection.elements.find(
                (el: any) => el.id === 'PHONE'
              );
              if (phoneElement) {
                agentPhone = phoneElement.text;
                console.log(`   ✓ Phone extracted: "${agentPhone}"`);
              } else {
                console.log(`   ❌ PHONE element not found in LISTING_AGENT`);
              }
              
              // Extract email if present
              const emailElement = listingAgentSection.elements.find(
                (el: any) => el.id === 'EMAIL'
              );
              if (emailElement) {
                agentEmail = emailElement.text;
                console.log(`   ✓ Email extracted: "${agentEmail}"`);
              } else {
                console.log(`   ⚠️ EMAIL element not found (optional)`);
              }
            } else {
              console.log(`   ❌ LISTING_AGENT section not found in listedBy array`);
              console.log(`   Available section IDs: ${detailedData.listedBy.map((s: any) => s.id).join(', ')}`);
            }
          } else if (detailedData.listedBy) {
            console.log(`   ❌ listedBy exists but is NOT an array`);
            console.log(`   listedBy value: ${JSON.stringify(detailedData.listedBy)}`);
          } else {
            console.log(`   ❌ NO listedBy field in detailed data`);
            console.log(`   Available fields: ${Object.keys(detailedData).slice(0, 20).join(', ')}`);
          }
          
          // Fallback to other possible field structures
          if (!agentName) {
            agentName = detailedData.agentName || 
                       detailedData.listingAgentName || 
                       detailedData.attributionInfo?.agentName ||
                       detailedData.attributionInfo?.listingAgentName ||
                       null;
            if (agentName) console.log(`   ✓ Name from fallback: "${agentName}"`);
          }
          
          if (!agentPhone) {
            agentPhone = detailedData.agentPhone || 
                        detailedData.listingAgentPhone || 
                        detailedData.attributionInfo?.agentPhoneNumber ||
                        detailedData.attributionInfo?.phoneNumber ||
                        null;
            if (agentPhone) console.log(`   ✓ Phone from fallback: "${agentPhone}"`);
          }
          
          if (!agentEmail) {
            agentEmail = detailedData.agentEmail || 
                        detailedData.listingAgentEmail || 
                        detailedData.attributionInfo?.agentEmail ||
                        detailedData.attributionInfo?.email ||
                        null;
            if (agentEmail) console.log(`   ✓ Email from fallback: "${agentEmail}"`);
          }
          
          if (agentName || agentPhone || agentEmail) {
            console.log(`📞 ✅ AGENT INFO EXTRACTED - Name: ${agentName}, Phone: ${agentPhone}, Email: ${agentEmail}`);
            agentInfoFoundCount++;
          } else {
            console.log(`⚠️ Detailed data found but NO AGENT INFO extracted`);
            console.log(`   Sample of detailed data: ${JSON.stringify(detailedData).substring(0, 500)}...`);
            agentInfoMissingCount++;
          }
        } else {
          console.log(`❌ NO DETAILED DATA FOUND for this address`);
          console.log(`   Available addresses in detailsMap: ${Array.from(detailsMap.keys()).slice(0, 5).join(', ')}...`);
          agentInfoMissingCount++;
        }

        // Extract home type from multiple possible locations
        const homeTypeValue = prop.homeType || 
                             prop.propertyType || 
                             prop.hdpData?.homeInfo?.homeType ||
                             'undefined';

        newListings.push({
          user_id: user.id,
          company_id: companyId,
          buy_box_id: buyBoxId,
          address: addressData.address,
          city: addressData.city,
          state: addressData.state,
          zip: addressData.zip,
          price: scrapedPrice,
          bedrooms: parseInteger(prop.beds || prop.bedrooms || prop.hdpData?.homeInfo?.bedrooms),
          bed: parseInteger(prop.beds || prop.bedrooms || prop.hdpData?.homeInfo?.bedrooms),
          bathrooms: parseNumber(prop.baths || prop.bathrooms || prop.hdpData?.homeInfo?.bathrooms),
          bath: parseNumber(prop.baths || prop.bathrooms || prop.hdpData?.homeInfo?.bathrooms),
          square_footage: parseInteger(prop.livingArea || prop.area || prop.hdpData?.homeInfo?.livingArea),
          living_sqf: parseInteger(prop.livingArea || prop.area || prop.hdpData?.homeInfo?.livingArea),
          home_type: normalizeHomeType(homeTypeValue),
          status: scrapedStatus,
          initial_status: prop.homeStatus || prop.statusText || prop.hdpData?.homeInfo?.homeStatus || '',
          days_on_market: parseInteger(prop.daysOnZillow || prop.hdpData?.homeInfo?.daysOnZillow),
          listing_url: listingUrl,
          url: listingUrl,
          is_new_listing: true,
          listing_discovered_at: new Date().toISOString(),
          last_scraped_at: new Date().toISOString(),
          seller_agent_name: agentName,
          seller_agent_phone: agentPhone,
          seller_agent_email: agentEmail
        });
      } else {
        // EXISTING LISTING - CHECK FOR CHANGES
        console.log(`🔄 Updating existing property: ${addressData.address}, ${addressData.city}`);
        const changes = [];
        const updateData: any = {
          last_scraped_at: new Date().toISOString(),
          buy_box_id: buyBoxId  // Update buy_box_id to current one
        };

        if (existingProp.price !== scrapedPrice && scrapedPrice !== null) {
          changes.push({
            property_id: existingProp.id,
            user_id: user.id,
            company_id: companyId,
            field_changed: 'price',
            old_value: String(existingProp.price || 'null'),
            new_value: String(scrapedPrice)
          });
          updateData.price = scrapedPrice;
        }

        if (existingProp.status !== scrapedStatus) {
          changes.push({
            property_id: existingProp.id,
            user_id: user.id,
            company_id: companyId,
            field_changed: 'status',
            old_value: existingProp.status || 'null',
            new_value: scrapedStatus
          });
          updateData.status = scrapedStatus;
        }

        if (changes.length > 0) {
          propertyChanges.push(...changes);
          updatedListings.push(existingProp.id);
        }

        // Update property (either with changes or just last_scraped_at + buy_box_id)
        await supabase.from('properties').update(updateData).eq('id', existingProp.id);
      }
    }

    // Insert new listings ONE AT A TIME with error handling
    if (newListings.length > 0) {
      console.log(`💾 Inserting ${newListings.length} new properties...`);
      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      for (const listing of newListings) {
        const { data: insertedProperty, error: insertError } = await supabase
          .from('properties')
          .insert(listing)
          .select('id, listing_url')
          .single();

        if (insertError) {
          if (insertError.code === '23505') {
            // Unique constraint violation - duplicate property
            console.log(`⚠️ Duplicate property skipped: ${listing.address}, ${listing.city}`);
            duplicateCount++;
          } else {
            console.error(`❌ Error inserting property ${listing.address}:`, insertError.message);
            errorCount++;
          }
        } else {
          successCount++;
          // Collect IDs for ARV estimation
          if (insertedProperty) {
            newPropertyIds.push({ id: insertedProperty.id, url: insertedProperty.listing_url });
          }
        }
      }

      console.log(`✅ Insert complete: ${successCount} successful, ${duplicateCount} duplicates skipped, ${errorCount} errors`);
    }

    // Record property changes
    if (propertyChanges.length > 0) {
      console.log(`📊 Recording ${propertyChanges.length} property changes...`);
      const { error: changesError } = await supabase
        .from('property_changes')
        .insert(propertyChanges);

      if (changesError) {
        console.error('⚠️ Error recording changes:', changesError);
      }
      console.log(`✅ Updated ${updatedListings.length} existing properties`);
    }

    // Log agent info extraction summary
    console.log(`\n📊 AGENT INFO EXTRACTION SUMMARY:`);
    console.log(`   ✅ Properties with agent info: ${agentInfoFoundCount}`);
    console.log(`   ❌ Properties without agent info: ${agentInfoMissingCount}`);
    console.log(`   📈 Success rate: ${agentInfoFoundCount > 0 ? Math.round((agentInfoFoundCount / (agentInfoFoundCount + agentInfoMissingCount)) * 100) : 0}%`);
    
    // Trigger ARV estimation for NEW properties only
    if (newPropertyIds.length > 0) {
      console.log(`\n🤖 Triggering ARV estimation for ${newPropertyIds.length} new properties...`);
      newPropertyIds.forEach(prop => {
        if (prop.url) {
          triggerARVEstimation(prop.id, prop.url, authHeader);
        }
      });
    }

    return new Response(
      JSON.stringify({
        message: 'Properties scraped successfully. ARV estimation in progress for new listings.',
        count: properties.length,
        newCount: newListings.length,
        updatedCount: updatedListings.length,
        skippedCount: skippedCount,
        agentInfoFound: agentInfoFoundCount,
        agentInfoMissing: agentInfoMissingCount,
        buyBoxName: buyBox.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

