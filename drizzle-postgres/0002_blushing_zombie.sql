ALTER TABLE "llmpatient_userActivity" RENAME COLUMN "action" TO "activityType";--> statement-breakpoint
ALTER TABLE "llmpatient_userActivity" RENAME COLUMN "details" TO "metadata";--> statement-breakpoint
ALTER TABLE "llmpatient_userActivity" ALTER COLUMN "metadata" TYPE text USING CASE WHEN "metadata" IS NULL THEN NULL ELSE "metadata"::text END;--> statement-breakpoint
ALTER TABLE "llmpatient_user" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "llmpatient_user" ALTER COLUMN "role" SET DEFAULT 'user';--> statement-breakpoint
UPDATE "llmpatient_user"
SET "role" = 'user'
WHERE "role" IS NULL OR "role" NOT IN ('admin', 'user');--> statement-breakpoint
ALTER TABLE "llmpatient_impersonation_session" ADD COLUMN "activeAdminSessionKey" text;--> statement-breakpoint
ALTER TABLE "llmpatient_patient" ADD COLUMN "chatterboxVoiceId" text;--> statement-breakpoint
CREATE UNIQUE INDEX "impersonation_active_admin_key_idx" ON "llmpatient_impersonation_session" USING btree ("activeAdminSessionKey");--> statement-breakpoint
CREATE INDEX "user_activity_user_id_idx" ON "llmpatient_userActivity" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "user_activity_type_idx" ON "llmpatient_userActivity" USING btree ("activityType");--> statement-breakpoint
CREATE INDEX "user_activity_created_at_idx" ON "llmpatient_userActivity" USING btree ("createdAt");--> statement-breakpoint
ALTER TABLE "llmpatient_userActivity" DROP COLUMN "resource";
