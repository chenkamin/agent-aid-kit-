import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationEmailData {
  invitationId: string;
  email: string;
  companyName: string;
  inviterName: string;
  token: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔔 Team invitation email request received');

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const { invitationId, email, companyName, inviterName, token }: InvitationEmailData = await req.json();

    if (!invitationId || !email || !token) {
      throw new Error('Missing required fields: invitationId, email, or token');
    }

    console.log(`📧 Sending invitation to: ${email}`);
    console.log(`🏢 Company: ${companyName}`);
    console.log(`👤 Invited by: ${inviterName}`);

    // Get the app URL from environment or construct it
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const invitationLink = `${appUrl}/accept-invite?token=${token}`;

    console.log(`🔗 Invitation link: ${invitationLink}`);

    // Email service configuration
    // You can use Resend, SendGrid, or any other email service
    const emailServiceType = Deno.env.get('EMAIL_SERVICE') || 'resend'; // 'resend', 'sendgrid', or 'smtp'
    
    let emailSent = false;

    // Option 1: Using Resend (recommended for Supabase)
    if (emailServiceType === 'resend') {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      
      if (resendApiKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: Deno.env.get('EMAIL_FROM') || 'noreply@yourdomain.com',
            to: [email],
            subject: `You've been invited to join ${companyName} on Dealio`,
            html: generateEmailHTML(companyName, inviterName, invitationLink),
          }),
        });

        if (res.ok) {
          emailSent = true;
          console.log('✅ Email sent via Resend');
        } else {
          const error = await res.text();
          console.error('❌ Resend error:', error);
          throw new Error(`Failed to send email via Resend: ${error}`);
        }
      } else {
        console.warn('⚠️ RESEND_API_KEY not configured');
      }
    }

    // Option 2: Using SendGrid
    if (emailServiceType === 'sendgrid') {
      const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
      
      if (sendgridApiKey) {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sendgridApiKey}`,
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email }],
            }],
            from: {
              email: Deno.env.get('EMAIL_FROM') || 'noreply@yourdomain.com',
            },
            subject: `You've been invited to join ${companyName} on Dealio`,
            content: [{
              type: 'text/html',
              value: generateEmailHTML(companyName, inviterName, invitationLink),
            }],
          }),
        });

        if (res.ok) {
          emailSent = true;
          console.log('✅ Email sent via SendGrid');
        } else {
          const error = await res.text();
          console.error('❌ SendGrid error:', error);
          throw new Error(`Failed to send email via SendGrid: ${error}`);
        }
      } else {
        console.warn('⚠️ SENDGRID_API_KEY not configured');
      }
    }

    // If no email service is configured, log the invitation details
    if (!emailSent) {
      console.log('⚠️ No email service configured. Invitation created but email not sent.');
      console.log('📋 Invitation Details:');
      console.log(`   Email: ${email}`);
      console.log(`   Link: ${invitationLink}`);
      console.log(`   Company: ${companyName}`);
      console.log('');
      console.log('💡 To enable email sending, configure one of:');
      console.log('   - RESEND_API_KEY (recommended)');
      console.log('   - SENDGRID_API_KEY');
      console.log('   - Set EMAIL_SERVICE environment variable');
    }

    // Update invitation record to mark as sent (optional)
    await supabaseClient
      .from('team_invitations')
      .update({ 
        // You could add a 'sent_at' field to track when email was sent
        // sent_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent ? 'Invitation email sent successfully' : 'Invitation created (email service not configured)',
        invitationLink,
        emailSent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function generateEmailHTML(companyName: string, inviterName: string, invitationLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🏠 Dealio</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">You've Been Invited!</h2>
    
    <p style="font-size: 16px; color: #555;">
      <strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on Dealio.
    </p>
    
    <p style="font-size: 16px; color: #555;">
      By joining this team, you'll be able to:
    </p>
    
    <ul style="font-size: 16px; color: #555;">
      <li>Collaborate on property tracking</li>
      <li>Share buy boxes and property lists</li>
      <li>Split listing tracking with team members</li>
      <li>Access shared contacts and activities</li>
    </ul>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${invitationLink}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 15px 40px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-size: 18px; 
                font-weight: bold; 
                display: inline-block;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Accept Invitation
      </a>
    </div>
    
    <p style="font-size: 14px; color: #888; margin-top: 30px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #667eea; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">
      ${invitationLink}
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #888; text-align: center;">
      This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
    <p>© 2025 Dealio. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

