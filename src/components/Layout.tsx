import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, Users, Activity, LayoutDashboard, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  
  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Properties", href: "/properties", icon: Building2 },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Activities", href: "/activities", icon: Activity },
    { name: "Buy Box", href: "/buybox", icon: Target },
  ];

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card">
        <div className="container flex h-16 items-center px-4">
          <Link to="/" className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">Real Estate CRM</span>
          </Link>
          
          <nav className="ml-auto flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 px-4">
        {children}
      </main>
    </div>
  );
}
