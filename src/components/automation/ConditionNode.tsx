import { Handle, Position } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConditionNodeProps {
  data: {
    label: string;
    config?: any;
  };
}

export default function ConditionNode({ data }: ConditionNodeProps) {
  const getIcon = (label: string) => {
    switch (label) {
      case 'ai_score': return '🤖';
      case 'workflow_state': return '🎯';
      case 'property_value': return '💰';
      case 'has_response': return '💬';
      default: return '❓';
    }
  };

  const getLabel = (label: string) => {
    switch (label) {
      case 'ai_score': return 'Check AI Score';
      case 'workflow_state': return 'Check Workflow State';
      case 'property_value': return 'Check Property Value';
      case 'has_response': return 'Has Response?';
      default: return label;
    }
  };

  return (
    <Card className="min-w-[220px] border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{getIcon(data.label)}</span>
          <div>
            <Badge variant="outline" className="mb-1 border-yellow-500">Condition</Badge>
            <div className="font-semibold text-sm">{getLabel(data.label)}</div>
          </div>
        </div>
        {data.config && (
          <div className="text-xs text-muted-foreground mt-2">
            {data.config.operator && data.config.value && (
              <span className="font-medium">
                {data.config.operator} {data.config.value}
              </span>
            )}
            {data.config.state && (
              <span className="font-medium">= {data.config.state}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-between px-4 pb-2">
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="true" 
          className="w-3 h-3 bg-green-500"
          style={{ left: '30%' }}
        />
        <span className="text-[10px] text-green-600 font-semibold">TRUE</span>
        <span className="text-[10px] text-red-600 font-semibold">FALSE</span>
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="false" 
          className="w-3 h-3 bg-red-500"
          style={{ left: '70%' }}
        />
      </div>
    </Card>
  );
}

