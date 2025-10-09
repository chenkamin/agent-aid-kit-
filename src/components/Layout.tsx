import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, Users, Activity, LayoutDashboard, LogOut, List, MessageSquare, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Properties", href: "/properties", icon: Building2 },
    { name: "Buy Boxes", href: "/lists", icon: List },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Activities", href: "/activities", icon: Activity },
    { name: "Communication", href: "/communication", icon: MessageSquare },
  ];

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-secondary flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-all duration-300 bg-card border-r",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link to="/" className={cn("flex items-center space-x-2", !sidebarOpen && "justify-center w-full")}>
            <Building2 className="h-6 w-6 text-primary flex-shrink-0" />
            {sidebarOpen && <span className="text-lg font-bold text-foreground">Real Estate CRM</span>}
          </Link>
          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-3 mt-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  !sidebarOpen && "justify-center"
                )}
                title={!sidebarOpen ? item.name : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Menu - Bottom of Sidebar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3",
                  !sidebarOpen && "justify-center px-0"
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                  <div className="flex flex-col items-start text-left overflow-hidden">
                    <p className="text-sm font-medium truncate w-full">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-muted-foreground truncate w-full">{user?.email}</p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">My Account</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn("flex-1 transition-all duration-300", sidebarOpen ? "ml-64" : "ml-20")}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-card flex items-center px-6">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="mr-4"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold">
            {navigation.find((item) => item.href === location.pathname)?.name || "Real Estate CRM"}
          </h1>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
