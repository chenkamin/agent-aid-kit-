import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, DollarSign, MapPin, Home, Calendar, Ruler, Clock, Phone, Mail, FileText, Video, CheckCircle2, List, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Search, ChevronDown, ChevronUp, Download } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [editedProperty, setEditedProperty] = useState<any>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isBulkAddingActivity, setIsBulkAddingActivity] = useState(false);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: "other",
    title: "",
    body: "",
    due_at: "",
  });
  const [bulkActivityForm, setBulkActivityForm] = useState({
    type: "other",
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
  const [propertyForm, setPropertyForm] = useState<any>({
    address: "",
    city: "",
    state: "",
    zip: "",
    neighborhood: "",
    status: "For Sale",
    price: "",
    bedrooms: "",
    bathrooms: "",
    square_footage: "",
    year_built: "",
    home_type: "",
    description: "",
    notes: "",
  });
  const [filters, setFilters] = useState({
    status: "all",
    buyBoxId: "all",
    minPrice: "",
    maxPrice: "",
    minBedrooms: "",
    homeType: "all",
    workflowState: "all",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching properties:", error);
      }
      
      // Log the first property to see the structure
      if (data && data.length > 0) {
        console.log("📊 First property data structure:", data[0]);
        console.log("📍 Address field:", data[0].address);
        console.log("🏠 All address-related fields:", {
          address: data[0].address,
          city: data[0].city,
          state: data[0].state,
          zip: data[0].zip,
        });
      }
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch activities for selected property
  const { data: propertyActivities } = useQuery({
    queryKey: ["property-activities", selectedProperty?.id],
    queryFn: async () => {
      if (!selectedProperty?.id) return [];
      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("property_id", selectedProperty.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedProperty?.id,
  });

  // Query for buy boxes (lists) for filter dropdown
  const { data: buyBoxes } = useQuery({
    queryKey: ["buy_boxes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("buy_boxes")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Filter properties based on selected filters
  const filteredProperties = properties?.filter((property) => {
    // Filter by search query (addresses only)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const address = (property.address || "").toLowerCase();
      if (!address.includes(query)) {
        return false;
      }
    }

    // Filter by status
    if (filters.status !== "all" && property.status !== filters.status) {
      return false;
    }

    // Filter by buy box (list)
    if (filters.buyBoxId !== "all" && property.buy_box_id !== filters.buyBoxId) {
      return false;
    }

    // Filter by min price
    if (filters.minPrice && property.price && property.price < parseFloat(filters.minPrice)) {
      return false;
    }

    // Filter by max price
    if (filters.maxPrice && property.price && property.price > parseFloat(filters.maxPrice)) {
      return false;
    }

    // Filter by min bedrooms
    if (filters.minBedrooms && property.bedrooms && property.bedrooms < parseInt(filters.minBedrooms)) {
      return false;
    }

    // Filter by home type
    if (filters.homeType !== "all" && property.home_type !== filters.homeType) {
      return false;
    }

    // Filter by workflow state
    if (filters.workflowState !== "all" && property.workflow_state !== filters.workflowState) {
      return false;
    }

    return true;
  });

  // Sort properties
  const sortedProperties = filteredProperties ? [...filteredProperties].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;
    const aValue = a[key];
    const bValue = b[key];

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) return direction === 'asc' ? 1 : -1;
    if (bValue === null || bValue === undefined) return direction === 'asc' ? -1 : 1;

    // Compare values
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  }) : [];

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null; // Remove sort
    });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
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

  const getWorkflowStateIcon = (state: string) => {
    switch (state) {
      case 'Initial':
        return '🆕';
      case 'Reviewing':
        return '👀';
      case 'Research':
        return '🔍';
      case 'On Progress':
        return '⚡';
      case 'Follow Up':
        return '📞';
      case 'Negotiating':
        return '💬';
      case 'Under Contract':
        return '📝';
      case 'Closing':
        return '🏁';
      case 'Closed':
        return '✅';
      case 'Not Relevant':
        return '❌';
      case 'Archived':
        return '📦';
      default:
        return '🆕';
    }
  };

  const getWorkflowStateDescription = (state: string) => {
    switch (state) {
      case 'Initial':
        return 'New property, not yet reviewed';
      case 'Reviewing':
        return 'Currently under review';
      case 'Research':
        return 'Researching property details and comps';
      case 'On Progress':
        return 'Actively working on this deal';
      case 'Follow Up':
        return 'Waiting for response or next steps';
      case 'Negotiating':
        return 'In negotiation with seller/agent';
      case 'Under Contract':
        return 'Offer accepted, under contract';
      case 'Closing':
        return 'Final steps before closing';
      case 'Closed':
        return 'Deal successfully closed';
      case 'Not Relevant':
        return 'Property does not meet criteria';
      case 'Archived':
        return 'Archived for future reference';
      default:
        return 'New property, not yet reviewed';
    }
  };

  const exportToCSV = () => {
    if (!sortedProperties || sortedProperties.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no properties matching your filters.",
        variant: "destructive",
      });
      return;
    }

    // Define CSV headers - ALL fields from properties table
    const headers = [
      "ID",
      "Created At",
      "Updated At",
      "Address",
      "City",
      "State",
      "Zip",
      "Neighborhood",
      "Price",
      "Bedrooms",
      "Bed",
      "Bathrooms",
      "Bath",
      "Full Bath",
      "Square Footage",
      "Living Sqf",
      "Building Sqf",
      "Above Ground Sqf",
      "Basement",
      "Finished Basement",
      "Basement Sqf",
      "Lot Size",
      "Lot Sqf",
      "Year Built",
      "Home Type",
      "Home Sub Type",
      "Property Type",
      "Price Per Sqft",
      "PPSF",
      "Status",
      "Initial Status",
      "Sub Status",
      "Source",
      "Sub Source",
      "Source Contact Details",
      "Listing URL",
      "URL",
      "MLS Number",
      "Description",
      "Agent Notes",
      "Date Listed",
      "Days on Market",
      "Last Sold Date",
      "Previous Sold Date",
      "Last Sold Price",
      "Previous Sold Price",
      "Offer",
      "Deal",
      "Seller Agent Name",
      "Seller Agent Email",
      "Seller Agent Phone",
      "Owner",
      "Owner Properties",
      "Client Email",
      "Rentometer Monthly Rent",
      "Linked Comp 1",
      "Linked Comp 2",
      "Linked Comp 3",
      "Linked Comp 4",
      "Linked Comp 5",
      "Notes",
      "Tags",
      "ARV Estimate",
      "User ID",
      "Buy Box ID",
      "Last Scraped At",
      "Is New Listing",
      "Listing Discovered At",
      "Workflow State"
    ];

    // Convert properties to CSV rows with ALL fields
    const rows = sortedProperties.map(prop => [
      prop.id || '',
      prop.created_at ? format(new Date(prop.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
      prop.updated_at ? format(new Date(prop.updated_at), 'yyyy-MM-dd HH:mm:ss') : '',
      prop.address || '',
      prop.city || '',
      prop.state || '',
      prop.zip || '',
      prop.neighborhood || '',
      prop.price || '',
      prop.bedrooms || '',
      prop.bed || '',
      prop.bathrooms || '',
      prop.bath || '',
      prop.full_bath || '',
      prop.square_footage || '',
      prop.living_sqf || '',
      prop.building_sqf || '',
      prop.above_ground_sqf || '',
      prop.basement || '',
      prop.finished_basement || '',
      prop.basement_sqf || '',
      prop.lot_size || '',
      prop.lot_sqf || '',
      prop.year_built || '',
      prop.home_type || '',
      prop.home_sub_type || '',
      prop.property_type || '',
      prop.price_per_sqft || '',
      prop.ppsf || '',
      prop.status || '',
      prop.initial_status || '',
      prop.sub_status || '',
      prop.source || '',
      prop.sub_source || '',
      prop.source_contact_details || '',
      prop.listing_url || '',
      prop.url || '',
      prop.mls_number || '',
      prop.description || '',
      prop.agent_notes || '',
      prop.date_listed || '',
      prop.days_on_market || '',
      prop.last_sold_date || '',
      prop.previous_sold_date || '',
      prop.last_sold_price || '',
      prop.previous_sold_price || '',
      prop.offer ? JSON.stringify(prop.offer) : '',
      prop.deal ? JSON.stringify(prop.deal) : '',
      prop.seller_agent_name || '',
      prop.seller_agent_email || '',
      prop.seller_agent_phone || '',
      prop.owner || '',
      prop.owner_properties || '',
      prop.client_email || '',
      prop.rentometer_monthly_rent || '',
      prop.linked_comp_1 || '',
      prop.linked_comp_2 || '',
      prop.linked_comp_3 || '',
      prop.linked_comp_4 || '',
      prop.linked_comp_5 || '',
      prop.notes || '',
      prop.tags ? (Array.isArray(prop.tags) ? prop.tags.join('; ') : prop.tags) : '',
      prop.arv_estimate || '',
      prop.user_id || '',
      prop.buy_box_id || '',
      prop.last_scraped_at ? format(new Date(prop.last_scraped_at), 'yyyy-MM-dd HH:mm:ss') : '',
      prop.is_new_listing || '',
      prop.listing_discovered_at ? format(new Date(prop.listing_discovered_at), 'yyyy-MM-dd HH:mm:ss') : '',
      prop.workflow_state || ''
    ]);

    // Escape and quote CSV fields
    const escapeCSVField = (field: any) => {
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV content
    const csvContent = [
      headers.map(escapeCSVField).join(','),
      ...rows.map(row => row.map(escapeCSVField).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
    link.setAttribute('href', url);
    link.setAttribute('download', `properties-export-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${sortedProperties.length} ${sortedProperties.length === 1 ? 'property' : 'properties'} with all fields to CSV`,
    });
  };

  const getPropertyDisplayName = (property: any) => {
    // Check if address exists and is not empty
    if (property?.address && property.address.trim() !== "") {
      return property.address;
    }
    
    // Fallback: try to construct from city/state
    if (property?.city || property?.state) {
      const parts = [property.city, property.state].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
    
    // Last resort
    return "Untitled Property";
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
      
      // Prepare activity data - exclude due_at if empty
      const activityData: any = {
        type: data.type,
        title: data.title,
        body: data.body,
        property_id: selectedProperty?.id,
        user_id: user.id,
        status: 'open',
      };
      
      // Only include due_at if it's provided and not empty
      if (data.due_at && data.due_at.trim() !== '') {
        activityData.due_at = data.due_at;
      }
      
      const { error } = await supabase.from("activities").insert([activityData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });
      toast({
        title: "Activity added",
        description: "The activity has been added successfully.",
      });
      setIsAddingActivity(false);
      setActivityForm({ type: "other", title: "", body: "", due_at: "" });
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

  const bulkAddActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (selectedPropertyIds.length === 0) throw new Error("No properties selected");
      
      // Prepare activity data for each property
      const activities = selectedPropertyIds.map(propertyId => {
        const activityData: any = {
          type: data.type,
          title: data.title,
          body: data.body,
          property_id: propertyId,
          user_id: user.id,
          status: 'open',
        };
        
        // Only include due_at if it's provided and not empty
        if (data.due_at && data.due_at.trim() !== '') {
          activityData.due_at = data.due_at;
        }
        
        return activityData;
      });
      
      const { error } = await supabase.from("activities").insert(activities);
      if (error) throw error;
      return activities.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast({
        title: "Activities created",
        description: `Created ${count} ${count === 1 ? 'activity' : 'activities'} for ${count} ${count === 1 ? 'property' : 'properties'}`,
      });
      setIsBulkAddingActivity(false);
      setBulkActivityForm({
        type: "other",
        title: "",
        body: "",
        due_at: "",
      });
      setSelectedPropertyIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create activities",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBulkAddActivity = () => {
    if (!bulkActivityForm.title) {
      toast({
        title: "Error",
        description: "Please enter a title for the activity",
        variant: "destructive",
      });
      return;
    }
    bulkAddActivityMutation.mutate(bulkActivityForm);
  };

  const createListMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data: newList, error } = await supabase.from("buy_boxes").insert([{
        user_id: user.id,
        name: data.name,
        zip_codes: data.zipCodes,
        price_max: data.priceMax ? parseFloat(data.priceMax) : null,
        days_on_zillow: data.daysOnZillow ? parseInt(data.daysOnZillow) : null,
        for_sale_by_agent: data.forSaleByAgent,
        for_sale_by_owner: data.forSaleByOwner,
        for_rent: data.forRent,
      }]).select().single();
      
      if (error) throw error;
      return newList;
    },
    onSuccess: async (newList) => {
      queryClient.invalidateQueries({ queryKey: ["buy_boxes", user?.id] });
      
      toast({
        title: "List created",
        description: "Starting to scrape properties from Zillow...",
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
      
      // Automatically trigger scraping
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const response = await fetch(
          `https://ijgrelgzahireresdqvw.supabase.co/functions/v1/scrape-zillow`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ buyBoxId: newList.id }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to scrape properties");
        }

        const result = await response.json();
        queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });
        
        toast({
          title: "Scraping completed!",
          description: `Found and saved ${result.count} properties`,
        });
      } catch (error: any) {
        toast({
          title: "Scraping failed",
          description: error.message || "An error occurred during scraping",
          variant: "destructive",
        });
      }
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

  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { error } = await supabase.from("properties").insert([{
        ...data,
        user_id: user.id,
        price: data.price ? parseFloat(data.price) : null,
        bedrooms: data.bedrooms ? parseInt(data.bedrooms) : null,
        bathrooms: data.bathrooms ? parseFloat(data.bathrooms) : null,
        square_footage: data.square_footage ? parseInt(data.square_footage) : null,
        year_built: data.year_built ? parseInt(data.year_built) : null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });
      toast({
        title: "Property added",
        description: "The property has been added successfully.",
      });
      setIsAddingProperty(false);
      setPropertyForm({
        address: "",
        city: "",
        state: "",
        zip: "",
        neighborhood: "",
        status: "For Sale",
        price: "",
        bedrooms: "",
        bathrooms: "",
        square_footage: "",
        year_built: "",
        home_type: "",
        description: "",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to add property: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddProperty = () => {
    if (!propertyForm.address) {
      toast({
        title: "Error",
        description: "Please enter an address for the property",
        variant: "destructive",
      });
      return;
    }
    createPropertyMutation.mutate(propertyForm);
  };

  // Bulk update workflow state mutation
  const bulkUpdateWorkflowMutation = useMutation({
    mutationFn: async ({ propertyIds, workflowState }: { propertyIds: string[]; workflowState: string }) => {
      const updates = propertyIds.map(id => 
        supabase
          .from('properties')
          .update({ workflow_state: workflowState })
          .eq('id', id)
      );
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} properties`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });
      toast({
        title: "Success",
        description: `Updated ${variables.propertyIds.length} properties to "${variables.workflowState}"`,
      });
      setSelectedPropertyIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update properties",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPropertyIds(sortedProperties?.map(p => p.id) || []);
    } else {
      setSelectedPropertyIds([]);
    }
  };

  const handleSelectProperty = (propertyId: string, checked: boolean) => {
    if (checked) {
      setSelectedPropertyIds(prev => [...prev, propertyId]);
    } else {
      setSelectedPropertyIds(prev => prev.filter(id => id !== propertyId));
    }
  };

  const handleBulkWorkflowUpdate = (workflowState: string) => {
    if (selectedPropertyIds.length === 0) {
      toast({
        title: "No properties selected",
        description: "Please select properties to update",
        variant: "destructive",
      });
      return;
    }
    bulkUpdateWorkflowMutation.mutate({ propertyIds: selectedPropertyIds, workflowState });
  };

  // Update property mutation
  const updatePropertyMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      if (!selectedProperty?.id) throw new Error("No property selected");
      
      const { error } = await supabase
        .from('properties')
        .update(updatedData)
        .eq('id', selectedProperty.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
      setEditedProperty(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const handleSaveProperty = () => {
    if (editedProperty) {
      // Remove computed/generated columns that cannot be updated
      const { price_per_sqft, ppsf, created_at, updated_at, ...updateData } = editedProperty;
      
      updatePropertyMutation.mutate(updateData);
      // Update local state immediately for better UX
      setSelectedProperty((prev: any) => ({ ...prev, ...editedProperty }));
    }
  };

  const handlePropertyFieldChange = (field: string, value: any) => {
    setEditedProperty((prev: any) => ({
      ...prev,
      [field]: value,
    }));
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

          <Dialog open={isAddingProperty} onOpenChange={setIsAddingProperty}>
            <DialogTrigger asChild>
          <Button size="lg" className="text-base">
            <Plus className="mr-2 h-5 w-5" />
            Add Property
          </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="add-property-description">
              <DialogHeader>
                <DialogTitle>Add New Property</DialogTitle>
                <p id="add-property-description" className="text-sm text-muted-foreground">
                  Enter the property details below
                </p>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="property-address">Address *</Label>
                    <Input
                      id="property-address"
                      value={propertyForm.address}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main St"
                    />
      </div>

                  <div className="space-y-2">
                    <Label htmlFor="property-city">City</Label>
                    <Input
                      id="property-city"
                      value={propertyForm.city}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, city: e.target.value }))}
                      placeholder="Cleveland"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property-state">State</Label>
                    <Input
                      id="property-state"
                      value={propertyForm.state}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, state: e.target.value }))}
                      placeholder="OH"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property-zip">ZIP Code</Label>
                    <Input
                      id="property-zip"
                      value={propertyForm.zip}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, zip: e.target.value }))}
                      placeholder="44125"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property-neighborhood">Neighborhood</Label>
                    <Input
                      id="property-neighborhood"
                      value={propertyForm.neighborhood}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, neighborhood: e.target.value }))}
                      placeholder="Downtown"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property-status">Status</Label>
                    <Select
                      value={propertyForm.status}
                      onValueChange={(value) => setPropertyForm((prev: any) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="For Sale">For Sale</SelectItem>
                        <SelectItem value="Under Contract">Under Contract</SelectItem>
                        <SelectItem value="Sold">Sold</SelectItem>
                        <SelectItem value="Off Market">Off Market</SelectItem>
                        <SelectItem value="Tracking">Tracking</SelectItem>
                        <SelectItem value="Follow Up">Follow Up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property-home-type">Home Type</Label>
                    <Select
                      value={propertyForm.home_type}
                      onValueChange={(value) => setPropertyForm((prev: any) => ({ ...prev, home_type: value }))}
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
                    <Label htmlFor="property-price">Price</Label>
                    <Input
                      id="property-price"
                      type="number"
                      value={propertyForm.price}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, price: e.target.value }))}
                      placeholder="200000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property-bedrooms">Bedrooms</Label>
                    <Input
                      id="property-bedrooms"
                      type="number"
                      value={propertyForm.bedrooms}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, bedrooms: e.target.value }))}
                      placeholder="3"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property-bathrooms">Bathrooms</Label>
                    <Input
                      id="property-bathrooms"
                      type="number"
                      step="0.5"
                      value={propertyForm.bathrooms}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, bathrooms: e.target.value }))}
                      placeholder="2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property-sqft">Square Footage</Label>
                    <Input
                      id="property-sqft"
                      type="number"
                      value={propertyForm.square_footage}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, square_footage: e.target.value }))}
                      placeholder="1500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property-year">Year Built</Label>
                    <Input
                      id="property-year"
                      type="number"
                      value={propertyForm.year_built}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, year_built: e.target.value }))}
                      placeholder="2000"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="property-description">Description</Label>
                    <Textarea
                      id="property-description"
                      value={propertyForm.description}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, description: e.target.value }))}
                      placeholder="Property description..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="property-notes">Notes</Label>
                    <Textarea
                      id="property-notes"
                      value={propertyForm.notes}
                      onChange={(e) => setPropertyForm((prev: any) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Internal notes..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsAddingProperty(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddProperty} disabled={createPropertyMutation.isPending}>
                    {createPropertyMutation.isPending ? "Adding..." : "Add Property"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar and Filter Toggle */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={exportToCSV}
          disabled={!sortedProperties || sortedProperties.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Hide Filters
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Show Filters
            </>
          )}
        </Button>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedPropertyIds.length > 0 && (
        <Card className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'property' : 'properties'} selected
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPropertyIds([])}
                  className="text-blue-700 dark:text-blue-300"
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setIsBulkAddingActivity(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
                <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Change Workflow Stage:
                </Label>
                <Select
                  value=""
                  onValueChange={handleBulkWorkflowUpdate}
                  disabled={bulkUpdateWorkflowMutation.isPending}
                >
                  <SelectTrigger className="w-[200px] bg-white dark:bg-gray-950">
                    <SelectValue placeholder="Select stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Initial">🆕 Initial</SelectItem>
                    <SelectItem value="Reviewing">👀 Reviewing</SelectItem>
                    <SelectItem value="Research">🔍 Research</SelectItem>
                    <SelectItem value="On Progress">⚡ On Progress</SelectItem>
                    <SelectItem value="Follow Up">📞 Follow Up</SelectItem>
                    <SelectItem value="Negotiating">💬 Negotiating</SelectItem>
                    <SelectItem value="Under Contract">📝 Under Contract</SelectItem>
                    <SelectItem value="Closing">🏁 Closing</SelectItem>
                    <SelectItem value="Closed">✅ Closed</SelectItem>
                    <SelectItem value="Not Relevant">❌ Not Relevant</SelectItem>
                    <SelectItem value="Archived">📦 Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Section - Collapsible */}
      {showFilters && (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
            <div className="space-y-2">
              <Label htmlFor="filter-status" className="text-sm font-medium">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="For Sale">For Sale</SelectItem>
                  <SelectItem value="Under Contract">Under Contract</SelectItem>
                  <SelectItem value="Sold">Sold</SelectItem>
                  <SelectItem value="Off Market">Off Market</SelectItem>
                  <SelectItem value="Tracking">Tracking</SelectItem>
                  <SelectItem value="Follow Up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-workflow" className="text-sm font-medium">Workflow Stage</Label>
              <Select
                value={filters.workflowState}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, workflowState: value }))}
              >
                <SelectTrigger id="filter-workflow">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="Initial">🆕 Initial</SelectItem>
                  <SelectItem value="Reviewing">👀 Reviewing</SelectItem>
                  <SelectItem value="Research">🔍 Research</SelectItem>
                  <SelectItem value="On Progress">⚡ On Progress</SelectItem>
                  <SelectItem value="Follow Up">📞 Follow Up</SelectItem>
                  <SelectItem value="Negotiating">💬 Negotiating</SelectItem>
                  <SelectItem value="Under Contract">📝 Under Contract</SelectItem>
                  <SelectItem value="Closing">🏁 Closing</SelectItem>
                  <SelectItem value="Closed">✅ Closed</SelectItem>
                  <SelectItem value="Not Relevant">❌ Not Relevant</SelectItem>
                  <SelectItem value="Archived">📦 Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-list" className="text-sm font-medium">Buy Box</Label>
              <Select
                value={filters.buyBoxId}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, buyBoxId: value }))}
              >
                <SelectTrigger id="filter-list">
                  <SelectValue placeholder="All Buy Boxes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buy Boxes</SelectItem>
                  {buyBoxes?.map((box) => (
                    <SelectItem key={box.id} value={box.id}>
                      {box.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-min-price" className="text-sm font-medium">Min Price</Label>
              <Input
                id="filter-min-price"
                type="number"
                placeholder="$0"
                value={filters.minPrice}
                onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-max-price" className="text-sm font-medium">Max Price</Label>
              <Input
                id="filter-max-price"
                type="number"
                placeholder="Any"
                value={filters.maxPrice}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-bedrooms" className="text-sm font-medium">Min Beds</Label>
              <Input
                id="filter-bedrooms"
                type="number"
                placeholder="Any"
                value={filters.minBedrooms}
                onChange={(e) => setFilters((prev) => ({ ...prev, minBedrooms: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-home-type" className="text-sm font-medium">Home Type</Label>
              <Select
                value={filters.homeType}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, homeType: value }))}
              >
                <SelectTrigger id="filter-home-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Single Family">Single Family</SelectItem>
                  <SelectItem value="Multi Family">Multi Family</SelectItem>
                  <SelectItem value="Condo">Condo</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Land">Land</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {sortedProperties?.length || 0} of {properties?.length || 0} properties
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({
                status: "all",
                buyBoxId: "all",
                minPrice: "",
                maxPrice: "",
                minBedrooms: "",
                homeType: "all",
                workflowState: "all",
              })}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {sortedProperties && sortedProperties.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-4">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-2xl font-semibold text-foreground">
              {properties && properties.length > 0 ? "No properties match your filters" : "No properties yet"}
            </h3>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              {properties && properties.length > 0 
                ? "Try adjusting your filters to see more properties"
                : "Start building your portfolio by creating a new list"}
            </p>
            {properties && properties.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setFilters({
                  status: "all",
                  buyBoxId: "all",
                  minPrice: "",
                  maxPrice: "",
                  minBedrooms: "",
                  homeType: "all",
                  workflowState: "all",
                })}
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedPropertyIds.length === sortedProperties?.length && sortedProperties?.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('address')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      Address & Details
                      {getSortIcon('address')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('status')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      Status
                      {getSortIcon('status')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('price')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      Price
                      {getSortIcon('price')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('arv_estimate')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      ARV
                      {getSortIcon('arv_estimate')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('workflow_state')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      State
                      {getSortIcon('workflow_state')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('city')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      City
                      {getSortIcon('city')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('living_sqf')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      Sq/Ft
                      {getSortIcon('living_sqf')}
                    </Button>
                  </TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('created_at')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      Listing Date
                      {getSortIcon('created_at')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('bedrooms')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      Beds
                      {getSortIcon('bedrooms')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('bathrooms')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      Baths
                      {getSortIcon('bathrooms')}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProperties?.map((property) => {
                const nextFollowUp = getNextFollowUp(property);
                return (
                    <TableRow
                    key={property.id}
                    onClick={() => {
                      setSelectedProperty(property);
                      setEditedProperty({ ...property });
                    }}
                      className="cursor-pointer hover:bg-accent/50"
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedPropertyIds.includes(property.id)}
                          onCheckedChange={(checked) => handleSelectProperty(property.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{getPropertyDisplayName(property)}</div>
                            {property.is_new_listing && (
                              <Badge className="bg-green-500 text-white hover:bg-green-600 mt-1">NEW</Badge>
                            )}
                        </div>
                    </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Badge className={getStatusColor(property.status)}>
                                    {property.status || 'For Sale'}
                                  </Badge>
                          </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {property.status === 'For Sale' && 'Property is currently listed for sale'}
                                  {property.status === 'Under Contract' && 'Offer accepted, pending closing'}
                                  {property.status === 'Sold' && 'Property sale completed'}
                                  {property.status === 'Off Market' && 'Property not currently listed'}
                                  {property.status === 'Pending' && 'Sale in process'}
                                  {!property.status && 'Property is currently listed for sale'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            {property.listing_url && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={property.listing_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">View on Zillow</p>
                                </TooltipContent>
                              </Tooltip>
                          )}
                        </div>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {property.price ? `$${Number(property.price).toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                {property.arv_estimate ? (
                                  <Badge variant="secondary" className="font-semibold bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                                    ${Number(property.arv_estimate).toLocaleString()}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Estimating...</span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">
                                {property.arv_estimate 
                                  ? `After Repair Value: AI-estimated value after repairs and improvements`
                                  : `ARV estimation in progress. Check back in a few moments.`}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help flex items-center gap-1">
                                <span className="text-base">{getWorkflowStateIcon(property.workflow_state || 'Initial')}</span>
                                <Badge variant="outline" className="font-medium">
                                  {property.workflow_state || 'Initial'}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">
                                {getWorkflowStateDescription(property.workflow_state || 'Initial')}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{property.city || '-'}</TableCell>
                      <TableCell>
                        {property.living_sqf ? Number(property.living_sqf).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        {property.source === 'Zillow' ? (
                          <span className="text-blue-600 font-medium">Zillow</span>
                        ) : property.source || 'Euclid'}
                      </TableCell>
                      <TableCell>
                        {property.created_at ? format(new Date(property.created_at), 'MM/dd/yyyy') : '-'}
                      </TableCell>
                      <TableCell>{property.bedrooms || '-'}</TableCell>
                      <TableCell>{property.bathrooms || '-'}</TableCell>
                    </TableRow>
                );
              })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedProperty} onOpenChange={(open) => {
        if (!open) {
          setSelectedProperty(null);
          setEditedProperty(null);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto" aria-describedby="property-details-description">
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
            <>
              {/* Workflow Status - Always Visible at Top */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-800 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label htmlFor="workflow-state" className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2 block">
                      📊 Workflow Stage
                    </Label>
                    <Select
                      value={selectedProperty.workflow_state || 'Initial'}
                      onValueChange={async (value) => {
                        const oldState = selectedProperty.workflow_state;
                        const { error } = await supabase
                          .from('properties')
                          .update({ workflow_state: value })
                          .eq('id', selectedProperty.id);
                        
                        if (error) {
                          toast({
                            title: "Error",
                            description: "Failed to update workflow state",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Record workflow change
                        await supabase.from('property_workflow_history').insert({
                          property_id: selectedProperty.id,
                          user_id: user?.id,
                          from_state: oldState || 'Initial',
                          to_state: value,
                        });

                        // Update local state
                        setSelectedProperty((prev: any) => ({
                          ...prev,
                          workflow_state: value,
                        }));

                        queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });

                        toast({
                          title: "✅ Workflow updated",
                          description: `Property moved to ${value}`,
                        });
                      }}
                    >
                      <SelectTrigger id="workflow-state" className="bg-white dark:bg-gray-900 border-2 h-11 text-base font-medium">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Initial">🆕 Initial</SelectItem>
                        <SelectItem value="Reviewing">👀 Reviewing</SelectItem>
                        <SelectItem value="Research">🔍 Research</SelectItem>
                        <SelectItem value="On Progress">⚡ On Progress</SelectItem>
                        <SelectItem value="Follow Up">📞 Follow Up</SelectItem>
                        <SelectItem value="Negotiating">💬 Negotiating</SelectItem>
                        <SelectItem value="Under Contract">📝 Under Contract</SelectItem>
                        <SelectItem value="Closing">🏁 Closing</SelectItem>
                        <SelectItem value="Closed">✅ Closed</SelectItem>
                        <SelectItem value="Not Relevant">❌ Not Relevant</SelectItem>
                        <SelectItem value="Archived">📦 Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 max-w-xs">
                    Track this property through your investment pipeline from initial review to closing
                  </div>
                </div>
              </div>

            <Tabs defaultValue="general" className="mt-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="general">
                  <Home className="h-4 w-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="listing">
                  <Calendar className="h-4 w-4 mr-2" />
                  Listing
                </TabsTrigger>
                <TabsTrigger value="financial">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Financial
                </TabsTrigger>
                <TabsTrigger value="details">
                  <Building2 className="h-4 w-4 mr-2" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Clock className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
                <TabsTrigger value="comps">
                  <Ruler className="h-4 w-4 mr-2" />
                  Comps
                </TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                {/* Save Button */}
                <div className="flex justify-end gap-2 pb-4 border-b">
                  <Button
                    variant="outline"
                    onClick={() => setEditedProperty({ ...selectedProperty })}
                    disabled={!editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                  >
                    Reset Changes
                  </Button>
                  <Button
                    onClick={handleSaveProperty}
                    disabled={updatePropertyMutation.isPending || !editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                  >
                    {updatePropertyMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Financial Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Price</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={editedProperty?.price || ''}
                      onChange={(e) => handlePropertyFieldChange('price', parseFloat(e.target.value) || null)}
                      placeholder="Enter price"
                    />
                      </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-arv">ARV Estimate</Label>
                    <Input
                      id="edit-arv"
                      type="number"
                      value={editedProperty?.arv_estimate || ''}
                      onChange={(e) => handlePropertyFieldChange('arv_estimate', parseFloat(e.target.value) || null)}
                      placeholder="Enter ARV estimate"
                    />
                      </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-mls">MLS Number</Label>
                    <Input
                      id="edit-mls"
                      value={editedProperty?.mls_number || ''}
                      onChange={(e) => handlePropertyFieldChange('mls_number', e.target.value)}
                      placeholder="Enter MLS number"
                    />
                    </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Property Details</h3>

                  <div className="space-y-2">
                    <Label htmlFor="edit-bedrooms">Bedrooms</Label>
                    <Input
                      id="edit-bedrooms"
                      type="number"
                      value={editedProperty?.bedrooms || ''}
                      onChange={(e) => handlePropertyFieldChange('bedrooms', parseInt(e.target.value) || null)}
                      placeholder="Enter bedrooms"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-bathrooms">Bathrooms</Label>
                    <Input
                      id="edit-bathrooms"
                      type="number"
                      step="0.5"
                      value={editedProperty?.bathrooms || ''}
                      onChange={(e) => handlePropertyFieldChange('bathrooms', parseFloat(e.target.value) || null)}
                      placeholder="Enter bathrooms"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-sqft">Square Footage</Label>
                    <Input
                      id="edit-sqft"
                      type="number"
                      value={editedProperty?.square_footage || ''}
                      onChange={(e) => handlePropertyFieldChange('square_footage', parseInt(e.target.value) || null)}
                      placeholder="Enter square footage"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-lot-size">Lot Size</Label>
                    <Input
                      id="edit-lot-size"
                      value={editedProperty?.lot_size || ''}
                      onChange={(e) => handlePropertyFieldChange('lot_size', e.target.value)}
                      placeholder="Enter lot size"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-year-built">Year Built</Label>
                    <Input
                      id="edit-year-built"
                      type="number"
                      value={editedProperty?.year_built || ''}
                      onChange={(e) => handlePropertyFieldChange('year_built', parseInt(e.target.value) || null)}
                      placeholder="Enter year built"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-home-type">Home Type</Label>
                    <Select
                      value={editedProperty?.home_type || ''}
                      onValueChange={(value) => handlePropertyFieldChange('home_type', value)}
                    >
                      <SelectTrigger id="edit-home-type">
                        <SelectValue placeholder="Select home type" />
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
                    <Label htmlFor="edit-neighborhood">Neighborhood</Label>
                    <Input
                      id="edit-neighborhood"
                      value={editedProperty?.neighborhood || ''}
                      onChange={(e) => handlePropertyFieldChange('neighborhood', e.target.value)}
                      placeholder="Enter neighborhood"
                    />
                    </div>
                </div>
              </div>

              {selectedProperty.description && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editedProperty?.description || ''}
                      onChange={(e) => handlePropertyFieldChange('description', e.target.value)}
                      placeholder="Property description"
                      rows={4}
                    />
                </div>
              )}

              {selectedProperty.notes && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      value={editedProperty?.notes || ''}
                      onChange={(e) => handlePropertyFieldChange('notes', e.target.value)}
                      placeholder="Internal notes"
                      rows={3}
                    />
                </div>
              )}
            </TabsContent>

              {/* Listing Tab */}
              <TabsContent value="listing" className="space-y-4 mt-4">
                {/* Save Button */}
                <div className="flex justify-end gap-2 pb-4 border-b">
                  <Button
                    variant="outline"
                    onClick={() => setEditedProperty({ ...selectedProperty })}
                    disabled={!editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                  >
                    Reset Changes
                  </Button>
                  <Button
                    onClick={handleSaveProperty}
                    disabled={updatePropertyMutation.isPending || !editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                  >
                    {updatePropertyMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                    </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-agent-name">Agent Name</Label>
                    <Input
                      id="edit-agent-name"
                      value={editedProperty?.seller_agent_name || ''}
                      onChange={(e) => handlePropertyFieldChange('seller_agent_name', e.target.value)}
                      placeholder="Enter agent name"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-agent-phone">Agent Phone</Label>
                    <Input
                      id="edit-agent-phone"
                      value={editedProperty?.seller_agent_phone || ''}
                      onChange={(e) => handlePropertyFieldChange('seller_agent_phone', e.target.value)}
                      placeholder="Enter agent phone"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-agent-email">Agent Email</Label>
                    <Input
                      id="edit-agent-email"
                      type="email"
                      value={editedProperty?.seller_agent_email || ''}
                      onChange={(e) => handlePropertyFieldChange('seller_agent_email', e.target.value)}
                      placeholder="Enter agent email"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-listing-url">Listing URL</Label>
                    <Input
                      id="edit-listing-url"
                      value={editedProperty?.listing_url || ''}
                      onChange={(e) => handlePropertyFieldChange('listing_url', e.target.value)}
                      placeholder="Enter listing URL"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-days-market">Days on Market</Label>
                    <Input
                      id="edit-days-market"
                      type="number"
                      value={editedProperty?.days_on_market || ''}
                      onChange={(e) => handlePropertyFieldChange('days_on_market', parseInt(e.target.value) || null)}
                      placeholder="Enter days on market"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-date-listed">Date Listed</Label>
                    <Input
                      id="edit-date-listed"
                      type="date"
                      value={editedProperty?.date_listed || ''}
                      onChange={(e) => handlePropertyFieldChange('date_listed', e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-4 mt-4">
                {/* Save Button */}
                <div className="flex justify-end gap-2 pb-4 border-b">
                  <Button
                    variant="outline"
                    onClick={() => setEditedProperty({ ...selectedProperty })}
                    disabled={!editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                  >
                    Reset Changes
                  </Button>
                  <Button
                    onClick={handleSaveProperty}
                    disabled={updatePropertyMutation.isPending || !editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                  >
                    {updatePropertyMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                      </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price-financial">Price</Label>
                    <Input
                      id="edit-price-financial"
                      type="number"
                      value={editedProperty?.price || ''}
                      onChange={(e) => handlePropertyFieldChange('price', parseFloat(e.target.value) || null)}
                      placeholder="Enter price"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-arv-financial">ARV Estimate</Label>
                    <Input
                      id="edit-arv-financial"
                      type="number"
                      value={editedProperty?.arv_estimate || ''}
                      onChange={(e) => handlePropertyFieldChange('arv_estimate', parseFloat(e.target.value) || null)}
                      placeholder="Enter ARV estimate"
                    />
                      </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-rent">Est. Monthly Rent</Label>
                    <Input
                      id="edit-rent"
                      type="number"
                      value={editedProperty?.rentometer_monthly_rent || ''}
                      onChange={(e) => handlePropertyFieldChange('rentometer_monthly_rent', parseFloat(e.target.value) || null)}
                      placeholder="Enter monthly rent"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-last-sold-price">Last Sold Price</Label>
                    <Input
                      id="edit-last-sold-price"
                      type="number"
                      value={editedProperty?.last_sold_price || ''}
                      onChange={(e) => handlePropertyFieldChange('last_sold_price', parseFloat(e.target.value) || null)}
                      placeholder="Enter last sold price"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-last-sold-date">Last Sold Date</Label>
                    <Input
                      id="edit-last-sold-date"
                      type="date"
                      value={editedProperty?.last_sold_date || ''}
                      onChange={(e) => handlePropertyFieldChange('last_sold_date', e.target.value)}
                    />
                      </div>
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Save Button */}
                <div className="flex justify-end gap-2 pb-4 border-b">
                  <Button
                    variant="outline"
                    onClick={() => setEditedProperty({ ...selectedProperty })}
                    disabled={!editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                  >
                    Reset Changes
                  </Button>
                  <Button
                    onClick={handleSaveProperty}
                    disabled={updatePropertyMutation.isPending || !editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                  >
                    {updatePropertyMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                    </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-living-sqf">Living Sq Ft</Label>
                    <Input
                      id="edit-living-sqf"
                      type="number"
                      value={editedProperty?.living_sqf || ''}
                      onChange={(e) => handlePropertyFieldChange('living_sqf', parseInt(e.target.value) || null)}
                      placeholder="Enter living square footage"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-building-sqf">Building Sq Ft</Label>
                    <Input
                      id="edit-building-sqf"
                      type="number"
                      value={editedProperty?.building_sqf || ''}
                      onChange={(e) => handlePropertyFieldChange('building_sqf', parseInt(e.target.value) || null)}
                      placeholder="Enter building square footage"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-lot-sqf">Lot Sq Ft</Label>
                    <Input
                      id="edit-lot-sqf"
                      type="number"
                      value={editedProperty?.lot_sqf || ''}
                      onChange={(e) => handlePropertyFieldChange('lot_sqf', parseInt(e.target.value) || null)}
                      placeholder="Enter lot square footage"
                    />
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-full-bath">Full Baths</Label>
                    <Input
                      id="edit-full-bath"
                      type="number"
                      value={editedProperty?.full_bath || ''}
                      onChange={(e) => handlePropertyFieldChange('full_bath', parseInt(e.target.value) || null)}
                      placeholder="Enter full baths"
                    />
                    </div>

                  <div className="flex items-center space-x-2 pt-4">
                    <Checkbox
                      id="edit-basement"
                      checked={editedProperty?.basement || false}
                      onCheckedChange={(checked) => handlePropertyFieldChange('basement', checked)}
                    />
                    <Label htmlFor="edit-basement" className="cursor-pointer">Has Basement</Label>
                    </div>

                  <div className="flex items-center space-x-2 pt-4">
                    <Checkbox
                      id="edit-finished-basement"
                      checked={editedProperty?.finished_basement || false}
                      onCheckedChange={(checked) => handlePropertyFieldChange('finished_basement', checked)}
                    />
                    <Label htmlFor="edit-finished-basement" className="cursor-pointer">Finished Basement</Label>
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-basement-sqf">Basement Sq Ft</Label>
                    <Input
                      id="edit-basement-sqf"
                      type="number"
                      value={editedProperty?.basement_sqf || ''}
                      onChange={(e) => handlePropertyFieldChange('basement_sqf', parseInt(e.target.value) || null)}
                      placeholder="Enter basement square footage"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Property Status</Label>
                    <Select
                      value={editedProperty?.status || ''}
                      onValueChange={(value) => handlePropertyFieldChange('status', value)}
                    >
                      <SelectTrigger id="edit-status">
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
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-source">Source</Label>
                    <Input
                      id="edit-source"
                      value={editedProperty?.source || ''}
                      onChange={(e) => handlePropertyFieldChange('source', e.target.value)}
                      placeholder="Enter source"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  {selectedProperty.last_sold_price && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Sold Price</span>
                      <div className="flex items-center font-medium">
                        <DollarSign className="h-4 w-4" />
                        {Number(selectedProperty.last_sold_price).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {selectedProperty.last_sold_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Sold Date</span>
                      <span className="font-medium">
                        {format(new Date(selectedProperty.last_sold_date), "MMM d, yyyy")}
                      </span>
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

                        {/* Optional due date for any activity type */}
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

                {!propertyActivities || propertyActivities.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">No activities yet</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {propertyActivities.map((activity: any) => (
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
                              <>
                              <span>Due: {format(new Date(activity.due_at), "MMM d, yyyy")}</span>
                            <span>•</span>
                              </>
                            )}
                            {activity.created_at && (
                            <span>{format(new Date(activity.created_at), "MMM d, yyyy")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
              </TabsContent>

              {/* Comps Tab */}
              <TabsContent value="comps" className="space-y-4 mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <p>Comparable properties feature coming soon</p>
                </div>
              </TabsContent>
            </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Add Activity Dialog */}
      <Dialog open={isBulkAddingActivity} onOpenChange={setIsBulkAddingActivity}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add Activity to {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'Property' : 'Properties'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-activity-type">Activity Type</Label>
              <Select
                value={bulkActivityForm.type}
                onValueChange={(value) => setBulkActivityForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger id="bulk-activity-type">
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
              <Label htmlFor="bulk-activity-title">Title</Label>
              <Input
                id="bulk-activity-title"
                value={bulkActivityForm.title}
                onChange={(e) => setBulkActivityForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Called agent about property"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-activity-body">Details</Label>
              <Textarea
                id="bulk-activity-body"
                value={bulkActivityForm.body}
                onChange={(e) => setBulkActivityForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Additional details..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-activity-due">Due Date (Optional)</Label>
              <Input
                id="bulk-activity-due"
                type="datetime-local"
                value={bulkActivityForm.due_at}
                onChange={(e) => setBulkActivityForm(prev => ({ ...prev, due_at: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBulkAddingActivity(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkAddActivity} disabled={bulkAddActivityMutation.isPending}>
                {bulkAddActivityMutation.isPending ? "Adding..." : "Add to All"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
