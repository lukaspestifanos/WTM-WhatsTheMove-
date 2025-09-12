import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, setupAuth } from "./auth";
// Removed conflicting JWT auth system
import { insertEventSchema, insertRsvpSchema, insertFavoriteSchema, insertCommentSchema, insertMediaSchema } from "@shared/schema";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { ticketmasterService } from "./services/ticketmaster";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Rate limiting middleware
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Limit search requests to 30 per minute
    message: 'Too many search requests, please try again later.',
  });

  // Basic middleware
  app.use(limiter);
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(cookieParser());

  // Setup Passport authentication system 
  setupAuth(app);

  // User profile routes (protected)
  app.get('/api/user/profile', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User ID not found' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Remove sensitive data
      const { password, ...userProfile } = user;
      res.json(userProfile);
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  });

  app.put('/api/user/profile', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User ID not found' });
      }

      const updateData = req.body;
      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updateData.password;
      delete updateData.id;
      delete updateData.createdAt;

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Remove sensitive data
      const { password, ...userProfile } = updatedUser;
      res.json(userProfile);
    } catch (error) {
      console.error('Update user profile error:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });

  // Events routes (public access)
  app.get("/api/events/search", searchLimiter, async (req, res) => {
    try {
      const { lat, lng, radius = 50, category, keyword, startDate, endDate } = req.query;

      const events = [];

      // Get events from multiple sources
      if (lat && lng) {
        // Ticketmaster events
        try {
          console.log(`Searching Ticketmaster for events near ${lat}, ${lng} with category: ${category}`);
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
          console.log(`Found ${ticketmasterEvents.length} Ticketmaster events`);
          events.push(...ticketmasterEvents);
        } catch (error) {
          console.error("Ticketmaster API error:", error);
        }

        // Meetup events (disabled for now)
        // try {
        //   const meetupEvents = await meetupService.searchEventsByLocation(
        //     parseFloat(lat as string),
        //     parseFloat(lng as string),
        //     parseInt(radius as string),
        //     {
        //       keyword: keyword as string,
        //       startDate: startDate as string,
        //       endDate: endDate as string,
        //     }
        //   );
        //   events.push(...meetupEvents);
        // } catch (error) {
        //   console.error("Meetup API error:", error);
        // }

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
        console.log(`Found ${userEvents.length} user events`);
        events.push(...userEvents);
      }

      // Final safeguard: Filter out any past events that might have slipped through
      const now = new Date();
      let filteredEvents = events.filter(event => {
        try {
          const eventDate = new Date(event.startDate);
          return eventDate > now;
        } catch (error) {
          console.warn(`Invalid date format for event ${event.id}: ${event.startDate}`);
          return false; // If date parsing fails, exclude the event
        }
      });

      // For authenticated users, add favorite status and sort favorites first
      if ((req as any).userId) {
        const userId = (req as any).userId;

        // Add favorite status to each event
        const eventsWithFavorites = await Promise.all(
          filteredEvents.map(async (event) => {
            const isFavorited = await storage.isFavorited(
              userId, 
              event.id, 
              event.externalSource
            );
            return {
              ...event,
              isFavorited
            };
          })
        );

        // Sort favorites first, then by start date
        eventsWithFavorites.sort((a, b) => {
          // Favorites first
          if (a.isFavorited && !b.isFavorited) return -1;
          if (!a.isFavorited && b.isFavorited) return 1;

          // Then by start date
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        filteredEvents = eventsWithFavorites;
      }

      console.log(`Total events found: ${events.length}`);
      console.log(`Events after filtering past dates: ${filteredEvents.length}`);
      res.json({ events: filteredEvents });
    } catch (error) {
      console.error("Error searching events:", error);
      res.status(500).json({ message: "Failed to search events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      // First try to get from database (user-created events)
      const event = await storage.getEvent(req.params.id);
      if (event) {
        return res.json(event);
      }

      // If not found in database, try to get from external sources
      // For now, return a standard "external event" response
      // In a real app, we'd cache external events or fetch from their APIs
      const externalEventPlaceholder = {
        id: req.params.id,
        title: "Event Details",
        description: "This event is managed by an external provider. Please check the original source for complete details.",
        category: "external",
        startDate: new Date().toISOString(),
        location: "External Event",
        isExternal: true,
      };

      res.json(externalEventPlaceholder);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Create payment intent for event hosting fee
  app.post("/api/create-event-payment", requireAuth, async (req: any, res) => {
    try {
      const PLATFORM_FEE = 5.00; // $5 platform fee for hosting events

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(PLATFORM_FEE * 100), // Convert to cents
        currency: "usd",
        metadata: {
          type: "event_hosting_fee",
          userId: (req as any).userId,
        },
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        platformFee: PLATFORM_FEE
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post("/api/events", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { stripePaymentIntentId, ...eventBody } = req.body;

      // Verify payment if paymentIntentId is provided
      let isPaid = false;
      let platformFee = 0;

      if (stripePaymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
          if (paymentIntent.status === 'succeeded' && paymentIntent.metadata?.userId === userId) {
            isPaid = true;
            platformFee = paymentIntent.amount / 100; // Convert from cents
          }
        } catch (error) {
          console.error("Error verifying payment:", error);
          return res.status(400).json({ message: "Invalid payment" });
        }
      }

      // Transform the event data to ensure proper types
      const eventData = insertEventSchema.parse({
        ...eventBody,
        hostId: userId,
        isPaid,
        platformFee,
        stripePaymentIntentId,
        startDate: new Date(eventBody.startDate), // Ensure it's a Date object
        endDate: eventBody.endDate ? new Date(eventBody.endDate) : null,
        price: Number(eventBody.price) || 0,
        maxAttendees: eventBody.maxAttendees ? Number(eventBody.maxAttendees) : null,
      });

      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      console.error("Full error details:", JSON.stringify(error, null, 2));
      console.error("Event body received:", req.body);

      if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
        console.error("Zod validation errors:", (error as any).errors);
        return res.status(400).json({ message: "Invalid event data", errors: (error as any).errors });
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

  // Guest RSVP route (no authentication required)
  app.post("/api/events/:id/rsvp/guest", async (req, res) => {
    try {
      const { guestName, guestEmail, guestAddress, status } = req.body;

      if (!guestName || !guestEmail) {
        return res.status(400).json({ message: "Guest name and email are required" });
      }

      const rsvpData = insertRsvpSchema.parse({
        eventId: req.params.id,
        guestName,
        guestEmail,
        guestAddress,
        status: status || "attending",
      });

      const rsvp = await storage.createGuestRsvp(rsvpData);
      res.json(rsvp);
    } catch (error) {
      console.error("Error creating guest RSVP:", error);
      if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid RSVP data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to create guest RSVP" });
    }
  });

  app.post("/api/events/:id/rsvp", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const rsvpData = insertRsvpSchema.parse({
        eventId: req.params.id,
        userId,
        status: req.body.status || "attending",
      });

      const rsvp = await storage.createOrUpdateRsvp(rsvpData);
      res.json(rsvp);
    } catch (error) {
      console.error("Error creating RSVP:", error);
      if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid RSVP data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to create RSVP" });
    }
  });

  app.get("/api/user/events", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const events = await storage.getUserEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching user events:", error);
      res.status(500).json({ message: "Failed to fetch user events" });
    }
  });

  // Comments routes
  app.get("/api/events/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getEventComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Guest comment route (no authentication required)
  app.post("/api/events/:id/comments/guest", async (req, res) => {
    try {
      const { guestName, guestEmail, content } = req.body;

      if (!guestName || !guestEmail || !content) {
        return res.status(400).json({ message: "Guest name, email, and content are required" });
      }

      const commentData = insertCommentSchema.parse({
        eventId: req.params.id,
        guestName,
        guestEmail,
        content,
      });

      const comment = await storage.createComment(commentData);
      res.json(comment);
    } catch (error) {
      console.error("Error creating guest comment:", error);
      if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid comment data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to create guest comment" });
    }
  });

  app.post("/api/events/:id/comments", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const commentData = insertCommentSchema.parse({
        eventId: req.params.id,
        userId,
        content: req.body.content,
      });

      const comment = await storage.createComment(commentData);
      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid comment data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Media routes
  app.get("/api/events/:id/media", async (req, res) => {
    try {
      const media = await storage.getEventMedia(req.params.id);
      res.json(media);
    } catch (error) {
      console.error("Error fetching event media:", error);
      res.status(500).json({ message: "Failed to fetch event media" });
    }
  });

  app.get("/api/comments/:id/media", async (req, res) => {
    try {
      const media = await storage.getCommentMedia(req.params.id);
      res.json(media);
    } catch (error) {
      console.error("Error fetching comment media:", error);
      res.status(500).json({ message: "Failed to fetch comment media" });
    }
  });

  // Object storage routes for media uploads
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Serve uploaded objects
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Guest media upload route (no authentication required)
  app.post("/api/media/guest", async (req, res) => {
    try {
      const { guestName, guestEmail, eventId, commentId, type, url, filename, fileSize } = req.body;

      if (!guestName || !guestEmail || !type || !url) {
        return res.status(400).json({ message: "Guest name, email, type, and URL are required" });
      }

      const objectStorageService = new ObjectStorageService();
      const normalizedUrl = objectStorageService.normalizeObjectEntityPath(url);

      const mediaData = insertMediaSchema.parse({
        eventId,
        commentId,
        guestName,
        guestEmail,
        type,
        url: normalizedUrl,
        filename,
        fileSize,
      });

      const media = await storage.createMedia(mediaData);
      res.json(media);
    } catch (error) {
      console.error("Error creating guest media:", error);
      if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid media data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to create guest media" });
    }
  });

  app.post("/api/media", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { eventId, commentId, type, url, filename, fileSize } = req.body;

      const objectStorageService = new ObjectStorageService();
      const normalizedUrl = objectStorageService.normalizeObjectEntityPath(url);

      const mediaData = insertMediaSchema.parse({
        eventId,
        commentId,
        userId,
        type,
        url: normalizedUrl,
        filename,
        fileSize,
      });

      const media = await storage.createMedia(mediaData);
      res.json(media);
    } catch (error) {
      console.error("Error creating media:", error);
      if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid media data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to create media" });
    }
  });

  // Favorites endpoints
  app.post("/api/events/:id/favorite", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const eventId = req.params.id;
      const { externalSource } = req.body;

      const favoriteData = insertFavoriteSchema.parse({
        userId,
        eventId,
        externalSource,
      });

      const favorite = await storage.addFavorite(favoriteData);
      res.json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid favorite data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete("/api/events/:id/favorite", requireAuth, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const eventId = req.params.id;
      const { externalSource } = req.query;

      await storage.removeFavorite(userId, eventId, externalSource as string);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.get("/api/user/favorites", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching user favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  // Push notification endpoints
  app.post("/api/notifications/subscribe", async (req, res) => {
    try {
      const subscription = req.body;
      console.log('New push subscription:', subscription);

      // In a real app, store subscription in database with user ID
      // For now, just acknowledge the subscription
      res.status(200).json({ message: "Subscription received" });
    } catch (error) {
      console.error("Error storing subscription:", error);
      res.status(500).json({ message: "Failed to store subscription" });
    }
  });

  app.post("/api/notifications/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      console.log('Unsubscribe request for endpoint:', endpoint);

      // In a real app, remove subscription from database
      res.status(200).json({ message: "Unsubscribed successfully" });
    } catch (error) {
      console.error("Error unsubscribing:", error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  app.post("/api/notifications/send-test", async (req, res) => {
    try {
      // In a real app, send actual push notification using web-push library
      console.log('Test notification requested');

      // Simulate sending notification
      setTimeout(() => {
        console.log('Test notification would be sent now');
      }, 1000);

      res.status(200).json({ message: "Test notification sent" });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });

  // This GET /api endpoint was previously causing a 404 and contributing to runaway polling
  app.get("/api", (req, res) => {
    res.json({ message: "What's the Move API is running!" });
  });

  app.head("/api", (req, res) => {
    res.status(200).end();
  });

  const httpServer = createServer(app);
  return httpServer;
}