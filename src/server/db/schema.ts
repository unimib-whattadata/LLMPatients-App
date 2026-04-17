import { relations, sql } from "drizzle-orm";
import {
  index,
  primaryKey,
  sqliteTableCreator,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
  type UserActivityType,
  type UserRole,
} from "./contracts";
// Generate UUID using Web Crypto API
const randomUUID = () => crypto.randomUUID();


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

export const createTable = sqliteTableCreator((name) => `llmpatient_${name}`);

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
    role: d.text({ length: 20 }).$type<UserRole>().default("user").notNull(),
    isActive: d.integer({ mode: "boolean" }).default(true).notNull(),
    emailVerified: d
      .integer({ mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`),
    image: d.text({ length: 255 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }),
  }),
  (t) => [
    uniqueIndex("users_email_unique_idx").on(t.email),
    index("users_name_idx").on(t.name),
    index("users_role_idx").on(t.role),
    index("users_active_idx").on(t.isActive),
  ],
);



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


export const userActivities = createTable(
  "user_activity",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityType: d
      .text({ length: 50 })
      .$type<UserActivityType>()
      .notNull(),
    metadata: d.text(),
    ipAddress: d.text({ length: 45 }),
    userAgent: d.text({ length: 500 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  }),
  (t) => [
    index("user_activity_user_id_idx").on(t.userId),
    index("user_activity_type_idx").on(t.activityType),
    index("user_activity_created_at_idx").on(t.createdAt),
    index("user_activity_type_created_user_idx").on(
      t.activityType,
      t.createdAt,
      t.userId,
    ),
    index("user_activity_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const userActivitiesRelations = relations(userActivities, ({ one }) => ({
  user: one(users, { fields: [userActivities.userId], references: [users.id] }),
}));


export const impersonationSessions = createTable(
  "impersonation_session",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),

    adminUserId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),

    targetUserId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),

    startedAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
    endedAt: d.integer({ mode: "timestamp" }),

    isActive: d.integer({ mode: "boolean" }).default(true).notNull(),
    activeAdminSessionKey: d.text({ length: 255 }),

    sessionToken: d.text({ length: 255 }),
    ipAddress: d.text({ length: 45 }),
    userAgent: d.text({ length: 500 }),

    reason: d.text({ length: 500 }),
  }),
  (t) => [
    index("impersonation_admin_user_idx").on(t.adminUserId),
    index("impersonation_target_user_idx").on(t.targetUserId),
    index("impersonation_active_idx").on(t.isActive),
    index("impersonation_started_at_idx").on(t.startedAt),
    index("impersonation_admin_started_idx").on(t.adminUserId, t.startedAt),
    index("impersonation_target_started_idx").on(t.targetUserId, t.startedAt),
    uniqueIndex("impersonation_active_admin_key_idx").on(
      t.activeAdminSessionKey,
    ),
  ],
);


export const impersonationAuditLog = createTable(
  "impersonation_audit_log",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),

    impersonationSessionId: d
      .text({ length: 255 })
      .notNull()
      .references(() => impersonationSessions.id),

    actionType: d.text({ length: 50 }).notNull(),
    actionDetails: d.text({ length: 1000 }),

    performedAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),

    ipAddress: d.text({ length: 45 }),
    userAgent: d.text({ length: 500 }),

    requestPath: d.text({ length: 255 }),
    requestMethod: d.text({ length: 10 }),
  }),
  (t) => [
    index("impersonation_audit_session_idx").on(t.impersonationSessionId),
    index("impersonation_audit_action_type_idx").on(t.actionType),
    index("impersonation_audit_performed_at_idx").on(t.performedAt),
  ],
);


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


export const patients = createTable(
  "patient",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: d.text({ length: 255 }).notNull(),
    age: d.integer({ mode: "number" }).notNull(),
    smallDescription: d.text({ length: 500 }).notNull(),
    details: d.text().notNull(),
    clinicalCase: d.text().notNull(),
    objectives: d.text({ length: 2000 }).notNull(),
    therapeuticJourney: d.text().notNull(),
    avatarUrl: d.text({ length: 500 }),
    elevenlabsVoiceId: d.text({ length: 255 }), // New: dedicated ElevenLabs voice ID for TTS
    vibevoiceVoiceId: d.text({ length: 255 }), // New: VibeVoice voice ID for TTS
    chatterboxVoiceId: d.text({ length: 255 }), // New: Chatterbox voice ID for TTS
    welcomeMessage: d.text({ length: 1000 }), // Optional custom welcome message
    difficulty: d.integer({ mode: "number" }).notNull(),
    estimatedDuration: d.integer({ mode: "number" }).default(30).notNull(),
    isActive: d.integer({ mode: "boolean" }).default(true).notNull(),
    externalPatientId: d.text({ length: 255 }),
    gender: d.text({ length: 50 }), // Gender for API compatibility
    diagnosis: d.text({ length: 500 }), // Diagnosis for API compatibility
    psychologicalProfile: d.text(), // Psychological profile for API compatibility
    currentMedications: d.text(), // JSON array of current medications
    previousSessions: d.integer({ mode: "number" }).default(0), // Number of previous therapy sessions
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }),
  }),
  (t) => [
    index("virtual_patient_difficulty_idx").on(t.difficulty),
    index("virtual_patient_active_idx").on(t.isActive),
    index("virtual_patient_created_at_idx").on(t.createdAt),
    index("virtual_patient_name_idx").on(t.name),
    index("virtual_patient_external_id_idx").on(t.externalPatientId),
    index("virtual_patient_active_difficulty_name_idx").on(
      t.isActive,
      t.difficulty,
      t.name,
    ),
  ],
);


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
    externalPatientId: d.text({ length: 255 }),
    activePatientSessionKey: d.text({ length: 255 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }),
  }),
  (t) => [
    index("therapy_session_user_idx").on(t.userId),
    index("therapy_session_patient_idx").on(t.patientId),
    index("therapy_session_updated_at_idx").on(t.updatedAt),
    index("therapy_session_completed_idx").on(t.isCompleted),
    index("therapy_session_user_patient_created_idx").on(
      t.userId,
      t.patientId,
      t.createdAt,
    ),
    uniqueIndex("therapy_session_active_user_patient_idx").on(
      t.activePatientSessionKey,
    ),
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
    chatStepEvaluations: many(chatStepEvaluations),
  }),
);


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
    stepNumber: d.integer({ mode: "number" }).notNull(),
    messages: d.text().notNull(),
    done: d.integer({ mode: "boolean" }).default(false).notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }),
  }),
  (t) => [
    index("chat_session_idx").on(t.therapySessionId),
    index("chat_step_number_idx").on(t.stepNumber),
    index("chat_done_idx").on(t.done),
    uniqueIndex("chat_session_step_idx").on(t.therapySessionId, t.stepNumber),
  ],
);

export const chatStepEvaluations = createTable(
  "chat_step_evaluation",
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
    stepNumber: d.integer({ mode: "number" }).notNull(),
    status: d.text({ length: 32 }).notNull().default("processing"),
    analysisMode: d.text({ length: 32 }).notNull().default("vertex"),
    modelName: d.text({ length: 255 }),
    detectorVersion: d.text({ length: 64 }).notNull(),
    resultJson: d.text(),
    errorMessage: d.text(),
    analyzedAt: d.integer({ mode: "timestamp" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }),
  }),
  (t) => [
    index("chat_step_evaluation_session_idx").on(t.therapySessionId),
    index("chat_step_evaluation_status_idx").on(t.status),
    index("chat_step_evaluation_analyzed_at_idx").on(t.analyzedAt),
    uniqueIndex("chat_step_evaluation_session_step_idx").on(
      t.therapySessionId,
      t.stepNumber,
    ),
  ],
);

export const chatRelations = relations(chat, ({ one }) => ({
  therapySession: one(therapySessions, {
    fields: [chat.therapySessionId],
    references: [therapySessions.id],
  }),
}));

export const chatStepEvaluationsRelations = relations(
  chatStepEvaluations,
  ({ one }) => ({
    therapySession: one(therapySessions, {
      fields: [chatStepEvaluations.therapySessionId],
      references: [therapySessions.id],
    }),
  }),
);

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
