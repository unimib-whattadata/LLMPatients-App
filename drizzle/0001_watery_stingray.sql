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
CREATE INDEX `impersonation_started_at_idx` ON `epatient_impersonation_session` (`startedAt`);