import { relations } from "drizzle-orm";
import {
  index,
  primaryKey,
  pgTableCreator,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  USER_ROLES,
} from "./contracts";
// Generate UUID using Web Crypto API (Edge Runtime compatible)
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

export const createTable = pgTableCreator((name) => `llmpatient_${name}`);

export const users = createTable(
  "user",
  (d: any) => ({
    id: d
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: d.text("name"),
    email: d.text("email").notNull().unique(),
    emailVerified: d.timestamp("emailVerified", { mode: "date" }),
    image: d.text("image"),
    password: d.text("password"),
    role: d
      .text("role", { enum: USER_ROLES })
      .notNull()
      .default("user"),
    isActive: d.boolean("isActive").notNull().default(true),
    createdAt: d
      .timestamp("createdAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: d
      .timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  }),
  (t) => [

    index("users_email_idx").on(t.email),
    index("users_name_idx").on(t.name),
    index("users_role_idx").on(t.role),
  ],
);



export const accounts = createTable(
  "account",
  (d: any) => ({
    userId: d
      .text()
      .notNull()
      .references(() => users.id),
    type: d.text().notNull(),
    provider: d.text().notNull(),
    providerAccountId: d.text().notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.text(),
    scope: d.text(),
    id_token: d.text(),
    session_state: d.text(),
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
  (d: any) => ({
    sessionToken: d.text().notNull().primaryKey(),
    userId: d
      .text()
      .notNull()
      .references(() => users.id),
    expires: d.timestamp({ mode: "date" }).notNull(),
  }),
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const verificationTokens = createTable(
  "verificationToken",
  (d: any) => ({
    identifier: d.text("identifier").notNull(),
    token: d.text("token").notNull(),
    expires: d.timestamp("expires", { mode: "date" }).notNull(),
  }),
);


export const patients = createTable(
  "patient",
  (d: any) => ({
    id: d
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: d.text().notNull(),
    age: d.integer().notNull(),
    smallDescription: d.text().notNull(),
    details: d.text().notNull(),
    clinicalCase: d.text().notNull(),
    objectives: d.text().notNull(),
    therapeuticJourney: d.text().notNull(),
    avatarUrl: d.text(),
    elevenlabsVoiceId: d.text(), // New: dedicated ElevenLabs voice ID for TTS
    vibevoiceVoiceId: d.text(), // New: VibeVoice voice ID for TTS
    chatterboxVoiceId: d.text(), // New: Chatterbox voice ID for TTS
    welcomeMessage: d.text(), // Optional custom welcome message
    difficulty: d.integer().notNull(),
    estimatedDuration: d.integer().default(30).notNull(),
    isActive: d.boolean().default(true).notNull(),
    externalPatientId: d.text(),
    gender: d.text(), // Gender for API compatibility
    diagnosis: d.text(), // Diagnosis for API compatibility
    psychologicalProfile: d.text(), // Psychological profile for API compatibility
    currentMedications: d.text(), // JSON array of current medications
    previousSessions: d.integer().default(0), // Number of previous therapy sessions
    createdAt: d.timestamp({ mode: "date" }).notNull().defaultNow(),
    updatedAt: d.timestamp({ mode: "date" }),
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

export const therapySessions = createTable(
  "therapy_session",
  (d: any) => ({
    id: d
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: d
      .text()
      .notNull()
      .references(() => users.id),
    patientId: d
      .text()
      .notNull()
      .references(() => patients.id),
    sessionNumber: d.integer().default(1).notNull(),
    isCompleted: d.boolean().default(false).notNull(),
    externalPatientId: d.text(),
    activePatientSessionKey: d.text(),
    createdAt: d.timestamp({ mode: "date" }).notNull().defaultNow(),
    updatedAt: d.timestamp({ mode: "date" }),
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


export const chat = createTable(
  "chat",
  (d: any) => ({
    id: d
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    therapySessionId: d
      .text()
      .notNull()
      .references(() => therapySessions.id, { onDelete: "cascade" }),
    stepNumber: d.integer().notNull(),
    messages: d.text().notNull(),
    done: d.boolean().default(false).notNull(),
    createdAt: d.timestamp({ mode: "date" }).notNull().defaultNow(),
    updatedAt: d.timestamp({ mode: "date" }),
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
  (d: any) => ({
    id: d
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    therapySessionId: d
      .text()
      .notNull()
      .references(() => therapySessions.id, { onDelete: "cascade" }),
    stepNumber: d.integer().notNull(),
    status: d.text().notNull().default("processing"),
    analysisMode: d.text().notNull().default("heuristic"),
    modelName: d.text(),
    detectorVersion: d.text().notNull(),
    resultJson: d.text(),
    errorMessage: d.text(),
    analyzedAt: d.timestamp({ mode: "date" }),
    createdAt: d.timestamp({ mode: "date" }).notNull().defaultNow(),
    updatedAt: d.timestamp({ mode: "date" }),
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

export const userActivities = createTable(
  "userActivity",
  (d: any) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: d
      .text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityType: d.text("activityType").notNull(),
    metadata: d.text("metadata"),
    ipAddress: d.text("ipAddress"),
    userAgent: d.text("userAgent"),
    createdAt: d
      .timestamp("createdAt", { mode: "date" })
      .notNull()
      .defaultNow(),
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


export const impersonationSessions = createTable(
  "impersonation_session",
  (d: any) => ({
    id: d
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),

    adminUserId: d
      .text()
      .notNull()
      .references(() => users.id),

    targetUserId: d
      .text()
      .notNull()
      .references(() => users.id),

    startedAt: d.timestamp({ mode: "date" }).notNull().defaultNow(),
    endedAt: d.timestamp({ mode: "date" }),

    isActive: d.boolean().default(true).notNull(),
    activeAdminSessionKey: d.text(),

    sessionToken: d.text(),
    ipAddress: d.text(),
    userAgent: d.text(),

    reason: d.text(),
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
  (d: any) => ({
    id: d
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),

    impersonationSessionId: d
      .text()
      .notNull()
      .references(() => impersonationSessions.id),

    actionType: d.text().notNull(),
    actionDetails: d.text(),

    performedAt: d.timestamp({ mode: "date" }).notNull().defaultNow(),

    ipAddress: d.text(),
    userAgent: d.text(),

    requestPath: d.text(),
    requestMethod: d.text(),
  }),
  (t) => [
    index("impersonation_audit_session_idx").on(t.impersonationSessionId),
    index("impersonation_audit_action_type_idx").on(t.actionType),
    index("impersonation_audit_performed_at_idx").on(t.performedAt),
  ],
);


export const patientsRelations = relations(patients, ({ many }) => ({
  therapySessions: many(therapySessions),
}));

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

export const usersRelations = relations(users, ({ many: _many }) => ({}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const userActivitiesRelations = relations(userActivities, ({ one }) => ({
  user: one(users, { fields: [userActivities.userId], references: [users.id] }),
}));


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
