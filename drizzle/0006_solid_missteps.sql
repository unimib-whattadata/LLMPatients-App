CREATE TABLE `llmpatient_chat_step_evaluation` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`therapySessionId` text(255) NOT NULL,
	`stepNumber` integer NOT NULL,
	`status` text(32) DEFAULT 'processing' NOT NULL,
	`analysisMode` text(32) DEFAULT 'heuristic' NOT NULL,
	`modelName` text(255),
	`detectorVersion` text(64) NOT NULL,
	`resultJson` text,
	`errorMessage` text,
	`analyzedAt` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`therapySessionId`) REFERENCES `llmpatient_therapy_session`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `chat_step_evaluation_session_idx` ON `llmpatient_chat_step_evaluation` (`therapySessionId`);--> statement-breakpoint
CREATE INDEX `chat_step_evaluation_status_idx` ON `llmpatient_chat_step_evaluation` (`status`);--> statement-breakpoint
CREATE INDEX `chat_step_evaluation_analyzed_at_idx` ON `llmpatient_chat_step_evaluation` (`analyzedAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `chat_step_evaluation_session_step_idx` ON `llmpatient_chat_step_evaluation` (`therapySessionId`,`stepNumber`);
