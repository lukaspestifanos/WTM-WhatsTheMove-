import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Users, Settings, LogOut, LogIn } from "lucide-react";
import type { User as UserType } from "@shared/schema";

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const typedUser = user as UserType | undefined;

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm border shadow-sm hover:bg-white/95"
          data-testid="button-hamburger-menu"
        >
          <div className="flex flex-col space-y-1">
            <div className="w-4 h-0.5 bg-current"></div>
            <div className="w-4 h-0.5 bg-current"></div>
            <div className="w-4 h-0.5 bg-current"></div>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="w-80 h-full max-h-screen p-6 data-[side=left]:slide-in-from-left-0">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-left">What's the Move?</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isAuthenticated ? (
            <>
              {/* User Profile Section */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                    {typedUser?.firstName?.[0] || typedUser?.email?.[0] || "U"}
                  </div>
                  <div>
                    <p className="font-medium" data-testid="text-user-name">
                      {typedUser?.firstName && typedUser?.lastName 
                        ? `${typedUser.firstName} ${typedUser.lastName}`
                        : typedUser?.email || "User"
                      }
                    </p>
                    {typedUser?.university && (
                      <p className="text-sm text-muted-foreground" data-testid="text-user-university">
                        {typedUser.university}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-profile"
                >
                  <User className="mr-3 h-4 w-4" />
                  Profile
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-friends"
                >
                  <Users className="mr-3 h-4 w-4" />
                  Friends
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-settings"
                >
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </Button>
              </div>

              {/* Logout */}
              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Guest Menu */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  Browse events as a guest or login for full features
                </p>
                <Button 
                  onClick={handleLogin}
                  className="w-full"
                  data-testid="button-login"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Login / Sign Up
                </Button>
              </div>

              {/* Limited Guest Features */}
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-about"
                >
                  About What's the Move
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}