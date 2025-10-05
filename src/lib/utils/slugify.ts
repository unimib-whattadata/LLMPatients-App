
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      
      .replace(/[\s\W-]+/g, "-")
      
      .replace(/^-+|-+$/g, "")
  );
}


export function createPatientSlug(patientName: string): string {
  return slugify(patientName);
}


export function extractPatientIdFromSlug(pathSegment: string): string | null {
  
  const parts = pathSegment.split("-");
  return parts[0] || null;
}
