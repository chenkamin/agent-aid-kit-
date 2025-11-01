# Communication Templates System

## Overview

The Communication page provides a powerful template management system for Email and SMS communications with smart variable substitution.

## Features

### 1. **Smart Templates with Variables**

Templates support dynamic variables that can be replaced with actual property and contact data:

- `{{PROPERTY}}` - Property address
- `{{PRICE}}` - Property price
- `{{AGENT_NAME}}` - Agent/contact name
- `{{BEDROOMS}}` - Number of bedrooms
- `{{BATHROOMS}}` - Number of bathrooms
- `{{SQFT}}` - Square footage

### 2. **AI-Powered Template Generation**

The system includes an AI assistant powered by OpenAI GPT-4o-mini that can generate professional templates based on natural language descriptions.

**How to use:**
1. Describe the template you need in the AI prompt box
2. Click "Generate Email Template" or "Generate SMS Template"
3. The AI will create a professional template with appropriate variables
4. Review and save the template

**Example prompts:**
- "Create a follow-up email for a property I viewed last week"
- "Create an SMS to ask about property price reduction"
- "Generate a professional offer email template"
- "Create a quick SMS to schedule a viewing"

### 3. **Email Templates**

**Features:**
- Subject line with variable support
- Rich text body with unlimited length
- Click-to-insert variable buttons
- Template preview with variable badges
- Edit and delete functionality
- **Variable validation** - Automatic detection and warning for invalid variables
- Manual creation option alongside AI generation

**Example Email Template:**
```
Name: Property Follow-up
Subject: Following up on {{PROPERTY}}

Hello {{AGENT_NAME}},

I'm interested in the property at {{PROPERTY}} listed at {{PRICE}}. 
The {{BEDROOMS}} bed, {{BATHROOMS}} bath layout with {{SQFT}} sqft 
seems perfect for my needs.

Could we schedule a viewing this week?

Best regards
```

### 4. **SMS Templates**

**Features:**
- 160 character limit (standard SMS)
- Character counter
- Quick variable insertion
- Template preview with variable badges
- **Variable validation** - Real-time validation of template variables
- Manual creation option alongside AI generation
- Edit and delete functionality

**Example SMS Template:**
```
Name: Quick Property Inquiry
Body: Hi {{AGENT_NAME}}! Interested in {{PROPERTY}} at {{PRICE}}. 
Is it still available? Can we view it?
```

### 5. **Connection Settings**

Store your communication service credentials securely:

**Email Configuration (SMTP):**
- Host (e.g., smtp.gmail.com)
- Port (e.g., 587)
- Username
- Password/App Password

**SMS Configuration (Twilio):**
- Account SID
- Auth Token
- Phone Number

## Database Schema

### email_templates
```sql
- id (uuid)
- user_id (uuid)
- name (text)
- subject (text)
- body (text)
- created_at (timestamp)
- updated_at (timestamp)
```

### sms_templates
```sql
- id (uuid)
- user_id (uuid)
- name (text)
- body (text)
- created_at (timestamp)
- updated_at (timestamp)
```

### communication_settings
```sql
- id (uuid)
- user_id (uuid)
- email_host (text)
- email_port (text)
- email_username (text)
- email_password (text)
- sms_api_key (text)
- sms_api_secret (text)
- sms_from_number (text)
- created_at (timestamp)
- updated_at (timestamp)
```

## Edge Function: generate-template

**Endpoint:** `/functions/v1/generate-template`

**Method:** POST

**Request Body:**
```json
{
  "prompt": "Create a follow-up email for a property viewing",
  "type": "email" | "sms"
}
```

**Response (Email):**
```json
{
  "name": "Property Follow-up",
  "subject": "Following up on {{PROPERTY}}",
  "body": "Hello {{AGENT_NAME}},\n\nI recently viewed {{PROPERTY}}..."
}
```

**Response (SMS):**
```json
{
  "name": "Quick Follow-up",
  "body": "Hi {{AGENT_NAME}}! Still interested in {{PROPERTY}}. Let me know!"
}
```

## UI Components

### Sidebar Navigation
- Replaced top navigation bar with a collapsible sidebar
- Fixed sidebar on the left with smooth transitions
- Toggle button to collapse/expand
- Icon-only mode when collapsed
- User profile at the bottom

### Template Cards
- Visual display of templates with preview
- Variable badges showing which variables are used
- Quick edit and delete actions
- Subject line display for email templates
- Character count for SMS templates

### Variable Insertion
- Click-to-insert buttons in template editors
- Automatic cursor positioning after insertion
- Visual highlighting of available variables
- Helper text explaining variable usage

## Using Templates with Properties

When sending communications about a property, the system will:

1. Load the selected template
2. Replace `{{PROPERTY}}` with the property address
3. Replace `{{PRICE}}` with the formatted price
4. Replace `{{AGENT_NAME}}` with the agent's name
5. Replace `{{BEDROOMS}}`, `{{BATHROOMS}}`, `{{SQFT}}` with property details
6. Send the personalized message

## Template Variable Validation

The system includes robust validation to ensure templates only use valid variables:

### How It Works

1. **Real-time Validation**: As you type, the system checks for invalid variables
2. **Visual Feedback**: Invalid variables are highlighted with a warning message
3. **Save Protection**: Templates with invalid variables cannot be saved until corrected
4. **Clear Guidance**: The error message shows which variables are invalid and lists all valid options

### Valid Variables

Only these variables are recognized:
- `{{PROPERTY}}` - Property address
- `{{PRICE}}` - Property price
- `{{AGENT_NAME}}` - Agent/contact name
- `{{BEDROOMS}}` - Number of bedrooms
- `{{BATHROOMS}}` - Number of bathrooms
- `{{SQFT}}` - Square footage

### Example Validation Errors

❌ **Invalid**: `{{ADRESS}}` (misspelled)
✅ **Valid**: `{{PROPERTY}}`

❌ **Invalid**: `{{property}}` (lowercase)
✅ **Valid**: `{{PROPERTY}}`

❌ **Invalid**: `{{PHONE}}` (not supported)
✅ **Valid**: Use `{{AGENT_NAME}}` and add phone manually

## Security

- All templates are user-specific (RLS policies)
- Connection credentials are stored encrypted
- AI-generated content is reviewed before saving
- Authentication required for all operations
- Template variables are validated to prevent errors

## Future Enhancements

- [ ] Template categories/tags
- [ ] Template sharing between team members
- [ ] Bulk email/SMS sending
- [ ] Message history tracking
- [ ] Analytics (open rates, response rates)
- [ ] Additional variables (date, time, custom fields)
- [ ] Rich text editor for email templates
- [ ] MMS support for SMS templates
- [ ] Template versioning
- [ ] A/B testing for templates

## Environment Variables Required

Add to your Supabase project settings:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## Usage Example

1. **Create a template:**
   - Go to Communication page
   - Click "New Email Template" or use AI to generate one
   - Add variables like `{{PROPERTY}}` and `{{PRICE}}`
   - Save the template

2. **Use the template:**
   - Select a property
   - Choose "Send Email" or "Send SMS"
   - Select a saved template
   - Review the populated message with actual values
   - Send

## Best Practices

1. **Keep SMS templates under 160 characters** to avoid multi-part messages
2. **Use clear variable names** that make sense in context
3. **Test templates** with sample data before using
4. **Create variations** for different scenarios (initial contact, follow-up, closing)
5. **Be professional** - templates represent your business
6. **Include call-to-action** - make it clear what you want the recipient to do

## Troubleshooting

**Templates not saving:**
- Check browser console for errors
- Verify you're logged in
- Ensure template has required fields (name, body)
- **Check for invalid variables** - Look for the red warning box indicating invalid variables

**"Invalid variables found" error:**
- Review the error message to see which variables are invalid
- Ensure all variables use UPPERCASE letters only
- Check spelling (e.g., `{{PROPERTY}}` not `{{ADRESS}}`)
- Use only variables from the approved list
- Remove or fix any custom variables

**AI generation failing:**
- Check OPENAI_API_KEY is set in Supabase
- Verify your OpenAI account has available credits
- Try a simpler prompt

**Variables not being replaced:**
- Use exact variable names: `{{PROPERTY}}`, `{{PRICE}}`, etc.
- Check variable spelling and casing (must be UPPERCASE)
- Ensure curly braces are doubled: `{{` and `}}`
- Verify the variable is in the valid variables list

