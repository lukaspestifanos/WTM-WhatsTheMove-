import { useState, useCallback, useMemo } from "react";
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
  Menu
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

// Menu item configuration
const MENU_ITEMS = [
  {
    id: 'home',
    icon: Home,
    label: "Home",
    path: "/",
    requiresAuth: false,
    showWhenLoggedOut: true,
  },
  {
    id: 'create-event',
    icon: Plus,
    label: "Create Event",
    path: "/create-event",
    requiresAuth: true,
    highlight: true,
    showWhenLoggedOut: true,
  },
  {
    id: 'my-events',
    icon: Calendar,
    label: "My Events",
    path: "/my-events",
    requiresAuth: true,
    showWhenLoggedOut: false,
  },
  {
    id: 'profile',
    icon: User,
    label: "Profile",
    path: "/profile",
    requiresAuth: true,
    showWhenLoggedOut: false,
  },
  {
    id: 'friends',
    icon: Users,
    label: "Friends",
    path: "/friends",
    requiresAuth: true,
    showWhenLoggedOut: false,
  },
  {
    id: 'settings',
    icon: Settings,
    label: "Settings",
    path: "/settings",
    requiresAuth: true,
    showWhenLoggedOut: false,
  },
] as const;

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const typedUser = user as UserType | undefined;

  // Memoized user display info
  const userDisplayInfo = useMemo(() => {
    if (!typedUser) return null;

    const fullName = typedUser.firstName && typedUser.lastName 
      ? `${typedUser.firstName} ${typedUser.lastName}`
      : typedUser.email || "User";

    const initials = typedUser.firstName?.[0] || typedUser.email?.[0] || "U";

    return {
      fullName,
      initials,
      firstName: typedUser.firstName,
      university: typedUser.university,
    };
  }, [typedUser]);

  // Close menu handler
  const closeMenu = useCallback(() => setIsOpen(false), []);

  // Navigation handler
  const handleNavigation = useCallback((path: string, requiresAuth: boolean = false) => {
    if (requiresAuth && !user) {
      // Store intended destination for post-auth redirect
      const redirectPath = path === '/create-event' ? '/' : path;
      sessionStorage.setItem('redirectAfterAuth', redirectPath);

      toast({
        title: "Authentication Required",
        description: "Please sign in to continue",
      });

      closeMenu();
      setLocation("/auth");
      return;
    }

    closeMenu();
    setLocation(path);
  }, [user, toast, closeMenu, setLocation]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      closeMenu();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  }, [logout, closeMenu, toast, setLocation]);

  // Filter menu items based on auth state
  const visibleMenuItems = useMemo(() => 
    MENU_ITEMS.filter(item => user || item.showWhenLoggedOut),
    [user]
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm border shadow-sm hover:bg-white/95 h-10 w-10 transition-colors"
          aria-label="Open navigation menu"
          data-testid="hamburger-menu-trigger"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent 
        side="left" 
        className="w-[300px] sm:w-[350px] p-0 flex flex-col"
        aria-describedby="menu-description"
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white shrink-0">
          <SheetTitle className="text-xl font-bold text-white">
            What's the Move?
          </SheetTitle>
          <p id="menu-description" className="text-sm text-purple-100 mt-1">
            {user 
              ? `Welcome back, ${userDisplayInfo?.firstName || 'Friend'}!` 
              : 'Campus event discovery'
            }
          </p>
        </SheetHeader>

        {/* User Profile Section */}
        {user && userDisplayInfo && (
          <div className="p-4 border-b shrink-0">
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <div 
                className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                aria-label={`${userDisplayInfo.fullName} avatar`}
              >
                {userDisplayInfo.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p 
                  className="font-medium truncate" 
                  data-testid="user-display-name"
                  title={userDisplayInfo.fullName}
                >
                  {userDisplayInfo.fullName}
                </p>
                {userDisplayInfo.university && (
                  <p 
                    className="text-sm text-muted-foreground truncate" 
                    data-testid="user-university"
                    title={userDisplayInfo.university}
                  >
                    {userDisplayInfo.university}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4" role="navigation" aria-label="Main navigation">
          <div className="px-3 space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const showAuthHint = item.requiresAuth && !user;
              const isHighlighted = item.highlight && user;

              return (
                <Button
                  key={item.id}
                  variant={isHighlighted ? "default" : "ghost"}
                  className={`
                    w-full justify-start h-11 transition-colors
                    ${item.highlight && !user ? 'bg-muted hover:bg-muted/80' : ''}
                    ${isHighlighted ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-sm' : ''}
                  `}
                  onClick={() => handleNavigation(item.path, item.requiresAuth)}
                  data-testid={`menu-item-${item.id}`}
                  aria-label={showAuthHint ? `${item.label} (requires sign in)` : item.label}
                >
                  <Icon className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {showAuthHint && (
                    <span className="text-xs opacity-60 ml-2" aria-hidden="true">
                      Sign in
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          {/* About Section for Non-Authenticated Users */}
          {!user && (
            <div className="px-3 mt-6">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border">
                <h3 className="font-semibold text-sm mb-2">About What's the Move</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                  Discover campus events, parties, concerts, and social gatherings. 
                  Sign in to create your own events and connect with friends!
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  A Split Concept
                </p>
              </div>
            </div>
          )}
        </nav>

        {/* Authentication Actions */}
        <div className="border-t p-4 shrink-0">
          {user ? (
            <Button
              variant="outline"
              className="w-full justify-start h-11 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              onClick={handleLogout}
              data-testid="logout-button"
              aria-label="Sign out of your account"
            >
              <LogOut className="mr-3 h-5 w-5" aria-hidden="true" />
              Sign Out
            </Button>
          ) : (
            <Button
              className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-sm transition-all"
              onClick={() => handleNavigation("/auth", false)}
              data-testid="auth-button"
              aria-label="Sign in or create an account"
            >
              <LogIn className="mr-3 h-5 w-5" aria-hidden="true" />
              Sign In / Register
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}