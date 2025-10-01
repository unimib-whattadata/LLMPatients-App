CREATE TABLE "llmpatient_impersonation_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"impersonationSessionId" text NOT NULL,
	"actionType" text NOT NULL,
	"actionDetails" text,
	"performedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"requestPath" text,
	"requestMethod" text
);
--> statement-breakpoint
CREATE TABLE "llmpatient_impersonation_session" (
	"id" text PRIMARY KEY NOT NULL,
	"adminUserId" text NOT NULL,
	"targetUserId" text NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"sessionToken" text,
	"ipAddress" text,
	"userAgent" text,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "llmpatient_patient" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"smallDescription" text NOT NULL,
	"details" text NOT NULL,
	"background" text NOT NULL,
	"objectives" text NOT NULL,
	"avatarUrl" text,
	"avatarType" text DEFAULT 'illustration' NOT NULL,
	"difficulty" integer NOT NULL,
	"estimatedDuration" integer DEFAULT 30 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"externalPatientId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "llmpatient_therapy_session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"patientId" text NOT NULL,
	"sessionNumber" integer DEFAULT 1 NOT NULL,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "llmpatient_patients" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "llmpatient_therapySessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "llmpatient_patients" CASCADE;--> statement-breakpoint
DROP TABLE "llmpatient_therapySessions" CASCADE;--> statement-breakpoint
ALTER TABLE "llmpatient_chat" DROP CONSTRAINT "llmpatient_chat_sessionId_llmpatient_therapySessions_id_fk";
--> statement-breakpoint
ALTER TABLE "llmpatient_chat" DROP CONSTRAINT "llmpatient_chat_senderId_llmpatient_user_id_fk";
--> statement-breakpoint
DROP INDEX "chat_sessionId_idx";--> statement-breakpoint
DROP INDEX "chat_senderId_idx";--> statement-breakpoint
DROP INDEX "chat_createdAt_idx";--> statement-breakpoint
ALTER TABLE "llmpatient_chat" ADD COLUMN "therapySessionId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "llmpatient_chat" ADD COLUMN "stepNumber" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "llmpatient_chat" ADD COLUMN "messages" text NOT NULL;--> statement-breakpoint
ALTER TABLE "llmpatient_chat" ADD COLUMN "done" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "llmpatient_chat" ADD COLUMN "updatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "llmpatient_impersonation_audit_log" ADD CONSTRAINT "llmpatient_impersonation_audit_log_impersonationSessionId_llmpatient_impersonation_session_id_fk" FOREIGN KEY ("impersonationSessionId") REFERENCES "public"."llmpatient_impersonation_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llmpatient_impersonation_session" ADD CONSTRAINT "llmpatient_impersonation_session_adminUserId_llmpatient_user_id_fk" FOREIGN KEY ("adminUserId") REFERENCES "public"."llmpatient_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llmpatient_impersonation_session" ADD CONSTRAINT "llmpatient_impersonation_session_targetUserId_llmpatient_user_id_fk" FOREIGN KEY ("targetUserId") REFERENCES "public"."llmpatient_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llmpatient_therapy_session" ADD CONSTRAINT "llmpatient_therapy_session_userId_llmpatient_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."llmpatient_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llmpatient_therapy_session" ADD CONSTRAINT "llmpatient_therapy_session_patientId_llmpatient_patient_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."llmpatient_patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "impersonation_audit_session_idx" ON "llmpatient_impersonation_audit_log" USING btree ("impersonationSessionId");--> statement-breakpoint
CREATE INDEX "impersonation_audit_action_type_idx" ON "llmpatient_impersonation_audit_log" USING btree ("actionType");--> statement-breakpoint
CREATE INDEX "impersonation_audit_performed_at_idx" ON "llmpatient_impersonation_audit_log" USING btree ("performedAt");--> statement-breakpoint
CREATE INDEX "impersonation_admin_user_idx" ON "llmpatient_impersonation_session" USING btree ("adminUserId");--> statement-breakpoint
CREATE INDEX "impersonation_target_user_idx" ON "llmpatient_impersonation_session" USING btree ("targetUserId");--> statement-breakpoint
CREATE INDEX "impersonation_active_idx" ON "llmpatient_impersonation_session" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "impersonation_started_at_idx" ON "llmpatient_impersonation_session" USING btree ("startedAt");--> statement-breakpoint
CREATE INDEX "virtual_patient_difficulty_idx" ON "llmpatient_patient" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "virtual_patient_active_idx" ON "llmpatient_patient" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "virtual_patient_created_at_idx" ON "llmpatient_patient" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "virtual_patient_name_idx" ON "llmpatient_patient" USING btree ("name");--> statement-breakpoint
CREATE INDEX "virtual_patient_external_id_idx" ON "llmpatient_patient" USING btree ("externalPatientId");--> statement-breakpoint
CREATE INDEX "therapy_session_user_idx" ON "llmpatient_therapy_session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "therapy_session_patient_idx" ON "llmpatient_therapy_session" USING btree ("patientId");--> statement-breakpoint
CREATE INDEX "therapy_session_updated_at_idx" ON "llmpatient_therapy_session" USING btree ("updatedAt");--> statement-breakpoint
CREATE INDEX "therapy_session_completed_idx" ON "llmpatient_therapy_session" USING btree ("isCompleted");--> statement-breakpoint
CREATE UNIQUE INDEX "therapy_session_user_patient_idx" ON "llmpatient_therapy_session" USING btree ("userId","patientId");--> statement-breakpoint
ALTER TABLE "llmpatient_chat" ADD CONSTRAINT "llmpatient_chat_therapySessionId_llmpatient_therapy_session_id_fk" FOREIGN KEY ("therapySessionId") REFERENCES "public"."llmpatient_therapy_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_session_idx" ON "llmpatient_chat" USING btree ("therapySessionId");--> statement-breakpoint
CREATE INDEX "chat_step_number_idx" ON "llmpatient_chat" USING btree ("stepNumber");--> statement-breakpoint
CREATE INDEX "chat_done_idx" ON "llmpatient_chat" USING btree ("done");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_session_step_idx" ON "llmpatient_chat" USING btree ("therapySessionId","stepNumber");--> statement-breakpoint
ALTER TABLE "llmpatient_chat" DROP COLUMN "sessionId";--> statement-breakpoint
ALTER TABLE "llmpatient_chat" DROP COLUMN "senderId";--> statement-breakpoint
ALTER TABLE "llmpatient_chat" DROP COLUMN "message";--> statement-breakpoint
ALTER TABLE "llmpatient_chat" DROP COLUMN "messageType";--> statement-breakpoint
ALTER TABLE "llmpatient_chat" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "llmpatient_chat" DROP COLUMN "isRead";