# Team Collaboration & Property Urgency Implementation

## Overview
This implementation adds multi-user team collaboration features and an urgency field for better property tracking.

## Features Implemented

### 1. Team Collaboration System

#### Database Schema (Migration: 20251012120000_add_companies_and_teams.sql)
- **companies** table: Stores company information
- **team_members** table: Junction table for users and companies with roles (owner, admin, member)
- **team_invitations** table: Handles email invitations to join a company
- Added `company_id` to properties, buy_boxes, contacts, activities, and email_templates

#### Row Level Security (RLS)
- Updated all RLS policies to allow team members to access shared company data
- Properties: Users can view their own OR their company's properties
- Buy Boxes: Shared across company members
- Triggers: Auto-assign company_id to new properties and buy boxes

#### Team Settings Page (`/team`)
- Create a company workspace
- Invite team members by email
- View and manage team members
- Change member roles (admin/member)
- Remove team members
- View pending invitations

#### Navigation
- Added "Team" link in sidebar with UserCog icon
- Accessible from main navigation menu

#### Shared Access
- **Properties Page**: Shows all properties from user AND company
- **Buy Boxes**: Shows all buy boxes from user AND company
- Team members can split listing tracking between them

### 2. Property Urgency Field

#### Database (Migration: 20251012121000_add_property_urgency.sql)
- Added `urgency` INTEGER field (1, 2, or 3)
- Default value: 2 (Medium)
- Levels:
  - 🔴 3 = Urgent
  - 🟡 2 = Medium (default)
  - 🟢 1 = Not Urgent

#### UI Updates
- **PropertyForm**: Added urgency dropdown with emoji indicators
- **Properties Page**: 
  - Added urgency filter in filters section
  - Filter by urgency level
  - Clear filters includes urgency reset

## Usage

### Setting Up a Team

1. **First User**:
   - Navigate to `/team` in the sidebar
   - Click "Create Company"
   - Enter your company name
   - You'll be assigned as the owner

2. **Inviting Team Members**:
   - In Team Settings, enter a colleague's email
   - Click "Send Invite"
   - They'll receive an invitation (when email function is implemented)

3. **Managing Team**:
   - View all team members
   - Change roles (admin/member)
   - Remove members (except owner)
   - View pending invitations

### Using Urgency Levels

1. **Creating/Editing Properties**:
   - In the General tab, select urgency level
   - Choose from Urgent, Medium, or Not Urgent

2. **Filtering Properties**:
   - Click "Show Filters" on Properties page
   - Select urgency level from dropdown
   - Properties will be filtered accordingly

## Database Functions

### `create_company_with_owner(company_name TEXT, owner_uuid UUID)`
- Creates a company and automatically adds the owner as a team member
- Returns the new company_id

### `get_user_company_id(user_uuid UUID)`
- Returns the company_id for a given user
- Returns NULL if user is not in a company

### `auto_assign_company_id()`
- Trigger function that auto-assigns company_id to new properties and buy_boxes
- Runs before INSERT on properties and buy_boxes tables

## Views

### `team_members_with_emails`
- Convenient view showing team members with their email addresses
- Joins team_members, companies, and profiles tables

## Security

- All tables use Row Level Security (RLS)
- Users can only view/edit data they own or that belongs to their company
- Company owners have full control over their company
- Admins can manage team members (except the owner)
- Members can view and contribute but can't manage the team

## Next Steps (Optional Future Enhancements)

1. **Email Invitations**: Create edge function to actually send invitation emails with links
2. **Invitation Acceptance**: Create page/flow for accepting invitations via email link
3. **Dashboard Updates**: Show team activity and statistics
4. **Activity Tracking**: Show which team member created each property
5. **Comments/Notes**: Add team collaboration features on properties
6. **Notifications**: Notify team members of changes

## Testing Checklist

- [ ] Create a company as a user
- [ ] Verify you can see the Team page
- [ ] Invite a team member (email invitation pending email function)
- [ ] Create a property and verify company_id is auto-assigned
- [ ] Verify team members can see shared properties
- [ ] Test urgency filter on Properties page
- [ ] Test property urgency in form (create/edit)
- [ ] Change team member roles
- [ ] Remove a team member
- [ ] Verify RLS policies prevent unauthorized access

## Files Modified

### Database
- `supabase/migrations/20251012120000_add_companies_and_teams.sql`
- `supabase/migrations/20251012121000_add_property_urgency.sql`

### Frontend Pages
- `src/pages/TeamSettings.tsx` (NEW)
- `src/pages/Properties.tsx` (updated to fetch company properties)
- `src/pages/PropertyForm.tsx` (added urgency field)

### Components
- `src/components/Layout.tsx` (added Team nav link)

### Routing
- `src/App.tsx` (added /team route)

## Notes

- The team invitation system creates invitation records but requires an edge function to send actual emails
- Users working solo can continue using the app normally without creating a company
- Creating a company is opt-in and doesn't affect existing users
- All existing properties remain private until a user joins or creates a company

