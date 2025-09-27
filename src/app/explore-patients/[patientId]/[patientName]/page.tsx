/**
 * Patient Detail Page
 *
 * Interface for viewing individual patient details and clinical information.
 * Displays comprehensive patient case information for clinical training.
 *
 * @description Server-side rendered page that handles optional authentication
 * and renders the patient detail interface. This page is publicly accessible
 * without authentication, but provides enhanced features for authenticated users.
 */

import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { PatientDetailContent } from "@/components/features/explore-patients/PatientDetailContent";

/**
 * Patient Detail Page Component
 *
 * Handles optional authentication and renders patient detail interface.
 * Works for both authenticated and unauthenticated users.
 */
export default async function PatientDetailPage() {
  // Get session if available, but don't require authentication
  const session = await auth();

  return (
    <SharedLayout
      user={
        session?.user
          ? {
              id: session.user.id,
              name: session.user.name ?? null,
              email: session.user.email!,
              role: session.user.role || "user",
              image: session.user.image,
            }
          : undefined
      }
      impersonation={session?.impersonation ?? undefined}
      layoutType="home"
      currentPage="/explore-patients"
    >
      <PatientDetailContent />
    </SharedLayout>
  );
}
