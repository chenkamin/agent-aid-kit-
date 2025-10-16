import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface BuyBox {
  id: string;
  name: string;
  cities: string[];
  neighborhoods: string[];
  zip_codes: string[];
  min_price: number | null;
  max_price: number | null;
  price_max: number | null;
  filter_by_ppsf: boolean;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  min_bathrooms: number | null;
  max_bathrooms: number | null;
  min_square_footage: number | null;
  max_square_footage: number | null;
  home_types: string[];
}

export default function BuyBox() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterByPpsf, setFilterByPpsf] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cities: "",
    neighborhoods: "",
    zip_codes: "",
    min_price: "",
    max_price: "",
    price_max: "",
    min_bedrooms: "",
    max_bedrooms: "",
    min_bathrooms: "",
    max_bathrooms: "",
    min_square_footage: "",
    max_square_footage: "",
    home_types: "",
  });

  // Fetch user's company first
  const { data: userCompany } = useQuery({
    queryKey: ["user-company-buybox"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("team_members")
        .select("company_id, companies(id, name)")
        .eq("user_id", user.id)
        .single();
      return data;
    },
  });

  const { data: buyBoxes = [], isLoading } = useQuery({
    queryKey: ["buy-boxes", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];

      const { data, error } = await supabase
        .from("buy_boxes")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BuyBox[];
    },
    enabled: !!userCompany?.company_id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const buyBoxData = {
        user_id: user.id,
        name: data.name,
        cities: data.cities ? data.cities.split(",").map(s => s.trim()) : [],
        neighborhoods: data.neighborhoods ? data.neighborhoods.split(",").map(s => s.trim()) : [],
        zip_codes: data.zip_codes ? data.zip_codes.split(",").map(s => s.trim()) : [],
        min_price: data.min_price ? parseFloat(data.min_price) : null,
        max_price: data.max_price ? parseFloat(data.max_price) : null,
        price_max: data.price_max ? parseFloat(data.price_max) : null,
        filter_by_ppsf: filterByPpsf,
        min_bedrooms: data.min_bedrooms ? parseInt(data.min_bedrooms) : null,
        max_bedrooms: data.max_bedrooms ? parseInt(data.max_bedrooms) : null,
        min_bathrooms: data.min_bathrooms ? parseFloat(data.min_bathrooms) : null,
        max_bathrooms: data.max_bathrooms ? parseFloat(data.max_bathrooms) : null,
        min_square_footage: data.min_square_footage ? parseInt(data.min_square_footage) : null,
        max_square_footage: data.max_square_footage ? parseInt(data.max_square_footage) : null,
        home_types: data.home_types ? data.home_types.split(",").map(s => s.trim()) : [],
      };

      if (editingId) {
        const { error } = await supabase
          .from("buy_boxes")
          .update(buyBoxData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("buy_boxes").insert(buyBoxData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buy-boxes"] });
      toast({
        title: editingId ? "Buy box updated" : "Buy box created",
        description: "Your buying criteria has been saved successfully.",
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save buy box: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("buy_boxes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buy-boxes"] });
      toast({
        title: "Buy box deleted",
        description: "The buy box has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete buy box: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (buyBox: BuyBox) => {
    setEditingId(buyBox.id);
    setFilterByPpsf(buyBox.filter_by_ppsf || false);
    setFormData({
      name: buyBox.name,
      cities: buyBox.cities?.join(", ") || "",
      neighborhoods: buyBox.neighborhoods?.join(", ") || "",
      zip_codes: buyBox.zip_codes?.join(", ") || "",
      min_price: buyBox.min_price?.toString() || "",
      max_price: buyBox.max_price?.toString() || "",
      price_max: buyBox.price_max?.toString() || "",
      min_bedrooms: buyBox.min_bedrooms?.toString() || "",
      max_bedrooms: buyBox.max_bedrooms?.toString() || "",
      min_bathrooms: buyBox.min_bathrooms?.toString() || "",
      max_bathrooms: buyBox.max_bathrooms?.toString() || "",
      min_square_footage: buyBox.min_square_footage?.toString() || "",
      max_square_footage: buyBox.max_square_footage?.toString() || "",
      home_types: buyBox.home_types?.join(", ") || "",
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFilterByPpsf(false);
    setFormData({
      name: "",
      cities: "",
      neighborhoods: "",
      zip_codes: "",
      min_price: "",
      max_price: "",
      price_max: "",
      min_bedrooms: "",
      max_bedrooms: "",
      min_bathrooms: "",
      max_bathrooms: "",
      min_square_footage: "",
      max_square_footage: "",
      home_types: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Buy Box</h1>
          <p className="text-muted-foreground">Define your buying criteria and preferences</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit" : "Create"} Buy Box</CardTitle>
          <CardDescription>
            Set your investment criteria including location, price range, and property specifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Buy Box Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Downtown Investment Portfolio"
                required
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cities">Cities</Label>
                <Input
                  id="cities"
                  name="cities"
                  value={formData.cities}
                  onChange={handleChange}
                  placeholder="e.g., Austin, Dallas, Houston"
                />
                <p className="text-xs text-muted-foreground">Separate multiple cities with commas</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhoods">Neighborhoods</Label>
                <Input
                  id="neighborhoods"
                  name="neighborhoods"
                  value={formData.neighborhoods}
                  onChange={handleChange}
                  placeholder="e.g., Downtown, East Side"
                />
                <p className="text-xs text-muted-foreground">Separate multiple neighborhoods with commas</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_codes">Zip Codes</Label>
                <Input
                  id="zip_codes"
                  name="zip_codes"
                  value={formData.zip_codes}
                  onChange={handleChange}
                  placeholder="e.g., 78701, 78702, 78703"
                />
                <p className="text-xs text-muted-foreground">Separate multiple zip codes with commas</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="home_types">Home Types</Label>
                <Input
                  id="home_types"
                  name="home_types"
                  value={formData.home_types}
                  onChange={handleChange}
                  placeholder="e.g., Single Family, Condo, Multi-Family"
                />
                <p className="text-xs text-muted-foreground">Separate multiple types with commas</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Price Range</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2 pb-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="filter_by_ppsf">Filter by Price per Square Foot</Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, the max price will be treated as price per square foot instead of total price
                    </p>
                  </div>
                  <Switch
                    id="filter_by_ppsf"
                    checked={filterByPpsf}
                    onCheckedChange={setFilterByPpsf}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="min_price">Min Price</Label>
                    <Input
                      id="min_price"
                      name="min_price"
                      type="number"
                      value={formData.min_price}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_price">Max Price</Label>
                    <Input
                      id="max_price"
                      name="max_price"
                      type="number"
                      value={formData.max_price}
                      onChange={handleChange}
                      placeholder="1000000"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="price_max">
                      {filterByPpsf ? "Max Price per Square Foot" : "Max Total Price (for scraper)"}
                    </Label>
                    <Input
                      id="price_max"
                      name="price_max"
                      type="number"
                      value={formData.price_max}
                      onChange={handleChange}
                      placeholder={filterByPpsf ? "150" : "1000000"}
                    />
                    <p className="text-xs text-muted-foreground">
                      {filterByPpsf 
                        ? "Properties will be filtered by calculated price per sqft (e.g., $150/sqft)" 
                        : "Maximum price to use when scraping properties from Zillow"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Property Specifications</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min_bedrooms">Min Bedrooms</Label>
                  <Input
                    id="min_bedrooms"
                    name="min_bedrooms"
                    type="number"
                    value={formData.min_bedrooms}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_bedrooms">Max Bedrooms</Label>
                  <Input
                    id="max_bedrooms"
                    name="max_bedrooms"
                    type="number"
                    value={formData.max_bedrooms}
                    onChange={handleChange}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_bathrooms">Min Bathrooms</Label>
                  <Input
                    id="min_bathrooms"
                    name="min_bathrooms"
                    type="number"
                    step="0.5"
                    value={formData.min_bathrooms}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_bathrooms">Max Bathrooms</Label>
                  <Input
                    id="max_bathrooms"
                    name="max_bathrooms"
                    type="number"
                    step="0.5"
                    value={formData.max_bathrooms}
                    onChange={handleChange}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_square_footage">Min Square Footage</Label>
                  <Input
                    id="min_square_footage"
                    name="min_square_footage"
                    type="number"
                    value={formData.min_square_footage}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_square_footage">Max Square Footage</Label>
                  <Input
                    id="max_square_footage"
                    name="max_square_footage"
                    type="number"
                    value={formData.max_square_footage}
                    onChange={handleChange}
                    placeholder="10000"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saveMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                {editingId ? "Update" : "Create"} Buy Box
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Saved Buy Boxes</h2>
        {buyBoxes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No buy boxes yet. Create your first one above!
            </CardContent>
          </Card>
        ) : (
          buyBoxes.map((buyBox) => (
            <Card key={buyBox.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{buyBox.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(buyBox)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(buyBox.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {buyBox.cities && buyBox.cities.length > 0 && (
                  <div>
                    <span className="font-semibold">Cities: </span>
                    <span className="text-muted-foreground">{buyBox.cities.join(", ")}</span>
                  </div>
                )}
                {buyBox.neighborhoods && buyBox.neighborhoods.length > 0 && (
                  <div>
                    <span className="font-semibold">Neighborhoods: </span>
                    <span className="text-muted-foreground">{buyBox.neighborhoods.join(", ")}</span>
                  </div>
                )}
                {buyBox.zip_codes && buyBox.zip_codes.length > 0 && (
                  <div>
                    <span className="font-semibold">Zip Codes: </span>
                    <span className="text-muted-foreground">{buyBox.zip_codes.join(", ")}</span>
                  </div>
                )}
                <div className="grid gap-2 md:grid-cols-2">
                  {(buyBox.min_price || buyBox.max_price) && (
                    <div>
                      <span className="font-semibold">Price Range: </span>
                      <span className="text-muted-foreground">
                        ${buyBox.min_price?.toLocaleString() || "0"} - $
                        {buyBox.max_price?.toLocaleString() || "∞"}
                      </span>
                    </div>
                  )}
                  {buyBox.price_max && (
                    <div>
                      <span className="font-semibold">
                        {buyBox.filter_by_ppsf ? "Max Price/SqFt: " : "Max Scraper Price: "}
                      </span>
                      <span className="text-muted-foreground">
                        ${buyBox.price_max.toLocaleString()}
                        {buyBox.filter_by_ppsf ? "/sqft" : ""}
                      </span>
                    </div>
                  )}
                  {(buyBox.min_bedrooms || buyBox.max_bedrooms) && (
                    <div>
                      <span className="font-semibold">Bedrooms: </span>
                      <span className="text-muted-foreground">
                        {buyBox.min_bedrooms || "0"} - {buyBox.max_bedrooms || "∞"}
                      </span>
                    </div>
                  )}
                  {(buyBox.min_bathrooms || buyBox.max_bathrooms) && (
                    <div>
                      <span className="font-semibold">Bathrooms: </span>
                      <span className="text-muted-foreground">
                        {buyBox.min_bathrooms || "0"} - {buyBox.max_bathrooms || "∞"}
                      </span>
                    </div>
                  )}
                  {(buyBox.min_square_footage || buyBox.max_square_footage) && (
                    <div>
                      <span className="font-semibold">Square Footage: </span>
                      <span className="text-muted-foreground">
                        {buyBox.min_square_footage?.toLocaleString() || "0"} -{" "}
                        {buyBox.max_square_footage?.toLocaleString() || "∞"} sqft
                      </span>
                    </div>
                  )}
                </div>
                {buyBox.home_types && buyBox.home_types.length > 0 && (
                  <div>
                    <span className="font-semibold">Home Types: </span>
                    <span className="text-muted-foreground">{buyBox.home_types.join(", ")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
