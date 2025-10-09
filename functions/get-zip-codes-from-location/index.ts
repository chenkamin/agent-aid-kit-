import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { location } = await req.json();

    if (!location) {
      throw new Error('Location is required');
    }

    console.log('🔍 Looking up zip codes for:', location);

    // Use OpenAI to convert location to zip codes
    const openaiApiKey = Deno.env.get('OPEN_AI_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const prompt = `You are a helpful assistant that converts location names to US zip codes.

User wants properties in: ${location}

Provide ALL relevant zip codes for this location. If it's:
- A city: return all major zip codes in that city
- A neighborhood: return zip codes for that neighborhood
- A county: return representative zip codes from that county
- Multiple locations: return zip codes for all

Return ONLY a comma-separated list of zip codes, nothing else.
Example output: 44105, 44106, 44107, 44109

If you cannot find zip codes, respond with: UNKNOWN`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a US geography expert. You convert location names to zip codes. Return only comma-separated zip codes, nothing else.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const zipCodesText = openaiData.choices[0]?.message?.content?.trim();

    console.log('🤖 AI Response:', zipCodesText);

    if (!zipCodesText || zipCodesText === 'UNKNOWN') {
      throw new Error('Could not find zip codes for this location. Please try a more specific location name.');
    }

    // Extract zip codes and validate them
    const zipCodes = zipCodesText
      .split(',')
      .map(zip => zip.trim())
      .filter(zip => /^\d{5}$/.test(zip));  // Only 5-digit zip codes

    if (zipCodes.length === 0) {
      throw new Error('No valid zip codes found. Please try a different location.');
    }

    console.log('✅ Found zip codes:', zipCodes);

    return new Response(
      JSON.stringify({
        location,
        zipCodes,
        count: zipCodes.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});


