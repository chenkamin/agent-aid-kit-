import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Building2, 
  Users, 
  Activity, 
  ListChecks,
  MessageSquare,
  Mail,
  Plus,
  TrendingUp,
  Calendar,
  ArrowRight,
  Briefcase,
  MapPin
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // Fetch all properties
  const { data: properties } = useQuery({
    queryKey: ["dashboard-properties", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("company_id", userCompany.company_id);
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch buy boxes
  const { data: buyBoxes } = useQuery({
    queryKey: ["dashboard-buy-boxes", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data } = await supabase
        .from("buy_boxes")
        .select("*")
        .eq("company_id", userCompany.company_id);
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch contacts
  const { data: contacts } = useQuery({
    queryKey: ["dashboard-contacts", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", userCompany.company_id);
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch activities
  const { data: activities } = useQuery({
    queryKey: ["dashboard-activities", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data } = await supabase
        .from("activities")
        .select("*, properties(address, city)")
        .eq("company_id", userCompany.company_id)
        .eq("status", "open")
        .order("due_at", { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch SMS messages from this week
  const { data: smsMessages } = useQuery({
    queryKey: ["dashboard-sms", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const weekStart = startOfWeek(new Date());
      const { data } = await supabase
        .from("sms_messages")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .gte("created_at", weekStart.toISOString());
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch email messages from this week
  const { data: emailMessages } = useQuery({
    queryKey: ["dashboard-emails", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const weekStart = startOfWeek(new Date());
      const { data } = await supabase
        .from("email_messages" as any)
        .select("*")
        .eq("company_id", userCompany.company_id)
        .gte("created_at", weekStart.toISOString());
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Calculate workflow state distribution
  const workflowStateData = properties?.reduce((acc, prop) => {
    const state = prop.workflow_state || "Initial";
    const existing = acc.find((item) => item.name === state);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: state, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]) || [];

  // Colors for workflow states
  const WORKFLOW_COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
    "#6366f1", // indigo
    "#06b6d4", // cyan
    "#84cc16", // lime
  ];

  // Calculate property type distribution
  const propertyTypeData = properties?.reduce((acc, prop) => {
    const type = prop.home_type || "Other";
    const existing = acc.find((item) => item.name === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]) || [];

  // Calculate this week's communication stats
  const thisWeekStart = startOfWeek(new Date());
  const thisWeekEnd = endOfWeek(new Date());
  const smsThisWeek = smsMessages?.filter((msg) =>
    isWithinInterval(new Date(msg.created_at), { start: thisWeekStart, end: thisWeekEnd })
  ).length || 0;
  const emailsThisWeek = emailMessages?.filter((msg) =>
    isWithinInterval(new Date(msg.created_at), { start: thisWeekStart, end: thisWeekEnd })
  ).length || 0;

  // Top stats
  const openActivitiesCount = activities?.length || 0;
  const totalProperties = properties?.filter((p) => p.workflow_state !== "Not Relevant" && p.workflow_state !== "Archived").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-base md:text-lg text-muted-foreground mt-1">
          {userCompany?.companies?.name 
            ? `Welcome back to ${userCompany.companies.name}`
            : "Welcome back! Here's your overview."}
        </p>
      </div>

      {/* Top Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Properties
            </CardTitle>
            <Building2 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalProperties}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {properties?.length || 0} total including archived
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Buy Boxes / Lists
            </CardTitle>
            <Briefcase className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{buyBoxes?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active search criteria
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Activities
            </CardTitle>
            <ListChecks className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{openActivitiesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasks requiring attention
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contacts
                  </CardTitle>
            <Users className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
            <div className="text-2xl font-bold text-foreground">{contacts?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Agents, sellers, buyers
            </p>
                </CardContent>
              </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Create new records with one click</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              size="lg" 
              className="w-full h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/properties/new")}
            >
              <Building2 className="h-6 w-6" />
              <span className="font-semibold">Create Property</span>
            </Button>
            <Button 
              size="lg" 
              variant="secondary"
              className="w-full h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/activities")}
            >
              <Activity className="h-6 w-6" />
              <span className="font-semibold">Create Activity</span>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="w-full h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/contacts")}
            >
              <Users className="h-6 w-6" />
              <span className="font-semibold">Create Contact</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Workflow States Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Properties by Workflow Stage</CardTitle>
            <CardDescription>Distribution of properties across workflow states</CardDescription>
          </CardHeader>
          <CardContent>
            {workflowStateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={workflowStateData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No properties data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Types Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Properties by Type</CardTitle>
            <CardDescription>Breakdown of property types in your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            {propertyTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={propertyTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {propertyTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={WORKFLOW_COLORS[index % WORKFLOW_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No property type data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Communication & Activities Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* This Week's Communication Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">This Week's Communication</CardTitle>
            <CardDescription>
              {format(thisWeekStart, "MMM d")} - {format(thisWeekEnd, "MMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SMS Messages</p>
                  <p className="text-2xl font-bold">{smsThisWeek}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Emails Sent</p>
                  <p className="text-2xl font-bold">{emailsThisWeek}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <Link to="/communication">
              <Button variant="outline" className="w-full">
                View Communication History
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Open Activities */}
      <Card>
        <CardHeader>
            <CardTitle className="text-lg">Upcoming Activities</CardTitle>
            <CardDescription>Your next {activities?.length || 0} open tasks</CardDescription>
        </CardHeader>
          <CardContent>
            {activities && activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate(`/activities?activity=${activity.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{activity.title}</p>
                      {activity.properties && (
                        <p className="text-xs text-muted-foreground truncate">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {activity.properties.address}
                        </p>
                      )}
                      {activity.due_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {format(new Date(activity.due_at), "MMM d, h:mm a")}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2 flex-shrink-0">
                      {activity.type}
                    </Badge>
                  </div>
                ))}
                <Link to="/activities">
                  <Button variant="outline" className="w-full mt-2">
                    View All Activities
                    <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No open activities</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => navigate("/activities")}
                >
                  Create Activity
            </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/properties")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Property Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div className="text-2xl font-bold text-foreground">
                {properties && properties.length > 0
                  ? `$${Math.round(
                      properties.reduce((acc, p) => acc + (Number(p.price) || 0), 0) /
                        properties.length
                    ).toLocaleString()}`
                  : "$0"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/properties")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div className="text-2xl font-bold text-foreground">
                {properties?.filter((p) =>
                  isWithinInterval(new Date(p.created_at || ""), { start: thisWeekStart, end: thisWeekEnd })
                ).length || 0}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Properties added</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/lists")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
              <div className="text-2xl font-bold text-foreground">
                {buyBoxes?.length || 0}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Buy boxes configured</p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
