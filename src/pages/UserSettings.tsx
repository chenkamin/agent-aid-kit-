import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, CreditCard, Save, Users, UserPlus, Mail, Trash2, Shield, Crown, User as UserIcon, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UserSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's company and role
  const { data: userCompany, isLoading: companyLoading } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: teamMember, error } = await supabase
        .from("team_members")
        .select("*, companies(*)")
        .eq("user_id", user.id)
        .single();

      if (teamMember && teamMember.companies) {
        return teamMember.companies;
      }
      return null;
    },
    enabled: !!user?.id,
  });

  // Fetch team members (for team tab)
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", userCompany?.id],
    queryFn: async () => {
      if (!userCompany?.id) return [];
      
      const { data } = await supabase
        .from("team_members")
        .select(`
          *,
          profiles:user_id (email, full_name)
        `)
        .eq("company_id", userCompany.id)
        .order("created_at", { ascending: true });

      return data || [];
    },
    enabled: !!userCompany?.id,
  });

  // Fetch pending invitations
  const { data: pendingInvitations } = useQuery({
    queryKey: ["team-invitations", userCompany?.id],
    queryFn: async () => {
      if (!userCompany?.id) return [];
      
      const { data } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("company_id", userCompany.id)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      return data || [];
    },
    enabled: !!userCompany?.id,
  });

  // Get current user's role
  const userRole = teamMembers?.find(m => m.user_id === user?.id)?.role;

  // Info tab state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Password tab state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Team tab state
  const [companyName, setCompanyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [emailSignature, setEmailSignature] = useState("");
  const [isEditingSignature, setIsEditingSignature] = useState(false);

  // Update state when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  // Load email signature when company loads
  useEffect(() => {
    if (userCompany?.email_signature) {
      setEmailSignature(userCompany.email_signature);
    }
  }, [userCompany]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { full_name?: string; email?: string }) => {
      if (!user?.id) throw new Error("No user");
      
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["team-members-with-profiles"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase.rpc("create_company_with_owner", {
        company_name: name,
        owner_uuid: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-company", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["team-members"] });
      await queryClient.refetchQueries({ queryKey: ["user-company", user?.id] });
      
      toast({
        title: "Company created!",
        description: "Your team workspace is ready. You can now invite team members.",
      });
      setCompanyName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error creating company",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Invite team member mutation
  const inviteTeamMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!userCompany?.id || !user?.id) throw new Error("Company not found");

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: invitation, error } = await supabase
        .from("team_invitations")
        .insert({
          company_id: userCompany.id,
          email: email,
          invited_by: user.id,
          token: token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke(
          'send-team-invitation',
          {
            body: {
              invitationId: invitation.id,
              email: email,
              companyName: userCompany.name,
              inviterName: profile?.email || 'A team member',
              token: token,
            },
          }
        );

        if (emailError) {
          console.error('Email sending error:', emailError);
        }

        return { email, token, emailSent: emailResult?.emailSent || false };
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr);
        return { email, token, emailSent: false };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
      
      const appUrl = window.location.origin;
      const invitationLink = `${appUrl}/accept-invite?token=${data.token}`;
      
      toast({
        title: data.emailSent ? "Invitation sent!" : "Invitation created!",
        description: data.emailSent 
          ? `An invitation email has been sent to ${data.email}.`
          : `Share this link with ${data.email}: ${invitationLink}`,
        duration: data.emailSent ? 5000 : 10000,
      });
      
      setInviteEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Error sending invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async (invitation: any) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke(
          'send-team-invitation',
          {
            body: {
              invitationId: invitation.id,
              email: invitation.email,
              companyName: userCompany?.name || 'Your team',
              inviterName: profile?.email || 'A team member',
              token: invitation.token,
            },
          }
        );

        if (emailError) {
          console.error('Email sending error:', emailError);
        }

        return { 
          email: invitation.email, 
          token: invitation.token, 
          emailSent: emailResult?.emailSent || false 
        };
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr);
        return { email: invitation.email, token: invitation.token, emailSent: false };
      }
    },
    onSuccess: (data) => {
      const appUrl = window.location.origin;
      const invitationLink = `${appUrl}/accept-invite?token=${data.token}`;
      
      toast({
        title: data.emailSent ? "Invitation resent!" : "Invitation link ready!",
        description: data.emailSent 
          ? `The invitation has been resent to ${data.email}.`
          : `Share this link with ${data.email}: ${invitationLink}`,
        duration: data.emailSent ? 5000 : 10000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error resending invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove team member mutation
  const removeTeamMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "Member removed",
        description: "Team member has been removed from the company.",
      });
      setMemberToRemove(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update member role mutation
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase
        .from("team_members")
        .update({ role })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "Role updated",
        description: "Team member role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update email signature mutation
  const updateSignatureMutation = useMutation({
    mutationFn: async (signature: string) => {
      if (!userCompany?.id) throw new Error("No company found");
      
      const { error } = await supabase
        .from("companies")
        .update({ email_signature: signature })
        .eq("id", userCompany.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-company", user?.id] });
      setIsEditingSignature(false);
      toast({
        title: "Email signature updated",
        description: "Your company email signature has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating signature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveInfo = () => {
    updateProfileMutation.mutate({
      full_name: fullName || null,
      email: email || null,
    });
  };

  const handleSavePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    updatePasswordMutation.mutate({ newPassword });
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter a company name.",
        variant: "destructive",
      });
      return;
    }
    createCompanyMutation.mutate(companyName);
  };

  const handleSaveSignature = () => {
    updateSignatureMutation.mutate(emailSignature);
  };

  const handleInviteTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }
    inviteTeamMemberMutation.mutate(inviteEmail);
  };

  const copyInvitationLink = (token: string) => {
    const appUrl = window.location.origin;
    const invitationLink = `${appUrl}/accept-invite?token=${token}`;
    
    navigator.clipboard.writeText(invitationLink).then(
      () => {
        toast({
          title: "Link Copied!",
          description: "Invitation link has been copied to your clipboard.",
        });
      },
      (err) => {
        console.error("Failed to copy:", err);
        toast({
          title: "Error",
          description: "Failed to copy link. Please try again.",
          variant: "destructive",
        });
      }
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4" />;
      case "admin":
        return <Shield className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      owner: "default",
      admin: "secondary",
      member: "outline",
    };
    return (
      <Badge variant={variants[role] || "outline"} className="flex items-center gap-1">
        {getRoleIcon(role)}
        {role}
      </Badge>
    );
  };

  if (isLoading || companyLoading) {
    return (
      <div className="p-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">User Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className={`grid w-full ${userRole === "owner" ? "grid-cols-5" : userCompany ? "grid-cols-4" : "grid-cols-3"}`}>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Info</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Password</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          {userCompany && (
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
          )}
          {userRole === "owner" && (
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
                <p className="text-xs text-muted-foreground">
                  This name will be displayed in team member lists and assignments
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Your email address for notifications and login
                </p>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleSaveInfo}
                  disabled={updateProfileMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleSavePassword}
                  disabled={updatePasswordMutation.isPending || !newPassword || !confirmPassword}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Payments</CardTitle>
              <CardDescription>
                Manage your subscription and payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Payment Settings Coming Soon</h3>
                <p className="text-muted-foreground">
                  Payment and subscription management features will be available soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Tab - Visible to all company members */}
        {userCompany && (
          <TabsContent value="company">
            <div className="space-y-6">
              {/* Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {userCompany.name}
                  </CardTitle>
                  <CardDescription>
                    Your company workspace for collaborative property tracking
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Email Signature */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Signature
                  </CardTitle>
                  <CardDescription>
                    Company email signature for all outgoing emails
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="emailSignature">Company Email Signature</Label>
                      <Textarea
                        id="emailSignature"
                        value={emailSignature}
                        onChange={(e) => setEmailSignature(e.target.value)}
                        placeholder={`PANORAMA INVESTMENTS\nReal Estate Investments – Cleveland & Surrounding Areas\n\nAlon Kaminsky – (618) 591-2449\nChen Kaminsky – (567) 654-3624\n\nEmail - deals.cak@gmail.com`}
                        className="min-h-[200px] font-mono text-sm"
                        disabled={!isEditingSignature}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        This signature will be automatically added to all emails sent from the Properties page.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!isEditingSignature ? (
                        <Button onClick={() => setIsEditingSignature(true)}>
                          Edit Signature
                        </Button>
                      ) : (
                        <>
                          <Button 
                            onClick={handleSaveSignature}
                            disabled={updateSignatureMutation.isPending}
                          >
                            {updateSignatureMutation.isPending ? "Saving..." : "Save Signature"}
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setEmailSignature(userCompany?.email_signature || "");
                              setIsEditingSignature(false);
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                    {emailSignature && !isEditingSignature && (
                      <div className="mt-4 p-4 bg-muted rounded-lg border">
                        <p className="text-sm font-medium mb-2">Preview:</p>
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                          {emailSignature}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Team Tab - Only for owners */}
        {userRole === "owner" && (
          <TabsContent value="team">
            {!userCompany ? (
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Create Your Company
                  </CardTitle>
                  <CardDescription>
                    Start collaborating by creating a company workspace. You'll be able to invite team members to share and track properties together.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCompany} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g., Acme Real Estate Investments"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={createCompanyMutation.isPending}
                      className="w-full"
                    >
                      {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Company Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {userCompany.name}
                    </CardTitle>
                    <CardDescription>
                      Your company workspace for collaborative property tracking
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Invite Team Member */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Invite Team Member
                    </CardTitle>
                    <CardDescription>
                      Send an invitation to a colleague to join your team
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleInviteTeamMember} className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="colleague@example.com"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={inviteTeamMemberMutation.isPending}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {inviteTeamMemberMutation.isPending ? "Sending..." : "Send Invite"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Pending Invitations */}
                {pendingInvitations && pendingInvitations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Pending Invitations</CardTitle>
                      <CardDescription>
                        Invitations waiting to be accepted
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {pendingInvitations.map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{invitation.email}</p>
                                <p className="text-sm text-muted-foreground">
                                  Invited on {new Date(invitation.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">Pending</Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyInvitationLink(invitation.token)}
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Copy Link
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendInvitationMutation.mutate(invitation)}
                                disabled={resendInvitationMutation.isPending}
                              >
                                {resendInvitationMutation.isPending ? "Sending..." : "Resend"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Team Members List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Team Members ({teamMembers?.length || 0})</CardTitle>
                    <CardDescription>
                      People who have access to your company's properties and lists
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {teamMembers?.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">
                                {member.profiles?.full_name || member.profiles?.email || "Unknown"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Joined {new Date(member.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* Role selector for owners/admins */}
                            {(userRole === "owner" || userRole === "admin") && member.user_id !== user?.id && member.role !== "owner" ? (
                              <Select
                                value={member.role}
                                onValueChange={(role) =>
                                  updateMemberRoleMutation.mutate({ memberId: member.id, role })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              getRoleBadge(member.role)
                            )}

                            {/* Remove button (can't remove owner or yourself) */}
                            {(userRole === "owner" || userRole === "admin") &&
                              member.user_id !== user?.id &&
                              member.role !== "owner" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setMemberToRemove(member)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Remove member confirmation dialog */}
                <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove {memberToRemove?.profiles?.email} from the team?
                        They will lose access to all company properties and lists.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => removeTeamMemberMutation.mutate(memberToRemove?.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

