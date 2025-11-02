import { useState, useEffect } from "react";
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
import { Mail, MessageSquare, Plus, Trash2, Edit, Sparkles, Loader2, Save, Shield, History, Send, DollarSign, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  is_default?: boolean | null;
  user_id?: string | null;
}

interface SMSTemplate {
  id: string;
  name: string;
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
  sms_provider?: 'openphone' | 'twilio' | '';
  sms_api_key?: string;
  sms_phone_number?: string;
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

export default function Communication() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreatingEmailTemplate, setIsCreatingEmailTemplate] = useState(false);
  const [isCreatingSMSTemplate, setIsCreatingSMSTemplate] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<"email" | "sms" | null>(null);
  const [editingEmailTemplateId, setEditingEmailTemplateId] = useState<string | null>(null);
  const [smsSearchTerm, setSmsSearchTerm] = useState("");
  const [emailSearchTerm, setEmailSearchTerm] = useState("");

  const [emailTemplateForm, setEmailTemplateForm] = useState({
    name: "",
    subject: "",
    body: "",
  });

  const [smsTemplateForm, setSmsTemplateForm] = useState({
    name: "",
    body: "",
  });

  const [sendSMSForm, setSendSMSForm] = useState({
    recipientName: "",
    phoneNumber: "",
    message: "",
  });

  const [settingsForm, setSettingsForm] = useState<CommunicationSettings>({
    email_host: "",
    email_port: "",
    email_username: "",
    email_password: "",
    sms_provider: "",
    sms_api_key: "",
    sms_phone_number: "",
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
      
      // Fetch both user's templates and default templates
      // RLS policy handles the access control
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .or(`and(company_id.eq.${userCompany?.company_id},user_id.eq.${user.id}),is_default.eq.true`)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: !!user?.id && !!userCompany?.company_id,
  });

  // Fetch SMS templates
  const { data: smsTemplates = [] } = useQuery({
    queryKey: ["sms_templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Fetch both user's templates and default templates
      // RLS policy handles the access control
      const { data, error } = await supabase
        .from("sms_templates")
        .select("*")
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as SMSTemplate[];
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

  // Fetch SMS settings from company
  const { data: companyData } = useQuery({
    queryKey: ["company", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("sms_provider, sms_api_key, sms_phone_number")
        .eq("id", userCompany.company_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch SMS messages history
  const { data: smsMessages = [] } = useQuery({
    queryKey: ["sms-messages-history", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data, error } = await supabase
        .from("sms_messages")
        .select("*, properties(address, city)")
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!userCompany?.company_id,
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
    if (settings || companyData) {
      setSettingsForm({
        email_host: settings?.email_host || "",
        email_port: settings?.email_port || "",
        email_username: settings?.email_username || "",
        email_password: settings?.email_password || "",
        sms_provider: companyData?.sms_provider || "",
        sms_api_key: companyData?.sms_api_key || "",
        sms_phone_number: companyData?.sms_phone_number || "",
      });
    }
  }, [settings, companyData]);

  // Filtered SMS messages based on search
  const filteredSmsMessages = smsMessages.filter((msg: any) => {
    if (!smsSearchTerm) return true;
    const searchLower = smsSearchTerm.toLowerCase();
    return (
      msg.message?.toLowerCase().includes(searchLower) ||
      msg.to_number?.toLowerCase().includes(searchLower) ||
      msg.from_number?.toLowerCase().includes(searchLower) ||
      msg.properties?.address?.toLowerCase().includes(searchLower)
    );
  });

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

  // Create SMS template mutation
  const createSMSTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Validate variables in body
      const bodyValidation = validateTemplateVariables(data.body || '');
      
      if (bodyValidation.invalidVars.length > 0) {
        throw new Error(
          `Invalid variables found: ${bodyValidation.invalidVars.join(', ')}. ` +
          `Valid variables are: ${VALID_VARIABLES.join(', ')}`
        );
      }
      
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

  // Send SMS mutation
  const sendSMSMutation = useMutation({
    mutationFn: async (data: { to: string; message: string }) => {
      const { data: result, error } = await supabase.functions.invoke('send-sms', {
        body: {
          type: 'single',
          to: data.to,
          message: data.message
        }
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sms-messages-history"] });
      setIsSendingSMS(false);
      setSendSMSForm({ recipientName: "", phoneNumber: "", message: "" });
      toast({ 
        title: "SMS sent successfully!", 
        description: `Your message was delivered to ${sendSMSForm.recipientName || sendSMSForm.phoneNumber}.`
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send SMS", 
        description: error.message || "An error occurred while sending the SMS",
        variant: "destructive" 
      });
    },
  });

  // Save communication settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: CommunicationSettings) => {
      if (!userCompany?.company_id) throw new Error("No company found");
      
      // Save email settings to communication_settings
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

      // Save SMS settings to companies table
      const { error: smsError } = await supabase
        .from("companies")
        .update({
          sms_provider: data.sms_provider || null,
          sms_api_key: data.sms_api_key || null,
          sms_phone_number: data.sms_phone_number || null,
        })
        .eq("id", userCompany.company_id);
      if (smsError) throw smsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication_settings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["company", userCompany?.company_id] });
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
        <div className="flex gap-2">
          <Button onClick={() => setIsSendingSMS(true)} variant="default">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send SMS
          </Button>
          <Button onClick={() => setIsEditingSettings(true)} variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Connection Settings
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="email-templates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email-templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="sms-templates" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS Templates
          </TabsTrigger>
          <TabsTrigger value="sms-history" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS History
          </TabsTrigger>
          <TabsTrigger value="email-history" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email History
          </TabsTrigger>
        </TabsList>

        {/* Email Templates Tab */}
        <TabsContent value="email-templates" className="space-y-4">
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
        <TabsContent value="sms-templates" className="space-y-4">
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
                      )}
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

        {/* SMS Messages History */}
        <TabsContent value="sms-history" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SMS messages..."
                value={smsSearchTerm}
                onChange={(e) => setSmsSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredSmsMessages.length} of {smsMessages.length} messages
            </p>
          </div>

          {smsMessages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No SMS messages yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Your sent SMS messages will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Date/Time</TableHead>
                      <TableHead className="w-[100px]">Direction</TableHead>
                      <TableHead className="w-[150px]">Phone Number</TableHead>
                      <TableHead className="w-[200px]">Property</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSmsMessages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No messages found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSmsMessages.map((message: any) => (
                        <TableRow key={message.id}>
                          <TableCell className="text-xs">
                            {format(new Date(message.created_at), "MMM d, yyyy\nh:mm a")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={message.direction === 'outgoing' ? 'default' : 'secondary'} className="gap-1 text-xs">
                              <Send className="h-3 w-3" />
                              {message.direction === 'outgoing' ? 'Out' : 'In'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {message.direction === 'outgoing' ? message.to_number : message.from_number}
                          </TableCell>
                          <TableCell className="text-sm">
                            {message.properties ? (
                              <span className="text-blue-600">{message.properties.address}</span>
                            ) : (
                              <span className="text-muted-foreground italic">No property</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm line-clamp-2">{message.message}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {message.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
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
            <Card>
              <ScrollArea className="h-[600px]">
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
                              <span className="text-purple-600">{email.properties.address}</span>
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
        <DialogContent className="max-w-2xl max-h-[90vh]">
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
                        placeholder="E.g., 'Create a follow-up email for a property I viewed last week' or 'Create an SMS to ask about property price reduction'"
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
                        onClick={() => handleGenerateTemplate("email")}
                        disabled={isGeneratingTemplate}
                        className="w-full"
                        size="sm"
                      >
                        {isGeneratingTemplate && generatingFor === "email" ? (
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

      {/* Create/Edit SMS Template Dialog */}
      <Dialog open={isCreatingSMSTemplate} onOpenChange={setIsCreatingSMSTemplate}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>SMS Template</DialogTitle>
            <DialogDescription>
              Create or edit an SMS template for quick communication
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              {/* AI Template Generator Section */}
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
                      placeholder="E.g., 'Create a follow-up email for a property I viewed last week' or 'Create an SMS to ask about property price reduction'"
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
                      onClick={() => handleGenerateTemplate("sms")}
                      disabled={isGeneratingTemplate}
                      className="w-full"
                      size="sm"
                    >
                      {isGeneratingTemplate && generatingFor === "sms" ? (
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
              {(() => {
                const bodyValidation = validateTemplateVariables(smsTemplateForm.body);
                
                return bodyValidation.invalidVars.length > 0 ? (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-2">
                    <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-1">
                      ⚠️ Invalid Variables Detected
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {bodyValidation.invalidVars.join(', ')} - These variables are not recognized. Please use only valid variables from the list below.
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
            </div>
          </ScrollArea>
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setIsCreatingSMSTemplate(false);
              setSmsTemplateForm({ name: "", body: "" });
              setAiPrompt("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => createSMSTemplateMutation.mutate(smsTemplateForm)}
              disabled={!smsTemplateForm.name || !smsTemplateForm.body}
            >
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send SMS Dialog */}
      <Dialog open={isSendingSMS} onOpenChange={setIsSendingSMS}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send SMS</DialogTitle>
            <DialogDescription>
              Send a text message to a recipient
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient-name">Recipient Name (Optional)</Label>
              <Input
                id="recipient-name"
                value={sendSMSForm.recipientName}
                onChange={(e) =>
                  setSendSMSForm({ ...sendSMSForm, recipientName: e.target.value })
                }
                placeholder="John Doe"
              />
              <p className="text-xs text-muted-foreground mt-1">
                For your reference only
              </p>
            </div>
            <div>
              <Label htmlFor="phone-number">Phone Number *</Label>
              <Input
                id="phone-number"
                value={sendSMSForm.phoneNumber}
                onChange={(e) =>
                  setSendSMSForm({ ...sendSMSForm, phoneNumber: e.target.value })
                }
                placeholder="+12345678900"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Include country code (e.g., +1 for US)
              </p>
            </div>
            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={sendSMSForm.message}
                onChange={(e) =>
                  setSendSMSForm({ ...sendSMSForm, message: e.target.value })
                }
                placeholder="Your message here..."
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {sendSMSForm.message.length} characters
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsSendingSMS(false);
                setSendSMSForm({ recipientName: "", phoneNumber: "", message: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!sendSMSForm.phoneNumber || !sendSMSForm.message) {
                  toast({
                    title: "Missing information",
                    description: "Please enter a phone number and message",
                    variant: "destructive"
                  });
                  return;
                }
                sendSMSMutation.mutate({
                  to: sendSMSForm.phoneNumber,
                  message: sendSMSForm.message
                });
              }}
              disabled={sendSMSMutation.isPending}
            >
              {sendSMSMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send SMS
                </>
              )}
            </Button>
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
                <h3 className="text-lg font-semibold">SMS Configuration</h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="sms-provider">SMS Provider</Label>
                    <Select
                      value={settingsForm.sms_provider}
                      onValueChange={(value: 'openphone' | 'twilio') =>
                        setSettingsForm({ ...settingsForm, sms_provider: value })
                      }
                    >
                      <SelectTrigger id="sms-provider">
                        <SelectValue placeholder="Select SMS provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openphone">OpenPhone</SelectItem>
                        <SelectItem value="twilio">Twilio</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose your SMS service provider
                    </p>
                  </div>
                  
                  {settingsForm.sms_provider && (
                    <>
                      <div>
                        <Label htmlFor="sms-api-key">
                          {settingsForm.sms_provider === 'openphone' ? 'OpenPhone API Key' : 'Twilio Credentials'}
                        </Label>
                        <Input
                          id="sms-api-key"
                          type="password"
                          value={settingsForm.sms_api_key}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, sms_api_key: e.target.value })
                          }
                          placeholder={
                            settingsForm.sms_provider === 'openphone'
                              ? 'Your OpenPhone API key'
                              : 'AccountSid:AuthToken'
                          }
                        />
                        {settingsForm.sms_provider === 'twilio' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Format: AccountSid:AuthToken (colon-separated)
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="sms-phone-number">SMS Phone Number</Label>
                        <Input
                          id="sms-phone-number"
                          value={settingsForm.sms_phone_number}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, sms_phone_number: e.target.value })
                          }
                          placeholder="+12345678900"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Your {settingsForm.sms_provider === 'openphone' ? 'OpenPhone' : 'Twilio'} phone number (include country code)
                        </p>
                      </div>
                    </>
                  )}
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

