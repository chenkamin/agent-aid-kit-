import { Check, Zap, Building, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const pricingTiers = [
  {
    name: "Basic",
    tier: "basic",
    price: "$49",
    period: "/month",
    description: "Perfect for getting started",
    icon: Building,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    features: [
      "Up to 5 buy boxes",
      "5 zip codes per buy box",
      "1 team member",
      "Email & SMS templates",
      "Activity tracking",
      "Basic reporting",
    ],
    limits: {
      buyBoxes: 5,
      zipsPerBuyBox: 5,
      users: 1,
    },
  },
  {
    name: "Pro",
    tier: "pro",
    price: "$149",
    period: "/month",
    description: "For growing teams",
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    popular: true,
    features: [
      "Up to 20 buy boxes",
      "Unlimited zip codes",
      "Unlimited team members",
      "Advanced email & SMS automation",
      "Priority support",
      "Advanced analytics",
      "Custom workflows",
      "API access",
    ],
    limits: {
      buyBoxes: 20,
      zipsPerBuyBox: -1, // unlimited
      users: -1, // unlimited
    },
  },
  {
    name: "Xtream",
    tier: "xtream",
    price: "$299",
    period: "/month",
    description: "For power users",
    icon: Rocket,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    features: [
      "Unlimited buy boxes",
      "Unlimited zip codes",
      "Unlimited team members",
      "White-label options",
      "Dedicated account manager",
      "Custom integrations",
      "Advanced AI features",
      "Priority feature requests",
      "24/7 Premium support",
    ],
    limits: {
      buyBoxes: -1, // unlimited
      zipsPerBuyBox: -1, // unlimited
      users: -1, // unlimited
    },
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get current company and subscription
  const { data: userCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("company_id, companies(*)")
        .eq("user_id", user?.id)
        .single();
      
      return teamMember?.companies;
    },
    enabled: !!user,
  });

  const changePlanMutation = useMutation({
    mutationFn: async (newTier: string) => {
      if (!userCompany?.id) throw new Error("No company found");
      
      const { error } = await supabase
        .from("companies")
        .update({ 
          subscription_tier: newTier,
          subscription_started_at: new Date().toISOString(),
          subscription_status: "active"
        })
        .eq("id", userCompany.id);

      if (error) throw error;
    },
    onSuccess: (_, newTier) => {
      queryClient.invalidateQueries({ queryKey: ["user-company"] });
      toast({
        title: "Plan updated!",
        description: `Successfully upgraded to ${newTier.charAt(0).toUpperCase() + newTier.slice(1)} plan`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update plan",
        variant: "destructive",
      });
    },
  });

  const currentTier = userCompany?.subscription_tier || "basic";

  if (!user) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">Please sign in to view pricing</h1>
        <Button onClick={() => navigate("/")}>Go to Home</Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Choose the Perfect Plan for Your Team
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Scale your real estate investment business with powerful tools and automation
        </p>
        {userCompany && (
          <div className="mt-6">
            <Badge variant="outline" className="text-base px-4 py-2">
              Current Plan: <span className="font-bold ml-2 capitalize">{currentTier}</span>
            </Badge>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {pricingTiers.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentTier === plan.tier;
          const canDowngrade = 
            (currentTier === "xtream" && ["pro", "basic"].includes(plan.tier)) ||
            (currentTier === "pro" && plan.tier === "basic");

          return (
            <Card
              key={plan.tier}
              className={`relative ${plan.popular ? "border-2 shadow-lg scale-105" : ""} ${
                isCurrentPlan ? "ring-2 ring-primary" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${plan.bgColor} border ${plan.borderColor} flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${plan.color}`} />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                {isCurrentPlan ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                ) : canDowngrade ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Are you sure you want to downgrade to ${plan.name}? Some features will be limited.`)) {
                        changePlanMutation.mutate(plan.tier);
                      }
                    }}
                    disabled={changePlanMutation.isPending}
                  >
                    {changePlanMutation.isPending ? "Processing..." : "Downgrade"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => changePlanMutation.mutate(plan.tier)}
                    disabled={changePlanMutation.isPending}
                  >
                    {changePlanMutation.isPending ? "Processing..." : "Upgrade Now"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Need a custom solution?</h2>
        <p className="text-muted-foreground mb-6">
          Contact us for enterprise pricing and custom feature development
        </p>
        <Button variant="outline" size="lg">
          Contact Sales
        </Button>
      </div>
    </div>
  );
}

