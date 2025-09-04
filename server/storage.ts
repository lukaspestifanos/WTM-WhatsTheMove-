import { users, events, rsvps, type User, type UpsertUser, type Event, type InsertEvent, type Rsvp, type InsertRsvp } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Event operations
  searchEventsByLocation(lat: number, lng: number, radius: number, options: any): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  getUserEvents(userId: string): Promise<Event[]>;
  
  // RSVP operations
  getEventRsvps(eventId: string): Promise<Rsvp[]>;
  createOrUpdateRsvp(rsvp: InsertRsvp): Promise<Rsvp>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
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
    return allEvents;
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

  async createOrUpdateRsvp(rsvpData: InsertRsvp): Promise<Rsvp> {
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
}

export const storage = new DatabaseStorage();