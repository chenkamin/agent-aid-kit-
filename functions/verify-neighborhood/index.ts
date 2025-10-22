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
    const { address, city, state, neighborhoods } = await req.json();

    if (!address || !neighborhoods || !Array.isArray(neighborhoods) || neighborhoods.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields. Need: address, and neighborhoods array' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Construct full address for better context
    const fullAddress = [address, city, state].filter(Boolean).join(', ');
    
    console.log(`🔍 Verifying if "${fullAddress}" is in neighborhoods:`, neighborhoods);

    // Use OpenAI to determine if the address is in any of the specified neighborhoods
    const prompt = `You are a geographic location expert. Given an address and a list of neighborhoods, determine if the address is located in ANY of the specified neighborhoods.

Address: ${fullAddress}

Neighborhoods to check: ${neighborhoods.join(', ')}

Instructions:
- If the address IS in one of the specified neighborhoods, respond with ONLY the neighborhood name (exactly as provided in the list)
- If the address is NOT in any of the specified neighborhoods, respond with ONLY "NO"
- Be precise about neighborhood boundaries
- Consider well-known neighborhood names and their common variations
- If unsure or if the information is ambiguous, respond with "NO"

Response (neighborhood name or NO):`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a geographic location expert. Answer only with YES or NO.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content?.trim() || 'NO';
    
    // Check if answer is a neighborhood name (not "NO")
    const isInNeighborhood = answer.toUpperCase() !== 'NO';
    const matchedNeighborhood = isInNeighborhood ? answer : null;
    
    console.log(`   Result: ${isInNeighborhood ? '✅ YES' : '❌ NO'} - "${fullAddress}" ${isInNeighborhood ? `is in "${matchedNeighborhood}"` : 'is not in any specified neighborhoods'}`);

    return new Response(
      JSON.stringify({
        address: fullAddress,
        neighborhoods,
        isInNeighborhood,
        matchedNeighborhood,
        raw_response: answer
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in verify-neighborhood function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
        isInNeighborhood: false // Default to false on error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});


