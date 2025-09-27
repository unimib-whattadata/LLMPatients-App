/**
 * Patient Attributes Page
 *
 * Displays the structured psychological evaluation schema fields
 * from patient-details.json in a user-friendly format.
 *
 * @description Server-side rendered page that handles authentication
 * and renders the patient attributes interface for viewing evaluation schemas.
 * Only accessible to authenticated users.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { PatientDetailsContent } from "@/components/features/dashboard/PatientDetailsContent";

/**
 * Patient Attributes Page Component
 *
 * Handles authentication and renders patient attributes interface.
 * Redirects unauthenticated users to login page.
 */
export default async function PatientAttributesPage() {
  // Check authentication server-side
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect("/login");
  }

  return (
    <SharedLayout
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role || "user",
        image: session.user.image,
      }}
      impersonation={session.impersonation ?? undefined}
      layoutType="dashboard"
      currentPage="/dashboard/patient-attributes"
    >
      <PatientDetailsContent />
    </SharedLayout>
  );
}
