import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Trash2, Edit, Sparkles, Loader2, Save, Shield, Search, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  is_default?: boolean | null;
  user_id?: string | null;
}

interface CommunicationSettings {
  email_host?: string;
  email_port?: string;
  email_username?: string;
  email_password?: string;
}

// Valid template variables
const VALID_VARIABLES = [
  '{{PROPERTY}}',
  '{{PRICE}}',
  '{{AGENT_NAME}}',
  '{{BEDROOMS}}',
  '{{BATHROOMS}}',
  '{{SQFT}}'
];

// Validate template variables
const validateTemplateVariables = (text: string): { isValid: boolean; invalidVars: string[] } => {
  const variablePattern = /\{\{[A-Z_]+\}\}/g;
  const foundVariables = text.match(variablePattern) || [];
  const invalidVars = foundVariables.filter(v => !VALID_VARIABLES.includes(v));
  
  return {
    isValid: invalidVars.length === 0,
    invalidVars: Array.from(new Set(invalidVars))
  };
};

export default function Email() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [isCreatingEmailTemplate, setIsCreatingEmailTemplate] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [editingEmailTemplateId, setEditingEmailTemplateId] = useState<string | null>(null);
  const [emailSearchTerm, setEmailSearchTerm] = useState("");

  const [emailTemplateForm, setEmailTemplateForm] = useState({
    name: "",
    subject: "",
    body: "",
  });

  const [settingsForm, setSettingsForm] = useState<CommunicationSettings>({
    email_host: "",
    email_port: "",
    email_username: "",
    email_password: "",
  });

  // Fetch user's company
  const { data: userCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("team_members")
        .select("company_id, companies(id, name)")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch email templates
  const { data: emailTemplates = [] } = useQuery({
    queryKey: ["email_templates", userCompany?.company_id, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: !!user?.id,
  });

  // Fetch email communication settings
  const { data: settings } = useQuery({
    queryKey: ["communication_settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communication_settings")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as CommunicationSettings | null;
    },
    enabled: !!user?.id,
  });

  // Fetch email messages history
  const { data: emailMessages = [] } = useQuery({
    queryKey: ["email-messages-history", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data, error } = await supabase
        .from("email_messages" as any)
        .select("*, properties(address, city)")
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!userCompany?.company_id,
  });

  // Load settings into form when data is fetched
  useEffect(() => {
    if (settings) {
      setSettingsForm({
        email_host: settings?.email_host || "",
        email_port: settings?.email_port || "",
        email_username: settings?.email_username || "",
        email_password: settings?.email_password || "",
      });
    }
  }, [settings]);

  // Filtered email messages based on search
  const filteredEmailMessages = emailMessages.filter((email: any) => {
    if (!emailSearchTerm) return true;
    const searchLower = emailSearchTerm.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(searchLower) ||
      email.body?.toLowerCase().includes(searchLower) ||
      email.to_email?.toLowerCase().includes(searchLower) ||
      email.from_email?.toLowerCase().includes(searchLower) ||
      email.properties?.address?.toLowerCase().includes(searchLower)
    );
  });

  // Create or Update email template mutation
  const saveEmailTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!userCompany?.company_id) throw new Error("No company found");
      
      // Validate variables in subject and body
      const subjectValidation = validateTemplateVariables(data.subject || '');
      const bodyValidation = validateTemplateVariables(data.body || '');
      
      const allInvalidVars = [...subjectValidation.invalidVars, ...bodyValidation.invalidVars];
      
      if (allInvalidVars.length > 0) {
        throw new Error(
          `Invalid variables found: ${allInvalidVars.join(', ')}. ` +
          `Valid variables are: ${VALID_VARIABLES.join(', ')}`
        );
      }
      
      if (editingEmailTemplateId) {
        // Update existing template
        const { error } = await supabase
          .from("email_templates")
          .update({
            name: data.name,
            subject: data.subject,
            body: data.body,
          })
          .eq("id", editingEmailTemplateId);
        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase.from("email_templates").insert([{
          user_id: user?.id,
          company_id: userCompany.company_id,
          ...data,
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates", userCompany?.company_id] });
      setIsCreatingEmailTemplate(false);
      setEditingEmailTemplateId(null);
      setEmailTemplateForm({ name: "", subject: "", body: "" });
      toast({ 
        title: editingEmailTemplateId ? "Email template updated" : "Email template created", 
        description: editingEmailTemplateId ? "Your email template has been updated successfully." : "Your email template has been saved successfully."
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete email template mutation
  const deleteEmailTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates", userCompany?.company_id] });
      toast({ title: "Template deleted", description: "The email template has been deleted." });
    },
  });

  // Save communication settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: CommunicationSettings) => {
      const { error: emailError } = await supabase
        .from("communication_settings")
        .upsert({
          user_id: user?.id,
          email_host: data.email_host,
          email_port: data.email_port,
          email_username: data.email_username,
          email_password: data.email_password,
        }, { onConflict: "user_id" });
      if (emailError) throw emailError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication_settings", user?.id] });
      setIsEditingSettings(false);
      toast({ title: "Settings saved", description: "Your email settings have been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Generate template with AI
  const handleGenerateTemplate = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description of the template you want to generate",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingTemplate(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://ijgrelgzahireresdqvw.supabase.co/functions/v1/generate-template`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ prompt: aiPrompt, type: "email" }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate template");
      }

      const result = await response.json();

      setEmailTemplateForm({
        name: result.name || "AI Generated Template",
        subject: result.subject || "",
        body: result.body || "",
      });
      setIsCreatingEmailTemplate(true);

      setAiPrompt("");
      toast({
        title: "Template generated!",
        description: "Your AI-generated template is ready. Review and save it.",
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate template",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Email Communication</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage your email templates and view email history
          </p>
        </div>
        <Button onClick={() => setIsEditingSettings(true)} variant="outline" className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          Email Settings
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="email-templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email-templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="email-history" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email History
          </TabsTrigger>
        </TabsList>

        {/* Email Templates Tab */}
        <TabsContent value="email-templates" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {emailTemplates.length} template{emailTemplates.length !== 1 ? "s" : ""} saved
            </p>
            <Button 
              onClick={() => {
                setEditingEmailTemplateId(null);
                setEmailTemplateForm({ name: "", subject: "", body: "" });
                setIsCreatingEmailTemplate(true);
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Email Template
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[250px]">Subject</TableHead>
                  <TableHead>Body Preview</TableHead>
                  <TableHead className="w-[200px]">Variables</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailTemplates.map((template) => (
                  <TableRow key={template.id} className={template.is_default ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {template.name}
                        {template.is_default && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Shield className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {template.subject}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md">
                      <div className="line-clamp-2">{template.body}</div>
                    </TableCell>
                    <TableCell>
                      {(template.body.includes('{{') || template.subject.includes('{{')) ? (
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set([
                            ...template.subject.match(/\{\{[A-Z_]+\}\}/g) || [],
                            ...template.body.match(/\{\{[A-Z_]+\}\}/g) || []
                          ])).map((variable) => (
                            <span
                              key={variable}
                              className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded"
                            >
                              {variable}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No variables</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {template.is_default ? (
                        <Badge variant="outline" className="text-xs">
                          View Only
                        </Badge>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEmailTemplateForm({
                                name: template.name,
                                subject: template.subject,
                                body: template.body,
                              });
                              setEditingEmailTemplateId(template.id);
                              setIsCreatingEmailTemplate(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEmailTemplateMutation.mutate(template.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>

          {emailTemplates.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No email templates yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first template or use AI to generate one
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Email Messages History */}
        <TabsContent value="email-history" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={emailSearchTerm}
                onChange={(e) => setEmailSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredEmailMessages.length} of {emailMessages.length} emails
            </p>
          </div>

          {emailMessages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No emails yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Your sent emails will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <ScrollArea className="h-[400px] md:h-[600px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Date/Time</TableHead>
                        <TableHead className="w-[100px]">Direction</TableHead>
                        <TableHead className="w-[200px]">Email Address</TableHead>
                      <TableHead className="w-[200px]">Property</TableHead>
                      <TableHead className="w-[250px]">Subject</TableHead>
                      <TableHead>Body Preview</TableHead>
                      <TableHead className="w-[120px]">Offer Price</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmailMessages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No emails found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmailMessages.map((email: any) => (
                        <TableRow key={email.id}>
                          <TableCell className="text-xs">
                            {format(new Date(email.created_at), "MMM d, yyyy\nh:mm a")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={email.direction === 'outgoing' ? 'default' : 'secondary'} className="gap-1 text-xs bg-purple-600">
                              <Send className="h-3 w-3" />
                              {email.direction === 'outgoing' ? 'Out' : 'In'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {email.direction === 'outgoing' ? email.to_email : email.from_email}
                          </TableCell>
                          <TableCell className="text-sm">
                            {email.properties ? (
                              <button
                                onClick={() => navigate(`/properties?propertyId=${email.property_id}`)}
                                className="text-purple-600 hover:underline cursor-pointer"
                              >
                                {email.properties.address}
                              </button>
                            ) : (
                              <span className="text-muted-foreground italic">No property</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {email.subject}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm line-clamp-2">{email.body}</p>
                          </TableCell>
                          <TableCell>
                            {email.offer_price ? (
                              <span className="text-sm font-semibold text-green-600">
                                ${parseFloat(email.offer_price).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {email.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Email Template Dialog */}
      <Dialog open={isCreatingEmailTemplate} onOpenChange={(open) => {
        setIsCreatingEmailTemplate(open);
        if (!open) {
          setEditingEmailTemplateId(null);
          setEmailTemplateForm({ name: "", subject: "", body: "" });
        }
      }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingEmailTemplateId ? "Edit Email Template" : "Create Email Template"}</DialogTitle>
            <DialogDescription>
              {editingEmailTemplateId ? "Update your email template" : "Create a new email template for quick communication"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              {/* AI Template Generator Section */}
              {!editingEmailTemplateId && (
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2 border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      AI Template Generator
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Describe the template you need, and AI will create it for you
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="E.g., 'Create a follow-up email for a property I viewed last week'"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="min-h-[60px] text-sm"
                      />
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          💡 Available Variables
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Your templates can include these variables: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{PROPERTY}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{PRICE}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{AGENT_NAME}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{BEDROOMS}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{BATHROOMS}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{SQFT}}'}</code>
                        </p>
                      </div>
                      <Button
                        onClick={() => handleGenerateTemplate()}
                        disabled={isGeneratingTemplate}
                        className="w-full"
                        size="sm"
                      >
                        {isGeneratingTemplate ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div>
                <Label htmlFor="email-name">Template Name</Label>
              <Input
                id="email-name"
                value={emailTemplateForm.name}
                onChange={(e) =>
                  setEmailTemplateForm({ ...emailTemplateForm, name: e.target.value })
                }
                placeholder="e.g., Property Follow-up"
              />
            </div>
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailTemplateForm.subject}
                onChange={(e) =>
                  setEmailTemplateForm({ ...emailTemplateForm, subject: e.target.value })
                }
                placeholder="e.g., Following up on [Property Address]"
              />
            </div>
            <div>
              <Label htmlFor="email-body">Message Body</Label>
              <Textarea
                id="email-body"
                value={emailTemplateForm.body}
                onChange={(e) =>
                  setEmailTemplateForm({ ...emailTemplateForm, body: e.target.value })
                }
                placeholder="Enter your email message..."
                className="min-h-[200px]"
              />
              {(() => {
                const subjectValidation = validateTemplateVariables(emailTemplateForm.subject);
                const bodyValidation = validateTemplateVariables(emailTemplateForm.body);
                const hasInvalidVars = subjectValidation.invalidVars.length > 0 || bodyValidation.invalidVars.length > 0;
                const allInvalidVars = [...subjectValidation.invalidVars, ...bodyValidation.invalidVars];
                
                return hasInvalidVars ? (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-2">
                    <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-1">
                      ⚠️ Invalid Variables Detected
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {allInvalidVars.join(', ')} - These variables are not recognized. Please use only valid variables from the list below.
                    </p>
                  </div>
                ) : null;
              })()}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-2">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  💡 Available Variables
                </p>
                <div className="flex flex-wrap gap-2">
                  {['{{PROPERTY}}', '{{PRICE}}', '{{AGENT_NAME}}', '{{BEDROOMS}}', '{{BATHROOMS}}', '{{SQFT}}'].map((variable) => (
                    <code
                      key={variable}
                      className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800"
                      onClick={() => {
                        const textarea = document.getElementById('email-body') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = emailTemplateForm.body;
                          const before = text.substring(0, start);
                          const after = text.substring(end);
                          setEmailTemplateForm({ ...emailTemplateForm, body: before + variable + after });
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + variable.length, start + variable.length);
                          }, 0);
                        }
                      }}
                    >
                      {variable}
                    </code>
                  ))}
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  Click a variable to insert it at cursor position
                </p>
              </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setIsCreatingEmailTemplate(false);
              setEditingEmailTemplateId(null);
              setEmailTemplateForm({ name: "", subject: "", body: "" });
              setAiPrompt("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => saveEmailTemplateMutation.mutate(emailTemplateForm)}
              disabled={!emailTemplateForm.name || !emailTemplateForm.body}
            >
              {editingEmailTemplateId ? "Update Template" : "Save Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Settings Dialog */}
      <Dialog open={isEditingSettings} onOpenChange={setIsEditingSettings}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Email Settings</DialogTitle>
            <DialogDescription>
              Configure your email service connection details (SMTP)
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-host">SMTP Host</Label>
                <Input
                  id="email-host"
                  value={settingsForm.email_host}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, email_host: e.target.value })
                  }
                  placeholder="e.g., smtp.gmail.com"
                />
              </div>
              <div>
                <Label htmlFor="email-port">SMTP Port</Label>
                <Input
                  id="email-port"
                  value={settingsForm.email_port}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, email_port: e.target.value })
                  }
                  placeholder="e.g., 587"
                />
              </div>
              <div>
                <Label htmlFor="email-username">Email Username</Label>
                <Input
                  id="email-username"
                  value={settingsForm.email_username}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, email_username: e.target.value })
                  }
                  placeholder="your-email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="email-password">Email Password / App Password</Label>
                <Input
                  id="email-password"
                  type="password"
                  value={settingsForm.email_password}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, email_password: e.target.value })
                  }
                  placeholder="••••••••"
                />
              </div>
            </div>
          </ScrollArea>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setIsEditingSettings(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveSettingsMutation.mutate(settingsForm)}>
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

