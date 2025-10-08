# Authentication System

## Overview
The Real Estate CRM now has a complete authentication system powered by Supabase Auth. Users must sign up and log in to access the application.

## Features Implemented

### 1. **AuthContext** (`src/contexts/AuthContext.tsx`)
- Centralized authentication state management
- Handles user sessions
- Provides sign up, sign in, and sign out functions
- Automatically manages authentication state across the app

### 2. **Login Page** (`src/pages/Login.tsx`)
- Clean, modern login interface
- Email and password authentication
- Form validation
- Link to signup page for new users
- Loading states and error handling

### 3. **Signup Page** (`src/pages/Signup.tsx`)
- User registration form
- Password confirmation validation
- Email verification support
- Minimum password length requirement (6 characters)
- Link to login page for existing users

### 4. **Protected Routes** (`src/components/ProtectedRoute.tsx`)
- Wraps protected pages to ensure only authenticated users can access them
- Redirects unauthenticated users to login page
- Shows loading spinner during authentication check

### 5. **Updated Layout** (`src/components/Layout.tsx`)
- User avatar dropdown in header
- Displays user email
- Sign out button
- User initials shown in avatar

## How It Works

1. **New Users**: Visit `/signup` to create an account
   - Enter email and password
   - Supabase sends verification email (if enabled)
   - User can log in after account creation

2. **Existing Users**: Visit `/login` to access their account
   - Enter email and password
   - Redirected to dashboard upon successful login

3. **Protected Pages**: All main pages (Dashboard, Properties, Contacts, Activities) require authentication
   - Unauthenticated users are automatically redirected to login page
   - Authentication state persists across page refreshes

4. **Sign Out**: Click user avatar in header and select "Sign out"
   - Clears session and redirects to login page

## Routes

- **Public Routes**:
  - `/login` - Sign in page
  - `/signup` - Sign up page

- **Protected Routes** (require authentication):
  - `/` - Dashboard
  - `/properties` - Properties list
  - `/properties/new` - Add new property
  - `/properties/:id` - Property details
  - `/properties/:id/edit` - Edit property
  - `/contacts` - Contacts list
  - `/activities` - Activities list

## Security Notes

- Passwords are securely hashed by Supabase
- Sessions are stored in localStorage with auto-refresh
- Email verification can be enabled in Supabase dashboard
- Consider enabling leaked password protection (see Supabase Auth settings)

## Testing

To test the authentication:
1. Run `npm run dev`
2. Navigate to `http://localhost:5173`
3. You'll be redirected to `/login`
4. Click "Sign up" to create a test account
5. After signup, log in with your credentials
6. You'll be redirected to the dashboard

## Customization

You can customize:
- Password requirements in `src/pages/Signup.tsx`
- Session persistence settings in `src/integrations/supabase/client.ts`
- UI styling in both login and signup pages
- Add OAuth providers (Google, GitHub, etc.) via Supabase dashboard

