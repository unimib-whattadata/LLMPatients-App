import * as sqliteSchema from "./schema";
import * as postgresSchema from "./schema-postgres";
import { env } from "~/env";

const isPostgres = env.DATABASE_URL.startsWith("postgres");

// Drizzle exposes different static types for the two dialects, but the app
// expects one runtime contract. We pick the active schema once here and keep
// the rest of the code importing from a single place.
const activeSchema = (isPostgres ? postgresSchema : sqliteSchema) as any;

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
} = activeSchema;
