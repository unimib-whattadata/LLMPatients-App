-- Migration to update patient table schema
-- Remove age, gender, condition fields and add details JSON field

-- First, add the details column
ALTER TABLE `epatient_patient` ADD COLUMN `details` text NOT NULL DEFAULT '{}';

-- Update existing data to move age, gender, condition into details JSON
UPDATE `epatient_patient` SET `details` = json_object(
  'demographic_sociocultural_information', json_object(
    'age', `age`,
    'gender', `gender`
  ),
  'psychological_profile_and_cognitive_functioning', json_object(
    'current_and_past_psychiatric_diagnoses', `condition`
  )
);

-- Remove the old columns
-- Note: SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
-- First, create a backup table with the new schema
CREATE TABLE `epatient_patient_new` (
  `id` text(255) PRIMARY KEY NOT NULL,
  `name` text(255) NOT NULL,
  `details` text NOT NULL,
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

-- Copy data from old table to new table
INSERT INTO `epatient_patient_new` (
  `id`,
  `name`,
  `details`,
  `background`,
  `objectives`,
  `avatarUrl`,
  `avatarType`,
  `difficulty`,
  `estimatedDuration`,
  `isActive`,
  `createdAt`,
  `updatedAt`
)
SELECT 
  `id`,
  `name`,
  `details`,
  `background`,
  `objectives`,
  `avatarUrl`,
  `avatarType`,
  `difficulty`,
  `estimatedDuration`,
  `isActive`,
  `createdAt`,
  `updatedAt`
FROM `epatient_patient`;

-- Drop the old table
DROP TABLE `epatient_patient`;

-- Rename the new table
ALTER TABLE `epatient_patient_new` RENAME TO `epatient_patient`;

-- Recreate indexes
CREATE INDEX `virtual_patient_difficulty_idx` ON `epatient_patient` (`difficulty`);
CREATE INDEX `virtual_patient_active_idx` ON `epatient_patient` (`isActive`);
CREATE INDEX `virtual_patient_created_at_idx` ON `epatient_patient` (`createdAt`);
