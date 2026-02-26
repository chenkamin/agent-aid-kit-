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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPEN_AI_KEY');

    if (!openaiApiKey) {
      throw new Error('OPEN_AI_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { propertyId, description } = await req.json();

    if (!propertyId) {
      throw new Error('propertyId is required');
    }

    if (!description || description.trim().length === 0) {
      console.log(`⏭️ No description for property ${propertyId}, skipping classification`);
      return new Response(
        JSON.stringify({ propertyId, condition: null, skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`🏠 Classifying condition for property ${propertyId}`);
    console.log(`📝 Description length: ${description.length} chars`);

    const systemPrompt = `You are a real estate property condition classifier. Analyze the listing description and classify the property into exactly ONE of these categories:

1. **value_add** — The property needs work, repairs, or renovation. It is distressed, sold as-is, or marketed as an investment/flip opportunity.
   Reference keywords: fixer-upper, needs TLC, rehab, handyman special, as-is, structural updates needed, priced to sell, must sell, investment property, fix and flip, value add opportunity, sold as is, TLC, cosmetic updates required, estate sale, motivated seller, cash only, owner financing available, high ROI potential, value add

2. **turnkey** — The property is move-in ready with modern finishes. It has been recently renovated or is in excellent condition with no work needed.
   Reference keywords: turnkey, completely renovated, modern renovation, newly updated, move-in ready, designer finishes, modern kitchen, open floor plan, modern bath, luxury finishes, updated electrical/plumbing/HVAC, new roof, recently remodeled, updated throughout, premium upgrades, rent ready

3. **modern_rehab** — The property has undergone or is currently undergoing a modern rehabilitation. It shows signs of being a recently flipped or rehabbed property with contemporary updates, but may still have some original elements or be mid-renovation.
   Reference keywords: modern rehab, gut renovation, fully rehabbed, new construction feel, contemporary updates, modern finishes on older home, flip in progress, newly rehabbed, updated with modern touches

4. **unknown** — The description does not contain enough information to determine the condition, or the property does not clearly fit any of the above categories.

IMPORTANT:
- Analyze the CONTEXT of the description, not just individual keywords. For example, "as-is" on a luxury home description might still be turnkey.
- Consider the overall tone and intent of the listing.
- If the property clearly fits multiple categories, choose the DOMINANT one based on the overall description.

Respond with ONLY valid JSON in this exact format:
{"condition": "value_add|turnkey|modern_rehab|unknown", "confidence": "high|medium|low", "rationale": "one sentence explaining why"}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Classify this property listing description:\n\n${description}` }
        ],
        temperature: 0.2,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error: ${response.status} - ${errorText.substring(0, 300)}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.error('❌ Empty response from OpenAI');
      throw new Error('Empty response from OpenAI');
    }

    console.log(`🤖 OpenAI response: ${content}`);

    let parsed: { condition: string; confidence: string; rationale: string };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      console.error(`❌ Failed to parse OpenAI response: ${content}`);
      throw new Error('Failed to parse classification response');
    }

    const validConditions = ['value_add', 'turnkey', 'modern_rehab', 'unknown'];
    const condition = validConditions.includes(parsed.condition) ? parsed.condition : 'unknown';

    console.log(`✅ Classification: ${condition} (confidence: ${parsed.confidence})`);
    console.log(`📋 Rationale: ${parsed.rationale}`);

    const dbValue = condition === 'unknown' ? null : condition;

    const { error: updateError } = await supabase
      .from('properties')
      .update({ house_condition: dbValue })
      .eq('id', propertyId);

    if (updateError) {
      console.error(`❌ DB update error:`, updateError);
      throw new Error(`Failed to update property: ${updateError.message}`);
    }

    console.log(`💾 Property ${propertyId} house_condition set to: ${dbValue}`);

    return new Response(
      JSON.stringify({
        propertyId,
        condition: dbValue,
        confidence: parsed.confidence,
        rationale: parsed.rationale
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error in classify-condition:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
