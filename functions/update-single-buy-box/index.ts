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
  if (!homeType || homeType === 'undefined') return 'Other';

  const type = homeType.toLowerCase();
  if (type.includes('single') || type.includes('sfr')) return 'Single Family';
  if (type.includes('multi') || type.includes('duplex')) return 'Multi Family';
  if (type.includes('condo')) return 'Condo';
  if (type.includes('town')) return 'Townhouse';
  if (type.includes('land') || type.includes('lot')) return 'Land';
  if (type.includes('commercial')) return 'Commercial';
  if (type.includes('apartment')) return 'Apartment';

  return 'Other';
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
    // Get buyBoxId from request body
    const { buyBoxId } = await req.json();
    
    if (!buyBoxId) {
      throw new Error('buyBoxId is required');
    }

    console.log(`🔄 Starting update for buy box: ${buyBoxId}`);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apifyToken = Deno.env.get('APIFY_API_TOKEN');

    if (!apifyToken) throw new Error('APIFY_API_TOKEN not configured');

    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the specific buy box
    const { data: buyBox, error: buyBoxError } = await supabase
      .from('buy_boxes')
      .select('id, user_id, company_id, name, zip_codes, price_min, price_max, filter_by_ppsf, days_on_zillow, for_sale_by_agent, for_sale_by_owner, for_rent, home_types, filter_by_city_match, cities')
      .eq('id', buyBoxId)
      .single();

    if (buyBoxError) throw buyBoxError;
    if (!buyBox) throw new Error('Buy box not found');

    console.log(`🏠 Processing buy box: ${buyBox.name} (User: ${buyBox.user_id})`);

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
        throw new Error('No company_id found for user');
      }
    }

    // Get existing properties for this buy box
    const { data: existingProperties } = await supabase
      .from('properties')
      .select('id, address, city, state, zip, listing_url, price, status')
      .eq('buy_box_id', buyBox.id);

    // Create a map of existing properties by listing URL
    const existingPropsMap = new Map(
      (existingProperties || []).map(p => [p.listing_url, p])
    );

    // If filtering by price per sqft, don't pass price filter to Apify
    // We'll filter manually after getting all results
    const searchConfig = {
      zipCodes: buyBox.zip_codes || [],
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

    // Fetch results
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items`,
      { headers: { 'Authorization': `Bearer ${apifyToken}` } }
    );

    if (!resultsResponse.ok) {
      throw new Error(`Failed to fetch results: ${resultsResponse.status}`);
    }

    let scrapedProperties = await resultsResponse.json();
    console.log(`✅ Found ${scrapedProperties.length} properties from Zillow (before filtering)`);

    // If filtering by price per sqft, filter properties based on calculated ppsf
    if (buyBox.filter_by_ppsf && (buyBox.price_min || buyBox.price_max)) {
      const minPpsf = buyBox.price_min ? parseFloat(String(buyBox.price_min)) : 0;
      const maxPpsf = buyBox.price_max ? parseFloat(String(buyBox.price_max)) : Infinity;
      console.log(`🔍 Filtering by price per sqft range: $${minPpsf}/sqft - $${maxPpsf === Infinity ? '∞' : maxPpsf}/sqft...`);
      
      const originalCount = scrapedProperties.length;
      scrapedProperties = scrapedProperties.filter((prop: any) => {
        const price = parseNumber(prop.price || prop.unformattedPrice);
        const sqft = parseInteger(prop.livingArea || prop.area);
        
        // If we don't have both price and sqft, skip this property
        if (!price || !sqft || sqft === 0) {
          return false;
        }
        
        const ppsf = price / sqft;
        const passes = ppsf >= minPpsf && ppsf <= maxPpsf;
        
        return passes;
      });
      
      console.log(`📊 After price per sqft filtering: ${scrapedProperties.length} of ${originalCount} properties passed`);
    }

    // Filter by home types if specified
    if (buyBox.home_types && Array.isArray(buyBox.home_types) && buyBox.home_types.length > 0) {
      console.log(`🏠 Filtering by property types: ${buyBox.home_types.join(', ')}`);
      const beforeTypeFilter = scrapedProperties.length;
      
      // Normalize the buy box filter values (e.g., "Lot" -> "Land") to match our normalizeHomeType output
      const normalizedFilterTypes = buyBox.home_types.map((type: string) => normalizeHomeType(type));
      console.log(`🏠 Normalized filter types: ${normalizedFilterTypes.join(', ')}`);
      
      scrapedProperties = scrapedProperties.filter((prop: any) => {
        const homeType = normalizeHomeType(prop.homeType || prop.propertyType);
        return normalizedFilterTypes.includes(homeType);
      });
      
      console.log(`📊 After home type filtering: ${scrapedProperties.length} of ${beforeTypeFilter} properties passed`);
    }

    // Filter by city match if specified
    if (buyBox.filter_by_city_match && buyBox.cities?.length > 0) {
      console.log(`🎯 Filtering by city match`);
      console.log(`   Cities: ${buyBox.cities.join(', ')}`);
      
      const beforeCityFilter = scrapedProperties.length;
      
      // Normalize cities to lowercase for comparison
      const allowedCities = buyBox.cities.map((c: string) => c.toLowerCase().trim());
      
      scrapedProperties = scrapedProperties.filter((prop: any) => {
        const addressData = extractAddressFromUrl(prop.detailUrl || prop.url || '');
        const propCity = (addressData.city || '').toLowerCase().trim();
        
        const cityMatches = allowedCities.includes(propCity);
        
        return cityMatches;
      });
      
      console.log(`📊 After city filtering: ${scrapedProperties.length} of ${beforeCityFilter} properties passed`);
    }

    const newListings = [];
    const updatedListings = [];
    const propertyUpdates = [];
    let skippedCount = 0;

    for (const prop of scrapedProperties) {
      const listingUrl = prop.detailUrl || prop.url || '';
      const addressData = extractAddressFromUrl(listingUrl);
      const scrapedPrice = parseNumber(prop.price || prop.unformattedPrice);
      const scrapedStatus = 'For Sale';

      const existingProp = existingPropsMap.get(listingUrl);

      if (!existingProp) {
        // NEW LISTING - Skip if address is incomplete
        if (!addressData.address || !addressData.city) {
          console.log(`⚠️ Skipping property with incomplete address: ${listingUrl}`);
          skippedCount++;
          continue;
        }

        newListings.push({
          user_id: buyBox.user_id,
          company_id: companyId,
          buy_box_id: buyBox.id,
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
          last_scraped_at: new Date().toISOString()
        });
      } else {
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
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    if (newListings.length > 0) {
      console.log(`💾 Inserting ${newListings.length} new properties...`);

      for (const listing of newListings) {
        const { error: insertError } = await supabase
          .from('properties')
          .insert(listing);

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
        }
      }

      console.log(`✅ Insert complete: ${successCount} successful, ${duplicateCount} duplicates skipped, ${errorCount} errors`);
    }

    // Record property changes
    if (propertyUpdates.length > 0) {
      await recordPropertyChanges(supabase, propertyUpdates);
      console.log(`📊 Updated ${updatedListings.length} properties`);
    }

    // Update last_scraped timestamp on the buy box
    await supabase
      .from('buy_boxes')
      .update({ last_scraped: new Date().toISOString() })
      .eq('id', buyBox.id);

    console.log('\n✅ Buy box update completed');

    return new Response(
      JSON.stringify({
        message: 'Buy box updated successfully',
        buyBoxId: buyBox.id,
        buyBoxName: buyBox.name,
        totalScraped: scrapedProperties.length,
        newListings: successCount,
        duplicatesSkipped: duplicateCount,
        updatedListings: updatedListings.length,
        skippedCount: skippedCount,
        errors: errorCount,
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error updating buy box:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

