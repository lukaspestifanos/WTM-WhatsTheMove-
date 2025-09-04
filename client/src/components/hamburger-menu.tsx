import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Users, Settings, LogOut, LogIn, Home, Calendar, Plus } from "lucide-react";
import type { User as UserType } from "@shared/schema";

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const typedUser = user as UserType | undefined;

  const handleHome = () => {
    setLocation("/");
    setIsOpen(false);
  };

  const handleLogin = () => {
    setLocation("/auth");
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setIsOpen(false);
    } catch (error) {
      // Error handling is done in the mutation
    }
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
      
      <DialogContent className="w-80 h-full max-h-screen p-0 data-[side=left]:slide-in-from-left-0 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <DialogHeader className="mb-6 p-6 pb-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <DialogTitle className="text-left text-xl font-bold">What's the Move?</DialogTitle>
          <DialogDescription className="text-left text-sm text-purple-100">
            Campus event discovery and social features
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 pb-6">
          {/* Big Home Button */}
          <div className="mb-6">
            <Button
              onClick={handleHome}
              className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-lg rounded-xl shadow-lg border-0"
              data-testid="button-home"
            >
              <Home className="mr-3 h-6 w-6" />
              Back to Events
            </Button>
          </div>

          <div className="space-y-4">
            {user ? (
              <>
                {/* User Profile Section */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
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
                    className="w-full justify-start h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    onClick={() => {
                      setLocation("/create-event");
                      setIsOpen(false);
                    }}
                    data-testid="button-create-event"
                  >
                    <Plus className="mr-3 h-5 w-5" />
                    Create Event
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 hover:bg-purple-50 dark:hover:bg-purple-950"
                    onClick={() => {
                      setLocation("/profile");
                      setIsOpen(false);
                    }}
                    data-testid="button-profile"
                  >
                    <User className="mr-3 h-5 w-5" />
                    Profile
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 hover:bg-purple-50 dark:hover:bg-purple-950"
                    onClick={() => {
                      setLocation("/friends");
                      setIsOpen(false);
                    }}
                    data-testid="button-friends"
                  >
                    <Users className="mr-3 h-5 w-5" />
                    Friends
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 hover:bg-purple-50 dark:hover:bg-purple-950"
                    onClick={() => {
                      setLocation("/profile");
                      setIsOpen(false);
                    }}
                    data-testid="button-settings"
                  >
                    <Settings className="mr-3 h-5 w-5" />
                    Account Settings
                  </Button>
                </div>

                {/* Logout */}
                <div className="pt-4 border-t">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Guest Menu */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Browse events as a guest or login for full features
                  </p>
                  <Button 
                    onClick={handleLogin}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    data-testid="button-login"
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Login / Sign Up
                  </Button>
                </div>

                {/* About Section */}
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border-l-4 border-blue-500">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      About What's the Move
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                      Your go-to campus event discovery app! Find parties, concerts, study groups, and social events happening around your college. Browse freely as a guest or create an account to host your own events and connect with friends.
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-2 font-medium">
                      A Split Concept
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}