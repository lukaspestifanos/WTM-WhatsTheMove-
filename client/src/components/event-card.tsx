import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Send } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description?: string;
  category: string;
  startDate: string;
  location: string;
  price?: number;
  imageUrl?: string;
  venueName?: string;
  hostName?: string;
  attendeeCount?: number;
  externalSource?: string;
  url?: string;
}

interface EventCardProps {
  event: Event;
  onEventClick: (eventId: string) => void;
}

export default function EventCard({ event, onEventClick }: EventCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getCategoryColor = (category: string) => {
    const colors = {
      parties: "bg-gradient-to-r from-pink-500 to-rose-600 text-white",
      study: "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
      sports: "bg-gradient-to-r from-amber-500 to-orange-600 text-white",
      concerts: "bg-gradient-to-r from-purple-500 to-violet-600 text-white",
      social: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white",
      restaurants: "bg-gradient-to-r from-red-500 to-orange-600 text-white",
      food: "bg-gradient-to-r from-yellow-500 to-red-500 text-white",
      nightlife: "bg-gradient-to-r from-indigo-500 to-purple-600 text-white",
    };
    return colors[category as keyof typeof colors] || colors.social;
  };

  const getCategoryEmoji = (category: string) => {
    const emojis = {
      parties: "🎉",
      study: "📚",
      sports: "🏀",
      concerts: "🎵",
      social: "🍕",
      restaurants: "🍽️",
      food: "🍔",
      nightlife: "🌃",
    };
    return emojis[category as keyof typeof emojis] || "🎉";
  };

  const getDefaultImage = (category: string) => {
    const images = {
      parties: "https://images.unsplash.com/photo-1556035511-3168381ea4d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120",
      study: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120", 
      concerts: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120",
      sports: "https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120",
      social: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120",
      restaurants: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120",
      food: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120",
      nightlife: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120",
    };
    return images[category as keyof typeof images] || images.social;
  };

  const rsvpMutation = useMutation({
    mutationFn: async () => {
      if (event.externalSource && event.url) {
        window.open(event.url, "_blank");
        return;
      }
      return await apiRequest("POST", `/api/events/${event.id}/rsvp`, { status: "attending" });
    },
    onSuccess: () => {
      if (!event.externalSource) {
        toast({
          title: "RSVP Success",
          description: "You've successfully RSVP'd to this event!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/events/search"] });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to RSVP",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to RSVP. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRsvp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to RSVP",
        variant: "destructive",
      });
      return;
    }
    rsvpMutation.mutate();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: event.url || window.location.href,
      });
    } else {
      navigator.clipboard.writeText(event.url || window.location.href);
      toast({
        title: "Link Copied",
        description: "Event link copied to clipboard!",
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) {
      return `Today, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
    } else if (isTomorrow) {
      return `Tomorrow, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
    } else {
      return `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
    }
  };

  const handleCardClick = () => {
    // For external events (Ticketmaster), redirect to their website
    if (event.externalSource && event.url) {
      window.open(event.url, "_blank");
      return;
    }
    // For user events, go to event details page
    onEventClick(event.id);
  };

  return (
    <Card 
      className="bg-white/90 backdrop-blur-lg border-white/20 p-4 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
      onClick={handleCardClick}
      data-testid={`card-event-${event.id}`}
    >
      <div className="flex space-x-4">
        <img 
          src={event.imageUrl || getDefaultImage(event.category)}
          alt={event.title}
          className="w-16 h-16 rounded-xl object-cover"
          data-testid={`img-event-${event.id}`}
        />
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-foreground text-lg line-clamp-1" data-testid={`text-title-${event.id}`}>
              {event.title}
            </h3>
            <Badge className={`${getCategoryColor(event.category)} px-2 py-1 rounded-full text-xs font-medium ml-2`}>
              {event.category.toUpperCase()}
            </Badge>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <i className="fas fa-clock text-xs"></i>
              <span data-testid={`text-time-${event.id}`}>
                {formatTime(event.startDate)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-map-marker-alt text-xs"></i>
              <span className="line-clamp-1" data-testid={`text-location-${event.id}`}>
                {event.venueName || event.location}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-users text-xs"></i>
              <span data-testid={`text-attendees-${event.id}`}>
                {event.attendeeCount || 0} going
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <Button 
          onClick={handleRsvp}
          disabled={rsvpMutation.isPending}
          className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold mr-3 shadow-lg"
          data-testid={`button-rsvp-${event.id}`}
        >
          {rsvpMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Loading...
            </>
          ) : event.externalSource ? (
            event.price && event.price > 0 ? `Get Tickets $${event.price}` : "Get Tickets"
          ) : (
            event.price && event.price > 0 ? `RSVP $${event.price}` : "RSVP Free"
          )}
        </Button>
        <Button 
          onClick={handleShare}
          variant="secondary"
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          data-testid={`button-share-${event.id}`}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
