ALTER TABLE "llmpatient_therapy_session" ADD COLUMN "externalPatientId" text;--> statement-breakpoint
ALTER TABLE "llmpatient_therapy_session" ADD COLUMN "activePatientSessionKey" text;--> statement-breakpoint
UPDATE "llmpatient_therapy_session" AS ts
SET "externalPatientId" = p."externalPatientId"
FROM "llmpatient_patient" AS p
WHERE p."id" = ts."patientId"
  AND ts."externalPatientId" IS NULL;--> statement-breakpoint
UPDATE "llmpatient_therapy_session"
SET "activePatientSessionKey" = "userId" || ':' || "patientId"
WHERE "isCompleted" = false;--> statement-breakpoint
DROP INDEX "therapy_session_user_patient_idx";--> statement-breakpoint
CREATE INDEX "therapy_session_user_patient_created_idx" ON "llmpatient_therapy_session" USING btree ("userId","patientId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "therapy_session_active_user_patient_idx" ON "llmpatient_therapy_session" USING btree ("activePatientSessionKey");
