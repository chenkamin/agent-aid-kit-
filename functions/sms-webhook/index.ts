import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface OpenPhoneWebhook {
  id: string;
  object: string;
  createdAt: string;
  direction: string;
  from: string;
  to: string[];
  media: any[];
  body: string;
  status: string;
}

interface TwilioWebhook {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  MessageStatus?: string;
}

// Normalize phone number to E.164 format
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

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
    console.log('\n📨 SMS Webhook received');
    console.log(`   Method: ${req.method}`);
    console.log(`   URL: ${req.url}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAiKey) {
      console.error('❌ OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Parse webhook data (handle both OpenPhone and Twilio formats)
    const contentType = req.headers.get('content-type') || '';
    let webhookData: any;

    if (contentType.includes('application/json')) {
      // OpenPhone sends JSON
      webhookData = await req.json();
      console.log('📱 OpenPhone webhook detected');
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Twilio sends form data
      const formData = await req.formData();
      webhookData = Object.fromEntries(formData);
      console.log('📱 Twilio webhook detected');
    } else {
      throw new Error('Unsupported content type');
    }

    console.log('📦 Full webhook data:', JSON.stringify(webhookData, null, 2).substring(0, 1000));
    console.log('📦 Webhook structure check:');
    console.log('   - Has data.object?', !!webhookData.data?.object);
    console.log('   - Has direct object?', !!webhookData.object);
    console.log('   - Has MessageSid?', !!webhookData.MessageSid);

    // Extract message details based on provider
    let fromNumber: string;
    let toNumber: string;
    let messageBody: string;
    let messageId: string;
    let provider: string;

    // Check for OpenPhone format: data.object structure
    if (webhookData.data?.object) {
      // OpenPhone format with data.object wrapper
      provider = 'openphone';
      const messageObj = webhookData.data.object;
      fromNumber = normalizePhoneNumber(messageObj.from);
      // Handle 'to' as either string or array
      if (Array.isArray(messageObj.to)) {
        toNumber = normalizePhoneNumber(messageObj.to[0] || '');
      } else {
        toNumber = normalizePhoneNumber(messageObj.to || '');
      }
      messageBody = messageObj.body || '';
      messageId = messageObj.id;
      console.log('📱 OpenPhone format detected (data.object)');
      console.log(`   to field type: ${Array.isArray(messageObj.to) ? 'array' : 'string'}`);
    } else if (webhookData.object === 'message' || webhookData.id) {
      // OpenPhone format (alternative/older format)
      provider = 'openphone';
      fromNumber = normalizePhoneNumber(webhookData.from);
      // Handle 'to' as either string or array
      if (Array.isArray(webhookData.to)) {
        toNumber = normalizePhoneNumber(webhookData.to[0] || '');
      } else {
        toNumber = normalizePhoneNumber(webhookData.to || '');
      }
      messageBody = webhookData.body || '';
      messageId = webhookData.id;
      console.log('📱 OpenPhone format detected (direct object)');
      console.log(`   to field type: ${Array.isArray(webhookData.to) ? 'array' : 'string'}`);
    } else if (webhookData.MessageSid) {
      // Twilio format
      provider = 'twilio';
      fromNumber = normalizePhoneNumber(webhookData.From);
      toNumber = normalizePhoneNumber(webhookData.To);
      messageBody = webhookData.Body || '';
      messageId = webhookData.MessageSid;
      console.log('📱 Twilio format detected');
    } else {
      console.error('❌ Unknown webhook format:', JSON.stringify(webhookData));
      throw new Error('Unable to parse webhook format');
    }

    console.log(`📩 Incoming SMS:`);
    console.log(`   Provider: ${provider}`);
    console.log(`   From: ${fromNumber}`);
    console.log(`   To: ${toNumber}`);
    console.log(`   Message: "${messageBody.substring(0, 100)}..."`);
    console.log(`   Message ID: ${messageId}`);

    // Find the company by matching the receiving phone number
    // First, get all companies and normalize their phone numbers for comparison
    console.log(`🔍 Looking for company with phone: ${toNumber}`);
    
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, sms_phone_number')
      .not('sms_phone_number', 'is', null);

    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError);
      return new Response(JSON.stringify({ status: 'error', message: 'Database error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Find company by normalizing phone numbers on both sides
    const company = companies?.find(c => {
      const normalizedDbNumber = normalizePhoneNumber(c.sms_phone_number || '');
      console.log(`   Comparing: ${toNumber} with ${c.sms_phone_number} (normalized: ${normalizedDbNumber})`);
      return normalizedDbNumber === toNumber;
    });

    if (!company) {
      console.error('❌ No company found for phone number:', toNumber);
      console.error('   Searched through', companies?.length || 0, 'companies');
      // Still return 200 to avoid webhook retries
      return new Response(JSON.stringify({ status: 'ok', message: 'Company not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`✅ Company found: ${company.id}`);

    // Try to find the related property by matching the sender's phone number
    // Look for properties where the seller agent phone matches (normalize for comparison)
    console.log(`🔍 Looking for property with seller phone: ${fromNumber}`);
    
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, address, city, seller_agent_phone')
      .eq('company_id', company.id)
      .not('seller_agent_phone', 'is', null)
      .order('created_at', { ascending: false });

    let property = null;
    if (!propertiesError && properties) {
      // Find property by normalizing phone numbers on both sides
      property = properties.find(p => {
        const normalizedPropPhone = normalizePhoneNumber(p.seller_agent_phone || '');
        console.log(`   Comparing: ${fromNumber} with ${p.seller_agent_phone} (normalized: ${normalizedPropPhone})`);
        return normalizedPropPhone === fromNumber;
      });
    }

    if (!property) {
      console.log('⚠️ No property found for this phone number');
      console.log(`   Searched through ${properties?.length || 0} properties`);
    } else {
      console.log(`🏠 Property matched: ${property.address}, ${property.city}`);
    }

    // Analyze the message with OpenAI if configured
    let aiScore: number | null = null;
    let aiAnalysis: string | null = null;

    if (openAiKey && messageBody.trim().length > 0) {
      const analysis = await analyzeSellerResponse(messageBody, openAiKey);
      aiScore = analysis.score;
      aiAnalysis = analysis.analysis;
    } else {
      console.log('⚠️ Skipping AI analysis (no OpenAI key or empty message)');
    }

    // Insert SMS message into database
    const { data: smsMessage, error: insertError } = await supabase
      .from('sms_messages')
      .insert({
        company_id: company.id,
        property_id: property?.id || null,
        direction: 'incoming',
        from_number: fromNumber,
        to_number: toNumber,
        message: messageBody,
        status: 'received',
        ai_score: aiScore,
        ai_analysis: aiAnalysis,
        provider_message_id: messageId,
        metadata: {
          provider: provider,
          raw_webhook: webhookData
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting SMS:', insertError);
      throw insertError;
    }

    console.log(`✅ SMS stored with ID: ${smsMessage.id}`);
    console.log(`   AI Score: ${aiScore || 'N/A'}`);
    console.log(`   AI Analysis: ${aiAnalysis || 'N/A'}`);

    // Return success response
    return new Response(
      JSON.stringify({
        status: 'ok',
        message: 'SMS received and processed',
        sms_id: smsMessage.id,
        ai_score: aiScore,
        property_matched: !!property
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Return 200 to avoid webhook retries for non-recoverable errors
    return new Response(
      JSON.stringify({ status: 'error', message: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});

