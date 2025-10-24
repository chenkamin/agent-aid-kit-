import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, List, Loader2, Trash2, Play, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, Edit, BarChart, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BuyBoxAnalyticsModal from "@/components/BuyBoxAnalyticsModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const PROPERTY_TYPES = [
  { value: "Single Family", label: "SFH", icon: "🏠" },
  { value: "Multi Family", label: "Multi Family", icon: "🏘️" },
  { value: "Condo", label: "Condo", icon: "🏢" },
  { value: "Townhouse", label: "Townhouse", icon: "🏘️" },
  { value: "Lot", label: "Lot/Land", icon: "🌳" },
  { value: "Apartment", label: "Apartment", icon: "🏛️" },
  { value: "Commercial", label: "Commercial", icon: "🏬" },
];

export default function Lists() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [editingList, setEditingList] = useState<any>(null);
  const [locationInput, setLocationInput] = useState("");
  const [isLookingUpZips, setIsLookingUpZips] = useState(false);
  const [scrapingListId, setScrapingListId] = useState<string | null>(null);
  const [selectedHomeTypes, setSelectedHomeTypes] = useState<string[]>([]);
  const [filterByCityMatch, setFilterByCityMatch] = useState(false);
  const [filterByNeighborhoods, setFilterByNeighborhoods] = useState(false);
  const [cities, setCities] = useState("");
  const [neighborhoods, setNeighborhoods] = useState("");
  const [listForm, setListForm] = useState({
    name: "",
    description: "",
    zipCodes: "",
    priceMin: "",
    priceMax: "",
    daysOnZillow: "",
    forSaleByAgent: true,
    forSaleByOwner: true,
    forRent: false,
    filterByPpsf: false,
  });
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [showBuyBoxAnalytics, setShowBuyBoxAnalytics] = useState(false);
  const [selectedBuyBoxForAnalytics, setSelectedBuyBoxForAnalytics] = useState<{
    id: string;
    name: string;
  } | null>(null);
  // Bulk update states
  const [selectedBuyBoxIds, setSelectedBuyBoxIds] = useState<string[]>([]);
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [bulkHomeTypes, setBulkHomeTypes] = useState<string[]>([]);
  
  // Get user's company
  const { data: userCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("team_members")
        .select("company_id, role")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching user company:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: lists, isLoading } = useQuery({
    queryKey: ["buy_boxes", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      
      console.log("🔍 Fetching buy boxes for company_id:", userCompany.company_id);
      
      const { data, error } = await supabase
        .from("buy_boxes")
        .select(`
          *,
          properties!properties_buy_box_id_fkey(count)
        `)
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("❌ Error fetching buy boxes:", error);
        return [];
      }
      
      console.log("✅ Buy boxes fetched:", data?.length, "buy boxes");
      
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Sort lists
  const sortedLists = lists ? [...lists].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;
    const aValue = a[key];
    const bValue = b[key];

    if (aValue === null || aValue === undefined) return direction === 'asc' ? 1 : -1;
    if (bValue === null || bValue === undefined) return direction === 'asc' ? -1 : 1;

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
      return null;
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

  const handleAIZipLookup = async () => {
    if (!locationInput.trim()) {
      toast({
        title: "Location required",
        description: "Please enter a city, neighborhood, or area name",
        variant: "destructive",
      });
      return;
    }

    setIsLookingUpZips(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://ijgrelgzahireresdqvw.supabase.co/functions/v1/get-zip-codes-from-location`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ location: locationInput }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to find zip codes");
      }

      const result = await response.json();
      
      // Get existing zip codes and new zip codes
      const existingZips = listForm.zipCodes
        .split(",")
        .map(z => z.trim())
        .filter(Boolean);
      
      const newZips = result.zipCodes;
      
      // Combine and remove duplicates
      const allZips = [...new Set([...existingZips, ...newZips])];
      
      setListForm((prev) => ({
        ...prev,
        zipCodes: allZips.join(", "),
      }));
      
      const addedCount = allZips.length - existingZips.length;
      
      toast({
        title: "Zip codes added!",
        description: addedCount > 0 
          ? `Added ${addedCount} new zip codes for ${result.location}`
          : `All zip codes for ${result.location} were already in your list`,
      });
      
      setLocationInput("");
    } catch (error: any) {
      toast({
        title: "Lookup failed",
        description: error.message || "Could not find zip codes for this location",
        variant: "destructive",
      });
    } finally {
      setIsLookingUpZips(false);
    }
  };

  const createListMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!userCompany?.company_id) throw new Error("No company found");
      
      const listData = {
        user_id: user.id,
        company_id: userCompany.company_id,
        name: data.name,
        description: data.description || null,
        zip_codes: data.zipCodes.split(",").map((z: string) => z.trim()).filter(Boolean),
        cities: data.cities ? data.cities.split(",").map((c: string) => c.trim()).filter(Boolean) : [],
        neighborhoods: data.neighborhoods ? data.neighborhoods.split(",").map((n: string) => n.trim()).filter(Boolean) : [],
        price_min: data.priceMin ? parseFloat(data.priceMin) : null,
        price_max: data.priceMax ? parseFloat(data.priceMax) : null,
        days_on_zillow: data.daysOnZillow ? parseInt(data.daysOnZillow) : null,
        for_sale_by_agent: data.forSaleByAgent,
        for_sale_by_owner: data.forSaleByOwner,
        for_rent: data.forRent,
        filter_by_ppsf: data.filterByPpsf,
        filter_by_city_match: data.filterByCityMatch,
        filter_by_neighborhoods: data.filterByNeighborhoods,
        home_types: data.homeTypes || [],
      };

      if (data.id) {
        // Update existing
        const { data: updatedList, error } = await supabase
          .from("buy_boxes")
          .update(listData)
          .eq("id", data.id)
          .eq("company_id", userCompany.company_id)
          .select()
          .single();
        if (error) throw error;
        return { list: updatedList, isNew: false };
      } else {
        // Create new
        const { data: newList, error } = await supabase
          .from("buy_boxes")
          .insert([listData])
          .select()
          .single();
        if (error) throw error;
        return { list: newList, isNew: true };
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["buy_boxes", userCompany?.company_id] });
      
      if (result.isNew) {
        toast({
          title: "Buy Box created",
          description: "Starting to scrape properties from Zillow...",
        });
        
        setIsCreatingList(false);
        setEditingList(null);
        setSelectedHomeTypes([]);
        setFilterByCityMatch(false);
        setFilterByNeighborhoods(false);
        setCities("");
        setNeighborhoods("");
        setListForm({
          name: "",
          description: "",
          zipCodes: "",
          priceMin: "",
          priceMax: "",
          daysOnZillow: "",
          forSaleByAgent: true,
          forSaleByOwner: true,
          forRent: false,
          filterByPpsf: false,
        });
        
        // Automatically trigger scraping for new lists
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
              body: JSON.stringify({ buyBoxId: result.list.id }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to scrape properties");
          }

          const data = await response.json();
          queryClient.invalidateQueries({ queryKey: ["properties", userCompany?.company_id] });
          
          toast({
            title: "Scraping completed!",
            description: `Found and saved ${data.count} properties`,
          });
        } catch (error: any) {
          toast({
            title: "Scraping failed",
            description: error.message || "An error occurred during scraping",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Buy Box updated",
          description: "The buy box has been updated successfully.",
        });
        setIsCreatingList(false);
        setEditingList(null);
        setSelectedHomeTypes([]);
        setFilterByCityMatch(false);
        setFilterByNeighborhoods(false);
        setCities("");
        setNeighborhoods("");
        setListForm({
          name: "",
          description: "",
          zipCodes: "",
          priceMin: "",
          priceMax: "",
          daysOnZillow: "",
          forSaleByAgent: true,
          forSaleByOwner: true,
          forRent: false,
          filterByPpsf: false,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to ${editingList ? 'update' : 'create'} buy box: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const scrapeListMutation = useMutation({
    mutationFn: async (listId: string) => {
      setScrapingListId(listId);
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
          body: JSON.stringify({ buyBoxId: listId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to scrape properties");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["buy_boxes", userCompany?.company_id] });
      queryClient.invalidateQueries({ queryKey: ["properties", userCompany?.company_id] });
      toast({
        title: "Scraping completed!",
        description: `Found and saved ${data.count} properties from ${data.buyBoxName}`,
      });
      setScrapingListId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Scraping failed",
        description: error.message || "An error occurred during scraping",
        variant: "destructive",
      });
      setScrapingListId(null);
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!userCompany?.company_id) throw new Error("No company found");
      const { error } = await supabase
        .from("buy_boxes")
        .delete()
        .eq("id", listId)
        .eq("company_id", userCompany.company_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buy_boxes", userCompany?.company_id] });
      toast({
        title: "Buy Box deleted",
        description: "The buy box has been deleted successfully.",
      });
      setDeleteListId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete buy box: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (homeTypes: string[]) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!userCompany?.company_id) throw new Error("No company found");
      
      // Update all selected buy boxes
      const updatePromises = selectedBuyBoxIds.map(buyBoxId =>
        supabase
          .from("buy_boxes")
          .update({ home_types: homeTypes })
          .eq("id", buyBoxId)
          .eq("company_id", userCompany.company_id)
      );
      
      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} buy box(es)`);
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buy_boxes", userCompany?.company_id] });
      toast({
        title: "Bulk update completed",
        description: `Successfully updated ${selectedBuyBoxIds.length} buy box(es) with new property types.`,
      });
      setShowBulkUpdateDialog(false);
      setSelectedBuyBoxIds([]);
      setBulkHomeTypes([]);
    },
    onError: (error: any) => {
      toast({
        title: "Bulk update failed",
        description: error.message || "An error occurred during bulk update",
        variant: "destructive",
      });
    },
  });

  const handleScrape = (listId: string) => {
    scrapeListMutation.mutate(listId);
  };

  const handleEdit = (list: any) => {
    setEditingList(list);
    setSelectedHomeTypes(list.home_types || []);
    setFilterByCityMatch(list.filter_by_city_match ?? false);
    setFilterByNeighborhoods(list.filter_by_neighborhoods ?? false);
    setCities(list.cities ? list.cities.join(", ") : "");
    setNeighborhoods(list.neighborhoods ? list.neighborhoods.join(", ") : "");
    setListForm({
      name: list.name,
      description: list.description || "",
      zipCodes: list.zip_codes ? list.zip_codes.join(", ") : "",
      priceMin: list.price_min ? list.price_min.toString() : "",
      priceMax: list.price_max ? list.price_max.toString() : "",
      daysOnZillow: list.days_on_zillow ? list.days_on_zillow.toString() : "",
      forSaleByAgent: list.for_sale_by_agent ?? true,
      forSaleByOwner: list.for_sale_by_owner ?? true,
      forRent: list.for_rent ?? false,
      filterByPpsf: list.filter_by_ppsf ?? false,
    });
    setIsCreatingList(true);
  };

  const toggleHomeType = (type: string) => {
    setSelectedHomeTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleBulkHomeType = (type: string) => {
    setBulkHomeTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleBuyBoxSelection = (buyBoxId: string) => {
    setSelectedBuyBoxIds(prev =>
      prev.includes(buyBoxId)
        ? prev.filter(id => id !== buyBoxId)
        : [...prev, buyBoxId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBuyBoxIds.length === sortedLists.length) {
      setSelectedBuyBoxIds([]);
    } else {
      setSelectedBuyBoxIds(sortedLists.map((list: any) => list.id));
    }
  };

  const handleBulkUpdate = () => {
    if (selectedBuyBoxIds.length === 0) {
      toast({
        title: "No buy boxes selected",
        description: "Please select at least one buy box to update",
        variant: "destructive",
      });
      return;
    }
    setShowBulkUpdateDialog(true);
  };

  const handleDelete = (listId: string) => {
    setDeleteListId(listId);
  };

  const confirmDelete = () => {
    if (deleteListId) {
      deleteListMutation.mutate(deleteListId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-muted-foreground">Loading buy boxes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Buy Boxes</h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-2">
            Create property search criteria and automatically scrape Zillow
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {selectedBuyBoxIds.length > 0 && (
            <Button onClick={handleBulkUpdate} variant="outline" size={isMobile ? "default" : "lg"} className="w-full sm:w-auto">
              <Edit className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Bulk Update ({selectedBuyBoxIds.length})
            </Button>
          )}
          <Button onClick={() => setIsCreatingList(true)} size={isMobile ? "default" : "lg"} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Create Buy Box
          </Button>
        </div>
      </div>

      {sortedLists && sortedLists.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-4">
            <List className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-2xl font-semibold text-foreground">No buy boxes yet</h3>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Create your first buy box to start finding investment properties from Zillow
            </p>
            <Button onClick={() => setIsCreatingList(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Buy Box
            </Button>
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* Mobile Card View */
        <div className="space-y-3">
          {sortedLists?.map((list: any) => (
            <Card key={list.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header with checkbox and name */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedBuyBoxIds.includes(list.id)}
                      onCheckedChange={() => toggleBuyBoxSelection(list.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{list.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {list.properties?.[0]?.count || 0} properties
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    {list.zip_codes && list.zip_codes.length > 0 && (
                      <div>
                        <span className="font-semibold">Zip Codes: </span>
                        <span className="text-muted-foreground">{list.zip_codes.join(", ")}</span>
                      </div>
                    )}
                    {(list.price_min || list.price_max) && (
                      <div>
                        <span className="font-semibold">Price: </span>
                        <span className="text-muted-foreground">
                          ${list.price_min ? Number(list.price_min).toLocaleString() : "0"} - ${list.price_max ? Number(list.price_max).toLocaleString() : "∞"}
                          {list.filter_by_ppsf && " per sqft"}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {list.for_sale_by_agent && (
                        <Badge variant="outline" className="text-xs">Agent</Badge>
                      )}
                      {list.for_sale_by_owner && (
                        <Badge variant="outline" className="text-xs">FSBO</Badge>
                      )}
                      {list.for_rent && (
                        <Badge variant="outline" className="text-xs">Rent</Badge>
                      )}
                    </div>
                    {list.created_at && (
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(list.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Link to={`/properties?buyBoxId=${list.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        <Filter className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBuyBoxForAnalytics({
                          id: list.id,
                          name: list.name,
                        });
                        setShowBuyBoxAnalytics(true);
                      }}
                    >
                      <BarChart className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(list)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleScrape(list.id)}
                      disabled={scrapingListId === list.id}
                    >
                      {scrapingListId === list.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(list.id)}
                      disabled={deleteListMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                      checked={sortedLists.length > 0 && selectedBuyBoxIds.length === sortedLists.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('name')} className="font-semibold p-0 h-auto hover:bg-transparent">
                      Buy Box Name
                      {getSortIcon('name')}
                    </Button>
                  </TableHead>
                  <TableHead>Properties</TableHead>
                  <TableHead>Zip Codes</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('price_max')} className="font-semibold p-0 h-auto hover:bg-transparent">
                      Price Range
                      {getSortIcon('price_max')}
                    </Button>
                  </TableHead>
                  <TableHead>Listing Types</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('created_at')} className="font-semibold p-0 h-auto hover:bg-transparent">
                      Created
                      {getSortIcon('created_at')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLists?.map((list: any) => (
                  <TableRow key={list.id}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedBuyBoxIds.includes(list.id)}
                        onCheckedChange={() => toggleBuyBoxSelection(list.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{list.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {list.properties?.[0]?.count || 0} properties
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {list.zip_codes && list.zip_codes.length > 0 ? (
                        <span className="text-sm">{list.zip_codes.join(", ")}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(list.price_min || list.price_max) ? (
                        <div className="text-sm">
                          <div className="font-semibold">
                            ${list.price_min ? Number(list.price_min).toLocaleString() : "0"} - ${list.price_max ? Number(list.price_max).toLocaleString() : "∞"}
                          </div>
                          {list.filter_by_ppsf && <div className="text-xs text-muted-foreground">per sqft</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {list.for_sale_by_agent && (
                          <Badge variant="outline" className="text-xs">Agent</Badge>
                        )}
                        {list.for_sale_by_owner && (
                          <Badge variant="outline" className="text-xs">FSBO</Badge>
                        )}
                        {list.for_rent && (
                          <Badge variant="outline" className="text-xs">Rent</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {list.created_at ? new Date(list.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/properties?buyBoxId=${list.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            <Filter className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBuyBoxForAnalytics({
                              id: list.id,
                              name: list.name,
                            });
                            setShowBuyBoxAnalytics(true);
                          }}
                        >
                          <BarChart className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(list)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleScrape(list.id)}
                          disabled={scrapingListId === list.id}
                        >
                          {scrapingListId === list.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Scraping...
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Scrape
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(list.id)}
                          disabled={deleteListMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Buy Box Dialog */}
      <Dialog open={isCreatingList} onOpenChange={(open) => {
        setIsCreatingList(open);
        if (!open) {
          setEditingList(null);
          setSelectedHomeTypes([]);
          setFilterByCityMatch(false);
          setCities("");
          setListForm({
            name: "",
            description: "",
            zipCodes: "",
            priceMin: "",
            priceMax: "",
            daysOnZillow: "",
            forSaleByAgent: true,
            forSaleByOwner: true,
            forRent: false,
            filterByPpsf: false,
          });
        }
      }}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">{editingList ? "Edit Buy Box" : "Create New Buy Box"}</DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">Configure your property search criteria and filtering options</p>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Buy Box Name - Full Width */}
            <div className="space-y-2">
              <Label htmlFor="list-name" className="text-base font-semibold">Buy Box Name *</Label>
              <Input
                id="list-name"
                placeholder="e.g., Cleveland Investment Properties"
                value={listForm.name}
                onChange={(e) => setListForm((prev) => ({ ...prev, name: e.target.value }))}
                className="text-base"
              />
            </div>

            {/* Description - Full Width */}
            <div className="space-y-2">
              <Label htmlFor="list-description" className="text-base font-semibold">Description</Label>
              <Textarea
                id="list-description"
                placeholder="Add notes or description for this buy box (optional)"
                value={listForm.description}
                onChange={(e) => setListForm((prev) => ({ ...prev, description: e.target.value }))}
                className="text-base min-h-[80px]"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Add any notes, strategy, or criteria details for this buy box
              </p>
            </div>

            {/* AI Location to Zip Codes - Full Width */}
            <div className="space-y-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-900 shadow-sm">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="location-input" className="text-blue-900 dark:text-blue-100 font-semibold">
                    AI-Powered Zip Code Finder
                  </Label>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 mb-3">
                    Don't know the zip codes? Just enter the city, neighborhood, or area name and let AI find them for you!
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="location-input"
                      placeholder="e.g., Downtown Cleveland, Tremont, Ohio City"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAIZipLookup();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAIZipLookup}
                      disabled={isLookingUpZips || !locationInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLookingUpZips ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Finding...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Find Zips
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Criteria - Two Columns */}
            <div className="border rounded-lg p-5 bg-card">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                📍 Location Criteria
              </h3>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip-codes" className="text-sm font-semibold">Zip Codes *</Label>
                    <Textarea
                      id="zip-codes"
                      placeholder="e.g., 44105, 44106, 44107"
                      value={listForm.zipCodes}
                      onChange={(e) => setListForm((prev) => ({ ...prev, zipCodes: e.target.value }))}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated zip codes to search</p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cities" className="text-sm font-semibold">Cities (Optional)</Label>
                    <Input
                      id="cities"
                      placeholder="e.g., Garfield Heights, Cleveland"
                      value={cities}
                      onChange={(e) => setCities(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated list of cities for filtering</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="neighborhoods" className="text-sm font-semibold">Neighborhoods (Optional)</Label>
                    <Textarea
                      id="neighborhoods"
                      placeholder="e.g., Tremont, Ohio City, Downtown"
                      value={neighborhoods}
                      onChange={(e) => setNeighborhoods(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated list of neighborhoods for AI-powered filtering</p>
                  </div>
                </div>
              </div>
            </div>

            {/* City Match Filter */}
            {cities && (
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <Label className="text-blue-900 dark:text-blue-100 font-semibold">
                      🎯 Filter by City Match
                    </Label>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Only include properties where the city matches your list above. 
                      Useful when zip codes span multiple cities (e.g., 44105 includes both Garfield Heights and Cleveland).
                    </p>
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mt-2">
                      Will filter for: {cities}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Switch
                      id="filter-by-city-match"
                      checked={filterByCityMatch}
                      onCheckedChange={setFilterByCityMatch}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Neighborhoods AI Filter */}
            {neighborhoods && (
              <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <Label className="text-purple-900 dark:text-purple-100 font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI-Powered Neighborhood Filter
                    </Label>
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      Use OpenAI to verify each property is in one of your specified neighborhoods. 
                      More accurate than simple text matching - AI understands neighborhood boundaries and variations.
                    </p>
                    <p className="text-xs font-medium text-purple-800 dark:text-purple-200 mt-2">
                      Will verify neighborhoods: {neighborhoods}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                      ⚠️ Note: Uses OpenAI API - may slow down scraping slightly
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Switch
                      id="filter-by-neighborhoods"
                      checked={filterByNeighborhoods}
                      onCheckedChange={setFilterByNeighborhoods}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Property & Price Filters - Two Columns */}
            <div className="border rounded-lg p-5 bg-card">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                🏠 Property & Price Filters
              </h3>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column - Property Types */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Property Types (Optional)</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Leave empty to include all types
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {PROPERTY_TYPES.map((type) => (
                        <div key={type.value} className="flex items-center space-x-2 border rounded-md p-2 hover:bg-accent transition-colors">
                          <Checkbox
                            id={`type-${type.value}`}
                            checked={selectedHomeTypes.includes(type.value)}
                            onCheckedChange={() => toggleHomeType(type.value)}
                          />
                          <label
                            htmlFor={`type-${type.value}`}
                            className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedHomeTypes.length > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                        Selected: {selectedHomeTypes.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column - Price & Days */}
                <div className="space-y-4">
                  {/* Price Filter Type */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <Label className="text-amber-900 dark:text-amber-100 font-semibold text-sm">
                          Price Filter Type
                        </Label>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {listForm.filterByPpsf 
                            ? "Filter by $/sqft (more accurate)"
                            : "Filter by total price"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="filter-by-ppsf"
                          checked={listForm.filterByPpsf}
                          onCheckedChange={(checked) => 
                            setListForm((prev) => ({ ...prev, filterByPpsf: checked as boolean }))
                          }
                        />
                        <label htmlFor="filter-by-ppsf" className="text-xs font-medium cursor-pointer whitespace-nowrap">
                          Price/SqFt
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price-min" className="text-sm font-semibold">
                      {listForm.filterByPpsf ? "Min Price per SqFt" : "Minimum Price"}
                    </Label>
                    <Input
                      id="price-min"
                      type="number"
                      placeholder={listForm.filterByPpsf ? "0" : "0"}
                      value={listForm.priceMin}
                      onChange={(e) => setListForm((prev) => ({ ...prev, priceMin: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      {listForm.filterByPpsf ? "e.g., 50 = $50/sqft minimum" : "e.g., 50000 = $50,000 minimum"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price-max" className="text-sm font-semibold">
                      {listForm.filterByPpsf ? "Max Price per SqFt" : "Maximum Price"}
                    </Label>
                    <Input
                      id="price-max"
                      type="number"
                      placeholder={listForm.filterByPpsf ? "150" : "150000"}
                      value={listForm.priceMax}
                      onChange={(e) => setListForm((prev) => ({ ...prev, priceMax: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      {listForm.filterByPpsf ? "e.g., 150 = $150/sqft" : "e.g., 150000 = $150,000"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="days-zillow" className="text-sm font-semibold">Max Days on Zillow</Label>
                    <Input
                      id="days-zillow"
                      type="number"
                      placeholder="30"
                      value={listForm.daysOnZillow}
                      onChange={(e) => setListForm((prev) => ({ ...prev, daysOnZillow: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty for any duration</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Listing Types - Full Width */}
            <div className="border rounded-lg p-5 bg-card">
              <h3 className="text-lg font-semibold mb-3">🏷️ Listing Types</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent transition-colors">
                  <Checkbox
                    id="for-sale-by-agent"
                    checked={listForm.forSaleByAgent}
                    onCheckedChange={(checked) => 
                      setListForm((prev) => ({ ...prev, forSaleByAgent: checked as boolean }))
                    }
                  />
                  <label htmlFor="for-sale-by-agent" className="text-sm font-medium cursor-pointer">
                    For Sale by Agent
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent transition-colors">
                  <Checkbox
                    id="for-sale-by-owner"
                    checked={listForm.forSaleByOwner}
                    onCheckedChange={(checked) => 
                      setListForm((prev) => ({ ...prev, forSaleByOwner: checked as boolean }))
                    }
                  />
                  <label htmlFor="for-sale-by-owner" className="text-sm font-medium cursor-pointer">
                    For Sale by Owner (FSBO)
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent transition-colors">
                  <Checkbox
                    id="for-rent"
                    checked={listForm.forRent}
                    onCheckedChange={(checked) => 
                      setListForm((prev) => ({ ...prev, forRent: checked as boolean }))
                    }
                  />
                  <label htmlFor="for-rent" className="text-sm font-medium cursor-pointer">
                    For Rent
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <Button variant="outline" onClick={() => {
              setIsCreatingList(false);
              setEditingList(null);
              setSelectedHomeTypes([]);
              setFilterByCityMatch(false);
              setCities("");
              setListForm({
                name: "",
                description: "",
                zipCodes: "",
                priceMin: "",
                priceMax: "",
                daysOnZillow: "",
                forSaleByAgent: true,
                forSaleByOwner: true,
                forRent: false,
                filterByPpsf: false,
              });
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const dataToSave = {
                  ...listForm,
                  cities,
                  neighborhoods,
                  homeTypes: selectedHomeTypes,
                  filterByCityMatch,
                  filterByNeighborhoods,
                  ...(editingList && { id: editingList.id })
                };
                createListMutation.mutate(dataToSave);
              }}
              disabled={!listForm.name || !listForm.zipCodes || createListMutation.isPending}
            >
              {createListMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingList ? "Updating..." : "Creating..."}
                </>
              ) : editingList ? (
                "Update Buy Box"
              ) : (
                "Create & Scrape"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteListId} onOpenChange={() => setDeleteListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Buy Box</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this buy box? This action cannot be undone.
              Properties associated with this buy box will not be deleted, but will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Bulk Update Property Types Dialog */}
      <Dialog open={showBulkUpdateDialog} onOpenChange={(open) => {
        setShowBulkUpdateDialog(open);
        if (!open) {
          setBulkHomeTypes([]);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Bulk Update Property Types</DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Update property types for {selectedBuyBoxIds.length} selected buy box{selectedBuyBoxIds.length > 1 ? 'es' : ''}
            </p>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Property Types (Optional)</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Select the property types you want to apply to all selected buy boxes. 
                This will replace any existing property type filters.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {PROPERTY_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent transition-colors">
                    <Checkbox
                      id={`bulk-type-${type.value}`}
                      checked={bulkHomeTypes.includes(type.value)}
                      onCheckedChange={() => toggleBulkHomeType(type.value)}
                    />
                    <label
                      htmlFor={`bulk-type-${type.value}`}
                      className="text-sm font-medium cursor-pointer flex items-center gap-2 flex-1"
                    >
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </label>
                  </div>
                ))}
              </div>
              {bulkHomeTypes.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 mt-3">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Selected: {bulkHomeTypes.join(", ")}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    These types will be applied to all {selectedBuyBoxIds.length} selected buy box{selectedBuyBoxIds.length > 1 ? 'es' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowBulkUpdateDialog(false);
              setBulkHomeTypes([]);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => bulkUpdateMutation.mutate(bulkHomeTypes)}
              disabled={bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update {selectedBuyBoxIds.length} Buy Box{selectedBuyBoxIds.length > 1 ? 'es' : ''}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

