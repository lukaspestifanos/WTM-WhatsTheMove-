import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import MapView from "@/components/map-view";
import EventCard from "@/components/event-card";
import BottomNavigation from "@/components/bottom-navigation";
import CategoryFilters from "@/components/category-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";

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
  imageUrl?: string;
  venueName?: string;
  hostName?: string;
  attendeeCount?: number;
  externalSource?: string;
  url?: string;
}

export default function Home() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showEventList, setShowEventList] = useState(true);

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Location error:", error);
          toast({
            title: "Location Access",
            description: "Please enable location access for better event recommendations",
            variant: "destructive",
          });
          // Default to UC Berkeley coordinates
          setUserLocation({ lat: 37.8719, lng: -122.2585 });
        }
      );
    }
  }, [toast]);

  // Fetch events based on location
  const { data: eventsData, isLoading: eventsLoading, error } = useQuery({
    queryKey: ["/api/events/search", userLocation?.lat, userLocation?.lng, activeCategory, searchQuery],
    enabled: !!userLocation,
    retry: 3,
    queryFn: async () => {
      const params = new URLSearchParams({
        lat: userLocation?.lat.toString() || '',
        lng: userLocation?.lng.toString() || '',
        radius: '50',
      });
      
      if (activeCategory) {
        params.append('category', activeCategory);
      }
      
      if (searchQuery) {
        params.append('keyword', searchQuery);
      }
      
      const response = await fetch(`/api/events/search?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Frontend received events:', data.events?.length || 0);
      return data;
    },
  });

  const events = eventsData?.events || [];
  console.log('Events being displayed:', events.length);

  const handleCreateEvent = () => {
    setLocation("/create-event");
  };

  const handleCenterOnLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Unable to get your current location",
            variant: "destructive",
          });
        }
      );
    }
  };

  // Remove loading check since we don't need authentication

  return (
    <div className="relative w-full h-screen max-w-sm mx-auto bg-background shadow-2xl overflow-hidden">
      {/* Map View */}
      <div className="relative w-full h-2/3">
        <MapView 
          userLocation={userLocation}
          events={events}
          onEventClick={(eventId) => setLocation(`/events/${eventId}`)}
        />
        
        {/* Floating Search Bar */}
        <Card className="absolute top-12 left-4 right-4 bg-white/95 backdrop-blur-lg border-white/30 shadow-lg">
          <div className="flex items-center space-x-3 p-4">
            <i className="fas fa-search text-muted-foreground"></i>
            <Input 
              type="text"
              placeholder="Search events near campus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-none bg-transparent focus:ring-0"
              data-testid="input-search"
            />
            <Button 
              variant="ghost" 
              size="sm"
              className="text-primary p-0 w-8 h-8"
              data-testid="button-filters"
            >
              <i className="fas fa-sliders-h"></i>
            </Button>
          </div>
        </Card>
        
        {/* Current Location Button */}
        <Button
          onClick={handleCenterOnLocation}
          className="absolute bottom-6 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-primary p-0"
          data-testid="button-location"
        >
          <i className="fas fa-location-arrow"></i>
        </Button>
      </div>

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/98 to-white/95 backdrop-blur-lg border-t border-black/10 rounded-t-3xl overflow-hidden">
        {/* Sheet Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
        </div>
        
        {/* Sheet Header */}
        <div className="px-6 pb-4">
          <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-page-title">
            What's the Move?
          </h2>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span data-testid="text-event-count">
              {eventsLoading ? "Loading..." : `${events.length} events`}
            </span>
            <span data-testid="text-location-name">
              {userLocation ? "Near your location" : "Location unavailable"}
            </span>
          </div>
        </div>
        
        {/* Category Filters */}
        <CategoryFilters 
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        
        {/* Event List */}
        <div className="flex-1 overflow-y-auto px-6">
          {eventsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8" data-testid="text-no-events">
              <i className="fas fa-calendar-times text-4xl text-muted-foreground mb-4"></i>
              <p className="text-lg font-medium text-foreground mb-2">No events found</p>
              <p className="text-muted-foreground">Try adjusting your filters or create a new event</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event: Event) => (
                <EventCard 
                  key={event.id}
                  event={event}
                  onEventClick={(eventId) => setLocation(`/events/${eventId}`)}
                />
              ))}
            </div>
          )}
          <div className="h-24"></div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={handleCreateEvent}
        className="fixed bottom-20 right-4 w-16 h-16 bg-primary text-primary-foreground rounded-2xl shadow-xl p-0 text-xl"
        data-testid="button-create-event"
      >
        <i className="fas fa-plus"></i>
      </Button>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
