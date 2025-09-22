-- Migration: Update chat table structure to match new schema
-- Generated on: 2024-12-19

-- Drop the old chat table and recreate with new structure
DROP TABLE IF EXISTS `epatient_chat`;

-- Create the new chat table with the correct structure
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

-- Create indexes for the new chat table
CREATE INDEX `chat_session_idx` ON `epatient_chat` (`therapySessionId`);
CREATE INDEX `chat_step_number_idx` ON `epatient_chat` (`stepNumber`);
CREATE INDEX `chat_done_idx` ON `epatient_chat` (`done`);
CREATE UNIQUE INDEX `chat_session_step_idx` ON `epatient_chat` (`therapySessionId`,`stepNumber`);
