import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Mail, Phone, Building } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

export default function Contacts() {
  const { user } = useAuth();
  
  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

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
        <Link to="/contacts/new">
          <Button size="lg" className="text-base">
            <Plus className="mr-2 h-5 w-5" />
            Add Contact
          </Button>
        </Link>
      </div>

      {contacts && contacts.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-4">
            <Users className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-2xl font-semibold text-foreground">No contacts yet</h3>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Build your network by adding your first contact
            </p>
            <Link to="/contacts/new">
              <Button size="lg" className="mt-4">
                <Plus className="mr-2 h-5 w-5" />
                Add Contact
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contacts?.map((contact) => (
            <Link key={contact.id} to={`/contacts/${contact.id}`}>
              <Card className="hover:shadow-xl transition-all cursor-pointer h-full">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">
                      {contact.full_name || "Unnamed Contact"}
                    </CardTitle>
                    <Badge className={getTypeColor(contact.type)}>
                      {contact.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contact.company && (
                    <div className="flex items-center text-base text-muted-foreground">
                      <Building className="h-4 w-4 mr-2" />
                      {contact.company}
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center text-base text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      {contact.email}
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center text-base text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      {contact.phone}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
