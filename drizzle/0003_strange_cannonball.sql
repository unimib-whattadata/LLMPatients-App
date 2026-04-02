PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_llmpatient_user_activity` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`activityType` text(50) NOT NULL,
	`metadata` text,
	`ipAddress` text(45),
	`userAgent` text(500),
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `llmpatient_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_llmpatient_user_activity`("id", "userId", "activityType", "metadata", "ipAddress", "userAgent", "createdAt")
SELECT CAST("id" AS TEXT), "userId", "activityType", "metadata", NULL, NULL, "createdAt"
FROM `llmpatient_user_activity`;--> statement-breakpoint
DROP TABLE `llmpatient_user_activity`;--> statement-breakpoint
ALTER TABLE `__new_llmpatient_user_activity` RENAME TO `llmpatient_user_activity`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `user_activity_user_id_idx` ON `llmpatient_user_activity` (`userId`);--> statement-breakpoint
CREATE INDEX `user_activity_type_idx` ON `llmpatient_user_activity` (`activityType`);--> statement-breakpoint
CREATE INDEX `user_activity_created_at_idx` ON `llmpatient_user_activity` (`createdAt`);--> statement-breakpoint
DROP INDEX `users_email_idx`;--> statement-breakpoint
ALTER TABLE `llmpatient_user` ADD `isActive` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `llmpatient_user` ADD `createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `llmpatient_user` ADD `updatedAt` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique_idx` ON `llmpatient_user` (`email`);--> statement-breakpoint
CREATE INDEX `users_active_idx` ON `llmpatient_user` (`isActive`);--> statement-breakpoint
ALTER TABLE `llmpatient_impersonation_session` ADD `activeAdminSessionKey` text(255);--> statement-breakpoint
CREATE UNIQUE INDEX `impersonation_active_admin_key_idx` ON `llmpatient_impersonation_session` (`activeAdminSessionKey`);--> statement-breakpoint
ALTER TABLE `llmpatient_patient` ADD `chatterboxVoiceId` text(255);
