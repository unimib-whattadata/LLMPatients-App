PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_llmpatient_chat` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`therapySessionId` text(255) NOT NULL,
	`stepNumber` integer NOT NULL,
	`messages` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`therapySessionId`) REFERENCES `llmpatient_therapy_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_llmpatient_chat`("id", "therapySessionId", "stepNumber", "messages", "done", "createdAt", "updatedAt") SELECT "id", "therapySessionId", "stepNumber", "messages", "done", "createdAt", "updatedAt" FROM `llmpatient_chat`;--> statement-breakpoint
DROP TABLE `llmpatient_chat`;--> statement-breakpoint
ALTER TABLE `__new_llmpatient_chat` RENAME TO `llmpatient_chat`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `chat_session_idx` ON `llmpatient_chat` (`therapySessionId`);--> statement-breakpoint
CREATE INDEX `chat_step_number_idx` ON `llmpatient_chat` (`stepNumber`);--> statement-breakpoint
CREATE INDEX `chat_done_idx` ON `llmpatient_chat` (`done`);--> statement-breakpoint
CREATE UNIQUE INDEX `chat_session_step_idx` ON `llmpatient_chat` (`therapySessionId`,`stepNumber`);--> statement-breakpoint
CREATE TABLE `__new_llmpatient_impersonation_audit_log` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`impersonationSessionId` text(255) NOT NULL,
	`actionType` text(50) NOT NULL,
	`actionDetails` text(1000),
	`performedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`ipAddress` text(45),
	`userAgent` text(500),
	`requestPath` text(255),
	`requestMethod` text(10),
	FOREIGN KEY (`impersonationSessionId`) REFERENCES `llmpatient_impersonation_session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_llmpatient_impersonation_audit_log`("id", "impersonationSessionId", "actionType", "actionDetails", "performedAt", "ipAddress", "userAgent", "requestPath", "requestMethod") SELECT "id", "impersonationSessionId", "actionType", "actionDetails", "performedAt", "ipAddress", "userAgent", "requestPath", "requestMethod" FROM `llmpatient_impersonation_audit_log`;--> statement-breakpoint
DROP TABLE `llmpatient_impersonation_audit_log`;--> statement-breakpoint
ALTER TABLE `__new_llmpatient_impersonation_audit_log` RENAME TO `llmpatient_impersonation_audit_log`;--> statement-breakpoint
CREATE INDEX `impersonation_audit_session_idx` ON `llmpatient_impersonation_audit_log` (`impersonationSessionId`);--> statement-breakpoint
CREATE INDEX `impersonation_audit_action_type_idx` ON `llmpatient_impersonation_audit_log` (`actionType`);--> statement-breakpoint
CREATE INDEX `impersonation_audit_performed_at_idx` ON `llmpatient_impersonation_audit_log` (`performedAt`);--> statement-breakpoint
CREATE TABLE `__new_llmpatient_impersonation_session` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`adminUserId` text(255) NOT NULL,
	`targetUserId` text(255) NOT NULL,
	`startedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`endedAt` integer,
	`isActive` integer DEFAULT true NOT NULL,
	`sessionToken` text(255),
	`ipAddress` text(45),
	`userAgent` text(500),
	`reason` text(500),
	FOREIGN KEY (`adminUserId`) REFERENCES `llmpatient_user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`targetUserId`) REFERENCES `llmpatient_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_llmpatient_impersonation_session`("id", "adminUserId", "targetUserId", "startedAt", "endedAt", "isActive", "sessionToken", "ipAddress", "userAgent", "reason") SELECT "id", "adminUserId", "targetUserId", "startedAt", "endedAt", "isActive", "sessionToken", "ipAddress", "userAgent", "reason" FROM `llmpatient_impersonation_session`;--> statement-breakpoint
DROP TABLE `llmpatient_impersonation_session`;--> statement-breakpoint
ALTER TABLE `__new_llmpatient_impersonation_session` RENAME TO `llmpatient_impersonation_session`;--> statement-breakpoint
CREATE INDEX `impersonation_admin_user_idx` ON `llmpatient_impersonation_session` (`adminUserId`);--> statement-breakpoint
CREATE INDEX `impersonation_target_user_idx` ON `llmpatient_impersonation_session` (`targetUserId`);--> statement-breakpoint
CREATE INDEX `impersonation_active_idx` ON `llmpatient_impersonation_session` (`isActive`);--> statement-breakpoint
CREATE INDEX `impersonation_started_at_idx` ON `llmpatient_impersonation_session` (`startedAt`);--> statement-breakpoint
CREATE TABLE `__new_llmpatient_patient` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`age` integer NOT NULL,
	`smallDescription` text(500) NOT NULL,
	`details` text NOT NULL,
	`clinicalCase` text NOT NULL,
	`objectives` text(2000) NOT NULL,
	`therapeuticJourney` text NOT NULL,
	`avatarUrl` text(500),
	`voiceId` text(255),
	`welcomeMessage` text(1000),
	`difficulty` integer NOT NULL,
	`estimatedDuration` integer DEFAULT 30 NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`externalPatientId` text(255),
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
INSERT INTO `__new_llmpatient_patient`("id", "name", "age", "smallDescription", "details", "clinicalCase", "objectives", "therapeuticJourney", "avatarUrl", "voiceId", "welcomeMessage", "difficulty", "estimatedDuration", "isActive", "externalPatientId", "createdAt", "updatedAt") SELECT "id", "name", "age", "smallDescription", "details", "clinicalCase", "objectives", "therapeuticJourney", "avatarUrl", "voiceId", "welcomeMessage", "difficulty", "estimatedDuration", "isActive", "externalPatientId", "createdAt", "updatedAt" FROM `llmpatient_patient`;--> statement-breakpoint
DROP TABLE `llmpatient_patient`;--> statement-breakpoint
ALTER TABLE `__new_llmpatient_patient` RENAME TO `llmpatient_patient`;--> statement-breakpoint
CREATE INDEX `virtual_patient_difficulty_idx` ON `llmpatient_patient` (`difficulty`);--> statement-breakpoint
CREATE INDEX `virtual_patient_active_idx` ON `llmpatient_patient` (`isActive`);--> statement-breakpoint
CREATE INDEX `virtual_patient_created_at_idx` ON `llmpatient_patient` (`createdAt`);--> statement-breakpoint
CREATE INDEX `virtual_patient_name_idx` ON `llmpatient_patient` (`name`);--> statement-breakpoint
CREATE INDEX `virtual_patient_external_id_idx` ON `llmpatient_patient` (`externalPatientId`);--> statement-breakpoint
CREATE TABLE `__new_llmpatient_therapy_session` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`patientId` text(255) NOT NULL,
	`sessionNumber` integer DEFAULT 1 NOT NULL,
	`isCompleted` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `llmpatient_user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patientId`) REFERENCES `llmpatient_patient`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_llmpatient_therapy_session`("id", "userId", "patientId", "sessionNumber", "isCompleted", "createdAt", "updatedAt") SELECT "id", "userId", "patientId", "sessionNumber", "isCompleted", "createdAt", "updatedAt" FROM `llmpatient_therapy_session`;--> statement-breakpoint
DROP TABLE `llmpatient_therapy_session`;--> statement-breakpoint
ALTER TABLE `__new_llmpatient_therapy_session` RENAME TO `llmpatient_therapy_session`;--> statement-breakpoint
CREATE INDEX `therapy_session_user_idx` ON `llmpatient_therapy_session` (`userId`);--> statement-breakpoint
CREATE INDEX `therapy_session_patient_idx` ON `llmpatient_therapy_session` (`patientId`);--> statement-breakpoint
CREATE INDEX `therapy_session_updated_at_idx` ON `llmpatient_therapy_session` (`updatedAt`);--> statement-breakpoint
CREATE INDEX `therapy_session_completed_idx` ON `llmpatient_therapy_session` (`isCompleted`);--> statement-breakpoint
CREATE UNIQUE INDEX `therapy_session_user_patient_idx` ON `llmpatient_therapy_session` (`userId`,`patientId`);--> statement-breakpoint
CREATE TABLE `__new_llmpatient_user_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`activityType` text(50) NOT NULL,
	`metadata` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `llmpatient_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_llmpatient_user_activity`("id", "userId", "activityType", "metadata", "createdAt") SELECT "id", "userId", "activityType", "metadata", "createdAt" FROM `llmpatient_user_activity`;--> statement-breakpoint
DROP TABLE `llmpatient_user_activity`;--> statement-breakpoint
ALTER TABLE `__new_llmpatient_user_activity` RENAME TO `llmpatient_user_activity`;--> statement-breakpoint
CREATE INDEX `user_activity_user_id_idx` ON `llmpatient_user_activity` (`userId`);--> statement-breakpoint
CREATE INDEX `user_activity_type_idx` ON `llmpatient_user_activity` (`activityType`);--> statement-breakpoint
CREATE TABLE `__new_llmpatient_user` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255),
	`email` text(255) NOT NULL,
	`password` text(255),
	`role` text(20) DEFAULT 'user' NOT NULL,
	`emailVerified` integer DEFAULT (strftime('%s', 'now')),
	`image` text(255)
);
--> statement-breakpoint
INSERT INTO `__new_llmpatient_user`("id", "name", "email", "password", "role", "emailVerified", "image") SELECT "id", "name", "email", "password", "role", "emailVerified", "image" FROM `llmpatient_user`;--> statement-breakpoint
DROP TABLE `llmpatient_user`;--> statement-breakpoint
ALTER TABLE `__new_llmpatient_user` RENAME TO `llmpatient_user`;--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `llmpatient_user` (`email`);--> statement-breakpoint
CREATE INDEX `users_name_idx` ON `llmpatient_user` (`name`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `llmpatient_user` (`role`);