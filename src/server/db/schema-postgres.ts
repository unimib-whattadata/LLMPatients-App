import { relations, sql } from "drizzle-orm";
import {
  index,
  primaryKey,
  pgTableCreator,
  uniqueIndex,
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  json,
  uuid,
} from "drizzle-orm/pg-core";

import { randomUUID } from "crypto";

/**
 * AdapterAccount type for NextAuth v5 beta compatibility
 *
 * Manually defined type to ensure compatibility with the current NextAuth version.
 * Contains OAuth provider account information and tokens.
 */
type AdapterAccount = {
  type: "oauth" | "email" | "credentials";
  provider: string;
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
};

/**
 * Table creator for multi-project schema support
 *
 * Uses Drizzle ORM's multi-project schema feature to prefix all tables with 'llmpatient_'.
 * This allows multiple projects to share the same database instance without conflicts.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `llmpatient_${name}`);

/**
 * Users table for authentication and user management
 *
 * Stores user account information including authentication credentials,
 * profile data, and role-based access control.
 */
export const users = createTable(
  "user",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: d.text("name").notNull(),
    email: d.text("email").notNull().unique(),
    emailVerified: d.timestamp("emailVerified", { mode: "date" }),
    image: d.text("image"),
    password: d.text("password"),
    role: d
      .text("role", { enum: ["admin", "therapist", "patient"] })
      .notNull()
      .default("patient"),
    isActive: d.boolean("isActive").notNull().default(true),
    createdAt: d
      .timestamp("createdAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: d
      .timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    emailIdx: uniqueIndex("email_idx").on(table.email),
    roleIdx: index("role_idx").on(table.role),
  }),
);

/**
 * Accounts table for OAuth provider information
 *
 * Stores OAuth account information linked to users for authentication.
 * Supports multiple OAuth providers per user.
 */
export const accounts = createTable(
  "account",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: d
      .text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: d.text("type").notNull(),
    provider: d.text("provider").notNull(),
    providerAccountId: d.text("providerAccountId").notNull(),
    refresh_token: d.text("refresh_token"),
    access_token: d.text("access_token"),
    expires_at: d.integer("expires_at"),
    token_type: d.text("token_type"),
    scope: d.text("scope"),
    id_token: d.text("id_token"),
    session_state: d.text("session_state"),
  }),
  (table) => ({
    userIdIdx: index("account_userId_idx").on(table.userId),
    providerIdx: uniqueIndex("account_provider_idx").on(
      table.provider,
      table.providerAccountId,
    ),
  }),
);

/**
 * Sessions table for user session management
 *
 * Stores active user sessions for authentication state management.
 * Sessions are automatically cleaned up when expired.
 */
export const sessions = createTable(
  "session",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    sessionToken: d.text("sessionToken").notNull().unique(),
    userId: d
      .text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: d.timestamp("expires", { mode: "date" }).notNull(),
  }),
  (table) => ({
    sessionTokenIdx: uniqueIndex("session_token_idx").on(table.sessionToken),
    userIdIdx: index("session_userId_idx").on(table.userId),
  }),
);

/**
 * Verification tokens table for email verification
 *
 * Stores temporary tokens for email verification and password reset flows.
 * Tokens are automatically cleaned up after use or expiration.
 */
export const verificationTokens = createTable(
  "verificationToken",
  (d) => ({
    identifier: d.text("identifier").notNull(),
    token: d.text("token").notNull(),
    expires: d.timestamp("expires", { mode: "date" }).notNull(),
  }),
  (table) => ({
    tokenIdx: uniqueIndex("verification_token_idx").on(table.token),
    identifierTokenIdx: uniqueIndex("verification_identifier_token_idx").on(
      table.identifier,
      table.token,
    ),
  }),
);

/**
 * Patients table for patient management
 *
 * Stores patient information including personal details, medical history,
 * and therapeutic journey data.
 */
export const patients = createTable(
  "patients",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: d.text("name").notNull(),
    age: d.integer("age").notNull(),
    gender: d.text("gender", { enum: ["male", "female", "other"] }).notNull(),
    medicalHistory: d.text("medicalHistory"),
    currentMedications: d.text("currentMedications"),
    allergies: d.text("allergies"),
    emergencyContact: d.text("emergencyContact"),
    phone: d.text("phone"),
    email: d.text("email"),
    address: d.text("address"),
    notes: d.text("notes"),
    isActive: d.boolean("isActive").notNull().default(true),
    createdAt: d
      .timestamp("createdAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: d
      .timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    nameIdx: index("patients_name_idx").on(table.name),
    isActiveIdx: index("patients_isActive_idx").on(table.isActive),
  }),
);

/**
 * Therapy sessions table for session management
 *
 * Stores therapy session information including session details,
 * progress notes, and therapeutic outcomes.
 */
export const therapySessions = createTable(
  "therapySessions",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    patientId: d
      .text("patientId")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    therapistId: d
      .text("therapistId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionDate: d.timestamp("sessionDate", { mode: "date" }).notNull(),
    duration: d.integer("duration").notNull(), // in minutes
    sessionType: d
      .text("sessionType", {
        enum: ["individual", "group", "family", "couples"],
      })
      .notNull(),
    notes: d.text("notes"),
    goals: d.text("goals"),
    progress: d.text("progress"),
    homework: d.text("homework"),
    nextSessionDate: d.timestamp("nextSessionDate", { mode: "date" }),
    status: d
      .text("status", {
        enum: ["scheduled", "completed", "cancelled", "no_show"],
      })
      .notNull()
      .default("scheduled"),
    createdAt: d
      .timestamp("createdAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: d
      .timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    patientIdIdx: index("therapySessions_patientId_idx").on(table.patientId),
    therapistIdIdx: index("therapySessions_therapistId_idx").on(
      table.therapistId,
    ),
    sessionDateIdx: index("therapySessions_sessionDate_idx").on(
      table.sessionDate,
    ),
    statusIdx: index("therapySessions_status_idx").on(table.status),
  }),
);

/**
 * Chat messages table for therapeutic conversation
 *
 * Stores chat messages between patients and therapists during therapy sessions.
 * Supports different message types and conversation threading.
 */
export const chat = createTable(
  "chat",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    sessionId: d
      .text("sessionId")
      .notNull()
      .references(() => therapySessions.id, { onDelete: "cascade" }),
    senderId: d
      .text("senderId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: d.text("message").notNull(),
    messageType: d
      .text("messageType", {
        enum: ["text", "image", "file", "system"],
      })
      .notNull()
      .default("text"),
    metadata: d.json("metadata"),
    isRead: d.boolean("isRead").notNull().default(false),
    createdAt: d
      .timestamp("createdAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    sessionIdIdx: index("chat_sessionId_idx").on(table.sessionId),
    senderIdIdx: index("chat_senderId_idx").on(table.senderId),
    createdAtIdx: index("chat_createdAt_idx").on(table.createdAt),
  }),
);

/**
 * User activity log table for audit trail
 *
 * Stores user activity logs for security and compliance purposes.
 * Tracks login attempts, data access, and system interactions.
 */
export const userActivity = createTable(
  "userActivity",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: d
      .text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: d.text("action").notNull(),
    resource: d.text("resource"),
    details: d.json("details"),
    ipAddress: d.text("ipAddress"),
    userAgent: d.text("userAgent"),
    createdAt: d
      .timestamp("createdAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    userIdIdx: index("userActivity_userId_idx").on(table.userId),
    actionIdx: index("userActivity_action_idx").on(table.action),
    createdAtIdx: index("userActivity_createdAt_idx").on(table.createdAt),
  }),
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  therapySessions: many(therapySessions),
  chatMessages: many(chat),
  activity: many(userActivity),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const patientsRelations = relations(patients, ({ many }) => ({
  therapySessions: many(therapySessions),
}));

export const therapySessionsRelations = relations(
  therapySessions,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [therapySessions.patientId],
      references: [patients.id],
    }),
    therapist: one(users, {
      fields: [therapySessions.therapistId],
      references: [users.id],
    }),
    chatMessages: many(chat),
  }),
);

export const chatRelations = relations(chat, ({ one }) => ({
  session: one(therapySessions, {
    fields: [chat.sessionId],
    references: [therapySessions.id],
  }),
  sender: one(users, {
    fields: [chat.senderId],
    references: [users.id],
  }),
}));

export const userActivityRelations = relations(userActivity, ({ one }) => ({
  user: one(users, {
    fields: [userActivity.userId],
    references: [users.id],
  }),
}));
