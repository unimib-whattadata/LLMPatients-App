ALTER TABLE "llmpatient_chat" ALTER COLUMN "createdAt" SET DEFAULT '2025-10-01 16:26:23.533';--> statement-breakpoint
ALTER TABLE "llmpatient_impersonation_audit_log" ALTER COLUMN "performedAt" SET DEFAULT '2025-10-01 16:26:23.533';--> statement-breakpoint
ALTER TABLE "llmpatient_impersonation_session" ALTER COLUMN "startedAt" SET DEFAULT '2025-10-01 16:26:23.533';--> statement-breakpoint
ALTER TABLE "llmpatient_patient" ALTER COLUMN "createdAt" SET DEFAULT '2025-10-01 16:26:23.533';--> statement-breakpoint
ALTER TABLE "llmpatient_therapy_session" ALTER COLUMN "createdAt" SET DEFAULT '2025-10-01 16:26:23.533';--> statement-breakpoint
ALTER TABLE "llmpatient_user_activity" ALTER COLUMN "createdAt" SET DEFAULT '2025-10-01 16:26:23.533';--> statement-breakpoint
ALTER TABLE "llmpatient_user" ALTER COLUMN "emailVerified" SET DEFAULT '2025-10-01 16:26:23.532';--> statement-breakpoint
ALTER TABLE "llmpatient_patient" ADD COLUMN "externalPatientId" text;--> statement-breakpoint
CREATE INDEX "virtual_patient_external_id_idx" ON "llmpatient_patient" USING btree ("externalPatientId");