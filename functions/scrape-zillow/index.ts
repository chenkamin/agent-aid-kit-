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
    return 'Land';
  }
  if (type.includes('commercial')) {
    return 'Commercial';
  }
  if (type.includes('apartment')) {
    return 'Apartment';
  }
  // Handle generic "house" or "house for sale" as Single Family
  if (type.includes('house')) {
    console.log(`📍 Treating "${homeType}" as "Single Family"`);
    return 'Single Family';
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

    // Get SimplyRETS credentials
    const simplyRetsUser = Deno.env.get('SIMPLYRETS_USERNAME');
    const simplyRetsPass = Deno.env.get('SIMPLYRETS_PASSWORD');
    if (!simplyRetsUser || !simplyRetsPass) {
      throw new Error('SIMPLYRETS credentials not configured. Set SIMPLYRETS_USERNAME and SIMPLYRETS_PASSWORD');
    }

    // Log buy box configuration
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📦 BUY BOX CONFIGURATION: ${buyBox.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   ID: ${buyBox.id}`);
    console.log(`   Zip Codes: ${buyBox.zip_codes?.join(', ') || 'None'}`);
    console.log(`   Price Range: $${buyBox.price_min || 0} - $${buyBox.price_max || '∞'}`);
    console.log(`   Filter by Price/SqFt: ${buyBox.filter_by_ppsf ? 'YES' : 'NO'}`);
    console.log(`   Home Types: ${buyBox.home_types?.length > 0 ? buyBox.home_types.join(', ') : 'All'}`);
    console.log(`   Cities: ${buyBox.cities?.length > 0 ? buyBox.cities.join(', ') : 'All'}`);
    console.log(`   City Filter Enabled: ${buyBox.filter_by_city_match ? 'YES' : 'NO'}`);
    console.log(`   Neighborhoods: ${buyBox.neighborhoods?.length > 0 ? buyBox.neighborhoods.join(', ') : 'All'}`);
    console.log(`   Neighborhood Filter Enabled: ${buyBox.filter_by_neighborhoods ? 'YES' : 'NO'}`);
    console.log(`   Days on Zillow: ${buyBox.days_on_zillow || 'Any'}`);
    console.log(`   For Sale by Agent: ${buyBox.for_sale_by_agent ?? true}`);
    console.log(`   For Sale by Owner: ${buyBox.for_sale_by_owner ?? true}`);
    console.log(`   For Rent: ${buyBox.for_rent ?? false}`);
    console.log(`${'='.repeat(80)}\n`);

    // Get existing properties for this BUY BOX (not entire company) - CHECK BY ADDRESS + CITY
    console.log('📊 Fetching existing properties for this buy box...');
    const { data: existingProperties } = await supabase
      .from('properties')
      .select('id, address, city, listing_url, price, status')
      .eq('buy_box_id', buyBoxId);

    // Create two maps: one by address+city (for duplicate prevention), one by URL (for updates)
    const existingByAddress = new Map(
      (existingProperties || []).map(p => [`${p.address}|${p.city}`.toLowerCase(), p])
    );
    const existingByUrl = new Map(
      (existingProperties || []).map(p => [p.listing_url, p])
    );

    console.log(`✅ Found ${existingByAddress.size} existing unique properties for this buy box`);

    // Build SimplyRETS query parameters
    const params = new URLSearchParams();
    
    // Add zip codes
    if (buyBox.zip_codes && buyBox.zip_codes.length > 0) {
      params.append('postalCodes', buyBox.zip_codes.join(','));
    }
    
    // Add cities if specified
    if (buyBox.cities && buyBox.cities.length > 0) {
      params.append('cities', buyBox.cities.join(','));
    }
    
    // Add price filters (SimplyRETS doesn't have price per sqft, we'll filter manually)
    if (!buyBox.filter_by_ppsf) {
      if (buyBox.price_min) {
        params.append('minprice', buyBox.price_min.toString());
      }
      if (buyBox.price_max) {
        params.append('maxprice', buyBox.price_max.toString());
      }
    }
    
    // Add days on market filter
    if (buyBox.days_on_zillow) {
      params.append('daysOnMarket', buyBox.days_on_zillow.toString());
    }
    
    // Status - only active listings
    params.append('status', 'Active');
    
    // Set limit (SimplyRETS max is 500 per request)
    params.append('limit', '500');
    params.append('offset', '0');

    console.log(`💰 Price filter mode: ${buyBox.filter_by_ppsf ? 'Price per SqFt' : 'Total Price'}`);
    if (buyBox.filter_by_ppsf) {
      if (buyBox.price_min || buyBox.price_max) {
        console.log(`📏 Will filter by price per sqft range: $${buyBox.price_min || 0}/sqft - $${buyBox.price_max || '∞'}/sqft`);
      }
    } else {
      if (buyBox.price_min || buyBox.price_max) {
        console.log(`📏 SimplyRETS price range: $${buyBox.price_min || 0} - $${buyBox.price_max || '∞'}`);
      }
    }

    // Call SimplyRETS API
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 CALLING SIMPLYRETS API`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   Base URL: https://api.simplyrets.com/properties`);
    console.log(`   Query Parameters:`);
    console.log(`      ${params.toString().replace(/&/g, '\n      ')}`);
    console.log(`   Username: ${simplyRetsUser}`);
    console.log(`   Password: ${'*'.repeat(simplyRetsPass.length)}`);
    console.log(`${'='.repeat(80)}\n`);
    
    const auth = btoa(`${simplyRetsUser}:${simplyRetsPass}`);
    const startTime = Date.now();
    
    const simplyRetsResponse = await fetch(
      `https://api.simplyrets.com/properties?${params.toString()}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const elapsed = Date.now() - startTime;
    console.log(`📊 API Response received in ${elapsed}ms`);
    console.log(`   Status: ${simplyRetsResponse.status} ${simplyRetsResponse.statusText}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(simplyRetsResponse.headers.entries()))}`);

    if (!simplyRetsResponse.ok) {
      const errorText = await simplyRetsResponse.text();
      console.error(`\n❌ SIMPLYRETS API ERROR`);
      console.error(`   Status: ${simplyRetsResponse.status}`);
      console.error(`   Response: ${errorText.substring(0, 500)}`);
      throw new Error(`SimplyRETS API error: ${simplyRetsResponse.status} - ${errorText}`);
    }

    let properties = await simplyRetsResponse.json();
    console.log(`\n✅ SIMPLYRETS RESPONSE SUCCESS`);
    console.log(`   Total properties returned: ${properties.length}`);
    console.log(`   Response type: ${Array.isArray(properties) ? 'Array' : typeof properties}`);
    
    if (properties.length > 0) {
      console.log(`\n📋 First property sample:`);
      console.log(`   MLS ID: ${properties[0].mlsId}`);
      console.log(`   Address: ${properties[0].address?.full}`);
      console.log(`   Price: $${properties[0].listPrice?.toLocaleString()}`);
      console.log(`   Agent: ${properties[0].agent?.firstName} ${properties[0].agent?.lastName}`);
      console.log(`   Has agent contact: ${!!properties[0].agent?.contact}`);
    }
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 INITIAL SCRAPE RESULTS`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   Total properties from SimplyRETS: ${properties.length}`);
    
    // Debug: Log first property to see structure
    if (properties.length > 0) {
      console.log('📦 Sample property structure:', JSON.stringify({
        mlsId: properties[0].mlsId,
        listPrice: properties[0].listPrice,
        address: properties[0].address?.city,
        propertyType: properties[0].property?.type,
        agent: properties[0].agent ? 'has agent info' : 'no agent info',
        availableFields: Object.keys(properties[0]).slice(0, 20).join(', ')
      }, null, 2));
    }
    
    // Log all active filters
    console.log(`\n🔧 ACTIVE FILTERS:`);
    console.log(`   Price per sqft filter: ${buyBox.filter_by_ppsf ? 'ENABLED' : 'DISABLED'}`);
    if (buyBox.filter_by_ppsf) {
      console.log(`      Range: $${buyBox.price_min || 0}/sqft - $${buyBox.price_max || '∞'}/sqft`);
    }
    console.log(`   Home type filter: ${buyBox.home_types && buyBox.home_types.length > 0 ? 'ENABLED' : 'DISABLED'}`);
    if (buyBox.home_types && buyBox.home_types.length > 0) {
      console.log(`      Types: ${buyBox.home_types.join(', ')}`);
    }
    console.log(`   City filter: ${buyBox.filter_by_city_match && buyBox.cities?.length > 0 ? 'ENABLED' : 'DISABLED'}`);
    if (buyBox.filter_by_city_match && buyBox.cities?.length > 0) {
      console.log(`      Cities: ${buyBox.cities.join(', ')}`);
    }
    console.log(`   Neighborhood filter: ${buyBox.filter_by_neighborhoods && buyBox.neighborhoods?.length > 0 ? 'ENABLED' : 'DISABLED'}`);
    if (buyBox.filter_by_neighborhoods && buyBox.neighborhoods?.length > 0) {
      console.log(`      Neighborhoods: ${buyBox.neighborhoods.join(', ')}`);
    }
    console.log(`${'='.repeat(80)}\n`);
    
    // Track properties through filters
    const filterStages = {
      initial: properties.length,
      afterPriceSqft: properties.length,
      afterHomeType: properties.length,
      afterCity: properties.length,
      afterNeighborhood: properties.length
    };

    // If filtering by price per sqft, filter properties based on calculated ppsf
    if (buyBox.filter_by_ppsf && (buyBox.price_min || buyBox.price_max)) {
      const minPpsf = buyBox.price_min ? parseFloat(buyBox.price_min) : 0;
      const maxPpsf = buyBox.price_max ? parseFloat(buyBox.price_max) : Infinity;
      console.log(`\n🔍 Filtering by price per sqft range: $${minPpsf}/sqft - $${maxPpsf === Infinity ? '∞' : maxPpsf}/sqft...`);
      
      const originalCount = properties.length;
      let missingDataCount = 0;
      let filteredOutCount = 0;
      
      properties = properties.filter((prop: any) => {
        const price = parseNumber(prop.listPrice);
        const sqft = parseInteger(prop.property?.area);
        
        // If we don't have both price and sqft, skip this property
        if (!price || !sqft || sqft === 0) {
          console.log(`   ⚠️ SKIPPED (missing data): ${prop.address?.full} - Price: ${price}, SqFt: ${sqft}`);
          missingDataCount++;
          return false;
        }
        
        const ppsf = price / sqft;
        const passes = ppsf >= minPpsf && ppsf <= maxPpsf;
        
        if (!passes) {
          console.log(`   ❌ FILTERED OUT by price/sqft: ${prop.address?.full} - $${price.toLocaleString()} / ${sqft} sqft = $${ppsf.toFixed(2)}/sqft (range: $${minPpsf}-$${maxPpsf === Infinity ? '∞' : maxPpsf}/sqft)`);
          filteredOutCount++;
        }
        
        return passes;
      });
      
      if (missingDataCount > 0) {
        console.log(`⚠️ Skipped ${missingDataCount} properties with missing price/sqft data`);
      }
      if (filteredOutCount > 0) {
        console.log(`📊 Filtered out ${filteredOutCount} properties outside price/sqft range`);
      }
      console.log(`📊 After price per sqft filtering: ${properties.length} of ${originalCount} properties passed`);
      filterStages.afterPriceSqft = properties.length;
    } else {
      console.log(`⏭️ Price per sqft filter: SKIPPED (not enabled or no range set)`);
    }

    // Filter by home types if specified
    if (buyBox.home_types && Array.isArray(buyBox.home_types) && buyBox.home_types.length > 0) {
      console.log(`🏠 Filtering by property types: ${buyBox.home_types.join(', ')}`);
      const beforeTypeFilter = properties.length;
      
      // Normalize the buy box filter values (e.g., "Lot" -> "Land") to match our normalizeHomeType output
      const normalizedFilterTypes = buyBox.home_types.map(type => normalizeHomeType(type));
      console.log(`🏠 Normalized filter types: ${normalizedFilterTypes.join(', ')}`);
      
      // Track types for summary
      const typeCounts: Record<string, number> = {};
      let filteredOutCount = 0;
      
      properties = properties.filter(prop => {
        // Get home type from SimplyRETS property structure
        const homeTypeValue = prop.property?.type || prop.property?.subType || 'undefined';
        
        const homeType = normalizeHomeType(homeTypeValue);
        
        // Count this type
        typeCounts[homeType] = (typeCounts[homeType] || 0) + 1;
        
        const matches = normalizedFilterTypes.includes(homeType);
        
        // Log when filtering out
        if (!matches) {
          console.log(`   ❌ FILTERED OUT by home type: ${prop.address?.full} - Type: "${homeTypeValue}" → "${homeType}" (looking for: ${normalizedFilterTypes.join(', ')})`);
          filteredOutCount++;
        }
        
        return matches;
      });
      
      console.log(`📊 Property types found:`, typeCounts);
      console.log(`📊 Filtered out ${filteredOutCount} properties due to home type mismatch`);
      console.log(`📊 After home type filtering: ${properties.length} of ${beforeTypeFilter} properties passed`);
      filterStages.afterHomeType = properties.length;
    } else {
      console.log(`⏭️ Home type filter: SKIPPED (not enabled or empty)`);
    }

    // Filter by city match if specified
    if (buyBox.filter_by_city_match && buyBox.cities?.length > 0) {
      console.log(`🎯 Filtering by city match`);
      console.log(`   Cities: ${buyBox.cities.join(', ')}`);
      
      const beforeCityFilter = properties.length;
      
      // Normalize cities to lowercase for comparison
      const allowedCities = buyBox.cities.map(c => c.toLowerCase().trim());
      
      const cityCounts: Record<string, number> = {};
      let filteredOutCount = 0;
      
      properties = properties.filter(prop => {
        const propCity = (prop.address?.city || '').toLowerCase().trim();
        
        // Track cities
        if (propCity) {
          cityCounts[propCity] = (cityCounts[propCity] || 0) + 1;
        }
        
        // Check if city matches
        const cityMatches = allowedCities.includes(propCity);
        
        // Log when filtering out
        if (!cityMatches) {
          console.log(`   ❌ FILTERED OUT by city: ${prop.address?.full} - City: "${propCity}" not in [${allowedCities.join(', ')}]`);
          filteredOutCount++;
        }
        
        return cityMatches;
      });
      
      console.log(`📊 Cities found:`, cityCounts);
      console.log(`📊 Filtered out ${filteredOutCount} properties due to city mismatch`);
      console.log(`📊 After city filtering: ${properties.length} of ${beforeCityFilter} properties passed`);
      filterStages.afterCity = properties.length;
    } else {
      console.log(`⏭️ City filter: SKIPPED (not enabled or empty)`);
    }

    // Initialize map to store verified neighborhoods
    const propertyNeighborhoodMap = new Map();

    // Filter by neighborhoods using OpenAI if specified
    if (buyBox.filter_by_neighborhoods && buyBox.neighborhoods?.length > 0) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🤖 AI-POWERED NEIGHBORHOOD FILTERING ENABLED`);
      console.log(`${'='.repeat(80)}`);
      console.log(`   Target Neighborhoods: ${buyBox.neighborhoods.join(', ')}`);
      console.log(`   Properties to verify: ${properties.length}`);
      console.log(`   Verification URL: ${supabaseUrl}/functions/v1/verify-neighborhood`);
      console.log(`${'='.repeat(80)}\n`);
      
      const beforeNeighborhoodFilter = properties.length;
      const verifyNeighborhoodUrl = `${supabaseUrl}/functions/v1/verify-neighborhood`;
      
      // Track statistics
      let verifiedCount = 0;
      let rejectedCount = 0;
      let errorCount = 0;
      
      // Process properties in parallel but with some rate limiting
      const batchSize = 5; // Process 5 properties at a time to avoid overwhelming OpenAI
      const verifiedProperties = [];
      
      for (let i = 0; i < properties.length; i += batchSize) {
        const batch = properties.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(properties.length / batchSize);
        
        console.log(`\n📦 Processing Batch ${batchNum}/${totalBatches} (Properties ${i + 1}-${Math.min(i + batchSize, properties.length)})`);
        
        const verificationPromises = batch.map(async (prop, index) => {
          const fullAddress = prop.address?.full || '';
          const propNum = i + index + 1;
          
          console.log(`   [${propNum}/${properties.length}] Checking: ${fullAddress || 'Unknown address'}`);
          
          if (!prop.address?.streetAddress || !prop.address?.city) {
            console.log(`      ⚠️  SKIPPED - Incomplete address data`);
            errorCount++;
            return { prop, isInNeighborhood: false, matchedNeighborhood: null, skipped: true };
          }
          
          try {
            const startTime = Date.now();
            const response = await fetch(verifyNeighborhoodUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                address: prop.address?.streetAddress,
                city: prop.address?.city,
                state: prop.address?.state,
                neighborhoods: buyBox.neighborhoods,
              }),
            });
            
            const elapsed = Date.now() - startTime;
            
            if (!response.ok) {
              console.error(`      ❌ FAILED - API error (${response.status}) after ${elapsed}ms`);
              errorCount++;
              return { prop, isInNeighborhood: false, matchedNeighborhood: null, error: true };
            }
            
            const result = await response.json();
            
            if (result.isInNeighborhood && result.matchedNeighborhood) {
              console.log(`      ✅ PASS - Verified in "${result.matchedNeighborhood}" (${elapsed}ms)`);
              verifiedCount++;
            } else {
              console.log(`      ❌ REJECTED - Not in any target neighborhood (${elapsed}ms)`);
              console.log(`         OpenAI response: "${result.raw_response}"`);
              rejectedCount++;
            }
            
            return { 
              prop, 
              isInNeighborhood: result.isInNeighborhood,
              matchedNeighborhood: result.matchedNeighborhood,
              rawResponse: result.raw_response
            };
          } catch (error) {
            console.error(`      ❌ ERROR - Exception: ${error.message}`);
            errorCount++;
            return { prop, isInNeighborhood: false, matchedNeighborhood: null, error: true };
          }
        });
        
        const batchResults = await Promise.all(verificationPromises);
        
        // Log batch results
        const batchPassed = batchResults.filter(r => r.isInNeighborhood).length;
        const batchRejected = batchResults.filter(r => !r.isInNeighborhood && !r.error && !r.skipped).length;
        const batchErrors = batchResults.filter(r => r.error || r.skipped).length;
        console.log(`   ✓ Batch complete: ${batchPassed} passed, ${batchRejected} rejected, ${batchErrors} errors/skipped\n`);
        
        // Store both the property and its verified neighborhood
        const passedProperties = batchResults.filter(r => r.isInNeighborhood);
        verifiedProperties.push(...passedProperties);
        
        // Small delay between batches to avoid rate limits
        if (i + batchSize < properties.length) {
          console.log(`   ⏳ Waiting 1 second before next batch...\n`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Populate the map with matched neighborhoods
      verifiedProperties.forEach(vp => {
        const mlsId = vp.prop.mlsId;
        if (mlsId) {
          propertyNeighborhoodMap.set(mlsId, vp.matchedNeighborhood);
        }
      });
      
      properties = verifiedProperties.map(vp => vp.prop);
      
      // Final summary
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📊 NEIGHBORHOOD FILTERING COMPLETE`);
      console.log(`${'='.repeat(80)}`);
      console.log(`   Properties before filtering: ${beforeNeighborhoodFilter}`);
      console.log(`   Properties after filtering:  ${properties.length}`);
      console.log(`   ✅ Verified & passed:        ${verifiedCount}`);
      console.log(`   ❌ Rejected:                 ${rejectedCount}`);
      console.log(`   ⚠️  Errors/Skipped:          ${errorCount}`);
      console.log(`   📉 Filter rate:              ${((properties.length / beforeNeighborhoodFilter) * 100).toFixed(1)}% passed`);
      
      // Log matched neighborhoods breakdown
      if (verifiedCount > 0) {
        const neighborhoodCounts: Record<string, number> = {};
        verifiedProperties.forEach(vp => {
          if (vp.matchedNeighborhood) {
            neighborhoodCounts[vp.matchedNeighborhood] = (neighborhoodCounts[vp.matchedNeighborhood] || 0) + 1;
          }
        });
        console.log(`\n   🏘️  Properties by Neighborhood:`);
        Object.entries(neighborhoodCounts).forEach(([neighborhood, count]) => {
          console.log(`      - ${neighborhood}: ${count} properties`);
        });
      }
      console.log(`${'='.repeat(80)}\n`);
      filterStages.afterNeighborhood = properties.length;
    } else {
      console.log(`⏭️ Neighborhood filter: SKIPPED (not enabled or empty)`);
    }

    // FINAL FILTER SUMMARY
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 FILTER PIPELINE SUMMARY`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   1️⃣ Initial properties:           ${filterStages.initial}`);
    console.log(`   2️⃣ After price/sqft filter:     ${filterStages.afterPriceSqft} (${filterStages.initial - filterStages.afterPriceSqft} removed)`);
    console.log(`   3️⃣ After home type filter:      ${filterStages.afterHomeType} (${filterStages.afterPriceSqft - filterStages.afterHomeType} removed)`);
    console.log(`   4️⃣ After city filter:           ${filterStages.afterCity} (${filterStages.afterHomeType - filterStages.afterCity} removed)`);
    console.log(`   5️⃣ After neighborhood filter:   ${filterStages.afterNeighborhood} (${filterStages.afterCity - filterStages.afterNeighborhood} removed)`);
    console.log(`   ✅ FINAL COUNT: ${properties.length} properties will be processed for insertion`);
    console.log(`${'='.repeat(80)}\n`);

    if (properties.length === 0) {
      console.log(`\n⚠️⚠️⚠️ WARNING: ALL PROPERTIES FILTERED OUT ⚠️⚠️⚠️`);
      console.log(`Check the filter stages above to see where properties were eliminated.\n`);
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
    // STEP 2: SimplyRETS already includes agent info!
    // ============================================
    console.log('\n✅ STEP 2: Agent info already included in SimplyRETS response - no second scrape needed!');

    const newListings = [];
    const updatedListings = [];
    const propertyChanges = [];
    const newPropertyIds = [];
    let skippedCount = 0;
    let agentInfoFoundCount = 0;
    let agentInfoMissingCount = 0;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🏘️  PROCESSING ${properties.length} PROPERTIES AFTER ALL FILTERS`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   Existing properties in this buy box: ${existingByAddress.size}`);
    console.log(`   Will check each property for new/update status...`);
    console.log(`${'='.repeat(80)}\n`);

    for (const prop of properties) {
      // SimplyRETS property structure
      const listingUrl = `https://www.realtor.com/realestateandhomes-detail/${prop.mlsId}`;
      const address = prop.address?.streetAddress || prop.address?.full || '';
      const city = prop.address?.city || '';
      const state = prop.address?.state || '';
      const zip = prop.address?.postalCode || '';
      const scrapedPrice = parseNumber(prop.listPrice);
      const scrapedStatus = 'For Sale';

      // Log property data from SimplyRETS
      console.log(`\n📋 Processing property:`, {
        mlsId: prop.mlsId,
        url: listingUrl,
        address: address,
        city: city,
        state: state,
        zip: zip,
        price: scrapedPrice,
        homeType: prop.property?.type,
        agentName: prop.agent?.firstName ? `${prop.agent.firstName} ${prop.agent.lastName}` : 'N/A'
      });

      // Create address key for duplicate checking
      const addressKey = `${address}|${city}`.toLowerCase();

      // Check if property already exists by address+city (primary check)
      const existingPropByAddress = existingByAddress.get(addressKey);
      const existingPropByUrl = existingByUrl.get(listingUrl);
      const existingProp = existingPropByAddress || existingPropByUrl;

      if (!existingProp) {
        // NEW LISTING - Check if address is valid before inserting
        if (!address || !city) {
          console.log(`⚠️ Skipping property with incomplete address: ${listingUrl}`);
          skippedCount++;
          continue;
        }
        
        console.log(`✅ NEW PROPERTY - Will be added to database`);
        console.log(`   Address: ${address}, ${city}, ${state} ${zip}`);
        console.log(`   Price: $${scrapedPrice?.toLocaleString() || 'N/A'}`);
        console.log(`   Buy Box ID: ${buyBoxId}`);

        // Extract agent information directly from SimplyRETS response!
        let agentName = null;
        let agentPhone = null;
        let agentEmail = null;
        
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`🔎 AGENT INFO EXTRACTION for MLS #${prop.mlsId}`);
        console.log(`${'─'.repeat(60)}`);
        console.log(`   Property: ${address}, ${city}`);
        console.log(`   Has prop.agent: ${!!prop.agent}`);
        
        if (prop.agent) {
          console.log(`   Agent object keys: ${Object.keys(prop.agent).join(', ')}`);
          console.log(`   Agent data: ${JSON.stringify(prop.agent, null, 2).substring(0, 300)}`);
          
          agentName = prop.agent.firstName && prop.agent.lastName 
            ? `${prop.agent.firstName} ${prop.agent.lastName}`.trim()
            : (prop.agent.firstName || prop.agent.lastName || null);
          
          agentPhone = prop.agent.contact?.cell || prop.agent.contact?.office || null;
          agentEmail = prop.agent.contact?.email || null;
          
          console.log(`\n   ✅ EXTRACTED VALUES:`);
          console.log(`      Name: ${agentName || '❌ MISSING'}`);
          console.log(`      Phone: ${agentPhone || '❌ MISSING'}`);
          console.log(`      Email: ${agentEmail || '❌ MISSING'}`);
          
          if (agentName || agentPhone || agentEmail) {
            agentInfoFoundCount++;
            console.log(`   ✓ SUCCESS - Has at least one contact detail`);
          } else {
            agentInfoMissingCount++;
            console.log(`   ⚠️ WARNING - Agent object exists but no contact details extracted`);
          }
        } else {
          console.log(`   ❌ MISSING - No agent object in SimplyRETS response`);
          console.log(`   Property keys: ${Object.keys(prop).slice(0, 10).join(', ')}...`);
          agentInfoMissingCount++;
        }
        console.log(`${'─'.repeat(60)}\n`);

        // Extract home type from SimplyRETS structure
        const homeTypeValue = prop.property?.type || prop.property?.subType || 'undefined';

        // Get verified neighborhood if available (only for buy boxes with neighborhood filter)
        const verifiedNeighborhood = propertyNeighborhoodMap.get(prop.mlsId) || null;

        newListings.push({
          user_id: user.id,
          company_id: companyId,
          buy_box_id: buyBoxId,
          address: address,
          city: city,
          state: state,
          zip: zip,
          neighborhood: verifiedNeighborhood,
          price: scrapedPrice,
          bedrooms: parseInteger(prop.property?.bedrooms),
          bed: parseInteger(prop.property?.bedrooms),
          bathrooms: parseNumber(prop.property?.bathsFull ? prop.property.bathsFull + (prop.property.bathsHalf || 0) * 0.5 : null),
          bath: parseNumber(prop.property?.bathsFull ? prop.property.bathsFull + (prop.property.bathsHalf || 0) * 0.5 : null),
          square_footage: parseInteger(prop.property?.area),
          living_sqf: parseInteger(prop.property?.area),
          home_type: normalizeHomeType(homeTypeValue),
          status: scrapedStatus,
          initial_status: prop.mls?.status || '',
          days_on_market: parseInteger(prop.mls?.daysOnMarket),
          date_listed: prop.listDate ? new Date(prop.listDate).toISOString().split('T')[0] : null,
          listing_url: listingUrl,
          url: listingUrl,
          mls_number: prop.mlsId,
          year_built: parseInteger(prop.property?.yearBuilt),
          lot_size: prop.property?.lotSize?.toString() || null,
          lot_sqf: parseInteger(prop.property?.lotSize),
          is_new_listing: true,
          listing_discovered_at: new Date().toISOString(),
          last_scraped_at: new Date().toISOString(),
          seller_agent_name: agentName,
          seller_agent_phone: agentPhone,
          seller_agent_email: agentEmail
        });
      } else {
        // EXISTING LISTING - CHECK FOR CHANGES
        console.log(`🔄 Updating existing property: ${address}, ${city}`);
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
    console.log(`\n${'='.repeat(80)}`);
    console.log(`💾 DATABASE INSERTION PHASE`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   New properties to insert: ${newListings.length}`);
    console.log(`   Existing properties to update: ${updatedListings.length}`);
    console.log(`   Properties skipped: ${skippedCount}`);
    console.log(`${'='.repeat(80)}\n`);
    
    if (newListings.length > 0) {
      console.log(`💾 Starting insertion of ${newListings.length} new properties...`);
      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      for (let i = 0; i < newListings.length; i++) {
        const listing = newListings[i];
        console.log(`\n[${i + 1}/${newListings.length}] 💾 Inserting: ${listing.address}, ${listing.city}`);
        console.log(`   MLS: ${listing.mls_number}`);
        console.log(`   Price: $${listing.price?.toLocaleString()}`);
        console.log(`   Agent: ${listing.seller_agent_name || 'N/A'}`);
        
        const { data: insertedProperty, error: insertError } = await supabase
          .from('properties')
          .insert(listing)
          .select('id, listing_url')
          .single();

        if (insertError) {
          if (insertError.code === '23505') {
            // Unique constraint violation - duplicate property
            console.log(`   ⚠️ DUPLICATE - Skipped (already exists)`);
            duplicateCount++;
          } else {
            console.error(`   ❌ ERROR - ${insertError.message}`);
            console.error(`   Error code: ${insertError.code}`);
            console.error(`   Error details: ${JSON.stringify(insertError.details)}`);
            errorCount++;
          }
        } else {
          console.log(`   ✅ SUCCESS - Inserted with ID: ${insertedProperty?.id}`);
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
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 FINAL SUMMARY FOR BUY BOX: ${buyBox.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   Total properties after all filters: ${properties.length}`);
    console.log(`   New properties to insert: ${newListings.length}`);
    console.log(`   Properties with agent info: ${agentInfoFoundCount}`);
    console.log(`   Properties without agent info: ${agentInfoMissingCount}`);
    console.log(`   Agent info success rate: ${agentInfoFoundCount > 0 ? Math.round((agentInfoFoundCount / (agentInfoFoundCount + agentInfoMissingCount)) * 100) : 0}%`);
    console.log(`${'='.repeat(80)}\n`);
    
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
    console.error(`\n${'='.repeat(80)}`);
    console.error(`❌ FATAL ERROR`);
    console.error(`${'='.repeat(80)}`);
    console.error(`Error Type: ${error.constructor.name}`);
    console.error(`Error Message: ${error.message}`);
    console.error(`Error Stack: ${error.stack}`);
    console.error(`${'='.repeat(80)}\n`);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

