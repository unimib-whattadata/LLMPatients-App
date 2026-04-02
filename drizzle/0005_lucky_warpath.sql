ALTER TABLE `llmpatient_therapy_session` ADD `externalPatientId` text(255);--> statement-breakpoint
ALTER TABLE `llmpatient_therapy_session` ADD `activePatientSessionKey` text(255);--> statement-breakpoint
UPDATE `llmpatient_therapy_session`
SET `externalPatientId` = (
  SELECT `externalPatientId`
  FROM `llmpatient_patient`
  WHERE `llmpatient_patient`.`id` = `llmpatient_therapy_session`.`patientId`
)
WHERE `externalPatientId` IS NULL;--> statement-breakpoint
UPDATE `llmpatient_therapy_session`
SET `activePatientSessionKey` = `userId` || ':' || `patientId`
WHERE `isCompleted` = 0;--> statement-breakpoint
DROP INDEX `therapy_session_user_patient_idx`;--> statement-breakpoint
CREATE INDEX `therapy_session_user_patient_created_idx` ON `llmpatient_therapy_session` (`userId`,`patientId`,`createdAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `therapy_session_active_user_patient_idx` ON `llmpatient_therapy_session` (`activePatientSessionKey`);
