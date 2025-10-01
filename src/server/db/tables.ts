import * as sqliteSchema from "./schema";
import * as postgresSchema from "./schema-postgres";
import { env } from "~/env";

const isPostgres = env.DATABASE_URL.startsWith("postgres");

// Re-export all tables from the correct schema
export const {
  users,
  accounts,
  sessions,
  verificationTokens,
  userActivities,
  impersonationSessions,
  impersonationAuditLog,
  patients,
  therapySessions,
  chat,
  accountsRelations,
  sessionsRelations,
  userActivitiesRelations,
  impersonationSessionsRelations,
  impersonationAuditLogRelations,
  patientsRelations,
  therapySessionsRelations,
  chatRelations,
  usersRelations,
  extendedUsersRelations,
} = isPostgres ? postgresSchema : sqliteSchema;
