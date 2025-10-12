import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Users, UserPlus, Mail, Trash2, Shield, Crown, User as UserIcon, Copy } from "lucide-react";
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

export default function TeamSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<any>(null);

  // Fetch user's company
  const { data: userCompany, isLoading: companyLoading } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log("Fetching company for user:", user.id);
      
      // Check if user is part of a company
      const { data: teamMember, error } = await supabase
        .from("team_members")
        .select("*, companies(*)")
        .eq("user_id", user.id)
        .single();

      console.log("Team member query result:", { teamMember, error });

      if (teamMember && teamMember.companies) {
        console.log("Found company:", teamMember.companies);
        return teamMember.companies;
      }
      return null;
    },
    enabled: !!user?.id,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", userCompany?.id],
    queryFn: async () => {
      if (!userCompany?.id) return [];
      
      const { data } = await supabase
        .from("team_members")
        .select(`
          *,
          profiles:user_id (email)
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
      // Invalidate and refetch all related queries
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

      // Get inviter's email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      // Generate invitation token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create invitation record
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

      // Call edge function to send email
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
          // Don't throw - invitation is created, just email failed
        }

        return { email, token, emailSent: emailResult?.emailSent || false };
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr);
        // Return success anyway - invitation is created
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

      // Get inviter's email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      // Call edge function to send email
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

  // Copy invitation link to clipboard
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

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user doesn't have a company yet, show company creation form
  if (!userCompany) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Team Settings</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Create a company to collaborate with your team
          </p>
        </div>

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
      </div>
    );
  }

  // User has a company, show team management interface
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Team Settings</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Manage your team and collaborate on property tracking
        </p>
      </div>

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
      {
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
      }

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
                    <p className="font-medium">{member.profiles?.email || "Unknown"}</p>
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
  );
}

