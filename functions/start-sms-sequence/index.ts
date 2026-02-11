import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { propertyId, companyId, smsMessageId } = await req.json()

    if (!propertyId || !companyId) {
      throw new Error('Missing required parameters: propertyId and companyId')
    }

    console.log(`🔄 Checking for SMS no-reply automations for company ${companyId}`)

    // Find all active automations with sms_no_reply trigger for this company
    const { data: automations, error: autoError } = await supabase
      .from('automations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (autoError) {
      console.error('❌ Error fetching automations:', autoError)
      throw autoError
    }

    // Filter automations that have sms_no_reply trigger
    const smsNoReplyAutomations = automations?.filter(auto => {
      const nodes = auto.flow_data?.nodes || []
      return nodes.some((node: any) => 
        node.type === 'trigger' && node.data?.label === 'sms_no_reply'
      )
    }) || []

    console.log(`📋 Found ${smsNoReplyAutomations.length} SMS no-reply automations`)

    if (smsNoReplyAutomations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No SMS no-reply automations configured', sequencesCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get property data for workflow state
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('workflow_state')
      .eq('id', propertyId)
      .single()

    if (propError) {
      console.error('❌ Error fetching property:', propError)
      throw propError
    }

    let sequencesCreated = 0

    for (const automation of smsNoReplyAutomations) {
      console.log(`📍 Processing automation: ${automation.name}`)

      // Get the trigger node configuration
      const triggerNode = automation.flow_data?.nodes?.find((node: any) => 
        node.type === 'trigger' && node.data?.label === 'sms_no_reply'
      )

      if (!triggerNode?.data?.config) {
        console.log('⚠️ No configuration found for trigger, skipping')
        continue
      }

      const config = triggerNode.data.config

      // Check if there's already an active sequence for this property/automation
      const { data: existingSequence, error: existError } = await supabase
        .from('sms_followup_sequences')
        .select('id')
        .eq('automation_id', automation.id)
        .eq('property_id', propertyId)
        .eq('status', 'active')
        .single()

      if (existingSequence) {
        console.log('⚠️ Active sequence already exists for this property/automation, skipping')
        continue
      }

      // Calculate first follow-up time
      const firstStep = config.steps?.[0]
      if (!firstStep) {
        console.log('⚠️ No steps configured, skipping')
        continue
      }

      const nextFollowupAt = new Date()
      nextFollowupAt.setDate(nextFollowupAt.getDate() + firstStep.days_after)

      // Create the sequence tracker
      const { data: newSequence, error: createError } = await supabase
        .from('sms_followup_sequences')
        .insert({
          company_id: companyId,
          automation_id: automation.id,
          property_id: propertyId,
          status: 'active',
          initial_sms_id: smsMessageId || null,
          initial_sms_sent_at: new Date().toISOString(),
          followup_count: 0,
          current_step: 0,
          next_followup_at: nextFollowupAt.toISOString(),
          sequence_config: {
            steps: config.steps || [],
            stop_on_reply: config.stop_on_reply !== false,
            max_attempts: config.max_attempts || 3,
            max_days: config.max_days || 14,
            stop_on_workflow_states: config.stop_on_workflow_states || []
          },
          initial_workflow_state: property?.workflow_state || null
        })
        .select()
        .single()

      if (createError) {
        // Check if it's a unique constraint violation (sequence already exists)
        if (createError.code === '23505') {
          console.log('⚠️ Sequence already exists (constraint violation), skipping')
          continue
        }
        console.error('❌ Error creating sequence:', createError)
        continue
      }

      console.log(`✅ Created sequence ${newSequence.id}, first follow-up scheduled for ${nextFollowupAt.toISOString()}`)
      sequencesCreated++
    }

    console.log(`\n📊 Summary: ${sequencesCreated} sequence(s) created`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sequencesCreated,
        message: `${sequencesCreated} follow-up sequence(s) started`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in start-sms-sequence:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
