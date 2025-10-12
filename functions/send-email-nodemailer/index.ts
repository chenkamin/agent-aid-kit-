import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  toEmail: string;
  agentName: string;
  subject: string;
  emailContent: string;
  offerPrice?: string;
  companyId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { toEmail, agentName, subject, emailContent, offerPrice, companyId }: EmailRequest = await req.json();

    console.log('Received request with companyId:', companyId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Supabase URL:', supabaseUrl);
    console.log('Has service key:', !!supabaseServiceKey);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch company email signature
    console.log('Fetching signature for company:', companyId);
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('email_signature')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Error fetching company signature:', companyError);
    }

    console.log('Company data:', companyData);
    console.log('Email signature:', companyData?.email_signature);

    const emailSignature = companyData?.email_signature || '';
    console.log('Using email signature:', emailSignature ? 'Yes (' + emailSignature.length + ' chars)' : 'No signature');

    // Get Gmail credentials from environment variables
    const GMAIL_USER = Deno.env.get('GMAIL_USER') || 'deals.cak@gmail.com';
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!GMAIL_APP_PASSWORD) {
      throw new Error('Gmail App Password not configured in environment variables');
    }

    console.log('Attempting to send email from:', GMAIL_USER, 'to:', toEmail);

    // Prepare email content with signature
    const fullEmailContent = emailSignature 
      ? `${emailContent}\n\n---\n${emailSignature}`
      : emailContent;

    // Create HTML email content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px;
    }
    .header { 
      background-color: #4F46E5; 
      color: white; 
      padding: 20px; 
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content { 
      background-color: #f9f9f9; 
      padding: 30px;
      border: 1px solid #e0e0e0;
    }
    .content p {
      margin: 10px 0;
    }
    .footer { 
      text-align: center; 
      padding: 20px; 
      font-size: 12px; 
      color: #666;
      background-color: #f5f5f5;
      border-radius: 0 0 8px 8px;
    }
    .offer-price {
      background-color: #fef3c7;
      padding: 15px;
      margin: 20px 0;
      border-left: 4px solid #f59e0b;
      font-size: 16px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Property Inquiry</h2>
    </div>
    <div class="content">
      ${emailContent.split('\n').map(line => `<p>${line}</p>`).join('\n')}
      ${offerPrice ? `<div class="offer-price">Offer Price: $${offerPrice}</div>` : ''}
      ${emailSignature ? `<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;"><pre style="font-family: Arial, sans-serif; white-space: pre-wrap; margin: 0;">${emailSignature}</pre></div>` : ''}
    </div>
    <div class="footer">
      <p>Sent to: ${agentName}</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Initialize SMTP client for Gmail
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    // Send email
    await client.send({
      from: GMAIL_USER,
      to: toEmail,
      subject: subject,
      content: fullEmailContent,
      html: htmlContent,
    });

    await client.close();

    console.log('Email sent successfully to:', toEmail);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send email',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

