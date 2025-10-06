import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { useState, useCallback, useMemo } from "react";
import { VideoUploader } from "@/components/VideoUploader";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  ArrowLeft, 
  Share2, 
  ExternalLink,
  MessageCircle,
  Video
} from "lucide-react";

// Types
interface Event {
  id: string;
  title: string;
  description?: string;
  category: string;
  startDate: string;
  location: string;
  venueName?: string;
  maxAttendees?: number;
  price?: number;
  imageUrl?: string;
  externalSource?: string;
  externalId?: string;
  url?: string;
}

interface RSVP {
  id: string;
  userId?: string;
  status: string;
}

interface Comment {
  id: string;
  content: string;
  guestName?: string;
  userId?: string;
  createdAt: string;
}

interface GuestRsvpData {
  guestName: string;
  guestEmail: string;
  guestAddress: string;
}

interface GuestCommentData {
  guestName: string;
  guestEmail: string;
  content: string;
}

// Constants
const CATEGORY_COLORS = {
  parties: "bg-gradient-to-r from-pink-500 to-rose-600 text-white",
  study: "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
  sports: "bg-gradient-to-r from-amber-500 to-orange-600 text-white",
  concerts: "bg-gradient-to-r from-purple-500 to-violet-600 text-white",
  social: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white",
} as const;

const RSVP_STATUS = {
  ATTENDING: "attending",
  NOT_ATTENDING: "not_attending",
  MAYBE: "maybe",
} as const;

export default function EventDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [showGuestRsvp, setShowGuestRsvp] = useState(false);
  const [showGuestComment, setShowGuestComment] = useState(false);
  const [guestRsvpData, setGuestRsvpData] = useState<GuestRsvpData>({
    guestName: "",
    guestEmail: "",
    guestAddress: "",
  });
  const [guestCommentData, setGuestCommentData] = useState<GuestCommentData>({
    guestName: "",
    guestEmail: "",
    content: "",
  });

  // Query for event data with intelligent caching
  const { data: event, isLoading, error } = useQuery({
    queryKey: ["/api/events", id],
    enabled: !!id,
    queryFn: async (): Promise<Event> => {
      // Check cache first for better performance
      const searchCache = queryClient.getQueryData(["/api/events/search"]) as any;
      const cachedEvent = searchCache?.events?.find((e: Event) => e.id === id);

      if (cachedEvent) {
        return cachedEvent;
      }

      // Fetch from API if not cached
      const response = await fetch(`/api/events/${id}`);
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Event not found' : 'Failed to load event');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  // Query for RSVPs
  const { data: rsvps = [] } = useQuery<RSVP[]>({
    queryKey: ["/api/events", id, "rsvps"],
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Query for comments
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/events", id, "comments"],
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Computed values
  const attendeeCount = useMemo(() => 
    rsvps.filter(rsvp => rsvp.status === RSVP_STATUS.ATTENDING).length,
    [rsvps]
  );

  const userRsvp = useMemo(() => 
    rsvps.find(rsvp => rsvp.userId === user?.id),
    [rsvps, user?.id]
  );

  const spotsLeft = useMemo(() => 
    event?.maxAttendees ? event.maxAttendees - attendeeCount : null,
    [event?.maxAttendees, attendeeCount]
  );

  // Utility functions
  const getCategoryColor = useCallback((category: string) => {
    return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.social;
  }, []);

  const formatDateTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  }, []);

  // Mutations
  const rsvpMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("POST", `/api/events/${id}/rsvp`, { status });
    },
    onSuccess: () => {
      toast({
        title: "RSVP Updated",
        description: "Your RSVP has been updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "rsvps"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Authentication Required",
          description: "Please log in to RSVP to this event",
          variant: "destructive",
        });
        setTimeout(() => setLocation("/auth"), 1000);
        return;
      }

      toast({
        title: "RSVP Failed",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    },
  });

  const guestRsvpMutation = useMutation({
    mutationFn: async (data: GuestRsvpData & { status: string }) => {
      return apiRequest("POST", `/api/events/${id}/rsvp/guest`, data);
    },
    onSuccess: () => {
      toast({
        title: "RSVP Submitted",
        description: "Thank you for your RSVP! We'll see you there.",
      });
      setShowGuestRsvp(false);
      setGuestRsvpData({ guestName: "", guestEmail: "", guestAddress: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "rsvps"] });
    },
    onError: () => {
      toast({
        title: "RSVP Failed",
        description: "Failed to submit RSVP. Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (data: GuestCommentData | { content: string }) => {
      const endpoint = isAuthenticated 
        ? `/api/events/${id}/comments`
        : `/api/events/${id}/comments/guest`;
      return apiRequest("POST", endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: "Comment Posted",
        description: "Your comment has been added to the event!",
      });
      setShowGuestComment(false);
      setGuestCommentData({ guestName: "", guestEmail: "", content: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "comments"] });
    },
    onError: () => {
      toast({
        title: "Comment Failed",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleRsvp = useCallback(() => {
    if (!isAuthenticated) {
      setShowGuestRsvp(true);
      return;
    }
    rsvpMutation.mutate(RSVP_STATUS.ATTENDING);
  }, [isAuthenticated, rsvpMutation]);

  const handleGuestRsvpSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!guestRsvpData.guestName.trim() || !guestRsvpData.guestEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both your name and email address",
        variant: "destructive",
      });
      return;
    }

    guestRsvpMutation.mutate({ 
      ...guestRsvpData, 
      guestName: guestRsvpData.guestName.trim(),
      guestEmail: guestRsvpData.guestEmail.trim(),
      status: RSVP_STATUS.ATTENDING 
    });
  }, [guestRsvpData, guestRsvpMutation, toast]);

  const handleGuestCommentSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!guestCommentData.guestName.trim() || 
        !guestCommentData.guestEmail.trim() || 
        !guestCommentData.content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    commentMutation.mutate({
      ...guestCommentData,
      guestName: guestCommentData.guestName.trim(),
      guestEmail: guestCommentData.guestEmail.trim(),
      content: guestCommentData.content.trim(),
    });
  }, [guestCommentData, commentMutation, toast]);

  const handleShare = useCallback(async () => {
    if (!event) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description || `Check out this event: ${event.title}`,
          url: window.location.href,
        });
        return;
      } catch (error) {
        // User cancelled sharing or sharing failed
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error("Native sharing failed:", error);
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Event link copied to your clipboard!",
      });
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Unable to share event link. Please copy it manually from the address bar.",
        variant: "destructive",
      });
    }
  }, [event, toast]);

  const handleAddComment = useCallback(() => {
    if (isAuthenticated) {
      // For authenticated users, you could show an inline comment form
      // For now, just show the guest form
      setShowGuestComment(true);
    } else {
      setShowGuestComment(true);
    }
  }, [isAuthenticated]);

  const handleGetTickets = useCallback(() => {
    if (!event?.url) {
      toast({
        title: "Link Unavailable",
        description: "Ticket link is not available for this event",
        variant: "destructive",
      });
      return;
    }

    // Log for debugging
    console.log('🎫 Opening ticket link:', event.url);
    console.log('🎫 Event source:', event.externalSource);
    console.log('🎫 Event ID:', event.id);
    console.log('🎫 External ID:', event.externalId);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && event.externalSource === 'ticketmaster') {
      // Try to open Ticketmaster mobile app first
      const eventId = event.externalId || event.id;
      const appDeepLink = `tmevent://event?id=${eventId}`;

      console.log('📱 Attempting to open app:', appDeepLink);

      // Try app deep link
      window.location.href = appDeepLink;

      // Fallback to web URL after 1.5 seconds if app doesn't open
      setTimeout(() => {
        console.log('🌐 Fallback to web:', event.url);
        window.open(event.url, '_blank', 'noopener,noreferrer');
      }, 1500);
    } else {
      // Desktop or non-Ticketmaster - just open web URL
      console.log('🌐 Opening web URL:', event.url);
      window.open(event.url, '_blank', 'noopener,noreferrer');
    }
  }, [event, toast]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading event details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <h2 className="text-lg font-semibold mb-2">Event Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This event may have been removed or the link may be incorrect.
              </p>
            </div>
            <Button onClick={() => setLocation("/")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { date, time } = formatDateTime(event.startDate);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        {event.imageUrl ? (
          <img 
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-64 object-cover"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}

        {/* Fallback background */}
        <div className={`w-full h-64 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center ${event.imageUrl ? 'hidden' : ''}`}>
          <Calendar className="text-white text-6xl opacity-50" />
        </div>

        {/* Navigation buttons */}
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setLocation("/")}
            className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white/95"
            aria-label="Go back to events"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={handleShare}
            className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white/95"
            aria-label="Share event"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Event Content */}
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Event Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground flex-1">
              {event.title}
            </h1>
            <Badge className={`${getCategoryColor(event.category)} px-3 py-1 rounded-full font-medium whitespace-nowrap`}>
              {event.category.toUpperCase()}
            </Badge>
          </div>

          {event.description && (
            <p className="text-muted-foreground text-lg leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        {/* Event Details Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-foreground">{date}</p>
              <p className="text-sm text-muted-foreground">{time}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {event.venueName || event.location}
              </p>
              <p className="text-sm text-muted-foreground">{event.location}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {attendeeCount} attending
              </p>
              {spotsLeft !== null && (
                <p className="text-sm text-muted-foreground">
                  {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Event is full'}
                </p>
              )}
            </div>
          </div>

          {event.price !== undefined && event.price > 0 && (
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-800 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">${event.price}</p>
                <p className="text-sm text-muted-foreground">Per person</p>
              </div>
            </div>
          )}
        </div>

        {/* RSVP Section */}
        <div className="space-y-4">
          {event.externalSource && event.url ? (
            <Button 
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow"
              onClick={handleGetTickets}
            >
              {event.price && event.price > 0 ? `Get Tickets - $${event.price}` : "Get Tickets"}
              <ExternalLink className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button 
                onClick={handleRsvp}
                disabled={rsvpMutation.isPending || guestRsvpMutation.isPending || (spotsLeft !== null && spotsLeft <= 0)}
                className="flex-1 bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                {(rsvpMutation.isPending || guestRsvpMutation.isPending) ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    RSVPing...
                  </>
                ) : userRsvp ? (
                  "✓ You're Going"
                ) : spotsLeft !== null && spotsLeft <= 0 ? (
                  "Event Full"
                ) : event.price && event.price > 0 ? (
                  `RSVP - $${event.price}`
                ) : (
                  "RSVP Free"
                )}
              </Button>

              <Button
                variant="secondary"
                onClick={handleShare}
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                aria-label="Share event"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Guest RSVP Form */}
        {showGuestRsvp && (
          <Card>
            <CardHeader>
              <CardTitle>RSVP as Guest</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGuestRsvpSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="guest-name">Full Name *</Label>
                  <Input
                    id="guest-name"
                    type="text"
                    value={guestRsvpData.guestName}
                    onChange={(e) => setGuestRsvpData(prev => ({ ...prev, guestName: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="guest-email">Email Address *</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    value={guestRsvpData.guestEmail}
                    onChange={(e) => setGuestRsvpData(prev => ({ ...prev, guestEmail: e.target.value }))}
                    placeholder="your.email@example.com"
                    required
                    maxLength={320}
                  />
                </div>
                <div>
                  <Label htmlFor="guest-address">Address (Optional)</Label>
                  <Input
                    id="guest-address"
                    type="text"
                    value={guestRsvpData.guestAddress}
                    onChange={(e) => setGuestRsvpData(prev => ({ ...prev, guestAddress: e.target.value }))}
                    placeholder="Your address"
                    maxLength={500}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={guestRsvpMutation.isPending}
                    className="flex-1"
                  >
                    {guestRsvpMutation.isPending ? "Submitting..." : "Submit RSVP"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowGuestRsvp(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Video Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Event Videos</h2>
          </div>

          <VideoUploader
            eventId={id!}
            isGuest={!isAuthenticated}
            onUploadComplete={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/events", id, "media"] });
            }}
          />
        </div>

        <Separator />

        {/* Comments Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <h2 className="text-xl font-semibold">
                Comments ({comments.length})
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={handleAddComment}
              size="sm"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Add Comment
            </Button>
          </div>

          {/* Guest Comment Form */}
          {showGuestComment && (
            <Card>
              <CardHeader>
                <CardTitle>Add Comment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGuestCommentSubmit} className="space-y-4">
                  {!isAuthenticated && (
                    <>
                      <div>
                        <Label htmlFor="comment-name">Name *</Label>
                        <Input
                          id="comment-name"
                          type="text"
                          value={guestCommentData.guestName}
                          onChange={(e) => setGuestCommentData(prev => ({ ...prev, guestName: e.target.value }))}
                          placeholder="Your name"
                          required
                          maxLength={100}
                        />
                      </div>
                      <div>
                        <Label htmlFor="comment-email">Email *</Label>
                        <Input
                          id="comment-email"
                          type="email"
                          value={guestCommentData.guestEmail}
                          onChange={(e) => setGuestCommentData(prev => ({ ...prev, guestEmail: e.target.value }))}
                          placeholder="your.email@example.com"
                          required
                          maxLength={320}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label htmlFor="comment-content">Comment *</Label>
                    <Textarea
                      id="comment-content"
                      value={guestCommentData.content}
                      onChange={(e) => setGuestCommentData(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Share your thoughts about this event..."
                      required
                      maxLength={1000}
                      className="min-h-[100px] resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={commentMutation.isPending}
                      className="flex-1"
                    >
                      {commentMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowGuestComment(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Comments List */}
          <div className="space-y-3">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <Card key={comment.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0">
                      {(comment.guestName || comment.userId || 'A')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {comment.guestName || comment.userId || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground shrink-0">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-foreground break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 text-center">
                <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No comments yet. Be the first to share your thoughts!
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}