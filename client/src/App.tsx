import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import CreateEvent from "@/pages/create-event";
import EventDetails from "@/pages/event-details";
import MyEvents from "@/pages/my-events";
import Friends from "@/pages/friends";
import Profile from "@/pages/profile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create-event" component={CreateEvent} />
      <Route path="/events/:id" component={EventDetails} />
      <Route path="/my-events" component={MyEvents} />
      <Route path="/friends" component={Friends} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <HamburgerMenu />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
