import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NodeConfigDialogProps {
  node: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

const WORKFLOW_STATES = [
  'Initial',
  'Reviewing',
  'Research',
  'On Progress',
  'Follow Up',
  'Negotiating',
  'Under Contract',
  'Closing',
  'Closed',
  'Not Relevant',
  'Archived'
];

const ACTIVITY_TYPES = [
  'call',
  'sms',
  'whatsapp',
  'email',
  'site-visit',
  'offer-sent',
  'comp-analysis',
  'inspection',
  'other'
];

export default function NodeConfigDialog({ node, isOpen, onClose, onSave }: NodeConfigDialogProps) {
  const [config, setConfig] = useState(node?.data?.config || {});

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  if (!node) return null;

  const renderConfigFields = () => {
    const nodeType = node.type;
    const nodeLabel = node.data.label;

    // ACTION NODES
    if (nodeType === 'action') {
      switch (nodeLabel) {
        case 'update_workflow':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="new_state">Target Workflow State</Label>
                <Select 
                  value={config.new_state || ''} 
                  onValueChange={(value) => setConfig({ ...config, new_state: value })}
                >
                  <SelectTrigger id="new_state">
                    <SelectValue placeholder="Select state..." />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_STATES.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );

        case 'create_notification':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Notification Title</Label>
                <Input
                  id="title"
                  value={config.title || ''}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="New lead received!"
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={config.message || ''}
                  onChange={(e) => setConfig({ ...config, message: e.target.value })}
                  placeholder="Check out this hot lead..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="recipient">Recipient</Label>
                <Select 
                  value={config.recipient || 'all'} 
                  onValueChange={(value) => setConfig({ ...config, recipient: value })}
                >
                  <SelectTrigger id="recipient">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team Members</SelectItem>
                    <SelectItem value="assigned">Assigned User</SelectItem>
                    <SelectItem value="owner">Property Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );

        case 'create_activity':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="activity_type">Activity Type</Label>
                <Select 
                  value={config.type || ''} 
                  onValueChange={(value) => setConfig({ ...config, type: value })}
                >
                  <SelectTrigger id="activity_type">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="activity_title">Title</Label>
                <Input
                  id="activity_title"
                  value={config.title || ''}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="Follow up with seller"
                />
              </div>
              <div>
                <Label htmlFor="due_days">Due In (Days)</Label>
                <Input
                  id="due_days"
                  type="number"
                  value={config.due_days || '1'}
                  onChange={(e) => setConfig({ ...config, due_days: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>
          );

        default:
          return <p className="text-sm text-muted-foreground">No configuration needed</p>;
      }
    }

    // CONDITION NODES
    if (nodeType === 'condition') {
      switch (nodeLabel) {
        case 'ai_score':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="operator">Comparison</Label>
                <Select 
                  value={config.operator || '>'} 
                  onValueChange={(value) => setConfig({ ...config, operator: value })}
                >
                  <SelectTrigger id="operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">Greater than (&gt;)</SelectItem>
                    <SelectItem value=">=">Greater or equal (≥)</SelectItem>
                    <SelectItem value="<">Less than (&lt;)</SelectItem>
                    <SelectItem value="<=">Less or equal (≤)</SelectItem>
                    <SelectItem value="==">Equal (=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="value">Score Value (1-3)</Label>
                <Input
                  id="value"
                  type="number"
                  min="1"
                  max="3"
                  value={config.value || '2'}
                  onChange={(e) => setConfig({ ...config, value: e.target.value })}
                />
              </div>
            </div>
          );

        case 'workflow_state':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="state">Check if workflow state is:</Label>
                <Select 
                  value={config.state || ''} 
                  onValueChange={(value) => setConfig({ ...config, state: value })}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state..." />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_STATES.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );

        default:
          return <p className="text-sm text-muted-foreground">No configuration needed</p>;
      }
    }

    // TRIGGER NODES
    return <p className="text-sm text-muted-foreground">Triggers don't need configuration</p>;
  };

  const getNodeTitle = () => {
    const labels: Record<string, string> = {
      'update_workflow': 'Update Workflow State',
      'create_notification': 'Create Notification',
      'create_activity': 'Create Activity',
      'ai_score': 'Check AI Score',
      'workflow_state': 'Check Workflow State',
      'property_value': 'Check Property Value',
    };
    return labels[node.data.label] || 'Configure Node';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getNodeTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {renderConfigFields()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

