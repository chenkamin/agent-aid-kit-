import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Mail, Phone, Building, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
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

export default function Contacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
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
  
  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      
      console.log("🔍 Fetching contacts for company_id:", userCompany.company_id);
      
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("❌ Error fetching contacts:", error);
        return [];
      }
      
      console.log("✅ Contacts fetched:", data?.length, "contacts");
      
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

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

  const handleEditContact = (contact: any) => {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Contacts</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Manage your network of agents, sellers, and buyers
          </p>
        </div>
        <Button size="lg" className="text-base" onClick={() => setIsAddingContact(true)}>
          <Plus className="mr-2 h-5 w-5" />
          Add Contact
        </Button>
      </div>

      {contacts && contacts.length === 0 ? (
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts?.map((contact) => (
                  <TableRow 
                    key={contact.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEditContact(contact)}
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
                      {contact.company ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building className="h-4 w-4" />
                          {contact.company}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Contact Modal */}
      <Dialog open={isAddingContact || !!editingContact} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
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
