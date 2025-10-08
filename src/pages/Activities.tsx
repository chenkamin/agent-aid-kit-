import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export default function Activities() {
  const { user } = useAuth();
  
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activities", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("activities")
        .select("*, properties(address, city)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "snoozed":
        return <Clock className="h-5 w-5 text-warning" />;
      default:
        return <Calendar className="h-5 w-5 text-primary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-success text-success-foreground";
      case "snoozed":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-muted-foreground">Loading activities...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Activities</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Track your follow-ups and tasks
          </p>
        </div>
        <Button size="lg" className="text-base">
          <Plus className="mr-2 h-5 w-5" />
          Add Activity
        </Button>
      </div>

      {activities && activities.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-4">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-2xl font-semibold text-foreground">No activities yet</h3>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Start tracking your follow-ups and tasks
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities?.map((activity) => (
            <Card key={activity.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-semibold text-foreground">
                        {activity.title || "Untitled Activity"}
                      </h3>
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </div>
                    {activity.body && (
                      <p className="text-base text-muted-foreground">
                        {activity.body}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="capitalize">{activity.type.replace("-", " ")}</span>
                      {activity.properties && (
                        <span>
                          {activity.properties.address || "Unknown property"}
                          {activity.properties.city && `, ${activity.properties.city}`}
                        </span>
                      )}
                      {activity.due_at && (
                        <span>Due: {format(new Date(activity.due_at), "PPp")}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
