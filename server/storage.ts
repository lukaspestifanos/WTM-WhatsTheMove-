import { 
  users, events, rsvps, comments, media,
  type User, type InsertUser, type Event, type InsertEvent, 
  type Rsvp, type InsertRsvp, type Comment, type InsertComment,
  type Media, type InsertMedia 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Event operations
  searchEventsByLocation(lat: number, lng: number, radius: number, options: any): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  getUserEvents(userId: string): Promise<Event[]>;
  
  // RSVP operations
  getEventRsvps(eventId: string): Promise<Rsvp[]>;
  createGuestRsvp(rsvp: InsertRsvp): Promise<Rsvp>;
  createOrUpdateRsvp(rsvp: InsertRsvp): Promise<Rsvp>;
  
  // Comment operations
  getEventComments(eventId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Media operations
  getEventMedia(eventId: string): Promise<Media[]>;
  getCommentMedia(commentId: string): Promise<Media[]>;
  createMedia(media: InsertMedia): Promise<Media>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async searchEventsByLocation(lat: number, lng: number, radius: number, options: any): Promise<Event[]> {
    // Simple query without geo calculations for now
    const query = db.select().from(events);
    
    if (options.category) {
      query.where(eq(events.category, options.category));
    }
    
    const allEvents = await query;
    
    // Filter out past events
    const now = new Date();
    const futureEvents = allEvents.filter(event => {
      try {
        const eventDate = new Date(event.startDate);
        return eventDate > now;
      } catch (error) {
        console.warn(`Invalid date format for user event ${event.id}: ${event.startDate}`);
        return false;
      }
    });
    
    return futureEvents;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(eventData)
      .returning();
    return event;
  }

  async getUserEvents(userId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.hostId, userId));
  }

  async getEventRsvps(eventId: string): Promise<Rsvp[]> {
    return await db.select().from(rsvps).where(eq(rsvps.eventId, eventId));
  }

  async createGuestRsvp(rsvpData: InsertRsvp): Promise<Rsvp> {
    // For guest RSVPs, just insert without conflict resolution
    const [rsvp] = await db
      .insert(rsvps)
      .values(rsvpData)
      .returning();
    return rsvp;
  }

  async createOrUpdateRsvp(rsvpData: InsertRsvp): Promise<Rsvp> {
    // For user RSVPs with userId
    if (!rsvpData.userId) {
      return this.createGuestRsvp(rsvpData);
    }
    
    const [rsvp] = await db
      .insert(rsvps)
      .values(rsvpData)
      .onConflictDoUpdate({
        target: [rsvps.eventId, rsvps.userId],
        set: {
          status: rsvpData.status,
        },
      })
      .returning();
    return rsvp;
  }

  async getEventComments(eventId: string): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.eventId, eventId));
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values(commentData)
      .returning();
    return comment;
  }

  async getEventMedia(eventId: string): Promise<Media[]> {
    return await db.select().from(media).where(eq(media.eventId, eventId));
  }

  async getCommentMedia(commentId: string): Promise<Media[]> {
    return await db.select().from(media).where(eq(media.commentId, commentId));
  }

  async createMedia(mediaData: InsertMedia): Promise<Media> {
    const [mediaRecord] = await db
      .insert(media)
      .values(mediaData)
      .returning();
    return mediaRecord;
  }
}

export const storage = new DatabaseStorage();