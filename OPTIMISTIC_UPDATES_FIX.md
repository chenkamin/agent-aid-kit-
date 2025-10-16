# Optimistic Updates Fix

## Problem
When updating a property's workflow status, there was a significant delay before the UI reflected the change. The user would filter properties by workflow state (e.g., "Initial"), update a property to "Not Relevant", and have to wait several seconds before seeing the property disappear from the filtered view.

## Root Cause
The code was using **invalidate-then-refetch** pattern:
1. Update the database
2. Invalidate the React Query cache
3. **Wait for a full refetch from the server** ← This caused the delay
4. Re-render the UI with new data

This approach meant the UI had to wait for:
- Network latency (database update)
- Query invalidation
- Network latency (data refetch)
- Re-rendering

## Solution: Optimistic Updates
Implemented **optimistic updates** pattern:
1. **Immediately update the UI** using `queryClient.setQueryData()`
2. Update the database in the background
3. If the database update fails, rollback the UI change
4. Invalidate queries to sync with server (but UI already updated)

## Changes Made

### 1. Properties.tsx - Workflow State Update (Lines 2077-2150)
**Before:**
```typescript
onValueChange={async (value) => {
  // Update database first
  const { error } = await supabase
    .from('properties')
    .update({ workflow_state: value })
    .eq('id', selectedProperty.id);
  
  // Then update local state
  setSelectedProperty((prev) => ({ ...prev, workflow_state: value }));
  
  // Then invalidate and wait for refetch
  queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });
}}
```

**After:**
```typescript
onValueChange={async (value) => {
  // OPTIMISTIC UPDATE - Update UI immediately
  setSelectedProperty((prev) => ({ ...prev, workflow_state: value }));
  
  queryClient.setQueryData(
    ["properties", userCompany?.company_id, filters.status],
    (oldData: any) => {
      return oldData?.map((prop: any) =>
        prop.id === propertyId
          ? { ...prop, workflow_state: value }
          : prop
      );
    }
  );

  // Show immediate feedback
  toast({ title: "✅ Workflow updated" });

  // Now update database in background
  const { error } = await supabase...
  
  if (error) {
    // ROLLBACK on error
    setSelectedProperty((prev) => ({ ...prev, workflow_state: oldState }));
    queryClient.setQueryData(...); // Revert the optimistic update
  }
}}
```

### 2. Properties.tsx - Bulk Workflow Update (Lines 1015-1062)
- Added optimistic update before database operations
- Updated query key from `["properties", user?.id]` to `["properties", userCompany?.company_id]`
- Added rollback on error

### 3. Activities.tsx - Status Update (Lines 222-269)
- Implemented optimistic updates for activity status changes
- Fixed query key from `["activities", user?.id]` to `["activities", userCompany?.company_id]`
- Added rollback on error

### 4. Activities.tsx - Save Activity (Line 202)
- Fixed query key from `["activities", user?.id]` to `["activities", userCompany?.company_id]`

## Benefits
1. **Instant UI feedback** - Changes appear immediately
2. **Better UX** - Users don't have to wait for server responses
3. **Resilient** - Automatic rollback on errors
4. **Correct caching** - Fixed query keys to match actual queries

## Testing
To test the fix:
1. Go to Properties page
2. Filter by workflow state (e.g., "Initial")
3. Open a property detail
4. Change workflow state to "Not Relevant"
5. **Result:** Property should immediately disappear from the filtered list (no delay)

## Technical Notes
- Optimistic updates work by updating React Query's cache directly before the server responds
- The cache key must match exactly: `["properties", userCompany?.company_id, filters.status]`
- If the server request fails, we rollback by reverting the cache update
- We still invalidate queries after success to ensure data stays in sync with the server

