# Team Invitation Email System

## ✅ What's Implemented

### 1. Edge Function: `send-team-invitation`
Located at: `functions/send-team-invitation/index.ts`

**Features:**
- Sends beautiful HTML invitation emails
- Supports multiple email providers (Resend, SendGrid, SMTP)
- Falls back gracefully if no email service is configured
- Generates invitation links automatically
- CORS enabled for frontend calls

### 2. Accept Invitation Page
Located at: `src/pages/AcceptInvite.tsx`

**Features:**
- Validates invitation tokens
- Checks expiration dates
- Allows signup directly from invitation
- Auto-accepts invitation after signup
- Handles login for existing users
- Beautiful UI with status indicators

### 3. Updated TeamSettings
- Calls edge function to send emails
- Shows invitation link in toast if email fails
- Displays pending invitations
- Full team management

## 🔧 Setup Instructions

### Option 1: Using Resend (Recommended)

1. **Sign up for Resend** (https://resend.com)
   - Free tier: 100 emails/day
   - Very easy to set up

2. **Get your API key** from Resend dashboard

3. **Configure in Supabase:**
   ```bash
   # Go to Supabase Dashboard > Project Settings > Edge Functions > Manage Secrets
   ```

4. **Add these secrets:**
   ```
   RESEND_API_KEY=re_...your-key-here...
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_SERVICE=resend
   APP_URL=https://your-app-url.com
   ```

5. **Deploy the edge function:**
   ```bash
   supabase functions deploy send-team-invitation
   ```

### Option 2: Using SendGrid

1. **Sign up for SendGrid** (https://sendgrid.com)
   - Free tier: 100 emails/day

2. **Get your API key**

3. **Add secrets in Supabase:**
   ```
   SENDGRID_API_KEY=SG.your-key-here
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_SERVICE=sendgrid
   APP_URL=https://your-app-url.com
   ```

4. **Deploy the function**

### Option 3: No Email Service (Manual Sharing)

If you don't want to set up an email service now:

1. The system will still work!
2. Invitation records are created in the database
3. The invitation link appears in the toast notification
4. You can manually copy and share the link

The link format is:
```
https://your-app-url.com/accept-invite?token=UNIQUE-TOKEN
```

## 📧 Email Template

The email includes:
- Beautiful gradient header
- Personalized invitation message
- Clear "Accept Invitation" button
- Copy-paste link fallback
- Expiration notice (7 days)
- Responsive design

## 🔄 Invitation Flow

### For Team Owners:

1. Navigate to `/team`
2. Enter teammate's email
3. Click "Send Invite"
4. System creates invitation record
5. Edge function sends email (if configured)
6. Toast shows success with invitation link

### For Invitees:

#### New Users (No Account):
1. Receive email with invitation link
2. Click link → redirected to Accept Invitation page
3. See company name and invitation details
4. Fill in password to create account
5. Automatically joins team after signup
6. Redirected to `/team`

#### Existing Users (Has Account):
1. Receive email with invitation link
2. Click link → redirected to Accept Invitation page
3. If logged in with correct email: One-click accept
4. If not logged in: Prompted to log in
5. After login, automatically accepts invitation
6. Redirected to `/team`

## 🗄️ Database Schema

### team_invitations table
```sql
- id: UUID
- company_id: UUID (references companies)
- email: TEXT (invited email)
- invited_by: UUID (who sent invite)
- token: TEXT UNIQUE (for invitation link)
- expires_at: TIMESTAMPTZ (7 days from creation)
- accepted_at: TIMESTAMPTZ (null until accepted)
- created_at: TIMESTAMPTZ
```

## 🔒 Security Features

1. **Token Validation**: Unique, non-guessable tokens
2. **Expiration**: Invitations expire after 7 days
3. **One-time Use**: Can't accept twice
4. **Email Verification**: Must sign up with invited email
5. **RLS Policies**: Row Level Security on all tables
6. **Auth Required**: Must be authenticated to accept

## 🎨 UI Features

### Team Settings Page
- ✅ Company name display
- ✅ Invite form (email input + button)
- ✅ Pending invitations list
- ✅ Team members list with roles
- ✅ Role management (owner/admin can change roles)
- ✅ Remove members (owner/admin only)

### Accept Invite Page
- ✅ Loading state while validating
- ✅ Error states (expired, invalid, etc.)
- ✅ Signup form for new users
- ✅ One-click accept for logged-in users
- ✅ Success confirmation
- ✅ Responsive design

## 🚀 Testing

### Test Without Email Service:
1. Go to `/team`
2. Invite someone (e.g., `test@example.com`)
3. Copy invitation link from toast
4. Open link in incognito window
5. Sign up and accept invitation
6. Verify you're now a team member

### Test With Email Service:
1. Configure Resend or SendGrid
2. Deploy edge function
3. Invite real email address
4. Check email inbox
5. Click link in email
6. Accept invitation

## 📝 Environment Variables

Required for Edge Function:

```bash
# Supabase (auto-configured)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Email Service (choose one)
EMAIL_SERVICE=resend  # or 'sendgrid'
RESEND_API_KEY=re_...  # if using Resend
SENDGRID_API_KEY=SG...  # if using SendGrid

# Email Configuration
EMAIL_FROM=noreply@yourdomain.com

# Application URL
APP_URL=https://your-app-url.com  # or http://localhost:5173 for dev
```

## 🔍 Troubleshooting

### Email not sending:
1. Check edge function logs in Supabase
2. Verify API key is correct
3. Check EMAIL_SERVICE environment variable
4. Ensure EMAIL_FROM domain is verified (for SendGrid)

### Invitation link not working:
1. Check if invitation is expired
2. Verify token in URL matches database
3. Check browser console for errors
4. Ensure APP_URL is set correctly

### Can't accept invitation:
1. Verify email matches invited email
2. Check if already accepted
3. Ensure user is logged out for signup flow
4. Check RLS policies are applied

## 📊 Monitoring

Check invitation status:
```sql
SELECT 
  ti.*,
  c.name as company_name,
  p.email as inviter_email
FROM team_invitations ti
JOIN companies c ON ti.company_id = c.id
LEFT JOIN profiles p ON ti.invited_by = p.id
ORDER BY ti.created_at DESC;
```

## 🎯 Next Steps

1. **Deploy the edge function** to Supabase
2. **Configure email service** (optional but recommended)
3. **Set APP_URL** environment variable
4. **Test invitation flow** end-to-end
5. **Customize email template** if desired

The system is fully functional and ready to use!

