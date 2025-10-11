import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, List, Loader2, Trash2, Play, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const [listForm, setListForm] = useState({
    name: "",
    zipCodes: "",
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
  
  const { data: lists, isLoading } = useQuery({
    queryKey: ["buy_boxes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("buy_boxes")
        .select(`
          *,
          properties!properties_buy_box_id_fkey(count)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
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
      
      const listData = {
        user_id: user.id,
        name: data.name,
        zip_codes: data.zipCodes.split(",").map((z: string) => z.trim()).filter(Boolean),
        price_max: data.priceMax ? parseFloat(data.priceMax) : null,
        days_on_zillow: data.daysOnZillow ? parseInt(data.daysOnZillow) : null,
        for_sale_by_agent: data.forSaleByAgent,
        for_sale_by_owner: data.forSaleByOwner,
        for_rent: data.forRent,
        filter_by_ppsf: data.filterByPpsf,
      };

      if (data.id) {
        // Update existing
        const { data: updatedList, error } = await supabase
          .from("buy_boxes")
          .update(listData)
          .eq("id", data.id)
          .eq("user_id", user.id)
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
      queryClient.invalidateQueries({ queryKey: ["buy_boxes", user?.id] });
      
      if (result.isNew) {
        toast({
          title: "Buy Box created",
          description: "Starting to scrape properties from Zillow...",
        });
        
        setIsCreatingList(false);
        setEditingList(null);
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
          queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });
          
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
      queryClient.invalidateQueries({ queryKey: ["buy_boxes", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["properties", user?.id] });
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
      const { error } = await supabase
        .from("buy_boxes")
        .delete()
        .eq("id", listId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buy_boxes", user?.id] });
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
    setListForm({
      name: list.name,
      zipCodes: list.zip_codes ? list.zip_codes.join(", ") : "",
      priceMax: list.price_max ? list.price_max.toString() : "",
      daysOnZillow: list.days_on_zillow ? list.days_on_zillow.toString() : "",
      forSaleByAgent: list.for_sale_by_agent ?? true,
      forSaleByOwner: list.for_sale_by_owner ?? true,
      forRent: list.for_rent ?? false,
      filterByPpsf: list.filter_by_ppsf ?? false,
    });
    setIsCreatingList(true);
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
                      Max Price
                      {getSortIcon('price_max')}
                    </Button>
                  </TableHead>
                  <TableHead>Days on Zillow</TableHead>
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
                      {list.price_max ? (
                        <span className="font-semibold">${Number(list.price_max).toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {list.days_on_zillow ? (
                        <Badge variant="outline">{list.days_on_zillow} days</Badge>
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
          setListForm({
            name: "",
            zipCodes: "",
            priceMax: "",
            daysOnZillow: "",
            forSaleByAgent: true,
            forSaleByOwner: true,
            forRent: false,
          });
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingList ? "Edit Buy Box" : "Create New Buy Box"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">Buy Box Name *</Label>
              <Input
                id="list-name"
                placeholder="e.g., Cleveland Investment Properties"
                value={listForm.name}
                onChange={(e) => setListForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* AI Location to Zip Codes */}
            <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
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

            <div className="space-y-2">
              <Label htmlFor="zip-codes">Zip Codes * (comma separated)</Label>
              <Textarea
                id="zip-codes"
                placeholder="e.g., 44105, 44106, 44107"
                value={listForm.zipCodes}
                onChange={(e) => setListForm((prev) => ({ ...prev, zipCodes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Price Filter Type Toggle */}
            <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Label className="text-amber-900 dark:text-amber-100 font-semibold">
                    Price Filter Type
                  </Label>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {listForm.filterByPpsf 
                      ? "Filtering by price per square foot. All listings will be retrieved and filtered based on calculated $/sqft."
                      : "Filtering by total property price. Zillow will only return properties within your price range."}
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
                  <label htmlFor="filter-by-ppsf" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                    Filter by Price/SqFt
                  </label>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price-max">
                  {listForm.filterByPpsf ? "Maximum Price per SqFt" : "Maximum Price"}
                </Label>
                <Input
                  id="price-max"
                  type="number"
                  placeholder={listForm.filterByPpsf ? "150" : "150000"}
                  value={listForm.priceMax}
                  onChange={(e) => setListForm((prev) => ({ ...prev, priceMax: e.target.value }))}
                />
                {listForm.filterByPpsf && (
                  <p className="text-xs text-muted-foreground">
                    e.g., 150 = $150 per square foot
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="days-zillow">Max Days on Zillow</Label>
                <Input
                  id="days-zillow"
                  type="number"
                  placeholder="30"
                  value={listForm.daysOnZillow}
                  onChange={(e) => setListForm((prev) => ({ ...prev, daysOnZillow: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Listing Types</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
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

                <div className="flex items-center space-x-2">
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

                <div className="flex items-center space-x-2">
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

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setIsCreatingList(false);
              setEditingList(null);
              setListForm({
                name: "",
                zipCodes: "",
                priceMax: "",
                daysOnZillow: "",
                forSaleByAgent: true,
                forSaleByOwner: true,
                forRent: false,
              });
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => createListMutation.mutate(editingList ? { ...listForm, id: editingList.id } : listForm)}
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
    </div>
  );
}

