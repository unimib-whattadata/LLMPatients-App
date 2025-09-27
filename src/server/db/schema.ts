import { relations, sql } from "drizzle-orm";
import {
  index,
  primaryKey,
  sqliteTableCreator,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
// Use web-compatible crypto for Edge Runtime compatibility
const randomUUID = () => crypto.randomUUID();
// import { type AdapterAccount } from "next-auth/adapters";

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
 * Uses Drizzle ORM's multi-project schema feature to prefix all tables with 'epatient_'.
 * This allows multiple projects to share the same database instance without conflicts.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `epatient_${name}`);

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
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: d.text({ length: 255 }),
    email: d.text({ length: 255 }).notNull(),
    password: d.text({ length: 255 }),
    // Role field for user access control - 'admin' or 'user'
    role: d.text({ length: 20 }).default("user").notNull(),
    emailVerified: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
    image: d.text({ length: 255 }),
  }),
  (t) => [
    // Indexes for common query patterns
    index("users_email_idx").on(t.email),
    index("users_name_idx").on(t.name),
    index("users_role_idx").on(t.role),
  ],
);

// Note: usersRelations replaced by extendedUsersRelations below to include impersonation relations

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.text({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.text({ length: 255 }).notNull(),
    providerAccountId: d.text({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.text({ length: 255 }),
    scope: d.text({ length: 255 }),
    id_token: d.text(),
    session_state: d.text({ length: 255 }),
  }),
  (t) => [
    primaryKey({
      columns: [t.provider, t.providerAccountId],
    }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.text({ length: 255 }).notNull().primaryKey(),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.text({ length: 255 }).notNull(),
    token: d.text({ length: 255 }).notNull(),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// User activities table for tracking dashboard actions
export const userActivities = createTable(
  "user_activity",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    // Activity type: 'login', 'profile_update', 'simulation', 'dashboard_view'
    activityType: d.text({ length: 50 }).notNull(),
    // JSON string for additional activity metadata
    metadata: d.text(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    index("user_activity_user_id_idx").on(t.userId),
    index("user_activity_type_idx").on(t.activityType),
  ],
);

export const userActivitiesRelations = relations(userActivities, ({ one }) => ({
  user: one(users, { fields: [userActivities.userId], references: [users.id] }),
}));

// Impersonation session tracking table
export const impersonationSessions = createTable(
  "impersonation_session",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    // Admin user who initiated the impersonation
    adminUserId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    // Target user being impersonated
    targetUserId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    // Session timing
    startedAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    endedAt: d.integer({ mode: "timestamp" }),
    // Session status
    isActive: d.integer({ mode: "boolean" }).default(true).notNull(),
    // Session metadata
    sessionToken: d.text({ length: 255 }),
    ipAddress: d.text({ length: 45 }), // IPv6 compatible
    userAgent: d.text({ length: 500 }),
    // Optional reason for impersonation
    reason: d.text({ length: 500 }),
  }),
  (t) => [
    index("impersonation_admin_user_idx").on(t.adminUserId),
    index("impersonation_target_user_idx").on(t.targetUserId),
    index("impersonation_active_idx").on(t.isActive),
    index("impersonation_started_at_idx").on(t.startedAt),
  ],
);

// Audit log for impersonation events
export const impersonationAuditLog = createTable(
  "impersonation_audit_log",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    // Reference to impersonation session
    impersonationSessionId: d
      .text({ length: 255 })
      .notNull()
      .references(() => impersonationSessions.id),
    // Action details
    actionType: d.text({ length: 50 }).notNull(), // 'START', 'END', 'ACTION_PERFORMED', 'SESSION_REFRESH'
    actionDetails: d.text({ length: 1000 }), // JSON string for detailed action data
    // Timing
    performedAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    // Request metadata
    ipAddress: d.text({ length: 45 }),
    userAgent: d.text({ length: 500 }),
    // Additional context
    requestPath: d.text({ length: 255 }),
    requestMethod: d.text({ length: 10 }),
  }),
  (t) => [
    index("impersonation_audit_session_idx").on(t.impersonationSessionId),
    index("impersonation_audit_action_type_idx").on(t.actionType),
    index("impersonation_audit_performed_at_idx").on(t.performedAt),
  ],
);

// Relations for impersonation tables
export const impersonationSessionsRelations = relations(
  impersonationSessions,
  ({ one, many }) => ({
    adminUser: one(users, {
      fields: [impersonationSessions.adminUserId],
      references: [users.id],
      relationName: "adminImpersonationSessions",
    }),
    targetUser: one(users, {
      fields: [impersonationSessions.targetUserId],
      references: [users.id],
      relationName: "targetImpersonationSessions",
    }),
    auditLogs: many(impersonationAuditLog),
  }),
);

export const impersonationAuditLogRelations = relations(
  impersonationAuditLog,
  ({ one }) => ({
    impersonationSession: one(impersonationSessions, {
      fields: [impersonationAuditLog.impersonationSessionId],
      references: [impersonationSessions.id],
    }),
  }),
);

// Patients table for patient exploration page
export const patients = createTable(
  "patient",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: d.text({ length: 255 }).notNull(),
    smallDescription: d.text({ length: 500 }).notNull(), // Brief description of the case
    details: d.text().notNull(), // JSON string containing all patient details
    background: d.text({ length: 2000 }).notNull(),
    objectives: d.text({ length: 2000 }).notNull(), // JSON array of objectives
    avatarUrl: d.text({ length: 500 }),
    avatarType: d.text({ length: 20 }).default("illustration").notNull(), // 'photo', 'illustration', 'avatar'
    difficulty: d.integer({ mode: "number" }).notNull(), // 1: Facile, 2: Medio, 3: Difficile
    estimatedDuration: d.integer({ mode: "number" }).default(30).notNull(), // minutes
    isActive: d.integer({ mode: "boolean" }).default(true).notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("virtual_patient_difficulty_idx").on(t.difficulty),
    index("virtual_patient_active_idx").on(t.isActive),
    index("virtual_patient_created_at_idx").on(t.createdAt),
    index("virtual_patient_name_idx").on(t.name), // For LIKE searches
  ],
);

// Relations for patients
export const patientsRelations = relations(patients, ({ many }) => ({
  therapySessions: many(therapySessions),
}));

export const usersRelations = relations(users, ({ many: _many }) => ({}));
export const therapySessions = createTable(
  "therapy_session",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    patientId: d
      .text({ length: 255 })
      .notNull()
      .references(() => patients.id),
    sessionNumber: d.integer({ mode: "number" }).default(1).notNull(),
    isCompleted: d.integer({ mode: "boolean" }).default(false).notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("therapy_session_user_idx").on(t.userId),
    index("therapy_session_patient_idx").on(t.patientId),
    index("therapy_session_updated_at_idx").on(t.updatedAt), // For ordering by updatedAt
    index("therapy_session_completed_idx").on(t.isCompleted), // For filtering completed sessions
    uniqueIndex("therapy_session_user_patient_idx").on(t.userId, t.patientId),
  ],
);

export const therapySessionsRelations = relations(
  therapySessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [therapySessions.userId],
      references: [users.id],
    }),
    patient: one(patients, {
      fields: [therapySessions.patientId],
      references: [patients.id],
    }),
    chats: many(chat),
  }),
);

// Chat table for storing chat conversations per step
export const chat = createTable(
  "chat",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    therapySessionId: d
      .text({ length: 255 })
      .notNull()
      .references(() => therapySessions.id, { onDelete: "cascade" }),
    stepNumber: d.integer({ mode: "number" }).notNull(), // 1, 2, 3, etc.
    messages: d.text().notNull(), // JSON string containing chat messages
    done: d.integer({ mode: "boolean" }).default(false).notNull(), // true when step is completed
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("chat_session_idx").on(t.therapySessionId),
    index("chat_step_number_idx").on(t.stepNumber),
    index("chat_done_idx").on(t.done),
    uniqueIndex("chat_session_step_idx").on(t.therapySessionId, t.stepNumber),
  ],
);

export const chatRelations = relations(chat, ({ one }) => ({
  therapySession: one(therapySessions, {
    fields: [chat.therapySessionId],
    references: [therapySessions.id],
  }),
}));

export const extendedUsersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  activities: many(userActivities),
  adminImpersonationSessions: many(impersonationSessions, {
    relationName: "adminImpersonationSessions",
  }),
  targetImpersonationSessions: many(impersonationSessions, {
    relationName: "targetImpersonationSessions",
  }),
  therapySessions: many(therapySessions),
}));
