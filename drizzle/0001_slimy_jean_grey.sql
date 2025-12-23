ALTER TABLE `llmpatient_patient` ADD `elevenlabsVoiceId` text(255);--> statement-breakpoint
ALTER TABLE `llmpatient_patient` ADD `vibevoiceVoiceId` text(255);--> statement-breakpoint
UPDATE `llmpatient_patient`
SET `elevenlabsVoiceId` = `voiceId`
WHERE `voiceId` IS NOT NULL
  AND (`elevenlabsVoiceId` IS NULL OR `elevenlabsVoiceId` = '');