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
    const match = url.match(/\/homedetails\/(.+?)\/(\d+)_zpid/);
    if (match && match[1]) {
      const parts = match[1].split('-');
      const zip = parts[parts.length - 1];
      const state = parts[parts.length - 2];
      const cityParts = [];
      const addressParts = [];
      let foundCity = false;

      for (let i = parts.length - 3; i >= 0; i--) {
        if (!foundCity && parts[i].length > 2) {
          cityParts.unshift(parts[i]);
        } else {
          foundCity = true;
          addressParts.unshift(parts[i]);
        }
      }

      return {
        address: addressParts.join(' '),
        city: cityParts.join(' '),
        state: state,
        zip: zip
      };
    }
  } catch (e) {
    console.error('Error extracting address from URL:', e);
  }
  return {
    address: '',
    city: '',
    state: '',
    zip: ''
  };
}

function normalizeHomeType(homeType: string): string {
  console.log('🏠 normalizeHomeType input:', {
    homeType,
    type: typeof homeType,
    value: JSON.stringify(homeType)
  });

  if (!homeType || homeType === 'undefined') {
    console.log('  ➜ Returning "Other" - empty or undefined input');
    return 'Other';
  }

  const type = homeType.toLowerCase();
  console.log('  ➜ Lowercase type:', type);

  if (type.includes('single') || type.includes('sfr')) {
    console.log('  ➜ Matched: Single Family');
    return 'Single Family';
  }
  if (type.includes('multi') || type.includes('duplex')) {
    console.log('  ➜ Matched: Multi Family');
    return 'Multi Family';
  }
  if (type.includes('condo')) {
    console.log('  ➜ Matched: Condo');
    return 'Condo';
  }
  if (type.includes('town')) {
    console.log('  ➜ Matched: Townhouse');
    return 'Townhouse';
  }
  if (type.includes('land')) {
    console.log('  ➜ Matched: Land');
    return 'Land';
  }
  if (type.includes('commercial')) {
    console.log('  ➜ Matched: Commercial');
    return 'Commercial';
  }

  console.log('  ➜ No match found - Returning "Other"');
  return 'Other';
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

    const { data: buyBox, error: buyBoxError } = await supabase
      .from('buy_boxes')
      .select('*')
      .eq('id', buyBoxId)
      .eq('user_id', user.id)
      .single();

    if (buyBoxError || !buyBox) throw new Error('Buy box not found');

    const apifyToken = Deno.env.get('APIFY_API_TOKEN');
    if (!apifyToken) throw new Error('APIFY_API_TOKEN not configured');

    // Get existing properties for this USER (not just buy box) - CHECK BY ADDRESS + CITY
    console.log('📊 Fetching existing properties for this user...');
    const { data: existingProperties } = await supabase
      .from('properties')
      .select('id, address, city, listing_url, price, status')
      .eq('user_id', user.id);

    // Create two maps: one by address+city (for duplicate prevention), one by URL (for updates)
    const existingByAddress = new Map(
      (existingProperties || []).map(p => [`${p.address}|${p.city}`.toLowerCase(), p])
    );
    const existingByUrl = new Map(
      (existingProperties || []).map(p => [p.listing_url, p])
    );

    console.log(`✅ Found ${existingByAddress.size} existing unique properties for this user`);

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

    // If filtering by price per sqft, filter properties based on calculated ppsf
    if (buyBox.filter_by_ppsf && buyBox.price_max) {
      const maxPpsf = parseFloat(buyBox.price_max);
      console.log(`\n🔍 Filtering by price per sqft (max: $${maxPpsf}/sqft)...`);
      
      const originalCount = properties.length;
      properties = properties.filter((prop: any) => {
        const price = parseNumber(prop.price || prop.unformattedPrice);
        const sqft = parseInteger(prop.livingArea || prop.area);
        
        // If we don't have both price and sqft, skip this property
        if (!price || !sqft || sqft === 0) {
          console.log(`  ⚠️ Skipping property with missing data - Price: ${price}, SqFt: ${sqft}`);
          return false;
        }
        
        const ppsf = price / sqft;
        const passes = ppsf <= maxPpsf;
        
        if (passes) {
          console.log(`  ✅ PASS - $${price.toLocaleString()} / ${sqft} sqft = $${ppsf.toFixed(2)}/sqft`);
        } else {
          console.log(`  ❌ FILTERED OUT - $${price.toLocaleString()} / ${sqft} sqft = $${ppsf.toFixed(2)}/sqft (exceeds $${maxPpsf}/sqft)`);
        }
        
        return passes;
      });
      
      console.log(`📊 After price per sqft filtering: ${properties.length} of ${originalCount} properties passed`);
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

    const newListings = [];
    const updatedListings = [];
    const propertyChanges = [];
    const newPropertyIds = [];
    let skippedCount = 0;

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

        newListings.push({
          user_id: user.id,
          buy_box_id: buyBoxId,
          address: addressData.address,
          city: addressData.city,
          state: addressData.state,
          zip: addressData.zip,
          price: scrapedPrice,
          bedrooms: parseInteger(prop.beds || prop.bedrooms),
          bed: parseInteger(prop.beds || prop.bedrooms),
          bathrooms: parseNumber(prop.baths || prop.bathrooms),
          bath: parseNumber(prop.baths || prop.bathrooms),
          square_footage: parseInteger(prop.livingArea || prop.area),
          living_sqf: parseInteger(prop.livingArea || prop.area),
          home_type: normalizeHomeType(prop.homeType || prop.propertyType),
          status: scrapedStatus,
          initial_status: prop.homeStatus || prop.statusText || '',
          days_on_market: parseInteger(prop.daysOnZillow),
          listing_url: listingUrl,
          url: listingUrl,
          is_new_listing: true,
          listing_discovered_at: new Date().toISOString(),
          last_scraped_at: new Date().toISOString(),
          seller_agent_name: null,
          seller_agent_phone: null,
          seller_agent_email: null
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

    // Insert new listings
    if (newListings.length > 0) {
      console.log(`💾 Inserting ${newListings.length} new properties...`);
      const { data: insertedProperties, error: insertError } = await supabase
        .from('properties')
        .insert(newListings)
        .select('id, listing_url');

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw new Error(`Failed to insert: ${insertError.message}`);
      }

      console.log(`✅ Successfully inserted ${insertedProperties?.length || 0} new properties`);

      // Collect IDs for ARV estimation
      if (insertedProperties) {
        newPropertyIds.push(...insertedProperties.map(p => ({ id: p.id, url: p.listing_url })));
      }
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

    // Trigger ARV estimation for NEW properties only
    if (newPropertyIds.length > 0) {
      console.log(`🤖 Triggering ARV estimation for ${newPropertyIds.length} new properties...`);
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

