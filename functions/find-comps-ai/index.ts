import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('\n=== FIND COMPS AI REQUEST START ===');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      throw new Error('Unauthorized');
    }
    console.log('✅ User authenticated:', user.id);

    const { propertyId } = await req.json();
    if (!propertyId) {
      throw new Error('Missing required field: propertyId');
    }

    console.log(`🏠 Finding comps for property: ${propertyId}`);

    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      console.error('❌ Property fetch error:', propError);
      throw new Error('Property not found');
    }

    const address = property.address || '';
    const city = property.city || '';
    const state = property.state || '';
    const zip = property.zip || '';
    const bedrooms = property.bedrooms ?? null;
    const bathrooms = property.bathrooms ?? null;
    const sqft = property.living_sqf || property.square_footage || null;

    console.log('📊 Property details:', { address, city, state, zip, bedrooms, bathrooms, sqft });

    if (!address || !city || !state) {
      throw new Error('Property must have address, city, and state to search for comps');
    }

    const openaiApiKey = Deno.env.get('OPEN_AI_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const sqftMin = sqft ? Math.round(sqft * 0.8) : null;
    const sqftMax = sqft ? Math.round(sqft * 1.2) : null;

    const searchPrompt = `Find recently SOLD comparable properties (comps) for this subject property:

Subject Property:
- Address: ${address}, ${city}, ${state} ${zip}
- Bedrooms: ${bedrooms ?? 'Unknown'}
- Bathrooms: ${bathrooms ?? 'Unknown'}
- Square Footage: ${sqft ? sqft.toLocaleString() + ' sqft' : 'Unknown'}

Search Criteria (strict):
1. Location: Within 0.5 miles of the subject property address.
Neighborhood fidelity (must): Prefer comps in the same subdivision / same pocket / same micro-neighborhood as the subject whenever possible.
Boundary rule (strong preference): Do not cross major highways or primary arterials/main roads when selecting comps. If the subject is on one side of a major barrier, comps should be on the same side. Only cross if comps are otherwise insufficient, and note it explicitly. 
2. Size: ${sqftMin && sqftMax ? `Between ${sqftMin.toLocaleString()} and ${sqftMax.toLocaleString()} sqft (±20% of ${sqft.toLocaleString()})` : 'Similar size'}
3. Bedrooms: ${bedrooms ? `Exactly ${bedrooms} bedrooms` : 'Similar bedroom count'}
4. Bathrooms: ${bathrooms ? `Exactly ${bathrooms} bathrooms` : 'Similar bathroom count'}
5. Status: Must be SOLD (closed sales only)
6. Timeframe: Sold within the last 6 months. If you cannot find at least 3 comps in 6 months, expand to the last 12 months.

Return exactly 3 to 5 comparable properties. For each comp, provide:
- Full street address
- Sale price (the price it actually sold for)
- Number of bedrooms
- Number of bathrooms
- Square footage
- Year built
- Home/property type (e.g., Single Family, Townhouse, Condo)
- Lot size
- Zillow or Redfin listing URL if available
- Date it was sold
- Approximate distance from the subject property in miles
- A similarity grade: "high" if very similar, "middle" if moderately similar, "low" if least similar

IMPORTANT: Only include properties that have actually SOLD. Do not include active listings or pending sales.`;

    console.log('🔍 Calling OpenAI Responses API with web search...');

    const responsesPayload: Record<string, unknown> = {
      model: 'gpt-4o',
      tools: [{
        type: 'web_search',
        search_context_size: 'high',
      }],
      input: [
        {
          role: 'developer',
          content: `You are a real estate comparable sales analyst. Search the web to find recently sold properties that are comparable to the subject property. Return your findings as a JSON array. Your response must be ONLY valid JSON — no markdown, no explanation, no code fences. Return a JSON object with this exact structure:
{
  "comps": [
    {
      "address": "string",
      "price": "string (number only, no $ or commas)",
      "bedrooms": number or null,
      "bathrooms": number or null,
      "sqft": number or null,
      "year_built": number or null,
      "home_type": "string or null",
      "lot_size": "string or null",
      "zillow_link": "string URL or empty string",
      "sold_date": "string (YYYY-MM-DD) or null",
      "distance_miles": number or null,
      "grade": "high" | "middle" | "low",
      "description": "string — brief note on why this is a good comp"
    }
  ],
  "search_summary": "Brief summary of the search performed and any notes about the results"
}`
        },
        {
          role: 'user',
          content: searchPrompt
        }
      ],
      temperature: 0.4,
      max_output_tokens: 4000
    };

    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(responsesPayload)
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error (${openaiResponse.status}): ${errorText}`);
    }

    const responseData = await openaiResponse.json();
    console.log('✅ OpenAI response received, status:', responseData.status);

    let outputText = '';
    const citations: Array<{ url: string; title: string }> = [];

    if (responseData.output && Array.isArray(responseData.output)) {
      for (const item of responseData.output) {
        if (item.type === 'message' && item.content) {
          for (const content of item.content) {
            if (content.type === 'output_text') {
              outputText = content.text;
              if (content.annotations) {
                for (const ann of content.annotations) {
                  if (ann.type === 'url_citation') {
                    citations.push({ url: ann.url, title: ann.title || '' });
                  }
                }
              }
            }
          }
        }
      }
    }

    if (!outputText) {
      console.error('❌ No output text in response:', JSON.stringify(responseData).substring(0, 500));
      throw new Error('No response generated by AI');
    }

    console.log('📝 Raw output length:', outputText.length);
    console.log('📎 Citations found:', citations.length);

    let parsed: { comps: Array<Record<string, unknown>>; search_summary?: string };
    try {
      let jsonStr = outputText.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
      }
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error('❌ Failed to parse AI response:', e);
      console.error('Raw output:', outputText.substring(0, 1000));
      throw new Error('Failed to parse comp results from AI');
    }

    if (!parsed.comps || !Array.isArray(parsed.comps)) {
      throw new Error('AI response missing comps array');
    }

    console.log(`✅ Parsed ${parsed.comps.length} comps`);

    const now = Date.now();
    const newComps = parsed.comps.map((comp, index) => ({
      id: `${now}_ai_${index}`,
      address: String(comp.address || ''),
      price: String(comp.price || ''),
      bedrooms: comp.bedrooms ?? null,
      bathrooms: comp.bathrooms ?? null,
      sqft: comp.sqft ?? null,
      year_built: comp.year_built ?? null,
      home_type: comp.home_type ?? null,
      lot_size: comp.lot_size ?? null,
      zillow_link: String(comp.zillow_link || ''),
      sold_date: comp.sold_date ?? null,
      distance_miles: comp.distance_miles ?? null,
      grade: ['high', 'middle', 'low'].includes(String(comp.grade)) ? String(comp.grade) : 'middle',
      description: String(comp.description || ''),
      source: 'ai_search',
      scraped_at: new Date().toISOString(),
    }));

    const existingComps = property.comps || [];
    const allComps = [...existingComps, ...newComps];

    const { error: updateError } = await supabase
      .from('properties')
      .update({ comps: allComps })
      .eq('id', propertyId);

    if (updateError) {
      console.error('❌ DB update error:', updateError);
      throw new Error(`Failed to save comps: ${updateError.message}`);
    }

    console.log(`✅ Saved ${newComps.length} new comps (total: ${allComps.length})`);
    console.log('=== FIND COMPS AI COMPLETE ===\n');

    return new Response(
      JSON.stringify({
        success: true,
        comps: allComps,
        newCount: newComps.length,
        totalCount: allComps.length,
        searchSummary: parsed.search_summary || '',
        citations,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ FIND COMPS AI ERROR:', error.message);
    console.error('Stack:', error.stack);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
