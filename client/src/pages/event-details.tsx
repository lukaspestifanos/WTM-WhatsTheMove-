import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export default function EventDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["/api/events", id],
    enabled: !!id,
  });

  const { data: rsvps } = useQuery({
    queryKey: ["/api/events", id, "rsvps"],
    enabled: !!id,
  });

  const rsvpMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("POST", `/api/events/${id}/rsvp`, { status });
    },
    onSuccess: () => {
      toast({
        title: "RSVP Updated",
        description: "Your RSVP has been updated!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "rsvps"] });
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
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      parties: "bg-gradient-to-r from-pink-500 to-rose-600 text-white",
      study: "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
      sports: "bg-gradient-to-r from-amber-500 to-orange-600 text-white",
      concerts: "bg-gradient-to-r from-purple-500 to-violet-600 text-white",
      social: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white",
    };
    return colors[category as keyof typeof colors] || colors.social;
  };

  const handleRsvp = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to RSVP",
        variant: "destructive",
      });
      return;
    }
    rsvpMutation.mutate("attending");
  };

  const handleShare = async () => {
    if (navigator.share && event) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback to copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Event link copied to clipboard!",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <i className="fas fa-calendar-times text-4xl text-muted-foreground mb-4"></i>
            <p className="text-lg font-medium text-foreground mb-2">Event not found</p>
            <p className="text-muted-foreground mb-4">This event may have been deleted or moved.</p>
            <Button onClick={() => setLocation("/")} data-testid="button-back-home">
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const attendeeCount = rsvps?.filter((rsvp: any) => rsvp.status === "attending").length || 0;
  const userRsvp = rsvps?.find((rsvp: any) => rsvp.userId === user?.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative">
        {event.imageUrl ? (
          <img 
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-64 object-cover"
            data-testid="img-event-hero"
          />
        ) : (
          <div className="w-full h-64 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <i className="fas fa-calendar-alt text-white text-6xl opacity-50"></i>
          </div>
        )}
        
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setLocation("/")}
          className="absolute top-4 left-4 rounded-full w-10 h-10 p-0 bg-white/90 backdrop-blur-sm"
          data-testid="button-back"
        >
          <i className="fas fa-arrow-left"></i>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleShare}
          className="absolute top-4 right-4 rounded-full w-10 h-10 p-0 bg-white/90 backdrop-blur-sm"
          data-testid="button-share"
        >
          <i className="fas fa-share-alt"></i>
        </Button>
      </div>

      {/* Event Info */}
      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold text-foreground flex-1 mr-4" data-testid="text-event-title">
              {event.title}
            </h1>
            <Badge className={`${getCategoryColor(event.category)} px-3 py-1 rounded-full font-medium`}>
              {event.category.toUpperCase()}
            </Badge>
          </div>

          {event.description && (
            <p className="text-muted-foreground text-lg leading-relaxed" data-testid="text-event-description">
              {event.description}
            </p>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <i className="fas fa-clock text-blue-600"></i>
            </div>
            <div>
              <p className="font-medium text-foreground" data-testid="text-event-date">
                {new Date(event.startDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-muted-foreground" data-testid="text-event-time">
                {new Date(event.startDate).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <i className="fas fa-map-marker-alt text-green-600"></i>
            </div>
            <div>
              <p className="font-medium text-foreground" data-testid="text-event-venue">
                {event.venueName || event.location}
              </p>
              <p className="text-muted-foreground" data-testid="text-event-location">
                {event.location}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <i className="fas fa-users text-purple-600"></i>
            </div>
            <div>
              <p className="font-medium text-foreground" data-testid="text-attendee-count">
                {attendeeCount} attending
              </p>
              {event.maxAttendees && (
                <p className="text-muted-foreground">
                  {event.maxAttendees - attendeeCount} spots left
                </p>
              )}
            </div>
          </div>

          {event.price !== undefined && event.price > 0 && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <i className="fas fa-dollar-sign text-yellow-600"></i>
              </div>
              <div>
                <p className="font-medium text-foreground" data-testid="text-event-price">
                  ${event.price}
                </p>
                <p className="text-muted-foreground">Per person</p>
              </div>
            </div>
          )}
        </div>

        {/* RSVP Section */}
        <div className="space-y-4">
          {event.externalSource && event.url ? (
            <Button 
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-lg shadow-lg"
              onClick={() => window.open(event.url, "_blank")}
              data-testid="button-external-tickets"
            >
              {event.price && event.price > 0 ? `Get Tickets $${event.price}` : "Get Tickets"}
              <i className="fas fa-external-link-alt ml-2"></i>
            </Button>
          ) : (
            <div className="flex space-x-3">
              <Button 
                onClick={handleRsvp}
                disabled={rsvpMutation.isPending}
                className="flex-1 bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-lg shadow-lg"
                data-testid="button-rsvp"
              >
                {rsvpMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    RSVPing...
                  </>
                ) : userRsvp ? (
                  "✓ You're Going"
                ) : event.price && event.price > 0 ? (
                  `RSVP $${event.price}`
                ) : (
                  "RSVP Free"
                )}
              </Button>
              
              <Button
                variant="secondary"
                onClick={handleShare}
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                data-testid="button-share-event"
              >
                <i className="fas fa-share-alt"></i>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
