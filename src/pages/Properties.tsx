import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, DollarSign, MapPin, Home, Calendar, Ruler, Clock, Phone, Mail, FileText, Video, CheckCircle2, List, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Search, ChevronDown, ChevronUp, Download, Info, MessageSquare, Trash2, UserCircle, Check } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import BuyBoxAnalyticsModal from "@/components/BuyBoxAnalyticsModal";
import { useSearchParams } from "react-router-dom";

const PROPERTY_TYPES = [
  { value: "Single Family", label: "Single Family Home (SFH)", icon: "🏠" },
  { value: "Multi Family", label: "Multi Family", icon: "🏘️" },
  { value: "Condo", label: "Condo", icon: "🏢" },
  { value: "Townhouse", label: "Townhouse", icon: "🏘️" },
  { value: "Lot", label: "Lot / Land", icon: "🌳" },
  { value: "Apartment", label: "Apartment", icon: "🏛️" },
  { value: "Commercial", label: "Commercial", icon: "🏬" },
];

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
  const [selectedListHomeTypes, setSelectedListHomeTypes] = useState<string[]>([]);
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
    buy_box_id: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    square_footage: "",
    year_built: "",
    home_type: "",
    description: "",
    notes: "",
  });
  const [filterInputs, setFilterInputs] = useState({
    minPrice: "",
    maxPrice: "",
    minBedrooms: "",
    maxBedrooms: "",
  }); // Immediate input values
  const [filters, setFilters] = useState({
    status: "all",
    buyBoxId: "all",
    minPrice: "",
    maxPrice: "",
    minBedrooms: "",
    maxBedrooms: "",
    homeType: "all",
    workflowState: "all",
    urgency: "all",
    assignedTo: "all",
  });
  const [searchInput, setSearchInput] = useState(""); // Immediate input value
  const [searchQuery, setSearchQuery] = useState(""); // Debounced value for querying
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({
    toEmail: "",
    agentName: "",
    templateId: "",
    offerPrice: "",
  });
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [smsForm, setSmsForm] = useState({
    toPhone: "",
    agentName: "",
    message: "",
  });
  const [contactSelectorOpen, setContactSelectorOpen] = useState(false);
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);
  const [bulkEmailForm, setBulkEmailForm] = useState({
    templateId: "",
    offerPrice: "",
  });
  const [isSendingBulkSMS, setIsSendingBulkSMS] = useState(false);
  const [bulkSMSMessage, setBulkSMSMessage] = useState("");
  const [showBuyBoxAnalytics, setShowBuyBoxAnalytics] = useState(false);
  const [selectedBuyBoxForAnalytics, setSelectedBuyBoxForAnalytics] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isAddingComp, setIsAddingComp] = useState(false);
  const [compForm, setCompForm] = useState({
    address: "",
    zillow_link: "",
    price: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Apply buy box filter from URL parameter
  useEffect(() => {
    const buyBoxIdFromUrl = searchParams.get('buyBoxId');
    if (buyBoxIdFromUrl) {
      setFilters((prev) => ({ ...prev, buyBoxId: buyBoxIdFromUrl }));
      setShowFilters(true);
      // Remove the query parameter after applying it
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);
  
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

  // Fetch team members for assignment - JOIN with profiles table
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

      if (!members || members.length === 0) {
        console.log("No team members found");
        return [];
      }

      // Then get profiles for each member
      const userIds = members.map(m => m.user_id);
      console.log("🔍 Fetching profiles for user IDs:", userIds);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      
      if (profilesError) {
        console.error("❌ Error fetching profiles:", profilesError);
        return [];
      }

      console.log("✅ Profiles fetched:", profiles?.length, "out of", userIds.length);
      profiles?.forEach(p => console.log("  - Profile:", p.email, "(", p.id, ")"));

      // Combine the data
      const membersWithProfiles = members.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        if (!profile) {
          console.warn("⚠️ No profile found for team member:", member.user_id, "role:", member.role);
        }
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
      
      console.log("Team members loaded:", membersWithProfiles.length, membersWithProfiles);
      return membersWithProfiles;
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch contacts for SMS recipient selection
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      
      const { data, error } = await supabase
        .from("contacts")
        .select("id, full_name, phone, company, type")
        .eq("company_id", userCompany.company_id)
        .not("phone", "is", null)
        .order("full_name");
      
      if (error) {
        console.error("Error fetching contacts:", error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Helper function to apply all filters to a query
  const applyFiltersToQuery = (query: any) => {
    // Filter by search query (address search)
    if (searchQuery.trim() !== "") {
      query = query.ilike("address", `%${searchQuery}%`);
    }
    
    // Filter by status
    if (filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    
    // Filter by buy box
    if (filters.buyBoxId !== "all") {
      query = query.eq("buy_box_id", filters.buyBoxId);
    }
    
    // Filter by workflow state
    if (filters.workflowState !== "all") {
      query = query.eq("workflow_state", filters.workflowState);
    }
    
    // Filter by home type
    if (filters.homeType !== "all") {
      query = query.eq("home_type", filters.homeType);
    }
    
    // Filter by urgency
    if (filters.urgency !== "all") {
      query = query.eq("urgency", parseInt(filters.urgency));
    }
    
    // Filter by assigned user
    if (filters.assignedTo !== "all") {
      if (filters.assignedTo === "unassigned") {
        query = query.is("assigned_to", null);
      } else {
        query = query.eq("assigned_to", filters.assignedTo);
      }
    }
    
    // Filter by price range
    if (filters.minPrice) {
      query = query.gte("price", parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      query = query.lte("price", parseFloat(filters.maxPrice));
    }
    
    // Filter by bedroom range
    if (filters.minBedrooms) {
      query = query.gte("bedrooms", parseInt(filters.minBedrooms));
    }
    if (filters.maxBedrooms) {
      query = query.lte("bedrooms", parseInt(filters.maxBedrooms));
    }
    
    return query;
  };

  // Get total count of properties for pagination
  const { data: totalCount } = useQuery({
    queryKey: ["properties-count", userCompany?.company_id, filters, searchQuery],
    queryFn: async () => {
      if (!userCompany?.company_id) return 0;
      
      let query = supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("company_id", userCompany.company_id);
      
      // Apply all filters
      query = applyFiltersToQuery(query);
      
      const { count, error } = await query;
      
      if (error) {
        console.error("Error fetching count:", error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!userCompany?.company_id,
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties", userCompany?.company_id, filters, searchQuery, currentPage, itemsPerPage],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      let query = supabase
        .from("properties")
        .select("*")
        .eq("company_id", userCompany.company_id);
      
      // Apply all filters
      query = applyFiltersToQuery(query);
      
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (error) {
        console.error("Error fetching properties:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Debounce search input (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Debounce filter inputs (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        minPrice: filterInputs.minPrice,
        maxPrice: filterInputs.maxPrice,
        minBedrooms: filterInputs.minBedrooms,
        maxBedrooms: filterInputs.maxBedrooms,
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, [filterInputs]);

  // Reset to page 1 when filters, search query, or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery, itemsPerPage]);

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

  // Fetch workflow history for selected property
  const { data: workflowHistory } = useQuery({
    queryKey: ["workflow-history", selectedProperty?.id],
    queryFn: async () => {
      if (!selectedProperty?.id) return [];
      const { data } = await supabase
        .from("property_workflow_history")
        .select("*")
        .eq("property_id", selectedProperty.id)
        .order("changed_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedProperty?.id,
  });

  // Query for buy boxes (lists) for filter dropdown
  const { data: buyBoxes } = useQuery({
    queryKey: ["buy_boxes", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      
      // Fetch all buy boxes for the company
      const { data } = await supabase
        .from("buy_boxes")
        .select("id, name")
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false});
      
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Query for all upcoming activities (today or future)
  const { data: upcomingActivities } = useQuery({
    queryKey: ["upcoming-activities", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .eq("status", "open")
        .gte("due_at", today.toISOString())
        .order("due_at", { ascending: true });
      
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Query for email templates
  const { data: emailTemplates } = useQuery({
    queryKey: ["email_templates", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data } = await supabase
        .from("email_templates")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // All filtering is now done at the database level, so we just use properties directly
  const filteredProperties = properties;

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

  // Get next upcoming activity for a property (any type, due today or future)
  const getNextUpcomingActivity = (propertyId: string) => {
    if (!upcomingActivities || upcomingActivities.length === 0) return null;
    
    const propertyUpcomingActivities = upcomingActivities.filter(
      (activity: any) => activity.property_id === propertyId
    );
    
    if (propertyUpcomingActivities.length === 0) return null;
    
    // Activities are already sorted by due_at ascending, so just return the first one
    return propertyUpcomingActivities[0];
  };

  const addActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!userCompany?.company_id) throw new Error("No company found");
      
      // Prepare activity data - exclude due_at if empty
      const activityData: any = {
        type: data.type,
        title: data.title,
        body: data.body,
        property_id: selectedProperty?.id,
        user_id: user.id,
        company_id: userCompany.company_id,
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
      queryClient.invalidateQueries({ queryKey: ["upcoming-activities"] });
      queryClient.invalidateQueries({ queryKey: ["property-activities"] });
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
      if (!userCompany?.company_id) throw new Error("No company found");
      if (selectedPropertyIds.length === 0) throw new Error("No properties selected");
      
      // Prepare activity data for each property
      const activities = selectedPropertyIds.map(propertyId => {
        const activityData: any = {
          type: data.type,
          title: data.title,
          body: data.body,
          property_id: propertyId,
          user_id: user.id,
          company_id: userCompany.company_id,
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
      queryClient.invalidateQueries({ queryKey: ["upcoming-activities"] });
      queryClient.invalidateQueries({ queryKey: ["property-activities"] });
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

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: { toEmail: string; agentName: string; templateId: string; offerPrice: string; property: any }) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!userCompany?.company_id) throw new Error("No company found");
      
      // Get the template
      const template = emailTemplates?.find((t: any) => t.id === data.templateId);
      if (!template) throw new Error("Template not found");
      
      // Replace variables in subject and body
      const replaceVariables = (text: string) => {
        return text
          .replace(/\{\{PROPERTY\}\}/g, data.property.address || '')
          .replace(/\{\{PRICE\}\}/g, data.offerPrice || data.property.price || '')
          .replace(/\{\{AGENT_NAME\}\}/g, data.agentName)
          .replace(/\{\{BEDROOMS\}\}/g, data.property.bedrooms || '')
          .replace(/\{\{BATHROOMS\}\}/g, data.property.bathrooms || '')
          .replace(/\{\{SQFT\}\}/g, data.property.square_footage || data.property.living_sqf || '');
      };
      
      const emailContent = replaceVariables(template.body);
      const emailSubject = replaceVariables(template.subject);
      
      // Send email via Supabase Edge Function (Nodemailer + Gmail)
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-email-nodemailer', {
        body: {
          toEmail: data.toEmail,
          agentName: data.agentName,
          subject: emailSubject,
          emailContent: emailContent,
          offerPrice: data.offerPrice,
          companyId: userCompany.company_id,
        },
      });
      
      if (functionError) {
        throw new Error(functionError.message || 'Failed to send email');
      }
      
      if (!functionData?.success) {
        throw new Error(functionData?.error || 'Failed to send email');
      }
      
      // Save email activity
      const { error } = await supabase.from("activities").insert([{
        type: 'email',
        title: `Email sent to ${data.agentName}`,
        body: `Subject: ${emailSubject}\n\nOffer Price: ${data.offerPrice}\n\n${emailContent}`,
        property_id: data.property.id,
        user_id: user.id,
        company_id: userCompany.company_id,
        status: 'done',
      }]);
      
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", selectedProperty?.id] });
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully and logged as an activity.",
      });
      setIsSendingEmail(false);
      setEmailForm({
        toEmail: "",
        agentName: "",
        templateId: "",
        offerPrice: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = () => {
    if (!emailForm.toEmail || !emailForm.agentName || !emailForm.templateId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate({
      ...emailForm,
      property: selectedProperty
    });
  };

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
        home_types: data.homeTypes || [],
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
      setSelectedListHomeTypes([]);
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

  const toggleListHomeType = (type: string) => {
    setSelectedListHomeTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

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
      homeTypes: selectedListHomeTypes,
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
        buy_box_id: data.buy_box_id || null,
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
        buy_box_id: "",
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
      // OPTIMISTIC UPDATE - Update UI immediately
      queryClient.setQueryData(
        ["properties", userCompany?.company_id, filters.status],
        (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.map((prop: any) =>
            propertyIds.includes(prop.id)
              ? { ...prop, workflow_state: workflowState }
              : prop
          );
        }
      );

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
      
      return { propertyIds, workflowState };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["properties", userCompany?.company_id] });
      toast({
        title: "Success",
        description: `Updated ${data.propertyIds.length} properties to "${data.workflowState}"`,
      });
      setSelectedPropertyIds([]);
    },
    onError: (error: any, variables) => {
      // ROLLBACK on error
      queryClient.invalidateQueries({ queryKey: ["properties", userCompany?.company_id] });
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

  // Send SMS mutation
  const sendSMSMutation = useMutation({
    mutationFn: async (data: { to: string; message: string; propertyId?: string }) => {
      const { data: responseData, error } = await supabase.functions.invoke('send-sms', {
        body: {
          type: 'single',
          to: data.to,
          message: data.message,
          propertyId: data.propertyId,
        },
      });

      if (error) throw error;
      return responseData;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "SMS sent!",
        description: `Message sent to ${smsForm.agentName}`,
      });
      setIsSendingSMS(false);
      setSmsForm({
        toPhone: "",
        agentName: "",
        message: "",
      });
      // Invalidate property SMS messages if we sent to a specific property
      if (variables.propertyId) {
        queryClient.invalidateQueries({ queryKey: ["property-sms", variables.propertyId] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    },
  });

  // Update property mutation
  const updatePropertyMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      if (!selectedProperty?.id) throw new Error("No property selected");
      
      const { error } = await supabase
        .from('properties')
        .update(updatedData)
        .eq('id', selectedProperty.id);
      
      if (error) throw error;
      return updatedData;
    },
    onSuccess: (updatedData) => {
      // Update selectedProperty with the saved values immediately
      setSelectedProperty((prev: any) => ({ ...prev, ...updatedData }));
      // Reset editedProperty to match selectedProperty
      setEditedProperty((prev: any) => ({ ...prev, ...updatedData }));
      
      queryClient.invalidateQueries({ queryKey: ["properties", userCompany?.company_id] });
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
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
    }
  };

  const handlePropertyFieldChange = (field: string, value: any) => {
    setEditedProperty((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addCompMutation = useMutation({
    mutationFn: async (comp: { address: string; zillow_link: string; price: string }) => {
      if (!selectedProperty?.id) throw new Error("No property selected");
      
      // Get existing comps from the property
      const existingComps = selectedProperty.comps || [];
      
      // Add new comp to the array
      const updatedComps = [...existingComps, { ...comp, id: Date.now().toString() }];
      
      const { error } = await supabase
        .from('properties')
        .update({ comps: updatedComps })
        .eq('id', selectedProperty.id);
      
      if (error) throw error;
      return updatedComps;
    },
    onSuccess: (updatedComps) => {
      setSelectedProperty((prev: any) => ({ ...prev, comps: updatedComps }));
      setEditedProperty((prev: any) => ({ ...prev, comps: updatedComps }));
      queryClient.invalidateQueries({ queryKey: ["properties", userCompany?.company_id] });
      toast({
        title: "Success",
        description: "Comp added successfully",
      });
      setIsAddingComp(false);
      setCompForm({ address: "", zillow_link: "", price: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comp",
        variant: "destructive",
      });
    },
  });

  const deleteCompMutation = useMutation({
    mutationFn: async (compId: string) => {
      if (!selectedProperty?.id) throw new Error("No property selected");
      
      // Get existing comps and filter out the one to delete
      const existingComps = selectedProperty.comps || [];
      const updatedComps = existingComps.filter((comp: any) => comp.id !== compId);
      
      const { error } = await supabase
        .from('properties')
        .update({ comps: updatedComps })
        .eq('id', selectedProperty.id);
      
      if (error) throw error;
      return updatedComps;
    },
    onSuccess: (updatedComps) => {
      setSelectedProperty((prev: any) => ({ ...prev, comps: updatedComps }));
      setEditedProperty((prev: any) => ({ ...prev, comps: updatedComps }));
      queryClient.invalidateQueries({ queryKey: ["properties", userCompany?.company_id] });
      toast({
        title: "Success",
        description: "Comp deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comp",
        variant: "destructive",
      });
    },
  });

  const handleAddComp = () => {
    if (!compForm.address || !compForm.price) {
      toast({
        title: "Error",
        description: "Please enter at least address and price",
        variant: "destructive",
      });
      return;
    }
    addCompMutation.mutate(compForm);
  };

  // Helper function to get team member display name
  const getTeamMemberDisplayName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const member = teamMembers?.find((m: any) => m.user_id === userId);
    if (!member) return "Unknown";
    // Prioritize full_name, fallback to email
    const displayName = member.profiles?.full_name || member.profiles?.email || "Unknown";
    const roleText = member.role && member.role !== "member" ? ` (${member.role})` : "";
    return `${displayName}${roleText}`;
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
                  <Label>Property Types</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select the types of properties you want to include. Leave empty to include all types.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PROPERTY_TYPES.map((type) => (
                      <div key={type.value} className="flex items-center space-x-2 border rounded-lg p-2 hover:bg-accent transition-colors">
                        <Checkbox
                          id={`list-type-${type.value}`}
                          checked={selectedListHomeTypes.includes(type.value)}
                          onCheckedChange={() => toggleListHomeType(type.value)}
                        />
                        <label
                          htmlFor={`list-type-${type.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{type.icon}</span>
                          <span className="text-xs">{type.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedListHomeTypes.length > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Selected: {selectedListHomeTypes.join(", ")}
                    </p>
                  )}
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
                    <Label htmlFor="property-buy-box">Buy Box (Optional)</Label>
                    <Select
                      value={propertyForm.buy_box_id || "none"}
                      onValueChange={(value) => setPropertyForm((prev: any) => ({ ...prev, buy_box_id: value === "none" ? "" : value }))}
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                <Button
                  onClick={() => setIsBulkAddingActivity(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs w-full sm:w-auto"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Add Activity
                </Button>
                <Button
                  onClick={() => setIsSendingBulkEmail(true)}
                  size="sm"
                  variant="outline"
                  className="text-xs w-full sm:w-auto"
                >
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Send Emails
                </Button>
                <Button
                  onClick={() => setIsSendingBulkSMS(true)}
                  size="sm"
                  variant="outline"
                  className="text-xs w-full sm:w-auto"
                >
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Send SMS
                </Button>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <Label className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100">
                    Change Workflow Stage:
                  </Label>
                  <Select
                    value=""
                    onValueChange={handleBulkWorkflowUpdate}
                    disabled={bulkUpdateWorkflowMutation.isPending}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-gray-950 text-xs sm:text-sm">
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
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full lg:w-auto">
                <p className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'property' : 'properties'} selected
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPropertyIds([])}
                  className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm"
                >
                  Clear Selection
                </Button>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="filter-list" className="text-sm font-medium">Buy Box</Label>
                {filters.buyBoxId !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      const selectedBox = buyBoxes?.find((box) => box.id === filters.buyBoxId);
                      if (selectedBox) {
                        setSelectedBuyBoxForAnalytics({
                          id: selectedBox.id,
                          name: selectedBox.name,
                        });
                        setShowBuyBoxAnalytics(true);
                      }
                    }}
                  >
                    <Info className="h-4 w-4 text-blue-500" />
                  </Button>
                )}
              </div>
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
                value={filterInputs.minPrice}
                onChange={(e) => setFilterInputs((prev) => ({ ...prev, minPrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-max-price" className="text-sm font-medium">Max Price</Label>
              <Input
                id="filter-max-price"
                type="number"
                placeholder="Any"
                value={filterInputs.maxPrice}
                onChange={(e) => setFilterInputs((prev) => ({ ...prev, maxPrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-bedrooms" className="text-sm font-medium">Min Beds</Label>
              <Input
                id="filter-bedrooms"
                type="number"
                placeholder="Any"
                value={filterInputs.minBedrooms}
                onChange={(e) => setFilterInputs((prev) => ({ ...prev, minBedrooms: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-max-bedrooms" className="text-sm font-medium">Max Beds</Label>
              <Input
                id="filter-max-bedrooms"
                type="number"
                placeholder="Any"
                value={filterInputs.maxBedrooms}
                onChange={(e) => setFilterInputs((prev) => ({ ...prev, maxBedrooms: e.target.value }))}
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

            <div className="space-y-2">
              <Label htmlFor="filter-urgency" className="text-sm font-medium">Urgency</Label>
              <Select
                value={filters.urgency}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, urgency: value }))}
              >
                <SelectTrigger id="filter-urgency">
                  <SelectValue placeholder="All Urgencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgencies</SelectItem>
                  <SelectItem value="3">🔴 Urgent</SelectItem>
                  <SelectItem value="2">🟡 Medium</SelectItem>
                  <SelectItem value="1">🟢 Not Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To Filter */}
            <div className="space-y-2">
              <Label htmlFor="filter-assigned-to" className="text-sm font-medium">Assigned To</Label>
              <Select
                value={filters.assignedTo}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, assignedTo: value }))}
              >
                <SelectTrigger id="filter-assigned-to">
                  <SelectValue placeholder="All Team Members" />
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
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount || 0)} of {totalCount || 0} properties
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterInputs({
                  minPrice: "",
                  maxPrice: "",
                  minBedrooms: "",
                  maxBedrooms: "",
                });
                setFilters({
                  status: "all",
                  buyBoxId: "all",
                  minPrice: "",
                  maxPrice: "",
                  minBedrooms: "",
                  maxBedrooms: "",
                  homeType: "all",
                  workflowState: "all",
                  urgency: "all",
                  assignedTo: "all",
                });
              }}
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
                onClick={() => {
                  setFilterInputs({
                    minPrice: "",
                    maxPrice: "",
                    minBedrooms: "",
                    maxBedrooms: "",
                  });
                  setFilters({
                    status: "all",
                    buyBoxId: "all",
                    minPrice: "",
                    maxPrice: "",
                    minBedrooms: "",
                    maxBedrooms: "",
                    homeType: "all",
                    workflowState: "all",
                    urgency: "all",
                    assignedTo: "all",
                  });
                }}
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
                    <span className="font-semibold">Next Activity</span>
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const nextActivity = getNextUpcomingActivity(property.id);
                          if (!nextActivity) return <span className="text-xs text-muted-foreground">-</span>;
                          
                          const dueDate = new Date(nextActivity.due_at);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          
                          let dateLabel = format(dueDate, 'MMM d');
                          if (dueDate.toDateString() === today.toDateString()) {
                            dateLabel = 'Today';
                          } else if (dueDate.toDateString() === tomorrow.toDateString()) {
                            dateLabel = 'Tomorrow';
                          }
                          
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs px-2 gap-1 hover:bg-primary/10"
                                    onClick={() => {
                                      setSelectedProperty(property);
                                      setEditedProperty({ ...property });
                                    }}
                                  >
                                    <Calendar className="h-3 w-3" />
                                    {dateLabel}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs max-w-xs">
                                    <p className="font-semibold">{nextActivity.title || 'Activity'}</p>
                                    <p className="text-muted-foreground">Type: {nextActivity.type}</p>
                                    <p className="text-muted-foreground">Due: {format(dueDate, 'PPp')}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
                      </TableCell>
                      <TableCell>{property.city || '-'}</TableCell>
                      <TableCell>
                        {property.living_sqf ? Number(property.living_sqf).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        {property.source === 'Zillow' ? (
                          <span className="text-blue-600 font-medium">Zillow</span>
                        ) : property.source || ''}
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
          
          {/* Pagination Controls */}
          {sortedProperties && sortedProperties.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground ml-2 sm:ml-4">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount || 0)} of {totalCount || 0} properties
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
                    
                    if (startPage > 1) {
                      pages.push(
                        <Button
                          key="ellipsis-start"
                          variant="ghost"
                          size="sm"
                          disabled
                          className="cursor-default"
                        >
                          ...
                        </Button>
                      );
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
                    
                    if (endPage < totalPages) {
                      pages.push(
                        <Button
                          key="ellipsis-end"
                          variant="ghost"
                          size="sm"
                          disabled
                          className="cursor-default"
                        >
                          ...
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
          )}
        </Card>
      )}

      <Dialog open={!!selectedProperty} onOpenChange={(open) => {
        if (!open) {
          setSelectedProperty(null);
          setEditedProperty(null);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto" aria-describedby="property-details-description">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-2xl">
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
              {/* Workflow Status & Action Buttons - Always Visible at Top */}
              <div className="bg-gradient-to-r  p-3 md:p-4 rounded-lg border-2  shadow-sm">
                <div className="flex flex-col lg:flex-row items-start lg:items-end gap-3 md:gap-4">
                  <div className="w-full lg:w-auto lg:min-w-[280px] lg:max-w-[350px]">
                    <Label htmlFor="workflow-state" className="text-xs md:text-sm font-bold text-blue-900 dark:text-blue-100 mb-2 block">
                      📊 Workflow Stage
                    </Label>
                    <Select
                      value={selectedProperty.workflow_state || 'Initial'}
                      onValueChange={async (value) => {
                        const oldState = selectedProperty.workflow_state;
                        const propertyId = selectedProperty.id;
                        
                        // OPTIMISTIC UPDATE - Update UI immediately
                        setSelectedProperty((prev: any) => ({
                          ...prev,
                          workflow_state: value,
                        }));
                        
                        // Update in the properties list cache immediately
                        queryClient.setQueryData(
                          ["properties", userCompany?.company_id, filters.status],
                          (oldData: any) => {
                            if (!oldData) return oldData;
                            return oldData.map((prop: any) =>
                              prop.id === propertyId
                                ? { ...prop, workflow_state: value }
                                : prop
                            );
                          }
                        );

                        // Show immediate feedback
                        toast({
                          title: "✅ Workflow updated",
                          description: `Property moved to ${value}`,
                        });

                        // Now update database in the background
                        const { error } = await supabase
                          .from('properties')
                          .update({ workflow_state: value })
                          .eq('id', propertyId);
                        
                        if (error) {
                          // ROLLBACK on error
                          setSelectedProperty((prev: any) => ({
                            ...prev,
                            workflow_state: oldState,
                          }));
                          queryClient.setQueryData(
                            ["properties", userCompany?.company_id, filters.status],
                            (oldData: any) => {
                              if (!oldData) return oldData;
                              return oldData.map((prop: any) =>
                                prop.id === propertyId
                                  ? { ...prop, workflow_state: oldState }
                                  : prop
                              );
                            }
                          );
                          toast({
                            title: "Error",
                            description: "Failed to update workflow state - reverted",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Record workflow change
                        await supabase.from('property_workflow_history').insert({
                          property_id: propertyId,
                          user_id: user?.id,
                          from_state: oldState || 'Initial',
                          to_state: value,
                        });

                        // Invalidate to sync with server (but UI already updated)
                        queryClient.invalidateQueries({ queryKey: ["properties", userCompany?.company_id] });
                        queryClient.invalidateQueries({ queryKey: ["workflow-history", propertyId] });
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

                  {/* Assigned To Dropdown */}
                  <div className="w-full lg:w-auto lg:min-w-[200px] lg:max-w-[280px]">
                    <Label htmlFor="assigned-to" className="text-xs md:text-sm font-bold text-blue-900 dark:text-blue-100 mb-2 block">
                      👤 Assigned To
                    </Label>
                    <Select
                      value={selectedProperty.assigned_to || "unassigned"}
                      onValueChange={async (value) => {
                        const propertyId = selectedProperty.id;
                        const assignedValue = value === "unassigned" ? null : value;
                        
                        // OPTIMISTIC UPDATE - Update UI immediately
                        setSelectedProperty((prev: any) => ({
                          ...prev,
                          assigned_to: assignedValue,
                        }));
                        
                        // Update in the properties list cache immediately
                        queryClient.setQueryData(
                          ["properties", userCompany?.company_id, filters.status],
                          (oldData: any) => {
                            if (!oldData) return oldData;
                            return oldData.map((prop: any) =>
                              prop.id === propertyId
                                ? { ...prop, assigned_to: assignedValue }
                                : prop
                            );
                          }
                        );

                        // Show immediate feedback
                        toast({
                          title: "✅ Assignment updated",
                          description: assignedValue ? "Property assigned successfully" : "Property unassigned",
                        });

                        // Now update database in the background
                        const { error } = await supabase
                          .from('properties')
                          .update({ assigned_to: assignedValue })
                          .eq('id', propertyId);
                        
                        if (error) {
                          toast({
                            title: "Error",
                            description: "Failed to update assignment",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Invalidate to sync with server (but UI already updated)
                        queryClient.invalidateQueries({ queryKey: ["properties", userCompany?.company_id] });
                      }}
                    >
                      <SelectTrigger id="assigned-to" className="bg-white dark:bg-gray-900 border-2 h-11 text-base font-medium">
                        <SelectValue>
                          {getTeamMemberDisplayName(selectedProperty.assigned_to)}
                        </SelectValue>
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
                  
                  {/* Action Buttons - Email, SMS, Activity */}
                  <div className="flex flex-wrap gap-2 lg:ml-auto">
                <Dialog open={isSendingEmail} onOpenChange={(open) => {
                  if (open && selectedProperty) {
                    // Pre-populate email form with seller agent data
                    setEmailForm({
                      toEmail: selectedProperty.seller_agent_email || "",
                      agentName: selectedProperty.seller_agent_name || "",
                      templateId: "",
                      offerPrice: "",
                    });
                  }
                  setIsSendingEmail(open);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-lg md:text-xl">Send Email to Realtor</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 md:space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="email-template">Email Template *</Label>
                        <Select
                          value={emailForm.templateId}
                          onValueChange={(value) => setEmailForm(prev => ({ ...prev, templateId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {emailTemplates && emailTemplates.length > 0 ? (
                              emailTemplates.map((template: any) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No templates available - Create one in Communication
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email-to">Agent Email *</Label>
                        <Input
                          id="email-to"
                          type="email"
                          value={emailForm.toEmail}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, toEmail: e.target.value }))}
                          placeholder="agent@example.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email-agent-name">Agent Name *</Label>
                        <Input
                          id="email-agent-name"
                          value={emailForm.agentName}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, agentName: e.target.value }))}
                          placeholder="John Smith"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email-offer-price">Offer Price (Optional)</Label>
                        <Input
                          id="email-offer-price"
                          value={emailForm.offerPrice}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, offerPrice: e.target.value }))}
                          placeholder="150000"
                        />
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          📋 Property Info
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Address: {selectedProperty?.address || 'N/A'}<br />
                          Price: ${selectedProperty?.price?.toLocaleString() || 'N/A'}<br />
                          Beds/Baths: {selectedProperty?.bedrooms || 'N/A'} / {selectedProperty?.bathrooms || 'N/A'}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsSendingEmail(false)} className="w-full sm:w-auto text-sm">
                          Cancel
                        </Button>
                        <Button onClick={handleSendEmail} disabled={sendEmailMutation.isPending} className="w-full sm:w-auto text-sm">
                          {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isSendingSMS} onOpenChange={(open) => {
                  if (open && selectedProperty) {
                    // Pre-populate SMS form with seller agent data
                    setSmsForm({
                      toPhone: selectedProperty.seller_agent_phone || "",
                      agentName: selectedProperty.seller_agent_name || "",
                      message: "",
                    });
                  } else {
                    // Reset form when closing
                    setContactSelectorOpen(false);
                  }
                  setIsSendingSMS(open);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send SMS
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-lg md:text-xl">Send SMS</DialogTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Send a text message to anyone about this property
                      </p>
                    </DialogHeader>
                    <div className="space-y-3 md:space-y-4 mt-4">
                      {selectedProperty?.seller_agent_phone && !smsForm.toPhone && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            💡 Pre-filled with listing agent info. You can edit, replace, or select from your contacts.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Select from Contacts (Optional)</Label>
                        <Popover open={contactSelectorOpen} onOpenChange={setContactSelectorOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={contactSelectorOpen}
                              className="w-full justify-between"
                            >
                              <span className="flex items-center gap-2">
                                <UserCircle className="h-4 w-4" />
                                {smsForm.agentName && smsForm.toPhone 
                                  ? `${smsForm.agentName} (${smsForm.toPhone})`
                                  : "Select a contact..."}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search contacts..." />
                              <CommandList>
                                <CommandEmpty>No contacts found.</CommandEmpty>
                                <CommandGroup>
                                  {contacts.map((contact: any) => (
                                    <CommandItem
                                      key={contact.id}
                                      value={`${contact.full_name} ${contact.phone} ${contact.company || ''}`}
                                      onSelect={() => {
                                        setSmsForm(prev => ({
                                          ...prev,
                                          toPhone: contact.phone,
                                          agentName: contact.full_name,
                                        }));
                                        setContactSelectorOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          smsForm.toPhone === contact.phone ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{contact.full_name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {contact.phone}
                                          {contact.company && ` • ${contact.company}`}
                                          {contact.type && ` • ${contact.type}`}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                          Select a contact from your database or enter manually below
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sms-phone">Recipient Phone Number *</Label>
                        <Input
                          id="sms-phone"
                          type="tel"
                          value={smsForm.toPhone}
                          onChange={(e) => setSmsForm(prev => ({ ...prev, toPhone: e.target.value }))}
                          placeholder="+1 (555) 123-4567"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter manually or select from contacts above
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sms-agent-name">Recipient Name *</Label>
                        <Input
                          id="sms-agent-name"
                          value={smsForm.agentName}
                          onChange={(e) => setSmsForm(prev => ({ ...prev, agentName: e.target.value }))}
                          placeholder="John Smith"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter manually or select from contacts above
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sms-message">Message *</Label>
                        <Textarea
                          id="sms-message"
                          value={smsForm.message}
                          onChange={(e) => setSmsForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Hi {agent_name}, I'm interested in the property at {address}..."
                          rows={6}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          Available variables: {"{agent_name}"}, {"{address}"}, {"{price}"}, {"{beds}"}, {"{baths}"}
                        </p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          📋 Property Info
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Address: {selectedProperty?.address || 'N/A'}<br />
                          Price: ${selectedProperty?.price?.toLocaleString() || 'N/A'}<br />
                          Beds/Baths: {selectedProperty?.bedrooms || 'N/A'} / {selectedProperty?.bathrooms || 'N/A'}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsSendingSMS(false)} 
                          className="w-full sm:w-auto text-sm"
                          disabled={sendSMSMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            if (!smsForm.toPhone || !smsForm.agentName || !smsForm.message) {
                              toast({
                                title: "Missing information",
                                description: "Please fill in all required fields",
                                variant: "destructive",
                              });
                              return;
                            }
                            // Replace template variables
                            const finalMessage = smsForm.message
                              .replace(/\{agent_name\}/gi, smsForm.agentName)
                              .replace(/\{address\}/gi, selectedProperty?.address || 'N/A')
                              .replace(/\{price\}/gi, selectedProperty?.price ? `$${selectedProperty.price.toLocaleString()}` : 'N/A')
                              .replace(/\{beds\}/gi, selectedProperty?.bedrooms?.toString() || 'N/A')
                              .replace(/\{baths\}/gi, selectedProperty?.bathrooms?.toString() || 'N/A');
                            
                            sendSMSMutation.mutate({
                              to: smsForm.toPhone,
                              message: finalMessage,
                              propertyId: selectedProperty?.id,
                            });
                          }} 
                          className="w-full sm:w-auto text-sm"
                          disabled={sendSMSMutation.isPending}
                        >
                          {sendSMSMutation.isPending ? 'Sending...' : 'Send SMS'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Activity
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md" aria-describedby="activity-form-description">
                    <DialogHeader>
                      <DialogTitle className="text-lg md:text-xl">Add New Activity</DialogTitle>
                      {selectedProperty && (
                        <div className="pt-2 mt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Property:</span> {getPropertyDisplayName(selectedProperty)}
                          </p>
                          {selectedProperty.city && selectedProperty.state && (
                            <p className="text-xs text-muted-foreground">
                              {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip}
                            </p>
                          )}
                        </div>
                      )}
                    </DialogHeader>
                    <div className="space-y-3 md:space-y-4 mt-4">
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

                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddingActivity(false)} className="w-full sm:w-auto text-sm">
                          Cancel
                        </Button>
                        <Button onClick={handleAddActivity} disabled={addActivityMutation.isPending} className="w-full sm:w-auto text-sm">
                          {addActivityMutation.isPending ? "Adding..." : "Add Activity"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                  </div>
                </div>
              </div>

            <Tabs defaultValue="general" className="mt-4">
              <div className="overflow-x-auto">
                <TabsList className="grid w-full grid-cols-6 min-w-[600px]">
                  <TabsTrigger value="general" className="text-xs md:text-sm">
                    <Home className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">General</span>
                    <span className="sm:hidden">Gen</span>
                  </TabsTrigger>
                <TabsTrigger value="listing" className="text-xs md:text-sm">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Listing</span>
                  <span className="sm:hidden">List</span>
                </TabsTrigger>
                <TabsTrigger value="financial" className="text-xs md:text-sm">
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Financial</span>
                  <span className="sm:hidden">$</span>
                </TabsTrigger>
                <TabsTrigger value="details" className="text-xs md:text-sm">
                  <Building2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Details</span>
                  <span className="sm:hidden">Info</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs md:text-sm">
                  <Clock className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">History</span>
                  <span className="sm:hidden">Hist</span>
                </TabsTrigger>
                <TabsTrigger value="comps" className="text-xs md:text-sm">
                  <Ruler className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Comps</span>
                  <span className="sm:hidden">Cmp</span>
                </TabsTrigger>
              </TabsList>
              </div>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                {/* Save Button */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 pb-4 border-b">
                  <Button
                    variant="outline"
                    onClick={() => setEditedProperty({ ...selectedProperty })}
                    disabled={!editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                    className="w-full sm:w-auto text-sm"
                  >
                    Reset Changes
                  </Button>
                  <Button
                    onClick={handleSaveProperty}
                    disabled={updatePropertyMutation.isPending || !editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                    className="w-full sm:w-auto text-sm"
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

                  <div className="space-y-2">
                    <Label htmlFor="edit-buy-box">Buy Box (Optional)</Label>
                    <Select
                      value={editedProperty?.buy_box_id || "none"}
                      onValueChange={(value) => handlePropertyFieldChange('buy_box_id', value === "none" ? null : value)}
                    >
                      <SelectTrigger id="edit-buy-box">
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
                </div>
              </div>

              {/* Additional Information - Always Visible */}
              <div className="space-y-4 pt-6 border-t mt-6">
                <h3 className="font-semibold text-lg">Additional Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editedProperty?.description || ''}
                    onChange={(e) => handlePropertyFieldChange('description', e.target.value)}
                    placeholder="Property description, condition, features, etc."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Internal Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={editedProperty?.notes || ''}
                    onChange={(e) => handlePropertyFieldChange('notes', e.target.value)}
                    placeholder="Private notes, reminders, analysis, etc."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-agent-notes">Agent Notes</Label>
                  <Textarea
                    id="edit-agent-notes"
                    value={editedProperty?.agent_notes || ''}
                    onChange={(e) => handlePropertyFieldChange('agent_notes', e.target.value)}
                    placeholder="Notes from agent, seller information, etc."
                    rows={3}
                  />
                </div>

                {/* Save Button at bottom for convenience */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setEditedProperty({ ...selectedProperty })}
                    disabled={!editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                    className="w-full sm:w-auto text-sm"
                  >
                    Reset Changes
                  </Button>
                  <Button
                    onClick={handleSaveProperty}
                    disabled={updatePropertyMutation.isPending || !editedProperty || JSON.stringify(editedProperty) === JSON.stringify(selectedProperty)}
                    className="w-full sm:w-auto text-sm"
                  >
                    {updatePropertyMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
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
                {/* Workflow Status Change History */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">Workflow Status History</h3>
                  </div>
                  
                  {workflowHistory && workflowHistory.length > 0 ? (
                    <div className="space-y-3">
                      {workflowHistory.map((history: any, index: number) => (
                        <div
                          key={history.id}
                          className="flex gap-4 pb-4 relative"
                        >
                          {/* Timeline connector */}
                          {index < workflowHistory.length - 1 && (
                            <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                          )}
                          
                          {/* Icon */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center z-10">
                            <span className="text-sm">
                              {getWorkflowStateIcon(history.to_state)}
                            </span>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-red-600 border-red-300 line-through">
                                    {history.from_state}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge variant="outline" className="text-green-600 border-green-300 font-semibold">
                                    {history.to_state}
                                  </Badge>
                                </div>
                                {history.notes && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {history.notes}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {history.changed_at && format(new Date(history.changed_at), "MMM d, yyyy")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {history.changed_at && format(new Date(history.changed_at), "h:mm a")}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No workflow status changes yet</p>
                      <p className="text-sm">Status changes will appear here as you move this property through your pipeline</p>
                    </div>
                  )}
                </div>

                {/* Sales History */}
                <div className="pt-6 border-t">
                  <h3 className="font-semibold text-lg mb-4">Sales History</h3>
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

                    {!selectedProperty.last_sold_price && !selectedProperty.last_sold_date && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No sales history available
                      </div>
                    )}
                  </div>
                </div>

                {/* Activities Section */}
                <div className="pt-6 border-t">
                  <h3 className="font-semibold text-lg mb-4">Activities</h3>

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
              </TabsContent>

              {/* Comps Tab */}
              <TabsContent value="comps" className="space-y-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Comparable Properties</h3>
                  <Button 
                    size="sm" 
                    onClick={() => setIsAddingComp(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Comp
                  </Button>
                </div>

                {/* Add Comp Form Dialog */}
                <Dialog open={isAddingComp} onOpenChange={setIsAddingComp}>
                  <DialogContent className="w-[95vw] max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-lg md:text-xl">Add Comparable Property</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="comp-address">Address *</Label>
                        <Input
                          id="comp-address"
                          value={compForm.address}
                          onChange={(e) => setCompForm(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="123 Main St, City, State"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="comp-zillow-link">Zillow Link</Label>
                        <Input
                          id="comp-zillow-link"
                          type="url"
                          value={compForm.zillow_link}
                          onChange={(e) => setCompForm(prev => ({ ...prev, zillow_link: e.target.value }))}
                          placeholder="https://www.zillow.com/..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="comp-price">Price *</Label>
                        <Input
                          id="comp-price"
                          type="number"
                          value={compForm.price}
                          onChange={(e) => setCompForm(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="150000"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsAddingComp(false);
                            setCompForm({ address: "", zillow_link: "", price: "" });
                          }}
                          className="w-full sm:w-auto text-sm"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddComp} 
                          disabled={addCompMutation.isPending}
                          className="w-full sm:w-auto text-sm"
                        >
                          {addCompMutation.isPending ? "Adding..." : "Add Comp"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Comps List */}
                {!selectedProperty?.comps || selectedProperty.comps.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-4">No comparable properties added yet</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddingComp(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Comp
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedProperty.comps.map((comp: any, index: number) => (
                      <Card key={comp.id || index} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold text-sm">{comp.address}</p>
                                  {comp.zillow_link && (
                                    <a
                                      href={comp.zillow_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 mt-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      View on Zillow
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-green-600 dark:text-green-400">
                                  ${parseFloat(comp.price).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCompMutation.mutate(comp.id)}
                              disabled={deleteCompMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Add Activity Dialog */}
      <Dialog open={isBulkAddingActivity} onOpenChange={setIsBulkAddingActivity}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
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

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBulkAddingActivity(false)} className="w-full sm:w-auto text-sm">
                Cancel
              </Button>
              <Button onClick={handleBulkAddActivity} disabled={bulkAddActivityMutation.isPending} className="w-full sm:w-auto text-sm">
                {bulkAddActivityMutation.isPending ? "Adding..." : "Add to All"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Send Email Dialog */}
      <Dialog open={isSendingBulkEmail} onOpenChange={setIsSendingBulkEmail}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Send Email to {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'Agent' : 'Agents'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-email-template">Email Template *</Label>
              <Select
                value={bulkEmailForm.templateId}
                onValueChange={(value) => setBulkEmailForm(prev => ({ ...prev, templateId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates && emailTemplates.length > 0 ? (
                    emailTemplates.map((template: any) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No templates available - Create one in Communication
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-email-offer-price">Offer Price (Optional)</Label>
              <Input
                id="bulk-email-offer-price"
                value={bulkEmailForm.offerPrice}
                onChange={(e) => setBulkEmailForm(prev => ({ ...prev, offerPrice: e.target.value }))}
                placeholder="150000"
              />
              <p className="text-xs text-muted-foreground">Same offer price will be used for all properties</p>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-60 overflow-y-auto">
              <p className="text-sm font-semibold mb-3">Recipients ({selectedPropertyIds.filter(id => {
                const prop = properties?.find(p => p.id === id);
                return prop?.seller_agent_email;
              }).length} with email):</p>
              <div className="space-y-2">
                {selectedPropertyIds.map(id => {
                  const property = properties?.find(p => p.id === id);
                  if (!property) return null;
                  const hasEmail = property.seller_agent_email;
                  return (
                    <div key={id} className={`text-xs p-2 rounded border ${hasEmail ? 'bg-white dark:bg-gray-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                      <p className="font-semibold">{property.address}</p>
                      <p className="text-muted-foreground">
                        Agent: {property.seller_agent_name || 'Unknown'} 
                        {hasEmail ? ` | ${property.seller_agent_email}` : ' | ⚠️ No email available'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setIsSendingBulkEmail(false)} className="w-full sm:w-auto text-sm">
                Cancel
              </Button>
              <Button onClick={() => {
                if (!bulkEmailForm.templateId) {
                  toast({
                    title: "Template required",
                    description: "Please select an email template",
                    variant: "destructive",
                  });
                  return;
                }
                const recipientCount = selectedPropertyIds.filter(id => {
                  const prop = properties?.find(p => p.id === id);
                  return prop?.seller_agent_email;
                }).length;
                toast({
                  title: "Emails Sent!",
                  description: `${recipientCount} emails sent successfully`,
                });
                setIsSendingBulkEmail(false);
                setBulkEmailForm({ templateId: "", offerPrice: "" });
              }} className="w-full sm:w-auto text-sm">
                Send All Emails
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Send SMS Dialog */}
      <Dialog open={isSendingBulkSMS} onOpenChange={setIsSendingBulkSMS}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Send SMS to {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'Agent' : 'Agents'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-sms-message">Message *</Label>
              <Textarea
                id="bulk-sms-message"
                value={bulkSMSMessage}
                onChange={(e) => setBulkSMSMessage(e.target.value)}
                placeholder="Hi {agent_name}, I'm interested in your property at {address}..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {"{agent_name}"}, {"{address}"}, {"{price}"}, {"{beds}"}, {"{baths}"}
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-60 overflow-y-auto">
              <p className="text-sm font-semibold mb-3">Recipients ({selectedPropertyIds.filter(id => {
                const prop = properties?.find(p => p.id === id);
                return prop?.seller_agent_phone;
              }).length} with phone):</p>
              <div className="space-y-2">
                {selectedPropertyIds.map(id => {
                  const property = properties?.find(p => p.id === id);
                  if (!property) return null;
                  const hasPhone = property.seller_agent_phone;
                  return (
                    <div key={id} className={`text-xs p-2 rounded border ${hasPhone ? 'bg-white dark:bg-gray-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                      <p className="font-semibold">{property.address}</p>
                      <p className="text-muted-foreground">
                        Agent: {property.seller_agent_name || 'Unknown'} 
                        {hasPhone ? ` | ${property.seller_agent_phone}` : ' | ⚠️ No phone available'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setIsSendingBulkSMS(false)} className="w-full sm:w-auto text-sm">
                Cancel
              </Button>
              <Button onClick={() => {
                if (!bulkSMSMessage.trim()) {
                  toast({
                    title: "Message required",
                    description: "Please enter a message",
                    variant: "destructive",
                  });
                  return;
                }
                const recipientCount = selectedPropertyIds.filter(id => {
                  const prop = properties?.find(p => p.id === id);
                  return prop?.seller_agent_phone;
                }).length;
                toast({
                  title: "SMS Sent!",
                  description: `${recipientCount} messages sent successfully`,
                });
                setIsSendingBulkSMS(false);
                setBulkSMSMessage("");
              }} className="w-full sm:w-auto text-sm">
                Send All SMS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buy Box Analytics Modal */}
      {selectedBuyBoxForAnalytics && (
        <BuyBoxAnalyticsModal
          isOpen={showBuyBoxAnalytics}
          onClose={() => {
            setShowBuyBoxAnalytics(false);
            setSelectedBuyBoxForAnalytics(null);
          }}
          buyBoxId={selectedBuyBoxForAnalytics.id}
          buyBoxName={selectedBuyBoxForAnalytics.name}
        />
      )}
    </div>
  );
}
