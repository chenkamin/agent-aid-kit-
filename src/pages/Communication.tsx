import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, Plus, Trash2, Edit, Sparkles, Loader2, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
}

interface SMSTemplate {
  id: string;
  name: string;
  body: string;
  created_at: string;
}

interface CommunicationSettings {
  email_host?: string;
  email_port?: string;
  email_username?: string;
  email_password?: string;
  sms_api_key?: string;
  sms_api_secret?: string;
  sms_from_number?: string;
}

export default function Communication() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreatingEmailTemplate, setIsCreatingEmailTemplate] = useState(false);
  const [isCreatingSMSTemplate, setIsCreatingSMSTemplate] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<"email" | "sms" | null>(null);
  const [editingEmailTemplateId, setEditingEmailTemplateId] = useState<string | null>(null);

  const [emailTemplateForm, setEmailTemplateForm] = useState({
    name: "",
    subject: "",
    body: "",
  });

  const [smsTemplateForm, setSmsTemplateForm] = useState({
    name: "",
    body: "",
  });

  const [settingsForm, setSettingsForm] = useState<CommunicationSettings>({
    email_host: "",
    email_port: "",
    email_username: "",
    email_password: "",
    sms_api_key: "",
    sms_api_secret: "",
    sms_from_number: "",
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
    queryKey: ["email_templates", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch SMS templates
  const { data: smsTemplates = [] } = useQuery({
    queryKey: ["sms_templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_templates")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SMSTemplate[];
    },
    enabled: !!user?.id,
  });

  // Fetch communication settings
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

  // Load settings into form when data is fetched
  useState(() => {
    if (settings) {
      setSettingsForm(settings);
    }
  });

  // Create or Update email template mutation
  const saveEmailTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!userCompany?.company_id) throw new Error("No company found");
      
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

  // Create SMS template mutation
  const createSMSTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("sms_templates").insert([{
        user_id: user?.id,
        ...data,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms_templates", user?.id] });
      setIsCreatingSMSTemplate(false);
      setSmsTemplateForm({ name: "", body: "" });
      toast({ title: "SMS template created", description: "Your SMS template has been saved successfully." });
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

  // Delete SMS template mutation
  const deleteSMSTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms_templates", user?.id] });
      toast({ title: "Template deleted", description: "The SMS template has been deleted." });
    },
  });

  // Save communication settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: CommunicationSettings) => {
      const { error } = await supabase
        .from("communication_settings")
        .upsert({
          user_id: user?.id,
          ...data,
        }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication_settings", user?.id] });
      setIsEditingSettings(false);
      toast({ title: "Settings saved", description: "Your communication settings have been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Generate template with AI
  const handleGenerateTemplate = async (type: "email" | "sms") => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description of the template you want to generate",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingTemplate(true);
    setGeneratingFor(type);

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
          body: JSON.stringify({ prompt: aiPrompt, type }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate template");
      }

      const result = await response.json();

      if (type === "email") {
        setEmailTemplateForm({
          name: result.name || "AI Generated Template",
          subject: result.subject || "",
          body: result.body || "",
        });
        setIsCreatingEmailTemplate(true);
      } else {
        setSmsTemplateForm({
          name: result.name || "AI Generated Template",
          body: result.body || "",
        });
        setIsCreatingSMSTemplate(true);
      }

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
      setGeneratingFor(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Communication</h1>
          <p className="text-muted-foreground mt-1">
            Manage your email and SMS communication templates
          </p>
        </div>
        <Button onClick={() => setIsEditingSettings(true)} variant="outline">
          <Save className="h-4 w-4 mr-2" />
          Connection Settings
        </Button>
      </div>

      {/* AI Template Generator */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Template Generator
          </CardTitle>
          <CardDescription>
            Describe the template you need, and AI will create it for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Textarea
              placeholder="E.g., 'Create a follow-up email for a property I viewed last week' or 'Create an SMS to ask about property price reduction'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="flex-1 min-h-[80px]"
            />
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                💡 Available Variables
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Your templates can include these variables: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{PROPERTY}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{PRICE}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{AGENT_NAME}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{BEDROOMS}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{BATHROOMS}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{SQFT}}'}</code>
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => handleGenerateTemplate("email")}
              disabled={isGeneratingTemplate}
              className="flex-1"
            >
              {isGeneratingTemplate && generatingFor === "email" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Generate Email Template
            </Button>
            <Button
              onClick={() => handleGenerateTemplate("sms")}
              disabled={isGeneratingTemplate}
              variant="secondary"
              className="flex-1"
            >
              {isGeneratingTemplate && generatingFor === "sms" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Generate SMS Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Email and SMS */}
      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS Templates
          </TabsTrigger>
        </TabsList>

        {/* Email Templates Tab */}
        <TabsContent value="email" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {emailTemplates.length} template{emailTemplates.length !== 1 ? "s" : ""} saved
            </p>
            <Button onClick={() => {
              setEditingEmailTemplateId(null);
              setEmailTemplateForm({ name: "", subject: "", body: "" });
              setIsCreatingEmailTemplate(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Email Template
            </Button>
          </div>

          <Card>
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
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
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
                              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded"
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

        {/* SMS Templates Tab */}
        <TabsContent value="sms" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {smsTemplates.length} template{smsTemplates.length !== 1 ? "s" : ""} saved
            </p>
            <Button onClick={() => setIsCreatingSMSTemplate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New SMS Template
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Message Preview</TableHead>
                  <TableHead className="w-[100px]">Length</TableHead>
                  <TableHead className="w-[200px]">Variables</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {smsTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md">
                      <div className="line-clamp-2">{template.body}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={template.body.length > 160 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                        {template.body.length}/160
                      </span>
                    </TableCell>
                    <TableCell>
                      {template.body.includes('{{') ? (
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(template.body.match(/\{\{[A-Z_]+\}\}/g) || [])).map((variable) => (
                            <span
                              key={variable}
                              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded"
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
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSmsTemplateForm(template);
                            setIsCreatingSMSTemplate(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSMSTemplateMutation.mutate(template.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {smsTemplates.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No SMS templates yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first template or use AI to generate one
                </p>
              </CardContent>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEmailTemplateId ? "Edit Email Template" : "Create Email Template"}</DialogTitle>
            <DialogDescription>
              {editingEmailTemplateId ? "Update your email template" : "Create a new email template for quick communication"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setIsCreatingEmailTemplate(false);
                setEditingEmailTemplateId(null);
                setEmailTemplateForm({ name: "", subject: "", body: "" });
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit SMS Template Dialog */}
      <Dialog open={isCreatingSMSTemplate} onOpenChange={setIsCreatingSMSTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SMS Template</DialogTitle>
            <DialogDescription>
              Create or edit an SMS template for quick communication
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sms-name">Template Name</Label>
              <Input
                id="sms-name"
                value={smsTemplateForm.name}
                onChange={(e) =>
                  setSmsTemplateForm({ ...smsTemplateForm, name: e.target.value })
                }
                placeholder="e.g., Quick Property Inquiry"
              />
            </div>
            <div>
              <Label htmlFor="sms-body">Message</Label>
              <Textarea
                id="sms-body"
                value={smsTemplateForm.body}
                onChange={(e) =>
                  setSmsTemplateForm({ ...smsTemplateForm, body: e.target.value })
                }
                placeholder="Enter your SMS message..."
                className="min-h-[120px]"
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {smsTemplateForm.body.length}/160 characters
              </p>
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
                        const textarea = document.getElementById('sms-body') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = smsTemplateForm.body;
                          const before = text.substring(0, start);
                          const after = text.substring(end);
                          setSmsTemplateForm({ ...smsTemplateForm, body: before + variable + after });
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsCreatingSMSTemplate(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createSMSTemplateMutation.mutate(smsTemplateForm)}
                disabled={!smsTemplateForm.name || !smsTemplateForm.body}
              >
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connection Settings Dialog */}
      <Dialog open={isEditingSettings} onOpenChange={setIsEditingSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Connection Settings</DialogTitle>
            <DialogDescription>
              Configure your email and SMS service connection details
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Email Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Email Configuration (SMTP)</h3>
                <div className="grid gap-4">
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
              </div>

              {/* SMS Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">SMS Configuration (Twilio)</h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="sms-api-key">Twilio Account SID</Label>
                    <Input
                      id="sms-api-key"
                      value={settingsForm.sms_api_key}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, sms_api_key: e.target.value })
                      }
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sms-api-secret">Twilio Auth Token</Label>
                    <Input
                      id="sms-api-secret"
                      type="password"
                      value={settingsForm.sms_api_secret}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, sms_api_secret: e.target.value })
                      }
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sms-from-number">Twilio Phone Number</Label>
                    <Input
                      id="sms-from-number"
                      value={settingsForm.sms_from_number}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, sms_from_number: e.target.value })
                      }
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
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

