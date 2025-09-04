import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Menu, 
  X, 
  Home, 
  Calendar, 
  Plus, 
  User, 
  Settings, 
  LogOut,
  LogIn,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleNavigation = (path: string, requiresAuth: boolean = false) => {
    if (requiresAuth && !user) {
      // Store intended destination
      sessionStorage.setItem('redirectAfterAuth', path);

      toast({
        title: "Authentication Required",
        description: "Please sign in to continue",
      });

      setOpen(false);
      setLocation("/register");
      return;
    }

    setOpen(false);
    setLocation(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setOpen(false);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
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
    },
    {
      icon: MapPin,
      label: "Event Map",
      path: "/",
      requiresAuth: false,
    },
    {
      icon: Plus,
      label: "Create Event",
      path: "/create-event",
      requiresAuth: true,
      highlight: true,
    },
    {
      icon: Calendar,
      label: "My Events",
      path: "/my-events",
      requiresAuth: true,
    },
    {
      icon: User,
      label: "Profile",
      path: "/profile",
      requiresAuth: true,
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/settings",
      requiresAuth: true,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-lg shadow-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[300px] p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="text-xl font-bold">
            What's the Move?
          </SheetTitle>
          {user && (
            <p className="text-sm text-muted-foreground mt-1">
              Welcome, {user.name || user.email}
            </p>
          )}
        </SheetHeader>

        <nav className="flex flex-col h-full">
          <div className="flex-1 py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isDisabled = item.requiresAuth && !user;

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path, item.requiresAuth)}
                  className={`
                    w-full flex items-center gap-3 px-6 py-3 text-left transition-colors
                    ${item.highlight ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted'}
                    ${isDisabled ? 'opacity-50' : ''}
                  `}
                >
                  <Icon className={`h-5 w-5 ${item.highlight ? 'text-primary' : ''}`} />
                  <span className={`${item.highlight ? 'font-semibold text-primary' : ''}`}>
                    {item.label}
                  </span>
                  {item.requiresAuth && !user && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Sign in
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Auth section */}
          <div className="border-t p-4">
            {user ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            ) : (
              <Button
                className="w-full justify-start gap-3"
                onClick={() => handleNavigation("/register", false)}
              >
                <LogIn className="h-5 w-5" />
                Sign In / Register
              </Button>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}