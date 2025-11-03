# ARV-Based Pricing Feature Documentation

## Overview
This feature allows automatic calculation of offer prices based on Buy Box ARV (After Repair Value) and company discount percentage.

## Formula
```
Offer Price = ARV × (1 - Discount% / 100)
```

**Example:**
- ARV: $150,000
- Company Discount: 30%
- **Calculated Offer Price: $150,000 × (1 - 30/100) = $105,000**

---

## Database Schema

### 1. `companies` table
Added column:
- `discount_percentage` (numeric, nullable) - Company's default discount percentage for offers

### 2. `buy_boxes` table
Added column:
- `arv` (numeric, nullable) - After Repair Value for properties in this buy box

---

## Implementation Details

### 1. Company Settings (src/pages/UserSettings.tsx)

**Location:** User Settings → Company Tab

**Fields:**
- **Discount Percentage Input** - Number input (0-100%)
- Validates percentage is between 0 and 100
- Saves to `companies.discount_percentage`

**Code Reference:**
```typescript
// State management
const [discountPercentage, setDiscountPercentage] = useState("");

// Mutation to update discount
const updateDiscountMutation = useMutation({
  mutationFn: async (discount: number) => {
    await supabase
      .from("companies")
      .update({ discount_percentage: discount })
      .eq("id", userCompany.id);
  }
});
```

---

### 2. Buy Box Management (src/pages/Lists.tsx)

**Location:** Lists/Buy Boxes Page → Create/Edit Buy Box Dialog

**Fields:**
- **ARV Input** - Number input (optional)
- Saves to `buy_boxes.arv`

**Code Reference:**
```typescript
// Form state
const [listForm, setListForm] = useState({
  // ... other fields
  arv: "",
});

// Mutation includes ARV
const listData = {
  // ... other fields
  arv: data.arv ? parseFloat(data.arv) : null,
};
```

---

### 3. Price Calculation Logic (src/pages/Properties.tsx)

**Core Function:** `calculateOfferPrice(property, customOfferPrice?)`

**Priority Order:**
1. **Custom Offer Price** (if provided by user)
2. **ARV Calculation** (if buy box has ARV and company has discount%)
3. **Fallback** to property listing price

**Code:**
```typescript
const calculateOfferPrice = (property: any, customOfferPrice?: string): string => {
  console.log('=== calculateOfferPrice START ===');
  
  // Priority 1: Custom offer price
  if (customOfferPrice && customOfferPrice.trim() !== '') {
    console.log('✓ Using custom offer price:', customOfferPrice);
    return customOfferPrice;
  }

  // Priority 2: ARV calculation
  if (property.buy_box_id && userCompany?.discount_percentage) {
    const buyBox = buyBoxes?.find((bb: any) => bb.id === property.buy_box_id);
    
    if (buyBox?.arv) {
      const arvValue = Number(buyBox.arv);
      const discountPercent = Number(userCompany.discount_percentage);
      const calculatedPrice = arvValue * (1 - discountPercent / 100);
      const finalPrice = Math.round(calculatedPrice).toString();
      
      console.log('✓ ARV Calculation:');
      console.log(`  ARV: $${arvValue.toLocaleString()}`);
      console.log(`  Discount: ${discountPercent}%`);
      console.log(`  Result: $${Number(finalPrice).toLocaleString()}`);
      
      return finalPrice;
    }
  }

  // Priority 3: Fallback
  return property.price?.toString() || '';
};
```

---

### 4. Integration Points

#### A. Single Property Email
**Location:** Property Modal → Send Email Dialog

**Variable Replacement:**
```typescript
const finalOfferPrice = calculateOfferPrice(data.property, data.offerPrice);

const replaceVariables = (text: string) => {
  return text
    .replace(/\{\{PRICE\}\}/g, finalOfferPrice ? `$${Number(finalOfferPrice).toLocaleString()}` : '')
    // ... other variables
};
```

#### B. Single Property SMS
**Location:** Property Modal → Send SMS Dialog

**Variable Replacement:**
```typescript
const smsOfferPrice = calculateOfferPrice(selectedProperty);
const formattedPrice = smsOfferPrice ? `$${Number(smsOfferPrice).toLocaleString()}` : 'N/A';

const finalMessage = smsForm.message
  .replace(/\{\{PRICE\}\}/gi, formattedPrice)
  // ... other variables
```

#### C. Bulk Email
**Location:** Properties Page → Select Multiple → Send Emails

**Implementation:**
```typescript
const handleBulkSendEmail = async () => {
  for (const property of propertiesWithEmail) {
    await sendEmailMutation.mutateAsync({
      toEmail: property.seller_agent_email!,
      agentName: property.seller_agent_name || 'Agent',
      templateId: bulkEmailForm.templateId,
      offerPrice: bulkEmailForm.offerPrice, // Optional custom price
      property: property
    });
  }
};
```

**Note:** Each property is processed individually, so ARV is calculated per property based on its own buy box.

#### D. Bulk SMS
**Location:** Properties Page → Select Multiple → Send SMS

**Implementation:**
```typescript
const handleBulkSendSMS = async () => {
  for (const property of propertiesWithPhone) {
    // Calculate price for THIS specific property
    const bulkSmsOfferPrice = calculateOfferPrice(property);
    const bulkFormattedPrice = bulkSmsOfferPrice ? 
      `$${Number(bulkSmsOfferPrice).toLocaleString()}` : 'N/A';
    
    const finalMessage = bulkSMSMessage
      .replace(/\{\{PRICE\}\}/gi, bulkFormattedPrice)
      // ... other variables
  }
};
```

---

## Buy Boxes Query

**Critical:** Buy boxes must be fetched with ALL fields (not just `id, name`)

```typescript
const { data: buyBoxes } = useQuery({
  queryKey: ["buy_boxes", userCompany?.company_id],
  queryFn: async () => {
    const { data } = await supabase
      .from("buy_boxes")
      .select("*")  // ← Important! Fetch ALL fields including ARV
      .eq("company_id", userCompany.company_id)
      .order("created_at", { ascending: false});
    
    return data || [];
  },
  enabled: !!userCompany?.company_id,
});
```

---

## Debugging

### Console Logs
The `calculateOfferPrice` function includes comprehensive logging:

1. **Input parameters:**
   - Property address, buy_box_id, price
   - Custom offer price
   - Company discount percentage
   - Available buy boxes count

2. **Decision flow:**
   - ✓ = Path taken
   - ✗ = Path not taken
   - Shows which priority is used

3. **Calculation details:**
   - ARV value
   - Discount percentage
   - Formula used
   - Final result

**Example Log Output:**
```
=== calculateOfferPrice START ===
Property: { address: "123 Main St", buy_box_id: "abc-123", price: 120000 }
Custom Offer Price: ""
Company Discount %: 30
Available Buy Boxes: 3
✓ Property has buy_box_id, searching for buy box...
Found Buy Box: { id: "abc-123", name: "Test BuyBox", arv: 150000, ... }
✓ ARV Calculation:
  ARV: $150,000
  Discount: 30%
  Formula: 150000 × (1 - 30/100)
  Result: $105,000
=== calculateOfferPrice END (using ARV) ===
```

### Common Issues

#### Issue: Price not calculated from ARV
**Check:**
1. Property has `buy_box_id` set
2. Buy box has `arv` value set (not null)
3. Company has `discount_percentage` set (not null)
4. **Buy boxes query fetches full objects** (not just `id, name`)
5. **User company query includes `discount_percentage` field** ⚠️ CRITICAL

**CRITICAL FIX:** In Properties.tsx, ensure the user company query includes `discount_percentage`:
```typescript
// ❌ WRONG - Missing discount_percentage
.select("company_id, companies(id, name)")

// ✅ CORRECT - Include discount_percentage
.select("company_id, companies(id, name, discount_percentage)")
```

**⚠️ NESTED DATA STRUCTURE:**
When using nested select, the returned structure is:
```typescript
{
  company_id: "...",
  companies: {           // ← Nested object
    id: "...",
    name: "...",
    discount_percentage: 30
  }
}
```

Therefore, you must access it as: `userCompany.companies.discount_percentage` NOT `userCompany.discount_percentage`

**Debug Steps:**
1. Open browser console
2. Send email/SMS
3. Look for `=== calculateOfferPrice START ===` logs
4. Check which requirements are missing (✗ marks)

---

## UI Display

### Property Modal - Buy Box Accordion
**Location:** Property Modal → General Tab → Buy Box Accordion

**Display:**
- Only shows if property has a `buy_box_id`
- Shows buy box name in accordion title
- Displays ARV prominently (if set)
- Shows all buy box criteria (price range, bedrooms, etc.)

**Code:**
```typescript
{selectedProperty?.buy_box_id && (() => {
  const buyBox = buyBoxes?.find((bb: any) => bb.id === selectedProperty.buy_box_id);
  return buyBox ? (
    <AccordionItem value="buybox">
      <AccordionTrigger>
        <Target className="h-5 w-5" />
        Buy Box: {buyBox.name}
      </AccordionTrigger>
      <AccordionContent>
        {buyBox.arv && (
          <div>
            <Label>ARV (After Repair Value)</Label>
            <p className="font-semibold text-green-600">
              ${Number(buyBox.arv).toLocaleString()}
            </p>
          </div>
        )}
        {/* ... other buy box details ... */}
      </AccordionContent>
    </AccordionItem>
  ) : null;
})()}
```

---

## Testing Checklist

- [ ] Set company discount percentage in User Settings → Company tab
- [ ] Create/edit buy box with ARV value in Lists page
- [ ] Assign properties to that buy box
- [ ] Send single email - verify ARV calculation in email
- [ ] Send single SMS - verify ARV calculation in SMS
- [ ] Send bulk email - verify each property uses its own buy box ARV
- [ ] Send bulk SMS - verify each property uses its own buy box ARV
- [ ] Verify fallback to listing price if no ARV
- [ ] Verify custom offer price overrides ARV calculation
- [ ] Check browser console logs for calculation details

---

## Migrations Applied

1. **20251103_add_arv_to_buy_boxes.sql**
   - Added `arv` column to `buy_boxes` table

2. **20251103_add_discount_percentage_to_companies.sql**
   - Added `discount_percentage` column to `companies` table

---

## Files Modified

1. **src/pages/UserSettings.tsx**
   - Added discount percentage UI in Company tab
   - Added state management and mutation

2. **src/pages/Lists.tsx**
   - Added ARV input field to buy box form
   - Updated create/update mutations to include ARV
   - Updated edit handler to populate ARV

3. **src/pages/Properties.tsx**
   - Added `calculateOfferPrice()` helper function
   - Updated buy boxes query to fetch all fields
   - Integrated calculation in email sending
   - Integrated calculation in SMS sending
   - Integrated calculation in bulk email sending
   - Integrated calculation in bulk SMS sending
   - Added "Buy Box" accordion in property modal
   - Added comprehensive console logging

4. **src/integrations/supabase/types.ts**
   - Regenerated to include new database fields

---

## Support

For issues or questions about ARV pricing:
1. Check browser console logs for detailed calculation info
2. Verify all settings are configured (company discount %, buy box ARV)
3. Ensure properties are assigned to correct buy box
4. Check that buy boxes query fetches full data

---

Last Updated: November 3, 2025

