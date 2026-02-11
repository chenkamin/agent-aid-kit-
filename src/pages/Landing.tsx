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
  Check,
  DollarSign,
  Target,
  Clock,
  Sparkles,
  X,
  Play,
  Award,
  HeadphonesIcon,
  Lock,
  Phone,
  Send,
  Bot
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Landing() {
  const { user, loading } = useAuth();
  const [dealsCount, setDealsCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [timeCount, setTimeCount] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  
  // A/B Test Headlines (randomly choose)
  const headlines = [
    { main: "Close 3X More Deals", sub: "In Half The Time" },
    { main: "Automate Your Deal Flow", sub: "Close More, Work Less" },
    { main: "The Smart Way to", sub: "Scale Your Real Estate Business" }
  ];
  const [headline] = useState(() => headlines[Math.floor(Math.random() * headlines.length)]);

  // Animated counters
  useEffect(() => {
    const dealsInterval = setInterval(() => {
      setDealsCount(prev => prev < 847 ? prev + 13 : 847);
    }, 30);
    const revenueInterval = setInterval(() => {
      setRevenue(prev => prev < 12400000 ? prev + 200000 : 12400000);
    }, 30);
    const timeInterval = setInterval(() => {
      setTimeCount(prev => prev < 15 ? prev + 0.5 : 15);
    }, 100);

    return () => {
      clearInterval(dealsInterval);
      clearInterval(revenueInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // Simple live chat widget (placeholder for Intercom/Crisp)
  useEffect(() => {
    // In production, replace this with actual chat widget code
    // Example for Intercom:
    // window.Intercom('boot', { app_id: 'YOUR_APP_ID' });
    
    // For now, we'll add a simple chat button
    const chatButton = document.createElement('div');
    chatButton.id = 'chat-widget';
    chatButton.innerHTML = `
      <div style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
        <button 
          onclick="alert('Live chat widget would open here. Integrate Intercom, Crisp, or similar.')"
          style="background: #2563eb; color: white; border-radius: 50%; width: 60px; height: 60px; border: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 24px;"
        >
          💬
        </button>
      </div>
    `;
    document.body.appendChild(chatButton);

    return () => {
      const widget = document.getElementById('chat-widget');
      if (widget) widget.remove();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <Building2 className="h-6 w-6 text-blue-600" />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dealio
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a 
                href="#features" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </a>
              <a 
                href="#pricing" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost">
                  Sign In
                </Button>
              </Link>
              <Button 
                variant="default"
                onClick={() => setShowVideo(true)}
              >
                Schedule Demo
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Video */}
      <div className="bg-gradient-to-b from-blue-50 to-background dark:from-blue-950/20 dark:to-background">
        <div className="container mx-auto px-4 py-20">
        <motion.div 
          className="text-center max-w-5xl mx-auto mb-16"
          initial="initial"
          animate="animate"
          variants={fadeInUp}
        >
          <motion.div 
            className="inline-block mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Badge variant="outline" className="px-6 py-2 text-sm font-medium border-blue-200 dark:border-blue-800">
              <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
              Trusted by 800+ investors
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {headline.main} <span className="text-blue-600">{headline.sub}</span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            The all-in-one platform that automates your deal flow, tracks properties, 
            and helps you <span className="font-semibold text-foreground">make more money</span>
            <span className="block mt-3 text-lg">
              Perfect for <span className="font-semibold text-blue-600">wholesalers</span> flipping contracts and 
              <span className="font-semibold text-blue-600"> buy-and-hold investors</span> building portfolios
            </span>
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link to="/signup">
              <Button size="lg" className="text-lg px-10 py-7 shadow-lg hover:shadow-xl transition-all">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-10 py-7"
              onClick={() => setShowVideo(true)}
            >
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
              </Button>
          </motion.div>
          
          <motion.p 
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            14-day free trial • No credit card required
          </motion.p>
        </motion.div>

        {/* Video Modal */}
        {showVideo && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowVideo(false)}>
            <div className="relative w-full max-w-4xl bg-background rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setShowVideo(false)}
                className="absolute top-4 right-4 bg-background/80 rounded-full p-2 hover:bg-background z-10"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="aspect-video">
                {/* Replace with your actual video embed */}
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="Dealio Demo"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
        </div>
            </div>
          </div>
        )}

        {/* Trust Badges */}
        <motion.div 
          className="flex flex-wrap justify-center items-center gap-8 mb-24 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">Bank-Level Security</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">99.9% Uptime</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <HeadphonesIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">24/7 Support</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">SOC 2 Compliant</span>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 pb-24 max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="text-center border-none shadow-lg bg-card">
            <CardHeader className="pb-2">
              <motion.div 
                className="text-5xl md:text-6xl font-bold text-blue-600 mb-2"
                key={dealsCount}
              >
                {dealsCount.toLocaleString()}+
              </motion.div>
              <CardTitle className="text-xl font-semibold">Deals Closed</CardTitle>
              <CardDescription>By our users in 2024</CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-none shadow-lg bg-card">
            <CardHeader className="pb-2">
              <motion.div 
                className="text-5xl md:text-6xl font-bold text-blue-600 mb-2"
                key={revenue}
              >
                ${(revenue / 1000000).toFixed(1)}M+
              </motion.div>
              <CardTitle className="text-xl font-semibold">Revenue Generated</CardTitle>
              <CardDescription>For our investor community</CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-none shadow-lg bg-card">
            <CardHeader className="pb-2">
              <motion.div 
                className="text-5xl md:text-6xl font-bold text-blue-600 mb-2"
                key={timeCount}
              >
                {timeCount.toFixed(0)}hrs
              </motion.div>
              <CardTitle className="text-xl font-semibold">Time Saved Weekly</CardTitle>
              <CardDescription>Per investor on average</CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
      </div>

      {/* Timeline Section - How It Works */}
      <div id="how-it-works" className="bg-gradient-to-b from-background to-blue-50 dark:from-background dark:to-blue-950/20 py-24 scroll-mt-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 max-w-4xl mx-auto"
          >
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              The 4-Step System Elite Investors Use to 10X Their Deals
            </h2>
            <p className="text-2xl font-semibold text-foreground mb-2">
              Stop chasing leads. Start dominating your market.
            </p>
         
          </motion.div>

          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: 1,
                  icon: Building2,
                  title: "Discover Every Deal First",
                  description: "Automatically scrape every new listing in your target markets the moment they hit the market. Never miss an opportunity while your competitors are still checking MLS.",
                  badge: "Complete market coverage"
                },
                {
                  step: 2,
                  icon: Sparkles,
                  title: "AI Finds the Motivated Sellers",
                  description: "Our AI analyzes every conversation, scoring seller motivation levels automatically. Focus only on the hottest leads while cold prospects get filtered out.",
                  badge: "AI-powered lead scoring"
                },
                {
                  step: 3,
                  icon: Zap,
                  title: "Automated Follow-Up That Converts",
                  description: "AI-generated personalized messages keep conversations alive without you lifting a finger. Your follow-up game runs 24/7 while you sleep.",
                  badge: "Never miss a follow-up"
                },
                {
                  step: 4,
                  icon: DollarSign,
                  title: "Close Deals at Your Price",
                  description: "Systematic outreach to motivated sellers means you make offers on YOUR terms. Wholesalers: flip contracts for quick fees. Investors: secure rental properties below market value.",
                  badge: "Below-market acquisitions"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative"
                >
                  <Card className="border-none shadow-xl bg-card h-full hover:shadow-2xl transition-all">
            <CardHeader>
                      <div className="absolute -top-4 -left-4">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                          {item.step}
                        </div>
                      </div>
                      <div className="flex justify-center mb-4 mt-4">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center">
                          <item.icon className="h-8 w-8 text-blue-600" />
                        </div>
                      </div>
                      <CardTitle className="text-xl text-center mb-3">
                        {item.title}
                      </CardTitle>
                      <CardDescription className="text-center text-base leading-relaxed mb-4">
                        {item.description}
              </CardDescription>
                      <div className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      </div>
            </CardHeader>
          </Card>
                  {index < 3 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <ArrowRight className="h-8 w-8 text-blue-600" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table - Dealio vs Spreadsheets */}
      <div className="bg-background py-24">
        <div className="container mx-auto px-4">
        <motion.div 
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              Stop Using Spreadsheets Like It's 2010
            </h2>
            <p className="text-2xl font-semibold text-foreground mb-2">
              See how Dealio crushes outdated methods
            </p>
            <p className="text-xl text-muted-foreground">
              The difference is night and day
            </p>
          </div>

          <Card className="border-none shadow-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40%] font-bold text-base">Feature</TableHead>
                  <TableHead className="text-center font-bold text-base">
                    <div className="flex items-center justify-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      Dealio
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-bold text-base text-muted-foreground">Spreadsheets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Automated Property Tracking</TableCell>
                  <TableCell className="text-center">
                    <Check className="h-6 w-6 text-blue-600 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <X className="h-6 w-6 text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Team Collaboration</TableCell>
                  <TableCell className="text-center">
                    <Check className="h-6 w-6 text-blue-600 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground text-sm">Limited</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Automated Follow-ups</TableCell>
                  <TableCell className="text-center">
                    <Check className="h-6 w-6 text-blue-600 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <X className="h-6 w-6 text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">SMS & Email Templates</TableCell>
                  <TableCell className="text-center">
                    <Check className="h-6 w-6 text-blue-600 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <X className="h-6 w-6 text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Smart Buy Box Matching</TableCell>
                  <TableCell className="text-center">
                    <Check className="h-6 w-6 text-blue-600 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground text-sm">Manual</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Real-time Analytics</TableCell>
                  <TableCell className="text-center">
                    <Check className="h-6 w-6 text-blue-600 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground text-sm">Manual</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Mobile Access</TableCell>
                  <TableCell className="text-center">
                    <Check className="h-6 w-6 text-blue-600 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground text-sm">Limited</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Workflow Automation</TableCell>
                  <TableCell className="text-center">
                    <Check className="h-6 w-6 text-blue-600 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <X className="h-6 w-6 text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableCell className="font-bold text-base">Time Saved Per Week</TableCell>
                  <TableCell className="text-center font-bold text-blue-600 text-lg">15+ hours</TableCell>
                  <TableCell className="text-center text-muted-foreground">0 hours</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </motion.div>
        </div>
        </div>

      {/* Case Studies Section */}
      <div className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
        <motion.div 
          className="mb-24 max-w-6xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              Real Investors. Massive Results.
          </h2>
            <p className="text-2xl font-semibold text-foreground mb-2">
              These aren't testimonials. They're proof.
            </p>
            <p className="text-xl text-muted-foreground">
              See how wholesalers and investors like you 3X'd their business
            </p>
            </div>

          <div className="space-y-12">
            {/* Case Study 1 */}
            <Card className="border-none shadow-xl overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="bg-blue-50 dark:bg-blue-950/20 p-8 md:p-12 flex flex-col justify-center">
                  <Badge className="w-fit mb-4 bg-blue-600">Case Study</Badge>
                  <h3 className="text-3xl font-bold mb-4">From 8 to 23 Deals in 6 Months</h3>
                  <div className="space-y-3 text-lg text-muted-foreground mb-6">
                    <p className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span><strong className="text-foreground">+$347K</strong> in revenue</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span><strong className="text-foreground">3X</strong> conversion rate improvement</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span><strong className="text-foreground">23 deals</strong> closed vs 8 before</span>
              </p>
            </div>
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      JD
                    </div>
                    <div>
                      <p className="font-bold">John Davidson</p>
                      <p className="text-sm text-muted-foreground">Real Estate Investor, Cleveland OH</p>
                    </div>
                  </div>
                </div>
                <div className="p-8 md:p-12">
                  <h4 className="font-semibold text-xl mb-4">The Challenge</h4>
                  <p className="text-muted-foreground mb-6">
                    John was managing his real estate deals using spreadsheets and sticky notes. 
                    He was closing only 8 deals per year and constantly losing track of follow-ups. 
                    His conversion rate was stuck at 20%.
                  </p>
                  
                  <h4 className="font-semibold text-xl mb-4">The Solution</h4>
                  <p className="text-muted-foreground mb-6">
                    After switching to Dealio, John automated his entire workflow. The platform's 
                    automated follow-up reminders ensured he never missed an opportunity. The buy 
                    box filters helped him focus only on properties matching his criteria.
                  </p>
                  
                  <h4 className="font-semibold text-xl mb-4">The Result</h4>
                  <p className="text-muted-foreground">
                    In just 6 months, John closed 23 deals worth $347K in total revenue. His 
                    conversion rate jumped from 20% to 63%. He now saves 12 hours per week and 
                    has scaled his operation to handle 3X more properties.
              </p>
            </div>
              </div>
            </Card>

            {/* Case Study 2 */}
            <Card className="border-none shadow-xl overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-8 md:p-12 order-2 md:order-1">
                  <h4 className="font-semibold text-xl mb-4">The Challenge</h4>
                  <p className="text-muted-foreground mb-6">
                    Sarah and her partner were working in separate spreadsheets, leading to 
                    duplicate work and missed opportunities. They could only manage 2-3 offers 
                    per month due to coordination issues.
                  </p>
                  
                  <h4 className="font-semibold text-xl mb-4">The Solution</h4>
                  <p className="text-muted-foreground mb-6">
                    Dealio's team collaboration features gave them a single source of truth. 
                    Real-time updates meant they could work simultaneously without conflicts. 
                    Task assignments kept everyone accountable.
                  </p>
                  
                  <h4 className="font-semibold text-xl mb-4">The Result</h4>
                  <p className="text-muted-foreground">
                    They went from 2-3 offers per month to 12-15 offers. The team closed 40% 
                    more deals and saved 15 hours per week each. They've now expanded to a 
                    team of 5 using Dealio as their central hub.
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-8 md:p-12 flex flex-col justify-center order-1 md:order-2">
                  <Badge className="w-fit mb-4 bg-blue-600">Case Study</Badge>
                  <h3 className="text-3xl font-bold mb-4">5X More Offers Per Month</h3>
                  <div className="space-y-3 text-lg text-muted-foreground mb-6">
                    <p className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span><strong className="text-foreground">15 hours</strong> saved per week per person</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span><strong className="text-foreground">5X</strong> more offers per month</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span>Scaled to <strong className="text-foreground">5-person team</strong></span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      SM
                    </div>
                    <div>
                      <p className="font-bold">Sarah Mitchell</p>
                      <p className="text-sm text-muted-foreground">Investment Partner, Austin TX</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
          </div>
        </div>

        {/* Testimonials */}
      <div className="bg-background py-24">
        <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              Join 800+ Investors Closing More Deals
          </h2>
            <p className="text-2xl font-semibold text-foreground mb-2">
              Don't just take our word for it
            </p>
            <p className="text-xl text-muted-foreground">
              From wholesalers flipping 12 deals/month to investors building 50+ unit portfolios
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="border-none shadow-lg h-full hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-blue-600 text-blue-600" />
                  ))}
                </div>
                  <Badge variant="secondary" className="w-fit mb-3">
                    +$347K Revenue
                  </Badge>
                  <CardTitle className="text-xl">Game Changer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    "In 6 months with Dealio, I closed 23 <strong>rental property acquisitions</strong> worth $347K. Before, I was lucky 
                    to close 8 deals a year. The automated follow-ups alone 3X'd my conversion rate."
                  </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    JD
                  </div>
                  <div>
                    <p className="font-semibold">John Davidson</p>
                      <p className="text-sm text-muted-foreground">Cleveland, OH</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-none shadow-lg h-full hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-blue-600 text-blue-600" />
                  ))}
                </div>
                  <Badge variant="secondary" className="w-fit mb-3">
                    15hrs Saved/Week
                  </Badge>
                  <CardTitle className="text-xl">Best ROI Tool</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    "Dealio saves me 15+ hours every week. My partner and I went from making offers 
                    on 2-3 properties per month to 12-15. More offers = more deals closed."
                </p>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    SM
                  </div>
                  <div>
                    <p className="font-semibold">Sarah Mitchell</p>
                      <p className="text-sm text-muted-foreground">Austin, TX</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border-none shadow-lg h-full hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-blue-600 text-blue-600" />
                  ))}
                </div>
                  <Badge variant="secondary" className="w-fit mb-3">
                    +45% Close Rate
                  </Badge>
                  <CardTitle className="text-xl">Crushing It</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    "My close rate jumped from 18% to 63% after switching to Dealio. I'm <strong>wholesaling</strong> 
                    8-12 properties per month now, flipping contracts to cash buyers. Dealio literally pays for itself 100X over."
                  </p>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    MR
                  </div>
                  <div>
                    <p className="font-semibold">Mike Rodriguez</p>
                      <p className="text-sm text-muted-foreground">Miami, FL</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </div>
        </div>
          </div>
        </div>

      {/* Features Grid */}
      <div id="features" className="bg-gradient-to-b from-blue-50 to-background dark:from-blue-950/20 dark:to-background py-24 scroll-mt-16">
        <div className="container mx-auto px-4">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              Everything You Need to Dominate
            </h2>
            <p className="text-2xl font-semibold text-foreground mb-2">
              Built by investors, for investors
            </p>
            <p className="text-xl text-muted-foreground">
              The complete arsenal to crush your competition
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Building2,
                title: "Property Tracking",
                description: "Manage your entire pipeline. Track wholesale deals, rental properties, and rehab projects. Every listing, every metric, one place."
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Work together seamlessly. Share properties, assign tasks, and collaborate in real-time."
              },
              {
                icon: MessageSquare,
                title: "SMS & Email",
                description: "Communicate with sellers instantly. Pre-built templates save hours every week."
              },
              {
                icon: Calendar,
                title: "Activity Management",
                description: "Never miss a follow-up. Automated reminders keep you on top of every opportunity."
              },
              {
                icon: Target,
                title: "Buy Box Filters",
                description: "Define your criteria once. Wholesalers: find quick-flip opportunities. Investors: identify cash-flowing rentals. Automatic matching to your strategy."
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description: "Track performance at a glance. Make data-driven decisions with real-time insights."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="border-none shadow-lg h-full hover:shadow-xl transition-all hover:border-blue-200 dark:hover:border-blue-800">
                  <CardHeader>
                    <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
        </div>
      </div>

      {/* Integrations Section */}
      <div className="bg-background py-24">
        <div className="container mx-auto px-4">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              Seamless Integrations
            </h2>
            <p className="text-2xl font-semibold text-foreground mb-2">
              Connect your favorite tools in minutes
            </p>
            <p className="text-xl text-muted-foreground">
              Dealio works with the tools you already use
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {[
              {
                icon: Phone,
                title: "OpenPhone & Twilio",
                description: "Connect your business phone system seamlessly. Make calls, send SMS, and track all conversations in one place. OpenPhone (QUO) integration for advanced call routing and Twilio for reliable SMS delivery.",
                badge: "Voice & SMS"
              },
              {
                icon: Mail,
                title: "Gmail & SMTP",
                description: "Send emails directly from Dealio using your Gmail account or any SMTP provider. Keep all communication centralized while using your own email domain. Full email tracking and templates included.",
                badge: "Email Integration"
              },
              {
                icon: Bot,
                title: "OpenAI",
                description: "Powered by cutting-edge AI from OpenAI. Automatically score leads, generate personalized follow-up messages, and get smart insights on every property. Let AI handle the heavy lifting.",
                badge: "AI-Powered"
              },
              {
                icon: Zap,
                title: "More Coming Soon",
                description: "We're constantly adding new integrations based on your feedback. Zapier, Slack, and CRM integrations are on the roadmap. Need a specific integration? Let us know!",
                badge: "Expanding"
              }
            ].map((integration, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="border-none shadow-lg h-full hover:shadow-xl transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <integration.icon className="h-7 w-7 text-blue-600" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {integration.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl mb-3">
                      {integration.title}
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {integration.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 shadow-lg inline-block">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 text-left">
                  <Shield className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <CardTitle className="text-lg mb-1">Enterprise-Grade Security</CardTitle>
                    <CardDescription className="text-sm">
                      All integrations use secure OAuth 2.0 authentication and encrypted data transfer. Your credentials are never stored or exposed.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </motion.div>
        </div>
      </div>

      {/* ROI Section */}
      <div className="bg-background py-24">
        <div className="container mx-auto px-4">
        <motion.div 
          className="bg-blue-600 dark:bg-blue-700 rounded-3xl p-12 md:p-16 text-white shadow-2xl max-w-5xl mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              The Numbers Don't Lie
            </h2>
            <p className="text-2xl font-bold mb-2">
              Here's what wholesalers and investors are actually achieving
            </p>
            <p className="text-xl text-blue-100">
              Real averages from both wholesalers flipping contracts and investors buying rentals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-6xl font-bold mb-3">3X</div>
              <div className="text-xl font-semibold mb-2">More Deals</div>
              <div className="text-blue-100">Average increase</div>
            </div>
            
            <div className="text-center">
              <div className="text-6xl font-bold mb-3">$58K</div>
              <div className="text-xl font-semibold mb-2">Extra Revenue</div>
              <div className="text-blue-100">Per year average</div>
            </div>

            <div className="text-center">
              <div className="text-6xl font-bold mb-3">15hrs</div>
              <div className="text-xl font-semibold mb-2">Time Saved</div>
              <div className="text-blue-100">Every single week</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="text-lg px-10 py-7 shadow-xl">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
        </div>
      </div>

      {/* Pricing Section */}
      {/* <div className="bg-muted/20 py-24">
        <div className="container mx-auto px-4">
        <div id="pricing" className="max-w-6xl mx-auto scroll-mt-16">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              Pricing That Pays For Itself
            </h2>
            <p className="text-2xl font-semibold text-foreground mb-2">
              Just ONE extra deal covers a year of Dealio
            </p>
            <p className="text-xl text-muted-foreground">
              Choose your plan and start closing more deals
            </p>
          </div> */}

          {/* <div className="grid md:grid-cols-3 gap-8"> */}
            {/* Basic Plan */}
            {/* <Card className="border-none shadow-lg hover:shadow-xl transition-all">
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
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>5 Buy Boxes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>5 Zip Codes per box</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>1 Team Member</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>All core features</span>
                  </li>
                </ul>
                <Link to="/signup">
                  <Button className="w-full" size="lg">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card> */}

            {/* Pro Plan */}
            {/* <Card className="border-2 border-blue-600 shadow-xl relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-4 py-1">
                  Most Popular
                </Badge>
              </div>
              <CardHeader className="pt-8">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">Pro</CardTitle>
                  <Building2 className="h-6 w-6 text-blue-600" />
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
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>20 Buy Boxes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Unlimited Zip Codes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Unlimited Team Members</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Link to="/signup">
                  <Button className="w-full" size="lg">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card> */}

            {/* Xtream Plan */}
            {/* <Card className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">Xtream</CardTitle>
                  <Crown className="h-6 w-6 text-blue-600" />
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
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Unlimited Buy Boxes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Unlimited Zip Codes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Unlimited Team Members</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Dedicated support</span>
                  </li>
                </ul>
                <Link to="/signup">
                  <Button className="w-full" size="lg" variant="outline">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div> */}

          {/* <div className="text-center mt-8">
            <p className="text-muted-foreground">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>
        </div>
          </div>
        </div> */}

        {/* FAQ Section */}
      <div className="bg-background py-24">
        <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-black mb-4">
              Got Questions? We've Got Answers
          </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know before you start
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">
                Is there a free trial?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! All plans come with a 14-day free trial. No credit card required to start. 
                You get full access to all features during the trial period.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                Can I invite my team?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! You can invite your partners and team members. Everyone sees the same properties 
                and can collaborate in real-time.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                How does the email integration work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Create reusable email templates with variables. Select a template, fill in details, 
                and send. Your signature is automatically added.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                What are Buy Boxes?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Buy Boxes are your investment criteria. Define your targets once, and properties 
                are automatically matched to your strategy.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                Is my data secure?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolutely. We use enterprise-grade security with encryption in transit and at rest. 
                Your data is only accessible by you and your team.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left">
                Can I cancel anytime?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes. There are no long-term contracts. You can upgrade, downgrade, or cancel at any time.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        </div>
        </div>

      {/* Final CTA */}
      <div className="bg-gradient-to-b from-blue-50 to-background dark:from-blue-950/20 dark:to-background py-24">
        <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          <div className="bg-muted/30 rounded-3xl p-12 md:p-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              Ready to 3X Your Deal Flow?
            </h2>
            <p className="text-2xl font-semibold text-foreground mb-3">
              Join 800+ wholesalers and investors closing more deals with Dealio
            </p>
            <p className="text-xl text-muted-foreground mb-8">
              Start your 14-day trial. No credit card required.
          </p>
          <Link to="/signup">
              <Button size="lg" className="text-lg px-10 py-7 shadow-lg">
                Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • Cancel anytime
          </p>
          </div>
        </div>
        </div>
        </div>

        {/* Footer */}
      <div className="bg-muted/30">
        <div className="container mx-auto px-4">
        <div className="pt-8 border-t text-center text-muted-foreground">
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
    </div>
  );
}
