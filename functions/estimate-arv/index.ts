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
    console.log('\n=== ARV ESTIMATION REQUEST START ===');

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

    const requestBody = await req.json();
    console.log('📦 Request body:', requestBody);

    const { propertyId, listingUrl } = requestBody;

    if (!propertyId || !listingUrl) {
      console.error('❌ Missing required fields:', { propertyId, listingUrl });
      throw new Error('Missing required fields: propertyId and listingUrl');
    }

    console.log(`🏠 Estimating ARV for property: ${propertyId}`);
    console.log(`🔗 Listing URL: ${listingUrl}`);

    // Fetch property details
    console.log('📊 Fetching property details...');
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propError) {
      console.error('❌ Property fetch error:', propError);
      throw new Error(`Property fetch failed: ${propError.message}`);
    }

    if (!property) {
      console.error('❌ Property not found for ID:', propertyId);
      throw new Error('Property not found');
    }

    console.log('✅ Property found:', {
      address: property.address,
      city: property.city,
      state: property.state,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sqft: property.living_sqf
    });

    // Fetch property images from Zillow listing
    let imageUrls: string[] = [];
    try {
      console.log('🖼️  Fetching images from Zillow...');
      console.log('Fetching URL:', listingUrl);

      const zillowResponse = await fetch(listingUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      console.log('Zillow response status:', zillowResponse.status);

      if (!zillowResponse.ok) {
        console.warn(`⚠️  Zillow returned status ${zillowResponse.status}`);
      } else {
        const html = await zillowResponse.text();
        console.log('HTML length:', html.length);

        // Extract image URLs from Zillow HTML
        const imageMatches = html.match(/https:\/\/photos\.zillowstatic\.com\/[^"'\s]+/g);
        console.log('Raw image matches found:', imageMatches?.length || 0);

        if (imageMatches) {
          // Get unique images, filter for larger sizes, limit to first 5
          imageUrls = [...new Set(imageMatches)]
            .filter(url => url.includes('-cc_ft_') || url.includes('_d.'))
            .slice(0, 5);

          console.log(`✅ Filtered ${imageUrls.length} usable images`);
          console.log('Image URLs:', imageUrls);
        } else {
          console.log('⚠️  No image URLs found in HTML');
        }
      }
    } catch (e) {
      console.error('❌ Image fetch error:', e);
      console.error('Error details:', e.message, e.stack);
    }

    // Fetch comparable properties (comps)
    console.log('📈 Fetching comparable properties...');
    console.log('Comps search criteria:', {
      city: property.city,
      status: 'Sold',
      bedrooms_min: (property.bedrooms || 0) - 1,
      bedrooms_max: (property.bedrooms || 0) + 1
    });

    const { data: comps, error: compsError } = await supabase
      .from('properties')
      .select('address, price, bedrooms, bathrooms, living_sqf, city, state, status')
      .eq('city', property.city)
      .eq('status', 'Sold')
      .gte('bedrooms', (property.bedrooms || 0) - 1)
      .lte('bedrooms', (property.bedrooms || 0) + 1)
      .order('created_at', { ascending: false })
      .limit(5);

    if (compsError) {
      console.error('⚠️  Comps fetch error:', compsError);
    } else {
      console.log(`✅ Found ${comps?.length || 0} comparable properties`);
      if (comps && comps.length > 0) {
        console.log('Sample comp:', comps[0]);
      }
    }

    const openaiApiKey = Deno.env.get('OPEN_AI_KEY');
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    console.log('✅ OpenAI API key found');

    // Prepare the prompt for OpenAI
    const systemPrompt = `You are a professional real estate appraiser specializing in After Repair Value (ARV) estimation. 
Analyze the property images and comparable sales data to provide an accurate ARV estimate.

Consider:
- Property condition from images
- Location and neighborhood
- Comparable sales prices
- Market trends
- Square footage and layout
- Potential repair/renovation costs

Provide your response as a JSON object with this structure:
{
  "arv_estimate": <number>,
  "confidence": "high" | "medium" | "low",
  "reasoning": "Brief explanation of the estimate",
  "repair_estimate": <estimated repair costs>,
  "market_analysis": "Brief market context"
}`;

    const propertyContext = `
Property Details:
- Address: ${property.address || 'N/A'}, ${property.city}, ${property.state}
- List Price: $${property.price?.toLocaleString() || 'N/A'}
- Bedrooms: ${property.bedrooms || 'N/A'}
- Bathrooms: ${property.bathrooms || 'N/A'}
- Square Footage: ${property.living_sqf?.toLocaleString() || 'N/A'} sqft
- Home Type: ${property.home_type || 'N/A'}

Comparable Sales (Recent):
${comps?.map((c, i) => `
${i + 1}. ${c.address}
   - Sold Price: $${c.price?.toLocaleString() || 'N/A'}
   - Beds/Baths: ${c.bedrooms}/${c.bathrooms}
   - Sqft: ${c.living_sqf?.toLocaleString() || 'N/A'}`).join('\n') || 'No comparable sales found'}

Based on the ${imageUrls.length > 0 ? 'images and ' : ''}comparable sales, estimate the After Repair Value (ARV) for this property.`;

    console.log('\n📝 Property context prepared (length:', propertyContext.length, 'chars)');

    // Prepare messages for OpenAI
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add images if available
    if (imageUrls.length > 0) {
      console.log(`🖼️  Including ${imageUrls.length} images in request`);
      const userContent: any[] = [
        { type: 'text', text: propertyContext }
      ];

      // Add up to 5 images
      imageUrls.slice(0, 5).forEach((url, i) => {
        console.log(`  Image ${i + 1}: ${url.substring(0, 80)}...`);
        userContent.push({
          type: 'image_url',
          image_url: { url, detail: 'low' }
        });
      });

      messages.push({
        role: 'user',
        content: userContent
      });
    } else {
      console.log('📝 Using text-only analysis (no images)');
      messages.push({
        role: 'user',
        content: propertyContext
      });
    }

    const modelToUse = imageUrls.length > 0 ? 'gpt-4o' : 'gpt-4o-mini';
    console.log(`🤖 Calling OpenAI (model: ${modelToUse})...`);

    const openaiRequest = {
      model: modelToUse,
      messages,
      temperature: 0.7,
      max_tokens: 1000
    };

    console.log('OpenAI request structure:', JSON.stringify({
      model: openaiRequest.model,
      messages: openaiRequest.messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string'
          ? `text (${m.content.length} chars)`
          : `array (${m.content.length} items)`
      })),
      temperature: openaiRequest.temperature,
      max_tokens: openaiRequest.max_tokens
    }, null, 2));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openaiRequest)
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI response received');
    console.log('Response usage:', data.usage);

    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('❌ No content in OpenAI response:', data);
      throw new Error('No content generated by AI');
    }

    console.log('\n📝 AI Response content:');
    console.log(content);
    console.log('');

    // Parse the JSON response
    let arvData: any;
    try {
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      console.log('Parsing JSON:', jsonStr.substring(0, 200));
      arvData = JSON.parse(jsonStr.trim());
      console.log('✅ Successfully parsed ARV data:', arvData);
    } catch (e) {
      console.error('❌ Failed to parse AI response as JSON:', e);
      console.error('Raw content:', content);
      throw new Error(`Invalid JSON response from AI: ${e.message}`);
    }

    // Validate ARV data
    if (!arvData.arv_estimate || typeof arvData.arv_estimate !== 'number') {
      console.error('❌ Invalid ARV estimate in response:', arvData);
      throw new Error('Invalid ARV estimate returned by AI');
    }

    // Update property with ARV estimate
    console.log(`💾 Updating property ${propertyId} with ARV...`);

    const updateData = {
      arv_estimate: arvData.arv_estimate,
      agent_notes: `ARV Estimate: $${arvData.arv_estimate?.toLocaleString()}\n` +
        `Confidence: ${arvData.confidence}\n` +
        `Reasoning: ${arvData.reasoning}\n` +
        `Estimated Repairs: $${arvData.repair_estimate?.toLocaleString() || 'N/A'}\n` +
        `Market Analysis: ${arvData.market_analysis}\n\n` +
        (property.agent_notes || '')
    };

    console.log('Update data:', updateData);

    const { error: updateError } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', propertyId);

    if (updateError) {
      console.error('❌ Property update error:', updateError);
      throw new Error(`Failed to update property: ${updateError.message}`);
    }

    console.log(`✅ ARV estimated: $${arvData.arv_estimate?.toLocaleString()}`);
    console.log('=== ARV ESTIMATION COMPLETE ===\n');

    return new Response(
      JSON.stringify({
        success: true,
        arv_estimate: arvData.arv_estimate,
        confidence: arvData.confidence,
        reasoning: arvData.reasoning
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('\n❌❌❌ ARV ESTIMATION ERROR ❌❌❌');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== ERROR END ===\n');

    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});


