import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Activity, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

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

  const { data: properties } = useQuery({
    queryKey: ["properties", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      // Exclude "Not Relevant" properties by default
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .neq("status", "Not Relevant");
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("*");
      return data || [];
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("*");
      return data || [];
    },
  });

  const statusCounts = properties?.reduce((acc, prop) => {
    acc[prop.status] = (acc[prop.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    {
      title: "Total Properties",
      value: properties?.length || 0,
      icon: Building2,
      href: "/properties",
      color: "text-primary",
    },
    {
      title: "Contacts",
      value: contacts?.length || 0,
      icon: Users,
      href: "/contacts",
      color: "text-accent",
    },
    {
      title: "Active Tasks",
      value: activities?.filter((a) => a.status === "open").length || 0,
      icon: Activity,
      href: "/activities",
      color: "text-warning",
    },
    {
      title: "Avg. Property Value",
      value: properties?.length
        ? `$${Math.round(
            properties.reduce((acc, p) => acc + (Number(p.price) || 0), 0) /
              properties.length
          ).toLocaleString()}`
        : "$0",
      icon: TrendingUp,
      href: "/properties",
      color: "text-success",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Welcome back! Here's what's happening with your properties.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} to={stat.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Status Breakdown */}
      {statusCounts && Object.keys(statusCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Properties by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-base font-medium text-foreground">{status}</span>
                  <span className="text-2xl font-bold text-primary">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Link to="/properties/new">
            <Button className="text-base px-6 py-6">
              <Building2 className="mr-2 h-5 w-5" />
              Add Property
            </Button>
          </Link>
          <Link to="/contacts/new">
            <Button variant="secondary" className="text-base px-6 py-6">
              <Users className="mr-2 h-5 w-5" />
              Add Contact
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
