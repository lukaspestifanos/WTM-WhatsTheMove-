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
  index,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Constants for validation
const MAX_VARCHAR_LENGTH = 255;
const MAX_TEXT_LENGTH = 5000;
const EMAIL_MAX_LENGTH = 320; // RFC 5321 standard
const PASSWORD_MAX_LENGTH = 128;
const NAME_MAX_LENGTH = 50;

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: EMAIL_MAX_LENGTH }).notNull().unique(),
  password: varchar("password", { length: PASSWORD_MAX_LENGTH }).notNull(),
  firstName: varchar("first_name", { length: NAME_MAX_LENGTH }),
  lastName: varchar("last_name", { length: NAME_MAX_LENGTH }),
  profileImageUrl: varchar("profile_image_url", { length: MAX_VARCHAR_LENGTH }),
  university: varchar("university", { length: MAX_VARCHAR_LENGTH }),
  graduationYear: integer("graduation_year"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  universityIdx: index("users_university_idx").on(table.university),
  graduationYearIdx: index("users_graduation_year_idx").on(table.graduationYear),
}));

// Events table
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: MAX_VARCHAR_LENGTH }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  startDate: timestamp("start_date", { withTimezone: true, mode: "string" })
    .notNull(),
  endDate: timestamp("end_date", { withTimezone: true, mode: "string" }),
  location: varchar("location", { length: MAX_VARCHAR_LENGTH }).notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  hostId: uuid("host_id").references(() => users.id, { onDelete: "set null" }),
  maxAttendees: integer("max_attendees"),
  price: numeric("price", { precision: 10, scale: 2 }).default("0").notNull(),
  minPrice: numeric("min_price", { precision: 10, scale: 2 }).default("0").notNull(),
  maxPrice: numeric("max_price", { precision: 10, scale: 2 }).default("0").notNull(),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  isPaid: boolean("is_paid").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isCancelled: boolean("is_cancelled").default(false).notNull(),
  externalId: varchar("external_id", { length: MAX_VARCHAR_LENGTH }),
  externalSource: varchar("external_source", { length: 50 }),
  imageUrl: varchar("image_url", { length: MAX_VARCHAR_LENGTH }),
  venueId: varchar("venue_id", { length: MAX_VARCHAR_LENGTH }),
  venueName: varchar("venue_name", { length: MAX_VARCHAR_LENGTH }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: MAX_VARCHAR_LENGTH }),
  tags: text("tags"), // JSON array of tags
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
}, (table) => ({
  hostIdIdx: index("events_host_id_idx").on(table.hostId),
  categoryIdx: index("events_category_idx").on(table.category),
  startDateIdx: index("events_start_date_idx").on(table.startDate),
  locationIdx: index("events_location_idx").on(table.location),
  isPublicIdx: index("events_is_public_idx").on(table.isPublic),
  externalSourceIdx: index("events_external_source_idx").on(table.externalSource),
  // Composite indexes for common queries
  categoryDateIdx: index("events_category_date_idx").on(table.category, table.startDate),
  publicActiveIdx: index("events_public_active_idx").on(table.isPublic, table.isActive),
}));

// RSVPs table
export const rsvps = pgTable("rsvps", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  guestName: varchar("guest_name", { length: NAME_MAX_LENGTH }),
  guestEmail: varchar("guest_email", { length: EMAIL_MAX_LENGTH }),
  guestAddress: text("guest_address"),
  status: varchar("status", { length: 20 }).notNull().default("attending"),
  ticketsCount: integer("tickets_count").default(1).notNull(),
  totalPaid: numeric("total_paid", { precision: 10, scale: 2 }).default("0").notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
}, (table) => ({
  eventIdIdx: index("rsvps_event_id_idx").on(table.eventId),
  userIdIdx: index("rsvps_user_id_idx").on(table.userId),
  statusIdx: index("rsvps_status_idx").on(table.status),
  // Prevent duplicate RSVPs for the same user/event
  userEventUnique: unique("rsvps_user_event_unique").on(table.userId, table.eventId),
}));

// Favorites table
export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
}, (table) => ({
  userIdIdx: index("favorites_user_id_idx").on(table.userId),
  eventIdIdx: index("favorites_event_id_idx").on(table.eventId),
  // Prevent duplicate favorites
  userEventUnique: unique("favorites_user_event_unique").on(table.userId, table.eventId),
}));

// Friendships table
export const friendships = pgTable("friendships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  friendId: uuid("friend_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
}, (table) => ({
  userIdIdx: index("friendships_user_id_idx").on(table.userId),
  friendIdIdx: index("friendships_friend_id_idx").on(table.friendId),
  statusIdx: index("friendships_status_idx").on(table.status),
  // Prevent duplicate friendships
  userFriendUnique: unique("friendships_user_friend_unique").on(table.userId, table.friendId),
}));

// Friend Requests table
export const friendRequests = pgTable("friend_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  receiverId: uuid("receiver_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true, mode: "string" }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
}, (table) => ({
  senderIdIdx: index("friend_requests_sender_id_idx").on(table.senderId),
  receiverIdIdx: index("friend_requests_receiver_id_idx").on(table.receiverId),
  statusIdx: index("friend_requests_status_idx").on(table.status),
  expiresAtIdx: index("friend_requests_expires_at_idx").on(table.expiresAt),
  // Prevent duplicate friend requests
  senderReceiverUnique: unique("friend_requests_sender_receiver_unique").on(table.senderId, table.receiverId),
}));

// Comments table
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  guestName: varchar("guest_name", { length: NAME_MAX_LENGTH }),
  guestEmail: varchar("guest_email", { length: EMAIL_MAX_LENGTH }),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
}, (table) => ({
  eventIdIdx: index("comments_event_id_idx").on(table.eventId),
  userIdIdx: index("comments_user_id_idx").on(table.userId),
  createdAtIdx: index("comments_created_at_idx").on(table.createdAt),
}));

// Media table
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
  commentId: uuid("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  guestName: varchar("guest_name", { length: NAME_MAX_LENGTH }),
  guestEmail: varchar("guest_email", { length: EMAIL_MAX_LENGTH }),
  type: varchar("type", { length: 20 }).notNull(), // 'image', 'video', 'audio'
  url: varchar("url", { length: MAX_VARCHAR_LENGTH }).notNull(),
  filename: varchar("filename", { length: MAX_VARCHAR_LENGTH }),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
}, (table) => ({
  eventIdIdx: index("media_event_id_idx").on(table.eventId),
  commentIdIdx: index("media_comment_id_idx").on(table.commentId),
  userIdIdx: index("media_user_id_idx").on(table.userId),
  typeIdx: index("media_type_idx").on(table.type),
}));

// Event Invitations table
export const eventInvitations = pgTable("event_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  receiverId: uuid("receiver_id").references(() => users.id, { onDelete: "set null" }),
  inviteeEmail: varchar("invitee_email", { length: EMAIL_MAX_LENGTH }),
  status: varchar("status", { length: 20 }).notNull().default("sent"),
  personalMessage: text("personal_message"),
  inviteToken: varchar("invite_token", { length: 64 }), // For email invitations
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true, mode: "string" }),
}, (table) => ({
  eventIdIdx: index("event_invitations_event_id_idx").on(table.eventId),
  senderIdIdx: index("event_invitations_sender_id_idx").on(table.senderId),
  receiverIdIdx: index("event_invitations_receiver_id_idx").on(table.receiverId),
  statusIdx: index("event_invitations_status_idx").on(table.status),
  inviteTokenIdx: index("event_invitations_invite_token_idx").on(table.inviteToken),
  expiresAtIdx: index("event_invitations_expires_at_idx").on(table.expiresAt),
}));

// Enhanced Zod schemas with better validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email address").max(EMAIL_MAX_LENGTH),
  password: z.string().min(6, "Password must be at least 6 characters").max(PASSWORD_MAX_LENGTH),
  firstName: z.string().min(1, "First name is required").max(NAME_MAX_LENGTH).trim(),
  lastName: z.string().min(1, "Last name is required").max(NAME_MAX_LENGTH).trim(),
  university: z.string().max(MAX_VARCHAR_LENGTH).trim().optional(),
  graduationYear: z.number().int().min(2020).max(2030).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const selectUserSchema = createSelectSchema(users);

export const insertEventSchema = createInsertSchema(events, {
  title: z.string().min(1, "Title is required").max(MAX_VARCHAR_LENGTH).trim(),
  description: z.string().max(MAX_TEXT_LENGTH).trim().optional(),
  category: z.enum(["parties", "concerts", "sports", "study", "social", "other"]),
  location: z.string().min(1, "Location is required").max(MAX_VARCHAR_LENGTH).trim(),
  price: z.number().min(0, "Price cannot be negative"),
  maxAttendees: z.number().int().positive("Max attendees must be positive").optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectEventSchema = createSelectSchema(events);

export const insertRsvpSchema = createInsertSchema(rsvps, {
  status: z.enum(["attending", "not_attending", "maybe"]),
  ticketsCount: z.number().int().positive("Tickets count must be positive").default(1),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).default("pending"),
  guestEmail: z.string().email("Invalid email address").max(EMAIL_MAX_LENGTH).optional(),
  guestName: z.string().max(NAME_MAX_LENGTH).trim().optional(),
}).omit({
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

export const insertFriendshipSchema = createInsertSchema(friendships, {
  status: z.enum(["active", "blocked"]).default("active"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectFriendshipSchema = createSelectSchema(friendships);

export const insertFriendRequestSchema = createInsertSchema(friendRequests, {
  status: z.enum(["pending", "accepted", "declined", "expired"]).default("pending"),
  message: z.string().max(MAX_TEXT_LENGTH).trim().optional(),
}).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
  expiresAt: true,
});

export const selectFriendRequestSchema = createSelectSchema(friendRequests);

export const insertEventInvitationSchema = createInsertSchema(eventInvitations, {
  status: z.enum(["sent", "viewed", "accepted", "declined", "expired"]).default("sent"),
  personalMessage: z.string().max(MAX_TEXT_LENGTH).trim().optional(),
  inviteeEmail: z.string().email("Invalid email address").max(EMAIL_MAX_LENGTH).optional(),
}).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
  expiresAt: true,
  inviteToken: true,
});

export const selectEventInvitationSchema = createSelectSchema(eventInvitations);

export const insertCommentSchema = createInsertSchema(comments, {
  content: z.string().min(1, "Content is required").max(MAX_TEXT_LENGTH).trim(),
  guestEmail: z.string().email("Invalid email address").max(EMAIL_MAX_LENGTH).optional(),
  guestName: z.string().max(NAME_MAX_LENGTH).trim().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectCommentSchema = createSelectSchema(comments);

export const insertMediaSchema = createInsertSchema(media, {
  type: z.enum(["image", "video", "audio"]),
  url: z.string().url("Invalid URL").max(MAX_VARCHAR_LENGTH),
  filename: z.string().max(MAX_VARCHAR_LENGTH).optional(),
  fileSize: z.number().int().positive().optional(),
  guestEmail: z.string().email("Invalid email address").max(EMAIL_MAX_LENGTH).optional(),
  guestName: z.string().max(NAME_MAX_LENGTH).trim().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const selectMediaSchema = createSelectSchema(media);

// Type exports with proper inference
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Rsvp = typeof rsvps.$inferSelect;
export type InsertRsvp = z.infer<typeof insertRsvpSchema>;

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;

export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;

export type EventInvitation = typeof eventInvitations.$inferSelect;
export type InsertEventInvitation = z.infer<typeof insertEventInvitationSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Media = typeof media.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;

// Utility types for common queries
export type EventWithHost = Event & {
  host: User | null;
};

export type EventWithDetails = Event & {
  host: User | null;
  rsvpCount: number;
  userRsvp: Rsvp | null;
  isFavorited: boolean;
};

export type UserWithStats = User & {
  eventsHosted: number;
  eventsAttended: number;
  friendCount: number;
};

// Enums for validation
export const EventCategory = {
  PARTIES: "parties",
  CONCERTS: "concerts",
  SPORTS: "sports",
  STUDY: "study",
  SOCIAL: "social",
  OTHER: "other",
} as const;

export const RsvpStatus = {
  ATTENDING: "attending",
  NOT_ATTENDING: "not_attending",
  MAYBE: "maybe",
} as const;

export const PaymentStatus = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

export const FriendshipStatus = {
  ACTIVE: "active",
  BLOCKED: "blocked",
} as const;

export const FriendRequestStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  EXPIRED: "expired",
} as const;

export const InvitationStatus = {
  SENT: "sent",
  VIEWED: "viewed",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  EXPIRED: "expired",
} as const;