-- Rename all tables from epatient_ prefix to llmpatient_ prefix
-- This migration renames all existing tables to use the new naming convention

-- Rename account table
ALTER TABLE `epatient_account` RENAME TO `llmpatient_account`;

-- Rename chat table  
ALTER TABLE `epatient_chat` RENAME TO `llmpatient_chat`;

-- Rename impersonation_audit_log table
ALTER TABLE `epatient_impersonation_audit_log` RENAME TO `llmpatient_impersonation_audit_log`;

-- Rename impersonation_session table
ALTER TABLE `epatient_impersonation_session` RENAME TO `llmpatient_impersonation_session`;

-- Rename patient table
ALTER TABLE `epatient_patient` RENAME TO `llmpatient_patient`;

-- Rename session table
ALTER TABLE `epatient_session` RENAME TO `llmpatient_session`;

-- Rename therapy_session table
ALTER TABLE `epatient_therapy_session` RENAME TO `llmpatient_therapy_session`;

-- Rename user_activity table
ALTER TABLE `epatient_user_activity` RENAME TO `llmpatient_user_activity`;

-- Rename user table
ALTER TABLE `epatient_user` RENAME TO `llmpatient_user`;

-- Rename verification_token table
ALTER TABLE `epatient_verification_token` RENAME TO `llmpatient_verification_token`;

-- Update foreign key constraints to reference new table names
-- Note: SQLite doesn't support direct foreign key constraint renaming,
-- but the constraints will work with the new table names
