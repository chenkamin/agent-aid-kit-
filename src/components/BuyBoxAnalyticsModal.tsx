import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface BuyBoxAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyBoxId: string;
  buyBoxName: string;
}

const WORKFLOW_COLORS: Record<string, string> = {
  "Initial": "#94a3b8",
  "Reviewing": "#3b82f6",
  "Research": "#8b5cf6",
  "On Progress": "#f59e0b",
  "Follow Up": "#10b981",
  "Negotiating": "#06b6d4",
  "Under Contract": "#f97316",
  "Closing": "#ec4899",
  "Closed": "#22c55e",
  "Not Relevant": "#ef4444",
  "Archived": "#6b7280",
};

export default function BuyBoxAnalyticsModal({
  isOpen,
  onClose,
  buyBoxId,
  buyBoxName,
}: BuyBoxAnalyticsModalProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["buy-box-analytics", buyBoxId],
    queryFn: async () => {
      // Fetch all properties for this buy box
      const { data: properties, error } = await supabase
        .from("properties")
        .select("id, workflow_state, price, arv_estimate, status")
        .eq("buy_box_id", buyBoxId);

      if (error) throw error;

      // Group by workflow state
      const stateCount: Record<string, number> = {};
      properties?.forEach((prop) => {
        const state = prop.workflow_state || "Initial";
        stateCount[state] = (stateCount[state] || 0) + 1;
      });

      // Convert to array for charts
      const stateData = Object.entries(stateCount).map(([name, count]) => ({
        name,
        count,
        fill: WORKFLOW_COLORS[name] || "#94a3b8",
      }));

      // Calculate totals
      const totalProperties = properties?.length || 0;
      const totalValue = properties?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;
      const totalARV = properties?.reduce((sum, p) => sum + (p.arv_estimate || 0), 0) || 0;

      // Status breakdown
      const statusCount: Record<string, number> = {};
      properties?.forEach((prop) => {
        const status = prop.status || "For Sale";
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      const statusData = Object.entries(statusCount).map(([name, count]) => ({
        name,
        count,
      }));

      return {
        stateData,
        statusData,
        totalProperties,
        totalValue,
        totalARV,
      };
    },
    enabled: isOpen && !!buyBoxId,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Buy Box Analytics</DialogTitle>
          <DialogDescription>
            {buyBoxName} - Property performance and workflow stages
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics?.totalProperties}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    ${((analytics?.totalValue || 0) / 1000000).toFixed(2)}M
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total ARV
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    ${((analytics?.totalARV || 0) / 1000000).toFixed(2)}M
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Workflow State Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Properties by Workflow Stage</CardTitle>
                <CardDescription>
                  Distribution of properties across different workflow stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.stateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      fontSize={11}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6">
                      {analytics?.stateData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Workflow State Pie Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Distribution</CardTitle>
                  <CardDescription>Percentage breakdown by stage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analytics?.stateData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="count"
                      >
                        {analytics?.stateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Breakdown</CardTitle>
                  <CardDescription>Properties by market status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.statusData.map((status) => (
                      <div key={status.name} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{status.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${((status.count / (analytics?.totalProperties || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-8 text-right">
                            {status.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Stats Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics?.stateData
                    .sort((a, b) => b.count - a.count)
                    .map((state) => (
                      <div
                        key={state.name}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: state.fill }}
                          />
                          <span className="font-medium">{state.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {((state.count / (analytics?.totalProperties || 1)) * 100).toFixed(1)}%
                          </span>
                          <span className="font-semibold">{state.count} properties</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

