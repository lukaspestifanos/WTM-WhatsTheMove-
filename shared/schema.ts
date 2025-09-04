import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  numeric,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  university: varchar("university"),
  graduationYear: integer("graduation_year"),
  emailVerified: boolean("email_verified").default(false),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  instagramHandle: varchar("instagram_handle"),
  twitterHandle: varchar("twitter_handle"),
  isPublicProfile: boolean("is_public_profile").default(true),
  friendsCount: integer("friends_count").default(0),
  eventsHosted: integer("events_hosted").default(0),
  eventsAttended: integer("events_attended").default(0),
  referralCode: varchar("referral_code").unique(),
  referredBy: uuid("referred_by"),
  referralRewards: integer("referral_rewards").default(0), // Points for referring friends
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

// Events
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  startDate: timestamp("start_date", { withTimezone: true, mode: "string" })
    .notNull(),
  endDate: timestamp("end_date", { withTimezone: true, mode: "string" }),
  location: varchar("location").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  hostId: uuid("host_id").references(() => users.id),
  maxAttendees: integer("max_attendees"),
  price: numeric("price", { precision: 10, scale: 2 }).default("0"),
  minPrice: numeric("min_price", { precision: 10, scale: 2 }).default("0"),
  maxPrice: numeric("max_price", { precision: 10, scale: 2 }).default("0"),
  isPublic: boolean("is_public").default(true),
  externalId: varchar("external_id"),
  externalSource: varchar("external_source"),
  imageUrl: varchar("image_url"),
  venueId: varchar("venue_id"),
  venueName: varchar("venue_name"),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }).default("0"),
  isPaid: boolean("is_paid").default(false),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

// RSVPs
export const rsvps = pgTable("rsvps", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  guestName: varchar("guest_name"),
  guestEmail: varchar("guest_email"),
  guestAddress: text("guest_address"),
  status: varchar("status").notNull().default("attending"), // attending, not_attending, maybe
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

// Favorites
export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

// Friendships
export const friendships = pgTable("friendships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  friendId: uuid("friend_id").references(() => users.id).notNull(),
  status: varchar("status").notNull().default("active"), // active, blocked
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

// Friend Requests
export const friendRequests = pgTable("friend_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  receiverId: uuid("receiver_id").references(() => users.id).notNull(),
  status: varchar("status").notNull().default("pending"), // pending, accepted, declined
  message: text("message"), // Optional message with friend request
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true, mode: "string" }),
});

// Event Invitations (for sharing events with friends)
export const eventInvitations = pgTable("event_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  receiverId: uuid("receiver_id").references(() => users.id),
  inviteeEmail: varchar("invitee_email"), // For inviting non-users
  status: varchar("status").notNull().default("sent"), // sent, viewed, accepted, declined
  personalMessage: text("personal_message"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true, mode: "string" }),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserSchema = createSelectSchema(users);

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectEventSchema = createSelectSchema(events);

export const insertRsvpSchema = createInsertSchema(rsvps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectRsvpSchema = createSelectSchema(rsvps);

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const selectFavoriteSchema = createSelectSchema(favorites);

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  createdAt: true,
});

export const selectFriendshipSchema = createSelectSchema(friendships);

export const insertFriendRequestSchema = createInsertSchema(friendRequests).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export const selectFriendRequestSchema = createSelectSchema(friendRequests);

export const insertEventInvitationSchema = createInsertSchema(eventInvitations).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export const selectEventInvitationSchema = createSelectSchema(eventInvitations);

// Type inference for the new schemas
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;

export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;

export type EventInvitation = typeof eventInvitations.$inferSelect;
export type InsertEventInvitation = z.infer<typeof insertEventInvitationSchema>;

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Rsvp = typeof rsvps.$inferSelect;
export type InsertRsvp = z.infer<typeof insertRsvpSchema>;

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;