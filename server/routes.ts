import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEventSchema, insertRsvpSchema } from "@shared/schema";
import { ticketmasterService } from "./services/ticketmaster";
import { meetupService } from "./services/meetup";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Events routes
  app.get("/api/events/search", async (req, res) => {
    try {
      const { lat, lng, radius = 50, category, keyword, startDate, endDate } = req.query;
      
      const events = [];
      
      // Get events from multiple sources
      if (lat && lng) {
        // Ticketmaster events
        try {
          const ticketmasterEvents = await ticketmasterService.searchEventsByLocation(
            parseFloat(lat as string),
            parseFloat(lng as string),
            parseInt(radius as string),
            {
              keyword: keyword as string,
              startDate: startDate as string,
              endDate: endDate as string,
              category: category as string,
            }
          );
          events.push(...ticketmasterEvents);
        } catch (error) {
          console.error("Ticketmaster API error:", error);
        }

        // Meetup events
        try {
          const meetupEvents = await meetupService.searchEventsByLocation(
            parseFloat(lat as string),
            parseFloat(lng as string),
            parseInt(radius as string),
            {
              keyword: keyword as string,
              startDate: startDate as string,
              endDate: endDate as string,
            }
          );
          events.push(...meetupEvents);
        } catch (error) {
          console.error("Meetup API error:", error);
        }

        // User-generated events
        const userEvents = await storage.searchEventsByLocation(
          parseFloat(lat as string),
          parseFloat(lng as string),
          parseInt(radius as string),
          {
            category: category as string,
            startDate: startDate as string,
            endDate: endDate as string,
          }
        );
        events.push(...userEvents);
      }

      res.json({ events });
    } catch (error) {
      console.error("Error searching events:", error);
      res.status(500).json({ message: "Failed to search events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventData = insertEventSchema.parse({
        ...req.body,
        hostId: userId,
      });
      
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get("/api/events/:id/rsvps", async (req, res) => {
    try {
      const rsvps = await storage.getEventRsvps(req.params.id);
      res.json(rsvps);
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
      res.status(500).json({ message: "Failed to fetch RSVPs" });
    }
  });

  app.post("/api/events/:id/rsvp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rsvpData = insertRsvpSchema.parse({
        eventId: req.params.id,
        userId,
        status: req.body.status || "attending",
      });
      
      const rsvp = await storage.createOrUpdateRsvp(rsvpData);
      res.json(rsvp);
    } catch (error) {
      console.error("Error creating RSVP:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid RSVP data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create RSVP" });
    }
  });

  app.get("/api/user/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getUserEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching user events:", error);
      res.status(500).json({ message: "Failed to fetch user events" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
