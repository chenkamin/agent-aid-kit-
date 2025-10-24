import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Mail, Phone, Building, Trash2, Search, Filter, Home, ExternalLink, DollarSign, Bed, Bath, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Contacts() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [viewingContactProperties, setViewingContactProperties] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [contactForm, setContactForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    type: "Agent",
    notes: "",
  });

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
  
  // Fetch manually added contacts
  const { data: manualContacts, isLoading: isLoadingManual } = useQuery({
    queryKey: ["contacts", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      
      console.log("🔍 Fetching manual contacts for company_id:", userCompany.company_id);
      
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("❌ Error fetching contacts:", error);
        return [];
      }
      
      console.log("✅ Manual contacts fetched:", data?.length, "contacts");
      
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch contacts from properties (agents)
  const { data: propertyContacts, isLoading: isLoadingProperties } = useQuery({
    queryKey: ["property-contacts", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      
      console.log("🔍 Fetching property contacts for company_id:", userCompany.company_id);
      
      const { data, error } = await supabase
        .from("properties")
        .select("id, address, seller_agent_name, seller_agent_email, seller_agent_phone")
        .eq("company_id", userCompany.company_id)
        .not("seller_agent_name", "is", null);
      
      if (error) {
        console.error("❌ Error fetching property contacts:", error);
        return [];
      }
      
      console.log("✅ Property contacts fetched:", data?.length, "entries");
      
      // Group by unique contact (email or phone)
      const uniqueContacts = new Map();
      
      data?.forEach((property) => {
        const key = property.seller_agent_email || property.seller_agent_phone || property.seller_agent_name;
        if (key && !uniqueContacts.has(key)) {
          uniqueContacts.set(key, {
            id: `property-${property.id}`, // Unique ID for property contacts
            full_name: property.seller_agent_name,
            email: property.seller_agent_email,
            phone: property.seller_agent_phone,
            type: "Agent",
            source: "property", // Mark as coming from property
            property_id: property.id,
            property_address: property.address,
          });
        }
      });
      
      return Array.from(uniqueContacts.values());
    },
    enabled: !!userCompany?.company_id,
  });

  // Combine both contact sources
  const allContacts = useMemo(() => {
    const manual = (manualContacts || []).map(c => ({ ...c, source: "manual" }));
    const fromProperties = propertyContacts || [];
    return [...manual, ...fromProperties];
  }, [manualContacts, propertyContacts]);

  // Fetch properties related to a specific contact
  const { data: contactProperties, isLoading: isLoadingContactProperties } = useQuery({
    queryKey: ["contact-properties", viewingContactProperties?.id, userCompany?.company_id],
    queryFn: async () => {
      if (!viewingContactProperties || !userCompany?.company_id) return [];
      
      console.log("🔍 Fetching properties for contact:", viewingContactProperties);
      
      // Build query based on available contact information
      let query = supabase
        .from("properties")
        .select("*")
        .eq("company_id", userCompany.company_id);
      
      // Match by name, email, or phone
      const conditions = [];
      if (viewingContactProperties.full_name) {
        conditions.push(viewingContactProperties.full_name);
      }
      if (viewingContactProperties.email) {
        conditions.push(viewingContactProperties.email);
      }
      if (viewingContactProperties.phone) {
        conditions.push(viewingContactProperties.phone);
      }
      
      // Use OR condition to match any of the contact's identifiers
      if (conditions.length > 0) {
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("company_id", userCompany.company_id)
          .or(
            [
              viewingContactProperties.full_name && `seller_agent_name.eq.${viewingContactProperties.full_name}`,
              viewingContactProperties.email && `seller_agent_email.eq.${viewingContactProperties.email}`,
              viewingContactProperties.phone && `seller_agent_phone.eq.${viewingContactProperties.phone}`
            ]
            .filter(Boolean)
            .join(',')
          );
        
        if (error) {
          console.error("❌ Error fetching contact properties:", error);
          return [];
        }
        
        console.log("✅ Contact properties fetched:", data?.length, "properties");
        return data || [];
      }
      
      return [];
    },
    enabled: !!viewingContactProperties && !!userCompany?.company_id,
  });

  // Apply search and filter
  const filteredContacts = useMemo(() => {
    let filtered = allContacts;

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(contact => contact.type === typeFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact => {
        const name = (contact.full_name || "").toLowerCase();
        const email = (contact.email || "").toLowerCase();
        const phone = (contact.phone || "").toLowerCase();
        const company = (contact.company || "").toLowerCase();
        
        return name.includes(query) || 
               email.includes(query) || 
               phone.includes(query) ||
               company.includes(query);
      });
    }

    return filtered;
  }, [allContacts, typeFilter, searchQuery]);

  const isLoading = isLoadingManual || isLoadingProperties;

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!userCompany?.company_id) throw new Error("No company found");
      
      const { error } = await supabase.from("contacts").insert([{
        ...data,
        user_id: user.id,
        company_id: userCompany.company_id,
      }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", userCompany?.company_id] });
      toast({
        title: "Contact added",
        description: "The contact has been added successfully.",
      });
      setIsAddingContact(false);
      setContactForm({
        full_name: "",
        email: "",
        phone: "",
        company: "",
        type: "Agent",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to add contact: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!editingContact?.id) throw new Error("No contact selected");
      
      const { error } = await supabase
        .from("contacts")
        .update(data)
        .eq("id", editingContact.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", userCompany?.company_id] });
      toast({
        title: "Contact updated",
        description: "The contact has been updated successfully.",
      });
      setEditingContact(null);
      setContactForm({
        full_name: "",
        email: "",
        phone: "",
        company: "",
        type: "Agent",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update contact: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", userCompany?.company_id] });
      toast({
        title: "Contact deleted",
        description: "The contact has been deleted successfully.",
      });
      setEditingContact(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete contact: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.full_name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a contact name.",
        variant: "destructive",
      });
      return;
    }
    createContactMutation.mutate(contactForm);
  };

  const handleViewContact = (contact: any) => {
    // Open properties modal for any contact
    setViewingContactProperties(contact);
  };

  const handleEditContact = (contact: any) => {
    // Only allow editing manually added contacts
    if (contact.source === "property") {
      toast({
        title: "Cannot edit",
        description: "This contact is from a property and cannot be edited directly. You can create a manual contact instead.",
        variant: "destructive",
      });
      return;
    }
    
    setEditingContact(contact);
    setContactForm({
      full_name: contact.full_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      type: contact.type || "Agent",
      notes: contact.notes || "",
    });
  };

  const handlePropertyClick = (propertyId: string) => {
    // Navigate to property detail page
    navigate(`/properties?property=${propertyId}`);
    setViewingContactProperties(null);
  };

  const handleUpdateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.full_name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a contact name.",
        variant: "destructive",
      });
      return;
    }
    updateContactMutation.mutate(contactForm);
  };

  const handleDeleteContact = () => {
    if (editingContact?.id) {
      deleteContactMutation.mutate(editingContact.id);
    }
  };

  const handleCloseModal = () => {
    setIsAddingContact(false);
    setEditingContact(null);
    setContactForm({
      full_name: "",
      email: "",
      phone: "",
      company: "",
      type: "Agent",
      notes: "",
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Agent":
        return "bg-primary text-primary-foreground";
      case "Seller":
        return "bg-warning text-warning-foreground";
      case "Buyer":
        return "bg-success text-success-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-muted-foreground">Loading contacts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Contacts</h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-2">
            Manage your network of agents, sellers, and buyers
          </p>
        </div>
        <Button size={isMobile ? "default" : "lg"} className="w-full sm:w-auto text-base" onClick={() => setIsAddingContact(true)}>
          <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Add Contact
        </Button>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Agent">Agent</SelectItem>
                  <SelectItem value="Seller">Seller</SelectItem>
                  <SelectItem value="Buyer">Buyer</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(searchQuery || typeFilter !== "all") && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredContacts.length} of {allContacts.length} contacts
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredContacts && filteredContacts.length === 0 && !searchQuery && typeFilter === "all" ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-4">
            <Users className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-2xl font-semibold text-foreground">No contacts yet</h3>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Build your network by adding your first contact
            </p>
            <Button size="lg" className="mt-4" onClick={() => setIsAddingContact(true)}>
              <Plus className="mr-2 h-5 w-5" />
              Add Contact
            </Button>
          </CardContent>
        </Card>
      ) : filteredContacts.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-4">
            <Search className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-2xl font-semibold text-foreground">No contacts found</h3>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Try adjusting your search or filters
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("all");
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* Mobile Card View */
        <div className="space-y-3">
          {filteredContacts?.map((contact) => (
            <Card 
              key={contact.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleViewContact(contact)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">
                        {contact.full_name || "Unnamed Contact"}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getTypeColor(contact.type)}>
                          {contact.type}
                        </Badge>
                        {contact.source === "property" && (
                          <Badge variant="outline" className="text-xs">
                            From Property
                          </Badge>
                        )}
                      </div>
                    </div>
                    {contact.source === "manual" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditContact(contact);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-2 text-sm">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.company && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{contact.company}</span>
                      </div>
                    )}
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
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company/Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts?.map((contact) => (
                  <TableRow 
                    key={contact.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewContact(contact)}
                  >
                    <TableCell className="font-medium">
                      {contact.full_name || "Unnamed Contact"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(contact.type)}>
                        {contact.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {contact.email}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {contact.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.source === "property" ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            From Property
                          </Badge>
                        </div>
                      ) : contact.company ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building className="h-4 w-4" />
                          {contact.company}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {contact.source === "manual" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditContact(contact);
                          }}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewContact(contact);
                          }}
                        >
                          View Properties
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Contact Properties Modal */}
      <Dialog open={!!viewingContactProperties} onOpenChange={() => setViewingContactProperties(null)}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <Home className="h-6 w-6" />
              Properties for {viewingContactProperties?.full_name || "Contact"}
            </DialogTitle>
            <div className="flex flex-col gap-1 pt-2 text-sm text-muted-foreground">
              {viewingContactProperties?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {viewingContactProperties.email}
                </div>
              )}
              {viewingContactProperties?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {viewingContactProperties.phone}
                </div>
              )}
            </div>
          </DialogHeader>
          
          <div className="pt-4">
            {isLoadingContactProperties ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading properties...</p>
              </div>
            ) : !contactProperties || contactProperties.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Home className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <h3 className="text-lg font-semibold">No Properties Found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This contact doesn't have any associated properties yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Found {contactProperties.length} {contactProperties.length === 1 ? 'property' : 'properties'}
                </p>
                <div className="grid gap-3">
                  {contactProperties.map((property: any) => (
                    <Card 
                      key={property.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handlePropertyClick(property.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start gap-2">
                              <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
                              <div>
                                <h4 className="font-semibold text-base">{property.address}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {property.city}, {property.state} {property.zip}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 text-sm items-center">
                              {property.price && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <DollarSign className="h-4 w-4" />
                                  <span className="font-medium">
                                    ${property.price.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {property.bed && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Bed className="h-4 w-4" />
                                  <span>{property.bed} bed</span>
                                </div>
                              )}
                              {property.bath && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Bath className="h-4 w-4" />
                                  <span>{property.bath} bath</span>
                                </div>
                              )}
                              {property.home_type && (
                                <Badge variant="outline">{property.home_type}</Badge>
                              )}
                              {property.workflow_state && (
                                <Badge 
                                  variant="secondary"
                                  className="bg-primary/10 text-primary border-primary/20"
                                >
                                  {property.workflow_state}
                                </Badge>
                              )}
                            </div>
                            
                            {property.listing_url && (
                              <a
                                href={property.listing_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View on Zillow
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePropertyClick(property.id);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Contact Modal */}
      <Dialog open={isAddingContact || !!editingContact} onOpenChange={handleCloseModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">
              {editingContact ? "Edit Contact" : "Add New Contact"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editingContact ? handleUpdateContact : handleAddContact} className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={contactForm.full_name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={contactForm.type}
                  onValueChange={(value) => setContactForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Agent">Agent</SelectItem>
                    <SelectItem value="Seller">Seller</SelectItem>
                    <SelectItem value="Buyer">Buyer</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={contactForm.company}
                onChange={(e) => setContactForm(prev => ({ ...prev, company: e.target.value }))}
                placeholder="ABC Real Estate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={contactForm.notes}
                onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional information about this contact..."
                rows={4}
              />
            </div>

            <div className="flex justify-between gap-3 pt-4">
              {editingContact && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteContact}
                  disabled={deleteContactMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteContactMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              )}
              <div className={`flex gap-3 ${!editingContact ? 'ml-auto' : ''}`}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createContactMutation.isPending || updateContactMutation.isPending}
                >
                  {editingContact 
                    ? (updateContactMutation.isPending ? "Updating..." : "Update Contact")
                    : (createContactMutation.isPending ? "Adding..." : "Add Contact")
                  }
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
