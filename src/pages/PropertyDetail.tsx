import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, MapPin, DollarSign, Home, Calendar, Ruler } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({
        title: "Property deleted",
        description: "The property has been deleted successfully.",
      });
      navigate("/properties");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete property: ${error.message}`,
        variant: "destructive",
      });
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
        <p className="text-lg text-muted-foreground">Loading property...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-muted-foreground">Property not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              {property.address || "Untitled Property"}
            </h1>
            {(property.city || property.state) && (
              <div className="flex items-center text-lg text-muted-foreground mt-2">
                <MapPin className="h-5 w-5 mr-2" />
                {[property.city, property.state, property.zip].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/properties/${id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-5 w-5" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-5 w-5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the property.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge className={getStatusColor(property.status)}>{property.status}</Badge>
            </div>
            
            {property.price && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price</span>
                <div className="flex items-center text-2xl font-bold">
                  <DollarSign className="h-5 w-5 mr-1" />
                  {Number(property.price).toLocaleString()}
                </div>
              </div>
            )}

            {property.arv_estimate && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ARV Estimate</span>
                <div className="flex items-center text-xl font-semibold text-success">
                  <DollarSign className="h-5 w-5 mr-1" />
                  {Number(property.arv_estimate).toLocaleString()}
                </div>
              </div>
            )}

            {property.price_per_sqft && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price per sqft</span>
                <span className="font-medium">${property.price_per_sqft}/sqft</span>
              </div>
            )}

            {property.bedrooms && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bedrooms</span>
                <span className="font-medium">{property.bedrooms}</span>
              </div>
            )}

            {property.bathrooms && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bathrooms</span>
                <span className="font-medium">{property.bathrooms}</span>
              </div>
            )}

            {property.square_footage && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Square Footage</span>
                <span className="font-medium">{property.square_footage.toLocaleString()} sqft</span>
              </div>
            )}

            {property.lot_size && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Lot Size</span>
                <span className="font-medium">{property.lot_size} sqft</span>
              </div>
            )}

            {property.year_built && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Year Built</span>
                <span className="font-medium">{property.year_built}</span>
              </div>
            )}

            {property.home_type && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Home Type</span>
                <span className="font-medium">{property.home_type}</span>
              </div>
            )}

            {property.mls_number && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">MLS Number</span>
                <span className="font-medium">{property.mls_number}</span>
              </div>
            )}

            {property.neighborhood && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Neighborhood</span>
                <span className="font-medium">{property.neighborhood}</span>
              </div>
            )}

            {property.days_on_market && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Days on Market</span>
                <span className="font-medium">{property.days_on_market} days</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            {property.description ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{property.description}</p>
            ) : (
              <p className="text-muted-foreground italic">No description available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground italic">Activity tracking coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
