import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import EventCard from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

export default function MyEvents() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"hosting" | "attending">("hosting");

  // For now, return empty arrays since we don't have authentication
  const { data: hostingEvents = [], isLoading: hostingLoading } = useQuery({
    queryKey: ["/api/user/events"],
    enabled: false, // Disable since we don't have auth
  });

  const { data: attendingEvents = [], isLoading: attendingLoading } = useQuery({
    queryKey: ["/api/user/attending"],
    enabled: false, // Disable since we don't have auth
  });

  const handleCreateEvent = () => {
    setLocation("/create-event");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
          My Events
        </h1>
        <Button
          onClick={handleCreateEvent}
          className="bg-primary text-primary-foreground rounded-xl"
          data-testid="button-create-event"
        >
          <i className="fas fa-plus mr-2"></i>
          Create Event
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("hosting")}
          className={`flex-1 py-4 text-center font-medium ${
            activeTab === "hosting"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
          data-testid="tab-hosting"
        >
          Hosting ({hostingEvents.length})
        </button>
        <button
          onClick={() => setActiveTab("attending")}
          className={`flex-1 py-4 text-center font-medium ${
            activeTab === "attending"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
          data-testid="tab-attending"
        >
          Attending ({attendingEvents.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        {activeTab === "hosting" ? (
          hostingLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : hostingEvents.length === 0 ? (
            <div className="text-center py-12" data-testid="text-no-hosting-events">
              <i className="fas fa-calendar-plus text-4xl text-muted-foreground mb-4"></i>
              <p className="text-lg font-medium text-foreground mb-2">No events hosted yet</p>
              <p className="text-muted-foreground mb-6">Create your first event to get started!</p>
              <Button
                onClick={handleCreateEvent}
                className="bg-primary text-primary-foreground rounded-xl"
                data-testid="button-create-first-event"
              >
                Create Your First Event
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {hostingEvents.map((event: Event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEventClick={(eventId) => setLocation(`/events/${eventId}`)}
                />
              ))}
            </div>
          )
        ) : (
          attendingLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : attendingEvents.length === 0 ? (
            <div className="text-center py-12" data-testid="text-no-attending-events">
              <i className="fas fa-calendar-check text-4xl text-muted-foreground mb-4"></i>
              <p className="text-lg font-medium text-foreground mb-2">No events yet</p>
              <p className="text-muted-foreground mb-6">RSVP to events to see them here!</p>
              <Button
                onClick={() => setLocation("/")}
                className="bg-primary text-primary-foreground rounded-xl"
                data-testid="button-discover-events"
              >
                Discover Events
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {attendingEvents.map((event: Event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEventClick={(eventId) => setLocation(`/events/${eventId}`)}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}