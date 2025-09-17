CREATE TABLE `epatient_patient_tag_relation` (
	`patientId` text(255) NOT NULL,
	`tagId` text(255) NOT NULL,
	PRIMARY KEY(`patientId`, `tagId`),
	FOREIGN KEY (`patientId`) REFERENCES `epatient_virtual_patient`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tagId`) REFERENCES `epatient_patient_tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `patient_tag_patient_idx` ON `epatient_patient_tag_relation` (`patientId`);--> statement-breakpoint
CREATE INDEX `patient_tag_tag_idx` ON `epatient_patient_tag_relation` (`tagId`);--> statement-breakpoint
CREATE TABLE `epatient_patient_tag` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`label` text(100) NOT NULL,
	`category` text(50) NOT NULL,
	`color` text(20) DEFAULT '#gray' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `patient_tag_category_idx` ON `epatient_patient_tag` (`category`);--> statement-breakpoint
CREATE INDEX `patient_tag_label_idx` ON `epatient_patient_tag` (`label`);--> statement-breakpoint
CREATE TABLE `epatient_virtual_patient` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`age` integer NOT NULL,
	`gender` text(20) NOT NULL,
	`condition` text(500) NOT NULL,
	`background` text(2000) NOT NULL,
	`objectives` text(2000) NOT NULL,
	`avatarUrl` text(500),
	`avatarType` text(20) DEFAULT 'illustration' NOT NULL,
	`difficulty` text(20) NOT NULL,
	`estimatedDuration` integer DEFAULT 30 NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `virtual_patient_difficulty_idx` ON `epatient_virtual_patient` (`difficulty`);--> statement-breakpoint
CREATE INDEX `virtual_patient_active_idx` ON `epatient_virtual_patient` (`isActive`);--> statement-breakpoint
CREATE INDEX `virtual_patient_created_at_idx` ON `epatient_virtual_patient` (`createdAt`);