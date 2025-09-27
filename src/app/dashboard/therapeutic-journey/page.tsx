/**
 * Therapeutic Journey Page
 *
 * Main interface for managing therapeutic journey sessions and patient interactions.
 * Displays session history, progress tracking, and session management tools.
 *
 * @description Server-side rendered page that handles authentication
 * and renders the therapeutic journey interface for session management.
 * Only accessible to authenticated users.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { TherapeuticJourneyContent } from "@/components/features/therapeutic-journey/TherapeuticJourneyContent";

/**
 * Therapeutic Journey Page Component
 *
 * Handles authentication and renders therapeutic journey interface.
 * Redirects unauthenticated users to login page.
 */
export default async function TherapeuticJourneyPage() {
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
      currentPage="/dashboard/therapeutic-journey"
    >
      <TherapeuticJourneyContent />
    </SharedLayout>
  );
}
