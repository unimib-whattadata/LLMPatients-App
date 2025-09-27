/**
 * Utility functions for creating URL-friendly slugs from patient names
 */

/**
 * Converts a string to a URL-friendly slug
 *
 * @param text - The text to convert to a slug
 * @returns URL-friendly slug
 */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Replace spaces and special characters with hyphens
      .replace(/[\s\W-]+/g, "-")
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, "")
  );
}

/**
 * Creates a URL-friendly patient name slug
 *
 * @param patientName - The patient's name
 * @returns URL-friendly slug for the patient name
 */
export function createPatientSlug(patientName: string): string {
  return slugify(patientName);
}

/**
 * Extracts patient ID from a URL path that may contain both ID and name
 *
 * @param pathSegment - The path segment (e.g., "patient-id-patient-name")
 * @returns The patient ID (first part before the first hyphen)
 */
export function extractPatientIdFromSlug(pathSegment: string): string | null {
  // Split by hyphen and take the first part as the ID
  const parts = pathSegment.split("-");
  return parts[0] || null;
}
