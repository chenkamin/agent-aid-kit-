import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Building2, 
  MessageSquare,
  TrendingUp,
  DollarSign,
  Flame,
  ThermometerSun,
  Snowflake,
  Target,
  Clock,
  Zap,
  Send,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ArrowUpRight,
  Activity
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, isWithinInterval, subDays, startOfMonth, subMonths } from "date-fns";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
        .select("*, buy_boxes(name)")
        .eq("company_id", userCompany.company_id);
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch SMS messages
  const { data: allSmsMessages } = useQuery({
    queryKey: ["dashboard-all-sms", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data } = await supabase
        .from("sms_messages")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false });
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
        .order("due_at", { ascending: true });
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Calculate SMS metrics
  const thisWeekStart = startOfWeek(new Date());
  const thisWeekEnd = endOfWeek(new Date());
  const lastWeekStart = startOfWeek(subDays(new Date(), 7));
  const lastWeekEnd = endOfWeek(subDays(new Date(), 7));

  const smsThisWeek = allSmsMessages?.filter((msg) =>
    isWithinInterval(new Date(msg.created_at), { start: thisWeekStart, end: thisWeekEnd })
  ) || [];

  const smsLastWeek = allSmsMessages?.filter((msg) =>
    isWithinInterval(new Date(msg.created_at), { start: lastWeekStart, end: lastWeekEnd })
  ) || [];

  const incomingSmsThisWeek = smsThisWeek.filter((msg) => msg.direction === "incoming").length;
  const outgoingSmsThisWeek = smsThisWeek.filter((msg) => msg.direction === "outgoing").length;

  const smsGrowth = smsLastWeek.length > 0 
    ? ((smsThisWeek.length - smsLastWeek.length) / smsLastWeek.length * 100).toFixed(0)
    : 0;

  // AI Score distribution
  const hotLeads = allSmsMessages?.filter((msg) => msg.ai_score === 3).length || 0;
  const warmLeads = allSmsMessages?.filter((msg) => msg.ai_score === 2).length || 0;
  const coldLeads = allSmsMessages?.filter((msg) => msg.ai_score === 1).length || 0;
  const totalScoredLeads = hotLeads + warmLeads + coldLeads;

  // Calculate conversion metrics
  const propertiesInNegotiation = properties?.filter((p) => 
    p.workflow_state === "Negotiating" || p.workflow_state === "Under Contract"
  ).length || 0;

  const propertiesClosed = properties?.filter((p) => p.workflow_state === "Closed").length || 0;

  const activeProperties = properties?.filter((p) => 
    p.workflow_state !== "Not Relevant" && 
    p.workflow_state !== "Archived" &&
    p.workflow_state !== "Closed"
  ).length || 0;

  const conversionRate = activeProperties > 0 
    ? ((propertiesInNegotiation + propertiesClosed) / activeProperties * 100).toFixed(1)
    : 0;

  // Response rate
  const sentSms = allSmsMessages?.filter((msg) => msg.direction === "outgoing").length || 0;
  const receivedSms = allSmsMessages?.filter((msg) => msg.direction === "incoming").length || 0;
  const responseRate = sentSms > 0 ? ((receivedSms / sentSms) * 100).toFixed(0) : 0;

  // ROI Calculations (example metrics - adjust based on your business model)
  const avgDealValue = 15000; // Average profit per closed deal
  const estimatedROI = propertiesClosed * avgDealValue;
  const timeSpentManual = activeProperties * 2; // 2 hours per property if manual
  const timeSpentWithDealio = activeProperties * 0.5; // 30 min per property with automation
  const timeSaved = timeSpentManual - timeSpentWithDealio;

  // Activity completion rate
  const completedActivities = activities?.filter((a) => a.status === "completed").length || 0;
  const openActivities = activities?.filter((a) => a.status === "open").length || 0;
  const overdueActivities = activities?.filter((a) => 
    a.status === "open" && new Date(a.due_at) < new Date()
  ).length || 0;

  // Last 7 days SMS activity chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    const smsForDay = allSmsMessages?.filter((msg) =>
      isWithinInterval(new Date(msg.created_at), { start: dayStart, end: dayEnd })
    ) || [];

    return {
      name: format(date, "EEE"),
      sent: smsForDay.filter((m) => m.direction === "outgoing").length,
      received: smsForDay.filter((m) => m.direction === "incoming").length,
    };
  });

  // Workflow state distribution for active properties
  const workflowData = [
    { name: "Initial", value: properties?.filter((p) => p.workflow_state === "Initial").length || 0, color: "#94a3b8" },
    { name: "Research", value: properties?.filter((p) => p.workflow_state === "Research").length || 0, color: "#3b82f6" },
    { name: "In Progress", value: properties?.filter((p) => p.workflow_state === "On Progress").length || 0, color: "#f59e0b" },
    { name: "Negotiating", value: properties?.filter((p) => p.workflow_state === "Negotiating").length || 0, color: "#8b5cf6" },
    { name: "Under Contract", value: properties?.filter((p) => p.workflow_state === "Under Contract").length || 0, color: "#10b981" },
    { name: "Closed", value: properties?.filter((p) => p.workflow_state === "Closed").length || 0, color: "#22c55e" },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header with ROI Highlight */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white shadow-xl">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            💰 Your Deal-Making Command Center
          </h1>
          <p className="text-lg text-blue-50 mb-4">
            Track conversations, close deals, and watch your ROI soar
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-medium">Estimated Revenue</span>
              </div>
              <div className="text-3xl font-bold">${estimatedROI.toLocaleString()}</div>
              <p className="text-xs text-blue-100 mt-1">{propertiesClosed} deals closed</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">Time Saved</span>
              </div>
              <div className="text-3xl font-bold">{timeSaved.toFixed(0)}hrs</div>
              <p className="text-xs text-blue-100 mt-1">vs manual tracking</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-5 w-5" />
                <span className="text-sm font-medium">Conversion Rate</span>
              </div>
              <div className="text-3xl font-bold">{conversionRate}%</div>
              <p className="text-xs text-blue-100 mt-1">Active → Deal</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 opacity-10">
          <TrendingUp className="h-64 w-64" />
        </div>
      </div>

      {/* SMS Communication Metrics - HERO SECTION */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              SMS This Week
            </CardTitle>
            <MessageSquare className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-blue-600">{smsThisWeek.length}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={Number(smsGrowth) >= 0 ? "default" : "destructive"} className="gap-1">
                <ArrowUpRight className="h-3 w-3" />
                {smsGrowth}% vs last week
              </Badge>
            </div>
            <Progress value={Math.min((smsThisWeek.length / 50) * 100, 100)} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-green-900 dark:text-green-100">
              Response Rate
            </CardTitle>
            <PhoneCall className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-green-600">{responseRate}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              {receivedSms} replies from {sentSms} sent
            </p>
            <Progress value={Number(responseRate)} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-red-900 dark:text-red-100">
              🔥 Hot Leads
            </CardTitle>
            <Flame className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-red-600">{hotLeads}</div>
            <p className="text-xs text-muted-foreground mt-2">
              AI Score: 3/3 - Very Interested!
            </p>
            <Button size="sm" className="w-full mt-3 bg-red-600 hover:bg-red-700" onClick={() => navigate("/sms?aiScore=3")}>
              Contact Now →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-purple-900 dark:text-purple-100">
              Active Deals
            </CardTitle>
            <Building2 className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-purple-600">{activeProperties}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {propertiesInNegotiation} in negotiation
            </p>
            <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => navigate("/properties")}>
              View Pipeline →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* AI Lead Scoring Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              SMS Activity - Last 7 Days
            </CardTitle>
            <CardDescription>Track your outreach and responses in real-time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#3b82f6" name="Sent" radius={[8, 8, 0, 0]} />
                <Bar dataKey="received" fill="#10b981" name="Received" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="text-lg font-bold">AI Lead Quality</CardTitle>
            <CardDescription>Intelligent scoring on {totalScoredLeads} conversations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-semibold">Hot Leads</span>
                </div>
                <span className="text-2xl font-black text-red-600">{hotLeads}</span>
              </div>
              <Progress value={totalScoredLeads > 0 ? (hotLeads / totalScoredLeads) * 100 : 0} className="h-3" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ThermometerSun className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-semibold">Warm Leads</span>
                </div>
                <span className="text-2xl font-black text-orange-600">{warmLeads}</span>
              </div>
              <Progress value={totalScoredLeads > 0 ? (warmLeads / totalScoredLeads) * 100 : 0} className="h-3" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Snowflake className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold">Cold Leads</span>
                </div>
                <span className="text-2xl font-black text-blue-600">{coldLeads}</span>
              </div>
              <Progress value={totalScoredLeads > 0 ? (coldLeads / totalScoredLeads) * 100 : 0} className="h-3" />
            </div>

            <Button className="w-full mt-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700" onClick={() => navigate("/sms?aiScore=3")}>
              <Zap className="h-4 w-4 mr-2" />
              Focus on Hot Leads
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline & Activities */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Target className="h-5 w-5 text-purple-600" />
              Deal Pipeline
            </CardTitle>
            <CardDescription>Visualize your property workflow stages</CardDescription>
          </CardHeader>
          <CardContent>
            {workflowData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={workflowData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {workflowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No active properties yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Activity className="h-5 w-5 text-green-600" />
              Task Completion
            </CardTitle>
            <CardDescription>Stay on top of your follow-ups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">Completed</span>
                </div>
                <span className="text-3xl font-black text-green-600">{completedActivities}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">Open</span>
                </div>
                <span className="text-3xl font-black text-blue-600">{openActivities}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold">Overdue</span>
                </div>
                <span className="text-3xl font-black text-red-600">{overdueActivities}</span>
              </div>
            </div>

            <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/activities")}>
              View All Activities →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action CTAs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors cursor-pointer" onClick={() => navigate("/sms")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Send SMS Campaign
            </CardTitle>
            <CardDescription>Reach out to your hot leads instantly</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Start Messaging →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors cursor-pointer" onClick={() => navigate("/properties")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              Review Properties
            </CardTitle>
            <CardDescription>Check new listings matching your buy boxes</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              View Pipeline →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 hover:border-green-400 transition-colors cursor-pointer" onClick={() => navigate("/automations")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              Setup Automation
            </CardTitle>
            <CardDescription>Let AI handle your follow-ups 24/7</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-green-600 hover:bg-green-700">
              Create Workflow →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
