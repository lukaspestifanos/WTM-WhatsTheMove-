import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { 
      path: "/", 
      icon: "fas fa-map", 
      label: "Discover", 
      active: location === "/" 
    },
    { 
      path: "/my-events", 
      icon: "fas fa-calendar", 
      label: "My Events", 
      active: location === "/my-events" 
    },
    { 
      path: "/friends", 
      icon: "fas fa-users", 
      label: "Friends", 
      active: location === "/friends" 
    },
    { 
      path: "/profile", 
      icon: "fas fa-user", 
      label: "Profile", 
      active: location === "/profile" 
    },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border h-16">
      <div className="flex items-center h-full px-6">
        {navItems.map((item) => (
          <Button
            key={item.path}
            onClick={() => setLocation(item.path)}
            variant="ghost"
            className={`flex-1 flex flex-col items-center justify-center space-y-1 h-full ${
              item.active ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
          >
            <i className={`${item.icon} text-lg`}></i>
            <span className="text-xs font-medium">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
