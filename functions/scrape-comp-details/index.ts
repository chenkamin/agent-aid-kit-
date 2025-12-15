import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface CompData {
  id: string;
  address: string;
  zillow_link: string;
  price: string;
  grade: string;
  description: string;
  // Enriched fields
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  lot_size?: string;
  year_built?: number;
  home_type?: string;
  garage?: string;
  days_on_market?: number;
  photos?: string[];
  scraped_at?: string;
  scrape_error?: string;
}

interface ScrapedData {
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  lot_size?: string;
  year_built?: number;
  home_type?: string;
  garage?: string;
  days_on_market?: number;
  photos?: string[];
  property_description?: string;
}

async function fetchZillowPage(url: string): Promise<{ html: string; imageUrls: string[] }> {
  console.log(`🔗 Fetching Zillow page: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Zillow page: ${response.status}`);
  }

  const html = await response.text();
  console.log(`📄 HTML length: ${html.length} chars`);

  // Extract image URLs from Zillow HTML
  const imageMatches = html.match(/https:\/\/photos\.zillowstatic\.com\/[^"'\s<>]+/g);
  let imageUrls: string[] = [];
  
  if (imageMatches) {
    // Get unique images, filter for larger sizes
    imageUrls = [...new Set(imageMatches)]
      .filter(url => 
        (url.includes('-cc_ft_') || url.includes('_d.') || url.includes('-p_e')) &&
        !url.includes('_b.') // Exclude tiny thumbnails
      )
      .slice(0, 10);
    
    console.log(`🖼️ Found ${imageUrls.length} usable images`);
  }

  return { html, imageUrls };
}

async function scrapeWithGemini(
  html: string, 
  imageUrls: string[], 
  geminiApiKey: string
): Promise<ScrapedData> {
  console.log('🤖 Sending to Gemini for analysis...');

  const systemPrompt = `You are a real estate data extraction expert. Analyze the provided Zillow property listing HTML and extract the following information in JSON format:

{
  "bedrooms": <number or null>,
  "bathrooms": <number or null>,
  "sqft": <number - square footage or null>,
  "lot_size": "<string - e.g. '0.25 acres' or '10,890 sqft' or null>",
  "year_built": <number - 4 digit year or null>,
  "home_type": "<string - e.g. 'Single Family', 'Condo', 'Townhouse' or null>",
  "garage": "<string - e.g. '2 car attached', 'None' or null>",
  "days_on_market": <number or null>,
  "property_description": "<string - brief description from listing or null>"
}

Important:
- Extract ONLY data that is clearly present in the HTML
- Return null for any field that cannot be determined
- For sqft, use living area/finished area, not lot size
- Keep property_description under 200 characters
- Return ONLY valid JSON, no markdown or explanations`;

  // Truncate HTML to avoid token limits (keep important parts)
  const truncatedHtml = html.length > 50000 
    ? html.substring(0, 25000) + '\n...[truncated]...\n' + html.substring(html.length - 25000)
    : html;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          { text: `\n\nZillow HTML content:\n\n${truncatedHtml}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1000,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Gemini response received');

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error('No content in Gemini response');
  }

  // Parse JSON response
  let scrapedData: ScrapedData;
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    scrapedData = JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error('❌ Failed to parse Gemini response:', content);
    throw new Error('Invalid JSON from Gemini');
  }

  // Add photos
  scrapedData.photos = imageUrls;

  console.log('📊 Extracted data:', scrapedData);
  return scrapedData;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('\n=== SCRAPE COMP DETAILS REQUEST ===');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    );

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }
    console.log('✅ User authenticated:', user.id);

    const { propertyId } = await req.json();
    if (!propertyId) {
      throw new Error('Missing propertyId');
    }

    console.log(`🏠 Processing comps for property: ${propertyId}`);

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Fetch property with comps
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, address, comps')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      throw new Error('Property not found');
    }

    const comps: CompData[] = property.comps || [];
    if (comps.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No comps to process', comps: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Processing ${comps.length} comps...`);

    // Process each comp with a Zillow link
    const enrichedComps: CompData[] = [];
    
    for (const comp of comps) {
      console.log(`\n--- Processing comp: ${comp.address} ---`);
      
      if (!comp.zillow_link) {
        console.log('⚠️ No Zillow link, skipping enrichment');
        enrichedComps.push({
          ...comp,
          scrape_error: 'No Zillow link provided'
        });
        continue;
      }

      try {
        // Fetch Zillow page
        const { html, imageUrls } = await fetchZillowPage(comp.zillow_link);

        // Scrape with Gemini
        const scrapedData = await scrapeWithGemini(html, imageUrls, geminiApiKey);

        // Merge scraped data with existing comp
        enrichedComps.push({
          ...comp,
          bedrooms: scrapedData.bedrooms ?? comp.bedrooms,
          bathrooms: scrapedData.bathrooms ?? comp.bathrooms,
          sqft: scrapedData.sqft ?? comp.sqft,
          lot_size: scrapedData.lot_size ?? comp.lot_size,
          year_built: scrapedData.year_built ?? comp.year_built,
          home_type: scrapedData.home_type ?? comp.home_type,
          garage: scrapedData.garage ?? comp.garage,
          days_on_market: scrapedData.days_on_market ?? comp.days_on_market,
          photos: scrapedData.photos || comp.photos || [],
          description: scrapedData.property_description || comp.description,
          scraped_at: new Date().toISOString(),
          scrape_error: undefined
        });

        console.log(`✅ Successfully scraped: ${comp.address}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error scraping ${comp.address}:`, error.message);
        enrichedComps.push({
          ...comp,
          scrape_error: error.message,
          scraped_at: new Date().toISOString()
        });
      }
    }

    // Update property with enriched comps
    const { error: updateError } = await supabase
      .from('properties')
      .update({ comps: enrichedComps })
      .eq('id', propertyId);

    if (updateError) {
      throw new Error(`Failed to update property: ${updateError.message}`);
    }

    console.log('\n=== SCRAPE COMPLETE ===');
    console.log(`✅ Processed ${enrichedComps.length} comps`);

    return new Response(
      JSON.stringify({
        success: true,
        comps: enrichedComps,
        processed: enrichedComps.length,
        errors: enrichedComps.filter(c => c.scrape_error).length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
