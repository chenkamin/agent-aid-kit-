import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

async function scrapePropertyDetails(addresses: string[], apifyToken: string) {
  console.log(`\n🔍 Scraping detailed info for ${addresses.length} properties...`);
  
  const PROPERTY_DETAILS_ACTOR_ID = 'ENK9p4RZHg0iVso52';
  
  const detailsConfig = {
    addresses: addresses,
    extractBuildingUnits: "all",
    propertyStatus: "FOR_SALE"
  };

  console.log(`   Making Apify API call to actor ${PROPERTY_DETAILS_ACTOR_ID}...`);

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

  if (!apifyResponse.ok) {
    const errorText = await apifyResponse.text();
    console.error(`   ❌ API error: ${apifyResponse.status} - ${errorText.substring(0, 500)}`);
    return [];
  }

  const runData = await apifyResponse.json();
  const runId = runData.data.id;
  const defaultDatasetId = runData.data.defaultDatasetId;

  console.log(`   ✅ Run started: ${runId}`);

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

    if (attempts % 5 === 0) {
      console.log(`   📊 Status: ${runStatus} (${attempts}/${maxAttempts})`);
    }
  }

  if (runStatus !== 'SUCCEEDED') {
    console.error(`   ❌ Run failed: ${runStatus}`);
    return [];
  }

  console.log(`   Fetching results...`);
  const resultsResponse = await fetch(
    `https://api.apify.com/v2/datasets/${defaultDatasetId}/items`,
    { headers: { 'Authorization': `Bearer ${apifyToken}` } }
  );

  if (!resultsResponse.ok) {
    console.error(`   ❌ Failed to fetch results: ${resultsResponse.status}`);
    return [];
  }

  const detailedProperties = await resultsResponse.json();
  console.log(`   ✅ Retrieved ${detailedProperties.length} detailed records`);
  
  return detailedProperties;
}

function extractAgentInfo(detailedData: any): { name: string | null, phone: string | null, email: string | null } {
  let agentName = null;
  let agentPhone = null;
  let agentEmail = null;

  if (detailedData.listedBy && Array.isArray(detailedData.listedBy)) {
    const listingAgentSection = detailedData.listedBy.find(
      (section: any) => section.id === 'LISTING_AGENT'
    );
    
    if (listingAgentSection && listingAgentSection.elements) {
      const nameElement = listingAgentSection.elements.find(
        (el: any) => el.id === 'NAME'
      );
      if (nameElement) {
        agentName = nameElement.text;
      }
      
      const phoneElement = listingAgentSection.elements.find(
        (el: any) => el.id === 'PHONE'
      );
      if (phoneElement) {
        agentPhone = phoneElement.text;
      }
      
      const emailElement = listingAgentSection.elements.find(
        (el: any) => el.id === 'EMAIL'
      );
      if (emailElement) {
        agentEmail = emailElement.text;
      }
    }
  }
  
  // Fallback to other possible field structures
  if (!agentName) {
    agentName = detailedData.agentName || 
               detailedData.listingAgentName || 
               detailedData.attributionInfo?.agentName ||
               null;
  }
  
  if (!agentPhone) {
    agentPhone = detailedData.agentPhone || 
                detailedData.listingAgentPhone || 
                detailedData.attributionInfo?.agentPhoneNumber ||
                null;
  }
  
  if (!agentEmail) {
    agentEmail = detailedData.agentEmail || 
                detailedData.listingAgentEmail || 
                detailedData.attributionInfo?.agentEmail ||
                null;
  }

  return { name: agentName, phone: agentPhone, email: agentEmail };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apifyToken = Deno.env.get('APIFY_API_TOKEN');
    
    if (!apifyToken) throw new Error('APIFY_API_TOKEN not configured');

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

    console.log(`\n🔄 BACKFILLING AGENT INFO FOR COMPANY: ${userCompany.company_id}`);

    // Get all properties WITHOUT agent info for this company
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, address, city, state, zip, seller_agent_name, seller_agent_phone, seller_agent_email')
      .eq('company_id', userCompany.company_id)
      .or('seller_agent_name.is.null,seller_agent_phone.is.null')
      .limit(500); // Process in chunks of 500

    if (propertiesError) throw propertiesError;
    
    if (!properties || properties.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No properties found that need agent info backfill',
          processed: 0,
          updated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📋 Found ${properties.length} properties needing agent info`);

    // Collect addresses
    const addressToPropertyMap = new Map();
    const addressesForScraping: string[] = [];

    for (const prop of properties) {
      if (prop.address && prop.city && prop.state && prop.zip) {
        const fullAddress = `${prop.address}, ${prop.city}, ${prop.state} ${prop.zip}`;
        addressesForScraping.push(fullAddress);
        addressToPropertyMap.set(fullAddress.toLowerCase(), prop);
      }
    }

    console.log(`📋 Prepared ${addressesForScraping.length} addresses for scraping`);

    if (addressesForScraping.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No valid addresses found',
          processed: 0,
          updated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Scrape in batches of 50
    const detailedPropertiesData: any[] = [];
    const batchSize = 50;
    
    for (let i = 0; i < addressesForScraping.length; i += batchSize) {
      const batch = addressesForScraping.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} addresses)...`);
      
      const batchResults = await scrapePropertyDetails(batch, apifyToken);
      detailedPropertiesData.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < addressesForScraping.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n✅ Scraping complete! Got ${detailedPropertiesData.length} detailed records`);

    // Create address map
    const detailsMap = new Map();
    for (const detailedProp of detailedPropertiesData) {
      const addresses = [
        detailedProp.address,
        detailedProp.streetAddress && detailedProp.city && detailedProp.state && detailedProp.zipcode 
          ? `${detailedProp.streetAddress}, ${detailedProp.city}, ${detailedProp.state} ${detailedProp.zipcode}`
          : null,
        detailedProp.streetAddress || detailedProp.address
      ]
        .filter(a => a && typeof a === 'string')
        .map(a => a.toLowerCase());
      
      for (const addr of addresses) {
        detailsMap.set(addr, detailedProp);
      }
    }

    console.log(`\n📋 Mapped ${detailsMap.size} address keys`);

    // Update properties with agent info
    let updatedCount = 0;
    let skippedCount = 0;

    console.log(`\n🔄 Updating properties...`);

    for (const [address, prop] of addressToPropertyMap.entries()) {
      const detailedData = detailsMap.get(address);
      
      if (detailedData) {
        const agentInfo = extractAgentInfo(detailedData);
        
        if (agentInfo.name || agentInfo.phone || agentInfo.email) {
          const { error: updateError } = await supabase
            .from('properties')
            .update({
              seller_agent_name: agentInfo.name,
              seller_agent_phone: agentInfo.phone,
              seller_agent_email: agentInfo.email
            })
            .eq('id', prop.id);

          if (updateError) {
            console.error(`   ❌ Failed to update ${prop.address}:`, updateError.message);
          } else {
            updatedCount++;
            console.log(`   ✅ Updated ${prop.address} - Name: ${agentInfo.name}, Phone: ${agentInfo.phone}`);
          }
        } else {
          skippedCount++;
          console.log(`   ⚠️ No agent info found for ${prop.address}`);
        }
      } else {
        skippedCount++;
        console.log(`   ⚠️ No detailed data for ${prop.address}`);
      }
    }

    console.log(`\n📊 BACKFILL COMPLETE`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⚠️ Skipped: ${skippedCount}`);
    console.log(`   📈 Success rate: ${Math.round((updatedCount / properties.length) * 100)}%`);

    return new Response(
      JSON.stringify({
        message: 'Agent info backfill completed',
        processed: properties.length,
        updated: updatedCount,
        skipped: skippedCount,
        successRate: `${Math.round((updatedCount / properties.length) * 100)}%`
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

