import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { MessageSquare, Plus, Trash2, Edit, Sparkles, Loader2, Save, Shield, Search, Send, Flame, Thermometer, Snowflake } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface SMSTemplate {
  id: string;
  name: string;
  body: string;
  created_at: string;
  is_default?: boolean | null;
  user_id?: string | null;
}

interface SMSSettings {
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

export default function SMS() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();

  const [isCreatingSMSTemplate, setIsCreatingSMSTemplate] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [smsSearchTerm, setSmsSearchTerm] = useState("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [aiScoreFilter, setAiScoreFilter] = useState<string>("all");

  // Apply filters from URL params on mount
  useEffect(() => {
    const aiScoreParam = searchParams.get("aiScore");
    const directionParam = searchParams.get("direction");
    
    if (aiScoreParam) {
      setAiScoreFilter(aiScoreParam);
    }
    if (directionParam) {
      setDirectionFilter(directionParam);
    }
  }, [searchParams]);

  const [smsTemplateForm, setSmsTemplateForm] = useState({
    name: "",
    body: "",
  });

  const [sendSMSForm, setSendSMSForm] = useState({
    recipientName: "",
    phoneNumber: "",
    message: "",
  });

  const [settingsForm, setSettingsForm] = useState<SMSSettings>({
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

  // Fetch SMS templates
  const { data: smsTemplates = [] } = useQuery({
    queryKey: ["sms_templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("sms_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as SMSTemplate[];
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

  // Load settings into form when data is fetched
  useEffect(() => {
    if (companyData) {
      setSettingsForm({
        sms_provider: companyData?.sms_provider || "",
        sms_api_key: companyData?.sms_api_key || "",
        sms_phone_number: companyData?.sms_phone_number || "",
      });
    }
  }, [companyData]);

  // Filtered SMS messages based on search
  const filteredSmsMessages = smsMessages.filter((msg: any) => {
    // Search filter
    if (smsSearchTerm) {
      const searchLower = smsSearchTerm.toLowerCase();
      const matchesSearch = (
        msg.message?.toLowerCase().includes(searchLower) ||
        msg.to_number?.toLowerCase().includes(searchLower) ||
        msg.from_number?.toLowerCase().includes(searchLower) ||
        msg.properties?.address?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Direction filter
    if (directionFilter !== "all" && msg.direction !== directionFilter) {
      return false;
    }

    // AI Score filter
    if (aiScoreFilter !== "all") {
      if (aiScoreFilter === "none" && msg.ai_score !== null) {
        return false;
      }
      if (aiScoreFilter !== "none" && msg.ai_score !== parseInt(aiScoreFilter)) {
        return false;
      }
    }

    return true;
  });

  // Create SMS template mutation
  const createSMSTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
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

  // Save SMS settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SMSSettings) => {
      if (!userCompany?.company_id) throw new Error("No company found");
      
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
      queryClient.invalidateQueries({ queryKey: ["company", userCompany?.company_id] });
      setIsEditingSettings(false);
      toast({ title: "Settings saved", description: "Your SMS settings have been updated." });
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
          body: JSON.stringify({ prompt: aiPrompt, type: "sms" }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate template");
      }

      const result = await response.json();

      setSmsTemplateForm({
        name: result.name || "AI Generated Template",
        body: result.body || "",
      });
      setIsCreatingSMSTemplate(true);

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
          <h1 className="text-2xl md:text-3xl font-bold">SMS Communication</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage your SMS templates, send messages, and view SMS history
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setIsSendingSMS(true)} variant="default" className="w-full sm:w-auto">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send SMS
          </Button>
          <Button onClick={() => setIsEditingSettings(true)} variant="outline" className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            SMS Settings
          </Button>
        </div>
      </div>

      {/* AI Score Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">AI-Powered Lead Scoring</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every incoming SMS is automatically analyzed by AI to score seller interest. 
                <span className="inline-flex items-center gap-1 mx-1">
                  <Flame className="h-3 w-3 text-red-500" />
                  <span className="font-medium text-red-700 dark:text-red-400">Hot (3)</span>
                </span>
                means very interested,
                <span className="inline-flex items-center gap-1 mx-1">
                  <Thermometer className="h-3 w-3 text-orange-500" />
                  <span className="font-medium text-orange-700 dark:text-orange-400">Warm (2)</span>
                </span>
                means somewhat interested, and
                <span className="inline-flex items-center gap-1 mx-1">
                  <Snowflake className="h-3 w-3 text-blue-500" />
                  <span className="font-medium text-blue-700 dark:text-blue-400">Cold (1)</span>
                </span>
                means not interested. Focus on hot leads first to close more deals! 🎯
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="sms-templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sms-templates" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS Templates
          </TabsTrigger>
          <TabsTrigger value="sms-history" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS History
          </TabsTrigger>
        </TabsList>

        {/* SMS Templates Tab */}
        <TabsContent value="sms-templates" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {smsTemplates.length} template{smsTemplates.length !== 1 ? "s" : ""} saved
            </p>
            <Button onClick={() => setIsCreatingSMSTemplate(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New SMS Template
            </Button>
          </div>

          {isMobile ? (
            // Mobile card view
            <div className="space-y-3">
              {smsTemplates.map((template) => (
                <Card key={template.id} className={template.is_default ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                          <span className="truncate">{template.name}</span>
                          {template.is_default && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Shield className="h-3 w-3" />
                              Default
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          <span className={template.body.length > 160 ? "text-destructive font-semibold" : ""}>
                            {template.body.length}/160 characters
                          </span>
                        </CardDescription>
                      </div>
                      {!template.is_default && (
                        <div className="flex gap-1">
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
                      {template.is_default && (
                        <Badge variant="outline" className="text-xs">
                          View Only
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Message:</p>
                      <p className="text-sm line-clamp-3">{template.body}</p>
                    </div>
                    {template.body.includes('{{') && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Variables:</p>
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
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop table view
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
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
              </div>
            </Card>
          )}

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SMS messages..."
                value={smsSearchTerm}
                onChange={(e) => setSmsSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Direction Filter */}
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="incoming">📥 Incoming</SelectItem>
                <SelectItem value="outgoing">📤 Outgoing</SelectItem>
              </SelectContent>
            </Select>

            {/* AI Score Filter */}
            <Select value={aiScoreFilter} onValueChange={setAiScoreFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="AI Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="3">🔥 Hot (3)</SelectItem>
                <SelectItem value="2">🌡️ Warm (2)</SelectItem>
                <SelectItem value="1">❄️ Cold (1)</SelectItem>
                <SelectItem value="none">No Score</SelectItem>
              </SelectContent>
            </Select>

            <p className="text-sm text-muted-foreground whitespace-nowrap">
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
          ) : isMobile ? (
            // Mobile card view
            <div className="space-y-3">
              {filteredSmsMessages.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">No messages found</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredSmsMessages.map((message: any) => (
                    <Card key={message.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant={message.direction === 'outgoing' ? 'default' : 'secondary'} className="gap-1 text-xs">
                                <Send className="h-3 w-3" />
                                {message.direction === 'outgoing' ? 'Out' : 'In'}
                              </Badge>
                              {/* AI Score Badge for incoming messages */}
                              {message.direction === 'incoming' && message.ai_score && (
                                <Badge 
                                  variant={message.ai_score === 3 ? 'destructive' : message.ai_score === 2 ? 'default' : 'secondary'}
                                  className="gap-1 text-xs"
                                >
                                  {message.ai_score === 3 ? <Flame className="h-3 w-3" /> : message.ai_score === 2 ? <Thermometer className="h-3 w-3" /> : <Snowflake className="h-3 w-3" />}
                                  {message.ai_score === 3 ? 'Hot' : message.ai_score === 2 ? 'Warm' : 'Cold'}
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-xs">
                              {format(new Date(message.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Phone Number:</p>
                          <p className="text-sm font-mono">
                            {message.direction === 'outgoing' ? message.to_number : message.from_number}
                          </p>
                        </div>
                        {message.properties && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Property:</p>
                            <button
                              onClick={() => navigate(`/properties?propertyId=${message.property_id}`)}
                              className="text-sm text-blue-600 hover:underline cursor-pointer"
                            >
                              {message.properties.address}
                            </button>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Message:</p>
                          <p className="text-sm">{message.message}</p>
                        </div>
                        {/* AI Analysis for incoming messages */}
                        {message.direction === 'incoming' && message.ai_analysis && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-1">AI Analysis:</p>
                            <p className="text-xs text-muted-foreground italic">{message.ai_analysis}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
          ) : (
            // Desktop table view
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Date/Time</TableHead>
                        <TableHead className="w-[100px]">Direction</TableHead>
                        <TableHead className="w-[150px]">Phone Number</TableHead>
                      <TableHead className="w-[200px]">Property</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-[150px]">AI Score</TableHead>
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
                              <button
                                onClick={() => navigate(`/properties?propertyId=${message.property_id}`)}
                                className="text-blue-600 hover:underline cursor-pointer"
                              >
                                {message.properties.address}
                              </button>
                            ) : (
                              <span className="text-muted-foreground italic">No property</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm line-clamp-2">{message.message}</p>
                          </TableCell>
                          <TableCell>
                            {message.direction === 'incoming' && message.ai_score ? (
                              <div className="flex flex-col gap-1">
                                <Badge 
                                  variant={message.ai_score === 3 ? 'destructive' : message.ai_score === 2 ? 'default' : 'secondary'}
                                  className="gap-1 text-xs w-fit"
                                >
                                  {message.ai_score === 3 ? <Flame className="h-3 w-3" /> : message.ai_score === 2 ? <Thermometer className="h-3 w-3" /> : <Snowflake className="h-3 w-3" />}
                                  {message.ai_score === 3 ? 'Hot' : message.ai_score === 2 ? 'Warm' : 'Cold'}
                                </Badge>
                                {message.ai_analysis && (
                                  <p className="text-xs text-muted-foreground italic line-clamp-2" title={message.ai_analysis}>
                                    {message.ai_analysis}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit SMS Template Dialog */}
      <Dialog open={isCreatingSMSTemplate} onOpenChange={setIsCreatingSMSTemplate}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh]">
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
                      placeholder="E.g., 'Create an SMS to ask about property price reduction'"
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
        <DialogContent className="w-[95vw] max-w-md">
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

      {/* SMS Settings Dialog */}
      <Dialog open={isEditingSettings} onOpenChange={setIsEditingSettings}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>SMS Settings</DialogTitle>
            <DialogDescription>
              Configure your SMS service connection details
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
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

