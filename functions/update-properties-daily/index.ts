import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Helper function to parse formatted numbers
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
    if (!match) {
      console.error(`⚠️ URL doesn't match expected pattern (no /homedetails/ or _zpid): ${url}`);
      return { address: '', city: '', state: '', zip: '' };
    }
    
    if (match && match[1]) {
      const urlPart = match[1];
      const parts = urlPart.split('-');
      
      console.log(`   🔍 Parsing URL: ${url}`);
      console.log(`      URL Part: ${urlPart}`);
      console.log(`      Parts (split by '-'): [${parts.join(', ')}]`);
      console.log(`      Parts count: ${parts.length}`);
      
      // Last part is zip, second to last is state
      if (parts.length < 3) {
        console.error(`      ⚠️ URL format unexpected - not enough parts (need at least 3, got ${parts.length})`);
        console.error(`      URL: ${url}`);
        console.error(`      Parts: [${parts.join(', ')}]`);
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
      
      // Log extracted address details
      console.log(`      📍 Extracted Address Components:`);
      console.log(`         Address Parts: [${addressParts.join(', ')}] → "${result.address}"`);
      console.log(`         City Parts: [${cityParts.join(', ')}] → "${result.city}"`);
      console.log(`         State: "${result.state}"`);
      console.log(`         Zip: "${result.zip}"`);
      console.log(`      ✅ Final: "${result.address}, ${result.city}, ${result.state} ${result.zip}"`);
      
      return result;
    }
  } catch (e) {
    console.error('❌ Error extracting address from URL:', e);
    console.error(`   URL that caused error: ${url}`);
    console.error(`   Error details: ${e.message || e}`);
  }
  
  console.error(`⚠️ Returning empty address data for URL: ${url}`);
  return {
    address: '',
    city: '',
    state: '',
    zip: ''
  };
}

function normalizeHomeType(homeType: string): string {
  if (!homeType || homeType === 'undefined') return 'Other';

  const type = homeType.toLowerCase();
  if (type.includes('single') || type.includes('sfr')) return 'Single Family';
  if (type.includes('multi') || type.includes('duplex')) return 'Multi Family';
  if (type.includes('condo')) return 'Condo';
  if (type.includes('town')) return 'Townhouse';
  if (type.includes('land') || type.includes('lot')) return 'Land';
  if (type.includes('commercial')) return 'Commercial';
  if (type.includes('apartment')) return 'Apartment';
  // Handle generic "house" or "house for sale" as Single Family
  if (type.includes('house')) {
    console.log(`   📍 Treating "${homeType}" as "Single Family"`);
    return 'Single Family';
  }

  console.log(`   ⚠️ Unknown home type: "${homeType}" - defaulting to "Other"`);
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

  // Check if response is JSON
  const detailsContentType = apifyResponse.headers.get('content-type');
  if (!detailsContentType || !detailsContentType.includes('application/json')) {
    const responseText = await apifyResponse.text();
    console.error(`      ❌ Apify detailed scraping returned non-JSON when starting run`);
    console.error(`      Content-Type: ${detailsContentType}`);
    console.error(`      Response preview: ${responseText.substring(0, 500)}`);
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

  // Check if response is actually JSON before parsing
  const detailsResultsContentType = resultsResponse.headers.get('content-type');
  if (!detailsResultsContentType || !detailsResultsContentType.includes('application/json')) {
    const responseText = await resultsResponse.text();
    console.error(`      ❌ Apify detailed scraping returned non-JSON response`);
    console.error(`      Content-Type: ${detailsResultsContentType}`);
    console.error(`      Response preview: ${responseText.substring(0, 500)}`);
    return [];
  }

  const detailedProperties = await resultsResponse.json();
  console.log(`      ✅ Retrieved ${detailedProperties.length} detailed property records`);
  
  if (detailedProperties.length > 0) {
    const sample = detailedProperties[0];
    console.log(`      Sample record fields: ${Object.keys(sample).join(', ')}`);
    console.log(`      Sample has listedBy: ${!!sample.listedBy}`);
  }
  
  return detailedProperties;
}

async function recordPropertyChanges(supabase: any, updates: any[]) {
  const changeRecords = updates.flatMap(update =>
    update.changes.map((change: any) => ({
      property_id: update.propertyId,
      user_id: update.userId,
      company_id: update.companyId,
      field_changed: change.field,
      old_value: change.oldValue,
      new_value: change.newValue
    }))
  );

  if (changeRecords.length > 0) {
    const { error } = await supabase
      .from('property_changes')
      .insert(changeRecords);

    if (error) {
      console.error('Error recording changes:', error);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting queue-based property update job...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apifyToken = Deno.env.get('APIFY_API_TOKEN');

    if (!apifyToken) throw new Error('APIFY_API_TOKEN not configured');

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // SELECT NEXT ZIP CODE FROM QUEUE
    // Priority: never processed (NULL) -> oldest processed
    console.log('🔍 Looking for next zip code to process...');
    
    const { data: nextZipCode, error: selectError } = await supabase
      .from('zip_code_queue')
      .select('id, buy_box_id, zip_code, last_updated_at')
      .order('last_updated_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .single();

    if (selectError || !nextZipCode) {
      console.log('✅ No zip codes pending - queue is empty or all processed recently');
      return new Response(
        JSON.stringify({ 
          message: 'No zip codes pending',
          queueEmpty: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const zipCode = nextZipCode.zip_code;
    const buyBoxId = nextZipCode.buy_box_id;
    const queueId = nextZipCode.id;

    console.log(`\n📮 Selected from queue:`);
    console.log(`   Queue ID: ${queueId}`);
    console.log(`   ZIP CODE: ${zipCode}`);
    console.log(`   Buy Box ID: ${buyBoxId}`);
    console.log(`   Last updated: ${nextZipCode.last_updated_at || 'Never'}`);

    // Mark as in-progress IMMEDIATELY to prevent race conditions
    const { error: markError } = await supabase
      .from('zip_code_queue')
      .update({ 
        last_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);

    if (markError) {
      console.error('⚠️ Failed to mark queue item as pending:', markError);
    }

    // Get the buy box details
    const { data: buyBox, error: buyBoxError } = await supabase
      .from('buy_boxes')
      .select('id, user_id, company_id, name, zip_codes, price_min, price_max, filter_by_ppsf, days_on_zillow, for_sale_by_agent, for_sale_by_owner, for_rent, home_types, filter_by_city_match, cities, filter_by_neighborhoods, neighborhoods, last_scraped_at')
      .eq('id', buyBoxId)
      .single();

    if (buyBoxError) throw buyBoxError;

    if (!buyBox) {
      throw new Error(`Buy box ${buyBoxId} not found`);
    }

    console.log(`🏠 Buy Box: ${buyBox.name} (User: ${buyBox.user_id})`);
    console.log(`📮 Processing zip code: ${zipCode}`);
    console.log(`📊 Total zip codes in buy box: ${buyBox.zip_codes?.length || 0}`);
    console.log(`⏰ Buy box last scraped: ${buyBox.last_scraped_at || 'Never'}`)

    try {
        // Ensure buy box has company_id, if not try to get it from user's team membership
        let companyId = buyBox.company_id;
        
        if (!companyId) {
          console.log(`⚠️ Buy box ${buyBox.name} has no company_id, attempting to fetch from user...`);
          const { data: userCompany } = await supabase
            .from('team_members')
            .select('company_id')
            .eq('user_id', buyBox.user_id)
            .single();
          
          if (userCompany?.company_id) {
            companyId = userCompany.company_id;
            // Update the buy box with the company_id
            await supabase
              .from('buy_boxes')
              .update({ company_id: companyId })
              .eq('id', buyBox.id);
            console.log(`✅ Updated buy box ${buyBox.name} with company_id: ${companyId}`);
          } else {
            const errorMsg = 'No company_id found for user';
            console.log(`❌ Skipping zip code ${zipCode} for buy box ${buyBox.name} - ${errorMsg}`);
            
            // UPDATE QUEUE WITH FAILURE
            await supabase
              .from('zip_code_queue')
              .update({
                last_updated_at: new Date().toISOString(),
                last_status: 'failed',
                last_error: errorMsg,
                updated_at: new Date().toISOString()
              })
              .eq('id', queueId);
            
            const result = {
              queueId: queueId,
              buyBoxId: buyBox.id,
              buyBoxName: buyBox.name,
              zipCode: zipCode,
              userId: buyBox.user_id,
              error: errorMsg,
              success: false
            };

            return new Response(
              JSON.stringify({
                message: 'Zip code update failed',
                result
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
          }
        }

        // Get existing properties for this buy box (allow duplicates across different buy boxes)
        const { data: existingProperties } = await supabase
          .from('properties')
          .select('id, address, city, state, zip, listing_url, price, status')
          .eq('buy_box_id', buyBox.id);

        console.log(`   📋 DEBUG - Existing properties in database for this buy box: ${(existingProperties || []).length}`);
        if (existingProperties && existingProperties.length > 0) {
          console.log(`   🔍 DEBUG - Sample existing property:`, JSON.stringify(existingProperties[0], null, 2));
        }

        // Create maps by address+city and by URL for duplicate detection within this buy box
        const existingByAddress = new Map(
          (existingProperties || []).map(p => [`${p.address}|${p.city}`.toLowerCase(), p])
        );
        const existingPropsMap = new Map(
          (existingProperties || []).map(p => [p.listing_url, p])
        );
        
        console.log(`   🔍 DEBUG - Existing URLs map size: ${existingPropsMap.size}`);

        // If filtering by price per sqft, don't pass price filter to Apify
        // We'll filter manually after getting all results
        // ONLY PROCESS THIS SINGLE ZIP CODE
        const searchConfig = {
          zipCodes: [zipCode], // Process only the specified zip code
          priceMin: buyBox.filter_by_ppsf ? undefined : (buyBox.price_min || undefined),
          priceMax: buyBox.filter_by_ppsf ? undefined : (buyBox.price_max || undefined),
          daysOnZillow: buyBox.days_on_zillow || '',
          forSaleByAgent: buyBox.for_sale_by_agent ?? true,
          forSaleByOwner: buyBox.for_sale_by_owner ?? true,
          forRent: buyBox.for_rent ?? false,
          sold: false
        };

        console.log(`💰 Price filter mode: ${buyBox.filter_by_ppsf ? 'Price per SqFt' : 'Total Price'}`);
        if (buyBox.filter_by_ppsf) {
          if (buyBox.price_min || buyBox.price_max) {
            console.log(`📏 Will filter by price per sqft range: $${buyBox.price_min || 0}/sqft - $${buyBox.price_max || '∞'}/sqft`);
          }
        } else {
          if (buyBox.price_min || buyBox.price_max) {
            console.log(`📏 Zillow scraper price range: $${buyBox.price_min || 0} - $${buyBox.price_max || '∞'}`);
          }
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
          const errorText = await apifyResponse.text();
          console.error(`❌ Apify API error: ${apifyResponse.status}`);
          console.error(`   Response: ${errorText.substring(0, 500)}`);
          throw new Error(`Apify API error: ${apifyResponse.status} - ${errorText.substring(0, 200)}`);
        }

        // Check if response is JSON
        const runContentType = apifyResponse.headers.get('content-type');
        if (!runContentType || !runContentType.includes('application/json')) {
          const responseText = await apifyResponse.text();
          console.error(`❌ Apify returned non-JSON response when starting run`);
          console.error(`   Content-Type: ${runContentType}`);
          console.error(`   Response preview: ${responseText.substring(0, 500)}`);
          throw new Error(`Apify API returned non-JSON response. This usually indicates rate limiting or service issues.`);
        }

        const runData = await apifyResponse.json();
        const runId = runData.data.id;
        const defaultDatasetId = runData.data.defaultDatasetId;

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
        }

        if (runStatus !== 'SUCCEEDED') {
          throw new Error(`Apify run failed: ${runStatus}`);
        }

        // Fetch results
        const resultsResponse = await fetch(
          `https://api.apify.com/v2/datasets/${defaultDatasetId}/items`,
          { headers: { 'Authorization': `Bearer ${apifyToken}` } }
        );

        if (!resultsResponse.ok) {
          const errorText = await resultsResponse.text();
          throw new Error(`Failed to fetch results: ${resultsResponse.status} - ${errorText.substring(0, 200)}`);
        }

        // Check if response is actually JSON before parsing
        const resultsContentType = resultsResponse.headers.get('content-type');
        if (!resultsContentType || !resultsContentType.includes('application/json')) {
          const responseText = await resultsResponse.text();
          console.error(`❌ Apify returned non-JSON response for zip ${zipCode}`);
          console.error(`   Content-Type: ${resultsContentType}`);
          console.error(`   Response preview: ${responseText.substring(0, 500)}`);
          throw new Error(`Apify returned non-JSON response (Content-Type: ${resultsContentType}). This usually means rate limiting or API issues.`);
        }

        let scrapedProperties = await resultsResponse.json();
        console.log(`\n   ${'='.repeat(70)}`);
        console.log(`   🎯 INITIAL ZILLOW SEARCH RESULTS`);
        console.log(`   ${'='.repeat(70)}`);
        console.log(`   ✅ Found ${scrapedProperties.length} properties from Zillow (before filtering)`);
        
        // LOG EVERY LISTING FROM ZILLOW
        console.log(`\n   📋 LISTING ALL ${scrapedProperties.length} PROPERTIES FROM ZILLOW:\n`);
        scrapedProperties.forEach((prop: any, index: number) => {
          const addressData = extractAddressFromUrl(prop.detailUrl || prop.url || '');
          const price = parseNumber(prop.price || prop.unformattedPrice || prop.hdpData?.homeInfo?.price);
          const homeType = prop.homeType || prop.hdpData?.homeInfo?.homeType || prop.propertyType || 'undefined';
          console.log(`   ${index + 1}. ${addressData.address}, ${addressData.city}, ${addressData.state} ${addressData.zip}`);
          console.log(`      URL: ${prop.detailUrl || prop.url || 'N/A'}`);
          console.log(`      Price: $${price?.toLocaleString() || 'N/A'}`);
          console.log(`      Type: ${homeType}`);
          console.log(`      ZPID: ${prop.zpid || 'N/A'}`);
          console.log(``);
        });
        console.log(`   ${'='.repeat(70)}\n`);
        
        // DEBUG: Log first property to see what data we're getting
        if (scrapedProperties.length > 0) {
          console.log(`   🔍 DEBUG - Sample property:`, JSON.stringify(scrapedProperties[0], null, 2));
        } else {
          console.log(`   ⚠️ WARNING - No properties returned from Zillow scraper!`);
          console.log(`   🔍 Search config used:`, JSON.stringify(searchConfig, null, 2));
        }

        // If filtering by price per sqft, filter properties based on calculated ppsf
        if (buyBox.filter_by_ppsf && (buyBox.price_min || buyBox.price_max)) {
          const minPpsf = buyBox.price_min ? parseFloat(String(buyBox.price_min)) : 0;
          const maxPpsf = buyBox.price_max ? parseFloat(String(buyBox.price_max)) : Infinity;
          console.log(`   🔍 Filtering by price per sqft range: $${minPpsf}/sqft - $${maxPpsf === Infinity ? '∞' : maxPpsf}/sqft...`);
          
          const originalCount = scrapedProperties.length;
          scrapedProperties = scrapedProperties.filter((prop: any) => {
            const price = parseNumber(prop.price || prop.unformattedPrice || prop.hdpData?.homeInfo?.price);
            const sqft = parseInteger(prop.livingArea || prop.area || prop.hdpData?.homeInfo?.livingArea);
            
            // If we don't have both price and sqft, skip this property
            if (!price || !sqft || sqft === 0) {
              console.log(`     ⚠️ Skipping property with missing data - Price: ${price}, SqFt: ${sqft}`);
              return false;
            }
            
            const ppsf = price / sqft;
            const passes = ppsf >= minPpsf && ppsf <= maxPpsf;
            
            if (passes) {
              console.log(`     ✅ PASS - $${price.toLocaleString()} / ${sqft} sqft = $${ppsf.toFixed(2)}/sqft`);
            } else {
              console.log(`     ❌ FILTERED OUT - $${price.toLocaleString()} / ${sqft} sqft = $${ppsf.toFixed(2)}/sqft (outside $${minPpsf}-$${maxPpsf}/sqft range)`);
            }
            
            return passes;
          });
          
          console.log(`   📊 After price per sqft filtering: ${scrapedProperties.length} of ${originalCount} properties passed`);
        }

        // Filter by home types if specified
        if (buyBox.home_types && Array.isArray(buyBox.home_types) && buyBox.home_types.length > 0) {
          console.log(`   🏠 Filtering by property types: ${buyBox.home_types.join(', ')}`);
          const beforeTypeFilter = scrapedProperties.length;
          
          // Normalize the buy box filter values (e.g., "Lot" -> "Land") to match our normalizeHomeType output
          const normalizedFilterTypes = buyBox.home_types.map((type: string) => normalizeHomeType(type));
          console.log(`   🏠 Normalized filter types: ${normalizedFilterTypes.join(', ')}`);
          
          let filteredOutCount = 0;
          const typeCounts: Record<string, number> = {};
          
          scrapedProperties = scrapedProperties.filter((prop: any) => {
            const homeTypeValue = prop.homeType || prop.hdpData?.homeInfo?.homeType || prop.propertyType || 'undefined';
            const homeType = normalizeHomeType(homeTypeValue);
            
            // Count this type
            typeCounts[homeType] = (typeCounts[homeType] || 0) + 1;
            
            const matches = normalizedFilterTypes.includes(homeType);
            
            // Log when filtering out
            if (!matches) {
              const addressData = extractAddressFromUrl(prop.detailUrl || prop.url || '');
              console.log(`      ❌ FILTERED OUT by home type: ${addressData.address}, ${addressData.city} - Type: "${homeTypeValue}" → "${homeType}" (looking for: ${normalizedFilterTypes.join(', ')})`);
              filteredOutCount++;
            }
            
            return matches;
          });
          
          console.log(`   📊 Property types found:`, typeCounts);
          console.log(`   📊 Filtered out ${filteredOutCount} properties due to home type mismatch`);
          console.log(`   📊 After home type filtering: ${scrapedProperties.length} of ${beforeTypeFilter} properties passed`);
        }

        // Filter by city match if specified
        if (buyBox.filter_by_city_match && buyBox.cities?.length > 0) {
          console.log(`   🎯 Filtering by city match`);
          console.log(`      Cities: ${buyBox.cities.join(', ')}`);
          
          const beforeCityFilter = scrapedProperties.length;
          
          // Normalize cities to lowercase for comparison
          const allowedCities = buyBox.cities.map((c: string) => c.toLowerCase().trim());
          
          let filteredOutCount = 0;
          const cityCounts: Record<string, number> = {};
          
          scrapedProperties = scrapedProperties.filter((prop: any) => {
            const addressData = extractAddressFromUrl(prop.detailUrl || prop.url || '');
            const propCity = (addressData.city || '').toLowerCase().trim();
            
            // Track cities
            if (propCity) {
              cityCounts[propCity] = (cityCounts[propCity] || 0) + 1;
            }
            
            const cityMatches = allowedCities.includes(propCity);
            
            // Log when filtering out
            if (!cityMatches) {
              console.log(`      ❌ FILTERED OUT by city: ${addressData.address}, ${addressData.city} - City: "${propCity}" not in [${allowedCities.join(', ')}]`);
              filteredOutCount++;
            }
            
            return cityMatches;
          });
          
          console.log(`   📊 Cities found:`, cityCounts);
          console.log(`   📊 Filtered out ${filteredOutCount} properties due to city mismatch`);
          console.log(`   📊 After city filtering: ${scrapedProperties.length} of ${beforeCityFilter} properties passed`);
        }

        // ============================================
        // STEP 2: Scrape detailed property information
        // ============================================
        console.log('\n   🔍 STEP 2: Fetching detailed property information...');
        
        // Collect all full addresses for detailed scraping
        const addressesForDetailScraping: string[] = [];
        const addressToPropertyMap = new Map();
        
        console.log(`\n   🔍 Collecting addresses for detailed scraping...`);
        for (const prop of scrapedProperties) {
          const listingUrl = prop.detailUrl || prop.url || '';
          const addressData = extractAddressFromUrl(listingUrl);
          
          if (addressData.address && addressData.city && addressData.state && addressData.zip) {
            const fullAddress = `${addressData.address}, ${addressData.city}, ${addressData.state} ${addressData.zip}`;
            addressesForDetailScraping.push(fullAddress);
            addressToPropertyMap.set(fullAddress.toLowerCase(), prop);
            
            // Log first 3 addresses as samples
            if (addressesForDetailScraping.length <= 3) {
              console.log(`      ✓ Address ${addressesForDetailScraping.length}: ${fullAddress}`);
            }
          } else {
            console.log(`      ⚠️ Skipping URL (incomplete address): ${listingUrl}`);
          }
        }
        
        console.log(`   📋 Prepared ${addressesForDetailScraping.length} addresses for detailed scraping`);
        if (addressesForDetailScraping.length === 0) {
          console.log(`   ⚠️ WARNING: No valid addresses collected! Agent info will be null for all properties.`);
        }
        
        // Scrape property details in batches to get agent info
        const detailedPropertiesData: any[] = [];
        if (addressesForDetailScraping.length > 0) {
          console.log(`\n   🚀 Starting detailed property scraping...`);
          console.log(`      Total addresses to scrape: ${addressesForDetailScraping.length}`);
          
          // Batch size of 50 to avoid overwhelming the API
          const batchSize = 50;
          for (let i = 0; i < addressesForDetailScraping.length; i += batchSize) {
            const batch = addressesForDetailScraping.slice(i, i + batchSize);
            console.log(`\n   📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} addresses)...`);
            console.log(`      Sample addresses in batch: ${batch.slice(0, 2).join(', ')}`);
            
            const batchResults = await scrapePropertyDetails(batch, apifyToken);
            
            console.log(`      ✅ Batch returned ${batchResults.length} results`);
            if (batchResults.length > 0) {
              console.log(`      Sample result keys: ${Object.keys(batchResults[0]).join(', ')}`);
              console.log(`      Sample result has listedBy: ${!!batchResults[0].listedBy}`);
            } else {
              console.log(`      ⚠️ WARNING: Batch returned ZERO results!`);
            }
            
            detailedPropertiesData.push(...batchResults);
            
            // Small delay between batches to be respectful to the API
            if (i + batchSize < addressesForDetailScraping.length) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          console.log(`\n   ✅ Detailed scraping complete! Total results: ${detailedPropertiesData.length}`);
        } else {
          console.log(`\n   ⚠️ Skipping detailed scraping - no addresses collected`);
        }
        
        // Create a map of address -> detailed property data
        const detailsMap = new Map();
        console.log(`\n   📋 Creating address map from ${detailedPropertiesData.length} detailed property records...`);
        
        for (const detailedProp of detailedPropertiesData) {
          // Try multiple address formats to match
          const addresses = [
            detailedProp.address,
            detailedProp.streetAddress && detailedProp.city && detailedProp.state && detailedProp.zipcode 
              ? `${detailedProp.streetAddress}, ${detailedProp.city}, ${detailedProp.state} ${detailedProp.zipcode}`
              : null,
            detailedProp.streetAddress || detailedProp.address
          ]
            .filter(a => a && typeof a === 'string')
            .map(a => a.toLowerCase());
          
          if (addresses.length > 0) {
            for (const addr of addresses) {
              detailsMap.set(addr, detailedProp);
            }
          }
        }
        
        console.log(`   ✅ Mapped ${detailsMap.size} unique address keys to detailed property data`);

        // Initialize map to store verified neighborhoods
        const propertyNeighborhoodMap = new Map();

        // Filter by neighborhoods using OpenAI if specified
        if (buyBox.filter_by_neighborhoods && buyBox.neighborhoods?.length > 0) {
          console.log(`   🤖 AI-Powered Neighborhood Filtering Enabled`);
          console.log(`      Neighborhoods: ${buyBox.neighborhoods.join(', ')}`);
          
          const beforeNeighborhoodFilter = scrapedProperties.length;
          const verifyNeighborhoodUrl = `${supabaseUrl}/functions/v1/verify-neighborhood`;
          
          // Process properties in parallel but with some rate limiting
          const batchSize = 5; // Process 5 properties at a time to avoid overwhelming OpenAI
          const verifiedProperties = [];
          
          for (let i = 0; i < scrapedProperties.length; i += batchSize) {
            const batch = scrapedProperties.slice(i, i + batchSize);
            console.log(`      Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(scrapedProperties.length / batchSize)}...`);
            
            const verificationPromises = batch.map(async (prop: any) => {
              const addressData = extractAddressFromUrl(prop.detailUrl || prop.url || '');
              
              if (!addressData.address || !addressData.city) {
                console.log(`      ⚠️ Skipping property with incomplete address`);
                return { prop, isInNeighborhood: false };
              }
              
              try {
                const response = await fetch(verifyNeighborhoodUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({
                    address: addressData.address,
                    city: addressData.city,
                    state: addressData.state,
                    neighborhoods: buyBox.neighborhoods,
                  }),
                });
                
                if (!response.ok) {
                  console.error(`      ❌ Verification failed for ${addressData.address}`);
                  return { prop, isInNeighborhood: false, matchedNeighborhood: null };
                }
                
                const result = await response.json();
                return { 
                  prop, 
                  isInNeighborhood: result.isInNeighborhood,
                  matchedNeighborhood: result.matchedNeighborhood 
                };
              } catch (error) {
                console.error(`      ❌ Error verifying ${addressData.address}:`, error.message);
                return { prop, isInNeighborhood: false, matchedNeighborhood: null };
              }
            });
            
            const batchResults = await Promise.all(verificationPromises);
            // Store both the property and its verified neighborhood
            const passedProperties = batchResults.filter(r => r.isInNeighborhood);
            verifiedProperties.push(...passedProperties);
            
            // Small delay between batches to avoid rate limits
            if (i + batchSize < scrapedProperties.length) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          // Populate the map with matched neighborhoods
          verifiedProperties.forEach(vp => {
            const url = vp.prop.detailUrl || vp.prop.url;
            if (url) {
              propertyNeighborhoodMap.set(url, vp.matchedNeighborhood);
            }
          });
          
          scrapedProperties = verifiedProperties.map(vp => vp.prop);
          console.log(`   📊 After AI neighborhood filtering: ${scrapedProperties.length} of ${beforeNeighborhoodFilter} properties passed`);
        }

        const newListings = [];
        const updatedListings = [];
        const propertyUpdates = [];
        let skippedCount = 0;
        let agentInfoFoundCount = 0;
        let agentInfoMissingCount = 0;

        console.log(`\n   ${'='.repeat(70)}`);
        console.log(`   🔄 PROCESSING ${scrapedProperties.length} PROPERTIES AFTER ALL FILTERS`);
        console.log(`   ${'='.repeat(70)}\n`);

        for (const prop of scrapedProperties) {
          const listingUrl = prop.detailUrl || prop.url || '';
          const addressData = extractAddressFromUrl(listingUrl);
          const scrapedPrice = parseNumber(prop.price || prop.unformattedPrice || prop.hdpData?.homeInfo?.price);
          const scrapedStatus = 'For Sale';
          const homeTypeValue = prop.homeType || prop.hdpData?.homeInfo?.homeType || prop.propertyType || 'undefined';

          console.log(`\n   📋 Processing property:`);
          console.log(`      URL: ${listingUrl}`);
          console.log(`      Address: ${addressData.address}, ${addressData.city}, ${addressData.state} ${addressData.zip}`);
          console.log(`      Price: $${scrapedPrice?.toLocaleString() || 'N/A'}`);
          console.log(`      Home Type: "${homeTypeValue}" → "${normalizeHomeType(homeTypeValue)}"`);

          // Check by BOTH URL and Address+City to prevent duplicates
          // (Zillow can change URLs, so we need to check address too)
          const existingPropByUrl = existingPropsMap.get(listingUrl);
          const addressKey = `${addressData.address}|${addressData.city}`.toLowerCase();
          const existingPropByAddress = existingByAddress.get(addressKey);
          const existingProp = existingPropByUrl || existingPropByAddress;
          
          if (existingPropByUrl) {
            console.log(`      🔗 Found existing property by URL`);
          } else if (existingPropByAddress) {
            console.log(`      📍 Found existing property by Address+City (URL changed!)`);
            console.log(`         Old URL: ${existingPropByAddress.listing_url}`);
            console.log(`         New URL: ${listingUrl}`);
          }

          if (!existingProp) {
            console.log(`      ✅ NEW PROPERTY - Will be added to database`);
            
            // NEW LISTING - Skip if address is incomplete
            if (!addressData.address || !addressData.city) {
              console.log(`      ⚠️ Skipping - incomplete address data`);
              console.log(`      🔍 INCOMPLETE ADDRESS DEBUG:`);
              console.log(`         Address: "${addressData.address}" ${!addressData.address ? '❌ MISSING' : '✓'}`);
              console.log(`         City: "${addressData.city}" ${!addressData.city ? '❌ MISSING' : '✓'}`);
              console.log(`         State: "${addressData.state}" ${!addressData.state ? '❌ MISSING' : '✓'}`);
              console.log(`         Zip: "${addressData.zip}" ${!addressData.zip ? '❌ MISSING' : '✓'}`);
              console.log(`         Listing URL: ${listingUrl}`);
              console.log(`         URL Format: ${listingUrl.includes('/homedetails/') ? '✓ Contains /homedetails/' : '❌ Missing /homedetails/'}`);
              skippedCount++;
              continue;
            }

            // Get verified neighborhood if available (only for buy boxes with neighborhood filter)
            const verifiedNeighborhood = propertyNeighborhoodMap.get(listingUrl) || null;

            // Look up detailed property data for agent information
            const fullAddress = `${addressData.address}, ${addressData.city}, ${addressData.state} ${addressData.zip}`;
            const detailedData = detailsMap.get(fullAddress.toLowerCase());
            
            // Extract agent information from detailed data
            let agentName = null;
            let agentPhone = null;
            let agentEmail = null;
            
            if (detailedData) {
              console.log(`      ✅ Found detailed data for ${addressData.address}`);
              
              // Parse listedBy array structure for agent info
              if (detailedData.listedBy && Array.isArray(detailedData.listedBy)) {
                const listingAgentSection = detailedData.listedBy.find(
                  (section: any) => section.id === 'LISTING_AGENT'
                );
                
                if (listingAgentSection && listingAgentSection.elements) {
                  // Extract name
                  const nameElement = listingAgentSection.elements.find(
                    (el: any) => el.id === 'NAME'
                  );
                  if (nameElement) agentName = nameElement.text;
                  
                  // Extract phone
                  const phoneElement = listingAgentSection.elements.find(
                    (el: any) => el.id === 'PHONE'
                  );
                  if (phoneElement) agentPhone = phoneElement.text;
                  
                  // Extract email if present
                  const emailElement = listingAgentSection.elements.find(
                    (el: any) => el.id === 'EMAIL'
                  );
                  if (emailElement) agentEmail = emailElement.text;
                }
              }
              
              // Fallback to other possible field structures
              if (!agentName) {
                agentName = detailedData.agentName || 
                           detailedData.listingAgentName || 
                           detailedData.attributionInfo?.agentName ||
                           detailedData.attributionInfo?.listingAgentName ||
                           null;
              }
              
              if (!agentPhone) {
                agentPhone = detailedData.agentPhone || 
                            detailedData.listingAgentPhone || 
                            detailedData.attributionInfo?.agentPhoneNumber ||
                            detailedData.attributionInfo?.phoneNumber ||
                            null;
              }
              
              if (!agentEmail) {
                agentEmail = detailedData.agentEmail || 
                            detailedData.listingAgentEmail || 
                            detailedData.attributionInfo?.agentEmail ||
                            detailedData.attributionInfo?.email ||
                            null;
              }
              
              if (agentName || agentPhone || agentEmail) {
                console.log(`      📞 Agent Info - Name: ${agentName}, Phone: ${agentPhone}, Email: ${agentEmail}`);
                agentInfoFoundCount++;
              } else {
                console.log(`      ⚠️ No agent info found in detailed data`);
                agentInfoMissingCount++;
              }
            } else {
              console.log(`      ⚠️ No detailed data found for this address`);
              agentInfoMissingCount++;
            }

            const newListing = {
              user_id: buyBox.user_id,
              company_id: companyId,
              buy_box_id: buyBox.id,
              address: addressData.address,
              city: addressData.city,
              state: addressData.state,
              zip: addressData.zip,
              neighborhood: verifiedNeighborhood,
              price: scrapedPrice,
              bedrooms: parseInteger(prop.beds || prop.bedrooms || prop.hdpData?.homeInfo?.bedrooms),
              bed: parseInteger(prop.beds || prop.bedrooms || prop.hdpData?.homeInfo?.bedrooms),
              bathrooms: parseNumber(prop.baths || prop.bathrooms || prop.hdpData?.homeInfo?.bathrooms),
              bath: parseNumber(prop.baths || prop.bathrooms || prop.hdpData?.homeInfo?.bathrooms),
              square_footage: parseInteger(prop.livingArea || prop.area || prop.hdpData?.homeInfo?.livingArea),
              living_sqf: parseInteger(prop.livingArea || prop.area || prop.hdpData?.homeInfo?.livingArea),
              home_type: normalizeHomeType(prop.homeType || prop.hdpData?.homeInfo?.homeType || prop.propertyType),
              status: scrapedStatus,
              initial_status: prop.homeStatus || prop.statusText || prop.hdpData?.homeInfo?.homeStatus || '',
              days_on_market: parseInteger(prop.daysOnZillow || prop.hdpData?.homeInfo?.daysOnZillow),
              date_listed: prop.datePostedString ? new Date(prop.datePostedString).toISOString().split('T')[0] : null,
              listing_url: listingUrl,
              url: listingUrl,
              is_new_listing: true,
              listing_discovered_at: new Date().toISOString(),
              last_scraped_at: new Date().toISOString(),
              seller_agent_name: agentName,
              seller_agent_phone: agentPhone,
              seller_agent_email: agentEmail
            };
            
            console.log(`      ➕ Adding to newListings array`);
            newListings.push(newListing);
          } else {
            console.log(`      🔄 Found in existing properties - checking for updates`);
            console.log(`      🔍 Existing property ID: ${existingProp.id}`);
            // EXISTING LISTING - CHECK FOR CHANGES
            const changes = [];

            if (existingProp.price !== scrapedPrice) {
              changes.push({
                field: 'price',
                oldValue: String(existingProp.price || 'null'),
                newValue: String(scrapedPrice || 'null')
              });
            }

            if (existingProp.status !== scrapedStatus) {
              changes.push({
                field: 'status',
                oldValue: existingProp.status || 'null',
                newValue: scrapedStatus
              });
            }

            // Check if URL changed (found by address but different URL)
            if (existingProp.listing_url !== listingUrl) {
              console.log(`      🔗 URL updated for property`);
              changes.push({
                field: 'listing_url',
                oldValue: existingProp.listing_url || 'null',
                newValue: listingUrl
              });
            }

            if (changes.length > 0) {
              propertyUpdates.push({
                propertyId: existingProp.id,
                userId: buyBox.user_id,
                companyId: companyId,
                changes
              });

              // Update the property
              const updateData: any = { last_scraped_at: new Date().toISOString() };

              if (changes.some(c => c.field === 'price')) {
                updateData.price = scrapedPrice;
              }
              if (changes.some(c => c.field === 'status')) {
                updateData.status = scrapedStatus;
              }
              if (changes.some(c => c.field === 'listing_url')) {
                updateData.listing_url = listingUrl;
                updateData.url = listingUrl; // Update both columns
                console.log(`      ✅ Updating URL to: ${listingUrl}`);
              }

              await supabase
                .from('properties')
                .update(updateData)
                .eq('id', existingProp.id);

              updatedListings.push(existingProp.id);
            } else {
              // No changes, just update last_scraped_at
              await supabase
                .from('properties')
                .update({ last_scraped_at: new Date().toISOString() })
                .eq('id', existingProp.id);
            }
          }
        }

        // Insert new listings ONE AT A TIME with error handling
        console.log(`\n   💾 Attempting to insert ${newListings.length} new listings...`);
        
        if (newListings.length > 0) {
          let successCount = 0;
          let duplicateCount = 0;
          let errorCount = 0;

          for (let i = 0; i < newListings.length; i++) {
            const listing = newListings[i];
            console.log(`\n   💾 Inserting listing ${i + 1}/${newListings.length}:`);
            console.log(`      Address: ${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`);
            console.log(`      URL: ${listing.listing_url}`);
            console.log(`      Buy Box ID: ${listing.buy_box_id}`);
            console.log(`      Company ID: ${listing.company_id}`);
            console.log(`      User ID: ${listing.user_id}`);
            
            const { data: insertData, error: insertError } = await supabase
              .from('properties')
              .insert(listing)
              .select();

            if (insertError) {
              console.log(`      ❌ INSERT FAILED`);
              console.log(`      Error code: ${insertError.code}`);
              console.log(`      Error message: ${insertError.message}`);
              console.log(`      Error details:`, JSON.stringify(insertError, null, 2));
              
              if (insertError.code === '23505') {
                // Unique constraint violation - duplicate property
                console.log(`      ⚠️ Duplicate property skipped: ${listing.address}, ${listing.city}`);
                duplicateCount++;
              } else {
                console.error(`      ❌ Error inserting property ${listing.address}:`, insertError.message);
                errorCount++;
              }
            } else {
              console.log(`      ✅ INSERT SUCCESSFUL`);
              if (insertData) {
                console.log(`      🔍 Inserted property ID: ${insertData[0]?.id}`);
              }
              successCount++;
            }
          }

          console.log(`\n   📊 INSERTION SUMMARY:`);
          console.log(`      🆕 Successfully added: ${successCount}`);
          console.log(`      ⚠️ Duplicates skipped: ${duplicateCount}`);
          console.log(`      ❌ Errors: ${errorCount}`);
        } else {
          console.log(`   ⚠️ No new listings to insert`);
        }

        // Record property changes
        if (propertyUpdates.length > 0) {
          await recordPropertyChanges(supabase, propertyUpdates);
          console.log(`   📊 Updated ${updatedListings.length} properties`);
        }

        const result = {
          queueId: queueId,
          buyBoxId: buyBox.id,
          buyBoxName: buyBox.name,
          zipCode: zipCode,
          userId: buyBox.user_id,
          totalScraped: scrapedProperties.length,
          newListings: newListings.length,
          updatedListings: updatedListings.length,
          skippedCount: skippedCount,
          success: true
        };

        console.log(`\n   ${'='.repeat(70)}`);
        console.log(`   📊 FINAL SUMMARY FOR ZIP CODE: ${zipCode}`);
        console.log(`   Buy Box: ${buyBox.name}`);
        console.log(`   ${'='.repeat(70)}`);
        console.log(`   Properties after all filters: ${scrapedProperties.length}`);
        console.log(`   New listings identified: ${newListings.length}`);
        console.log(`   Existing listings updated: ${updatedListings.length}`);
        console.log(`   Properties skipped (incomplete data): ${skippedCount}`);
        console.log(`   Properties with agent info: ${agentInfoFoundCount}`);
        console.log(`   Properties without agent info: ${agentInfoMissingCount}`);
        console.log(`   Agent info success rate: ${agentInfoFoundCount > 0 ? Math.round((agentInfoFoundCount / (agentInfoFoundCount + agentInfoMissingCount)) * 100) : 0}%`);
        console.log(`   Existing properties in DB for this buy box: ${(existingProperties || []).length}`);
        console.log(`   ${'='.repeat(70)}\n`);
        console.log(`✅ Zip code ${zipCode} update completed`);

        // UPDATE QUEUE WITH SUCCESS
        console.log(`💾 Updating queue with success status...`);
        const { error: queueUpdateError } = await supabase
          .from('zip_code_queue')
          .update({
            last_updated_at: new Date().toISOString(),
            last_status: 'success',
            last_error: null,
            properties_found: scrapedProperties.length,
            properties_added: newListings.length,
            properties_updated: updatedListings.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', queueId);

        if (queueUpdateError) {
          console.error(`⚠️ Failed to update queue status:`, queueUpdateError);
        } else {
          console.log(`✅ Queue updated successfully`);
        }

        return new Response(
          JSON.stringify({
            message: 'Zip code update completed',
            result
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

      } catch (error) {
        console.error(`   ❌ Error processing zip code ${zipCode} for buy box ${buyBox.name}:`, error.message);
        
        // UPDATE QUEUE WITH FAILURE
        console.log(`💾 Updating queue with failure status...`);
        const { error: queueUpdateError } = await supabase
          .from('zip_code_queue')
          .update({
            last_updated_at: new Date().toISOString(),
            last_status: 'failed',
            last_error: error.message || 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', queueId);

        if (queueUpdateError) {
          console.error(`⚠️ Failed to update queue with error status:`, queueUpdateError);
        } else {
          console.log(`✅ Queue updated with failure status`);
        }
        
        const result = {
          queueId: queueId,
          buyBoxId: buyBox.id,
          buyBoxName: buyBox.name,
          zipCode: zipCode,
          userId: buyBox.user_id,
          error: error.message,
          success: false
        };

        return new Response(
          JSON.stringify({
            message: 'Zip code update failed',
            result
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

  } catch (error) {
    console.error('❌ Error in daily update job:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});


