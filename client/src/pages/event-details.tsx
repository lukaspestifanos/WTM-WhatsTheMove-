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
import { useState } from "react";
import { VideoUploader } from "@/components/VideoUploader";

export default function EventDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showGuestRsvp, setShowGuestRsvp] = useState(false);
  const [showGuestComment, setShowGuestComment] = useState(false);
  const [guestRsvpData, setGuestRsvpData] = useState({
    guestName: "",
    guestEmail: "",
    guestAddress: "",
  });
  const [guestCommentData, setGuestCommentData] = useState({
    guestName: "",
    guestEmail: "",
    content: "",
  });

  // Try to get event from search cache first, then fetch if not available
  const { data: event, isLoading, error } = useQuery({
    queryKey: ["/api/events", id],
    enabled: !!id,
    queryFn: async () => {
      // First check if we have this event in our search results cache
      const searchCache = queryClient.getQueryData(["/api/events/search"]);
      const cachedEvent = searchCache?.events?.find((e: any) => e.id === id);
      
      if (cachedEvent) {
        console.log('Using cached event data for', id);
        return cachedEvent;
      }
      
      // If not in cache, fetch from API
      console.log('Fetching event data from API for', id);
      const response = await fetch(`/api/events/${id}`);
      if (!response.ok) {
        throw new Error('Event not found');
      }
      return response.json();
    }
  });

  const { data: rsvps } = useQuery({
    queryKey: ["/api/events", id, "rsvps"],
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ["/api/events", id, "comments"],
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

  const guestRsvpMutation = useMutation({
    mutationFn: async (data: typeof guestRsvpData) => {
      return await apiRequest("POST", `/api/events/${id}/rsvp/guest`, data);
    },
    onSuccess: () => {
      toast({
        title: "RSVP Submitted",
        description: "Thank you for your RSVP!",
      });
      setShowGuestRsvp(false);
      setGuestRsvpData({ guestName: "", guestEmail: "", guestAddress: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "rsvps"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit RSVP. Please try again.",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isAuthenticated) {
        return await apiRequest("POST", `/api/events/${id}/comments`, { content: data.content });
      } else {
        return await apiRequest("POST", `/api/events/${id}/comments/guest`, data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Comment Added",
        description: "Your comment has been posted!",
      });
      setShowGuestComment(false);
      setGuestCommentData({ guestName: "", guestEmail: "", content: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "comments"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
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
      setShowGuestRsvp(true);
      return;
    }
    rsvpMutation.mutate("attending");
  };

  const handleGuestRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestRsvpData.guestName || !guestRsvpData.guestEmail) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name and email",
        variant: "destructive",
      });
      return;
    }
    guestRsvpMutation.mutate({ ...guestRsvpData, status: "attending" } as any);
  };

  const handleGuestCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestCommentData.guestName || !guestCommentData.guestEmail || !guestCommentData.content) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    commentMutation.mutate(guestCommentData);
  };

  const handleShare = async () => {
    if (navigator.share && event) {
      try {
        await navigator.share({
          title: (event as any).title,
          text: (event as any).description,
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

  const attendeeCount = (rsvps as any)?.filter((rsvp: any) => rsvp.status === "attending").length || 0;
  const userRsvp = (rsvps as any)?.find((rsvp: any) => rsvp.userId === (user as any)?.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative">
        {(event as any).imageUrl ? (
          <img 
            src={(event as any).imageUrl}
            alt={(event as any).title}
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
              {(event as any).title}
            </h1>
            <Badge className={`${getCategoryColor((event as any).category)} px-3 py-1 rounded-full font-medium`}>
              {(event as any).category.toUpperCase()}
            </Badge>
          </div>

          {(event as any).description && (
            <p className="text-muted-foreground text-lg leading-relaxed" data-testid="text-event-description">
              {(event as any).description}
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
                {new Date((event as any).startDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-muted-foreground" data-testid="text-event-time">
                {new Date((event as any).startDate).toLocaleTimeString("en-US", {
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
                {(event as any).venueName || (event as any).location}
              </p>
              <p className="text-muted-foreground" data-testid="text-event-location">
                {(event as any).location}
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
              {(event as any).maxAttendees && (
                <p className="text-muted-foreground">
                  {(event as any).maxAttendees - attendeeCount} spots left
                </p>
              )}
            </div>
          </div>

          {(event as any).price !== undefined && (event as any).price > 0 && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <i className="fas fa-dollar-sign text-yellow-600"></i>
              </div>
              <div>
                <p className="font-medium text-foreground" data-testid="text-event-price">
                  ${(event as any).price}
                </p>
                <p className="text-muted-foreground">Per person</p>
              </div>
            </div>
          )}
        </div>

        {/* RSVP Section */}
        <div className="space-y-4">
          {(event as any).externalSource && (event as any).url ? (
            <Button 
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-lg shadow-lg"
              onClick={() => window.open((event as any).url, "_blank")}
              data-testid="button-external-tickets"
            >
              {(event as any).price && (event as any).price > 0 ? `Get Tickets $${(event as any).price}` : "Get Tickets"}
              <i className="fas fa-external-link-alt ml-2"></i>
            </Button>
          ) : (
            <div className="flex space-x-3">
              <Button 
                onClick={handleRsvp}
                disabled={rsvpMutation.isPending || guestRsvpMutation.isPending}
                className="flex-1 bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-lg shadow-lg"
                data-testid="button-rsvp"
              >
                {(rsvpMutation.isPending || guestRsvpMutation.isPending) ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    RSVPing...
                  </>
                ) : userRsvp ? (
                  "✓ You're Going"
                ) : (event as any).price && (event as any).price > 0 ? (
                  `RSVP $${(event as any).price}`
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

        {/* Guest RSVP Form */}
        {showGuestRsvp && (
          <Card>
            <CardHeader>
              <CardTitle>RSVP as Guest</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGuestRsvpSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="guest-name">Name *</Label>
                  <Input
                    id="guest-name"
                    type="text"
                    value={guestRsvpData.guestName}
                    onChange={(e) => setGuestRsvpData({ ...guestRsvpData, guestName: e.target.value })}
                    placeholder="Your full name"
                    required
                    data-testid="input-guest-name"
                  />
                </div>
                <div>
                  <Label htmlFor="guest-email">Email *</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    value={guestRsvpData.guestEmail}
                    onChange={(e) => setGuestRsvpData({ ...guestRsvpData, guestEmail: e.target.value })}
                    placeholder="your.email@example.com"
                    required
                    data-testid="input-guest-email"
                  />
                </div>
                <div>
                  <Label htmlFor="guest-address">Address</Label>
                  <Input
                    id="guest-address"
                    type="text"
                    value={guestRsvpData.guestAddress}
                    onChange={(e) => setGuestRsvpData({ ...guestRsvpData, guestAddress: e.target.value })}
                    placeholder="Your address (optional)"
                    data-testid="input-guest-address"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    disabled={guestRsvpMutation.isPending}
                    className="flex-1"
                    data-testid="button-submit-guest-rsvp"
                  >
                    {guestRsvpMutation.isPending ? "Submitting..." : "Submit RSVP"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowGuestRsvp(false)}
                    data-testid="button-cancel-guest-rsvp"
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold" data-testid="text-videos-title">
              Event Videos
            </h2>
          </div>
          
          <VideoUploader
            eventId={id}
            isGuest={!isAuthenticated}
            onUploadComplete={() => {
              // Refresh event media when upload completes
              queryClient.invalidateQueries({ queryKey: ["/api/events", id, "media"] });
            }}
          />
        </div>

        <Separator />

        {/* Comments Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold" data-testid="text-comments-title">
              Comments ({(comments as any)?.length || 0})
            </h2>
            <Button
              variant="outline"
              onClick={() => {
                if (isAuthenticated) {
                  // Handle authenticated comment (you can add a simple form here)
                } else {
                  setShowGuestComment(true);
                }
              }}
              data-testid="button-add-comment"
            >
              <i className="fas fa-comment mr-2"></i>
              Add Comment
            </Button>
          </div>

          {/* Guest Comment Form */}
          {showGuestComment && (
            <Card>
              <CardHeader>
                <CardTitle>Add Comment as Guest</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGuestCommentSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="comment-name">Name *</Label>
                    <Input
                      id="comment-name"
                      type="text"
                      value={guestCommentData.guestName}
                      onChange={(e) => setGuestCommentData({ ...guestCommentData, guestName: e.target.value })}
                      placeholder="Your name"
                      required
                      data-testid="input-comment-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="comment-email">Email *</Label>
                    <Input
                      id="comment-email"
                      type="email"
                      value={guestCommentData.guestEmail}
                      onChange={(e) => setGuestCommentData({ ...guestCommentData, guestEmail: e.target.value })}
                      placeholder="your.email@example.com"
                      required
                      data-testid="input-comment-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="comment-content">Comment *</Label>
                    <Textarea
                      id="comment-content"
                      value={guestCommentData.content}
                      onChange={(e) => setGuestCommentData({ ...guestCommentData, content: e.target.value })}
                      placeholder="Share your thoughts about this event..."
                      required
                      data-testid="textarea-comment-content"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      disabled={commentMutation.isPending}
                      className="flex-1"
                      data-testid="button-submit-comment"
                    >
                      {commentMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowGuestComment(false)}
                      data-testid="button-cancel-comment"
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
            {(comments as any)?.length > 0 ? (
              (comments as any).map((comment: any) => (
                <Card key={comment.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {(comment.guestName || comment.userId || 'A')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-sm" data-testid={`text-comment-author-${comment.id}`}>
                          {comment.guestName || comment.userId || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-foreground" data-testid={`text-comment-content-${comment.id}`}>
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 text-center">
                <i className="fas fa-comments text-2xl text-muted-foreground mb-2"></i>
                <p className="text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
