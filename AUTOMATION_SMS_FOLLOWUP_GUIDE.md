# Automated SMS Follow-up Feature

## Overview

You can now create automated SMS follow-up workflows in your automation system! This allows you to automatically send personalized SMS messages to property agents based on triggers like workflow changes, SMS sent/received, or custom events.

## How to Use

### 1. Navigate to Automations Page

Go to the **Automations** page in your app.

### 2. Create a New Automation

Click the **"New"** button to start building your automation workflow.

### 3. Add Trigger Node

Add a trigger node to start your workflow:
- **📤 SMS Sent** - Triggers when you send an SMS
- **📥 SMS Received** - Triggers when you receive an SMS
- **🔄 Workflow Changed** - Triggers when a property's workflow state changes

### 4. Add Conditions (Optional)

Add condition nodes to filter when the automation should run:
- **🤖 AI Score** - Check if AI motivation score meets criteria
- **🎯 Workflow State** - Check if property is in a specific workflow state

### 5. Add "Send SMS" Action

1. Click the **"📤 Send SMS"** button in the Actions section
2. Connect it to your trigger/condition nodes
3. Click on the SMS node to configure it

### 6. Configure SMS Message

In the SMS configuration dialog, you can set:

**SMS Template (Optional):**
- Enter a template name from your saved SMS templates
- Leave empty to use a custom message

**Message:**
- Write your SMS message
- Use template variables to personalize:
  - `{{AGENT_NAME}}` - Agent's name
  - `{{ADDRESS}}` - Property address
  - `{{PRICE}}` - Property price
  - `{{BEDS}}` - Number of bedrooms
  - `{{BATHS}}` - Number of bathrooms
  - `{{SQFT}}` - Square footage

**Example Message:**
```
Hi {{AGENT_NAME}}, I'm interested in {{ADDRESS}}. Would you consider an offer of {{PRICE}}? Looking forward to hearing from you!
```

**Delay (Hours):**
- Set how many hours to wait before sending (0 = immediate)
- Useful for follow-up sequences (e.g., send 24 hours after initial contact)

### 7. Save Your Automation

1. Give your automation a name (e.g., "Auto Follow-up - 24hr")
2. Click **"Save"**
3. Toggle the switch to activate it

## Example Workflows

### Workflow 1: Instant Follow-up on SMS Sent
```
[SMS Sent Trigger] → [Send SMS Action]
  Message: "Thanks for your interest! We'll review {{ADDRESS}} and get back to you soon."
  Delay: 0 hours
```

### Workflow 2: 24-Hour Follow-up for Hot Leads
```
[Workflow Changed Trigger] 
  → [AI Score > 2 Condition] 
    → [Send SMS Action]
      Message: "Hi {{AGENT_NAME}}, following up on {{ADDRESS}}. Still available at {{PRICE}}?"
      Delay: 24 hours
```

### Workflow 3: Multi-step Follow-up Sequence
```
[SMS Received Trigger]
  → [Update Workflow to "Follow Up"]
    → [Send SMS #1 - Immediate]
      → [Create Activity "Call in 3 days"]
        → [Send SMS #2 - 72 hour delay]
```

## Backend Execution

The automation executes via the `execute-automation` edge function. To manually trigger an automation:

```typescript
const { data, error } = await supabase.functions.invoke('execute-automation', {
  body: {
    automationId: 'your-automation-uuid',
    propertyId: 'property-uuid',
    triggerType: 'sms_sent'
  }
})
```

## Features

✅ **Personalized Messages** - Template variables auto-fill with property data  
✅ **Delayed Sending** - Schedule follow-ups hours or days in advance  
✅ **Visual Workflow Builder** - Drag-and-drop interface  
✅ **Condition Filtering** - Only send to qualified leads  
✅ **Execution Logging** - Track every automation run  
✅ **Multiple Actions** - Combine SMS with workflow updates and activities  

## Requirements

- SMS provider configured (OpenPhone or Twilio)
- Active phone number in company settings
- Properties must have `seller_agent_phone` field populated

## Tips

1. **Start Simple**: Create a basic workflow first, then add conditions
2. **Test First**: Use a small subset of properties to test your messages
3. **Monitor Logs**: Check the automation logs to see execution history
4. **Use Delays**: Spread out follow-ups to avoid overwhelming agents
5. **Personalize**: Always use at least one variable ({{AGENT_NAME}}) to make messages feel personal

## Next Steps

- Set up triggers to automatically execute automations
- Create templates for common follow-up scenarios
- Monitor automation statistics (trigger count, success rate)
- Build complex workflows with multiple conditions and actions

## Need Help?

Check the `functions/execute-automation/README.md` for technical details about the backend execution.

