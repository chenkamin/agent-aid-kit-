import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, Users, Activity, LayoutDashboard, LogOut, List, MessageSquare, Menu, X, Settings, Bell, Check, Trash2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Properties", href: "/properties", icon: Building2 },
    { name: "Buy Boxes", href: "/lists", icon: List },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Activities", href: "/activities", icon: Activity },
    { name: "Communication", href: "/communication", icon: MessageSquare },
  ];

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First, create notifications for activities due today
      await supabase.rpc('create_activity_due_notifications');
      
      // Then fetch all notifications
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          property:properties(address, city),
          activity:activities(title, type)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }
      
      // If there are notifications with sent_by_user_id, fetch the sender info separately
      if (data && data.length > 0) {
        const notificationsWithSenders = await Promise.all(
          data.map(async (notification) => {
            if (notification.sent_by_user_id) {
              const { data: senderProfile } = await supabase
                .from("profiles")
                .select("email, full_name")
                .eq("id", notification.sent_by_user_id)
                .single();
              
              return {
                ...notification,
                sent_by: senderProfile
              };
            }
            return notification;
          })
        );
        return notificationsWithSenders;
      }
      
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("user_id", user?.id)
        .eq("read", false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      toast({ title: "All notifications marked as read" });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // Initialize sidebar state based on screen size
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isMobile]);

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-secondary flex">
      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen transition-all duration-300 bg-card border-r",
          // Mobile: overlay with transform, Desktop: normal sidebar with width change
          isMobile
            ? cn(
                "w-64 transform",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              )
            : sidebarOpen
            ? "w-64"
            : "w-20"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link to="/" className={cn("flex items-center space-x-2", !isMobile && !sidebarOpen && "justify-center w-full")}>
            <Building2 className="h-6 w-6 text-primary flex-shrink-0" />
            {(isMobile || sidebarOpen) && <span className="text-lg font-bold text-foreground">Dealio</span>}
          </Link>
          {(isMobile || sidebarOpen) && (
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
                  !isMobile && !sidebarOpen && "justify-center"
                )}
                title={!isMobile && !sidebarOpen ? item.name : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {(isMobile || sidebarOpen) && <span>{item.name}</span>}
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
                  !isMobile && !sidebarOpen && "justify-center px-0"
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {(isMobile || sidebarOpen) && (
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
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        isMobile ? "ml-0" : sidebarOpen ? "ml-64" : "ml-20"
      )}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-card flex items-center px-4 md:px-6">
          {/* Hamburger Menu for Mobile or Collapsed Sidebar for Desktop */}
          {(isMobile || !sidebarOpen) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="mr-4"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-base md:text-lg font-semibold truncate flex-1">
            {navigation.find((item) => item.href === location.pathname)?.name || "Dealio"}
          </h1>
          
          {/* Notifications Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 md:w-96">
              <div className="flex items-center justify-between px-2 py-2">
                <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => markAllAsReadMutation.mutate()}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[400px]">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification: any) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "px-3 py-2 cursor-pointer hover:bg-accent transition-colors",
                          !notification.read && "bg-blue-50 dark:bg-blue-950/20"
                        )}
                        onClick={() => {
                          if (!notification.read) {
                            markAsReadMutation.mutate(notification.id);
                          }
                          if (notification.property_id) {
                            navigate(`/properties`);
                          } else if (notification.activity_id) {
                            navigate(`/activities`);
                          }
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm truncate">
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            {notification.message && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {notification.message}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(notification.created_at), "MMM d, h:mm a")}
                              </p>
                              {notification.sent_by && (
                                <Badge variant="outline" className="text-xs">
                                  From: {notification.sent_by.email?.split('@')[0]}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
