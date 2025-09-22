-- Migration to convert difficulty from string to integer values
-- Facile -> 1, Medio -> 2, Difficile -> 3

-- Create a new table with integer difficulty
CREATE TABLE `epatient_patient_new` (
  `id` text(255) PRIMARY KEY NOT NULL,
  `name` text(255) NOT NULL,
  `details` text NOT NULL,
  `background` text(2000) NOT NULL,
  `objectives` text(2000) NOT NULL,
  `avatarUrl` text(500),
  `avatarType` text(20) DEFAULT 'illustration' NOT NULL,
  `difficulty` integer NOT NULL,
  `estimatedDuration` integer DEFAULT 30 NOT NULL,
  `isActive` integer DEFAULT true NOT NULL,
  `createdAt` integer DEFAULT (unixepoch()) NOT NULL,
  `updatedAt` integer
);

-- Copy data with converted difficulty values
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
  CASE 
    WHEN `difficulty` = 'Facile' THEN 1
    WHEN `difficulty` = 'Medio' THEN 2
    WHEN `difficulty` = 'Difficile' THEN 3
    ELSE 2 -- Default to Medio if unknown value
  END as `difficulty`,
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