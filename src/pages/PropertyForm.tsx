import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "",
    zip: "",
    neighborhood: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    square_footage: "",
    year_built: "",
    lot_size: "",
    home_type: "",
    status: "For Sale",
    description: "",
    arv_estimate: "",
    mls_number: "",
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

  useEffect(() => {
    if (property) {
      setFormData({
        address: property.address || "",
        city: property.city || "",
        state: property.state || "",
        zip: property.zip || "",
        neighborhood: property.neighborhood || "",
        price: property.price?.toString() || "",
        bedrooms: property.bedrooms?.toString() || "",
        bathrooms: property.bathrooms?.toString() || "",
        square_footage: property.square_footage?.toString() || "",
        year_built: property.year_built?.toString() || "",
        lot_size: property.lot_size || "",
        home_type: property.home_type || "",
        status: property.status || "For Sale",
        description: property.description || "",
        arv_estimate: property.arv_estimate?.toString() || "",
        mls_number: property.mls_number || "",
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
        const { error } = await supabase.from("properties").insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
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
    const data: any = {};
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== "") {
        if (["price", "bedrooms", "bathrooms", "square_footage", "year_built", "arv_estimate"].includes(key)) {
          data[key] = Number(value);
        } else {
          data[key] = value;
        }
      }
    });

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
            {isEditing ? "Edit Property" : "New Property"}
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            {isEditing ? "Update property details" : "Add a new property to your portfolio"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Los Angeles"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="CA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">Zip Code</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) => handleChange("zip", e.target.value)}
                  placeholder="90001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Neighborhood</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => handleChange("neighborhood", e.target.value)}
                  placeholder="Downtown"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mls_number">MLS Number</Label>
                <Input
                  id="mls_number"
                  value={formData.mls_number}
                  onChange={(e) => handleChange("mls_number", e.target.value)}
                  placeholder="MLS-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  placeholder="450000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arv_estimate">ARV Estimate</Label>
                <Input
                  id="arv_estimate"
                  type="number"
                  value={formData.arv_estimate}
                  onChange={(e) => handleChange("arv_estimate", e.target.value)}
                  placeholder="550000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => handleChange("bedrooms", e.target.value)}
                  placeholder="3"
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
                  placeholder="2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="square_footage">Square Footage</Label>
                <Input
                  id="square_footage"
                  type="number"
                  value={formData.square_footage}
                  onChange={(e) => handleChange("square_footage", e.target.value)}
                  placeholder="1800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year_built">Year Built</Label>
                <Input
                  id="year_built"
                  type="number"
                  value={formData.year_built}
                  onChange={(e) => handleChange("year_built", e.target.value)}
                  placeholder="1995"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lot_size">Lot Size</Label>
                <Input
                  id="lot_size"
                  value={formData.lot_size}
                  onChange={(e) => handleChange("lot_size", e.target.value)}
                  placeholder="5000"
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
                    <SelectItem value="Condo">Condo</SelectItem>
                    <SelectItem value="Townhouse">Townhouse</SelectItem>
                    <SelectItem value="Multi Family">Multi Family</SelectItem>
                    <SelectItem value="Land">Land</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Property description..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate("/properties")}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
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
