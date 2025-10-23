# Contacts - Properties View Feature

## Overview
Implemented functionality to view all properties related to a contact directly from the Contacts page. When clicking on a contact, a modal displays all their associated properties, and each property can be clicked to open its detailed view.

## Implementation Details

### 1. **Contacts Page Updates** (`src/pages/Contacts.tsx`)

#### New State Variables
- `viewingContactProperties`: Tracks which contact's properties are being viewed
- Added `useNavigate` hook for navigation

#### New Query - Contact Properties
```typescript
const { data: contactProperties, isLoading: isLoadingContactProperties } = useQuery({
  queryKey: ["contact-properties", viewingContactProperties?.id, userCompany?.company_id],
  queryFn: async () => {
    // Fetches properties matching contact by:
    // - seller_agent_name
    // - seller_agent_email  
    // - seller_agent_phone
  }
})
```

#### New Functions
- **`handleViewContact(contact)`**: Opens the properties modal for a contact
- **`handlePropertyClick(propertyId)`**: Navigates to Properties page with property ID parameter

#### New UI Components

**Contact Properties Modal**:
- Shows contact name and contact info in header
- Displays all related properties in card format
- Each property card shows:
  - Address and location
  - Price, beds, baths
  - Home type badge
  - Workflow stage badge (e.g., "New Lead", "Contacted", "Offer Made")
  - "View on Zillow" link
  - "View Details" button
- Clicking anywhere on a property card opens the full property modal
- Empty state when no properties found

**Updated Table Behavior**:
- Clicking any contact row now opens the properties modal
- Manual contacts have "Edit" button (opens edit modal)
- Property-sourced contacts have "View Properties" button

### 2. **Integration with Properties Page**

The Properties page already had URL parameter handling:
- URL parameter: `/properties?property={propertyId}`
- Automatically opens property detail modal when parameter is present
- Closes modal when parameter is removed

### 3. **User Flow**

1. User clicks on a contact in the Contacts table
2. Modal opens showing all properties for that contact
3. Properties are fetched by matching:
   - Agent name
   - Agent email
   - Agent phone
4. User clicks on a property card
5. Navigates to `/properties?property={id}`
6. Properties page automatically opens the property detail modal
7. User can view full property details, edit, add activities, etc.

## Features

### Property Cards in Contact Modal
- **Full Address**: Street, city, state, zip
- **Key Details**: Price, beds, baths displayed with icons
- **Home Type**: Badge showing property type
- **Workflow Stage**: Badge showing current workflow state (e.g., "New Lead", "Contacted", "Offer Made")
- **Zillow Link**: External link to original listing
- **View Details**: Button to open full property modal

### Smart Matching
- Matches properties by any of:
  - Exact agent name match
  - Email match
  - Phone number match
- Handles contacts from both sources:
  - Manually added contacts
  - Contacts auto-discovered from properties

### Responsive Design
- Modal scrollable for many properties
- Cards are clickable with hover effects
- Property count shown at top
- Empty state with helpful message

## Technical Details

### Query Optimization
- Only fetches when modal is open
- Uses contact identifiers (name/email/phone) for matching
- Filtered by company_id for security

### Navigation Flow
- Uses React Router's `useNavigate`
- Query parameters for deep linking
- Modal state managed by URL parameters
- Browser back button works correctly

### Error Handling
- Loading states shown
- Empty states for no properties
- Console logging for debugging
- Graceful handling of missing data

## Benefits

1. **Quick Access**: View all properties for a contact without searching
2. **Context**: See property count and details at a glance
3. **Seamless Navigation**: Click through to full property details
4. **Zillow Integration**: Direct links to original listings
5. **No Duplication**: Reuses existing property modal infrastructure

## Future Enhancements (Optional)

- Filter properties by status (active, sold, etc.)
- Sort properties by date, price, etc.
- Show activity count per property
- Add bulk actions for contact properties
- Export contact property list

