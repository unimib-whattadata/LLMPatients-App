CREATE TABLE `epatient_chat` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`virtualPatientId` text(255) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `epatient_user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`virtualPatientId`) REFERENCES `epatient_virtual_patient`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `epatient_message` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`chatId` text(255) NOT NULL,
	`senderId` text(255) NOT NULL,
	`content` text(2000) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `epatient_chat`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`senderId`) REFERENCES `epatient_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `message_chat_id_idx` ON `epatient_message` (`chatId`);--> statement-breakpoint
CREATE INDEX `message_sender_id_idx` ON `epatient_message` (`senderId`);--> statement-breakpoint
CREATE INDEX `message_created_at_idx` ON `epatient_message` (`createdAt`);