import { and, eq } from "drizzle-orm";

import type { AppDb } from "~/server/db";
import { therapySessions } from "~/server/db/tables";

export type OwnedTherapySession = {
  id: string;
  patientId: string;
  externalPatientId: string | null;
};

export function getActivePatientSessionKey(userId: string, patientId: string) {
  return `${userId}:${patientId}`;
}

export async function getOwnedTherapySession(
  db: AppDb,
  input: {
    therapySessionId: string;
    userId: string;
  },
): Promise<OwnedTherapySession | null> {
  const rows = await db
    .select({
      id: therapySessions.id,
      patientId: therapySessions.patientId,
      externalPatientId: therapySessions.externalPatientId,
    })
    .from(therapySessions)
    .where(
      and(
        eq(therapySessions.id, input.therapySessionId),
        eq(therapySessions.userId, input.userId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function requireOwnedTherapySession(
  db: AppDb,
  input: {
    therapySessionId: string;
    userId: string;
  },
): Promise<OwnedTherapySession> {
  const therapySession = await getOwnedTherapySession(db, input);

  if (!therapySession) {
    throw new Error("Therapy session not found or access denied");
  }

  return therapySession;
}
