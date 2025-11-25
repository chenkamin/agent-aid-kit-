import { Handle, Position } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActionNodeProps {
  data: {
    label: string;
    config?: any;
  };
}

export default function ActionNode({ data }: ActionNodeProps) {
  const getIcon = (label: string) => {
    switch (label) {
      case 'update_workflow': return '🔄';
      case 'create_notification': return '🔔';
      case 'create_activity': return '📅';
      case 'send_sms': return '📤';
      case 'send_email': return '✉️';
      case 'assign_property': return '👤';
      case 'add_tag': return '🏷️';
      default: return '⚡';
    }
  };

  const getLabel = (label: string) => {
    switch (label) {
      case 'update_workflow': return 'Update Workflow';
      case 'create_notification': return 'Create Notification';
      case 'create_activity': return 'Create Activity';
      case 'send_sms': return 'Send SMS';
      case 'send_email': return 'Send Email';
      case 'assign_property': return 'Assign Property';
      case 'add_tag': return 'Add Tag';
      default: return label;
    }
  };

  return (
    <Card className="min-w-[200px] border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-green-500" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{getIcon(data.label)}</span>
          <div>
            <Badge variant="default" className="mb-1 bg-green-600">Action</Badge>
            <div className="font-semibold text-sm">{getLabel(data.label)}</div>
          </div>
        </div>
        {data.config && (
          <div className="text-xs text-muted-foreground mt-2">
            {data.config.new_state && (
              <div className="font-medium text-green-700 dark:text-green-400">
                → {data.config.new_state}
              </div>
            )}
            {data.config.title && (
              <div className="truncate max-w-[160px]">"{data.config.title}"</div>
            )}
            {data.config.type && (
              <div>Type: {data.config.type}</div>
            )}
            {data.config.ai_autopilot && (
              <div className="flex items-center gap-1 text-blue-600 font-medium">
                <span>🤖</span> AI Auto-Pilot
              </div>
            )}
            {data.config.message && !data.config.ai_autopilot && (
              <div className="truncate max-w-[160px] text-xs">
                Message: "{data.config.message.substring(0, 30)}..."
              </div>
            )}
            {data.config.delay_hours && parseInt(data.config.delay_hours) > 0 && (
              <div className="text-xs">⏱️ Delay: {data.config.delay_hours}h</div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500" />
    </Card>
  );
}

