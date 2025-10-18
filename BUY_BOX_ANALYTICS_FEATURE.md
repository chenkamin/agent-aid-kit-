# Buy Box Analytics Feature

## Overview
Added a comprehensive analytics modal that displays detailed statistics and visualizations for each Buy Box, showing property distribution across workflow stages.

## Features Implemented

### 1. **Buy Box Analytics Modal** (`src/components/BuyBoxAnalyticsModal.tsx`)
A new modal component that displays:

#### Summary Cards
- **Total Properties**: Count of all properties in the buy box
- **Total Value**: Combined market value of all properties (in millions)
- **Total ARV**: Combined After Repair Value estimates (in millions)

#### Visualizations
1. **Bar Chart**: Properties by workflow stage with color-coded bars
2. **Pie Chart**: Percentage distribution across workflow stages
3. **Status Breakdown**: Visual progress bars showing market status distribution
4. **Detailed Table**: Sorted list of workflow stages with counts and percentages

#### Workflow Stage Colors
- Initial: Gray (#94a3b8)
- Reviewing: Blue (#3b82f6)
- Research: Purple (#8b5cf6)
- On Progress: Orange (#f59e0b)
- Follow Up: Green (#10b981)
- Negotiating: Cyan (#06b6d4)
- Under Contract: Orange (#f97316)
- Closing: Pink (#ec4899)
- Closed: Green (#22c55e)
- Not Relevant: Red (#ef4444)
- Archived: Gray (#6b7280)

### 2. **Integration in Properties Page**
- Added an **Info icon button** (ℹ️) next to the Buy Box filter
- Icon only appears when a specific buy box is selected (not "All Buy Boxes")
- Clicking the icon opens the analytics modal for that buy box
- Modal automatically queries properties for the selected buy box
- Responsive design with scrollable content for smaller screens

### 3. **Integration in Lists Page (Table View)**
- Added an **Analytics button** with a bar chart icon in the Actions column of the buy boxes table
- Button appears before the "Edit", "Scrape", and "Delete" buttons
- Clicking the button opens the same analytics modal for that specific buy box
- Provides quick access to buy box performance metrics directly from the lists page

### 4. **Technical Implementation**
- Uses **Recharts** library for data visualization
- Real-time data fetching with React Query
- Automatic grouping of properties by workflow_state
- Calculation of aggregated metrics (totals, percentages)
- Color-coded charts matching the workflow state badge colors

## User Flow

### From Properties Page:
1. User navigates to Properties page
2. User selects a specific Buy Box from the filter dropdown
3. An info icon (ℹ️) appears next to the Buy Box label
4. User clicks the info icon
5. Modal opens showing comprehensive analytics for that buy box
6. User can close the modal and continue working

### From Lists Page:
1. User navigates to the Lists page (Buy Box management)
2. User sees all their buy boxes displayed in a table
3. Each row has an "Analytics" button (bar chart icon) in the Actions column
4. User clicks the Analytics button on any buy box
5. Modal opens showing comprehensive analytics for that buy box:
   - Summary statistics at the top
   - Bar chart showing distribution by workflow stage
   - Pie chart with percentages
   - Status breakdown with progress bars
   - Detailed table with sorted counts
6. User can close the modal and continue working

## Files Modified
- `src/pages/Properties.tsx`: Added Info icon button, modal state management, and modal integration
- `src/pages/Lists.tsx`: Added Analytics button in the Actions column of the table, modal state management, and modal integration
- `src/components/BuyBoxAnalyticsModal.tsx`: New component (created)
- `BUY_BOX_ANALYTICS_FEATURE.md`: This documentation file (created/updated)

## Dependencies Used
- `recharts`: For bar charts and pie charts
- `@tanstack/react-query`: For data fetching
- `lucide-react`: For the Info icon (Properties page) and BarChart icon (Lists page)
- Existing UI components from `@/components/ui/*`

## Future Enhancements
Consider adding:
- Timeline charts showing property progression through stages
- Filters within the modal (date ranges, property types)
- Export functionality for analytics data
- Comparison between multiple buy boxes
- Average days in each stage
- Conversion rates between stages

