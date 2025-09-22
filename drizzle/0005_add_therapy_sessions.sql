CREATE TABLE `epatient_therapy_session` (
  `id` text PRIMARY KEY NOT NULL,
  `userId` text NOT NULL,
  `patientId` text NOT NULL,
  `sessionNumber` integer DEFAULT 1 NOT NULL,
  `createdAt` integer DEFAULT (unixepoch()) NOT NULL,
  `updatedAt` integer,
  FOREIGN KEY (`userId`) REFERENCES `epatient_user`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`patientId`) REFERENCES `epatient_patient`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `therapy_session_user_idx` ON `epatient_therapy_session` (`userId`);
CREATE INDEX `therapy_session_patient_idx` ON `epatient_therapy_session` (`patientId`);
CREATE UNIQUE INDEX `therapy_session_user_patient_idx` ON `epatient_therapy_session` (`userId`,`patientId`);
