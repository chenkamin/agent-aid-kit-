import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function Properties() {
  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "For Sale":
        return "bg-primary text-primary-foreground";
      case "Under Contract":
        return "bg-warning text-warning-foreground";
      case "Sold":
        return "bg-success text-success-foreground";
      case "Off Market":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-muted-foreground">Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Properties</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Manage your real estate portfolio
          </p>
        </div>
        <Link to="/properties/new">
          <Button size="lg" className="text-base">
            <Plus className="mr-2 h-5 w-5" />
            Add Property
          </Button>
        </Link>
      </div>

      {properties && properties.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-4">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-2xl font-semibold text-foreground">No properties yet</h3>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Start building your portfolio by adding your first property
            </p>
            <Link to="/properties/new">
              <Button size="lg" className="mt-4">
                <Plus className="mr-2 h-5 w-5" />
                Add Property
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties?.map((property) => (
            <Link key={property.id} to={`/properties/${property.id}`}>
              <Card className="hover:shadow-xl transition-all cursor-pointer h-full">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl line-clamp-1">
                      {property.address || "Untitled Property"}
                    </CardTitle>
                    <Badge className={getStatusColor(property.status)}>
                      {property.status}
                    </Badge>
                  </div>
                  {(property.city || property.state) && (
                    <div className="flex items-center text-base text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      {[property.city, property.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {property.price && (
                    <div className="flex items-center text-2xl font-bold text-foreground">
                      <DollarSign className="h-6 w-6 mr-1" />
                      {Number(property.price).toLocaleString()}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-base text-muted-foreground">
                    {property.bedrooms && (
                      <span>{property.bedrooms} beds</span>
                    )}
                    {property.bathrooms && (
                      <span>{property.bathrooms} baths</span>
                    )}
                    {property.square_footage && (
                      <span>{property.square_footage.toLocaleString()} sqft</span>
                    )}
                  </div>
                  {property.price_per_sqft && (
                    <div className="text-sm text-muted-foreground">
                      ${property.price_per_sqft}/sqft
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
