import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  List,
  Copy,
  Edit,
  Save,
  X,
  Filter,
  MapPin
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Activities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch user's company first
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
  
  // View state
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  
  // Form states
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [cloningActivity, setCloningActivity] = useState<any>(null);
  
  const [activityForm, setActivityForm] = useState({
    type: "other",
    title: "",
    body: "",
    due_at: "",
    property_id: "none",
    assigned_to: "unassigned",
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    dateFrom: "",
    dateTo: "",
    propertyId: "all",
    buyBoxId: "all",
    assignedTo: "all",
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Reset to page 1 when filters or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  // Fetch ALL activities (for accurate counting with client-side buy_box filter)
  const { data: allActivities, isLoading } = useQuery({
    queryKey: ["all-activities", userCompany?.company_id, filters],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      
      console.log("🔍 Fetching activities for company_id:", userCompany.company_id);
      
      let query = supabase
        .from("activities")
        .select("*, properties(id, address, city, buy_box_id)")
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false });
      
      // Apply filters
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.type !== "all") {
        query = query.eq("type", filters.type);
      }
      if (filters.dateFrom) {
        query = query.gte("due_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("due_at", filters.dateTo);
      }
      if (filters.propertyId !== "all") {
        query = query.eq("property_id", filters.propertyId);
      }
      if (filters.assignedTo !== "all") {
        if (filters.assignedTo === "unassigned") {
          query = query.is("assigned_to", null);
        } else {
          query = query.eq("assigned_to", filters.assignedTo);
        }
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("❌ Error fetching activities:", error);
        return [];
      }
      
      console.log("✅ Activities fetched:", data?.length, "activities");
      
      // Client-side filter for buy_box_id since it's nested
      let filteredData = data || [];
      if (filters.buyBoxId !== "all") {
        filteredData = filteredData.filter(
          (activity: any) => activity.properties?.buy_box_id === filters.buyBoxId
        );
      }
      
      console.log("📊 After filtering:", filteredData.length, "activities");
      
      return filteredData;
    },
    enabled: !!userCompany?.company_id,
  });

  // Calculate pagination from filtered activities
  const totalCount = allActivities?.length || 0;
  const from = (currentPage - 1) * itemsPerPage;
  const to = from + itemsPerPage;
  const activities = allActivities?.slice(from, to) || [];

  // Fetch properties for dropdown
  const { data: properties } = useQuery({
    queryKey: ["properties", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      // Exclude "Not Relevant" properties by default
      const { data } = await supabase
        .from("properties")
        .select("id, address, city")
        .eq("company_id", userCompany.company_id)
        .neq("status", "Not Relevant")
        .order("address");
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch buy boxes for filter
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

  // Fetch team members for assigned_to dropdown
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-with-profiles", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      
      // First get team members
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("id, user_id, role")
        .eq("company_id", userCompany.company_id);
      
      if (membersError) {
        console.error("Error fetching team members:", membersError);
        return [];
      }

      if (!members || members.length === 0) return [];

      // Then get profiles for each member
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return [];
      }

      // Combine the data
      const membersWithProfiles = members.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        return {
          ...member,
          profiles: profile
        };
      });

      // Sort by role (owner/admin first)
      membersWithProfiles.sort((a, b) => {
        if (a.role === "owner") return -1;
        if (b.role === "owner") return 1;
        if (a.role === "admin") return -1;
        if (b.role === "admin") return 1;
        return 0;
      });
      
      return membersWithProfiles;
    },
    enabled: !!userCompany?.company_id,
  });

  // Add/Update activity mutation
  const saveActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!userCompany?.company_id) throw new Error("No company found");
      
      const activityData: any = {
        type: data.type,
        title: data.title,
        body: data.body,
        user_id: user.id,
        company_id: userCompany.company_id,
        status: data.status || 'open',
        assigned_to: data.assigned_to === "unassigned" ? null : data.assigned_to || null,
      };
      
      // Only include property_id if provided and not "none"
      if (data.property_id && data.property_id !== "none" && data.property_id !== "") {
        activityData.property_id = data.property_id;
      }
      
      // Only include due_at if it's provided and not empty
      if (data.due_at && data.due_at.trim() !== '') {
        activityData.due_at = data.due_at;
      }
      
      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from("activities")
          .update(activityData)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("activities").insert([activityData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", userCompany?.company_id] });
      toast({
        title: "Success",
        description: editingActivity ? "Activity updated successfully" : "Activity added successfully",
      });
      setIsAddingActivity(false);
      setEditingActivity(null);
      setCloningActivity(null);
      setActivityForm({ type: "other", title: "", body: "", due_at: "", property_id: "" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save activity: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update activity status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // OPTIMISTIC UPDATE - Update UI immediately
      queryClient.setQueryData(
        ["activities", userCompany?.company_id, filters],
        (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.map((activity: any) => {
            if (activity.id === id) {
              const updateData = { ...activity, status };
              if (status === 'done') {
                updateData.completed_at = new Date().toISOString();
              }
              return updateData;
            }
            return activity;
          });
        }
      );

      const updateData: any = { status };
      if (status === 'done') {
        updateData.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("activities")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", userCompany?.company_id] });
      toast({
        title: "Status updated",
        description: "Activity status has been updated",
      });
    },
    onError: () => {
      // ROLLBACK on error
      queryClient.invalidateQueries({ queryKey: ["activities", userCompany?.company_id] });
      toast({
        title: "Error",
        description: "Failed to update activity status",
        variant: "destructive",
      });
    },
  });

  const handleSaveActivity = () => {
    if (!activityForm.title) {
      toast({
        title: "Error",
        description: "Please enter a title for the activity",
        variant: "destructive",
      });
      return;
    }
    
    const dataToSave = editingActivity 
      ? { ...activityForm, id: editingActivity.id, status: editingActivity.status }
      : activityForm;
    
    saveActivityMutation.mutate(dataToSave);
  };

  const handleEditActivity = (activity: any) => {
    setEditingActivity(activity);
    setActivityForm({
      type: activity.type,
      title: activity.title,
      body: activity.body || "",
      due_at: activity.due_at ? format(new Date(activity.due_at), "yyyy-MM-dd'T'HH:mm") : "",
      property_id: activity.property_id || "none",
      assigned_to: activity.assigned_to || "unassigned",
    });
    setIsAddingActivity(true);
  };

  const handleCloneActivity = (activity: any) => {
    setCloningActivity(activity);
    setActivityForm({
      type: activity.type,
      title: `${activity.title} (Copy)`,
      body: activity.body || "",
      due_at: "",
      property_id: activity.property_id || "none",
      assigned_to: activity.assigned_to || "unassigned",
    });
    setIsAddingActivity(true);
  };

  const handleCancelEdit = () => {
    setIsAddingActivity(false);
    setEditingActivity(null);
    setCloningActivity(null);
    setActivityForm({ type: "other", title: "", body: "", due_at: "", property_id: "none", assigned_to: "unassigned" });
  };

  // Helper function to get team member display name
  const getTeamMemberDisplayName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const member = teamMembers?.find((m: any) => m.user_id === userId);
    if (!member) return "Unknown";
    const displayName = member.profiles?.full_name || member.profiles?.email || "Unknown";
    const roleText = member.role && member.role !== "member" ? ` (${member.role})` : "";
    return `${displayName}${roleText}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "snoozed":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <CalendarIcon className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-green-100 text-green-800 border-green-200";
      case "snoozed":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  // Group activities by date for calendar view
  const activitiesByDate: Record<string, any[]> = {};
  activities?.forEach((activity: any) => {
    if (activity.due_at) {
      const dateKey = format(new Date(activity.due_at), "yyyy-MM-dd");
      if (!activitiesByDate[dateKey]) {
        activitiesByDate[dateKey] = [];
      }
      activitiesByDate[dateKey].push(activity);
    }
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const selectedDateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const selectedDateActivities = selectedDateKey ? (activitiesByDate[selectedDateKey] || []) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-muted-foreground">Loading activities...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Activities</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Track your follow-ups and tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Dialog open={isAddingActivity} onOpenChange={(open) => {
            setIsAddingActivity(open);
            if (!open) handleCancelEdit();
          }}>
            <DialogTrigger asChild>
              <Button size="lg" className="text-base">
                <Plus className="mr-2 h-5 w-5" />
                Add Activity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingActivity ? "Edit Activity" : cloningActivity ? "Clone Activity" : "Add New Activity"}
                </DialogTitle>
                {(editingActivity || cloningActivity) && (editingActivity?.properties || cloningActivity?.properties) && (
                  <div className="pt-2 mt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Property:</span>{" "}
                      {(editingActivity?.properties || cloningActivity?.properties)?.address || "Unknown"}
                    </p>
                    {((editingActivity?.properties || cloningActivity?.properties)?.city) && (
                      <p className="text-xs text-muted-foreground">
                        {(editingActivity?.properties || cloningActivity?.properties)?.city}
                      </p>
                    )}
                  </div>
                )}
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
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="site-visit">Site Visit</SelectItem>
                      <SelectItem value="offer-sent">Offer Sent</SelectItem>
                      <SelectItem value="comp-analysis">Comp Analysis</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="price-reduction-ask">Price Reduction Ask</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity-property">Property (Optional)</Label>
                  <Select
                    value={activityForm.property_id}
                    onValueChange={(value) => setActivityForm(prev => ({ ...prev, property_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a property..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {properties?.map((property: any) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.address}{property.city && `, ${property.city}`}
                        </SelectItem>
                      ))}
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

                <div className="space-y-2">
                  <Label htmlFor="activity-assigned-to">Assigned To</Label>
                  <Select
                    value={activityForm.assigned_to || "unassigned"}
                    onValueChange={(value) => setActivityForm(prev => ({ ...prev, assigned_to: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers?.map((member: any) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.profiles?.full_name || member.profiles?.email || "Unknown"} {member.role && member.role !== "member" && `(${member.role})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity-due">Due Date (Optional)</Label>
                  <Input
                    id="activity-due"
                    type="datetime-local"
                    value={activityForm.due_at}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, due_at: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveActivity} disabled={saveActivityMutation.isPending}>
                    {saveActivityMutation.isPending ? "Saving..." : editingActivity ? "Update" : "Add Activity"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="snoozed">Snoozed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="site-visit">Site Visit</SelectItem>
                    <SelectItem value="offer-sent">Offer Sent</SelectItem>
                    <SelectItem value="comp-analysis">Comp Analysis</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="price-reduction-ask">Price Reduction Ask</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Property</Label>
                <Select
                  value={filters.propertyId}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, propertyId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {properties?.map((property: any) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>List</Label>
                <Select
                  value={filters.buyBoxId}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, buyBoxId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lists</SelectItem>
                    {buyBoxes?.map((box: any) => (
                      <SelectItem key={box.id} value={box.id}>
                        {box.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select
                  value={filters.assignedTo}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, assignedTo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team Members</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers?.map((member: any) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profiles?.full_name || member.profiles?.email || "Unknown"} {member.role && member.role !== "member" && `(${member.role})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setFilters({
                  status: "all",
                  type: "all",
                  dateFrom: "",
                  dateTo: "",
                  propertyId: "all",
                  buyBoxId: "all",
                  assignedTo: "all",
                })}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Toggle */}
      <div className="flex justify-center">
        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)} className="w-auto">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Item Count Display */}
      {activities && activities.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount || 0)} of {totalCount || 0} activities
          </p>
        </div>
      )}

      {/* Content */}
      {activities && activities.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-4">
            <CalendarIcon className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-2xl font-semibold text-foreground">No activities yet</h3>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Start tracking your follow-ups and tasks
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        // List View
        <div className="space-y-4">
          {activities?.map((activity) => (
            <Card key={activity.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-semibold text-foreground">
                        {activity.title || "Untitled Activity"}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {activity.type.replace("-", " ")}
                        </Badge>
                      </div>
                    </div>
                    {activity.properties && (
                      <div className="flex items-start gap-2 px-3 py-2 bg-primary/5 rounded-md border border-primary/10 mb-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {activity.properties.address || "Unknown property"}
                          </p>
                          {activity.properties.city && (
                            <p className="text-xs text-muted-foreground">
                              {activity.properties.city}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {activity.body && (
                      <p className="text-base text-muted-foreground">
                        {activity.body}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {activity.assigned_to && (
                        <span>
                          👤 {getTeamMemberDisplayName(activity.assigned_to)}
                        </span>
                      )}
                      {activity.due_at && (
                        <span>📅 Due: {format(new Date(activity.due_at), "PPp")}</span>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      {activity.status !== 'done' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: activity.id, status: 'done' })}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark Done
                        </Button>
                      )}
                      {activity.status === 'done' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: activity.id, status: 'open' })}
                        >
                          Reopen
                        </Button>
                      )}
                      {activity.status !== 'snoozed' && activity.status !== 'done' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: activity.id, status: 'snoozed' })}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Snooze
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditActivity(activity)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCloneActivity(activity)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Clone
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Calendar View
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  hasActivity: (date) => {
                    const dateKey = format(date, "yyyy-MM-dd");
                    return !!activitiesByDate[dateKey]?.length;
                  },
                }}
                modifiersStyles={{
                  hasActivity: {
                    fontWeight: "bold",
                    backgroundColor: "hsl(var(--primary))",
                    color: "white",
                  },
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">
                {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
              </h3>
              {selectedDateActivities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No activities scheduled for this date
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {selectedDateActivities.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{activity.title}</h4>
                        <Badge className={getStatusColor(activity.status)} variant="outline">
                          {activity.status}
                        </Badge>
                      </div>
                      {activity.properties && (
                        <div className="flex items-start gap-2 px-2 py-1.5 bg-primary/5 rounded border border-primary/10 mb-2">
                          <MapPin className="h-3 w-3 mt-0.5 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {activity.properties.address || "Unknown"}
                            </p>
                            {activity.properties.city && (
                              <p className="text-xs text-muted-foreground">
                                {activity.properties.city}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {activity.body && (
                        <p className="text-sm text-muted-foreground mb-2">{activity.body}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                        <Badge variant="outline" className="capitalize">
                          {activity.type.replace("-", " ")}
                        </Badge>
                        {activity.assigned_to && (
                          <span>
                            👤 {getTeamMemberDisplayName(activity.assigned_to)}
                          </span>
                        )}
                        {activity.due_at && (
                          <span>⏰ {format(new Date(activity.due_at), "p")}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {activity.status !== 'done' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: activity.id, status: 'done' })}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Done
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditActivity(activity)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCloneActivity(activity)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Clone
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pagination Controls */}
      {activities && activities.length > 0 && viewMode === "list" && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => setItemsPerPage(parseInt(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground ml-2 sm:ml-4">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount || 0)} of {totalCount || 0} activities
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const totalPages = Math.ceil((totalCount || 0) / itemsPerPage);
                    const pages = [];
                    const showPages = 5; // Show 5 page numbers at a time
                    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                    const endPage = Math.min(totalPages, startPage + showPages - 1);
                    
                    if (endPage - startPage < showPages - 1) {
                      startPage = Math.max(1, endPage - showPages + 1);
                    }
                    
                    // Show first page and ellipsis if needed
                    if (startPage > 1) {
                      pages.push(
                        <Button
                          key={1}
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                        >
                          1
                        </Button>
                      );
                      if (startPage > 2) {
                        pages.push(<span key="ellipsis1" className="px-2">...</span>);
                      }
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(i)}
                        >
                          {i}
                        </Button>
                      );
                    }
                    
                    // Show ellipsis and last page if needed
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(<span key="ellipsis2" className="px-2">...</span>);
                      }
                      pages.push(
                        <Button
                          key={totalPages}
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      );
                    }
                    
                    return pages;
                  })()}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil((totalCount || 0) / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil((totalCount || 0) / itemsPerPage)}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.ceil((totalCount || 0) / itemsPerPage))}
                  disabled={currentPage >= Math.ceil((totalCount || 0) / itemsPerPage)}
                >
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
