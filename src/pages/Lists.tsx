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
  const [cities, setCities] = useState("");
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
        price_min: data.priceMin ? parseFloat(data.priceMin) : null,
        price_max: data.priceMax ? parseFloat(data.priceMax) : null,
        days_on_zillow: data.daysOnZillow ? parseInt(data.daysOnZillow) : null,
        for_sale_by_agent: data.forSaleByAgent,
        for_sale_by_owner: data.forSaleByOwner,
        for_rent: data.forRent,
        filter_by_ppsf: data.filterByPpsf,
        filter_by_city_match: data.filterByCityMatch,
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
        `${supabase.supabaseUrl}/functions/v1/scrape-zillow`,
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

  const handleScrape = (listId: string) => {
    scrapeListMutation.mutate(listId);
  };

  const handleEdit = (list: any) => {
    setEditingList(list);
    setSelectedHomeTypes(list.home_types || []);
    setFilterByCityMatch(list.filter_by_city_match ?? false);
    setCities(list.cities ? list.cities.join(", ") : "");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Buy Boxes</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Create property search criteria and automatically scrape Zillow
          </p>
        </div>
        <Button onClick={() => setIsCreatingList(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Create Buy Box
        </Button>
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox />
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
                      <Checkbox />
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
            zipCodes: "",
            priceMax: "",
            daysOnZillow: "",
            forSaleByAgent: true,
            forSaleByOwner: true,
            forRent: false,
            filterByPpsf: false,
          });
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{editingList ? "Edit Buy Box" : "Create New Buy Box"}</DialogTitle>
            <p className="text-sm text-muted-foreground">Configure your property search criteria and filtering options</p>
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
              <div className="grid grid-cols-3 gap-4">
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
                zipCodes: "",
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
                  homeTypes: selectedHomeTypes,
                  filterByCityMatch,
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
    </div>
  );
}

