import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Home, Calendar, DollarSign, Building, Clock, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    // General
    address: "",
    city: "",
    state: "",
    zip: "",
    neighborhood: "",
    status: "For Sale",
    urgency: "2",
    assigned_to: user?.id || "",
    source: "",
    sub_source: "",
    source_contact_details: "",
    notes: "",
    owner: "",
    owner_properties: "",
    buy_box_id: "",
    
    // Listing
    date_listed: "",
    days_on_market: "",
    seller_agent_name: "",
    seller_agent_email: "",
    seller_agent_phone: "",
    listing_url: "",
    home_type: "",
    
    // Financial
    price: "",
    price_per_sqft: "",
    arv_estimate: "",
    rentometer_monthly_rent: "",
    last_sold_price: "",
    last_sold_date: "",
    previous_sold_price: "",
    previous_sold_date: "",
    
    // Property Details
    bedrooms: "",
    bathrooms: "",
    full_bath: "",
    building_sqf: "",
    living_sqf: "",
    above_ground_sqf: "",
    basement_sqf: "",
    lot_sqf: "",
    basement: "",
    finished_basement: "",
    year_built: "",
    home_sub_type: "",
    property_type: "",
    
    // History - (calculated fields in DB)
    
    // Comps
    linked_comp_1: "",
    linked_comp_2: "",
    linked_comp_3: "",
    linked_comp_4: "",
    linked_comp_5: "",
    
    // Other
    mls_number: "",
    description: "",
    agent_notes: "",
  });

  const { data: property } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: isEditing,
  });

  // Fetch user's company
  const { data: userCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("team_members")
        .select("company_id, companies(id, name)")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch team members for assignment
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-simple", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data } = await supabase
        .from("team_members")
        .select("user_id, profiles(email)")
        .eq("company_id", userCompany.company_id);
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch buy boxes for the dropdown
  const { data: buyBoxes } = useQuery({
    queryKey: ["buy_boxes", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data } = await supabase
        .from("buy_boxes")
        .select("id, name")
        .eq("company_id", userCompany.company_id)
        .order("name");
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  useEffect(() => {
    if (property) {
      setFormData({
        address: property.address || "",
        city: property.city || "",
        state: property.state || "",
        zip: property.zip || "",
        neighborhood: property.neighborhood || "",
        status: property.status || "For Sale",
        urgency: property.urgency?.toString() || "2",
        assigned_to: property.assigned_to || user?.id || "",
        source: property.source || "",
        sub_source: property.sub_source || "",
        source_contact_details: property.source_contact_details || "",
        notes: property.notes || "",
        owner: property.owner || "",
        owner_properties: property.owner_properties || "",
        buy_box_id: property.buy_box_id || "",
        
        date_listed: property.date_listed || "",
        days_on_market: property.days_on_market?.toString() || "",
        seller_agent_name: property.seller_agent_name || "",
        seller_agent_email: property.seller_agent_email || "",
        seller_agent_phone: property.seller_agent_phone || "",
        listing_url: property.listing_url || "",
        home_type: property.home_type || "",
        
        price: property.price?.toString() || "",
        price_per_sqft: property.ppsf?.toString() || "",
        arv_estimate: property.arv_estimate?.toString() || "",
        rentometer_monthly_rent: property.rentometer_monthly_rent?.toString() || "",
        last_sold_price: property.last_sold_price?.toString() || "",
        last_sold_date: property.last_sold_date || "",
        previous_sold_price: property.previous_sold_price?.toString() || "",
        previous_sold_date: property.previous_sold_date || "",
        
        bedrooms: property.bedrooms?.toString() || "",
        bathrooms: property.bathrooms?.toString() || "",
        full_bath: property.full_bath?.toString() || "",
        building_sqf: property.building_sqf?.toString() || "",
        living_sqf: property.living_sqf?.toString() || "",
        above_ground_sqf: property.above_ground_sqf?.toString() || "",
        basement_sqf: property.basement_sqf?.toString() || "",
        lot_sqf: property.lot_sqf?.toString() || "",
        basement: property.basement?.toString() || "",
        finished_basement: property.finished_basement?.toString() || "",
        year_built: property.year_built?.toString() || "",
        home_sub_type: property.home_sub_type || "",
        property_type: property.property_type || "",
        
        linked_comp_1: property.linked_comp_1 || "",
        linked_comp_2: property.linked_comp_2 || "",
        linked_comp_3: property.linked_comp_3 || "",
        linked_comp_4: property.linked_comp_4 || "",
        linked_comp_5: property.linked_comp_5 || "",
        
        mls_number: property.mls_number || "",
        description: property.description || "",
        agent_notes: property.agent_notes || "",
      });
    }
  }, [property]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        const { error } = await supabase
          .from("properties")
          .update(data)
          .eq("id", id);
        if (error) throw error;
      } else {
        if (!user?.id) throw new Error("User not authenticated");
        const { error } = await supabase.from("properties").insert([{
          ...data,
          user_id: user.id
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });
      toast({
        title: isEditing ? "Property updated" : "Property created",
        description: "The property has been saved successfully.",
      });
      navigate("/properties");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save property: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.address) {
      toast({
        title: "Address required",
        description: "Please enter a property address.",
        variant: "destructive",
      });
      return;
    }

    const data: any = {};
    
    const numericFields = [
      "price", "arv_estimate", "rentometer_monthly_rent", "last_sold_price", "previous_sold_price",
      "bedrooms", "bathrooms", "full_bath", "building_sqf", "living_sqf", "above_ground_sqf",
      "basement_sqf", "lot_sqf", "year_built", "days_on_market", "price_per_sqft", "urgency"
    ];
    
    const booleanFields = ["basement", "finished_basement"];
    
    const dateFields = ["date_listed", "last_sold_date", "previous_sold_date"];
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== "") {
        if (numericFields.includes(key)) {
          data[key] = Number(value);
        } else if (booleanFields.includes(key)) {
          data[key] = value === "true";
        } else if (dateFields.includes(key)) {
          data[key] = value;
        } else {
          data[key] = value;
        }
      }
    });
    
    // Map price_per_sqft to ppsf column
    if (data.price_per_sqft) {
      data.ppsf = data.price_per_sqft;
      delete data.price_per_sqft;
    }

    saveMutation.mutate(data);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/properties")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {isEditing ? "Edit Property" : "Create Property"}
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            {isEditing ? "Update property details" : "Add a new property to your portfolio"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="general" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="listing" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Listing</span>
                </TabsTrigger>
                <TabsTrigger value="financial" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Financial</span>
                </TabsTrigger>
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span className="hidden sm:inline">Details</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">History</span>
                </TabsTrigger>
                <TabsTrigger value="comps" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Comps</span>
                </TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-6 mt-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="For Sale">For Sale</SelectItem>
                        <SelectItem value="Under Contract">Under Contract</SelectItem>
                        <SelectItem value="Sold">Sold</SelectItem>
                        <SelectItem value="Off Market">Off Market</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Tracking">Tracking</SelectItem>
                        <SelectItem value="Not Relevant">Not Relevant</SelectItem>
                        <SelectItem value="Follow Up">Follow Up</SelectItem>
                        <SelectItem value="Waiting for Response">Waiting for Response</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="urgency">Urgency</Label>
                    <Select
                      value={formData.urgency}
                      onValueChange={(value) => handleChange("urgency", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">🔴 Urgent</SelectItem>
                        <SelectItem value="2">🟡 Medium</SelectItem>
                        <SelectItem value="1">🟢 Not Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assigned-to">Assigned To</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(value) => handleChange("assigned_to", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers?.map((member: any) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.profiles?.email || member.user_id}
                            {member.user_id === user?.id && " (You)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buy-box">Buy Box (Optional)</Label>
                    <Select
                      value={formData.buy_box_id || "none"}
                      onValueChange={(value) => handleChange("buy_box_id", value === "none" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a buy box..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {buyBoxes?.map((buyBox: any) => (
                          <SelectItem key={buyBox.id} value={buyBox.id}>
                            {buyBox.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

              <div className="space-y-2">
                    <Label htmlFor="owner">Owner</Label>
                <Input
                      id="owner"
                      value={formData.owner}
                      onChange={(e) => handleChange("owner", e.target.value)}
                      placeholder="Property owner"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                      placeholder="City"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Neighborhood</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => handleChange("neighborhood", e.target.value)}
                      placeholder="Neighborhood"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="Street address"
                      required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                      placeholder="State"
                />
              </div>

              <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) => handleChange("zip", e.target.value)}
                      placeholder="ZIP"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Input
                      id="source"
                      value={formData.source}
                      onChange={(e) => handleChange("source", e.target.value)}
                      placeholder="Source"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sub_source">Sub Source</Label>
                    <Input
                      id="sub_source"
                      value={formData.sub_source}
                      onChange={(e) => handleChange("sub_source", e.target.value)}
                      placeholder="Sub source"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="source_contact_details">Source Contact Details</Label>
                    <Input
                      id="source_contact_details"
                      value={formData.source_contact_details}
                      onChange={(e) => handleChange("source_contact_details", e.target.value)}
                      placeholder="Contact information"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner_properties">Owner Properties</Label>
                    <Input
                      id="owner_properties"
                      value={formData.owner_properties}
                      onChange={(e) => handleChange("owner_properties", e.target.value)}
                      placeholder="Number of properties owned"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Our Remarks</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Internal remarks and notes about the property for team use..."
                    rows={4}
                  />
                </div>
              </TabsContent>

              {/* Listing Tab */}
              <TabsContent value="listing" className="space-y-6 mt-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="date_listed">Listing Date</Label>
                    <Input
                      id="date_listed"
                      type="date"
                      value={formData.date_listed}
                      onChange={(e) => handleChange("date_listed", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="days_on_market">Days Listed</Label>
                    <Input
                      id="days_on_market"
                      type="number"
                      value={formData.days_on_market}
                      onChange={(e) => handleChange("days_on_market", e.target.value)}
                      placeholder="Auto-calculated"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seller_agent_name">Seller Agent Name</Label>
                    <Input
                      id="seller_agent_name"
                      value={formData.seller_agent_name}
                      onChange={(e) => handleChange("seller_agent_name", e.target.value)}
                      placeholder="Agent name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seller_agent_email">Seller Agent Email</Label>
                    <Input
                      id="seller_agent_email"
                      type="email"
                      value={formData.seller_agent_email}
                      onChange={(e) => handleChange("seller_agent_email", e.target.value)}
                      placeholder="Agent email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seller_agent_phone">Seller Agent Phone</Label>
                    <Input
                      id="seller_agent_phone"
                      value={formData.seller_agent_phone}
                      onChange={(e) => handleChange("seller_agent_phone", e.target.value)}
                      placeholder="Agent phone"
                />
              </div>

              <div className="space-y-2">
                    <Label htmlFor="listing_url">Property URL</Label>
                <Input
                      id="listing_url"
                      type="url"
                      value={formData.listing_url}
                      onChange={(e) => handleChange("listing_url", e.target.value)}
                      placeholder="https://zillow.com/property-link"
                />
              </div>

                  <div className="space-y-2">
                    <Label htmlFor="home_type">Home Type</Label>
                    <Select
                      value={formData.home_type}
                      onValueChange={(value) => handleChange("home_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single Family">Single Family</SelectItem>
                        <SelectItem value="Multi Family">Multi Family</SelectItem>
                        <SelectItem value="Condo">Condo</SelectItem>
                        <SelectItem value="Townhouse">Townhouse</SelectItem>
                        <SelectItem value="Land">Land</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

              <div className="space-y-2">
                <Label htmlFor="mls_number">MLS Number</Label>
                <Input
                  id="mls_number"
                  value={formData.mls_number}
                  onChange={(e) => handleChange("mls_number", e.target.value)}
                      placeholder="MLS number"
                />
              </div>
                </div>
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-6 mt-6">
                <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                      placeholder="Price"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_per_sqft">Price/Sq Ft</Label>
                    <Input
                      id="price_per_sqft"
                      type="number"
                      step="0.01"
                      value={formData.price_per_sqft}
                      onChange={(e) => handleChange("price_per_sqft", e.target.value)}
                      placeholder="PPSF"
                />
              </div>

              <div className="space-y-2">
                    <Label htmlFor="arv_estimate">ARV <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <Input
                  id="arv_estimate"
                  type="number"
                  value={formData.arv_estimate}
                  onChange={(e) => handleChange("arv_estimate", e.target.value)}
                      placeholder="Enter after repair value"
                    />
                    <p className="text-xs text-muted-foreground">After Repair Value - estimated property value after renovations</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rentometer_monthly_rent">Monthly Rent Estimate</Label>
                    <Input
                      id="rentometer_monthly_rent"
                      type="number"
                      value={formData.rentometer_monthly_rent}
                      onChange={(e) => handleChange("rentometer_monthly_rent", e.target.value)}
                      placeholder="Rent estimate"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_sold_price">Last Sold Price</Label>
                    <Input
                      id="last_sold_price"
                      type="number"
                      value={formData.last_sold_price}
                      onChange={(e) => handleChange("last_sold_price", e.target.value)}
                      placeholder="Last sold price"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_sold_date">Last Sold Date</Label>
                    <Input
                      id="last_sold_date"
                      type="date"
                      value={formData.last_sold_date}
                      onChange={(e) => handleChange("last_sold_date", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="previous_sold_price">Previous to Last Sold Price</Label>
                    <Input
                      id="previous_sold_price"
                      type="number"
                      value={formData.previous_sold_price}
                      onChange={(e) => handleChange("previous_sold_price", e.target.value)}
                      placeholder="Previous sold price"
                />
              </div>

                  <div className="space-y-2">
                    <Label htmlFor="previous_sold_date">Previous to Last Sold Date</Label>
                    <Input
                      id="previous_sold_date"
                      type="date"
                      value={formData.previous_sold_date}
                      onChange={(e) => handleChange("previous_sold_date", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Property Details Tab */}
              <TabsContent value="details" className="space-y-6 mt-6">
                <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => handleChange("bedrooms", e.target.value)}
                      placeholder="Number of bedrooms"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={(e) => handleChange("bathrooms", e.target.value)}
                      placeholder="Total bathrooms"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_bath">Full Bathrooms</Label>
                    <Input
                      id="full_bath"
                      type="number"
                      value={formData.full_bath}
                      onChange={(e) => handleChange("full_bath", e.target.value)}
                      placeholder="Full bathrooms"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="building_sqf">Building Sq Ft</Label>
                    <Input
                      id="building_sqf"
                      type="number"
                      value={formData.building_sqf}
                      onChange={(e) => handleChange("building_sqf", e.target.value)}
                      placeholder="Building sq ft"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="living_sqf">Living Sq Ft</Label>
                    <Input
                      id="living_sqf"
                      type="number"
                      value={formData.living_sqf}
                      onChange={(e) => handleChange("living_sqf", e.target.value)}
                      placeholder="Living sq ft"
                />
              </div>

              <div className="space-y-2">
                    <Label htmlFor="above_ground_sqf">Above Ground Living Sq Ft</Label>
                <Input
                      id="above_ground_sqf"
                  type="number"
                      value={formData.above_ground_sqf}
                      onChange={(e) => handleChange("above_ground_sqf", e.target.value)}
                      placeholder="Above ground living"
                />
              </div>

              <div className="space-y-2">
                    <Label htmlFor="basement_sqf">Basement Sq Ft</Label>
                <Input
                      id="basement_sqf"
                  type="number"
                      value={formData.basement_sqf}
                      onChange={(e) => handleChange("basement_sqf", e.target.value)}
                      placeholder="Basement sq ft"
                />
              </div>

              <div className="space-y-2">
                    <Label htmlFor="lot_sqf">Lot Sq Ft</Label>
                <Input
                      id="lot_sqf"
                      type="number"
                      value={formData.lot_sqf}
                      onChange={(e) => handleChange("lot_sqf", e.target.value)}
                      placeholder="Lot sq ft"
                />
              </div>

              <div className="space-y-2">
                    <Label htmlFor="basement">Basement</Label>
                <Select
                      value={formData.basement}
                      onValueChange={(value) => handleChange("basement", value)}
                >
                  <SelectTrigger>
                        <SelectValue placeholder="Has basement?" />
                  </SelectTrigger>
                  <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                    <Label htmlFor="finished_basement">Finished Basement</Label>
                <Select
                      value={formData.finished_basement}
                      onValueChange={(value) => handleChange("finished_basement", value)}
                >
                  <SelectTrigger>
                        <SelectValue placeholder="Finished?" />
                  </SelectTrigger>
                  <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

                  <div className="space-y-2">
                    <Label htmlFor="year_built">Year Built</Label>
                    <Input
                      id="year_built"
                      type="number"
                      value={formData.year_built}
                      onChange={(e) => handleChange("year_built", e.target.value)}
                      placeholder="Year built"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="home_sub_type">Home Sub Type</Label>
                    <Input
                      id="home_sub_type"
                      value={formData.home_sub_type}
                      onChange={(e) => handleChange("home_sub_type", e.target.value)}
                      placeholder="Sub type"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property_type">Property Owner</Label>
                    <Input
                      id="property_type"
                      value={formData.property_type}
                      onChange={(e) => handleChange("property_type", e.target.value)}
                      placeholder="Actual property owner"
                    />
                  </div>
            </div>

            <div className="space-y-2">
                  <Label htmlFor="description">What's Special</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Special features, unique characteristics, or notable aspects of the property that make it stand out..."
                rows={4}
              />
            </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-6 mt-6">
                <div className="bg-muted/50 p-6 rounded-lg border-2 border-dashed">
                  <h3 className="text-lg font-semibold mb-2">Price History</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Track price cuts and date changes here. Use the Financial tab for initial and sold prices.
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Note: Price history tracking is automatically calculated based on listing data and updates.
                  </p>
                </div>
              </TabsContent>

              {/* Comps Tab */}
              <TabsContent value="comps" className="space-y-6 mt-6">
                <div className="bg-purple-50 dark:bg-purple-950/20 p-6 rounded-lg border border-purple-200 dark:border-purple-900">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Comparable Properties Linking
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Link up to 5 comparable properties by entering their IDs. These comparables help with market analysis and property valuation.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-5">
                  <div className="space-y-2">
                    <Label htmlFor="linked_comp_1">Linked Comp 1</Label>
                    <Input
                      id="linked_comp_1"
                      value={formData.linked_comp_1}
                      onChange={(e) => handleChange("linked_comp_1", e.target.value)}
                      placeholder="Comp 1 ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linked_comp_2">Linked Comp 2</Label>
                    <Input
                      id="linked_comp_2"
                      value={formData.linked_comp_2}
                      onChange={(e) => handleChange("linked_comp_2", e.target.value)}
                      placeholder="Comp 2 ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linked_comp_3">Linked Comp 3</Label>
                    <Input
                      id="linked_comp_3"
                      value={formData.linked_comp_3}
                      onChange={(e) => handleChange("linked_comp_3", e.target.value)}
                      placeholder="Comp 3 ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linked_comp_4">Linked Comp 4</Label>
                    <Input
                      id="linked_comp_4"
                      value={formData.linked_comp_4}
                      onChange={(e) => handleChange("linked_comp_4", e.target.value)}
                      placeholder="Comp 4 ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linked_comp_5">Linked Comp 5</Label>
                    <Input
                      id="linked_comp_5"
                      value={formData.linked_comp_5}
                      onChange={(e) => handleChange("linked_comp_5", e.target.value)}
                      placeholder="Comp 5 ID"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => navigate("/properties")}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-black hover:bg-black/90 text-white">
                <Save className="mr-2 h-5 w-5" />
                {saveMutation.isPending ? "Saving..." : "Save Property"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
