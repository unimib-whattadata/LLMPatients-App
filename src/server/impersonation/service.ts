import { and, eq } from "drizzle-orm";

import { createLogger } from "~/lib/logger";
import { db } from "~/server/db";
import { withDatabaseLockRetry } from "~/server/db/errors";
import {
  impersonationAuditLog,
  impersonationSessions,
} from "~/server/db/tables";

const logger = createLogger("ImpersonationService");

type ImpersonationExecutor = Pick<typeof db, "insert" | "select" | "update">;

export type ImpersonationEndReason =
  | "impersonated_user"
  | "original_admin"
  | "sign_out";

export interface CloseActiveImpersonationInput {
  sessionId?: string | null;
  adminUserId?: string | null;
  endedBy: ImpersonationEndReason;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CloseActiveImpersonationResult {
  sessionId: string;
  adminUserId: string;
  targetUserId: string;
  duration: number;
  endedAt: Date;
}

function normalizeIdentifier(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function getActiveImpersonationLookup({
  sessionId,
  adminUserId,
}: {
  sessionId?: string;
  adminUserId?: string;
}) {
  if (sessionId) {
    return and(
      eq(impersonationSessions.id, sessionId),
      eq(impersonationSessions.isActive, true),
    );
  }

  if (adminUserId) {
    return and(
      eq(impersonationSessions.adminUserId, adminUserId),
      eq(impersonationSessions.isActive, true),
    );
  }

  return undefined;
}

export async function closeActiveImpersonationInExecutor(
  executor: ImpersonationExecutor,
  input: CloseActiveImpersonationInput,
): Promise<CloseActiveImpersonationResult | null> {
  const sessionId = normalizeIdentifier(input.sessionId);
  const adminUserId = normalizeIdentifier(input.adminUserId);
  const lookup = getActiveImpersonationLookup({ sessionId, adminUserId });

  if (!lookup) {
    return null;
  }

  const activeSession = await executor
    .select()
    .from(impersonationSessions)
    .where(lookup)
    .limit(1);

  const session = activeSession[0];
  if (!session) {
    return null;
  }

  const endedAt = new Date();
  const duration = Math.floor(
    (endedAt.getTime() - session.startedAt.getTime()) / 1000,
  );

  await executor
    .update(impersonationSessions)
    .set({
      endedAt,
      isActive: false,
      activeAdminSessionKey: null,
    })
    .where(eq(impersonationSessions.id, session.id));

  await executor.insert(impersonationAuditLog).values({
    id: crypto.randomUUID(),
    impersonationSessionId: session.id,
    actionType: "END",
    actionDetails: JSON.stringify({
      adminUserId: session.adminUserId,
      targetUserId: session.targetUserId,
      duration,
      endedBy: input.endedBy,
    }),
    performedAt: endedAt,
    ipAddress: input.ipAddress ?? undefined,
    userAgent: input.userAgent ?? undefined,
  });

  return {
    sessionId: session.id,
    adminUserId: session.adminUserId,
    targetUserId: session.targetUserId,
    duration,
    endedAt,
  };
}

export async function closeActiveImpersonationSession(
  input: CloseActiveImpersonationInput,
): Promise<CloseActiveImpersonationResult | null> {
  return withDatabaseLockRetry(() =>
    db.transaction(async (tx) =>
      closeActiveImpersonationInExecutor(tx, input),
    ),
  );
}

function readStringField(candidate: unknown, key: string): string | undefined {
  if (
    typeof candidate === "object" &&
    candidate !== null &&
    key in candidate
  ) {
    const value = (candidate as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function extractActiveImpersonationFromToken(token: unknown) {
  if (typeof token !== "object" || token === null || !("impersonation" in token)) {
    return null;
  }

  const impersonation = (token as Record<string, unknown>).impersonation;
  if (
    typeof impersonation !== "object" ||
    impersonation === null ||
    !("isActive" in impersonation) ||
    (impersonation as Record<string, unknown>).isActive !== true
  ) {
    return null;
  }

  const sessionId = readStringField(impersonation, "sessionId");
  const originalAdminId = readStringField(impersonation, "originalAdminId");

  if (!sessionId && !originalAdminId) {
    return null;
  }

  return {
    sessionId,
    adminUserId: originalAdminId,
  };
}

export async function cleanupImpersonationForSignOutToken(
  token: unknown,
): Promise<void> {
  const impersonation = extractActiveImpersonationFromToken(token);
  if (!impersonation) {
    return;
  }

  try {
    const result = await closeActiveImpersonationSession({
      sessionId: impersonation.sessionId,
      adminUserId: impersonation.adminUserId,
      endedBy: "sign_out",
    });

    if (!result) {
      logger.debug("No active impersonation found during sign-out cleanup", {
        sessionId: impersonation.sessionId,
        adminUserId: impersonation.adminUserId,
      });
      return;
    }

    logger.info("Closed impersonation during sign-out", {
      sessionId: result.sessionId,
      adminUserId: result.adminUserId,
      targetUserId: result.targetUserId,
    });
  } catch (error) {
    logger.error("Failed to close impersonation during sign-out", error);
  }
}
