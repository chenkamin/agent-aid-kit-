# Execute Automation Edge Function

Executes automation workflows based on triggers and processes action nodes.

## Purpose

This function is called when an automation is triggered (e.g., when an SMS is sent/received, workflow state changes, etc.) and executes all configured actions in the automation flow.

## Request Body

```json
{
  "automationId": "uuid",
  "propertyId": "uuid (optional)",
  "triggerType": "sms_sent | sms_received | workflow_changed | etc"
}
```

## Supported Actions

### 1. Send SMS (`send_sms`)
- Sends an SMS message to the property's agent
- Replaces template variables: `{{AGENT_NAME}}`, `{{ADDRESS}}`, `{{PRICE}}`, `{{BEDS}}`, `{{BATHS}}`, `{{SQFT}}`
- Requires: `config.message`, property with `seller_agent_phone`

### 2. Update Workflow (`update_workflow`)
- Updates the workflow state of a property
- Requires: `config.new_state`, property

### 3. Create Activity (`create_activity`)
- Creates a new activity/task for a property
- Requires: `config.type`, `config.title`, `config.due_days`, property

## Response

```json
{
  "success": true,
  "actions": [
    {
      "type": "send_sms",
      "status": "success",
      "to": "+12345678900"
    }
  ],
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 0,
    "skipped": 1
  }
}
```

## Environment Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

## Execution Flow

1. Fetch automation from database
2. Verify automation is active
3. Load property data if `propertyId` provided
4. Iterate through all action nodes in the flow
5. Execute each action based on its type
6. Log execution results to `automation_logs` table
7. Update automation statistics (`trigger_count`, `success_count`, etc.)

## Action Status Codes

- `success` - Action completed successfully
- `error` - Action failed (error details included)
- `skipped` - Action skipped (e.g., missing required data)

## Example Usage

### Trigger automation when SMS is sent

```typescript
const { data, error } = await supabase.functions.invoke('execute-automation', {
  body: {
    automationId: 'automation-uuid',
    propertyId: 'property-uuid',
    triggerType: 'sms_sent'
  }
})
```

### Manual trigger

```typescript
const { data, error } = await supabase.functions.invoke('execute-automation', {
  body: {
    automationId: 'automation-uuid',
    triggerType: 'manual'
  }
})
```

## Database Tables Used

- `automations` - Reads automation configuration
- `properties` - Reads property data for variable replacement
- `automation_logs` - Writes execution logs
- Calls `send-sms` function for SMS actions
- Writes to `activities` table for create_activity actions

## Error Handling

- Returns 400 status code on error
- Logs detailed error messages to console
- Records failed actions in execution log
- Does not stop execution if one action fails (continues to next action)

## Logging

All execution steps are logged with emoji prefixes for easy scanning:
- 🤖 Automation start
- ✅ Success
- ❌ Error
- ⚠️ Warning/Skipped
- 📤 SMS sending
- 🔄 Workflow update
- 📅 Activity creation
- 📊 Logging
- 📈 Stats update

