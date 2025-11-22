import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, Plus, Save, Trash2, Copy, Sparkles, BarChart3, Lightbulb } from 'lucide-react';
import TriggerNode from '@/components/automation/TriggerNode';
import ConditionNode from '@/components/automation/ConditionNode';
import ActionNode from '@/components/automation/ActionNode';
import NodeConfigDialog from '@/components/automation/NodeConfigDialog';
import AutomationTemplates from '@/components/automation/AutomationTemplates';

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
  },
  style: {
    strokeWidth: 2,
  },
};

export default function Automations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [automationName, setAutomationName] = useState('');
  const [automationDescription, setAutomationDescription] = useState('');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);

  // Fetch company
  const { data: userCompany } = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('team_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch automations
  const { data: automations } = useQuery({
    queryKey: ['automations', userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data } = await supabase
        .from('automations')
        .select('*')
        .eq('company_id', userCompany.company_id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!userCompany?.company_id,
  });

  // Save automation
  const saveAutomationMutation = useMutation({
    mutationFn: async () => {
      if (!automationName.trim()) {
        throw new Error('Please enter an automation name');
      }

      const flowData = {
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 }
      };

      if (selectedAutomation?.id) {
        // Update existing
        const { error } = await supabase
          .from('automations')
          .update({
            name: automationName,
            description: automationDescription,
            flow_data: flowData,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAutomation.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('automations')
          .insert({
            company_id: userCompany.company_id,
            user_id: user.id,
            name: automationName,
            description: automationDescription,
            flow_data: flowData,
            is_active: true
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast({ 
        title: 'Automation saved', 
        description: 'Your workflow has been saved successfully' 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error saving automation', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Toggle automation active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('automations')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast({ title: 'Automation updated' });
    }
  });

  // Delete automation
  const deleteAutomationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast({ title: 'Automation deleted' });
      if (selectedAutomation) {
        setSelectedAutomation(null);
        setNodes([]);
        setEdges([]);
        setAutomationName('');
        setAutomationDescription('');
      }
    }
  });

  // Load automation into canvas
  const loadAutomation = (automation: any) => {
    setSelectedAutomation(automation);
    setAutomationName(automation.name);
    setAutomationDescription(automation.description || '');
    
    const flowData = automation.flow_data;
    setNodes(flowData.nodes || []);
    setEdges(flowData.edges || []);
  };

  // Create new automation
  const createNew = () => {
    setSelectedAutomation(null);
    setAutomationName('');
    setAutomationDescription('');
    setNodes([]);
    setEdges([]);
    setIsCreating(true);
  };

  // Add new node to canvas
  const addNode = (type: string, nodeLabel: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { 
        x: 250 + Math.random() * 100, 
        y: 50 + nodes.length * 150 
      },
      data: { 
        label: nodeLabel,
        config: {}
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Connect nodes
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({
        ...params,
        ...defaultEdgeOptions,
      }, eds));
    },
    [setEdges]
  );

  // Handle node click for configuration
  const onNodeClick = useCallback((_event: any, node: Node) => {
    setSelectedNode(node);
    setConfigDialogOpen(true);
  }, []);

  // Save node configuration
  const saveNodeConfig = (config: any) => {
    if (!selectedNode) return;
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              config,
            },
          };
        }
        return node;
      })
    );
  };

  // Delete selected nodes
  const onNodesDelete = useCallback((deleted: Node[]) => {
    const deletedIds = deleted.map(node => node.id);
    // Also remove edges connected to deleted nodes
    setEdges((eds) => eds.filter(edge => 
      !deletedIds.includes(edge.source) && !deletedIds.includes(edge.target)
    ));
  }, [setEdges]);

  // Handle keyboard delete
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => 
        edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
      setConfigDialogOpen(false);
    }
  }, [selectedNode, setNodes, setEdges]);

  // Add keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-background flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Automations
          </h1>
          <p className="text-sm text-muted-foreground">
            Build visual workflows to automate your deal flow
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setTemplatesDialogOpen(true)}
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={createNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Automation
          </Button>
          <Button 
            variant="outline" 
            onClick={() => saveAutomationMutation.mutate()}
            disabled={nodes.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          {selectedAutomation && (
            <Button 
              variant="destructive" 
              onClick={() => deleteAutomationMutation.mutate(selectedAutomation.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Node Palette */}
        <Card className="w-64 m-4 p-4 overflow-y-auto">
          <div className="mb-6">
            <Label htmlFor="automation-name">Automation Name</Label>
            <Input
              id="automation-name"
              value={automationName}
              onChange={(e) => setAutomationName(e.target.value)}
              placeholder="My Automation"
              className="mt-1"
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="automation-desc">Description</Label>
            <Input
              id="automation-desc"
              value={automationDescription}
              onChange={(e) => setAutomationDescription(e.target.value)}
              placeholder="Optional"
              className="mt-1"
            />
          </div>

          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>📍</span> Triggers
          </h3>
          <div className="space-y-2 mb-6">
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => addNode('trigger', 'sms_sent')}
            >
              📤 SMS Sent
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => addNode('trigger', 'sms_received')}
            >
              📥 SMS Received
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => addNode('trigger', 'workflow_changed')}
            >
              🔄 Workflow Changed
            </Button>
          </div>

          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>❓</span> Conditions
          </h3>
          <div className="space-y-2 mb-6">
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => addNode('condition', 'ai_score')}
            >
              🤖 AI Score
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => addNode('condition', 'workflow_state')}
            >
              🎯 Workflow State
            </Button>
          </div>

          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>⚡</span> Actions
          </h3>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => addNode('action', 'update_workflow')}
            >
              🔄 Update Workflow
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => addNode('action', 'create_notification')}
            >
              🔔 Create Notification
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => addNode('action', 'create_activity')}
            >
              📅 Create Activity
            </Button>
          </div>
        </Card>

        {/* Canvas */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-900">
          {nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start Building Your Automation</h3>
                <p className="text-muted-foreground mb-4">
                  Add trigger nodes from the left sidebar to get started
                </p>
                <Badge variant="outline">Drag nodes to connect them</Badge>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onNodesDelete={onNodesDelete}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
              className="bg-slate-50 dark:bg-slate-900"
            >
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={16} 
                size={1}
              />
              <Controls />
              <MiniMap />
              
              {/* Delete Node Button - Shows when a node is selected */}
              {selectedNode && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                      setEdges((eds) => eds.filter((e) => 
                        e.source !== selectedNode.id && e.target !== selectedNode.id
                      ));
                      setSelectedNode(null);
                      setConfigDialogOpen(false);
                    }}
                    className="shadow-lg"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Node
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedNode(null);
                    }}
                    className="shadow-lg"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </ReactFlow>
          )}
        </div>

        {/* Saved Automations List */}
        <Card className="w-80 m-4 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Saved Automations
            </h3>
            <Badge variant="secondary">{automations?.length || 0}</Badge>
          </div>
          
          {automations && automations.length > 0 ? (
            <div className="space-y-2">
              {automations.map((auto: any) => (
                <div 
                  key={auto.id}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedAutomation?.id === auto.id 
                      ? 'bg-blue-50 border-blue-500 dark:bg-blue-950/20' 
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => loadAutomation(auto)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate flex-1">{auto.name}</span>
                    <Switch 
                      checked={auto.is_active}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: auto.id, isActive: checked })
                      }
                    />
                  </div>
                  {auto.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {auto.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      {auto.trigger_count || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      ✓ {auto.success_count || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No automations yet. Create your first one!
            </div>
          )}
        </Card>
      </div>

      {/* Node Configuration Dialog */}
      <NodeConfigDialog
        node={selectedNode}
        isOpen={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        onSave={saveNodeConfig}
      />

      {/* Templates Dialog */}
      <Dialog open={templatesDialogOpen} onOpenChange={setTemplatesDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
              Automation Templates
            </DialogTitle>
          </DialogHeader>
          <AutomationTemplates 
            onCloneTemplate={(flowData, name) => {
              setNodes(flowData.nodes);
              setEdges(flowData.edges);
              setAutomationName(name);
              setTemplatesDialogOpen(false);
              toast({
                title: "Template loaded",
                description: "You can now customize and save your automation.",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

