import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  MessageSquare,
  Send,
  PhoneIncoming,
  TrendingUp,
  TrendingDown,
  Edit2,
  Save,
  X,
  Trophy,
  Flame,
  ArrowRight,
  Handshake,
  FileCheck,
  CheckCircle2,
  Calendar,
  BarChart3,
  Sparkles,
} from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  isWithinInterval,
  format,
} from "date-fns";
// Confetti celebration (optional - install canvas-confetti if needed)
const triggerConfetti = () => {
  // If canvas-confetti is installed, it will show celebration
  try {
    const confetti = (window as any).confetti;
    if (confetti) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  } catch (e) {
    // Confetti not available, silently ignore
  }
};

interface KPIGoals {
  id?: string;
  company_id: string;
  period_type: "weekly" | "monthly";
  sms_sent_goal: number;
  sms_responses_goal: number;
  properties_follow_up_goal: number;
  properties_negotiating_goal: number;
  properties_under_contract_goal: number;
  properties_closing_goal: number;
  properties_closed_goal: number;
  milestones_notified: Record<string, boolean>;
  current_period_start?: string;
}

interface KPIMetric {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  goalKey: keyof KPIGoals;
  current: number;
  goal: number;
  previousPeriod: number;
}

export default function KPIGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [periodType, setPeriodType] = useState<"weekly" | "monthly">("weekly");
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoals, setEditedGoals] = useState<Partial<KPIGoals>>({});

  // Mark that user has viewed KPI goals (for onboarding)
  useEffect(() => {
    const markKpiViewed = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase
          .from('profiles')
          .update({ onboarding_viewed_kpi: true })
          .eq('id', authUser.id);
      }
    };
    markKpiViewed();
  }, []);

  // Get date ranges
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const previousMonthStart = startOfMonth(subMonths(now, 1));
  const previousMonthEnd = endOfMonth(subMonths(now, 1));

  // Fetch user's company
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

  // Fetch KPI goals
  const { data: kpiGoals } = useQuery({
    queryKey: ["kpi-goals", userCompany?.company_id, periodType],
    queryFn: async () => {
      if (!userCompany?.company_id) return null;
      const { data, error } = await supabase
        .from("company_kpi_goals")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .eq("period_type", periodType)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as KPIGoals | null;
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch SMS messages for current and previous periods
  const { data: smsMessages } = useQuery({
    queryKey: ["kpi-sms", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data } = await supabase
        .from("sms_messages")
        .select("direction, created_at")
        .eq("company_id", userCompany.company_id)
        .gte("created_at", subMonths(now, 2).toISOString());
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch workflow history for current and previous periods
  const { data: workflowHistory } = useQuery({
    queryKey: ["kpi-workflow", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data } = await supabase
        .from("property_workflow_history")
        .select("to_state, changed_at")
        .gte("changed_at", subMonths(now, 2).toISOString());
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Calculate metrics
  const calculateMetrics = (period: "current" | "previous"): Record<string, number> => {
    const dateRange = periodType === "weekly"
      ? period === "current"
        ? { start: currentWeekStart, end: currentWeekEnd }
        : { start: previousWeekStart, end: previousWeekEnd }
      : period === "current"
        ? { start: currentMonthStart, end: currentMonthEnd }
        : { start: previousMonthStart, end: previousMonthEnd };

    const smsInPeriod = smsMessages?.filter((msg) =>
      isWithinInterval(new Date(msg.created_at), dateRange)
    ) || [];

    const workflowInPeriod = workflowHistory?.filter((wf) =>
      isWithinInterval(new Date(wf.changed_at), dateRange)
    ) || [];

    return {
      sms_sent: smsInPeriod.filter((m) => m.direction === "outgoing").length,
      sms_responses: smsInPeriod.filter((m) => m.direction === "incoming").length,
      follow_up: workflowInPeriod.filter((w) => w.to_state === "Follow Up").length,
      negotiating: workflowInPeriod.filter((w) => w.to_state === "Negotiating").length,
      under_contract: workflowInPeriod.filter((w) => w.to_state === "Under Contract").length,
      closing: workflowInPeriod.filter((w) => w.to_state === "Closing").length,
      closed: workflowInPeriod.filter((w) => w.to_state === "Closed").length,
    };
  };

  const currentMetrics = calculateMetrics("current");
  const previousMetrics = calculateMetrics("previous");

  // Define all KPI metrics
  const metrics: KPIMetric[] = [
    {
      key: "sms_sent",
      label: "SMS Sent",
      icon: Send,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-950",
      goalKey: "sms_sent_goal",
      current: currentMetrics.sms_sent,
      goal: kpiGoals?.sms_sent_goal || 0,
      previousPeriod: previousMetrics.sms_sent,
    },
    {
      key: "sms_responses",
      label: "SMS Responses",
      icon: PhoneIncoming,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-950",
      goalKey: "sms_responses_goal",
      current: currentMetrics.sms_responses,
      goal: kpiGoals?.sms_responses_goal || 0,
      previousPeriod: previousMetrics.sms_responses,
    },
    {
      key: "follow_up",
      label: "To Follow Up",
      icon: ArrowRight,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-950",
      goalKey: "properties_follow_up_goal",
      current: currentMetrics.follow_up,
      goal: kpiGoals?.properties_follow_up_goal || 0,
      previousPeriod: previousMetrics.follow_up,
    },
    {
      key: "negotiating",
      label: "To Negotiating",
      icon: Handshake,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-950",
      goalKey: "properties_negotiating_goal",
      current: currentMetrics.negotiating,
      goal: kpiGoals?.properties_negotiating_goal || 0,
      previousPeriod: previousMetrics.negotiating,
    },
    {
      key: "under_contract",
      label: "Under Contract",
      icon: FileCheck,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 dark:bg-indigo-950",
      goalKey: "properties_under_contract_goal",
      current: currentMetrics.under_contract,
      goal: kpiGoals?.properties_under_contract_goal || 0,
      previousPeriod: previousMetrics.under_contract,
    },
    {
      key: "closing",
      label: "To Closing",
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-950",
      goalKey: "properties_closing_goal",
      current: currentMetrics.closing,
      goal: kpiGoals?.properties_closing_goal || 0,
      previousPeriod: previousMetrics.closing,
    },
    {
      key: "closed",
      label: "Deals Closed",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-950",
      goalKey: "properties_closed_goal",
      current: currentMetrics.closed,
      goal: kpiGoals?.properties_closed_goal || 0,
      previousPeriod: previousMetrics.closed,
    },
  ];

  // Calculate overall progress
  const calculateOverallProgress = () => {
    const metricsWithGoals = metrics.filter((m) => m.goal > 0);
    if (metricsWithGoals.length === 0) return 0;
    
    const totalProgress = metricsWithGoals.reduce((sum, m) => {
      const progress = Math.min((m.current / m.goal) * 100, 100);
      return sum + progress;
    }, 0);
    
    return Math.round(totalProgress / metricsWithGoals.length);
  };

  const overallProgress = calculateOverallProgress();

  // Check milestones and create notifications
  const checkMilestonesMutation = useMutation({
    mutationFn: async () => {
      if (!userCompany?.company_id || !user?.id || !kpiGoals) return;

      // Check milestones for each metric with a goal
      for (const metric of metrics) {
        if (metric.goal > 0) {
          await supabase.rpc("check_kpi_milestones", {
            p_company_id: userCompany.company_id,
            p_user_id: user.id,
            p_period_type: periodType,
            p_metric_key: metric.key,
            p_metric_label: metric.label,
            p_current_value: metric.current,
            p_goal_value: metric.goal,
          });
        }
      }
    },
  });

  // Check milestones when metrics change
  useEffect(() => {
    if (kpiGoals && metrics.some((m) => m.goal > 0)) {
      checkMilestonesMutation.mutate();
    }
  }, [kpiGoals, currentMetrics, periodType]);

  // Save goals mutation
  const saveGoalsMutation = useMutation({
    mutationFn: async (goals: Partial<KPIGoals>) => {
      if (!userCompany?.company_id) throw new Error("No company found");

      const goalData = {
        company_id: userCompany.company_id,
        period_type: periodType,
        sms_sent_goal: goals.sms_sent_goal || 0,
        sms_responses_goal: goals.sms_responses_goal || 0,
        properties_follow_up_goal: goals.properties_follow_up_goal || 0,
        properties_negotiating_goal: goals.properties_negotiating_goal || 0,
        properties_under_contract_goal: goals.properties_under_contract_goal || 0,
        properties_closing_goal: goals.properties_closing_goal || 0,
        properties_closed_goal: goals.properties_closed_goal || 0,
        milestones_notified: {},
        current_period_start: periodType === "weekly" ? currentWeekStart.toISOString() : currentMonthStart.toISOString(),
      };

      const { error } = await supabase
        .from("company_kpi_goals")
        .upsert(goalData, { onConflict: "company_id,period_type" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-goals"] });
      toast({ title: "Goals saved!", description: `Your ${periodType} goals have been updated.` });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Initialize edited goals when kpiGoals changes
  useEffect(() => {
    if (kpiGoals) {
      setEditedGoals(kpiGoals);
    } else {
      setEditedGoals({
        sms_sent_goal: 0,
        sms_responses_goal: 0,
        properties_follow_up_goal: 0,
        properties_negotiating_goal: 0,
        properties_under_contract_goal: 0,
        properties_closing_goal: 0,
        properties_closed_goal: 0,
      });
    }
  }, [kpiGoals, periodType]);

  // Celebrate when overall progress hits 100%
  useEffect(() => {
    if (overallProgress >= 100) {
      triggerConfetti();
    }
  }, [overallProgress]);

  const handleSaveGoals = () => {
    saveGoalsMutation.mutate(editedGoals);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-emerald-500";
    if (progress >= 75) return "bg-green-500";
    if (progress >= 50) return "bg-amber-500";
    if (progress >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return { direction: "neutral", percent: 0 };
    const percent = Math.round(((current - previous) / previous) * 100);
    return {
      direction: percent > 0 ? "up" : percent < 0 ? "down" : "neutral",
      percent: Math.abs(percent),
    };
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-8 w-8" />
            <h1 className="text-3xl font-bold">KPI Goals</h1>
          </div>
          <p className="text-purple-100 mb-4">
            Track your progress and crush your targets
          </p>
          
          {/* Overall Progress */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 max-w-md">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Overall {periodType} Progress</span>
              <span className="text-2xl font-bold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3 bg-white/20" />
            {overallProgress >= 100 && (
              <div className="flex items-center gap-2 mt-2 text-yellow-300">
                <Trophy className="h-5 w-5" />
                <span className="font-semibold">Goals Achieved!</span>
              </div>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 opacity-10">
          <BarChart3 className="h-64 w-64" />
        </div>
      </div>

      {/* Period Selector and Edit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as "weekly" | "monthly")}>
          <TabsList>
            <TabsTrigger value="weekly" className="gap-2">
              <Calendar className="h-4 w-4" />
              This Week
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <Calendar className="h-4 w-4" />
              This Month
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            {periodType === "weekly" ? (
              <>
                {format(currentWeekStart, "MMM d")} - {format(currentWeekEnd, "MMM d, yyyy")}
              </>
            ) : (
              format(currentMonthStart, "MMMM yyyy")
            )}
          </Badge>
          
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Goals
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveGoals} disabled={saveGoalsMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveGoalsMutation.isPending ? "Saving..." : "Save Goals"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const progress = metric.goal > 0 ? Math.min((metric.current / metric.goal) * 100, 100) : 0;
          const trend = getTrend(metric.current, metric.previousPeriod);
          const isGoalMet = metric.goal > 0 && metric.current >= metric.goal;

          return (
            <Card key={metric.key} className={`relative overflow-hidden ${isGoalMet ? "ring-2 ring-emerald-500" : ""}`}>
              {isGoalMet && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-emerald-500 text-white gap-1">
                    <Sparkles className="h-3 w-3" />
                    Goal Met!
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                  <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor={metric.key} className="text-xs">Goal</Label>
                    <Input
                      id={metric.key}
                      type="number"
                      min="0"
                      value={editedGoals[metric.goalKey] || 0}
                      onChange={(e) =>
                        setEditedGoals({
                          ...editedGoals,
                          [metric.goalKey]: parseInt(e.target.value) || 0,
                        })
                      }
                      className="h-9"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl font-bold">{metric.current}</span>
                      <span className="text-muted-foreground">/ {metric.goal || "—"}</span>
                    </div>
                    
                    {metric.goal > 0 && (
                      <Progress value={progress} className={`h-2 ${getProgressColor(progress)}`} />
                    )}
                    
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-muted-foreground">
                        {metric.goal > 0 ? `${Math.round(progress)}% complete` : "No goal set"}
                      </span>
                      {trend.direction !== "neutral" && metric.previousPeriod > 0 && (
                        <div className={`flex items-center gap-1 ${
                          trend.direction === "up" ? "text-green-600" : "text-red-600"
                        }`}>
                          {trend.direction === "up" ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span>{trend.percent}%</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tips Section */}
      {!isEditing && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Flame className="h-5 w-5" />
              Tips for Success
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-900 dark:text-amber-100 space-y-2">
            <p>• <strong>Start small:</strong> Set achievable goals and gradually increase them as you build momentum.</p>
            <p>• <strong>Focus on responses:</strong> Quality conversations matter more than quantity of messages sent.</p>
            <p>• <strong>Track daily:</strong> Check your progress regularly to stay motivated and adjust your approach.</p>
            <p>• <strong>Celebrate wins:</strong> When you hit a goal, take a moment to acknowledge your success!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

