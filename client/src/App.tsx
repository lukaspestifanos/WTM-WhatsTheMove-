import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { AuthProvider } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import CreateEvent from "@/pages/create-event";
import EventDetails from "@/pages/event-details";
import MyEvents from "@/pages/my-events";
import Friends from "@/pages/friends";
import Profile from "@/pages/profile";
import AuthPage from "@/pages/auth";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - accessible by everyone */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/landing" component={Landing} />
      <Route path="/" component={Home} />
      <Route path="/events/:id" component={EventDetails} />
      
      {/* Protected routes - require authentication */}
      {user ? (
        <>
          <Route path="/create-event" component={CreateEvent} />
          <Route path="/my-events" component={MyEvents} />
          <Route path="/friends" component={Friends} />
          <Route path="/profile" component={Profile} />
        </>
      ) : (
        /* Redirect non-authenticated users trying to access protected routes */
        null
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <HamburgerMenu />
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
