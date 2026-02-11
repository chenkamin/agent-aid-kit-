import { Handle, Position, useReactFlow } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface TriggerNodeProps {
  data: {
    label: string;
    icon?: string;
    description?: string;
    config?: {
      steps?: Array<{ days_after: number }>;
      max_attempts?: number;
      max_days?: number;
    };
  };
  id: string;
}

export default function TriggerNode({ data }: TriggerNodeProps) {
  const getIcon = (label: string) => {
    switch (label) {
      case 'sms_sent': return '📤';
      case 'sms_received': return '📥';
      case 'sms_no_reply': return '🔁';
      case 'email_sent': return '✉️';
      case 'email_received': return '📨';
      case 'property_added': return '🏠';
      case 'workflow_changed': return '🔄';
      default: return '🎯';
    }
  };

  const getLabel = (label: string) => {
    switch (label) {
      case 'sms_sent': return 'SMS Sent';
      case 'sms_received': return 'SMS Received';
      case 'sms_no_reply': return 'SMS No Reply';
      case 'email_sent': return 'Email Sent';
      case 'email_received': return 'Email Received';
      case 'property_added': return 'Property Added';
      case 'workflow_changed': return 'Workflow Changed';
      default: return label;
    }
  };

  // Generate config summary for sms_no_reply
  const getConfigSummary = () => {
    if (data.label !== 'sms_no_reply' || !data.config) return null;
    
    const { steps, max_attempts, max_days } = data.config;
    const stepCount = steps?.length || 0;
    const daysList = steps?.map(s => s.days_after).join(', ') || '';
    
    return (
      <div className="mt-2 text-xs text-muted-foreground space-y-1">
        {stepCount > 0 && (
          <div>📅 {stepCount} step{stepCount > 1 ? 's' : ''}: Day {daysList}</div>
        )}
        {max_attempts && <div>🔢 Max {max_attempts} attempts</div>}
        {max_days && <div>⏱️ Max {max_days} days</div>}
      </div>
    );
  };

  return (
    <Card className="min-w-[200px] border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{data.icon || getIcon(data.label)}</span>
          <div>
            <Badge variant="default" className="mb-1">Trigger</Badge>
            <div className="font-semibold text-sm">{getLabel(data.label)}</div>
          </div>
        </div>
        {data.description && (
          <p className="text-xs text-muted-foreground mt-2">{data.description}</p>
        )}
        {getConfigSummary()}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </Card>
  );
}

