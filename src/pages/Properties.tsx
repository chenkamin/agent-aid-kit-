import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, DollarSign, MapPin, Home, Calendar, Ruler } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function Properties() {
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  
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
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {properties?.map((property) => (
                <div
                  key={property.id}
                  onClick={() => setSelectedProperty(property)}
                  className="flex items-center justify-between p-6 hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground truncate">
                      {property.address || "Untitled Property"}
                    </h3>
                    {(property.city || property.state) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {[property.city, property.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-6 ml-6">
                    {property.price && (
                      <div className="text-right">
                        <div className="flex items-center text-xl font-bold text-foreground">
                          <DollarSign className="h-5 w-5" />
                          {Number(property.price).toLocaleString()}
                        </div>
                        {property.price_per_sqft && (
                          <p className="text-sm text-muted-foreground">
                            ${property.price_per_sqft}/sqft
                          </p>
                        )}
                      </div>
                    )}
                    
                    <Badge className={getStatusColor(property.status)}>
                      {property.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedProperty?.address || "Untitled Property"}
            </DialogTitle>
            {selectedProperty && (selectedProperty.city || selectedProperty.state) && (
              <div className="flex items-center text-muted-foreground mt-2">
                <MapPin className="h-4 w-4 mr-2" />
                {[selectedProperty.city, selectedProperty.state, selectedProperty.zip]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <Badge className={getStatusColor(selectedProperty.status)}>
                  {selectedProperty.status}
                </Badge>
                <div className="flex gap-2">
                  <Link to={`/properties/${selectedProperty.id}`}>
                    <Button variant="outline" size="sm">View Full</Button>
                  </Link>
                  <Link to={`/properties/${selectedProperty.id}/edit`}>
                    <Button variant="outline" size="sm">Edit</Button>
                  </Link>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Financial Details</h3>
                  
                  {selectedProperty.price && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price</span>
                      <div className="flex items-center font-bold">
                        <DollarSign className="h-4 w-4" />
                        {Number(selectedProperty.price).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {selectedProperty.arv_estimate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ARV Estimate</span>
                      <div className="flex items-center font-semibold text-success">
                        <DollarSign className="h-4 w-4" />
                        {Number(selectedProperty.arv_estimate).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {selectedProperty.price_per_sqft && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price per sqft</span>
                      <span className="font-medium">${selectedProperty.price_per_sqft}/sqft</span>
                    </div>
                  )}

                  {selectedProperty.mls_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MLS Number</span>
                      <span className="font-medium">{selectedProperty.mls_number}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Property Details</h3>

                  {selectedProperty.bedrooms && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bedrooms</span>
                      <span className="font-medium">{selectedProperty.bedrooms}</span>
                    </div>
                  )}

                  {selectedProperty.bathrooms && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bathrooms</span>
                      <span className="font-medium">{selectedProperty.bathrooms}</span>
                    </div>
                  )}

                  {selectedProperty.square_footage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Square Footage</span>
                      <span className="font-medium">
                        {selectedProperty.square_footage.toLocaleString()} sqft
                      </span>
                    </div>
                  )}

                  {selectedProperty.lot_size && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lot Size</span>
                      <span className="font-medium">{selectedProperty.lot_size}</span>
                    </div>
                  )}

                  {selectedProperty.year_built && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Year Built</span>
                      <span className="font-medium">{selectedProperty.year_built}</span>
                    </div>
                  )}

                  {selectedProperty.home_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Home Type</span>
                      <span className="font-medium">{selectedProperty.home_type}</span>
                    </div>
                  )}

                  {selectedProperty.neighborhood && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Neighborhood</span>
                      <span className="font-medium">{selectedProperty.neighborhood}</span>
                    </div>
                  )}

                  {selectedProperty.days_on_market && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days on Market</span>
                      <span className="font-medium">{selectedProperty.days_on_market} days</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedProperty.description && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-lg mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {selectedProperty.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
