import { 
  users, events, rsvps, favorites,
  type User, type InsertUser, type Event, type InsertEvent, 
  type Rsvp, type InsertRsvp, type Favorite, type InsertFavorite
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
  
  // Favorite operations
  getUserFavorites(userId: string): Promise<Favorite[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, eventId: string): Promise<void>;
  removeFavorite(userId: string, eventId: string, externalSource?: string): Promise<void>;
  isFavorited(userId: string, eventId: string, externalSource?: string): Promise<boolean>;
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


  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return await db.select().from(favorites).where(eq(favorites.userId, userId));
  }

  async addFavorite(favoriteData: InsertFavorite): Promise<Favorite> {
    const [favorite] = await db
      .insert(favorites)
      .values(favoriteData)
      .onConflictDoNothing()
      .returning();
    return favorite;
  }

  async removeFavorite(userId: string, eventId: string, externalSource?: string): Promise<void> {
    let whereClause = and(
      eq(favorites.userId, userId),
      eq(favorites.eventId, eventId)
    );
    
    if (externalSource) {
      whereClause = and(whereClause, eq(favorites.externalSource, externalSource));
    }
    
    await db.delete(favorites).where(whereClause);
  }

  async isFavorited(userId: string, eventId: string, externalSource?: string): Promise<boolean> {
    let whereClause = and(
      eq(favorites.userId, userId),
      eq(favorites.eventId, eventId)
    );
    
    if (externalSource) {
      whereClause = and(whereClause, eq(favorites.externalSource, externalSource));
    }
    
    const [favorite] = await db.select().from(favorites).where(whereClause).limit(1);
    return !!favorite;
  }
}

export const storage = new DatabaseStorage();