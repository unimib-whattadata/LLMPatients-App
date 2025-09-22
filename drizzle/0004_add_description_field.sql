-- Migration to add description field to patients table

-- Add the description column
ALTER TABLE `epatient_patient` ADD COLUMN `description` text(500) NOT NULL DEFAULT '';

-- Update existing patients with appropriate descriptions
UPDATE `epatient_patient` SET `description` = 'Terapia per depressione' WHERE `name` = 'Juanita Delgado';
UPDATE `epatient_patient` SET `description` = 'Disturbo dell''adattamento con umore depresso; Disturbo da alimentazione incontrollata; Disfunzione sessuale indotta da sostanze/farmaci' WHERE `name` = 'John';
