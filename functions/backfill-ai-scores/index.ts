import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Use OpenAI to analyze the seller's response and score their interest
async function analyzeSellerResponse(message: string, openAiKey: string): Promise<{ score: number; analysis: string }> {
  try {
    console.log(`🤖 Analyzing message with OpenAI: "${message.substring(0, 100)}..."`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant helping real estate investors evaluate seller interest. Analyze the seller's SMS response and rate their interest level from 1-3:
            
1 = COLD: Not interested, hostile, or clearly not motivated to sell
2 = WARM: Somewhat interested, asking questions, or open to discussion but hesitant
3 = HOT: Very interested, motivated to sell, eager to talk, or showing urgency

Respond with ONLY a JSON object in this exact format:
{"score": 1-3, "analysis": "brief explanation of why"}

Be concise but insightful in your analysis.`
          },
          {
            role: 'user',
            content: `Analyze this seller's response:\n\n"${message}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error: ${response.status} - ${errorText}`);
      return { score: 2, analysis: 'Unable to analyze - API error' };
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      console.error('❌ No content in OpenAI response');
      return { score: 2, analysis: 'Unable to analyze - no response' };
    }

    console.log(`📊 OpenAI response: ${content}`);
    
    // Parse the JSON response
    const parsed = JSON.parse(content);
    const score = Math.max(1, Math.min(3, parsed.score)); // Ensure 1-3 range
    
    console.log(`✅ Analysis complete: Score=${score}, Analysis="${parsed.analysis}"`);
    
    return {
      score: score,
      analysis: parsed.analysis || 'No analysis provided'
    };
  } catch (error) {
    console.error('❌ Error analyzing message:', error);
    return { score: 2, analysis: 'Unable to analyze - parsing error' };
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('\n🔄 Backfill AI Scores - Starting...');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAiKey) {
      console.error('❌ OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          message: 'OPENAI_API_KEY not configured' 
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Parse request body for optional filters
    let companyId: string | null = null;
    let limit = 100; // Process max 100 messages at a time

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        companyId = body.company_id || null;
        limit = body.limit || 100;
      } catch {
        // If body parsing fails, use defaults
      }
    }

    console.log(`📊 Fetching messages without AI scores...`);
    console.log(`   Company filter: ${companyId || 'ALL'}`);
    console.log(`   Limit: ${limit}`);

    // Fetch incoming messages that don't have AI scores
    let query = supabase
      .from('sms_messages')
      .select('id, message, company_id, property_id, created_at')
      .eq('direction', 'incoming')
      .is('ai_score', null)
      .not('message', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply company filter if provided
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: messages, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching messages:', fetchError);
      throw fetchError;
    }

    if (!messages || messages.length === 0) {
      console.log('✅ No messages found without AI scores');
      return new Response(
        JSON.stringify({ 
          status: 'success', 
          message: 'No messages to process',
          processed: 0,
          skipped: 0,
          failed: 0
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`📝 Found ${messages.length} messages to process`);

    // Process each message
    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const msg of messages) {
      console.log(`\n📨 Processing message ID: ${msg.id}`);
      console.log(`   Message: "${msg.message.substring(0, 100)}..."`);
      
      // Skip empty messages
      if (!msg.message || msg.message.trim().length === 0) {
        console.log(`   ⏭️ Skipping - empty message`);
        skipped++;
        continue;
      }

      try {
        // Analyze with OpenAI
        const analysis = await analyzeSellerResponse(msg.message, openAiKey);
        
        // Update the message with AI score and analysis
        const { error: updateError } = await supabase
          .from('sms_messages')
          .update({
            ai_score: analysis.score,
            ai_analysis: analysis.analysis,
            updated_at: new Date().toISOString()
          })
          .eq('id', msg.id);

        if (updateError) {
          console.error(`   ❌ Failed to update message ${msg.id}:`, updateError);
          failed++;
        } else {
          console.log(`   ✅ Updated - Score: ${analysis.score}, Analysis: "${analysis.analysis}"`);
          processed++;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`   ❌ Error processing message ${msg.id}:`, error);
        failed++;
      }
    }

    console.log(`\n🎉 Backfill Complete!`);
    console.log(`   ✅ Processed: ${processed}`);
    console.log(`   ⏭️ Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);

    return new Response(
      JSON.stringify({ 
        status: 'success',
        message: 'Backfill complete',
        total_found: messages.length,
        processed: processed,
        skipped: skipped,
        failed: failed,
        details: {
          processed_ids: messages.slice(0, processed).map(m => m.id)
        }
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: error.message 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});





