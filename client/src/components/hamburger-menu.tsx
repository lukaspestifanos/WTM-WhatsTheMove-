import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Users, 
  Settings, 
  LogOut, 
  LogIn, 
  Home, 
  Calendar,
  Plus,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger 
} from "@/components/ui/sheet";
import type { User as UserType } from "@shared/schema";

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const typedUser = user as UserType | undefined;

  const handleNavigation = (path: string, requiresAuth: boolean = false) => {
    if (requiresAuth && !user) {
      // Store intended destination
      sessionStorage.setItem('redirectAfterAuth', path === '/create-event' ? '/' : path);

      toast({
        title: "Authentication Required",
        description: "Please sign in to continue",
      });

      setIsOpen(false);
      setLocation("/auth");
      return;
    }

    setIsOpen(false);
    setLocation(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    {
      icon: Home,
      label: "Home",
      path: "/",
      requiresAuth: false,
      show: true,
    },
    {
      icon: Plus,
      label: "Create Event",
      path: "/create-event",
      requiresAuth: true,
      show: true,
      highlight: true,
    },
    {
      icon: Calendar,
      label: "My Events",
      path: "/my-events",
      requiresAuth: true,
      show: !!user,
    },
    {
      icon: User,
      label: "Profile",
      path: "/profile",
      requiresAuth: true,
      show: !!user,
    },
    {
      icon: Users,
      label: "Friends",
      path: "/friends",
      requiresAuth: true,
      show: !!user,
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/settings",
      requiresAuth: true,
      show: !!user,
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm border shadow-sm hover:bg-white/95 h-10 w-10"
          data-testid="button-hamburger-menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
        <SheetHeader className="p-6 pb-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <SheetTitle className="text-xl font-bold text-white">
            What's the Move?
          </SheetTitle>
          <p className="text-sm text-purple-100 mt-1">
            {user ? `Welcome back, ${typedUser?.firstName || 'Friend'}!` : 'Campus event discovery'}
          </p>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100%-5rem)]">
          {/* User Info Section */}
          {user && (
            <div className="p-4 border-b">
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {typedUser?.firstName?.[0] || typedUser?.email?.[0] || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" data-testid="text-user-name">
                    {typedUser?.firstName && typedUser?.lastName 
                      ? `${typedUser.firstName} ${typedUser.lastName}`
                      : typedUser?.email || "User"
                    }
                  </p>
                  {typedUser?.university && (
                    <p className="text-sm text-muted-foreground truncate" data-testid="text-user-university">
                      {typedUser.university}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-3 space-y-1">
              {menuItems.map((item) => {
                if (!item.show) return null;

                const Icon = item.icon;
                const isCreateEvent = item.path === '/create-event';
                const showAuthHint = item.requiresAuth && !user;

                return (
                  <Button
                    key={item.path}
                    variant={item.highlight ? "default" : "ghost"}
                    className={`
                      w-full justify-start h-11
                      ${item.highlight && !user ? 'bg-muted hover:bg-muted/80' : ''}
                      ${item.highlight && user ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white' : ''}
                    `}
                    onClick={() => handleNavigation(item.path, item.requiresAuth)}
                    data-testid={`button-menu-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {showAuthHint && (
                      <span className="text-xs opacity-60">
                        Sign in
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* About Section for Guests */}
            {!user && (
              <div className="px-3 mt-6">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border">
                  <h3 className="font-semibold text-sm mb-2">About</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Discover campus events, parties, concerts, and social gatherings. 
                    Sign in to create your own events and connect with friends!
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">
                    A Split Concept
                  </p>
                </div>
              </div>
            )}
          </nav>

          {/* Bottom Auth Section */}
          <div className="border-t p-4">
            {user ? (
              <Button
                variant="outline"
                className="w-full justify-start h-11 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
            ) : (
              <Button
                className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                onClick={() => handleNavigation("/auth", false)}
                data-testid="button-login"
              >
                <LogIn className="mr-3 h-5 w-5" />
                Sign In / Register
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}