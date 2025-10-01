ALTER TABLE `llmpatient_patient` ADD `externalPatientId` text(255);--> statement-breakpoint
CREATE INDEX `virtual_patient_external_id_idx` ON `llmpatient_patient` (`externalPatientId`);