import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, Step, STATUS } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function OnboardingTour() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Fetch user's profile to check onboarding status
  const { data: profile } = useQuery({
    queryKey: ['profile-onboarding', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_dismissed_at')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if user needs onboarding
  useEffect(() => {
    if (profile && !profile.onboarding_completed && !profile.onboarding_dismissed_at) {
      // Start tour after a short delay to let the page load
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [profile]);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="text-left">
          <h2 className="text-xl font-bold mb-2">Welcome to Dealio! 👋</h2>
          <p className="text-sm">
            Let's get you set up in 9 quick steps to start finding investment properties. 
            This tour will guide you through the essential features.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="sms-nav"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold mb-2">Step 1: Connect SMS</h3>
          <p className="text-sm">
            First, connect your SMS credentials (OpenPhone or Twilio) to communicate with property sellers via text.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="email-nav"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold mb-2">Step 2: Connect Email</h3>
          <p className="text-sm">
            Connect your email (SMTP) to send professional messages to leads and receive responses.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="lists-nav"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold mb-2">Step 3: Create a Buy Box</h3>
          <p className="text-sm">
            Define what properties you're looking for by creating a Buy Box. Set your criteria like price range, location, property type, etc.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="properties-nav"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold mb-2">Step 4: View Properties</h3>
          <p className="text-sm">
            Once your Buy Box is set up, view and manage properties that match your criteria. You can track leads, send offers, and close deals!
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="dashboard-nav"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold mb-2">Step 5: Dashboard</h3>
          <p className="text-sm">
            Your command center. View KPIs, deal pipeline, SMS activity, and hot leads at a glance.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="contacts-nav"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold mb-2">Step 6: Contacts</h3>
          <p className="text-sm">
            Manage sellers, agents, and leads. View all contacts linked to your properties.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="activities-nav"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold mb-2">Step 7: Activities</h3>
          <p className="text-sm">
            Track tasks and follow-ups. Never miss a call, email, or viewing.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="automations-nav"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold mb-2">Step 8: Automations</h3>
          <p className="text-sm">
            Build automated workflows. Trigger actions on SMS received, property added, and more.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="kpi-nav"]',
      content: (
        <div className="text-left">
          <h3 className="font-semibold mb-2">Step 9: KPI Goals</h3>
          <p className="text-sm">
            Set and track your goals. Monitor SMS sent, deals closed, and pipeline metrics.
          </p>
        </div>
      ),
      placement: 'right',
    },
  ];

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, action, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      
      // Mark onboarding as complete or dismissed
      if (user?.id) {
        const updates = status === STATUS.FINISHED 
          ? { onboarding_completed: true }
          : { onboarding_dismissed_at: new Date().toISOString() };
        
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
        
        // Invalidate the query to refetch
        queryClient.invalidateQueries({ queryKey: ['profile-onboarding', user.id] });
      }
    }

    // Update step index
    if (type === 'step:after' && action === 'next') {
      setStepIndex(index + 1);
    } else if (type === 'step:after' && action === 'prev') {
      setStepIndex(index - 1);
    }
  };

  // Don't render if user hasn't loaded yet or onboarding is already complete
  if (!user || !profile || profile.onboarding_completed || profile.onboarding_dismissed_at) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--card))',
          overlayColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
          arrowColor: 'hsl(var(--card))',
        },
        tooltip: {
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        },
        tooltipContent: {
          padding: '8px 0',
          fontSize: '14px',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          fontSize: '14px',
          padding: '8px 16px',
          borderRadius: '6px',
          fontWeight: '500',
        },
        buttonBack: {
          marginRight: '8px',
          color: 'hsl(var(--muted-foreground))',
          fontSize: '14px',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
          fontSize: '14px',
        },
        beacon: {
          inner: 'hsl(var(--primary))',
          outer: 'hsl(var(--primary))',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Get Started!',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}

