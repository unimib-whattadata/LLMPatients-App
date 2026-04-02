CREATE INDEX "impersonation_admin_started_idx" ON "llmpatient_impersonation_session" USING btree ("adminUserId","startedAt");--> statement-breakpoint
CREATE INDEX "impersonation_target_started_idx" ON "llmpatient_impersonation_session" USING btree ("targetUserId","startedAt");--> statement-breakpoint
CREATE INDEX "virtual_patient_active_difficulty_name_idx" ON "llmpatient_patient" USING btree ("isActive","difficulty","name");--> statement-breakpoint
CREATE INDEX "user_activity_type_created_user_idx" ON "llmpatient_userActivity" USING btree ("activityType","createdAt","userId");--> statement-breakpoint
CREATE INDEX "user_activity_user_created_idx" ON "llmpatient_userActivity" USING btree ("userId","createdAt");