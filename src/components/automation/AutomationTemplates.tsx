import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Copy, Sparkles, Zap, MessageSquare, Target, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  flow_data: {
    nodes: any[];
    edges: any[];
    viewport: any;
  };
}

interface AutomationTemplatesProps {
  onCloneTemplate: (flowData: any, name: string) => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  sms: MessageSquare,
  workflow: Target,
  lead_scoring: TrendingUp,
  follow_up: Calendar,
};

const categoryColors: Record<string, string> = {
  sms: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  workflow: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  lead_scoring: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  follow_up: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

export default function AutomationTemplates({ onCloneTemplate }: AutomationTemplatesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch automation templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['automation-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as AutomationTemplate[];
    },
  });

  // Get user's company for cloning
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

  // Clone template mutation
  const cloneTemplateMutation = useMutation({
    mutationFn: async (template: AutomationTemplate) => {
      if (!userCompany?.company_id || !user?.id) {
        throw new Error('User or company not found');
      }

      // Generate new IDs for all nodes and edges to avoid conflicts
      const newNodes = template.flow_data.nodes.map(node => ({
        ...node,
        id: `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));

      // Map old IDs to new IDs
      const idMap = new Map(
        template.flow_data.nodes.map((oldNode, index) => [
          oldNode.id,
          newNodes[index].id
        ])
      );

      // Update edges with new IDs
      const newEdges = template.flow_data.edges.map(edge => ({
        ...edge,
        id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: idMap.get(edge.source) || edge.source,
        target: idMap.get(edge.target) || edge.target,
      }));

      const newFlowData = {
        nodes: newNodes,
        edges: newEdges,
        viewport: template.flow_data.viewport,
      };

      const { data, error } = await supabase
        .from('automations')
        .insert({
          company_id: userCompany.company_id,
          user_id: user.id,
          name: `${template.name} (Copy)`,
          description: template.description,
          flow_data: newFlowData,
          is_active: false, // Start inactive so user can review
        })
        .select()
        .single();

      if (error) throw error;
      return { data, flowData: newFlowData, name: `${template.name} (Copy)` };
    },
    onSuccess: ({ data, flowData, name }) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Template cloned successfully!', {
        description: 'The automation has been created. You can now edit and activate it.',
      });
      setIsPreviewOpen(false);
      // Load the cloned automation into the canvas
      onCloneTemplate(flowData, name);
    },
    onError: (error: any) => {
      toast.error('Failed to clone template', {
        description: error.message,
      });
    },
  });

  const handlePreview = (template: AutomationTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleClone = () => {
    if (selectedTemplate) {
      cloneTemplateMutation.mutate(selectedTemplate);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading templates...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Automation Templates
          </h3>
          <p className="text-sm text-muted-foreground">
            Start with pre-built automations and customize them to your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates?.map((template) => {
            const CategoryIcon = categoryIcons[template.category] || Zap;
            const categoryColor = categoryColors[template.category] || 'bg-gray-100 text-gray-700';

            return (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${categoryColor}`}>
                        <CategoryIcon className="h-5 w-5" />
                      </div>
                      <span className="text-2xl">{template.icon}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {template.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    <span>{template.flow_data.nodes.length} nodes</span>
                    <span>•</span>
                    <span>{template.flow_data.edges.length} connections</span>
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreview(template)}
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedTemplate(template);
                      handleClone();
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Clone
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedTemplate?.icon}</span>
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Automation Flow:</h4>
              <div className="space-y-2 pl-4 border-l-2 border-primary">
                {selectedTemplate?.flow_data.nodes.map((node, index) => {
                  const isLast = index === selectedTemplate.flow_data.nodes.length - 1;
                  let icon = '📍';
                  let color = 'text-blue-600';
                  
                  if (node.type === 'trigger') {
                    icon = '▶️';
                    color = 'text-blue-600';
                  } else if (node.type === 'condition') {
                    icon = '❓';
                    color = 'text-yellow-600';
                  } else if (node.type === 'action') {
                    icon = '⚡';
                    color = 'text-green-600';
                  }

                  return (
                    <div key={node.id} className={`${!isLast ? 'pb-2' : ''}`}>
                      <div className="flex items-start gap-2">
                        <span className={`${color} text-lg`}>{icon}</span>
                        <div>
                          <div className="font-medium capitalize">
                            {node.data.label.replace(/_/g, ' ')}
                          </div>
                          {Object.keys(node.data.config || {}).length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Config: {JSON.stringify(node.data.config)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm">💡 What happens when you clone:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ Creates a new automation in your account</li>
                <li>✅ Starts in inactive mode for you to review</li>
                <li>✅ All nodes are pre-configured and ready</li>
                <li>✅ You can customize any part before activating</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClone} disabled={cloneTemplateMutation.isPending}>
              {cloneTemplateMutation.isPending ? 'Cloning...' : 'Clone Template'}
              <Copy className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

