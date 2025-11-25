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

  try {
    const { automationId, propertyId, triggerType } = await req.json()
    
    console.log(`🤖 Executing automation ${automationId} for property ${propertyId || 'N/A'}`)
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get automation
    const { data: automation, error: autoError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automationId)
      .eq('is_active', true)
      .single()

    if (autoError || !automation) {
      console.error('❌ Automation not found or inactive:', autoError)
      throw new Error('Automation not found or inactive')
    }

    console.log(`✅ Found automation: ${automation.name}`)

    // Get property data if propertyId provided
    let property = null
    if (propertyId) {
      const { data, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single()
      
      if (propError) {
        console.error('❌ Property not found:', propError)
      } else {
        property = data
        console.log(`✅ Found property: ${property.address}`)
      }
    }

    // Execute the automation flow
    const actions = []
    const flowNodes = automation.flow_data.nodes || []
    
    console.log(`📋 Processing ${flowNodes.length} nodes in automation`)

    for (const node of flowNodes) {
      if (node.type === 'action') {
        console.log(`⚡ Executing action: ${node.data.label}`)
        const config = node.data.config || {}
        
        // Handle different action types
        switch (node.data.label) {
          case 'send_sms':
            if (property && property.seller_agent_phone) {
              let message = ''
              
              // Check if AI auto-pilot is enabled
              if (config.ai_autopilot) {
                console.log(`🤖 AI Auto-Pilot enabled - generating message...`)
                
                // Prepare property context for AI
                const propertyContext = `
Property Details:
- Address: ${property.address}, ${property.city}, ${property.state} ${property.zip}
- Price: $${property.price?.toLocaleString() || 'N/A'}
- Bedrooms: ${property.bedrooms || 'N/A'}
- Bathrooms: ${property.bathrooms || 'N/A'}
- Square Feet: ${property.square_footage || property.living_sqf || 'N/A'}
- Days on Market: ${property.days_on_market || 'N/A'}
- Agent: ${property.seller_agent_name || 'Unknown'}

${config.ai_instructions ? `Special Instructions: ${config.ai_instructions}` : ''}
`.trim()

                try {
                  // Call OpenAI to generate message
                  const openaiKey = Deno.env.get('OPENAI_API_KEY')
                  if (!openaiKey) {
                    throw new Error('OpenAI API key not configured')
                  }

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
                          content: `You are a professional real estate investor assistant. Generate a concise, professional SMS message (160 characters max) to a real estate agent expressing interest in the property. Be friendly, direct, and include specific property details. ${config.ai_instructions || ''}`
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
                  message = aiData.choices[0]?.message?.content?.trim() || ''
                  
                  if (!message) {
                    throw new Error('AI generated empty message')
                  }

                  console.log(`✅ AI generated message: ${message.substring(0, 50)}...`)
                } catch (aiError) {
                  console.error(`❌ AI message generation failed:`, aiError)
                  actions.push({ 
                    type: 'send_sms', 
                    status: 'error', 
                    error: `AI generation failed: ${aiError.message}`,
                    to: property.seller_agent_phone 
                  })
                  break // Skip to next action
                }
              } else {
                // Use manual message with variable replacement
                message = config.message || ''
                message = message
                  .replace(/\{\{AGENT_NAME\}\}/gi, property.seller_agent_name || '')
                  .replace(/\{\{ADDRESS\}\}/gi, property.address || '')
                  .replace(/\{\{PRICE\}\}/gi, property.price ? `$${property.price.toLocaleString()}` : '')
                  .replace(/\{\{BEDS\}\}/gi, property.bedrooms?.toString() || '')
                  .replace(/\{\{BATHS\}\}/gi, property.bathrooms?.toString() || '')
                  .replace(/\{\{SQFT\}\}/gi, property.square_footage?.toString() || property.living_sqf?.toString() || '')
              }

              console.log(`📤 Sending SMS to ${property.seller_agent_phone}`)
              console.log(`   Message: ${message.substring(0, 50)}...`)

              try {
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
                  console.error(`❌ SMS send failed:`, smsError)
                  actions.push({ 
                    type: 'send_sms', 
                    status: 'error', 
                    error: smsError.message,
                    to: property.seller_agent_phone 
                  })
                } else {
                  console.log(`✅ SMS sent successfully`)
                  actions.push({ 
                    type: 'send_sms', 
                    status: 'success', 
                    to: property.seller_agent_phone,
                    message: message.substring(0, 100),
                    ai_generated: config.ai_autopilot || false
                  })
                }
              } catch (error) {
                console.error(`❌ Error calling send-sms function:`, error)
                actions.push({ 
                  type: 'send_sms', 
                  status: 'error', 
                  error: error.message,
                  to: property.seller_agent_phone 
                })
              }
            } else {
              console.log(`⚠️ Skipping SMS - no property or phone number`)
              actions.push({ 
                type: 'send_sms', 
                status: 'skipped', 
                reason: 'No property or phone number' 
              })
            }
            break

          case 'update_workflow':
            if (property && config.new_state) {
              console.log(`🔄 Updating workflow state to: ${config.new_state}`)
              const { error: updateError } = await supabase
                .from('properties')
                .update({ workflow_state: config.new_state })
                .eq('id', property.id)

              if (updateError) {
                console.error(`❌ Workflow update failed:`, updateError)
                actions.push({ 
                  type: 'update_workflow', 
                  status: 'error', 
                  error: updateError.message 
                })
              } else {
                console.log(`✅ Workflow updated successfully`)
                actions.push({ 
                  type: 'update_workflow', 
                  status: 'success', 
                  new_state: config.new_state 
                })
              }
            } else {
              console.log(`⚠️ Skipping workflow update - no property or state`)
              actions.push({ 
                type: 'update_workflow', 
                status: 'skipped', 
                reason: 'No property or new state configured' 
              })
            }
            break

          case 'create_activity':
            if (property && config.type && config.title) {
              console.log(`📅 Creating activity: ${config.title}`)
              const dueDate = new Date()
              dueDate.setDate(dueDate.getDate() + (parseInt(config.due_days) || 1))

              const { error: activityError } = await supabase
                .from('activities')
                .insert({
                  company_id: automation.company_id,
                  property_id: property.id,
                  type: config.type,
                  title: config.title,
                  notes: `Created by automation: ${automation.name}`,
                  due_date: dueDate.toISOString(),
                  status: 'pending'
                })

              if (activityError) {
                console.error(`❌ Activity creation failed:`, activityError)
                actions.push({ 
                  type: 'create_activity', 
                  status: 'error', 
                  error: activityError.message 
                })
              } else {
                console.log(`✅ Activity created successfully`)
                actions.push({ 
                  type: 'create_activity', 
                  status: 'success', 
                  activity_type: config.type 
                })
              }
            } else {
              console.log(`⚠️ Skipping activity creation - missing configuration`)
              actions.push({ 
                type: 'create_activity', 
                status: 'skipped', 
                reason: 'Missing required configuration' 
              })
            }
            break

          default:
            console.log(`⚠️ Unknown action type: ${node.data.label}`)
            actions.push({ 
              type: node.data.label, 
              status: 'skipped', 
              reason: 'Action type not implemented' 
            })
        }
      }
    }

    // Log execution
    console.log(`📊 Logging automation execution`)
    const { error: logError } = await supabase.from('automation_logs').insert({
      automation_id: automationId,
      company_id: automation.company_id,
      trigger_type: triggerType,
      property_id: propertyId,
      status: 'success',
      actions_executed: actions
    })

    if (logError) {
      console.error(`⚠️ Failed to log automation execution:`, logError)
    }

    // Update automation stats
    console.log(`📈 Updating automation stats`)
    const { error: statsError } = await supabase
      .from('automations')
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: automation.trigger_count + 1,
        success_count: automation.success_count + 1
      })
      .eq('id', automationId)

    if (statsError) {
      console.error(`⚠️ Failed to update automation stats:`, statsError)
    }

    console.log(`✅ Automation execution completed`)
    console.log(`   Actions executed: ${actions.length}`)
    console.log(`   Successful: ${actions.filter(a => a.status === 'success').length}`)
    console.log(`   Failed: ${actions.filter(a => a.status === 'error').length}`)
    console.log(`   Skipped: ${actions.filter(a => a.status === 'skipped').length}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        actions,
        summary: {
          total: actions.length,
          successful: actions.filter(a => a.status === 'success').length,
          failed: actions.filter(a => a.status === 'error').length,
          skipped: actions.filter(a => a.status === 'skipped').length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Automation execution error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
