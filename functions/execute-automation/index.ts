import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface AutomationContext {
  trigger: string;
  property?: any;
  sms_message?: any;
  email_message?: any;
  ai_score?: number;
  old_workflow_state?: string;
  new_workflow_state?: string;
  company_id: string;
}

// Execute a single automation
async function executeAutomation(
  supabase: any,
  automation: any,
  context: AutomationContext
) {
  console.log(`🤖 Executing automation: ${automation.name}`);
  console.log(`   Trigger: ${context.trigger}`);
  
  const { nodes, edges } = automation.flow_data;
  
  // Find trigger node
  const triggerNode = nodes.find((n: any) => n.type === 'trigger');
  if (!triggerNode) {
    console.log('❌ No trigger node found in automation');
    return { status: 'skipped', reason: 'No trigger node' };
  }
  
  // Check if trigger matches
  const triggerType = triggerNode.data.label;
  if (triggerType !== context.trigger) {
    console.log(`❌ Trigger mismatch: expected ${triggerType}, got ${context.trigger}`);
    return { status: 'skipped', reason: 'Trigger mismatch' };
  }
  
  console.log(`✅ Trigger matches: ${triggerType}`);
  
  // Execute flow starting from trigger
  const executedActions: any[] = [];
  let currentNodeId = triggerNode.id;
  const visitedNodes = new Set<string>();
  
  while (currentNodeId && !visitedNodes.has(currentNodeId)) {
    visitedNodes.add(currentNodeId);
    const currentNode = nodes.find((n: any) => n.id === currentNodeId);
    
    if (!currentNode) {
      console.log(`⚠️ Node ${currentNodeId} not found, ending execution`);
      break;
    }
    
    console.log(`📍 Processing node: ${currentNode.type} - ${currentNode.data.label}`);
    
    if (currentNode.type === 'action') {
      // Execute action
      try {
        const result = await executeAction(supabase, currentNode, context);
        executedActions.push(result);
        console.log(`✅ Action executed:`, result);
      } catch (error) {
        console.error(`❌ Error executing action:`, error);
        executedActions.push({ 
          action: currentNode.data.label, 
          error: error.message 
        });
      }
      
      // Find next node (single output)
      const nextEdge = edges.find((e: any) => e.source === currentNodeId);
      currentNodeId = nextEdge?.target;
      
    } else if (currentNode.type === 'condition') {
      // Evaluate condition
      const conditionResult = evaluateCondition(currentNode, context);
      console.log(`🔍 Condition result: ${conditionResult ? 'TRUE' : 'FALSE'}`);
      
      // Find next edge based on condition result
      const handleId = conditionResult ? 'true' : 'false';
      const nextEdge = edges.find((e: any) => 
        e.source === currentNodeId && e.sourceHandle === handleId
      );
      currentNodeId = nextEdge?.target;
      
    } else {
      // Trigger node - move to next
      const nextEdge = edges.find((e: any) => e.source === currentNodeId);
      currentNodeId = nextEdge?.target;
    }
  }
  
  console.log(`✅ Automation completed. Executed ${executedActions.length} actions`);
  return { status: 'success', actions: executedActions };
}

// Execute specific action
async function executeAction(supabase: any, node: any, context: AutomationContext) {
  const actionType = node.data.label;
  const config = node.data.config || {};
  
  console.log(`⚡ Executing action: ${actionType}`, config);
  
  switch (actionType) {
    case 'update_workflow':
      if (!config.new_state) {
        throw new Error('No workflow state configured');
      }
      
      if (!context.property?.id) {
        throw new Error('No property in context');
      }
      
      const oldState = context.property.workflow_state || 'Initial';
      
      // Update property workflow state
      const { error: updateError } = await supabase
        .from('properties')
        .update({ workflow_state: config.new_state })
        .eq('id', context.property.id);
      
      if (updateError) throw updateError;
      
      // Record workflow history
      const { error: historyError } = await supabase
        .from('property_workflow_history')
        .insert({
          property_id: context.property.id,
          from_state: oldState,
          to_state: config.new_state,
          user_id: context.property.user_id,
          notes: 'Automated by workflow: ' + actionType
        });
      
      if (historyError) {
        console.error('⚠️ Failed to record history:', historyError);
      }
      
      console.log(`✅ Updated workflow: ${oldState} → ${config.new_state}`);
      
      return { 
        action: 'update_workflow', 
        from_state: oldState,
        to_state: config.new_state,
        property_id: context.property.id
      };
    
    case 'create_notification':
      if (!config.title) {
        throw new Error('No notification title configured');
      }
      
      // Get team members to notify
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('company_id', context.company_id);
      
      if (teamError) throw teamError;
      
      const recipients = config.recipient === 'all' 
        ? (teamMembers || []).map((tm: any) => tm.user_id)
        : [context.property?.user_id].filter(Boolean);
      
      if (recipients.length === 0) {
        console.log('⚠️ No recipients for notification');
        return { action: 'create_notification', recipients: 0 };
      }
      
      const notifications = recipients.map((userId: string) => ({
        user_id: userId,
        company_id: context.company_id,
        title: config.title,
        message: config.message || '',
        type: 'automation',
        property_id: context.property?.id || null
      }));
      
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);
      
      if (notifError) throw notifError;
      
      console.log(`✅ Created ${recipients.length} notification(s)`);
      
      return { 
        action: 'create_notification', 
        recipients: recipients.length,
        title: config.title
      };
    
    case 'create_activity':
      if (!config.type || !config.title) {
        throw new Error('Activity type and title required');
      }
      
      if (!context.property?.id) {
        throw new Error('No property in context');
      }
      
      // Calculate due date
      const daysOffset = parseInt(config.due_days || '1');
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + daysOffset);
      
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          company_id: context.company_id,
          property_id: context.property.id,
          user_id: context.property.user_id,
          type: config.type,
          title: config.title,
          status: 'open',
          due_at: dueDate.toISOString()
        });
      
      if (activityError) throw activityError;
      
      console.log(`✅ Created activity: ${config.title}`);
      
      return { 
        action: 'create_activity', 
        type: config.type,
        title: config.title,
        due_days: daysOffset
      };
    
    default:
      console.warn(`⚠️ Unknown action type: ${actionType}`);
      return { action: actionType, status: 'unknown' };
  }
}

// Evaluate condition
function evaluateCondition(node: any, context: AutomationContext): boolean {
  const conditionType = node.data.label;
  const config = node.data.config || {};
  
  console.log(`🔍 Evaluating condition: ${conditionType}`, config);
  
  switch (conditionType) {
    case 'ai_score':
      const score = context.ai_score || 0;
      const result = evaluateComparison(score, config.operator || '>', parseInt(config.value || '2'));
      console.log(`   AI Score: ${score} ${config.operator} ${config.value} = ${result}`);
      return result;
    
    case 'workflow_state':
      const currentState = context.property?.workflow_state || 'Initial';
      const matches = currentState === config.state;
      console.log(`   Workflow State: ${currentState} == ${config.state} = ${matches}`);
      return matches;
    
    case 'property_value':
      const fieldValue = context.property?.[config.field];
      return evaluateComparison(fieldValue, config.operator, config.value);
    
    default:
      console.warn(`⚠️ Unknown condition type: ${conditionType}`);
      return false;
  }
}

function evaluateComparison(a: any, operator: string, b: any): boolean {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  
  switch (operator) {
    case '>': return numA > numB;
    case '<': return numA < numB;
    case '>=': return numA >= numB;
    case '<=': return numA <= numB;
    case '==': return a == b;
    case '!=': return a != b;
    default: return false;
  }
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('\n🚀 Automation execution triggered');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { trigger, context } = await req.json();
    
    console.log(`📥 Received trigger: ${trigger}`);
    console.log(`   Company ID: ${context.company_id}`);
    console.log(`   Property ID: ${context.property?.id}`);
    
    if (!context.company_id) {
      throw new Error('company_id is required in context');
    }
    
    // Fetch all active automations for this company
    const { data: automations, error: automationsError } = await supabase
      .from('automations')
      .select('*')
      .eq('company_id', context.company_id)
      .eq('is_active', true);
    
    if (automationsError) throw automationsError;
    
    console.log(`📋 Found ${automations?.length || 0} active automation(s)`);
    
    if (!automations || automations.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No active automations found',
          results: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Execute each matching automation
    const results = [];
    for (const automation of automations) {
      console.log(`\n🔄 Processing automation: ${automation.name}`);
      
      try {
        const result = await executeAutomation(supabase, automation, { 
          trigger, 
          ...context 
        });
        
        results.push({ 
          automation_id: automation.id, 
          automation_name: automation.name,
          ...result 
        });
        
        // Log execution
        await supabase.from('automation_logs').insert({
          automation_id: automation.id,
          company_id: context.company_id,
          trigger_type: trigger,
          property_id: context.property?.id || null,
          status: result.status,
          actions_executed: result.actions || []
        });
        
        // Update automation stats
        if (result.status === 'success') {
          await supabase
            .from('automations')
            .update({
              last_triggered_at: new Date().toISOString(),
              trigger_count: automation.trigger_count + 1,
              success_count: automation.success_count + 1
            })
            .eq('id', automation.id);
        } else {
          await supabase
            .from('automations')
            .update({
              last_triggered_at: new Date().toISOString(),
              trigger_count: automation.trigger_count + 1
            })
            .eq('id', automation.id);
        }
        
      } catch (error) {
        console.error(`❌ Error executing automation ${automation.id}:`, error);
        
        results.push({ 
          automation_id: automation.id, 
          automation_name: automation.name,
          status: 'error', 
          error: error.message 
        });
        
        // Log error
        await supabase.from('automation_logs').insert({
          automation_id: automation.id,
          company_id: context.company_id,
          trigger_type: trigger,
          property_id: context.property?.id || null,
          status: 'error',
          error_message: error.message
        });
        
        // Update error count
        await supabase
          .from('automations')
          .update({
            last_triggered_at: new Date().toISOString(),
            trigger_count: automation.trigger_count + 1,
            error_count: automation.error_count + 1
          })
          .eq('id', automation.id);
      }
    }
    
    console.log(`\n✅ Execution complete. Processed ${results.length} automation(s)`);
    
    return new Response(
      JSON.stringify({ 
        message: 'Automations executed',
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

