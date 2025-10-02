import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import InteractiveMap from "@/components/interactive-map";
import EventCard from "@/components/event-card";
import BottomNavigation from "@/components/bottom-navigation";
import CategoryFilters from "@/components/category-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Search, Filter, Navigation } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description?: string;
  category: string;
  startDate: string;
  location: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  minPrice?: number;
  maxPrice?: number;
  imageUrl?: string;
  venueName?: string;
  hostName?: string;
  attendeeCount?: number;
  externalSource?: string;
  url?: string;
  isFavorited?: boolean;
}

export default function Home() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showEventList, setShowEventList] = useState(true);
  const [locationError, setLocationError] = useState(false);

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(false);
        },
        (error) => {
          console.error("Location error:", error);
          setLocationError(true);

          // Default to Cincinnati, Ohio coordinates (user's location from context)
          setUserLocation({ lat: 39.1031, lng: -84.5120 });

          // Only show toast once
          if (!userLocation) {
            toast({
              title: "Location Access",
              description: "Using default location. Enable location access for better results.",
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      // Browser doesn't support geolocation
      setUserLocation({ lat: 39.1031, lng: -84.5120 });
      setLocationError(true);
    }
  }, []); // Remove toast from dependencies to avoid repeated toasts

  // Fetch events based on location
  const { data: eventsData, isLoading: eventsLoading, error, refetch } = useQuery({
    queryKey: ["/api/events/search", userLocation?.lat, userLocation?.lng, activeCategory, searchQuery],
    enabled: !!userLocation,
    retry: 2,
    retryDelay: 1000,
    queryFn: async () => {
      if (!userLocation) {
        throw new Error("Location not available");
      }

      const params = new URLSearchParams({
        lat: userLocation.lat.toString(),
        lng: userLocation.lng.toString(),
        radius: '50',
      });

      if (activeCategory) {
        params.append('category', activeCategory);
      }

      if (searchQuery) {
        params.append('keyword', searchQuery);
      }

      console.log('Fetching events with params:', params.toString());

      const response = await fetch(`/api/events/search?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Events fetch error:', response.status, errorText);
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const data = await response.json();
      console.log('Frontend received events:', data.events?.length || 0);
      return data;
    }
  });

  const events = eventsData?.events || [];


  const handleEventClick = (eventId: string) => {
    // Find the event to get its URL for external links
    const event = events.find((e: Event) => e.id === eventId);
    
    if (event && event.externalSource && event.url) {
      // Open external event link directly (Ticketmaster, etc.)
      window.open(event.url, '_blank', 'noopener,noreferrer');
    } else {
      // For user-created events, navigate to internal event details page
      setLocation(`/events/${eventId}`);
    }
  };

  const handleCenterOnLocation = () => {
    if ("geolocation" in navigator) {
      // Show loading state
      toast({
        title: "Getting location...",
        description: "Please wait",
      });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(false);

          // Refetch events with new location
          refetch();

          toast({
            title: "Location updated",
            description: "Showing events near you",
          });
        },
        (error) => {
          console.error("Location error:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your current location",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      });
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen max-w-sm mx-auto bg-background shadow-2xl overflow-hidden">
      {/* Map View */}
      <div className="relative w-full h-2/3">
        <InteractiveMap 
          userLocation={userLocation}
          events={events}
          onEventClick={handleEventClick}
        />

        {/* Floating Search Bar */}
        <Card className="absolute top-12 left-4 right-4 bg-white/95 backdrop-blur-lg border-white/30 shadow-lg z-20">
          <div className="flex items-center space-x-3 p-4">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input 
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-none bg-transparent focus:ring-0 placeholder:text-muted-foreground/70"
              data-testid="input-search"
            />
            <Button 
              variant="ghost" 
              size="icon"
              className="text-primary hover:bg-primary/10"
              data-testid="button-filters"
            >
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </Card>

        {/* Current Location Button */}
        <Button
          onClick={handleCenterOnLocation}
          className="absolute bottom-6 right-4 w-12 h-12 bg-white hover:bg-gray-50 rounded-full shadow-lg flex items-center justify-center text-primary p-0 z-20 transition-all"
          data-testid="button-location"
        >
          <Navigation className={`w-5 h-5 ${locationError ? 'text-muted-foreground' : 'text-primary'}`} />
        </Button>
      </div>

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/98 to-white/95 backdrop-blur-lg border-t border-black/10 rounded-t-3xl flex flex-col z-10">
        {/* Sheet Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
        </div>

        {/* Sheet Header */}
        <div className="px-6 pb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-foreground mb-1" data-testid="text-page-title">
            What's the Move?
          </h2>
          <p className="text-lg font-medium text-muted-foreground mb-3" data-testid="text-subtitle">
            A Split Concept
          </p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span data-testid="text-event-count">
              {eventsLoading ? "Loading..." : `${events.length} ${events.length === 1 ? 'event' : 'events'}`}
            </span>
            <span data-testid="text-location-name">
              {locationError ? "Using default location" : "Near you"}
            </span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex-shrink-0">
          <CategoryFilters 
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          {eventsLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-muted-foreground">Finding events near you...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8" data-testid="text-error">
              <i className="fas fa-exclamation-triangle text-4xl text-destructive mb-4"></i>
              <p className="text-lg font-medium text-foreground mb-2">Unable to load events</p>
              <p className="text-muted-foreground mb-4">Please check your connection</p>
              <Button 
                onClick={() => refetch()} 
                variant="outline"
                className="mx-auto"
              >
                Try Again
              </Button>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8" data-testid="text-no-events">
              <i className="fas fa-calendar-times text-4xl text-muted-foreground mb-4"></i>
              <p className="text-lg font-medium text-foreground mb-2">No events found</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try a different search" : "Be the first to create an event!"}
              </p>
              {searchQuery && (
                <Button 
                  onClick={() => setSearchQuery("")} 
                  variant="outline"
                  className="mx-auto"
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 pb-24">
              {events.map((event: Event) => (
                <EventCard 
                  key={event.id}
                  event={event}
                  onEventClick={() => handleEventClick(event.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}