import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, MapPin, DollarSign, Home, Calendar, Ruler, Plus, Phone, Mail, FileText, Video, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
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
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: "note",
    title: "",
    body: "",
    due_at: "",
  });

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

  const { data: activities } = useQuery({
    queryKey: ["property-activities", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("property_id", id)
        .order("created_at", { ascending: false });
      return data || [];
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

  const addActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("activities").insert([{
        ...data,
        property_id: id,
        status: 'open',
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-activities", id] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Activity Timeline</CardTitle>
          <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Activity
              </Button>
            </DialogTrigger>
            <DialogContent>
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
        </CardHeader>
        <CardContent>
          {!activities || activities.length === 0 ? (
            <p className="text-muted-foreground italic">No activities yet. Add your first activity to start tracking.</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      {getActivityIcon(activity.type)}
                    </div>
                    {getActivityStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-foreground">{activity.title}</h4>
                      <Badge variant="outline" className="capitalize">
                        {activity.type.replace("_", " ")}
                      </Badge>
                    </div>
                    {activity.body && (
                      <p className="text-sm text-muted-foreground">{activity.body}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{format(new Date(activity.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      {activity.due_at && (
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                          <Clock className="h-3 w-3" />
                          Due: {format(new Date(activity.due_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
