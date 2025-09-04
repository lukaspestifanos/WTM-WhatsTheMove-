import { 
  users, events, rsvps, favorites, friendships, friendRequests,
  type User, type InsertUser, type Event, type InsertEvent, 
  type Rsvp, type InsertRsvp, type Favorite, type InsertFavorite,
  type Friendship, type InsertFriendship, type FriendRequest, type InsertFriendRequest
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
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
  removeFavorite(userId: string, eventId: string, externalSource?: string): Promise<void>;
  isFavorited(userId: string, eventId: string, externalSource?: string): Promise<boolean>;
  
  // Friend operations
  getUserFriends(userId: string): Promise<User[]>;
  sendFriendRequest(request: InsertFriendRequest): Promise<FriendRequest>;
  acceptFriendRequest(requestId: string): Promise<void>;
  declineFriendRequest(requestId: string): Promise<void>;
  getFriendRequests(userId: string): Promise<FriendRequest[]>;
  searchUsers(query: string, currentUserId: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        university: users.university,
        graduationYear: users.graduationYear,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users).where(eq(users.id, id));
      return user as User;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        university: users.university,
        graduationYear: users.graduationYear,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users).where(eq(users.email, email));
      return user as User;
    } catch (error) {
      console.error('Get user by email error:', error);
      throw error;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
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
    const whereClause = and(
      eq(favorites.userId, userId),
      eq(favorites.eventId, eventId)
    );
    // Note: externalSource filtering will be available after database migration
    
    await db.delete(favorites).where(whereClause);
  }

  async isFavorited(userId: string, eventId: string, externalSource?: string): Promise<boolean> {
    const whereClause = and(
      eq(favorites.userId, userId),
      eq(favorites.eventId, eventId)
    );
    // Note: externalSource filtering will be available after database migration
    
    const [favorite] = await db.select().from(favorites).where(whereClause).limit(1);
    return !!favorite;
  }

  // Friend operations - Temporary implementations until database is updated
  async getUserFriends(userId: string): Promise<User[]> {
    // Return empty array until friendships table is created
    return [];
  }

  async sendFriendRequest(request: InsertFriendRequest): Promise<FriendRequest> {
    // Placeholder implementation
    throw new Error("Friend requests feature requires database update");
  }

  async acceptFriendRequest(requestId: string): Promise<void> {
    // Placeholder implementation
    throw new Error("Friend requests feature requires database update");
  }

  async declineFriendRequest(requestId: string): Promise<void> {
    // Placeholder implementation
    throw new Error("Friend requests feature requires database update");
  }

  async getFriendRequests(userId: string): Promise<FriendRequest[]> {
    // Return empty array until friend_requests table is created
    return [];
  }

  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    // Search users by name or email (excluding current user)
    const searchQuery = `%${query.toLowerCase()}%`;
    const matchingUsers = await db
      .select()
      .from(users)
      .where(
        and(
          sql`LOWER(${users.firstName}) LIKE ${searchQuery} OR LOWER(${users.lastName}) LIKE ${searchQuery} OR LOWER(${users.email}) LIKE ${searchQuery}`,
          sql`${users.id} != ${currentUserId}`
        )
      )
      .limit(20);
    
    return matchingUsers;
  }
}

export const storage = new DatabaseStorage();