import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SequenceStep {
  days_after: number;
  use_ai: boolean;
  template_id: string | null;
  message: string;
  ai_instructions: string;
}

interface SequenceConfig {
  steps: SequenceStep[];
  stop_on_reply: boolean;
  max_attempts: number;
  max_days: number;
  stop_on_workflow_states: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🔄 Starting SMS follow-up check...')

  try {
    // Find all active sequences where next_followup_at is due
    const { data: dueSequences, error: seqError } = await supabase
      .from('sms_followup_sequences')
      .select(`
        *,
        properties:property_id (
          id,
          address,
          city,
          state,
          zip,
          price,
          bedrooms,
          bathrooms,
          square_footage,
          living_sqf,
          days_on_market,
          seller_agent_name,
          seller_agent_phone,
          workflow_state
        ),
        automations:automation_id (
          id,
          name,
          is_active,
          company_id
        )
      `)
      .eq('status', 'active')
      .lte('next_followup_at', new Date().toISOString())

    if (seqError) {
      console.error('❌ Error fetching due sequences:', seqError)
      throw seqError
    }

    console.log(`📋 Found ${dueSequences?.length || 0} sequences due for follow-up`)

    const results = {
      processed: 0,
      sent: 0,
      stopped: 0,
      errors: 0
    }

    for (const sequence of dueSequences || []) {
      console.log(`\n📍 Processing sequence ${sequence.id} for property ${sequence.properties?.address}`)
      results.processed++

      try {
        const config: SequenceConfig = sequence.sequence_config
        const property = sequence.properties
        const automation = sequence.automations

        // Check if automation is still active
        if (!automation?.is_active) {
          console.log('⚠️ Automation is no longer active, stopping sequence')
          await stopSequence(supabase, sequence.id, 'manual')
          results.stopped++
          continue
        }

        // Check stop conditions
        const stopReason = await checkStopConditions(supabase, sequence, property, config)
        if (stopReason) {
          console.log(`🛑 Stopping sequence: ${stopReason}`)
          await stopSequence(supabase, sequence.id, stopReason)
          results.stopped++
          continue
        }

        // Check if we've exceeded max attempts
        if (sequence.followup_count >= config.max_attempts) {
          console.log(`🛑 Max attempts reached (${sequence.followup_count}/${config.max_attempts})`)
          await stopSequence(supabase, sequence.id, 'max_attempts')
          results.stopped++
          continue
        }

        // Check if we've exceeded max days
        const daysSinceStart = Math.floor(
          (Date.now() - new Date(sequence.initial_sms_sent_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceStart > config.max_days) {
          console.log(`🛑 Max days exceeded (${daysSinceStart}/${config.max_days})`)
          await stopSequence(supabase, sequence.id, 'max_days')
          results.stopped++
          continue
        }

        // Get the current step configuration
        const currentStep = config.steps[sequence.current_step]
        if (!currentStep) {
          console.log('✅ All sequence steps completed')
          await supabase
            .from('sms_followup_sequences')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', sequence.id)
          results.stopped++
          continue
        }

        // Send the follow-up SMS
        console.log(`📤 Sending follow-up SMS (step ${sequence.current_step + 1})...`)
        
        let message = ''
        
        if (currentStep.use_ai) {
          // Generate AI message
          message = await generateAIMessage(property, currentStep.ai_instructions, sequence.followup_count)
        } else if (currentStep.message) {
          // Use template/custom message with variable replacement
          message = replaceVariables(currentStep.message, property)
        } else {
          console.error('❌ No message configured for this step')
          results.errors++
          continue
        }

        // Call send-sms function
        const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
          body: {
            type: 'single',
            to: property.seller_agent_phone,
            message: message,
            propertyId: property.id
          }
        })

        if (smsError) {
          console.error('❌ Failed to send SMS:', smsError)
          results.errors++
          continue
        }

        console.log('✅ Follow-up SMS sent successfully')
        results.sent++

        // Calculate next follow-up time
        const nextStep = config.steps[sequence.current_step + 1]
        let nextFollowupAt = null
        
        if (nextStep && sequence.followup_count + 1 < config.max_attempts) {
          // Calculate days until next step
          const daysUntilNext = nextStep.days_after - currentStep.days_after
          nextFollowupAt = new Date()
          nextFollowupAt.setDate(nextFollowupAt.getDate() + daysUntilNext)
        }

        // Update sequence tracker
        await supabase
          .from('sms_followup_sequences')
          .update({
            followup_count: sequence.followup_count + 1,
            current_step: sequence.current_step + 1,
            last_followup_at: new Date().toISOString(),
            next_followup_at: nextFollowupAt?.toISOString() || null,
            status: nextFollowupAt ? 'active' : 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', sequence.id)

      } catch (error) {
        console.error(`❌ Error processing sequence ${sequence.id}:`, error)
        results.errors++
      }
    }

    console.log('\n📊 Summary:')
    console.log(`   Processed: ${results.processed}`)
    console.log(`   SMS Sent: ${results.sent}`)
    console.log(`   Stopped: ${results.stopped}`)
    console.log(`   Errors: ${results.errors}`)

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Fatal error in check-sms-followups:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function checkStopConditions(
  supabase: any,
  sequence: any,
  property: any,
  config: SequenceConfig
): Promise<string | null> {
  
  // Check if reply was received (if stop_on_reply is enabled)
  if (config.stop_on_reply !== false) {
    const { data: inboundSms, error } = await supabase
      .from('sms_messages')
      .select('id')
      .eq('property_id', property.id)
      .eq('direction', 'incoming')
      .gt('created_at', sequence.initial_sms_sent_at)
      .limit(1)

    if (!error && inboundSms && inboundSms.length > 0) {
      return 'reply_received'
    }
  }

  // Check if workflow state changed to a stop state
  if (config.stop_on_workflow_states && config.stop_on_workflow_states.length > 0) {
    if (config.stop_on_workflow_states.includes(property.workflow_state)) {
      return 'workflow_changed'
    }
  }

  return null
}

async function stopSequence(supabase: any, sequenceId: string, reason: string) {
  await supabase
    .from('sms_followup_sequences')
    .update({
      status: 'stopped',
      stop_reason: reason,
      next_followup_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', sequenceId)
}

function replaceVariables(message: string, property: any): string {
  return message
    .replace(/\{\{AGENT_NAME\}\}/gi, property.seller_agent_name || '')
    .replace(/\{\{ADDRESS\}\}/gi, property.address || '')
    .replace(/\{\{PRICE\}\}/gi, property.price ? `$${property.price.toLocaleString()}` : '')
    .replace(/\{\{BEDS\}\}/gi, property.bedrooms?.toString() || '')
    .replace(/\{\{BATHS\}\}/gi, property.bathrooms?.toString() || '')
    .replace(/\{\{SQFT\}\}/gi, property.square_footage?.toString() || property.living_sqf?.toString() || '')
    .replace(/\{\{CITY\}\}/gi, property.city || '')
    .replace(/\{\{STATE\}\}/gi, property.state || '')
}

async function generateAIMessage(property: any, instructions: string, followupCount: number): Promise<string> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const propertyContext = `
Property Details:
- Address: ${property.address}, ${property.city}, ${property.state} ${property.zip}
- Price: $${property.price?.toLocaleString() || 'N/A'}
- Bedrooms: ${property.bedrooms || 'N/A'}
- Bathrooms: ${property.bathrooms || 'N/A'}
- Square Feet: ${property.square_footage || property.living_sqf || 'N/A'}
- Days on Market: ${property.days_on_market || 'N/A'}
- Agent: ${property.seller_agent_name || 'Unknown'}

This is follow-up #${followupCount + 1}.
${instructions ? `Special Instructions: ${instructions}` : ''}
`.trim()

  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a professional real estate investor assistant. Generate a concise, professional follow-up SMS message (160 characters max) to a real estate agent. This is a follow-up message - be polite but persistent. Reference that you reached out before. ${instructions || ''}`
        },
        {
          role: 'user',
          content: propertyContext
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    })
  })

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text()
    throw new Error(`OpenAI API error: ${aiResponse.status} - ${errorText}`)
  }

  const aiData = await aiResponse.json()
  const message = aiData.choices[0]?.message?.content?.trim()
  
  if (!message) {
    throw new Error('AI generated empty message')
  }

  return message
}
