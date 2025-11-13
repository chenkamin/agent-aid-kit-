import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Mail, 
  CheckCircle2, 
  Star,
  ArrowRight,
  MessageSquare,
  Calendar,
  BarChart3,
  Shield,
  Zap,
  Globe,
  Loader2,
  Crown,
  Check
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Landing() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect authenticated users to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-block mb-4">
            <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
              <Zap className="h-4 w-4" />
              <span>The Ultimate Property Management Tool</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dealio
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            Streamline your real estate investment workflow. Track properties, manage deals, 
            collaborate with your team, and close more deals faster.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8 py-6">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            14-day free trial • No credit card required
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="border-2 hover:border-blue-500 transition-colors">
            <CardHeader>
              <Building2 className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Property Tracking</CardTitle>
              <CardDescription>
                Manage your entire property pipeline in one place. Track status, deals, and key metrics for every listing.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-purple-500 transition-colors">
            <CardHeader>
              <Users className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Invite your team members and work together. Share properties, assign tasks, and collaborate in real-time.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-green-500 transition-colors">
            <CardHeader>
              <Mail className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Create reusable email templates for agents. Send professional emails with one click using customizable templates.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-orange-500 transition-colors">
            <CardHeader>
              <Calendar className="h-12 w-12 text-orange-600 mb-4" />
              <CardTitle>Activity Management</CardTitle>
              <CardDescription>
                Never miss a follow-up. Track calls, site visits, offers, and more with our comprehensive activity system.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-red-500 transition-colors">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-red-600 mb-4" />
              <CardTitle>Buy Box Filters</CardTitle>
              <CardDescription>
                Define your investment criteria once. Automatically match incoming properties against your buy box parameters.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-indigo-500 transition-colors">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-indigo-600 mb-4" />
              <CardTitle>Deal Analytics</CardTitle>
              <CardDescription>
                Track your portfolio performance. Get insights on ARV, offer prices, and deal metrics at a glance.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="mb-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Why Real Estate Investors Choose Dealio
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <Shield className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-blue-100">
                Your data is encrypted and secure. Built on enterprise-grade infrastructure.
              </p>
            </div>
            <div className="text-center">
              <Zap className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-blue-100">
                Optimized for speed. Manage hundreds of properties without any lag.
              </p>
            </div>
            <div className="text-center">
              <Globe className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Access Anywhere</h3>
              <p className="text-blue-100">
                Cloud-based platform. Access your deals from any device, anywhere.
              </p>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            What Our Users Say
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardTitle className="text-lg">Game Changer!</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  "Dealio has completely transformed how we manage our property portfolio. 
                  We've closed 30% more deals since switching to this platform."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    JD
                  </div>
                  <div>
                    <p className="font-semibold">John Davidson</p>
                    <p className="text-sm text-muted-foreground">Real Estate Investor, Ohio</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardTitle className="text-lg">Best Investment Tool</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  "The team collaboration features are incredible. My partner and I can now 
                  work together seamlessly, even when we're in different cities."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    SM
                  </div>
                  <div>
                    <p className="font-semibold">Sarah Mitchell</p>
                    <p className="text-sm text-muted-foreground">Investment Partner, Texas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardTitle className="text-lg">Highly Recommended</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  "Simple, powerful, and exactly what I needed. The email templates alone 
                  save me hours every week. Couldn't run my business without it now."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                    MR
                  </div>
                  <div>
                    <p className="font-semibold">Mike Rodriguez</p>
                    <p className="text-sm text-muted-foreground">Wholesaler, Florida</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="mb-16 scroll-mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your business needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Basic Plan */}
            <Card className="border-2 hover:border-blue-500 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">Basic</CardTitle>
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription>Perfect for getting started</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>5 Buy Boxes</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>5 Zip Codes</strong> per buy box</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>1 Team Member</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Property tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Email templates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Activity management</span>
                  </li>
                </ul>
                <Link to="/signup">
                  <Button className="w-full" size="lg">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Plan - Featured */}
            <Card className="border-2 border-purple-500 shadow-xl relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1">
                  Most Popular
                </Badge>
              </div>
              <CardHeader className="pt-8">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">Pro</CardTitle>
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$149</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription>For growing teams</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>20 Buy Boxes</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Unlimited Zip Codes</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Unlimited Team Members</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Everything in Basic</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Advanced analytics</span>
                  </li>
                </ul>
                <Link to="/signup">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" size="lg">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Xtream Plan */}
            <Card className="border-2 hover:border-orange-500 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">Xtream</CardTitle>
                  <Crown className="h-6 w-6 text-orange-600" />
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$299</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription>For power users</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Unlimited Buy Boxes</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Unlimited Zip Codes</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Unlimited Team Members</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Everything in Pro</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Dedicated support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Custom integrations</span>
                  </li>
                </ul>
                <Link to="/signup">
                  <Button className="w-full" size="lg" variant="outline">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">
                Is there a free trial?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! All plans come with a 14-day free trial. No credit card required to start. 
                You get full access to all features during the trial period, and you can cancel 
                anytime if it's not the right fit.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                Can I invite my business partners?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! Team collaboration is one of our core features. You can create a company workspace 
                and invite your partners, wholesalers, or team members. Everyone sees the same properties 
                and can assign tasks to each other. All data is shared within your company.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                How does the email integration work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                You can create reusable email templates with variables like property address, price, and 
                agent name. When you want to contact an agent, simply select a template, fill in the 
                details, and send. Your company email signature is automatically added to every email.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                What are Buy Boxes?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Buy Boxes are your investment criteria. Define things like target cities, price range, 
                number of bedrooms, and property types. When you add new properties, you can quickly 
                check if they match your buy box criteria, helping you focus on the best deals.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                Is my data secure?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolutely. We use enterprise-grade security with Supabase (built on PostgreSQL). 
                All data is encrypted in transit and at rest. We implement row-level security to 
                ensure your data is only accessible by you and your team members. We never share 
                your data with third parties.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left">
                Can I import my existing property data?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! You can manually add properties one by one through our user-friendly form, or 
                contact our support team for bulk import options. We're constantly improving our 
                data import capabilities.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger className="text-left">
                What kind of support do you offer?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We offer email support for all users. Premium plan subscribers get priority support 
                with faster response times. We also have comprehensive documentation and video tutorials 
                to help you get the most out of Dealio.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger className="text-left">
                Can I cancel anytime?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes, absolutely. There are no long-term contracts. You can upgrade, downgrade, or 
                cancel your subscription at any time. If you cancel, you can continue using the free 
                plan with no interruption to your data.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Real Estate Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of successful real estate investors who are closing more deals with Dealio.
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Start Free Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-blue-100 mt-4">
            Get started in less than 2 minutes • No credit card required
          </p>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t text-center text-muted-foreground">
          <p className="mb-4">© 2025 Dealio. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-sm">
            <Link to="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">
              Sign Up
            </Link>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="mailto:support@agentaidkit.com" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

