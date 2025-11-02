# Default Templates Implementation

## Overview
Implemented system-wide default templates for SMS and Email that all users can view and use, but not edit or delete.

## Database Changes

### Migration: `add_default_templates_v2`

1. **Added `is_default` column** to both `email_templates` and `sms_templates` tables
   - Type: `BOOLEAN`
   - Default: `FALSE`
   - Indexed for performance

2. **Made `user_id` nullable** to allow system-wide templates (NULL user_id for defaults)

3. **Created 6 Default Email Templates:**
   - Professional Inquiry - With Price
   - Professional Inquiry - No Price
   - Direct Offer - Aggressive
   - Friendly Follow-Up
   - Investment Opportunity
   - Urgent Viewing Request

4. **Created 6 Default SMS Templates:**
   - Professional Inquiry - With Price
   - Professional Inquiry - No Price
   - Quick Cash Offer
   - Friendly Check-In
   - Direct & Urgent
   - Investor Inquiry

5. **Updated RLS Policies:**
   - **SELECT**: Users can view their own templates OR default templates
   - **UPDATE**: Users can only update their own non-default templates
   - **DELETE**: Users can only delete their own non-default templates

## Frontend Changes

### Communication Page (`src/pages/Communication.tsx`)

#### 1. **Updated Interfaces**
```typescript
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  is_default?: boolean | null;  // NEW
  user_id?: string | null;      // NEW
}

interface SMSTemplate {
  id: string;
  name: string;
  body: string;
  created_at: string;
  is_default?: boolean | null;  // NEW
  user_id?: string | null;      // NEW
}
```

#### 2. **Updated Queries**
- Email templates query now fetches both user templates AND default templates
- SMS templates query now fetches both user templates AND default templates
- Templates are ordered by `is_default` (default templates first), then by `created_at`

#### 3. **UI Enhancements**

**Email Templates Table:**
- Default templates have a light blue background highlight
- "Default" badge with shield icon next to template name
- "View Only" badge instead of edit/delete buttons
- Users cannot edit or delete default templates

**SMS Templates Table:**
- Same styling as email templates
- Light blue background for default templates
- "Default" badge with shield icon
- "View Only" badge for actions column

## Template Variables

All templates use the following variables:
- `{{PROPERTY}}` - Property address
- `{{PRICE}}` - Property price
- `{{AGENT_NAME}}` - Agent/recipient name
- `{{BEDROOMS}}` - Number of bedrooms
- `{{BATHROOMS}}` - Number of bathrooms
- `{{SQFT}}` - Square footage

## Template Styles

### Email Templates

1. **Professional Inquiry - With Price** ✅
   - Formal, includes all property details
   - Shows price, bedrooms, bathrooms, sqft
   - Requests additional information

2. **Professional Inquiry - No Price** ✅
   - More exploratory, doesn't mention price
   - Asks for pricing and details
   - Emphasizes pre-qualification

3. **Direct Offer - Aggressive** 💪
   - Cash buyer approach
   - Quick closing emphasis (7-14 days)
   - Urgent tone
   - Time-sensitive language

4. **Friendly Follow-Up** 😊
   - Warm, casual tone
   - Gentle reminder
   - Low pressure approach
   - "No pressure at all" language

5. **Investment Opportunity** 💼
   - Investor-focused language
   - Mentions cap rate, rental potential
   - Professional investor tone
   - Emphasizes cash availability

6. **Urgent Viewing Request** ⚡
   - High urgency
   - Immediate availability emphasis
   - Excited tone
   - Pre-approved emphasis
   - "TODAY or tomorrow" language

### SMS Templates

1. **Professional Inquiry - With Price** ✅
   - Concise, includes price
   - Mentions pre-qualification
   - Direct request for showing
   - ~110 characters

2. **Professional Inquiry - No Price** ✅
   - Asks for details and pricing
   - Professional but brief
   - ~140 characters

3. **Quick Cash Offer** 💵
   - Cash buyer message
   - 7-14 day closing
   - No contingencies
   - Urgent "Let's talk today" tone
   - ~125 characters

4. **Friendly Check-In** 😊
   - Uses emoji 😊
   - Casual, warm tone
   - Non-pushy follow-up
   - "Would love to chat when you have a moment"
   - ~160 characters

5. **Direct & Urgent** ⚡
   - Very short and direct
   - Maximum urgency
   - Immediate availability
   - "Available today/tomorrow"
   - ~130 characters

6. **Investor Inquiry** 💼
   - Identifies as investor
   - Asks for condition details
   - Mentions rental comps
   - Professional but concise
   - ~140 characters

## User Experience

### Communication Page
1. Users see all templates (their own + default ones)
2. Default templates are clearly marked with:
   - Shield icon + "Default" badge
   - Light blue background highlight
   - "View Only" label in actions column
3. Default templates appear first in the list
4. Users can use default templates as inspiration
5. Users can copy content from default templates

### Template Selection (Send SMS/Email Modals)
- All templates (user + default) appear in dropdowns
- Default templates are available for selection
- Clear visual distinction between user and default templates

## Security

✅ **RLS Policies Enforce:**
- Users can only edit their own templates
- Users cannot edit or delete default templates
- All authenticated users can read default templates
- Proper company_id isolation for user templates

## Benefits

1. **Immediate Value**: New users have professional templates ready to use
2. **Best Practices**: Templates showcase effective real estate communication
3. **Variety**: Multiple tones (professional, friendly, aggressive, investor-focused)
4. **Learning**: Users can see how to structure messages effectively
5. **Consistency**: Company-wide access to proven templates
6. **Flexibility**: Users can still create their own custom templates

## Template Selection in Property Modals

### Properties Page (`src/pages/Properties.tsx`)

#### 1. **Updated Template Queries**
- Email templates query now includes default templates using `.or()` filter
- SMS templates query added (previously didn't exist) to fetch user + default templates
- Both queries order by `is_default` first, then `created_at`

#### 2. **SMS Modal Enhancements**
- Added `templateId` to `smsForm` state
- New template selector dropdown at the top of the SMS modal
- Auto-fills message when template is selected
- Shield emoji (🛡️) indicates default templates
- Helper text: "Select a template to auto-fill the message below"

#### 3. **Email Modal Enhancements**
- Updated to show shield emoji (🛡️) for default templates
- Helper text: "🛡️ indicates default templates available to all users"
- Consistent with SMS modal styling

#### 4. **Bulk Email Modal**
- Also updated to show shield emoji for default templates
- Same helper text and consistent UX

## Testing Checklist

- [x] Default templates visible in Communication page
- [x] Default templates have visual badges and highlights
- [x] Edit button disabled for default templates
- [x] Delete button disabled for default templates
- [x] User templates still editable/deletable
- [x] Template variables display correctly
- [x] Default templates appear in send SMS modal dropdown
- [x] Default templates appear in send email modal dropdown
- [x] Default templates appear in bulk email modal dropdown
- [x] SMS template auto-fills message on selection
- [x] Shield emoji (🛡️) indicates default templates in all modals
- [x] RLS policies prevent unauthorized editing
- [x] TypeScript types updated correctly

