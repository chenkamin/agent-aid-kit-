import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, DollarSign, MapPin, Home, Calendar, Ruler, Clock, Phone, Mail, FileText, Video, CheckCircle2, List, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Search, ChevronDown, ChevronUp, Download, Info, MessageSquare, Trash2, UserCircle, Check, Upload, Send, Flame, ThermometerSun, Snowflake, Edit, Target, Loader2, Sparkles, FileDown, Image, BedDouble, Bath, Square, Car, Bell, User } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { useState, useEffect, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import BuyBoxAnalyticsModal from "@/components/BuyBoxAnalyticsModal";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  const isMobile = useIsMobile();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [editedProperty, setEditedProperty] = useState<any>(null);

  // Mark that user has viewed properties page (for onboarding)
  useEffect(() => {
    const markPropertiesViewed = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_viewed_properties: true })
          .eq('id', user.id);
      }
    };
    markPropertiesViewed();
  }, []);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isBulkAddingActivity, setIsBulkAddingActivity] = useState(false);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
    status: [] as string[],
    buyBoxId: [] as string[],
    minPrice: "",
    maxPrice: "",
    minBedrooms: "",
    maxBedrooms: "",
    homeType: [] as string[],
    workflowState: [] as string[],
    urgency: [] as string[],
    assignedTo: [] as string[],
    hasSellerDetails: [] as string[],
    leadScore: [] as string[],
    smsStatus: [] as string[],  // "contacted", "not-contacted", "awaiting-reply", "replied"
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
    templateId: "",
  });
  // Chat-style SMS interface state
  const [smsMessageText, setSmsMessageText] = useState("");
  const [chatSelectedTemplateId, setChatSelectedTemplateId] = useState("");
  const smsMessagesEndRef = useRef<HTMLDivElement>(null);
  const [contactSelectorOpen, setContactSelectorOpen] = useState(false);
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);
  const [isSendingBulkEmailInProgress, setIsSendingBulkEmailInProgress] = useState(false);
  const [bulkEmailForm, setBulkEmailForm] = useState({
    templateId: "",
    offerPrice: "",
  });
  const [isSendingBulkSMS, setIsSendingBulkSMS] = useState(false);
  const [bulkSMSTemplateId, setBulkSMSTemplateId] = useState("");
  const [bulkSMSOfferPrice, setBulkSMSOfferPrice] = useState("");
  const [isSendingBulkSMSInProgress, setIsSendingBulkSMSInProgress] = useState(false);
  const [showBuyBoxAnalytics, setShowBuyBoxAnalytics] = useState(false);
  const [selectedBuyBoxForAnalytics, setSelectedBuyBoxForAnalytics] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isAddingComp, setIsAddingComp] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [isScrapingComps, setIsScrapingComps] = useState(false);
  const [compForm, setCompForm] = useState({
    address: "",
    zillow_link: "",
    price: "",
    grade: "middle",
    description: "",
  });
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    recipientId: "",
    message: "",
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
      setFilters((prev) => ({ ...prev, buyBoxId: [buyBoxIdFromUrl] }));
      setShowFilters(true);
      // Remove the query parameter after applying it
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Apply lead score filter from URL parameter
  useEffect(() => {
    const leadScoreFromUrl = searchParams.get('leadScore');
    if (leadScoreFromUrl) {
      console.log('🔥 Setting leadScore filter from URL:', leadScoreFromUrl);
      setFilters((prev) => ({ ...prev, leadScore: [leadScoreFromUrl] }));
      setShowFilters(true);
      // Remove the query parameter after applying it
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Get property ID from URL
  const propertyIdFromUrl = searchParams.get('propertyId');
  
  // Fetch specific property from URL parameter
  const { data: urlProperty, isLoading: urlPropertyLoading } = useQuery({
    queryKey: ["property-from-url", propertyIdFromUrl],
    queryFn: async () => {
      if (!propertyIdFromUrl) return null;
      console.log('🔍 Fetching property from URL:', propertyIdFromUrl);
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyIdFromUrl)
        .single();
      
      if (error) {
        console.error('❌ Error fetching property from URL:', error);
        return null;
      }
      console.log('✅ Property fetched from URL:', data);
      return data;
    },
    enabled: !!propertyIdFromUrl,
  });
  
  // Fetch user's company first
  const { data: userCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("team_members")
        .select("company_id, companies(id, name, discount_percentage)")
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
    
    // Filter by status (multiple selection)
    if (filters.status.length > 0) {
      query = query.in("status", filters.status);
    }
    
    // Filter by buy box (multiple selection)
    if (filters.buyBoxId.length > 0) {
      query = query.in("buy_box_id", filters.buyBoxId);
    }
    
    // Filter by workflow state (multiple selection)
    if (filters.workflowState.length > 0) {
      query = query.in("workflow_state", filters.workflowState);
    }
    
    // Filter by home type (multiple selection)
    if (filters.homeType.length > 0) {
      query = query.in("home_type", filters.homeType);
    }
    
    // Filter by urgency (multiple selection)
    if (filters.urgency.length > 0) {
      const urgencyNumbers = filters.urgency.map(u => parseInt(u));
      query = query.in("urgency", urgencyNumbers);
    }
    
    // Filter by assigned user (multiple selection)
    if (filters.assignedTo.length > 0) {
      if (filters.assignedTo.includes("unassigned") && filters.assignedTo.length === 1) {
        // Only unassigned selected
        query = query.is("assigned_to", null);
      } else if (filters.assignedTo.includes("unassigned")) {
        // Unassigned + other users selected
        const userIds = filters.assignedTo.filter(id => id !== "unassigned");
        query = query.or(`assigned_to.is.null,assigned_to.in.(${userIds.join(",")})`);
      } else {
        // Only specific users selected
        query = query.in("assigned_to", filters.assignedTo);
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
    
    // Filter by seller details availability (multiple selection)
    if (filters.hasSellerDetails.length > 0) {
      if (filters.hasSellerDetails.includes("yes") && filters.hasSellerDetails.includes("no")) {
        // Both selected = show all
      } else if (filters.hasSellerDetails.includes("yes")) {
      query = query.or("seller_agent_name.neq.null,seller_agent_email.neq.null,seller_agent_phone.neq.null");
      } else if (filters.hasSellerDetails.includes("no")) {
      query = query.is("seller_agent_name", null)
                  .is("seller_agent_email", null)
                  .is("seller_agent_phone", null);
      }
    }
    
    return query;
  };

  // Fetch property IDs based on SMS status filter
  const { data: smsStatusPropertyIds } = useQuery({
    queryKey: ["sms-status-properties", userCompany?.company_id, filters.smsStatus],
    queryFn: async () => {
      if (!userCompany?.company_id || filters.smsStatus.length === 0) {
        return null;
      }

      console.log('📱 Fetching SMS status property IDs for:', filters.smsStatus);

      // Query all SMS messages to determine status per property
      const { data, error } = await supabase
        .from("sms_messages")
        .select("property_id, direction")
        .eq("company_id", userCompany.company_id)
        .not("property_id", "is", null);

      if (error) {
        console.error("❌ Error fetching SMS for status filter:", error);
        return null;
      }

      // Group by property_id and track outgoing/incoming
      const statusMap = new Map<string, { hasOutgoing: boolean; hasIncoming: boolean }>();
      for (const sms of data || []) {
        if (!sms.property_id) continue;
        if (!statusMap.has(sms.property_id)) {
          statusMap.set(sms.property_id, { hasOutgoing: false, hasIncoming: false });
        }
        const entry = statusMap.get(sms.property_id)!;
        if (sms.direction === "outgoing") entry.hasOutgoing = true;
        if (sms.direction === "incoming") entry.hasIncoming = true;
      }

      // Collect property IDs that match ANY of the selected filters
      const matchingPropertyIds = new Set<string>();
      
      for (const filter of filters.smsStatus) {
        if (filter === "contacted") {
          // Has outgoing messages
          for (const [propertyId, status] of statusMap) {
            if (status.hasOutgoing) matchingPropertyIds.add(propertyId);
          }
        } else if (filter === "awaiting-reply") {
          // Has outgoing but no incoming
          for (const [propertyId, status] of statusMap) {
            if (status.hasOutgoing && !status.hasIncoming) matchingPropertyIds.add(propertyId);
          }
        } else if (filter === "replied") {
          // Has incoming messages
          for (const [propertyId, status] of statusMap) {
            if (status.hasIncoming) matchingPropertyIds.add(propertyId);
          }
        }
      }

      // Handle "not-contacted" - properties with NO outgoing messages
      if (filters.smsStatus.includes("not-contacted")) {
        // Get all property IDs that have outgoing messages
        const idsWithOutgoing = Array.from(statusMap.entries())
          .filter(([_, status]) => status.hasOutgoing)
          .map(([propertyId]) => propertyId);
        
        console.log(`📭 Found ${idsWithOutgoing.length} properties WITH outgoing SMS - will exclude them for "not-contacted"`);
        
        // Return special marker to exclude these properties
        return { type: "not-contacted-exclude", ids: idsWithOutgoing, includeIds: Array.from(matchingPropertyIds) } as any;
      }

      const matchingIds = Array.from(matchingPropertyIds);
      console.log(`📱 Found ${matchingIds.length} properties matching SMS status filters:`, filters.smsStatus);
      return matchingIds;
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch property IDs with SMS leads based on score filter
  const { data: leadScorePropertyIds } = useQuery({
    queryKey: ["lead-score-properties", userCompany?.company_id, filters.leadScore],
    queryFn: async () => {
      if (!userCompany?.company_id || filters.leadScore.length === 0) {
        console.log('⏭️ Skipping lead score query - leadScore:', filters.leadScore);
        return null;
      }
      
      // Check if "no-lead" is selected
      const hasNoLead = filters.leadScore.includes("no-lead");
      
      // Map filter values to AI scores (excluding "no-lead")
      const scoreMap: Record<string, number> = {
        hot: 3,
        warm: 2,
        cold: 1
      };
      
      const aiScores = filters.leadScore
        .filter(score => score !== "no-lead")
        .map(score => scoreMap[score])
        .filter(Boolean);
      
      // If only "no-lead" is selected, fetch all property IDs with INCOMING SMS and return special marker
      if (hasNoLead && aiScores.length === 0) {
        console.log(`📭 Fetching properties WITHOUT incoming SMS messages...`);
        
        const { data, error } = await supabase
          .from("sms_messages")
          .select("property_id")
          .eq("company_id", userCompany.company_id)
          .eq("direction", "incoming")
          .not("property_id", "is", null);
        
        if (error) {
          console.error(`❌ Error fetching incoming SMS properties:`, error);
          return null;
        }
        
        // Get unique property IDs that HAVE incoming SMS (we'll exclude these)
        const idsWithIncomingSms = Array.from(new Set(data.map(msg => msg.property_id).filter(Boolean)));
        console.log(`📭 Found ${idsWithIncomingSms.length} properties WITH incoming SMS - will exclude them`);
        return { type: "exclude", ids: idsWithIncomingSms } as any;
      }
      
      // If only score-based filters (hot/warm/cold)
      if (aiScores.length > 0 && !hasNoLead) {
        console.log(`🎯 Fetching lead property IDs for scores: ${filters.leadScore.join(', ')} (${aiScores.join(', ')})...`);
        
        const { data, error } = await supabase
          .from("sms_messages")
          .select("property_id")
          .eq("company_id", userCompany.company_id)
          .eq("direction", "incoming")
          .in("ai_score", aiScores)
          .not("property_id", "is", null);
        
        if (error) {
          console.error(`❌ Error fetching lead properties:`, error);
          return null;
        }
        
        // Get unique property IDs
        const uniqueIds = Array.from(new Set(data.map(msg => msg.property_id).filter(Boolean)));
        console.log(`🎯 Found ${uniqueIds.length} properties with lead SMS:`, uniqueIds);
        return uniqueIds;
      }
      
      // If both score-based and "no-lead" are selected, this doesn't make logical sense
      // but we'll handle it by returning null (show all)
      console.log('⚠️ Mixed no-lead and score filters - showing all');
      return null;
    },
    enabled: !!userCompany?.company_id && filters.leadScore.length > 0,
  });

  // Fetch SMS status (outgoing/incoming) per property
  const { data: propertySmsStatus } = useQuery({
    queryKey: ["property-sms-status", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return new Map();
      
      const { data, error } = await supabase
        .from("sms_messages")
        .select("property_id, direction")
        .eq("company_id", userCompany.company_id)
        .not("property_id", "is", null);
      
      if (error) {
        console.error("Error fetching SMS status:", error);
        return new Map();
      }
      
      // Group by property_id and track outgoing/incoming
      const statusMap = new Map<string, { hasOutgoing: boolean; hasIncoming: boolean }>();
      for (const sms of data || []) {
        if (!sms.property_id) continue;
        if (!statusMap.has(sms.property_id)) {
          statusMap.set(sms.property_id, { hasOutgoing: false, hasIncoming: false });
        }
        const entry = statusMap.get(sms.property_id)!;
        if (sms.direction === "outgoing") entry.hasOutgoing = true;
        if (sms.direction === "incoming") entry.hasIncoming = true;
      }
      return statusMap;
    },
    enabled: !!userCompany?.company_id,
  });

  // Get total count of properties for pagination
  const { data: totalCount } = useQuery({
    queryKey: ["properties-count", userCompany?.company_id, filters, searchQuery, leadScorePropertyIds, smsStatusPropertyIds],
    queryFn: async () => {
      if (!userCompany?.company_id) return 0;
      
      // If filtering by lead score but no properties have that score, return 0
      if (filters.leadScore.length > 0 && Array.isArray(leadScorePropertyIds) && leadScorePropertyIds.length === 0) {
        return 0;
      }
      
      // If filtering by SMS status but no properties match, return 0
      if (filters.smsStatus.length > 0 && Array.isArray(smsStatusPropertyIds) && smsStatusPropertyIds.length === 0) {
        return 0;
      }
      
      let query = supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("company_id", userCompany.company_id);
      
      // Filter by lead score property IDs if applicable
      if (filters.leadScore.length > 0 && leadScorePropertyIds) {
        if ((leadScorePropertyIds as any).type === "exclude") {
          // Exclude properties with SMS messages
          const idsToExclude = (leadScorePropertyIds as any).ids;
          if (idsToExclude.length > 0) {
            query = query.not("id", "in", `(${idsToExclude.join(",")})`);
          }
        } else if (Array.isArray(leadScorePropertyIds) && leadScorePropertyIds.length > 0) {
          // Include only properties with specific lead scores
          query = query.in("id", leadScorePropertyIds);
        }
      }
      
      // Filter by SMS status property IDs if applicable
      if (filters.smsStatus.length > 0 && smsStatusPropertyIds) {
        if ((smsStatusPropertyIds as any).type === "not-contacted-exclude") {
          // Handle "not-contacted" case: exclude properties with outgoing SMS
          const idsToExclude = (smsStatusPropertyIds as any).ids;
          const includeIds = (smsStatusPropertyIds as any).includeIds;
          
          if (includeIds.length > 0) {
            // If there are other filters too (contacted/awaiting/replied), include those IDs
            if (idsToExclude.length > 0) {
              query = query.or(`id.in.(${includeIds.join(",")}),id.not.in.(${idsToExclude.join(",")})`);
            } else {
              query = query.in("id", includeIds);
            }
          } else {
            // Only "not-contacted" filter - exclude properties with outgoing SMS
            if (idsToExclude.length > 0) {
              query = query.not("id", "in", `(${idsToExclude.join(",")})`);
            }
          }
        } else if (Array.isArray(smsStatusPropertyIds) && smsStatusPropertyIds.length > 0) {
          // Include only properties with specific SMS statuses
          query = query.in("id", smsStatusPropertyIds);
        }
      }
      
      // Apply all other filters
      query = applyFiltersToQuery(query);
      
      const { count, error } = await query;
      
      if (error) {
        console.error("Error fetching count:", error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!userCompany?.company_id && (filters.leadScore.length === 0 || leadScorePropertyIds !== undefined) && (filters.smsStatus.length === 0 || smsStatusPropertyIds !== undefined),
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties", userCompany?.company_id, filters, searchQuery, currentPage, itemsPerPage, leadScorePropertyIds, smsStatusPropertyIds],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      
      console.log('📊 Fetching properties with filters:', {
        leadScore: filters.leadScore,
        leadScorePropertyIds: Array.isArray(leadScorePropertyIds) ? leadScorePropertyIds.length : leadScorePropertyIds,
        smsStatus: filters.smsStatus,
        smsStatusPropertyIds: Array.isArray(smsStatusPropertyIds) ? smsStatusPropertyIds.length : smsStatusPropertyIds
      });
      
      // If filtering by lead score but no properties have that score, return empty
      if (filters.leadScore.length > 0 && Array.isArray(leadScorePropertyIds) && leadScorePropertyIds.length === 0) {
        console.log(`⚠️ No properties with selected lead scores found - returning empty`);
        return [];
      }
      
      // If filtering by SMS status but no properties match, return empty
      if (filters.smsStatus.length > 0 && Array.isArray(smsStatusPropertyIds) && smsStatusPropertyIds.length === 0) {
        console.log(`⚠️ No properties with selected SMS status found - returning empty`);
        return [];
      }
      
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      let query = supabase
        .from("properties")
        .select("*, buy_boxes(name)")  // Join with buy_boxes table to get name
        .eq("company_id", userCompany.company_id);
      
      // Filter by lead score property IDs if applicable
      if (filters.leadScore.length > 0 && leadScorePropertyIds) {
        if ((leadScorePropertyIds as any).type === "exclude") {
          // Exclude properties with SMS messages
          const idsToExclude = (leadScorePropertyIds as any).ids;
          if (idsToExclude.length > 0) {
            console.log(`📭 Excluding ${idsToExclude.length} properties WITH SMS messages`);
            query = query.not("id", "in", `(${idsToExclude.join(",")})`);
          } else {
            console.log(`📭 No properties have SMS - showing all`);
          }
        } else if (Array.isArray(leadScorePropertyIds) && leadScorePropertyIds.length > 0) {
          // Include only properties with specific lead scores
          console.log(`🎯 Filtering to ${leadScorePropertyIds.length} properties with lead scores:`, leadScorePropertyIds);
          query = query.in("id", leadScorePropertyIds);
        }
      }
      
      // Filter by SMS status property IDs if applicable
      if (filters.smsStatus.length > 0 && smsStatusPropertyIds) {
        if ((smsStatusPropertyIds as any).type === "not-contacted-exclude") {
          // Handle "not-contacted" case: exclude properties with outgoing SMS
          const idsToExclude = (smsStatusPropertyIds as any).ids;
          const includeIds = (smsStatusPropertyIds as any).includeIds;
          
          if (includeIds.length > 0) {
            // If there are other filters too (contacted/awaiting/replied), include those IDs
            console.log(`📱 Including ${includeIds.length} properties with SMS status AND excluding ${idsToExclude.length} contacted properties`);
            if (idsToExclude.length > 0) {
              query = query.or(`id.in.(${includeIds.join(",")}),id.not.in.(${idsToExclude.join(",")})`);
            } else {
              query = query.in("id", includeIds);
            }
          } else {
            // Only "not-contacted" filter - exclude properties with outgoing SMS
            console.log(`📭 Excluding ${idsToExclude.length} contacted properties for "not-contacted" filter`);
            if (idsToExclude.length > 0) {
              query = query.not("id", "in", `(${idsToExclude.join(",")})`);
            }
          }
        } else if (Array.isArray(smsStatusPropertyIds) && smsStatusPropertyIds.length > 0) {
          // Include only properties with specific SMS statuses
          console.log(`📱 Filtering to ${smsStatusPropertyIds.length} properties with SMS status:`, filters.smsStatus);
          query = query.in("id", smsStatusPropertyIds);
        }
      }
      
      // Apply all other filters
      query = applyFiltersToQuery(query);
      
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (error) {
        console.error("❌ Error fetching properties:", error);
        throw error;
      }
      
      console.log(`✅ Fetched ${data?.length || 0} properties (leadScore: ${filters.leadScore}, smsStatus: ${filters.smsStatus})`);
      return data || [];
    },
    enabled: !!userCompany?.company_id && (filters.leadScore.length === 0 || leadScorePropertyIds !== undefined) && (filters.smsStatus.length === 0 || smsStatusPropertyIds !== undefined),
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

  // Open property modal from URL parameter
  useEffect(() => {
    console.log('🔄 URL Effect triggered:', { propertyIdFromUrl, urlProperty: !!urlProperty, urlPropertyLoading, selectedProperty: !!selectedProperty });
    
    if (propertyIdFromUrl && urlProperty && !urlPropertyLoading) {
      console.log('📖 Opening modal for property:', urlProperty.address);
      // Only update if it's a different property or no property is selected
      if (!selectedProperty || selectedProperty.id !== propertyIdFromUrl) {
        setSelectedProperty(urlProperty);
        setEditedProperty({ ...urlProperty });
      }
    } else if (!propertyIdFromUrl && selectedProperty) {
      console.log('❌ Closing modal - no URL parameter');
      // Close modal if URL parameter is removed
      setSelectedProperty(null);
      setEditedProperty(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyIdFromUrl, urlProperty, urlPropertyLoading]);

  // Helper functions to manage property modal with URL
  const openPropertyModal = (property: any) => {
    setSelectedProperty(property);
    setEditedProperty({ ...property });
    setSearchParams({ propertyId: property.id });
  };

  const closePropertyModal = () => {
    setSelectedProperty(null);
    setEditedProperty(null);
    setSearchParams({});
  };

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

  // Fetch notifications for selected property
  const { data: propertyNotifications } = useQuery({
    queryKey: ["property-notifications", selectedProperty?.id],
    queryFn: async () => {
      if (!selectedProperty?.id) return [];
      const { data } = await supabase
        .from("notifications")
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

  // Fetch SMS messages for selected property (oldest first for chat view)
  const { data: propertySmsMessages } = useQuery({
    queryKey: ["property-sms", selectedProperty?.id],
    queryFn: async () => {
      if (!selectedProperty?.id) return [];
      const { data } = await supabase
        .from("sms_messages" as any)
        .select("*")
        .eq("property_id", selectedProperty.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedProperty?.id,
  });

  // Query for property email messages
  const { data: propertyEmailMessages } = useQuery({
    queryKey: ["property-emails", selectedProperty?.id],
    queryFn: async () => {
      if (!selectedProperty?.id) return [];
      const { data } = await supabase
        .from("email_messages" as any)
        .select("*")
        .eq("property_id", selectedProperty.id)
        .order("created_at", { ascending: false });
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
        .select("*")
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
    queryKey: ["email_templates", userCompany?.company_id, user?.id],
    queryFn: async () => {
      if (!user?.id || !userCompany?.company_id) return [];
      
      // Fetch both user's templates and default templates
      const { data } = await supabase
        .from("email_templates")
        .select("*")
        .or(`and(company_id.eq.${userCompany.company_id},user_id.eq.${user.id}),is_default.eq.true`)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      
      return data || [];
    },
    enabled: !!user?.id && !!userCompany?.company_id,
  });

  // Fetch SMS templates (user templates + default templates)
  const { data: smsTemplates } = useQuery({
    queryKey: ["sms_templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Fetch both user's templates and default templates
      const { data } = await supabase
        .from("sms_templates")
        .select("*")
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Auto-scroll to bottom of SMS chat when new messages arrive
  useEffect(() => {
    if (propertySmsMessages && propertySmsMessages.length > 0) {
      setTimeout(() => {
        smsMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [propertySmsMessages]);

  // All filters including SMS status are now applied at database level
  const filteredProperties = properties || [];

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
    if (!upcomingActivities || upcomingActivities.length === 0) return null;
    
    const followUps = upcomingActivities.filter(
      (activity: any) => 
        activity.property_id === property.id &&
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
      
      // Determine status based on due date
      let status = 'open';
      if (data.due_at && data.due_at.trim() !== '') {
        const dueDate = new Date(data.due_at);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        // If due date is today or in the past, mark as done
        if (dueDate <= today) {
          status = 'done';
        }
      }
      
      // Prepare activity data - exclude due_at if empty
      const activityData: any = {
        type: data.type,
        title: data.title,
        body: data.body,
        property_id: selectedProperty?.id,
        user_id: user.id,
        company_id: userCompany.company_id,
        status: status,
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

  // Quick follow-up from table
  const handleQuickFollowUp = async (propertyId: string, daysFromNow: number, specificDate?: Date) => {
    if (!user?.id || !userCompany?.company_id) return;
    
    const dueDate = specificDate || new Date();
    if (!specificDate) {
      dueDate.setDate(dueDate.getDate() + daysFromNow);
    }
    dueDate.setHours(9, 0, 0, 0); // Set to 9 AM
    
    const property = properties?.find(p => p.id === propertyId);
    const title = `Follow up: ${property?.address || 'Property'}`;
    
    try {
      const { error } = await supabase.from("activities").insert([{
        property_id: propertyId,
        type: 'follow_up',
        title: title,
        body: '',
        due_at: dueDate.toISOString(),
        user_id: user.id,
        company_id: userCompany.company_id,
        status: 'open',
      }]);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-activities", userCompany?.company_id] });
      toast({
        title: "Follow-up scheduled",
        description: `Follow-up set for ${format(dueDate, 'MMM d, yyyy')}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to schedule follow-up: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const bulkAddActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!userCompany?.company_id) throw new Error("No company found");
      if (selectedPropertyIds.length === 0) throw new Error("No properties selected");
      
      // Determine status based on due date
      let status = 'open';
      if (data.due_at && data.due_at.trim() !== '') {
        const dueDate = new Date(data.due_at);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        // If due date is today or in the past, mark as done
        if (dueDate <= today) {
          status = 'done';
        }
      }
      
      // Prepare activity data for each property
      const activities = selectedPropertyIds.map(propertyId => {
        const activityData: any = {
          type: data.type,
          title: data.title,
          body: data.body,
          property_id: propertyId,
          user_id: user.id,
          company_id: userCompany.company_id,
          status: status,
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

  // Helper function to calculate offer price
  const calculateOfferPrice = (property: any, customOfferPrice?: string): string => {
    console.log('=== calculateOfferPrice START ===');
    console.log('Property:', { 
      address: property.address, 
      buy_box_id: property.buy_box_id, 
      price: property.price 
    });
    console.log('Custom Offer Price:', customOfferPrice);
    console.log('Company Discount %:', userCompany?.companies?.discount_percentage);
    console.log('Available Buy Boxes:', buyBoxes?.length);
    
    // If custom offer price is provided, use it
    if (customOfferPrice && customOfferPrice.trim() !== '') {
      console.log('✓ Using custom offer price:', customOfferPrice);
      return customOfferPrice;
    }

    // Try to calculate from buy box ARV and company discount
    if (property.buy_box_id && userCompany?.companies?.discount_percentage) {
      console.log('✓ Property has buy_box_id, searching for buy box...');
      const buyBox = buyBoxes?.find((bb: any) => bb.id === property.buy_box_id);
      console.log('Found Buy Box:', buyBox ? {
        id: buyBox.id,
        name: buyBox.name,
        arv: buyBox.arv,
        price_min: buyBox.price_min,
        price_max: buyBox.price_max
      } : 'NOT FOUND');
      
      if (buyBox?.arv) {
        const arvValue = Number(buyBox.arv);
        const discountPercent = Number(userCompany.companies.discount_percentage);
        const calculatedPrice = arvValue * (1 - discountPercent / 100);
        const finalPrice = Math.round(calculatedPrice).toString();
        
        console.log('✓ ARV Calculation:');
        console.log(`  ARV: $${arvValue.toLocaleString()}`);
        console.log(`  Discount: ${discountPercent}%`);
        console.log(`  Formula: ${arvValue} × (1 - ${discountPercent}/100)`);
        console.log(`  Result: $${Number(finalPrice).toLocaleString()}`);
        console.log('=== calculateOfferPrice END (using ARV) ===');
        
        return finalPrice;
      } else {
        console.log('✗ Buy box has no ARV, falling back to listing price');
      }
    } else {
      console.log('✗ Missing requirements for ARV calculation:');
      console.log('  - Has buy_box_id?', !!property.buy_box_id);
      console.log('  - Has discount_percentage?', !!userCompany?.companies?.discount_percentage);
    }

    // Fall back to property listing price
    const fallbackPrice = property.price?.toString() || '';
    console.log('✗ Using fallback listing price:', fallbackPrice);
    console.log('=== calculateOfferPrice END (fallback) ===');
    return fallbackPrice;
  };

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: { toEmail: string; agentName: string; templateId: string; offerPrice: string; property: any }) => {
      console.log('sendEmailMutation started', data);
      
      if (!user?.id) {
        console.error('User not authenticated');
        throw new Error("User not authenticated");
      }
      if (!userCompany?.company_id) {
        console.error('No company found');
        throw new Error("No company found");
      }
      
      console.log('Email templates available:', emailTemplates);
      
      // Get the template
      const template = emailTemplates?.find((t: any) => t.id === data.templateId);
      console.log('Found template:', template);
      
      if (!template) {
        console.error('Template not found for ID:', data.templateId);
        throw new Error("Template not found");
      }
      
      // Calculate the offer price using helper function
      const finalOfferPrice = calculateOfferPrice(data.property, data.offerPrice);
      
      // Replace variables in subject and body
      const replaceVariables = (text: string) => {
        return text
          .replace(/\{\{PROPERTY\}\}/g, data.property.address || '')
          .replace(/\{\{PRICE\}\}/g, finalOfferPrice ? `$${Number(finalOfferPrice).toLocaleString()}` : '')
          .replace(/\{\{AGENT_NAME\}\}/g, data.agentName || '')
          .replace(/\{\{BEDROOMS\}\}/g, data.property.bedrooms || '')
          .replace(/\{\{BATHROOMS\}\}/g, data.property.bathrooms || '')
          .replace(/\{\{SQFT\}\}/g, data.property.square_footage || data.property.living_sqf || '');
      };
      
      const emailContent = replaceVariables(template.body);
      const emailSubject = replaceVariables(template.subject);
      
      console.log('Prepared email:', { emailSubject, emailContent });
      
      // Send email via Supabase Edge Function (Nodemailer + Gmail)
      console.log('Invoking send-email-nodemailer function...');
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
      
      console.log('Function response:', { functionData, functionError });
      
      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(functionError.message || 'Failed to send email');
      }
      
      if (!functionData?.success) {
        console.error('Function returned error:', functionData);
        throw new Error(functionData?.error || 'Failed to send email');
      }
      
      // Save email to email_messages table
      const { error: emailError } = await supabase.from("email_messages").insert([{
        company_id: userCompany.company_id,
        property_id: data.property.id,
        direction: 'outgoing',
        from_email: functionData.fromEmail || user.email || '', // Get from function response or user email
        to_email: data.toEmail,
        subject: emailSubject,
        body: emailContent,
        status: 'sent',
        template_id: data.templateId,
        offer_price: data.offerPrice ? parseFloat(data.offerPrice) : null,
        provider_message_id: functionData.messageId || null,
        metadata: {
          agent_name: data.agentName,
          property_address: data.property.address,
          sent_by_user_id: user.id,
        },
      }]);
      
      if (emailError) {
        console.error('Error saving email to database:', emailError);
        // Don't throw - email was sent successfully, just log the error
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
      queryClient.invalidateQueries({ queryKey: ["property-emails", selectedProperty?.id] });
      queryClient.invalidateQueries({ queryKey: ["email-messages-history"] });
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
    console.log('handleSendEmail called', { emailForm, selectedProperty });
    
    if (!emailForm.toEmail || !emailForm.agentName || !emailForm.templateId) {
      console.log('Validation failed', { 
        toEmail: emailForm.toEmail, 
        agentName: emailForm.agentName, 
        templateId: emailForm.templateId 
      });
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Sending email mutation...', emailForm);
    sendEmailMutation.mutate({
      ...emailForm,
      property: selectedProperty
    });
  };

  const handleBulkSendEmail = async () => {
    console.log('handleBulkSendEmail called', { bulkEmailForm, selectedPropertyIds });
    
    if (!bulkEmailForm.templateId) {
      toast({
        title: "Template required",
        description: "Please select an email template",
        variant: "destructive",
      });
      return;
    }

    // Get properties with valid email addresses
    const propertiesWithEmail = selectedPropertyIds
      .map(id => properties?.find(p => p.id === id))
      .filter(prop => prop && prop.seller_agent_email);

    if (propertiesWithEmail.length === 0) {
      toast({
        title: "No recipients",
        description: "None of the selected properties have agent email addresses",
        variant: "destructive",
      });
      return;
    }

    console.log(`Sending ${propertiesWithEmail.length} emails...`);
    setIsSendingBulkEmailInProgress(true);

    let successCount = 0;
    let failCount = 0;

    // Send emails sequentially
    for (const property of propertiesWithEmail) {
      try {
        await sendEmailMutation.mutateAsync({
          toEmail: property.seller_agent_email!,
          agentName: property.seller_agent_name || 'Agent',
          templateId: bulkEmailForm.templateId,
          offerPrice: bulkEmailForm.offerPrice,
          property: property
        });
        successCount++;
        console.log(`Email ${successCount}/${propertiesWithEmail.length} sent to ${property.address}`);
      } catch (error) {
        console.error(`Failed to send email to ${property.address}:`, error);
        failCount++;
      }
    }

    setIsSendingBulkEmailInProgress(false);
    
    // Show result toast
    if (successCount > 0) {
      toast({
        title: "Emails Sent!",
        description: `${successCount} email${successCount === 1 ? '' : 's'} sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
    }
    
    if (failCount > 0 && successCount === 0) {
      toast({
        title: "Failed to send emails",
        description: `All ${failCount} emails failed to send`,
        variant: "destructive",
      });
    }

    // Close dialog and reset form
    setIsSendingBulkEmail(false);
    setBulkEmailForm({ templateId: "", offerPrice: "" });
    setSelectedPropertyIds([]);
  };

  const handleBulkSendSMS = async () => {
    console.log('handleBulkSendSMS called', { bulkSMSTemplateId, bulkSMSOfferPrice, selectedPropertyIds });
    
    // Validate template selection
    if (!bulkSMSTemplateId) {
      toast({
        title: "Template required",
        description: "Please select an SMS template",
        variant: "destructive",
      });
      return;
    }

    // Get the template
    const template = smsTemplates?.find((t: any) => t.id === bulkSMSTemplateId);
    if (!template) {
      toast({
        title: "Template not found",
        description: "The selected template could not be found",
        variant: "destructive",
      });
      return;
    }

    // Get properties with valid phone numbers
    const propertiesWithPhone = selectedPropertyIds
      .map(id => properties?.find(p => p.id === id))
      .filter(prop => prop && prop.seller_agent_phone);

    if (propertiesWithPhone.length === 0) {
      toast({
        title: "No recipients",
        description: "None of the selected properties have agent phone numbers",
        variant: "destructive",
      });
      return;
    }

    console.log(`Sending ${propertiesWithPhone.length} SMS messages...`);
    setIsSendingBulkSMSInProgress(true);

    let successCount = 0;
    let failCount = 0;

    // Send SMS messages sequentially
    for (const property of propertiesWithPhone) {
      try {
        // Calculate offer price for this property (use custom price or calculate from ARV)
        const calculatedOfferPrice = calculateOfferPrice(property, bulkSMSOfferPrice);
        const formattedPrice = calculatedOfferPrice ? `$${Number(calculatedOfferPrice).toLocaleString()}` : 'N/A';
        
        // Replace template variables (support both single and double curly braces)
        const finalMessage = template.body
          // Double curly braces format ({{VARIABLE}})
          .replace(/\{\{AGENT_NAME\}\}/gi, property.seller_agent_name || '')
          .replace(/\{\{PROPERTY\}\}/gi, property.address || 'N/A')
          .replace(/\{\{ADDRESS\}\}/gi, property.address || 'N/A')
          .replace(/\{\{PRICE\}\}/gi, formattedPrice)
          .replace(/\{\{BEDROOMS\}\}/gi, property.bedrooms?.toString() || 'N/A')
          .replace(/\{\{BEDS\}\}/gi, property.bedrooms?.toString() || 'N/A')
          .replace(/\{\{BATHROOMS\}\}/gi, property.bathrooms?.toString() || 'N/A')
          .replace(/\{\{BATHS\}\}/gi, property.bathrooms?.toString() || 'N/A')
          .replace(/\{\{SQFT\}\}/gi, property.square_footage?.toString() || property.living_sqf?.toString() || 'N/A')
          // Single curly braces format ({variable})
          .replace(/\{agent_name\}/gi, property.seller_agent_name || '')
          .replace(/\{address\}/gi, property.address || 'N/A')
          .replace(/\{price\}/gi, formattedPrice)
          .replace(/\{beds\}/gi, property.bedrooms?.toString() || 'N/A')
          .replace(/\{baths\}/gi, property.bathrooms?.toString() || 'N/A');

        await sendSMSMutation.mutateAsync({
          to: property.seller_agent_phone!,
          message: finalMessage,
          propertyId: property.id,
          agentName: property.seller_agent_name || property.seller_agent_phone!,
        });
        successCount++;
        console.log(`SMS ${successCount}/${propertiesWithPhone.length} sent to ${property.address}`);
      } catch (error) {
        console.error(`Failed to send SMS to ${property.address}:`, error);
        failCount++;
      }
    }

    setIsSendingBulkSMSInProgress(false);
    
    // Show result toast
    if (successCount > 0) {
      toast({
        title: "SMS Sent!",
        description: `${successCount} message${successCount === 1 ? '' : 's'} sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
    }
    
    if (failCount > 0 && successCount === 0) {
      toast({
        title: "Failed to send SMS",
        description: `All ${failCount} messages failed to send`,
        variant: "destructive",
      });
    }

    // Close dialog and reset form
    setIsSendingBulkSMS(false);
    setBulkSMSTemplateId("");
    setBulkSMSOfferPrice("");
    setSelectedPropertyIds([]);
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

  const handleImportProperties = async () => {
    if (!importFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id || !userCompany?.company_id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileText = await importFile.text();
      const lines = fileText.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "CSV file is empty or invalid",
          variant: "destructive",
        });
        return;
      }

      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredFields = ['address'];
      const missingFields = requiredFields.filter(f => !headers.includes(f));
      
      if (missingFields.length > 0) {
        toast({
          title: "Error",
          description: `Missing required fields: ${missingFields.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Parse CSV rows
      const properties = [];
      const errors: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim());
          const property: any = {};

          headers.forEach((header, index) => {
            const value = values[index];
            if (value && value !== '') {
              switch (header) {
                case 'address':
                  property.address = value;
                  break;
                case 'city':
                  property.city = value;
                  break;
                case 'state':
                  property.state = value;
                  break;
                case 'zip':
                  property.zip = value;
                  break;
                case 'neighborhood':
                  property.neighborhood = value;
                  break;
                case 'status':
                  property.status = value;
                  break;
                case 'price': {
                  const price = parseFloat(value);
                  if (!isNaN(price)) property.price = price;
                  break;
                }
                case 'bedrooms':
                case 'bed': {
                  const bed = parseFloat(value);
                  if (!isNaN(bed)) {
                    property.bedrooms = bed;
                    property.bed = bed;
                  }
                  break;
                }
                case 'bathrooms':
                case 'bath': {
                  const bath = parseFloat(value);
                  if (!isNaN(bath)) {
                    property.bathrooms = bath;
                    property.bath = bath;
                  }
                  break;
                }
                case 'square_footage':
                case 'living_sqf': {
                  const sqft = parseFloat(value);
                  if (!isNaN(sqft)) {
                    property.square_footage = sqft;
                    property.living_sqf = sqft;
                  }
                  break;
                }
                case 'year_built': {
                  const year = parseInt(value);
                  if (!isNaN(year)) property.year_built = year;
                  break;
                }
                case 'home_type':
                case 'property_type':
                  property.home_type = value;
                  property.property_type = value;
                  break;
                case 'description':
                  property.description = value;
                  break;
                case 'notes':
                  property.notes = value;
                  break;
                case 'seller_agent_name':
                case 'agent_name':
                  property.seller_agent_name = value;
                  break;
                case 'seller_agent_phone':
                case 'agent_phone':
                  property.seller_agent_phone = value;
                  break;
                case 'seller_agent_email':
                case 'agent_email':
                  property.seller_agent_email = value;
                  break;
              }
            }
          });

          if (!property.address) {
            errors.push(`Row ${i + 1}: Missing required field 'address'`);
            continue;
          }

          // Add required fields
          property.user_id = user.id;
          property.company_id = userCompany.company_id;
          property.source = 'Manual Import';
          
          properties.push(property);
        } catch (error: any) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      if (properties.length === 0) {
        toast({
          title: "Error",
          description: "No valid properties found in CSV file",
          variant: "destructive",
        });
        setImportErrors(errors);
        return;
      }

      // Import properties in batches
      setImportProgress({ current: 0, total: properties.length });
      let successCount = 0;
      
      for (let i = 0; i < properties.length; i++) {
        try {
          const { error } = await supabase
            .from('properties')
            .insert(properties[i]);

          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (error: any) {
          errors.push(`Row ${i + 2}: ${error.message}`);
        }
        
        setImportProgress({ current: i + 1, total: properties.length });
      }

      // Refresh the properties list
      queryClient.invalidateQueries({ queryKey: ["properties"] });

      if (successCount > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${successCount} of ${properties.length} properties`,
        });
      }

      if (errors.length > 0) {
        setImportErrors(errors);
      } else {
        // Close dialog if no errors
        setTimeout(() => {
          setIsImporting(false);
          setImportFile(null);
          setImportProgress({ current: 0, total: 0 });
        }, 1000);
      }

    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import properties",
        variant: "destructive",
      });
    }
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
    mutationFn: async (data: { to: string; message: string; propertyId?: string; agentName?: string }) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!userCompany?.company_id) throw new Error("No company found");

      const { data: responseData, error } = await supabase.functions.invoke('send-sms', {
        body: {
          type: 'single',
          to: data.to,
          message: data.message,
          propertyId: data.propertyId,
        },
      });

      if (error) throw error;

      // Create activity for SMS
      if (data.propertyId) {
        const { error: activityError } = await supabase.from("activities").insert([{
          type: 'sms',
          title: `SMS sent to ${data.agentName || data.to}`,
          body: data.message,
          property_id: data.propertyId,
          user_id: user.id,
          company_id: userCompany.company_id,
          status: 'done',
        }]);
        
        if (activityError) {
          console.error('Error creating SMS activity:', activityError);
          // Don't throw - SMS was sent successfully
        }
      }

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
        templateId: "",
      });
      // Invalidate property SMS messages if we sent to a specific property
      if (variables.propertyId) {
        queryClient.invalidateQueries({ queryKey: ["property-sms", variables.propertyId] });
      }
      // Invalidate communication history
      queryClient.invalidateQueries({ queryKey: ["sms-messages-history"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    },
  });

  // Handle sending SMS from chat interface
  const handleSendChatSMS = async () => {
    if (!smsMessageText.trim()) return;
    
    const toPhone = selectedProperty?.seller_agent_phone;
    if (!toPhone) {
      toast({
        title: "Error",
        description: "No phone number available for this property",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await sendSMSMutation.mutateAsync({
        to: toPhone,
        message: smsMessageText,
        propertyId: selectedProperty?.id,
        agentName: selectedProperty?.seller_agent_name || toPhone,
      });
      
      setSmsMessageText("");
      setChatSelectedTemplateId("");
      
      // Scroll to bottom after sending
      setTimeout(() => {
        smsMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      // Error is handled by the mutation's onError
      console.error('Failed to send SMS:', error);
    }
  };

  // Update property mutation
  // Debounce timer ref for auto-save
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      // Removed toast notification for auto-save to avoid spam
    },
    onError: (error: any) => {
      toast({
        title: "Error saving property",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const handlePropertyFieldChange = (field: string, value: any) => {
    // Update local state immediately for responsive UI
    setEditedProperty((prev: any) => {
      if (!prev) return prev;
      
      const updatedData = {
        ...prev,
        [field]: value,
      };
      
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Set new timer for auto-save (debounce 1000ms)
      autoSaveTimerRef.current = setTimeout(() => {
        // Remove computed/generated columns and joined relationships that cannot be updated
        const { 
          price_per_sqft, 
          ppsf, 
          created_at, 
          updated_at, 
          buy_boxes,  // Joined relationship, not a direct column
          ...updateData 
        } = updatedData;
      
        // Only save if there's actual data to update
        if (Object.keys(updateData).length > 0 && selectedProperty?.id) {
          updatePropertyMutation.mutate(updateData);
        }
      }, 1000);
      
      return updatedData;
    });
  };

  const addCompMutation = useMutation({
    mutationFn: async (comp: { address: string; zillow_link: string; price: string; grade: string; description: string }) => {
      if (!selectedProperty?.id) throw new Error("No property selected");
      
      // Get existing comps from the property
      const existingComps = selectedProperty.comps || [];
      
      let updatedComps;
      if (editingCompId) {
        // Edit existing comp
        updatedComps = existingComps.map((c: any) => 
          c.id === editingCompId ? { ...comp, id: editingCompId } : c
        );
      } else {
        // Add new comp to the array
        updatedComps = [...existingComps, { ...comp, id: Date.now().toString() }];
      }
      
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
        description: editingCompId ? "Comp updated successfully" : "Comp added successfully",
      });
      setIsAddingComp(false);
      setEditingCompId(null);
      setCompForm({ address: "", zillow_link: "", price: "", grade: "middle", description: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || (editingCompId ? "Failed to update comp" : "Failed to add comp"),
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

  // Scrape comps mutation
  const scrapeCompsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProperty?.id) throw new Error("No property selected");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-comp-details`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ propertyId: selectedProperty.id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scrape comps');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.comps) {
        setSelectedProperty((prev: any) => ({ ...prev, comps: data.comps }));
        setEditedProperty((prev: any) => ({ ...prev, comps: data.comps }));
      }
      queryClient.invalidateQueries({ queryKey: ["properties", userCompany?.company_id] });
      toast({
        title: "Success",
        description: `Generated report for ${data.processed} comps${data.errors > 0 ? ` (${data.errors} with errors)` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate comps report",
        variant: "destructive",
      });
    },
  });

  // Export comps to CSV
  const exportCompsToCSV = () => {
    if (!selectedProperty?.comps || selectedProperty.comps.length === 0) {
      toast({
        title: "No comps to export",
        description: "Add some comparable properties first",
        variant: "destructive",
      });
      return;
    }

    const comps = selectedProperty.comps;
    const headers = [
      'Address', 'Price', 'Grade', 'Bedrooms', 'Bathrooms', 'Sqft', 
      'Lot Size', 'Year Built', 'Home Type', 'Garage', 'Days on Market',
      'Description', 'Zillow Link'
    ];

    const csvRows = [
      headers.join(','),
      ...comps.map((comp: any) => [
        `"${comp.address || ''}"`,
        comp.price || '',
        comp.grade || '',
        comp.bedrooms || '',
        comp.bathrooms || '',
        comp.sqft || '',
        `"${comp.lot_size || ''}"`,
        comp.year_built || '',
        `"${comp.home_type || ''}"`,
        `"${comp.garage || ''}"`,
        comp.days_on_market || '',
        `"${(comp.description || '').replace(/"/g, '""')}"`,
        `"${comp.zillow_link || ''}"`,
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comps-${selectedProperty.address?.replace(/[^a-z0-9]/gi, '_') || 'property'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: "Export Complete",
      description: "Comps exported to CSV successfully",
    });
  };

  // Export comps to PDF
  const exportCompsToPDF = async () => {
    if (!selectedProperty?.comps || selectedProperty.comps.length === 0) {
      toast({
        title: "No comps to export",
        description: "Add some comparable properties first",
        variant: "destructive",
      });
      return;
    }

    // Dynamic import of jspdf
    let jsPDF: any;
    try {
      const module = await import('jspdf');
      jsPDF = module.jsPDF;
    } catch {
      toast({
        title: "PDF Export Not Available",
        description: "Please install jspdf: npm install jspdf",
        variant: "destructive",
      });
      return;
    }
    const doc = new jsPDF();
    
    const comps = selectedProperty.comps;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.text('Comparable Properties Report', pageWidth / 2, 20, { align: 'center' });
    
    // Subject Property
    doc.setFontSize(12);
    doc.text(`Subject Property: ${selectedProperty.address || 'N/A'}`, 14, 35);
    doc.text(`${selectedProperty.city || ''}, ${selectedProperty.state || ''} ${selectedProperty.zip || ''}`, 14, 42);
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 14, 49);
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(14, 55, pageWidth - 14, 55);
    
    let yPos = 65;
    
    comps.forEach((comp: any, index: number) => {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      // Comp header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${comp.address || 'No Address'}`, 14, yPos);
      
      // Grade badge color indicator
      const gradeColor = comp.grade === 'high' ? '#22c55e' : comp.grade === 'low' ? '#ef4444' : '#eab308';
      doc.setFillColor(gradeColor);
      doc.roundedRect(pageWidth - 35, yPos - 5, 20, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(comp.grade?.toUpperCase() || 'MID', pageWidth - 32, yPos);
      doc.setTextColor(0, 0, 0);
      
      yPos += 10;
      
      // Comp details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const details = [
        `Price: $${Number(comp.price || 0).toLocaleString()}`,
        comp.bedrooms ? `Beds: ${comp.bedrooms}` : null,
        comp.bathrooms ? `Baths: ${comp.bathrooms}` : null,
        comp.sqft ? `Sqft: ${comp.sqft.toLocaleString()}` : null,
        comp.year_built ? `Year: ${comp.year_built}` : null,
        comp.home_type ? `Type: ${comp.home_type}` : null,
      ].filter(Boolean);
      
      doc.text(details.join('  |  '), 14, yPos);
      yPos += 7;
      
      if (comp.lot_size || comp.garage) {
        const extraDetails = [
          comp.lot_size ? `Lot: ${comp.lot_size}` : null,
          comp.garage ? `Garage: ${comp.garage}` : null,
          comp.days_on_market ? `DOM: ${comp.days_on_market}` : null,
        ].filter(Boolean);
        doc.text(extraDetails.join('  |  '), 14, yPos);
        yPos += 7;
      }
      
      if (comp.description) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const splitDesc = doc.splitTextToSize(comp.description, pageWidth - 28);
        doc.text(splitDesc.slice(0, 2), 14, yPos);
        yPos += splitDesc.slice(0, 2).length * 5;
        doc.setTextColor(0, 0, 0);
      }
      
      yPos += 10;
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by Agent Aid Kit', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    
    // Save
    doc.save(`comps-${selectedProperty.address?.replace(/[^a-z0-9]/gi, '_') || 'property'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: "Export Complete",
      description: "Comps exported to PDF successfully",
    });
  };

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (data: { recipientId: string; message: string; propertyId: string }) => {
      if (!userCompany?.company_id) throw new Error("No company found");
      
      const { error } = await supabase.from("notifications").insert([{
        user_id: data.recipientId,
        company_id: userCompany.company_id,
        title: `Property Notification: ${selectedProperty?.address || "Property"}`,
        message: data.message,
        type: "property_notification",
        property_id: data.propertyId,
        sent_by_user_id: user?.id,
      }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Notification sent!",
        description: "Your team member will be notified",
      });
      setIsSendingNotification(false);
      setNotificationForm({ recipientId: "", message: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    },
  });

  const handleSendNotification = () => {
    if (!notificationForm.recipientId || !notificationForm.message) {
      toast({
        title: "Error",
        description: "Please select a recipient and enter a message",
        variant: "destructive",
      });
      return;
    }
    if (!selectedProperty?.id) {
      toast({
        title: "Error",
        description: "No property selected",
        variant: "destructive",
      });
      return;
    }
    sendNotificationMutation.mutate({
      recipientId: notificationForm.recipientId,
      message: notificationForm.message,
      propertyId: selectedProperty.id,
    });
  };

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
    <div className="space-y-4 md:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">Properties</h1>
          <p className="text-sm md:text-lg text-muted-foreground mt-1 md:mt-2">
            Manage your real estate portfolio
          </p>
        </div>
        <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
          <Dialog open={isCreatingList} onOpenChange={setIsCreatingList}>
            <DialogTrigger asChild>
              <Button size={isMobile ? "default" : "lg"} variant="outline" className="text-sm md:text-base flex-1 sm:flex-none">
                <List className="mr-1 md:mr-2 h-4 md:h-5 w-4 md:w-5" />
                {isMobile ? "List" : "Create List"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto" aria-describedby="create-list-description">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Create Property List</DialogTitle>
                <p id="create-list-description" className="text-xs md:text-sm text-muted-foreground">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PROPERTY_TYPES.map((type) => (
                      <div key={type.value} className="flex items-center space-x-2 border rounded-lg p-2 hover:bg-accent transition-colors">
                        <Checkbox
                          id={`list-type-${type.value}`}
                          checked={selectedListHomeTypes.includes(type.value)}
                          onCheckedChange={() => toggleListHomeType(type.value)}
                        />
                        <label
                          htmlFor={`list-type-${type.value}`}
                          className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1.5"
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

          <Dialog open={isImporting} onOpenChange={(open) => {
            setIsImporting(open);
            if (!open) {
              setImportFile(null);
              setImportErrors([]);
              setImportProgress({ current: 0, total: 0 });
            }
          }}>
            <DialogTrigger asChild>
              <Button size={isMobile ? "default" : "lg"} variant="outline" className="text-sm md:text-base flex-1 sm:flex-none">
                <Upload className="mr-1 md:mr-2 h-4 md:h-5 w-4 md:w-5" />
                {isMobile ? "Import" : "Import"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto" aria-describedby="import-properties-description">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Import Properties</DialogTitle>
                <p id="import-properties-description" className="text-xs md:text-sm text-muted-foreground">
                  Upload a CSV file to import multiple properties at once
                </p>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-4">
                    <div className="flex justify-center">
                      <Upload className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="csv-upload" className="cursor-pointer">
                        <div className="text-sm font-medium">
                          {importFile ? importFile.name : "Choose a CSV file"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Click to browse or drag and drop
                        </div>
                      </Label>
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImportFile(file);
                            setImportErrors([]);
                          }
                        }}
                      />
                    </div>
                    {importFile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setImportFile(null)}
                      >
                        Clear File
                      </Button>
                    )}
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Need a template?</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const csvTemplate = `address,city,state,zip,neighborhood,status,price,bedrooms,bathrooms,square_footage,year_built,home_type,description,notes
123 Main St,Cleveland,OH,44125,Downtown,For Sale,150000,3,2,1500,2000,Single Family,Beautiful home,Great location
456 Oak Ave,Akron,OH,44301,Highland,For Sale,200000,4,2.5,2000,2010,Townhouse,Modern townhouse,Near schools`;
                          const blob = new Blob([csvTemplate], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'property_import_template.csv';
                          a.click();
                          window.URL.revokeObjectURL(url);
                          toast({
                            title: "Template Downloaded",
                            description: "Check your downloads folder for the CSV template",
                          });
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Template
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Download a template CSV file to see the correct format. Required fields: address
                    </p>
                  </div>

                  {importProgress.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Importing properties...</span>
                        <span>{importProgress.current} / {importProgress.total}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {importErrors.length > 0 && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-medium text-destructive">Import Errors:</p>
                      <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                        {importErrors.map((error, index) => (
                          <li key={index} className="text-destructive/90">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsImporting(false)} disabled={importProgress.total > 0 && importProgress.current < importProgress.total}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImportProperties} 
                    disabled={!importFile || (importProgress.total > 0 && importProgress.current < importProgress.total)}
                  >
                    {importProgress.total > 0 && importProgress.current < importProgress.total ? "Importing..." : "Import Properties"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddingProperty} onOpenChange={setIsAddingProperty}>
            <DialogTrigger asChild>
          <Button size={isMobile ? "default" : "lg"} className="text-sm md:text-base flex-1 sm:flex-none">
            <Plus className="mr-1 md:mr-2 h-4 md:h-5 w-4 md:w-5" />
            {isMobile ? "Add" : "Add Property"}
          </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto" aria-describedby="add-property-description">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Add New Property</DialogTitle>
                <p id="add-property-description" className="text-xs md:text-sm text-muted-foreground">
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
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row gap-2 md:gap-4">
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
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          {isMobile ? "Export" : "Export to CSV"}
        </Button>
        {isMobile ? (
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <ChevronDown className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Filter properties by various criteria
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                {/* Filters for mobile */}
                <div className="space-y-2">
                  <Label htmlFor="mobile-filter-status" className="text-sm font-medium">Status</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="mobile-filter-status"
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <span className="truncate">
                          {filters.status.length === 0
                            ? "All Statuses"
                            : filters.status.length === 1
                            ? filters.status[0]
                            : `${filters.status.length} selected`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search status..." />
                        <CommandList>
                          <CommandEmpty>No status found.</CommandEmpty>
                          <CommandGroup>
                            {["For Sale", "Under Contract", "Sold", "Off Market"].map((status) => (
                              <CommandItem
                                key={status}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setFilters((prev) => ({
                                    ...prev,
                                    status: prev.status.includes(status)
                                      ? prev.status.filter((s) => s !== status)
                                      : [...prev.status, status],
                                  }));
                                }}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center w-full">
                                  <Checkbox
                                    checked={filters.status.includes(status)}
                                    onCheckedChange={(checked) => {
                                      setFilters((prev) => ({
                                        ...prev,
                                        status: checked
                                          ? [...prev.status, status]
                                          : prev.status.filter((s) => s !== status),
                                      }));
                                    }}
                                    className="mr-2"
                                  />
                                  <span>{status}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile-filter-buybox" className="text-sm font-medium">Buy Box</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="mobile-filter-buybox"
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <span className="truncate">
                          {filters.buyBoxId.length === 0
                            ? "All Buy Boxes"
                            : filters.buyBoxId.length === 1
                            ? buyBoxes?.find((box) => box.id === filters.buyBoxId[0])?.name
                            : `${filters.buyBoxId.length} selected`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search buy box..." />
                        <CommandList>
                          <CommandEmpty>No buy box found.</CommandEmpty>
                          <CommandGroup>
                      {buyBoxes?.map((box) => (
                              <CommandItem
                                key={box.id}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setFilters((prev) => ({
                                    ...prev,
                                    buyBoxId: prev.buyBoxId.includes(box.id)
                                      ? prev.buyBoxId.filter((id) => id !== box.id)
                                      : [...prev.buyBoxId, box.id],
                                  }));
                                }}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center w-full">
                                  <Checkbox
                                    checked={filters.buyBoxId.includes(box.id)}
                                    onCheckedChange={(checked) => {
                                      setFilters((prev) => ({
                                        ...prev,
                                        buyBoxId: checked
                                          ? [...prev.buyBoxId, box.id]
                                          : prev.buyBoxId.filter((id) => id !== box.id),
                                      }));
                                    }}
                                    className="mr-2"
                                  />
                                  <span>{box.name}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile-filter-workflow" className="text-sm font-medium">Workflow Stage</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="mobile-filter-workflow"
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <span className="truncate">
                          {filters.workflowState.length === 0
                            ? "All Stages"
                            : filters.workflowState.length === 1
                            ? filters.workflowState[0]
                            : `${filters.workflowState.length} selected`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search stage..." />
                        <CommandList>
                          <CommandEmpty>No stage found.</CommandEmpty>
                          <CommandGroup>
                            {[
                              { value: "Initial", label: "🆕 Initial" },
                              { value: "Reviewing", label: "👀 Reviewing" },
                              { value: "Research", label: "🔍 Research" },
                              { value: "On Progress", label: "⚡ On Progress" },
                              { value: "Follow Up", label: "📞 Follow Up" },
                              { value: "Negotiating", label: "💬 Negotiating" },
                            ].map((stage) => (
                              <CommandItem
                                key={stage.value}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setFilters((prev) => ({
                                    ...prev,
                                    workflowState: prev.workflowState.includes(stage.value)
                                      ? prev.workflowState.filter((s) => s !== stage.value)
                                      : [...prev.workflowState, stage.value],
                                  }));
                                }}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center w-full">
                                  <Checkbox
                                    checked={filters.workflowState.includes(stage.value)}
                                    onCheckedChange={(checked) => {
                                      setFilters((prev) => ({
                                        ...prev,
                                        workflowState: checked
                                          ? [...prev.workflowState, stage.value]
                                          : prev.workflowState.filter((s) => s !== stage.value),
                                      }));
                                    }}
                                    className="mr-2"
                                  />
                                  <span>{stage.label}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="mobile-filter-min-price" className="text-sm font-medium">Min Price</Label>
                    <Input
                      id="mobile-filter-min-price"
                      type="number"
                      placeholder="$0"
                      value={filterInputs.minPrice}
                      onChange={(e) => setFilterInputs((prev) => ({ ...prev, minPrice: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile-filter-max-price" className="text-sm font-medium">Max Price</Label>
                    <Input
                      id="mobile-filter-max-price"
                      type="number"
                      placeholder="Any"
                      value={filterInputs.maxPrice}
                      onChange={(e) => setFilterInputs((prev) => ({ ...prev, maxPrice: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile-filter-home-type" className="text-sm font-medium">Home Type</Label>
                  <Select value={filters.homeType} onValueChange={(value) => setFilters((prev) => ({ ...prev, homeType: value }))}>
                    <SelectTrigger id="mobile-filter-home-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Single Family">Single Family</SelectItem>
                      <SelectItem value="Multi Family">Multi Family</SelectItem>
                      <SelectItem value="Condo">Condo</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile-filter-seller-details" className="text-sm font-medium">Seller Details</Label>
                  <Select value={filters.hasSellerDetails} onValueChange={(value) => setFilters((prev) => ({ ...prev, hasSellerDetails: value }))}>
                    <SelectTrigger id="mobile-filter-seller-details">
                      <SelectValue placeholder="All Properties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      <SelectItem value="yes">✓ Has Seller Details</SelectItem>
                      <SelectItem value="no">✗ No Seller Details</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
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
        )}
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-status"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {filters.status.length === 0
                        ? "All Statuses"
                        : filters.status.length === 1
                        ? filters.status[0]
                        : `${filters.status.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search status..." />
                    <CommandList>
                      <CommandEmpty>No status found.</CommandEmpty>
                      <CommandGroup>
                        {["For Sale", "Under Contract", "Sold", "Off Market", "Tracking", "Follow Up"].map((status) => (
                          <CommandItem
                            key={status}
                            onSelect={(e) => {
                              e.preventDefault();
                              setFilters((prev) => ({
                                ...prev,
                                status: prev.status.includes(status)
                                  ? prev.status.filter((s) => s !== status)
                                  : [...prev.status, status],
                              }));
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center w-full">
                              <Checkbox
                                checked={filters.status.includes(status)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    status: checked
                                      ? [...prev.status, status]
                                      : prev.status.filter((s) => s !== status),
                                  }));
                                }}
                                className="mr-2"
                              />
                              <span>{status}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-workflow" className="text-sm font-medium">Workflow Stage</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-workflow"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {filters.workflowState.length === 0
                        ? "All Stages"
                        : filters.workflowState.length === 1
                        ? filters.workflowState[0]
                        : `${filters.workflowState.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search stage..." />
                    <CommandList>
                      <CommandEmpty>No stage found.</CommandEmpty>
                      <CommandGroup>
                        {[
                          { value: "Initial", label: "🆕 Initial" },
                          { value: "Reviewing", label: "👀 Reviewing" },
                          { value: "Research", label: "🔍 Research" },
                          { value: "On Progress", label: "⚡ On Progress" },
                          { value: "Follow Up", label: "📞 Follow Up" },
                          { value: "Negotiating", label: "💬 Negotiating" },
                          { value: "Under Contract", label: "📝 Under Contract" },
                          { value: "Closing", label: "🏁 Closing" },
                          { value: "Closed", label: "✅ Closed" },
                          { value: "Not Relevant", label: "❌ Not Relevant" },
                          { value: "Archived", label: "📦 Archived" },
                        ].map((stage) => (
                          <CommandItem
                            key={stage.value}
                            onSelect={(e) => {
                              e.preventDefault();
                              setFilters((prev) => ({
                                ...prev,
                                workflowState: prev.workflowState.includes(stage.value)
                                  ? prev.workflowState.filter((s) => s !== stage.value)
                                  : [...prev.workflowState, stage.value],
                              }));
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center w-full">
                              <Checkbox
                                checked={filters.workflowState.includes(stage.value)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    workflowState: checked
                                      ? [...prev.workflowState, stage.value]
                                      : prev.workflowState.filter((s) => s !== stage.value),
                                  }));
                                }}
                                className="mr-2"
                              />
                              <span>{stage.label}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="filter-list" className="text-sm font-medium">Buy Box</Label>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-list"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {filters.buyBoxId.length === 0
                        ? "All Buy Boxes"
                        : filters.buyBoxId.length === 1
                        ? buyBoxes?.find((box) => box.id === filters.buyBoxId[0])?.name
                        : `${filters.buyBoxId.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search buy box..." />
                    <CommandList>
                      <CommandEmpty>No buy box found.</CommandEmpty>
                      <CommandGroup>
                  {buyBoxes?.map((box) => (
                          <CommandItem
                            key={box.id}
                            onSelect={(e) => {
                              e.preventDefault();
                              setFilters((prev) => ({
                                ...prev,
                                buyBoxId: prev.buyBoxId.includes(box.id)
                                  ? prev.buyBoxId.filter((id) => id !== box.id)
                                  : [...prev.buyBoxId, box.id],
                              }));
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center w-full">
                              <Checkbox
                                checked={filters.buyBoxId.includes(box.id)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    buyBoxId: checked
                                      ? [...prev.buyBoxId, box.id]
                                      : prev.buyBoxId.filter((id) => id !== box.id),
                                  }));
                                }}
                                className="mr-2"
                              />
                              <span>{box.name}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-home-type"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {filters.homeType.length === 0
                        ? "All Types"
                        : filters.homeType.length === 1
                        ? filters.homeType[0]
                        : `${filters.homeType.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search type..." />
                    <CommandList>
                      <CommandEmpty>No type found.</CommandEmpty>
                      <CommandGroup>
                        {["Single Family", "Multi Family", "Condo", "Townhouse", "Land", "Commercial"].map((type) => (
                          <CommandItem
                            key={type}
                            onSelect={(e) => {
                              e.preventDefault();
                              setFilters((prev) => ({
                                ...prev,
                                homeType: prev.homeType.includes(type)
                                  ? prev.homeType.filter((t) => t !== type)
                                  : [...prev.homeType, type],
                              }));
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center w-full">
                              <Checkbox
                                checked={filters.homeType.includes(type)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    homeType: checked
                                      ? [...prev.homeType, type]
                                      : prev.homeType.filter((t) => t !== type),
                                  }));
                                }}
                                className="mr-2"
                              />
                              <span>{type}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-urgency" className="text-sm font-medium">Urgency</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-urgency"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {filters.urgency.length === 0
                        ? "All Urgencies"
                        : filters.urgency.length === 1
                        ? filters.urgency[0] === "3" ? "🔴 Urgent" : filters.urgency[0] === "2" ? "🟡 Medium" : "🟢 Not Urgent"
                        : `${filters.urgency.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {[
                          { value: "3", label: "🔴 Urgent" },
                          { value: "2", label: "🟡 Medium" },
                          { value: "1", label: "🟢 Not Urgent" },
                        ].map((urgency) => (
                          <CommandItem
                            key={urgency.value}
                            onSelect={(e) => {
                              e.preventDefault();
                              setFilters((prev) => ({
                                ...prev,
                                urgency: prev.urgency.includes(urgency.value)
                                  ? prev.urgency.filter((u) => u !== urgency.value)
                                  : [...prev.urgency, urgency.value],
                              }));
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center w-full">
                              <Checkbox
                                checked={filters.urgency.includes(urgency.value)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    urgency: checked
                                      ? [...prev.urgency, urgency.value]
                                      : prev.urgency.filter((u) => u !== urgency.value),
                                  }));
                                }}
                                className="mr-2"
                              />
                              <span>{urgency.label}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Assigned To Filter */}
            <div className="space-y-2">
              <Label htmlFor="filter-assigned-to" className="text-sm font-medium">Assigned To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-assigned-to"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {filters.assignedTo.length === 0
                        ? "All Team Members"
                        : filters.assignedTo.length === 1
                        ? filters.assignedTo[0] === "unassigned" 
                          ? "Unassigned" 
                          : teamMembers?.find((m: any) => m.user_id === filters.assignedTo[0])?.profiles?.full_name || "Unknown"
                        : `${filters.assignedTo.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search member..." />
                    <CommandList>
                      <CommandEmpty>No member found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          key="unassigned"
                          onSelect={(e) => {
                            e.preventDefault();
                            setFilters((prev) => ({
                              ...prev,
                              assignedTo: prev.assignedTo.includes("unassigned")
                                ? prev.assignedTo.filter((id) => id !== "unassigned")
                                : [...prev.assignedTo, "unassigned"],
                            }));
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center w-full">
                            <Checkbox
                              checked={filters.assignedTo.includes("unassigned")}
                              onCheckedChange={(checked) => {
                                setFilters((prev) => ({
                                  ...prev,
                                  assignedTo: checked
                                    ? [...prev.assignedTo, "unassigned"]
                                    : prev.assignedTo.filter((id) => id !== "unassigned"),
                                }));
                              }}
                              className="mr-2"
                            />
                            <span>Unassigned</span>
                          </div>
                        </CommandItem>
                  {teamMembers?.map((member: any) => (
                          <CommandItem
                            key={member.user_id}
                            onSelect={(e) => {
                              e.preventDefault();
                              setFilters((prev) => ({
                                ...prev,
                                assignedTo: prev.assignedTo.includes(member.user_id)
                                  ? prev.assignedTo.filter((id) => id !== member.user_id)
                                  : [...prev.assignedTo, member.user_id],
                              }));
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center w-full">
                              <Checkbox
                                checked={filters.assignedTo.includes(member.user_id)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    assignedTo: checked
                                      ? [...prev.assignedTo, member.user_id]
                                      : prev.assignedTo.filter((id) => id !== member.user_id),
                                  }));
                                }}
                                className="mr-2"
                              />
                              <span>{member.profiles?.full_name || member.profiles?.email || "Unknown"} {member.role && member.role !== "member" && `(${member.role})`}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Seller Details Filter */}
            <div className="space-y-2">
              <Label htmlFor="filter-seller-details" className="text-sm font-medium">Seller Details</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-seller-details"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {filters.hasSellerDetails.length === 0
                        ? "All Properties"
                        : filters.hasSellerDetails.length === 1
                        ? filters.hasSellerDetails[0] === "yes" ? "✓ Has Seller Details" : "✗ No Seller Details"
                        : `${filters.hasSellerDetails.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {[
                          { value: "yes", label: "✓ Has Seller Details" },
                          { value: "no", label: "✗ No Seller Details" },
                        ].map((option) => (
                          <CommandItem
                            key={option.value}
                            onSelect={(e) => {
                              e.preventDefault();
                              setFilters((prev) => ({
                                ...prev,
                                hasSellerDetails: prev.hasSellerDetails.includes(option.value)
                                  ? prev.hasSellerDetails.filter((v) => v !== option.value)
                                  : [...prev.hasSellerDetails, option.value],
                              }));
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center w-full">
                              <Checkbox
                                checked={filters.hasSellerDetails.includes(option.value)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    hasSellerDetails: checked
                                      ? [...prev.hasSellerDetails, option.value]
                                      : prev.hasSellerDetails.filter((v) => v !== option.value),
                                  }));
                                }}
                                className="mr-2"
                              />
                              <span>{option.label}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Lead Score Filter */}
            <div className="space-y-2">
              <Label htmlFor="filter-lead-score" className="text-sm font-medium">Lead Score</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-lead-score"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {filters.leadScore.length === 0
                        ? "All Leads"
                        : filters.leadScore.length === 1
                        ? filters.leadScore[0] === "hot" ? "🔥 Hot Leads" 
                          : filters.leadScore[0] === "warm" ? "🌡️ Warm Leads" 
                          : filters.leadScore[0] === "cold" ? "❄️ Cold Leads"
                          : "📭 No Lead"
                        : `${filters.leadScore.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {[
                          { value: "hot", label: "🔥 Hot Leads (Score 3)" },
                          { value: "warm", label: "🌡️ Warm Leads (Score 2)" },
                          { value: "cold", label: "❄️ Cold Leads (Score 1)" },
                          { value: "no-lead", label: "📭 No Lead (No SMS)" },
                        ].map((score) => (
                          <CommandItem
                            key={score.value}
                            onSelect={(e) => {
                              e.preventDefault();
                              setFilters((prev) => ({
                                ...prev,
                                leadScore: prev.leadScore.includes(score.value)
                                  ? prev.leadScore.filter((s) => s !== score.value)
                                  : [...prev.leadScore, score.value],
                              }));
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center w-full">
                              <Checkbox
                                checked={filters.leadScore.includes(score.value)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    leadScore: checked
                                      ? [...prev.leadScore, score.value]
                                      : prev.leadScore.filter((s) => s !== score.value),
                                  }));
                                }}
                                className="mr-2"
                              />
                              <span>{score.label}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* SMS Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="filter-sms-status" className="text-sm font-medium">SMS Status</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-sms-status"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {filters.smsStatus.length === 0
                        ? "All"
                        : filters.smsStatus.length === 1
                        ? filters.smsStatus[0] === "contacted" ? "Contacted" 
                          : filters.smsStatus[0] === "not-contacted" ? "Not Contacted" 
                          : filters.smsStatus[0] === "awaiting-reply" ? "Awaiting Reply"
                          : "Replied"
                        : `${filters.smsStatus.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {[
                          { value: "contacted", label: "Contacted (SMS Sent)" },
                          { value: "not-contacted", label: "Not Contacted" },
                          { value: "awaiting-reply", label: "Awaiting Reply" },
                          { value: "replied", label: "Replied" },
                        ].map((status) => (
                          <CommandItem
                            key={status.value}
                            onSelect={(e) => {
                              e.preventDefault();
                              setFilters((prev) => ({
                                ...prev,
                                smsStatus: prev.smsStatus.includes(status.value)
                                  ? prev.smsStatus.filter((s) => s !== status.value)
                                  : [...prev.smsStatus, status.value],
                              }));
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center w-full">
                              <Checkbox
                                checked={filters.smsStatus.includes(status.value)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    smsStatus: checked
                                      ? [...prev.smsStatus, status.value]
                                      : prev.smsStatus.filter((s) => s !== status.value),
                                  }));
                                }}
                                className="mr-2"
                              />
                              <span>{status.label}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {sortedProperties?.length || 0} of {totalCount || 0} properties
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
                  status: [],
                  buyBoxId: [],
                  minPrice: "",
                  maxPrice: "",
                  minBedrooms: "",
                  maxBedrooms: "",
                  homeType: [],
                  workflowState: [],
                  urgency: [],
                  assignedTo: [],
                  hasSellerDetails: [],
                  leadScore: [],
                  smsStatus: [],
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
                    hasSellerDetails: "all",
                  });
                }}
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* Mobile Card View */
        <div className="space-y-3">
          {sortedProperties?.map((property) => {
            const nextFollowUp = getNextFollowUp(property);
            return (
              <Card 
                key={property.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => openPropertyModal(property)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={selectedPropertyIds.includes(property.id)}
                          onCheckedChange={(checked) => handleSelectProperty(property.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{getPropertyDisplayName(property)}</h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {[property.city, property.state].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        {property.price && (
                          <span className="font-semibold text-foreground">
                            ${property.price?.toLocaleString()}
                          </span>
                        )}
                        {property.bedrooms && <span>{property.bedrooms} bed</span>}
                        {property.bathrooms && <span>{property.bathrooms} bath</span>}
                      </div>

                      {property.is_new_listing && (
                        <Badge className="bg-green-500 text-white hover:bg-green-600 mb-2">NEW</Badge>
                      )}
                      
                      {nextFollowUp && (
                        <Link 
                          to={`/activities?activity=${nextFollowUp.id}`}
                          className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mb-2 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Clock className="h-3 w-3" />
                          <span>Follow-up: {format(new Date(nextFollowUp.due_at), 'MMM d')}</span>
                        </Link>
                      )}
                    </div>
                    
                    {property.listing_url && (
                      <a
                        href={property.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      >
                        <Button size="sm" variant="outline" className="h-8 px-2">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Mobile Pagination */}
          {sortedProperties && sortedProperties.length > 0 && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount || 0)} of {totalCount || 0}
                    </span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => setItemsPerPage(Number(value))}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium">
                      Page {currentPage} of {Math.ceil((totalCount || 0) / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil((totalCount || 0) / itemsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil((totalCount || 0) / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Desktop Table View */
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
                    <span className="font-semibold">Buy Box</span>
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
                    <Button variant="ghost" onClick={() => handleSort('workflow_state')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      State
                      {getSortIcon('workflow_state')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <span className="font-semibold">Follow Up</span>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('city')} className="font-semibold p-0 h-auto hover:bg-transparent active:bg-transparent focus:bg-transparent">
                      City
                      {getSortIcon('city')}
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
                    onClick={() => openPropertyModal(property)}
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
                        <Badge variant="outline" className="text-xs">
                          <Target className="h-3 w-3 mr-1" />
                          {property.buy_boxes?.name || 'No Buy Box'}
                        </Badge>
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
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className={`h-auto p-1 text-xs font-normal ${
                                nextFollowUp 
                                  ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700' 
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {nextFollowUp ? (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(nextFollowUp.due_at), 'MMM d')}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Plus className="h-3 w-3" />
                                  Set
                                </span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2" align="start">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Quick set follow-up</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-8"
                                onClick={() => handleQuickFollowUp(property.id, 1)}
                              >
                                Tomorrow
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-8"
                                onClick={() => handleQuickFollowUp(property.id, 3)}
                              >
                                In 3 days
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-8"
                                onClick={() => handleQuickFollowUp(property.id, 7)}
                              >
                                In 1 week
                              </Button>
                              <div className="border-t pt-2 mt-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start text-xs h-8"
                                    >
                                      <Calendar className="h-3 w-3 mr-2" />
                                      Pick a date
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                      mode="single"
                                      selected={undefined}
                                      onSelect={(date) => {
                                        if (date) handleQuickFollowUp(property.id, 0, date);
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>{property.city || '-'}</TableCell>
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
                  Showing {sortedProperties?.length || 0} of {totalCount || 0} properties
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
          closePropertyModal();
        }
      }}>
        <DialogContent className="w-[95vw] max-w-7xl max-h-[90vh] overflow-y-auto" aria-describedby="property-details-description">
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

                        // If moving to "Not Relevant" or "Archived", mark all open activities as done
                        if (value === 'Not Relevant' || value === 'Archived') {
                          const { data: openActivities, error: activitiesError } = await supabase
                            .from('activities')
                            .update({ 
                              status: 'done',
                              completed_at: new Date().toISOString()
                            })
                            .eq('property_id', propertyId)
                            .eq('status', 'open')
                            .select();
                          
                          if (!activitiesError) {
                            const count = openActivities?.length || 0;
                            if (count > 0) {
                              toast({
                                title: "Activities Completed",
                                description: `${count} open ${count === 1 ? 'activity' : 'activities'} marked as done`,
                              });
                            }
                          }
                          
                          // Invalidate activities cache
                          queryClient.invalidateQueries({ queryKey: ["activities"] });
                        }

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
                      👤 Owner
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
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto lg:ml-auto">
                
                {/* Send Notification Button */}
                <Dialog open={isSendingNotification} onOpenChange={setIsSendingNotification}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Send className="mr-2 h-4 w-4" />
                      Send Notification
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-lg md:text-xl">Send Notification to Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="notification-recipient">Recipient *</Label>
                        <Select
                          value={notificationForm.recipientId}
                          onValueChange={(value) => setNotificationForm(prev => ({ ...prev, recipientId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select team member..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers && teamMembers.filter((m: any) => m.user_id !== user?.id).map((member: any) => (
                              <SelectItem key={member.user_id} value={member.user_id}>
                                {member.profiles?.full_name || member.profiles?.email || "Unknown"} {member.role && member.role !== "member" && `(${member.role})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="notification-message">Message *</Label>
                        <Textarea
                          id="notification-message"
                          value={notificationForm.message}
                          onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Enter your message..."
                          rows={4}
                        />
                      </div>
                      
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md text-sm">
                        <p className="text-muted-foreground">
                          <strong>Property:</strong> {selectedProperty?.address || "Untitled"}
                        </p>
                        {selectedProperty?.city && (
                          <p className="text-muted-foreground text-xs">
                            {selectedProperty.city}, {selectedProperty.state}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsSendingNotification(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSendNotification}
                          disabled={sendNotificationMutation.isPending || !notificationForm.recipientId || !notificationForm.message}
                        >
                          {sendNotificationMutation.isPending ? "Sending..." : "Send Notification"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

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
                  <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-lg md:text-xl">Send Email to Realtor</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 md:space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="email-template" className="text-sm">Email Template *</Label>
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
                                  {template.is_default && " 🛡️"}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No templates available - Create one in Communication
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          🛡️ indicates default templates available to all users
                        </p>
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
                      templateId: "",
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
                  <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-lg md:text-xl">Send SMS</DialogTitle>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
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
                        <Label htmlFor="sms-template" className="text-sm">SMS Template (Optional)</Label>
                        <Select
                          value={smsForm.templateId}
                          onValueChange={(value) => {
                            setSmsForm(prev => ({ ...prev, templateId: value }));
                            // Auto-fill message from template
                            const template = smsTemplates?.find((t: any) => t.id === value);
                            if (template) {
                              setSmsForm(prev => ({ ...prev, message: template.body }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {smsTemplates && smsTemplates.length > 0 ? (
                              smsTemplates.map((template: any) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                  {template.is_default && " 🛡️"}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No templates available - Create one in Communication
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Select a template to auto-fill the message below
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Select from Contacts (Optional)</Label>
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
                            // Calculate offer price (from custom input, buy box ARV, or property price)
                            const smsOfferPrice = calculateOfferPrice(selectedProperty);
                            const formattedPrice = smsOfferPrice ? `$${Number(smsOfferPrice).toLocaleString()}` : 'N/A';
                            
                            // Replace template variables (support both single and double curly braces)
                            const finalMessage = smsForm.message
                              // Double curly braces format ({{VARIABLE}})
                              .replace(/\{\{AGENT_NAME\}\}/gi, smsForm.agentName || '')
                              .replace(/\{\{PROPERTY\}\}/gi, selectedProperty?.address || 'N/A')
                              .replace(/\{\{ADDRESS\}\}/gi, selectedProperty?.address || 'N/A')
                              .replace(/\{\{PRICE\}\}/gi, formattedPrice)
                              .replace(/\{\{BEDROOMS\}\}/gi, selectedProperty?.bedrooms?.toString() || 'N/A')
                              .replace(/\{\{BEDS\}\}/gi, selectedProperty?.bedrooms?.toString() || 'N/A')
                              .replace(/\{\{BATHROOMS\}\}/gi, selectedProperty?.bathrooms?.toString() || 'N/A')
                              .replace(/\{\{BATHS\}\}/gi, selectedProperty?.bathrooms?.toString() || 'N/A')
                              .replace(/\{\{SQFT\}\}/gi, selectedProperty?.square_footage?.toString() || selectedProperty?.living_sqf?.toString() || 'N/A')
                              // Single curly braces format ({variable})
                              .replace(/\{agent_name\}/gi, smsForm.agentName || '')
                              .replace(/\{address\}/gi, selectedProperty?.address || 'N/A')
                              .replace(/\{price\}/gi, formattedPrice)
                              .replace(/\{beds\}/gi, selectedProperty?.bedrooms?.toString() || 'N/A')
                              .replace(/\{baths\}/gi, selectedProperty?.bathrooms?.toString() || 'N/A');
                            
                            sendSMSMutation.mutate({
                              to: smsForm.toPhone,
                              message: finalMessage,
                              propertyId: selectedProperty?.id,
                              agentName: smsForm.agentName,
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
                            <SelectItem value="follow_up">Follow Up</SelectItem>
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
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="general" className="text-sm md:text-base">
                    <Home className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="comps" className="text-sm md:text-base">
                    <Ruler className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    Comps
                  </TabsTrigger>
                  <TabsTrigger value="communication" className="text-sm md:text-base">
                    <MessageSquare className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    Communication
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-sm md:text-base">
                    <Clock className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    History/Activities
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* General Tab with Accordion */}
              <TabsContent value="general" className="space-y-4 mt-4">
                {/* Auto-save indicator */}
                <div className="flex justify-end pb-4 border-b">
                  <p className="text-xs text-muted-foreground">
                    {updatePropertyMutation.isPending ? "💾 Saving..." : "✓ Changes saved automatically"}
                  </p>
                </div>

                <Accordion type="multiple" defaultValue={[]} className="w-full">
                  {/* Basic Information */}
                  <AccordionItem value="basic">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        Basic Information
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 md:grid-cols-2 pt-4">
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
                          <Label htmlFor="edit-neighborhood">Neighborhood</Label>
                          <Input
                            id="edit-neighborhood"
                            value={editedProperty?.neighborhood || ''}
                            onChange={(e) => handlePropertyFieldChange('neighborhood', e.target.value)}
                            placeholder="Enter neighborhood"
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
                          <Label htmlFor="edit-source">Source</Label>
                          <Input
                            id="edit-source"
                            value={editedProperty?.source || ''}
                            onChange={(e) => handlePropertyFieldChange('source', e.target.value)}
                            placeholder="Enter source"
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
                    </AccordionContent>
                  </AccordionItem>

                  {/* Financial Details */}
                  <AccordionItem value="financial">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Financial Details
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 md:grid-cols-2 pt-4">
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
                          <Label htmlFor="edit-mls">MLS Number</Label>
                          <Input
                            id="edit-mls"
                            value={editedProperty?.mls_number || ''}
                            onChange={(e) => handlePropertyFieldChange('mls_number', e.target.value)}
                            placeholder="Enter MLS number"
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
                    </AccordionContent>
                  </AccordionItem>

                  {/* Property Details */}
                  <AccordionItem value="property">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Property Details
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 md:grid-cols-2 pt-4">
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
                          <Label htmlFor="edit-full-bath">Full Baths</Label>
                          <Input
                            id="edit-full-bath"
                            type="number"
                            value={editedProperty?.full_bath || ''}
                            onChange={(e) => handlePropertyFieldChange('full_bath', parseInt(e.target.value) || null)}
                            placeholder="Enter full baths"
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

                        <div className="flex items-center space-x-2 pt-6">
                          <Checkbox
                            id="edit-basement"
                            checked={editedProperty?.basement || false}
                            onCheckedChange={(checked) => handlePropertyFieldChange('basement', checked)}
                          />
                          <Label htmlFor="edit-basement" className="cursor-pointer">Has Basement</Label>
                        </div>

                        <div className="flex items-center space-x-2 pt-6">
                          <Checkbox
                            id="edit-finished-basement"
                            checked={editedProperty?.finished_basement || false}
                            onCheckedChange={(checked) => handlePropertyFieldChange('finished_basement', checked)}
                          />
                          <Label htmlFor="edit-finished-basement" className="cursor-pointer">Finished Basement</Label>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Agent & Listing Info */}
                  <AccordionItem value="agent">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Agent & Listing Info
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 md:grid-cols-2 pt-4">
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

                        {/* Zillow Link */}
                        {editedProperty?.listing_url && (
                          <div className="space-y-2">
                            <Label>Zillow</Label>
                            <a
                              href={editedProperty.listing_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline text-sm"
                            >
                              View on Zillow
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        )}

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
                    </AccordionContent>
                  </AccordionItem>

                  {/* Size & Features */}
                  <AccordionItem value="size">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <Ruler className="h-5 w-5" />
                        Size & Features
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 md:grid-cols-2 pt-4">
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
                          <Label htmlFor="edit-basement-sqf">Basement Sq Ft</Label>
                          <Input
                            id="edit-basement-sqf"
                            type="number"
                            value={editedProperty?.basement_sqf || ''}
                            onChange={(e) => handlePropertyFieldChange('basement_sqf', parseInt(e.target.value) || null)}
                            placeholder="Enter basement square footage"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Notes & Description */}
                  <AccordionItem value="notes">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Notes & Description
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
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
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Buy Box Information */}
                  {selectedProperty?.buy_box_id && (() => {
                    const buyBox = buyBoxes?.find((bb: any) => bb.id === selectedProperty.buy_box_id);
                    return buyBox ? (
                      <AccordionItem value="buybox">
                        <AccordionTrigger className="text-lg font-semibold">
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Buy Box: {buyBox.name}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {buyBox.arv && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">ARV (After Repair Value)</Label>
                                  <p className="font-semibold text-green-600">${Number(buyBox.arv).toLocaleString()}</p>
                                </div>
                              )}
                              
                              {(buyBox.price_min || buyBox.price_max) && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Price Range</Label>
                                  <p className="font-semibold">
                                    {buyBox.price_min ? `$${Number(buyBox.price_min).toLocaleString()}` : 'Any'} - {buyBox.price_max ? `$${Number(buyBox.price_max).toLocaleString()}` : 'Any'}
                                  </p>
                                </div>
                              )}

                              {(buyBox.min_bedrooms || buyBox.max_bedrooms) && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                                  <p className="font-semibold">
                                    {buyBox.min_bedrooms || 'Any'} - {buyBox.max_bedrooms || 'Any'}
                                  </p>
                                </div>
                              )}

                              {(buyBox.min_bathrooms || buyBox.max_bathrooms) && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Bathrooms</Label>
                                  <p className="font-semibold">
                                    {buyBox.min_bathrooms || 'Any'} - {buyBox.max_bathrooms || 'Any'}
                                  </p>
                                </div>
                              )}

                              {(buyBox.min_square_footage || buyBox.max_square_footage) && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Square Footage</Label>
                                  <p className="font-semibold">
                                    {buyBox.min_square_footage ? `${Number(buyBox.min_square_footage).toLocaleString()} sqft` : 'Any'} - {buyBox.max_square_footage ? `${Number(buyBox.max_square_footage).toLocaleString()} sqft` : 'Any'}
                                  </p>
                                </div>
                              )}

                              {buyBox.home_types && buyBox.home_types.length > 0 && (
                                <div className="space-y-1 md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Property Types</Label>
                                  <div className="flex flex-wrap gap-1">
                                    {buyBox.home_types.map((type: string) => (
                                      <Badge key={type} variant="secondary">{type}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {buyBox.cities && buyBox.cities.length > 0 && (
                                <div className="space-y-1 md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Cities</Label>
                                  <div className="flex flex-wrap gap-1">
                                    {buyBox.cities.map((city: string) => (
                                      <Badge key={city} variant="outline">{city}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {buyBox.neighborhoods && buyBox.neighborhoods.length > 0 && (
                                <div className="space-y-1 md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Neighborhoods</Label>
                                  <div className="flex flex-wrap gap-1">
                                    {buyBox.neighborhoods.map((neighborhood: string) => (
                                      <Badge key={neighborhood} variant="outline">{neighborhood}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {buyBox.zip_codes && buyBox.zip_codes.length > 0 && (
                                <div className="space-y-1 md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Zip Codes</Label>
                                  <div className="flex flex-wrap gap-1">
                                    {buyBox.zip_codes.map((zip: string) => (
                                      <Badge key={zip} variant="outline">{zip}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {buyBox.description && (
                                <div className="space-y-1 md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Description</Label>
                                  <p className="text-sm">{buyBox.description}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ) : null;
                  })()}
                </Accordion>

                {/* Auto-save indicator at bottom */}
                <div className="flex justify-end pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {updatePropertyMutation.isPending ? "💾 Saving..." : "✓ Changes saved automatically"}
                  </p>
                </div>
              </TabsContent>

              {/* History/Activities Tab (merged history + communication) */}
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

                {/* Notifications Section */}
                {propertyNotifications && propertyNotifications.length > 0 && (
                  <div className="pt-6 border-t">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notifications
                      <Badge variant="secondary" className="text-xs">
                        {propertyNotifications.length}
                      </Badge>
                    </h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {propertyNotifications.map((notification: any) => (
                        <div
                          key={notification.id}
                          className={`flex gap-3 p-3 rounded-lg border ${
                            !notification.read 
                              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" 
                              : "bg-card"
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className={`p-2 rounded-full ${
                              notification.type === 'sms_received' 
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                : notification.type === 'activity_due'
                                ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {notification.type === 'sms_received' ? (
                                <MessageSquare className="h-4 w-4" />
                              ) : notification.type === 'activity_due' ? (
                                <Clock className="h-4 w-4" />
                              ) : (
                                <Bell className="h-4 w-4" />
                              )}
                            </div>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-sm">{notification.title}</h4>
                              <Badge 
                                variant="outline" 
                                className={`capitalize text-xs ${
                                  notification.type === 'sms_received'
                                    ? 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400'
                                    : notification.type === 'activity_due'
                                    ? 'border-orange-200 text-orange-700 dark:border-orange-800 dark:text-orange-400'
                                    : ''
                                }`}
                              >
                                {notification.type.replace("_", " ")}
                              </Badge>
                            </div>
                            {notification.message && (
                              <p className="text-xs text-muted-foreground">{notification.message}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {notification.created_at && (
                                <span>{format(new Date(notification.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Comps Tab */}
              <TabsContent value="comps" className="space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <h3 className="font-semibold text-lg">Comparable Properties</h3>
                  <div className="flex flex-wrap gap-2">
                    {/* Generate Report Button */}
                    {selectedProperty?.comps && selectedProperty.comps.length > 0 && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => scrapeCompsMutation.mutate()}
                          disabled={scrapeCompsMutation.isPending}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/30"
                        >
                          {scrapeCompsMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate Report
                            </>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={exportCompsToCSV}
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          CSV
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={exportCompsToPDF}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          PDF
                        </Button>
                      </>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setEditingCompId(null);
                        setCompForm({ address: "", zillow_link: "", price: "", grade: "middle", description: "" });
                        setIsAddingComp(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Comp
                    </Button>
                  </div>
                </div>

                {/* Add/Edit Comp Form Dialog */}
                <Dialog open={isAddingComp} onOpenChange={(open) => {
                  setIsAddingComp(open);
                  if (!open) {
                    setEditingCompId(null);
                    setCompForm({ address: "", zillow_link: "", price: "", grade: "middle", description: "" });
                  }
                }}>
                  <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-lg md:text-xl">
                        {editingCompId ? "Edit Comparable Property" : "Add Comparable Property"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="comp-address" className="text-sm">Address *</Label>
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

                      <div className="space-y-2">
                        <Label htmlFor="comp-grade">Grade</Label>
                        <Select
                          value={compForm.grade}
                          onValueChange={(value) => setCompForm(prev => ({ ...prev, grade: value }))}
                        >
                          <SelectTrigger id="comp-grade">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="middle">Middle</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="comp-description">Description</Label>
                        <Textarea
                          id="comp-description"
                          value={compForm.description}
                          onChange={(e) => setCompForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Additional notes about this comp..."
                          rows={3}
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsAddingComp(false);
                            setCompForm({ address: "", zillow_link: "", price: "", grade: "middle", description: "" });
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
                          {addCompMutation.isPending 
                            ? (editingCompId ? "Updating..." : "Adding...") 
                            : (editingCompId ? "Update Comp" : "Add Comp")}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Comps List */}
                {!selectedProperty?.comps || selectedProperty.comps.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-4">No comparable properties added yet</p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingCompId(null);
                        setCompForm({ address: "", zillow_link: "", price: "", grade: "middle", description: "" });
                        setIsAddingComp(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Comp
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedProperty.comps.map((comp: any, index: number) => (
                      <Card 
                        key={comp.id || index} 
                        className="group hover:shadow-lg transition-all duration-200 border-t-4 overflow-hidden flex flex-col"
                        style={{
                          borderTopColor: comp.grade === 'high' 
                            ? 'rgb(34, 197, 94)' 
                            : comp.grade === 'low' 
                            ? 'rgb(239, 68, 68)'
                            : 'rgb(234, 179, 8)'
                        }}
                      >
                        {/* Photo Section */}
                        {comp.photos && comp.photos.length > 0 && (
                          <div className="relative h-32 overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <img 
                              src={comp.photos[0]} 
                              alt={comp.address}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            {comp.photos.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                                <Image className="h-3 w-3" />
                                {comp.photos.length}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <CardContent className="p-4 flex-1 flex flex-col">
                          {/* Header with Grade Badge */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              {comp.grade && (
                                <Badge 
                                  className={
                                    comp.grade === 'high' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                      : comp.grade === 'low' 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  }
                                >
                                  {comp.grade.charAt(0).toUpperCase() + comp.grade.slice(1)}
                                </Badge>
                              )}
                              {comp.scraped_at && (
                                <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
                                  <Sparkles className="h-3 w-3 mr-1 text-purple-500" />
                                  Enriched
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                onClick={() => {
                                  setCompForm({
                                    address: comp.address,
                                    zillow_link: comp.zillow_link || "",
                                    price: comp.price,
                                    grade: comp.grade || "middle",
                                    description: comp.description || "",
                                  });
                                  setEditingCompId(comp.id);
                                  setIsAddingComp(true);
                                }}
                                title="Edit"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={() => deleteCompMutation.mutate(comp.id)}
                                disabled={deleteCompMutation.isPending}
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Address */}
                          <div className="flex items-start gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <h4 className="font-semibold text-sm leading-tight">{comp.address}</h4>
                          </div>

                          {/* Zillow Link */}
                          {comp.zillow_link && (
                            <a
                              href={comp.zillow_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 hover:underline mb-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              View on Zillow
                            </a>
                          )}

                          {/* Price */}
                          <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950/20 px-2.5 py-1.5 rounded-md border border-green-200 dark:border-green-900 w-fit mb-3">
                            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="font-bold text-base text-green-700 dark:text-green-300">
                              {parseFloat(comp.price).toLocaleString()}
                            </span>
                          </div>

                          {/* Enriched Property Details */}
                          {(comp.bedrooms || comp.bathrooms || comp.sqft) && (
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                              {comp.bedrooms && (
                                <div className="flex items-center gap-1">
                                  <BedDouble className="h-3.5 w-3.5" />
                                  <span>{comp.bedrooms} bed</span>
                                </div>
                              )}
                              {comp.bathrooms && (
                                <div className="flex items-center gap-1">
                                  <Bath className="h-3.5 w-3.5" />
                                  <span>{comp.bathrooms} bath</span>
                                </div>
                              )}
                              {comp.sqft && (
                                <div className="flex items-center gap-1">
                                  <Square className="h-3.5 w-3.5" />
                                  <span>{comp.sqft.toLocaleString()} sqft</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Additional Details */}
                          {(comp.year_built || comp.lot_size || comp.garage || comp.home_type) && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {comp.year_built && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  Built {comp.year_built}
                                </Badge>
                              )}
                              {comp.home_type && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  {comp.home_type}
                                </Badge>
                              )}
                              {comp.lot_size && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  Lot: {comp.lot_size}
                                </Badge>
                              )}
                              {comp.garage && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  <Car className="h-3 w-3 mr-1" />
                                  {comp.garage}
                                </Badge>
                              )}
                              {comp.days_on_market && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  {comp.days_on_market} DOM
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Description */}
                          {comp.description && (
                            <div className="pt-3 mt-auto border-t">
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                {comp.description}
                              </p>
                            </div>
                          )}

                          {/* Scrape Error */}
                          {comp.scrape_error && (
                            <div className="pt-2 mt-auto">
                              <p className="text-xs text-red-500 flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                {comp.scrape_error}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Communication Tab */}
              <TabsContent value="communication" className="space-y-4 mt-4">
                {/* Email Communications Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-lg">Email Communications</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {propertyEmailMessages?.length || 0} emails
                    </Badge>
                  </div>

                  {/* Email Messages List */}
                  {!propertyEmailMessages || propertyEmailMessages.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground text-sm">No emails for this property yet</p>
                      <p className="text-xs text-muted-foreground mt-2">Emails will appear here when you communicate about this property</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {propertyEmailMessages.map((email: any) => (
                        <div
                          key={email.id}
                          className={`p-4 rounded-lg border ${
                            email.direction === 'incoming'
                              ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
                              : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {email.direction === 'incoming' ? (
                                <Badge variant="default" className="bg-purple-600 text-xs">
                                  Incoming
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <Send className="h-3 w-3 mr-1" />
                                  Outgoing
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs capitalize">
                                {email.status}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(email.created_at), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>
                                {email.direction === 'incoming' 
                                  ? `From: ${email.from_email}` 
                                  : `To: ${email.to_email}`}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="font-semibold text-sm">Subject: {email.subject}</p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">
                                {email.body}
                              </p>
                            </div>

                            {/* Offer Price if available */}
                            {email.offer_price && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-semibold text-green-600">
                                    Offer Price: ${parseFloat(email.offer_price).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SMS Communications Section - Chat Style */}
                <div className="pt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-lg">SMS Conversation</h3>
                    </div>
                  </div>

                  {/* Chat Container */}
                  <div className="flex flex-col border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                    {/* Chat Header - WhatsApp Style */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#075e54] dark:bg-gray-800 text-white">
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {selectedProperty?.seller_agent_name || 'Unknown Agent'}
                        </p>
                        <p className="text-xs text-gray-200 dark:text-gray-400">
                          {selectedProperty?.seller_agent_phone || 'No phone number'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                        {propertySmsMessages?.length || 0} msgs
                      </Badge>
                    </div>
                    
                    {/* Messages Area - WhatsApp Style */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#e5ddd5] dark:bg-gray-900/80">
                      {!propertySmsMessages || propertySmsMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center bg-white/80 dark:bg-gray-800/80 rounded-lg p-6">
                            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground text-sm">No SMS messages yet</p>
                            <p className="text-xs text-muted-foreground mt-2">Start the conversation below</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {propertySmsMessages.map((sms: any) => (
                            <div
                              key={sms.id}
                              className={`flex ${sms.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`relative max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${
                                  sms.direction === 'outgoing'
                                    ? 'bg-[#dcf8c6] dark:bg-green-900/60 rounded-tr-none'
                                    : 'bg-white dark:bg-gray-800 rounded-tl-none'
                                }`}
                              >
                                {/* AI Score indicator for incoming hot leads */}
                                {sms.direction === 'incoming' && sms.ai_score === 3 && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <Flame className="h-3 w-3 text-red-500" />
                                    <span className="text-[10px] font-medium text-red-600 dark:text-red-400">Hot Lead</span>
                                  </div>
                                )}
                                {sms.direction === 'incoming' && sms.ai_score === 2 && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <ThermometerSun className="h-3 w-3 text-orange-500" />
                                    <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400">Warm Lead</span>
                                  </div>
                                )}
                                
                                {/* Message text */}
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-100">
                                  {sms.message}
                                </p>
                                
                                {/* Timestamp and status */}
                                <div className={`flex items-center gap-1 mt-1 ${sms.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    {format(new Date(sms.created_at), "h:mm a")}
                                  </span>
                                  {sms.direction === 'outgoing' && (
                                    <span className="text-[10px]">
                                      {sms.status === 'delivered' ? (
                                        <span className="text-blue-500">✓✓</span>
                                      ) : sms.status === 'sent' ? (
                                        <span className="text-gray-400">✓✓</span>
                                      ) : sms.status === 'failed' ? (
                                        <span className="text-red-500">!</span>
                                      ) : (
                                        <span className="text-gray-400">✓</span>
                                      )}
                                    </span>
                                  )}
                                </div>

                                {/* AI Analysis tooltip for incoming */}
                                {sms.direction === 'incoming' && sms.ai_analysis && (
                                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                                      {sms.ai_analysis}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          <div ref={smsMessagesEndRef} />
                        </>
                      )}
                    </div>

                    {/* Message Input Area - WhatsApp Style */}
                    <div className="border-t p-3 bg-[#f0f0f0] dark:bg-gray-800">
                      {/* Template Selector - Compact */}
                      <div className="mb-2">
                        <Select
                          value={chatSelectedTemplateId}
                          onValueChange={(value) => {
                            setChatSelectedTemplateId(value);
                            const template = smsTemplates?.find((t: any) => t.id === value);
                            if (template) {
                              // Replace template variables
                              let message = template.body;
                              const calculatedOfferPrice = selectedProperty?.buy_box_id && userCompany?.companies?.discount_percentage
                                ? (() => {
                                    const buyBox = buyBoxes?.find((bb: any) => bb.id === selectedProperty.buy_box_id);
                                    if (buyBox?.arv) {
                                      const arvValue = Number(buyBox.arv);
                                      const discountPercent = Number(userCompany.companies.discount_percentage);
                                      return Math.round(arvValue * (1 - discountPercent / 100));
                                    }
                                    return selectedProperty?.price || '';
                                  })()
                                : selectedProperty?.price || '';
                              const formattedPrice = calculatedOfferPrice ? `$${Number(calculatedOfferPrice).toLocaleString()}` : 'N/A';
                              
                              message = message
                                .replace(/\{\{AGENT_NAME\}\}/gi, selectedProperty?.seller_agent_name || '')
                                .replace(/\{\{PROPERTY\}\}/gi, selectedProperty?.address || 'N/A')
                                .replace(/\{\{ADDRESS\}\}/gi, selectedProperty?.address || 'N/A')
                                .replace(/\{\{PRICE\}\}/gi, formattedPrice)
                                .replace(/\{\{BEDROOMS\}\}/gi, selectedProperty?.bedrooms?.toString() || 'N/A')
                                .replace(/\{\{BEDS\}\}/gi, selectedProperty?.bedrooms?.toString() || 'N/A')
                                .replace(/\{\{BATHROOMS\}\}/gi, selectedProperty?.bathrooms?.toString() || 'N/A')
                                .replace(/\{\{BATHS\}\}/gi, selectedProperty?.bathrooms?.toString() || 'N/A')
                                .replace(/\{\{SQFT\}\}/gi, selectedProperty?.square_footage?.toString() || selectedProperty?.living_sqf?.toString() || 'N/A')
                                .replace(/\{agent_name\}/gi, selectedProperty?.seller_agent_name || '')
                                .replace(/\{address\}/gi, selectedProperty?.address || 'N/A')
                                .replace(/\{price\}/gi, formattedPrice)
                                .replace(/\{beds\}/gi, selectedProperty?.bedrooms?.toString() || 'N/A')
                                .replace(/\{baths\}/gi, selectedProperty?.bathrooms?.toString() || 'N/A');
                              
                              setSmsMessageText(message);
                            }
                          }}
                        >
                          <SelectTrigger className="text-xs h-8 bg-white dark:bg-gray-700">
                            <SelectValue placeholder="Use template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {smsTemplates && smsTemplates.length > 0 ? (
                              smsTemplates.map((template: any) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                  {template.is_default && " 🛡️"}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No templates available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Message Input and Send Button - Chat Style */}
                      <div className="flex items-end gap-2">
                        <div className="flex-1 bg-white dark:bg-gray-700 rounded-2xl px-4 py-2">
                          <Textarea
                            value={smsMessageText}
                            onChange={(e) => setSmsMessageText(e.target.value)}
                            placeholder="Type a message..."
                            className="min-h-[40px] max-h-[120px] resize-none border-0 p-0 focus-visible:ring-0 bg-transparent"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (smsMessageText.trim() && selectedProperty?.seller_agent_phone && !sendSMSMutation.isPending) {
                                  handleSendChatSMS();
                                }
                              }
                            }}
                          />
                        </div>
                        <Button
                          onClick={handleSendChatSMS}
                          disabled={!smsMessageText.trim() || !selectedProperty?.seller_agent_phone || sendSMSMutation.isPending}
                          size="icon"
                          className="rounded-full h-10 w-10 bg-[#00a884] hover:bg-[#008f72] dark:bg-green-600 dark:hover:bg-green-700"
                        >
                          {sendSMSMutation.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </Button>
                      </div>

                      {/* Character Counter and Status */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-muted-foreground">
                          {smsMessageText.length} / 160 characters
                          {smsMessageText.length > 160 && (
                            <span className="text-orange-500 ml-2">
                              (Will be sent as {Math.ceil(smsMessageText.length / 160)} messages)
                            </span>
                          )}
                        </div>
                        {!selectedProperty?.seller_agent_phone && (
                          <span className="text-xs text-red-500">
                            No phone number available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

            </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Add Activity Dialog */}
      <Dialog open={isBulkAddingActivity} onOpenChange={setIsBulkAddingActivity}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg lg:text-xl">
              Add Activity to {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'Property' : 'Properties'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-activity-type" className="text-sm">Activity Type</Label>
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
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-activity-title" className="text-sm">Title</Label>
              <Input
                id="bulk-activity-title"
                value={bulkActivityForm.title}
                onChange={(e) => setBulkActivityForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Called agent about property"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-activity-body" className="text-sm">Details</Label>
              <Textarea
                id="bulk-activity-body"
                value={bulkActivityForm.body}
                onChange={(e) => setBulkActivityForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Additional details..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-activity-due" className="text-sm">Due Date (Optional)</Label>
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
              <Label htmlFor="bulk-email-template" className="text-sm">Email Template *</Label>
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
                        {template.is_default && " 🛡️"}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No templates available - Create one in Communication
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                🛡️ indicates default templates available to all users
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-email-offer-price" className="text-sm">Offer Price (Optional)</Label>
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
              <Button onClick={handleBulkSendEmail} disabled={isSendingBulkEmailInProgress} className="w-full sm:w-auto text-sm">
                {isSendingBulkEmailInProgress ? "Sending..." : "Send All Emails"}
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
              <Label htmlFor="bulk-sms-template" className="text-sm">SMS Template *</Label>
              <Select
                value={bulkSMSTemplateId}
                onValueChange={(value) => setBulkSMSTemplateId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {smsTemplates && smsTemplates.length > 0 ? (
                    smsTemplates.map((template: any) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.is_default && " 🛡️"}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No templates available - Create one in Communication
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                🛡️ indicates default templates available to all users
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-sms-offer-price" className="text-sm">Offer Price (Optional)</Label>
              <Input
                id="bulk-sms-offer-price"
                type="number"
                value={bulkSMSOfferPrice}
                onChange={(e) => setBulkSMSOfferPrice(e.target.value)}
                placeholder="150000"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to calculate from buy box ARV and company discount. Same price will be used for all properties.
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
              <Button 
                variant="outline" 
                onClick={() => setIsSendingBulkSMS(false)} 
                className="w-full sm:w-auto text-sm"
                disabled={isSendingBulkSMSInProgress}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkSendSMS} 
                className="w-full sm:w-auto text-sm"
                disabled={isSendingBulkSMSInProgress}
              >
                {isSendingBulkSMSInProgress ? 'Sending...' : 'Send All SMS'}
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
