import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface SMSMessage {
  to: string;
  message: string;
  propertyId?: string; // Optional: for tracking which property the SMS is about
}

interface SingleSMSRequest {
  type: 'single';
  to: string;
  message: string;
  propertyId?: string; // Optional: for tracking which property the SMS is about
}

interface BulkSMSRequest {
  type: 'bulk';
  propertyIds: string[];
  messageTemplate: string; // Template with variables like {address}, {price}, {agentName}
}

type SMSRequest = SingleSMSRequest | BulkSMSRequest;

// Normalize phone number to E.164 format
// Removes all non-digit characters and adds + prefix if not present
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If number doesn't start with country code, assume US (+1)
  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }
  
  // Add + prefix if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

// OpenPhone API
async function sendOpenPhoneSMS(
  apiKey: string,
  from: string,
  to: string,
  message: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Normalize phone numbers to E.164 format
    const normalizedFrom = normalizePhoneNumber(from);
    const normalizedTo = normalizePhoneNumber(to);
    
    console.log(`📱 Sending SMS via OpenPhone`);
    console.log(`   Original from: "${from}" -> Normalized: "${normalizedFrom}"`);
    console.log(`   Original to: "${to}" -> Normalized: "${normalizedTo}"`);
    console.log(`   Message length: ${message.length} characters`);
    
    const requestBody = {
      from: normalizedFrom,
      to: [normalizedTo],
      content: message
    };
    
    console.log(`   Request body:`, JSON.stringify(requestBody));
    
    const response = await fetch('https://api.openphone.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenPhone API error: ${response.status}`);
      console.error(`   Response: ${errorText}`);
      return { success: false, error: `OpenPhone API error: ${response.status} - ${errorText.substring(0, 200)}` };
    }

    const result = await response.json();
    console.log(`✅ SMS sent via OpenPhone: ${result.id}`);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('❌ OpenPhone error:', error);
    return { success: false, error: error.message };
  }
}

// Twilio API
async function sendTwilioSMS(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  message: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Normalize phone numbers to E.164 format
    const normalizedFrom = normalizePhoneNumber(from);
    const normalizedTo = normalizePhoneNumber(to);
    
    console.log(`📱 Sending SMS via Twilio`);
    console.log(`   Original from: "${from}" -> Normalized: "${normalizedFrom}"`);
    console.log(`   Original to: "${to}" -> Normalized: "${normalizedTo}"`);
    console.log(`   Message length: ${message.length} characters`);
    
    // Twilio uses Basic Auth with AccountSid:AuthToken
    const credentials = btoa(`${accountSid}:${authToken}`);
    
    const body = new URLSearchParams({
      From: normalizedFrom,
      To: normalizedTo,
      Body: message
    });

    console.log(`   Request params: From=${normalizedFrom}, To=${normalizedTo}`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Twilio API error: ${response.status}`);
      console.error(`   Response: ${errorText}`);
      return { success: false, error: `Twilio API error: ${response.status} - ${errorText.substring(0, 200)}` };
    }

    const result = await response.json();
    console.log(`✅ SMS sent via Twilio: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('❌ Twilio error:', error);
    return { success: false, error: error.message };
  }
}

// Replace template variables with property data
function replaceTemplateVariables(template: string, property: any): string {
  return template
    .replace(/\{address\}/gi, property.address || 'N/A')
    .replace(/\{city\}/gi, property.city || 'N/A')
    .replace(/\{state\}/gi, property.state || 'N/A')
    .replace(/\{zip\}/gi, property.zip || 'N/A')
    .replace(/\{price\}/gi, property.price ? `$${Number(property.price).toLocaleString()}` : 'N/A')
    .replace(/\{agentName\}/gi, property.seller_agent_name || 'N/A')
    .replace(/\{agentPhone\}/gi, property.seller_agent_phone || 'N/A')
    .replace(/\{beds\}/gi, property.bedrooms?.toString() || 'N/A')
    .replace(/\{baths\}/gi, property.bathrooms?.toString() || 'N/A')
    .replace(/\{sqft\}/gi, property.square_footage?.toString() || 'N/A')
    .replace(/\{homeType\}/gi, property.home_type || 'N/A');
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
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Authenticate user
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

    // Get company SMS configuration
    const { data: company, error: companyConfigError } = await supabase
      .from('companies')
      .select('sms_provider, sms_api_key, sms_phone_number')
      .eq('id', userCompany.company_id)
      .single();

    if (companyConfigError || !company) throw new Error('Company not found');

    if (!company.sms_provider || !company.sms_api_key || !company.sms_phone_number) {
      console.error('❌ SMS not configured');
      console.error(`   Provider: ${company.sms_provider || 'NOT SET'}`);
      console.error(`   API Key: ${company.sms_api_key ? 'SET' : 'NOT SET'}`);
      console.error(`   Phone Number: ${company.sms_phone_number || 'NOT SET'}`);
      throw new Error('SMS not configured for your company. Please contact your administrator to set up SMS provider, API key, and phone number.');
    }

    console.log(`\n📱 SMS Configuration Loaded:`);
    console.log(`   Provider: ${company.sms_provider}`);
    console.log(`   From Number: ${company.sms_phone_number}`);
    console.log(`   API Key: ${company.sms_api_key ? '***' + company.sms_api_key.slice(-4) : 'NOT SET'}`);

    // Parse request
    const requestData: SMSRequest = await req.json();
    console.log(`\n📨 Request Type: ${requestData.type}`);

    let messages: SMSMessage[] = [];

    if (requestData.type === 'single') {
      // Single SMS
      console.log(`   To: ${requestData.to}`);
      console.log(`   Message: "${requestData.message.substring(0, 50)}${requestData.message.length > 50 ? '...' : ''}"`);
      console.log(`   Property ID: ${requestData.propertyId || 'N/A'}`);
      messages.push({
        to: requestData.to,
        message: requestData.message,
        propertyId: requestData.propertyId
      });
    } else if (requestData.type === 'bulk') {
      // Bulk SMS - fetch properties and replace template variables
      console.log(`📋 Fetching ${requestData.propertyIds.length} properties for bulk SMS`);
      
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .in('id', requestData.propertyIds)
        .eq('company_id', userCompany.company_id); // Security: only access own company's properties

      if (propertiesError) throw propertiesError;

      if (!properties || properties.length === 0) {
        throw new Error('No properties found for bulk SMS');
      }

      // For bulk SMS, we need phone numbers from the properties
      // Assuming we're sending to the agent's phone number
      for (const property of properties) {
        if (property.seller_agent_phone) {
          const message = replaceTemplateVariables(requestData.messageTemplate, property);
          messages.push({
            to: property.seller_agent_phone,
            message: message,
            propertyId: property.id
          });
        } else {
          console.log(`⚠️ Skipping property ${property.id} - no agent phone number`);
        }
      }

      if (messages.length === 0) {
        throw new Error('No valid phone numbers found in selected properties');
      }
    } else {
      throw new Error('Invalid request type. Must be "single" or "bulk"');
    }

    console.log(`📤 Sending ${messages.length} SMS message(s)`);

    // Send SMS messages
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const msg of messages) {
      let result;
      let messageId = null;

      if (company.sms_provider === 'openphone') {
        result = await sendOpenPhoneSMS(
          company.sms_api_key,
          company.sms_phone_number,
          msg.to,
          msg.message
        );
        messageId = result.messageId;
      } else if (company.sms_provider === 'twilio') {
        // For Twilio, the API key should be in format: AccountSid:AuthToken
        const [accountSid, authToken] = company.sms_api_key.split(':');
        if (!accountSid || !authToken) {
          throw new Error('Twilio API key must be in format: AccountSid:AuthToken');
        }
        result = await sendTwilioSMS(
          accountSid,
          authToken,
          company.sms_phone_number,
          msg.to,
          msg.message
        );
        messageId = result.messageId;
      } else {
        throw new Error(`Unsupported SMS provider: ${company.sms_provider}`);
      }

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Log the outgoing SMS to the database
      const { error: dbError } = await supabase
        .from('sms_messages')
        .insert({
          company_id: userCompany.company_id,
          property_id: msg.propertyId || null,
          direction: 'outgoing',
          from_number: company.sms_phone_number,
          to_number: msg.to,
          message: msg.message,
          status: result.success ? 'sent' : 'failed',
          provider_message_id: messageId,
          metadata: {
            provider: company.sms_provider,
            error: result.error
          }
        });

      if (dbError) {
        console.error('⚠️ Failed to log SMS to database:', dbError);
      } else {
        console.log('✅ SMS logged to database');
      }

      results.push({
        to: msg.to,
        propertyId: msg.propertyId,
        success: result.success,
        error: result.error
      });

      // Small delay between messages to avoid rate limiting
      if (messages.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ SMS sending complete: ${successCount} successful, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        message: `SMS sending complete: ${successCount} successful, ${errorCount} failed`,
        totalSent: messages.length,
        successCount,
        errorCount,
        results
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

