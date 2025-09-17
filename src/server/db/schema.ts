import { relations, sql } from "drizzle-orm";
import { index, primaryKey, sqliteTableCreator } from "drizzle-orm/sqlite-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `epatient_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    name: d.text({ length: 256 }),
    createdById: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ],
);

export const users = createTable("user", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull(),
  password: d.text({ length: 255 }),
  // Role field for user access control - 'admin' or 'user'
  role: d.text({ length: 20 }).default('user').notNull(),
  emailVerified: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  image: d.text({ length: 255 }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  createdBy: one(users, {
    fields: [posts.createdById],
    references: [users.id],
  }),
}));

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
      .$defaultFn(() => crypto.randomUUID()),
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
      .$defaultFn(() => crypto.randomUUID()),
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
export const impersonationSessionsRelations = relations(impersonationSessions, ({ one, many }) => ({
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
}));

export const impersonationAuditLogRelations = relations(impersonationAuditLog, ({ one }) => ({
  impersonationSession: one(impersonationSessions, {
    fields: [impersonationAuditLog.impersonationSessionId],
    references: [impersonationSessions.id],
  }),
}));

// Add relations to users for impersonation
export const extendedUsersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  posts: many(posts),
  activities: many(userActivities),
  adminImpersonationSessions: many(impersonationSessions, {
    relationName: "adminImpersonationSessions",
  }),
  targetImpersonationSessions: many(impersonationSessions, {
    relationName: "targetImpersonationSessions",
  }),
}));

// Virtual Patients table for patient exploration page
export const virtualPatients = createTable(
  "virtual_patient",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: d.text({ length: 255 }).notNull(),
    age: d.integer({ mode: "number" }).notNull(),
    gender: d.text({ length: 20 }).notNull(), // 'male', 'female', 'other'
    condition: d.text({ length: 500 }).notNull(),
    background: d.text({ length: 2000 }).notNull(),
    objectives: d.text({ length: 2000 }).notNull(), // JSON array of objectives
    avatarUrl: d.text({ length: 500 }),
    avatarType: d.text({ length: 20 }).default('illustration').notNull(), // 'photo', 'illustration', 'avatar'
    difficulty: d.text({ length: 20 }).notNull(), // 'Facile', 'Medio', 'Difficile'
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
  ],
);

// Patient Tags table
export const patientTags = createTable(
  "patient_tag",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    label: d.text({ length: 100 }).notNull(),
    category: d.text({ length: 50 }).notNull(), // 'psychological', 'physical', 'behavioral'
    color: d.text({ length: 20 }).default('#gray').notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    index("patient_tag_category_idx").on(t.category),
    index("patient_tag_label_idx").on(t.label),
  ],
);

// Patient-Tag Relations (many-to-many)
export const patientTagRelations = createTable(
  "patient_tag_relation",
  (d) => ({
    patientId: d
      .text({ length: 255 })
      .notNull()
      .references(() => virtualPatients.id, { onDelete: "cascade" }),
    tagId: d
      .text({ length: 255 })
      .notNull()
      .references(() => patientTags.id, { onDelete: "cascade" }),
  }),
  (t) => [
    primaryKey({ columns: [t.patientId, t.tagId] }),
    index("patient_tag_patient_idx").on(t.patientId),
    index("patient_tag_tag_idx").on(t.tagId),
  ],
);

// Relations for virtual patients
export const virtualPatientsRelations = relations(virtualPatients, ({ many }) => ({
  tagRelations: many(patientTagRelations),
}));

export const patientTagsRelations = relations(patientTags, ({ many }) => ({
  patientRelations: many(patientTagRelations),
}));

export const patientTagRelationsRelations = relations(patientTagRelations, ({ one }) => ({
  patient: one(virtualPatients, {
    fields: [patientTagRelations.patientId],
    references: [virtualPatients.id],
  }),
  tag: one(patientTags, {
    fields: [patientTagRelations.tagId],
    references: [patientTags.id],
  }),
}));
