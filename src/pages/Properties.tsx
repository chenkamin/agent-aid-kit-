import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, DollarSign, MapPin, Home, Calendar, Ruler, Clock, Phone, Mail, FileText, Video, CheckCircle2, List } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";

export default function Properties() {
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: "note",
    title: "",
    body: "",
    due_at: "",
  });
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [listForm, setListForm] = useState({
    name: "",
    zipCodes: "",
    priceMax: "",
    daysOnZillow: "",
    forSaleByAgent: true,
    forSaleByOwner: true,
    forRent: false,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("properties")
        .select(`
          *,
          activities!activities_property_id_fkey(
            id,
            type,
            due_at,
            status
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
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
      case "Tracking":
        return "bg-blue-500 text-white";
      case "Not Relevant":
        return "bg-gray-500 text-white";
      case "Follow Up":
        return "bg-purple-500 text-white";
      case "Waiting for Response":
        return "bg-orange-500 text-white";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getNextFollowUp = (property: any) => {
    if (!property.activities || property.activities.length === 0) return null;
    
    const followUps = property.activities.filter(
      (activity: any) => 
        activity.type === 'follow_up' && 
        activity.status === 'open' && 
        activity.due_at
    );
    
    if (followUps.length === 0) return null;
    
    // Sort by due_at and return the earliest one
    return followUps.sort(
      (a: any, b: any) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    )[0];
  };

  const addActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { error } = await supabase.from("activities").insert([{
        ...data,
        property_id: selectedProperty?.id,
        user_id: user.id,
        status: 'open',
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });
      toast({
        title: "Activity added",
        description: "The activity has been added successfully.",
      });
      setIsAddingActivity(false);
      setActivityForm({ type: "note", title: "", body: "", due_at: "" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add activity: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddActivity = () => {
    if (!activityForm.title) {
      toast({
        title: "Error",
        description: "Please enter a title for the activity",
        variant: "destructive",
      });
      return;
    }
    addActivityMutation.mutate(activityForm);
  };

  const createListMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { error } = await supabase.from("buy_boxes").insert([{
        user_id: user.id,
        name: data.name,
        zip_codes: data.zipCodes,
        price_max: data.priceMax ? parseFloat(data.priceMax) : null,
        days_on_zillow: data.daysOnZillow ? parseInt(data.daysOnZillow) : null,
        for_sale_by_agent: data.forSaleByAgent,
        for_sale_by_owner: data.forSaleByOwner,
        for_rent: data.forRent,
      }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "List created",
        description: "Your property list has been created successfully.",
      });
      setIsCreatingList(false);
      setListForm({
        name: "",
        zipCodes: "",
        priceMax: "",
        daysOnZillow: "",
        forSaleByAgent: true,
        forSaleByOwner: true,
        forRent: false,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create list: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateList = () => {
    if (!listForm.name) {
      toast({
        title: "Error",
        description: "Please enter a name for the list",
        variant: "destructive",
      });
      return;
    }
    
    // Convert comma-separated strings to arrays
    const formattedData = {
      ...listForm,
      zipCodes: listForm.zipCodes ? listForm.zipCodes.split(',').map(z => z.trim()).filter(Boolean) : [],
    };
    
    createListMutation.mutate(formattedData);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "meeting":
        return <Video className="h-4 w-4" />;
      case "offer":
        return <DollarSign className="h-4 w-4" />;
      case "follow_up":
        return <Clock className="h-4 w-4" />;
      case "viewing":
        return <Home className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActivityStatusIcon = (status: string) => {
    return status === "done" ? (
      <CheckCircle2 className="h-4 w-4 text-success" />
    ) : (
      <Clock className="h-4 w-4 text-warning" />
    );
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
        <div className="flex gap-3">
          <Dialog open={isCreatingList} onOpenChange={setIsCreatingList}>
            <DialogTrigger asChild>
              <Button size="lg" variant="outline" className="text-base">
                <List className="mr-2 h-5 w-5" />
                Create List
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="create-list-description">
              <DialogHeader>
                <DialogTitle>Create Property List</DialogTitle>
                <p id="create-list-description" className="text-sm text-muted-foreground">
                  Define criteria for your property search list (for future Zillow scraping)
                </p>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="list-name">List Name *</Label>
                  <Input
                    id="list-name"
                    value={listForm.name}
                    onChange={(e) => setListForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Cleveland Investment Properties"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip-codes">Zip Codes *</Label>
                  <Input
                    id="zip-codes"
                    value={listForm.zipCodes}
                    onChange={(e) => setListForm(prev => ({ ...prev, zipCodes: e.target.value }))}
                    placeholder="e.g., 44125, 44137"
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated zip codes</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price-max">Maximum Price</Label>
                  <Input
                    id="price-max"
                    type="number"
                    value={listForm.priceMax}
                    onChange={(e) => setListForm(prev => ({ ...prev, priceMax: e.target.value }))}
                    placeholder="e.g., 200000"
                  />
                  <p className="text-xs text-muted-foreground">Maximum price for properties</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="days-on-zillow">Days On Zillow</Label>
                  <Input
                    id="days-on-zillow"
                    type="number"
                    value={listForm.daysOnZillow}
                    onChange={(e) => setListForm(prev => ({ ...prev, daysOnZillow: e.target.value }))}
                    placeholder="Leave empty for any"
                  />
                  <p className="text-xs text-muted-foreground">Filter by days listed on Zillow (optional)</p>
                </div>

                <div className="space-y-3">
                  <Label>Listing Type</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="for-sale-by-agent"
                        checked={listForm.forSaleByAgent}
                        onCheckedChange={(checked) => 
                          setListForm(prev => ({ ...prev, forSaleByAgent: checked === true }))
                        }
                      />
                      <label
                        htmlFor="for-sale-by-agent"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        For Sale By Agent
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="for-sale-by-owner"
                        checked={listForm.forSaleByOwner}
                        onCheckedChange={(checked) => 
                          setListForm(prev => ({ ...prev, forSaleByOwner: checked === true }))
                        }
                      />
                      <label
                        htmlFor="for-sale-by-owner"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        For Sale By Owner
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="for-rent"
                        checked={listForm.forRent}
                        onCheckedChange={(checked) => 
                          setListForm(prev => ({ ...prev, forRent: checked === true }))
                        }
                      />
                      <label
                        htmlFor="for-rent"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        For Rent
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsCreatingList(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateList} disabled={createListMutation.isPending}>
                    {createListMutation.isPending ? "Creating..." : "Create List"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Link to="/properties/new">
            <Button size="lg" className="text-base">
              <Plus className="mr-2 h-5 w-5" />
              Add Property
            </Button>
          </Link>
        </div>
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
              {properties?.map((property) => {
                const nextFollowUp = getNextFollowUp(property);
                return (
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
                      {nextFollowUp && (
                        <div className="flex items-center gap-2 mt-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-3 py-1 rounded-full w-fit animate-pulse">
                          <Clock className="h-4 w-4" />
                          <span>Follow up: {format(new Date(nextFollowUp.due_at), "MMM d, yyyy")}</span>
                        </div>
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" aria-describedby="property-details-description">
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

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Activities</h3>
                  <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Activity
                      </Button>
                    </DialogTrigger>
                    <DialogContent aria-describedby="activity-form-description">
                      <DialogHeader>
                        <DialogTitle>Add New Activity</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="activity-type">Type</Label>
                          <Select
                            value={activityForm.type}
                            onValueChange={(value) => setActivityForm(prev => ({ ...prev, type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="call">Call</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="meeting">Meeting</SelectItem>
                              <SelectItem value="note">Note</SelectItem>
                              <SelectItem value="offer">Offer Sent</SelectItem>
                              <SelectItem value="follow_up">Follow Up</SelectItem>
                              <SelectItem value="viewing">Viewing</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="activity-title">Title</Label>
                          <Input
                            id="activity-title"
                            value={activityForm.title}
                            onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., Called agent about property"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="activity-body">Details</Label>
                          <Textarea
                            id="activity-body"
                            value={activityForm.body}
                            onChange={(e) => setActivityForm(prev => ({ ...prev, body: e.target.value }))}
                            placeholder="Additional details..."
                            rows={3}
                          />
                        </div>

                        {activityForm.type === "follow_up" && (
                          <div className="space-y-2">
                            <Label htmlFor="activity-due">Follow Up Date</Label>
                            <Input
                              id="activity-due"
                              type="datetime-local"
                              value={activityForm.due_at}
                              onChange={(e) => setActivityForm(prev => ({ ...prev, due_at: e.target.value }))}
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddingActivity(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddActivity} disabled={addActivityMutation.isPending}>
                            {addActivityMutation.isPending ? "Adding..." : "Add Activity"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {!selectedProperty.activities || selectedProperty.activities.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">No activities yet</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {selectedProperty.activities.map((activity: any) => (
                      <div
                        key={activity.id}
                        className="flex gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-2 rounded-full bg-primary/10 text-primary">
                            {getActivityIcon(activity.type)}
                          </div>
                          {getActivityStatusIcon(activity.status)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-sm">{activity.title}</h4>
                            <Badge variant="outline" className="capitalize text-xs">
                              {activity.type.replace("_", " ")}
                            </Badge>
                          </div>
                          {activity.body && (
                            <p className="text-xs text-muted-foreground">{activity.body}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {activity.due_at && (
                              <span>Due: {format(new Date(activity.due_at), "MMM d, yyyy")}</span>
                            )}
                            <span>•</span>
                            <span>{format(new Date(activity.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
