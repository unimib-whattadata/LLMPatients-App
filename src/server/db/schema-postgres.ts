import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTableCreator,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { USER_ROLES } from "./contracts";
const randomUUID = () => crypto.randomUUID();

export const createTable = pgTableCreator((name) => `llmpatient_${name}`);

export const users = createTable(
  "user",
  {
    id: text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    password: text("password"),
    role: text("role", { enum: USER_ROLES }).notNull().default("user"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_name_idx").on(t.name),
    index("users_role_idx").on(t.role),
  ],
);

export const accounts = createTable(
  "account",
  {
    userId: text()
      .notNull()
      .references(() => users.id),
    type: text().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refresh_token: text(),
    access_token: text(),
    expires_at: integer(),
    token_type: text(),
    scope: text(),
    id_token: text(),
    session_state: text(),
  },
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
  {
    sessionToken: text().notNull().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id),
    expires: timestamp({ mode: "date" }).notNull(),
  },
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const verificationTokens = createTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const patients = createTable(
  "patient",
  {
    id: text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: text().notNull(),
    age: integer().notNull(),
    smallDescription: text().notNull(),
    details: text().notNull(),
    clinicalCase: text().notNull(),
    objectives: text().notNull(),
    therapeuticJourney: text().notNull(),
    avatarUrl: text(),
    elevenlabsVoiceId: text(),
    vibevoiceVoiceId: text(),
    chatterboxVoiceId: text(),
    welcomeMessage: text(),
    difficulty: integer().notNull(),
    estimatedDuration: integer().default(30).notNull(),
    isActive: boolean().default(true).notNull(),
    externalPatientId: text(),
    gender: text(),
    diagnosis: text(),
    psychologicalProfile: text(),
    currentMedications: text(),
    previousSessions: integer().default(0),
    createdAt: timestamp({ mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp({ mode: "date" }),
  },
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
  {
    id: text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text()
      .notNull()
      .references(() => users.id),
    patientId: text()
      .notNull()
      .references(() => patients.id),
    sessionNumber: integer().default(1).notNull(),
    isCompleted: boolean().default(false).notNull(),
    externalPatientId: text(),
    activePatientSessionKey: text(),
    createdAt: timestamp({ mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp({ mode: "date" }),
  },
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
  {
    id: text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    therapySessionId: text()
      .notNull()
      .references(() => therapySessions.id, { onDelete: "cascade" }),
    stepNumber: integer().notNull(),
    messages: text().notNull(),
    done: boolean().default(false).notNull(),
    createdAt: timestamp({ mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp({ mode: "date" }),
  },
  (t) => [
    index("chat_session_idx").on(t.therapySessionId),
    index("chat_step_number_idx").on(t.stepNumber),
    index("chat_done_idx").on(t.done),
    uniqueIndex("chat_session_step_idx").on(t.therapySessionId, t.stepNumber),
  ],
);

export const chatStepEvaluations = createTable(
  "chat_step_evaluation",
  {
    id: text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    therapySessionId: text()
      .notNull()
      .references(() => therapySessions.id, { onDelete: "cascade" }),
    stepNumber: integer().notNull(),
    status: text().notNull().default("processing"),
    analysisMode: text().notNull().default("vertex"),
    modelName: text(),
    detectorVersion: text().notNull(),
    resultJson: text(),
    errorMessage: text(),
    analyzedAt: timestamp({ mode: "date" }),
    createdAt: timestamp({ mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp({ mode: "date" }),
  },
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
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityType: text("activityType").notNull(),
    metadata: text("metadata"),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
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
  {
    id: text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),

    adminUserId: text()
      .notNull()
      .references(() => users.id),

    targetUserId: text()
      .notNull()
      .references(() => users.id),

    startedAt: timestamp({ mode: "date" }).notNull().defaultNow(),
    endedAt: timestamp({ mode: "date" }),

    isActive: boolean().default(true).notNull(),
    activeAdminSessionKey: text(),

    sessionToken: text(),
    ipAddress: text(),
    userAgent: text(),

    reason: text(),
  },
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
  {
    id: text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => randomUUID()),

    impersonationSessionId: text()
      .notNull()
      .references(() => impersonationSessions.id),

    actionType: text().notNull(),
    actionDetails: text(),

    performedAt: timestamp({ mode: "date" }).notNull().defaultNow(),

    ipAddress: text(),
    userAgent: text(),

    requestPath: text(),
    requestMethod: text(),
  },
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
