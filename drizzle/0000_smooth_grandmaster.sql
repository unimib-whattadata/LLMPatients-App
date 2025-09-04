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
CREATE TABLE `epatient_post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256),
	`createdById` text(255) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`createdById`) REFERENCES `epatient_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `epatient_post` (`createdById`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `epatient_post` (`name`);--> statement-breakpoint
CREATE TABLE `epatient_session` (
	`sessionToken` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `epatient_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `epatient_session` (`userId`);--> statement-breakpoint
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
CREATE TABLE `epatient_verification_token` (
	`identifier` text(255) NOT NULL,
	`token` text(255) NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
