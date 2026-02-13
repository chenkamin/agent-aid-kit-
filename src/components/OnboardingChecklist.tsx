import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

interface ChecklistItemProps {
  completed: boolean;
  label: string;
  description: string;
  onClick: () => void;
}

function ChecklistItem({ completed, label, description, onClick }: ChecklistItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left w-full group"
    >
      {completed ? (
        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0 group-hover:text-primary" />
      )}
      <div className="flex-1">
        <p className={`font-medium ${completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}

export default function OnboardingChecklist() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user's profile onboarding status
  const { data: profile } = useQuery({
    queryKey: ['profile-onboarding', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_sms_connected, onboarding_email_connected, onboarding_buybox_created, onboarding_viewed_properties, onboarding_viewed_dashboard, onboarding_viewed_contacts, onboarding_viewed_activities, onboarding_viewed_automations, onboarding_viewed_kpi')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's company
  const { data: userCompany } = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('team_members')
        .select('company_id, companies(id, name, sms_phone_number)')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch email settings
  const { data: emailSettings } = useQuery({
    queryKey: ['communication_settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_settings')
        .select('email_host')
        .eq('user_id', user?.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch buy boxes count
  const { data: buyBoxes } = useQuery({
    queryKey: ['buy_boxes_count', userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data, error } = await supabase
        .from('buy_boxes')
        .select('id')
        .eq('company_id', userCompany.company_id)
        .limit(1);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  if (!profile || profile.onboarding_completed) {
    return null;
  }

  const hasSMS = !!(userCompany?.companies as any)?.sms_phone_number;
  const hasEmail = !!emailSettings?.email_host;
  const hasBuyBox = (buyBoxes?.length || 0) > 0;
  const hasViewedProperties = profile.onboarding_viewed_properties || false;
  const hasViewedDashboard = profile.onboarding_viewed_dashboard || false;
  const hasViewedContacts = profile.onboarding_viewed_contacts || false;
  const hasViewedActivities = profile.onboarding_viewed_activities || false;
  const hasViewedAutomations = profile.onboarding_viewed_automations || false;
  const hasViewedKpi = profile.onboarding_viewed_kpi || false;

  const completedCount = [hasSMS, hasEmail, hasBuyBox, hasViewedProperties, hasViewedDashboard, hasViewedContacts, hasViewedActivities, hasViewedAutomations, hasViewedKpi].filter(Boolean).length;
  const totalCount = 9;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Getting Started
            </CardTitle>
            <CardDescription className="mt-1">
              Complete these steps to get the most out of Dealio
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-semibold">
            {completedCount}/{totalCount}
          </Badge>
        </div>
        <div className="mt-3">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <ChecklistItem
          completed={hasSMS}
          label="Connect SMS"
          description="Set up OpenPhone or Twilio to text sellers"
          onClick={() => navigate('/sms')}
        />
        <ChecklistItem
          completed={hasEmail}
          label="Connect Email"
          description="Configure SMTP to send professional emails"
          onClick={() => navigate('/email')}
        />
        <ChecklistItem
          completed={hasBuyBox}
          label="Create Buy Box"
          description="Define your investment criteria"
          onClick={() => navigate('/lists')}
        />
        <ChecklistItem
          completed={hasViewedProperties}
          label="View Properties"
          description="Start reviewing matching properties"
          onClick={() => navigate('/properties')}
        />
        <ChecklistItem
          completed={hasViewedDashboard}
          label="View Dashboard"
          description="Your KPIs and deal pipeline overview"
          onClick={() => navigate('/')}
        />
        <ChecklistItem
          completed={hasViewedContacts}
          label="View Contacts"
          description="Manage sellers and agents"
          onClick={() => navigate('/contacts')}
        />
        <ChecklistItem
          completed={hasViewedActivities}
          label="View Activities"
          description="Track tasks and follow-ups"
          onClick={() => navigate('/activities')}
        />
        <ChecklistItem
          completed={hasViewedAutomations}
          label="View Automations"
          description="Build automated workflows"
          onClick={() => navigate('/automations')}
        />
        <ChecklistItem
          completed={hasViewedKpi}
          label="View KPI Goals"
          description="Set and track your goals"
          onClick={() => navigate('/kpi')}
        />
        
        {completedCount === totalCount && (
          <div className="pt-3 border-t mt-3">
            <p className="text-sm text-center text-muted-foreground mb-2">
              🎉 You're all set! Ready to find great deals.
            </p>
            <Button
              onClick={async () => {
                if (user?.id) {
                  await supabase
                    .from('profiles')
                    .update({ onboarding_completed: true })
                    .eq('id', user.id);
                }
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Mark as Complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

