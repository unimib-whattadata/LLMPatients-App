CREATE TABLE `epatient_account` (
	`userId` text(255) NOT NULL,
	`type` text(255) NOT NULL,
	`provider` text(255) NOT NULL,
	`providerAccountId` text(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text(255),
	`scope` text(255),
	`id_token` text,
	`session_state` text(255),
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `epatient_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `epatient_account` (`userId`);--> statement-breakpoint
CREATE TABLE `epatient_chat` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`therapySessionId` text(255) NOT NULL,
	`stepNumber` integer NOT NULL,
	`messages` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`therapySessionId`) REFERENCES `epatient_therapy_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_session_idx` ON `epatient_chat` (`therapySessionId`);--> statement-breakpoint
CREATE INDEX `chat_step_number_idx` ON `epatient_chat` (`stepNumber`);--> statement-breakpoint
CREATE INDEX `chat_done_idx` ON `epatient_chat` (`done`);--> statement-breakpoint
CREATE UNIQUE INDEX `chat_session_step_idx` ON `epatient_chat` (`therapySessionId`,`stepNumber`);--> statement-breakpoint
CREATE TABLE `epatient_impersonation_audit_log` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`impersonationSessionId` text(255) NOT NULL,
	`actionType` text(50) NOT NULL,
	`actionDetails` text(1000),
	`performedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`ipAddress` text(45),
	`userAgent` text(500),
	`requestPath` text(255),
	`requestMethod` text(10),
	FOREIGN KEY (`impersonationSessionId`) REFERENCES `epatient_impersonation_session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `impersonation_audit_session_idx` ON `epatient_impersonation_audit_log` (`impersonationSessionId`);--> statement-breakpoint
CREATE INDEX `impersonation_audit_action_type_idx` ON `epatient_impersonation_audit_log` (`actionType`);--> statement-breakpoint
CREATE INDEX `impersonation_audit_performed_at_idx` ON `epatient_impersonation_audit_log` (`performedAt`);--> statement-breakpoint
CREATE TABLE `epatient_impersonation_session` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`adminUserId` text(255) NOT NULL,
	`targetUserId` text(255) NOT NULL,
	`startedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`endedAt` integer,
	`isActive` integer DEFAULT true NOT NULL,
	`sessionToken` text(255),
	`ipAddress` text(45),
	`userAgent` text(500),
	`reason` text(500),
	FOREIGN KEY (`adminUserId`) REFERENCES `epatient_user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`targetUserId`) REFERENCES `epatient_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `impersonation_admin_user_idx` ON `epatient_impersonation_session` (`adminUserId`);--> statement-breakpoint
CREATE INDEX `impersonation_target_user_idx` ON `epatient_impersonation_session` (`targetUserId`);--> statement-breakpoint
CREATE INDEX `impersonation_active_idx` ON `epatient_impersonation_session` (`isActive`);--> statement-breakpoint
CREATE INDEX `impersonation_started_at_idx` ON `epatient_impersonation_session` (`startedAt`);--> statement-breakpoint
CREATE TABLE `epatient_patient` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`smallDescription` text(500) NOT NULL,
	`details` text NOT NULL,
	`background` text(2000) NOT NULL,
	`objectives` text(2000) NOT NULL,
	`avatarUrl` text(500),
	`avatarType` text(20) DEFAULT 'illustration' NOT NULL,
	`difficulty` integer NOT NULL,
	`estimatedDuration` integer DEFAULT 30 NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `virtual_patient_difficulty_idx` ON `epatient_patient` (`difficulty`);--> statement-breakpoint
CREATE INDEX `virtual_patient_active_idx` ON `epatient_patient` (`isActive`);--> statement-breakpoint
CREATE INDEX `virtual_patient_created_at_idx` ON `epatient_patient` (`createdAt`);--> statement-breakpoint
CREATE INDEX `virtual_patient_name_idx` ON `epatient_patient` (`name`);--> statement-breakpoint
CREATE TABLE `epatient_session` (
	`sessionToken` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `epatient_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `epatient_session` (`userId`);--> statement-breakpoint
CREATE TABLE `epatient_therapy_session` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`patientId` text(255) NOT NULL,
	`sessionNumber` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `epatient_user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patientId`) REFERENCES `epatient_patient`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `therapy_session_user_idx` ON `epatient_therapy_session` (`userId`);--> statement-breakpoint
CREATE INDEX `therapy_session_patient_idx` ON `epatient_therapy_session` (`patientId`);--> statement-breakpoint
CREATE INDEX `therapy_session_updated_at_idx` ON `epatient_therapy_session` (`updatedAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `therapy_session_user_patient_idx` ON `epatient_therapy_session` (`userId`,`patientId`);--> statement-breakpoint
CREATE TABLE `epatient_user_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`activityType` text(50) NOT NULL,
	`metadata` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `epatient_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_activity_user_id_idx` ON `epatient_user_activity` (`userId`);--> statement-breakpoint
CREATE INDEX `user_activity_type_idx` ON `epatient_user_activity` (`activityType`);--> statement-breakpoint
CREATE TABLE `epatient_user` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255),
	`email` text(255) NOT NULL,
	`password` text(255),
	`role` text(20) DEFAULT 'user' NOT NULL,
	`emailVerified` integer DEFAULT (unixepoch()),
	`image` text(255)
);
--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `epatient_user` (`email`);--> statement-breakpoint
CREATE INDEX `users_name_idx` ON `epatient_user` (`name`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `epatient_user` (`role`);--> statement-breakpoint
CREATE TABLE `epatient_verification_token` (
	`identifier` text(255) NOT NULL,
	`token` text(255) NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
