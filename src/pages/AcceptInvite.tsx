import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [needsSignup, setNeedsSignup] = useState(false);
  const [signupForm, setSignupForm] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      setLoading(true);

      // Fetch invitation details
      const { data: invitationData, error: inviteError } = await supabase
        .from("team_invitations")
        .select(`
          *,
          companies (
            id,
            name
          )
        `)
        .eq("token", token)
        .is("accepted_at", null)
        .single();

      if (inviteError || !invitationData) {
        setError("Invitation not found or already accepted");
        setLoading(false);
        return;
      }

      // Check if invitation is expired
      if (new Date(invitationData.expires_at) < new Date()) {
        setError("This invitation has expired");
        setLoading(false);
        return;
      }

      setInvitation(invitationData);

      // Check if user is logged in and if email matches
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", user.id)
          .single();

        if (profile?.email?.toLowerCase() === invitationData.email.toLowerCase()) {
          // User is logged in with correct email - can accept directly
          setNeedsSignup(false);
        } else {
          setError("Please log in with the invited email address: " + invitationData.email);
        }
      } else {
        // User not logged in - need to signup/login
        setNeedsSignup(true);
        setSignupForm({ email: invitationData.email, password: "" });
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Error loading invitation:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setAccepting(true);

      // Sign up the user
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
      });

      if (signupError) throw signupError;

      if (signupData.user) {
        // Auto-accept invitation after signup
        await acceptInvitation(signupData.user.id);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      toast({
        title: "Signup failed",
        description: err.message,
        variant: "destructive",
      });
      setAccepting(false);
    }
  };

  const handleLogin = () => {
    // Redirect to login with return URL
    navigate(`/login?redirect=/accept-invite?token=${token}`);
  };

  const acceptInvitation = async (userId?: string) => {
    try {
      setAccepting(true);

      const userIdToUse = userId || user?.id;
      if (!userIdToUse) throw new Error("User not authenticated");

      // Add user to team_members
      const { error: teamError } = await supabase
        .from("team_members")
        .insert({
          company_id: invitation.company_id,
          user_id: userIdToUse,
          role: "member",
          invited_by: invitation.invited_by,
          accepted_at: new Date().toISOString(),
        });

      if (teamError) throw teamError;

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from("team_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      toast({
        title: "Welcome to the team!",
        description: `You've successfully joined ${invitation.companies.name}`,
      });

      // Redirect to team page
      setTimeout(() => {
        navigate("/team");
      }, 1500);
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast({
        title: "Error accepting invitation",
        description: err.message,
        variant: "destructive",
      });
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <CardTitle>Invitation Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Team Invitation</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invitation.companies.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {needsSignup ? (
            <>
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Create Your Account</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Sign up with <strong>{invitation.email}</strong> to accept this invitation
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={signupForm.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="Choose a secure password"
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>

                <Button type="submit" className="w-full" disabled={accepting}>
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Sign Up & Join Team"
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Already have an account?
                  </span>
                </div>
              </div>

              <Button variant="outline" onClick={handleLogin} className="w-full">
                Log In Instead
              </Button>
            </>
          ) : (
            <>
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-900">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">Ready to Join</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Click below to join {invitation.companies.name} and start collaborating
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => acceptInvitation()} 
                className="w-full" 
                size="lg"
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept Invitation
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

