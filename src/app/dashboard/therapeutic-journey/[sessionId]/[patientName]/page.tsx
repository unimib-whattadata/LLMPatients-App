/**
 * Session Timeline Page
 *
 * Interface for viewing therapy session timeline and session details.
 * Displays session history, progress, and interaction logs.
 *
 * @description Server-side rendered page that handles authentication
 * and renders the session timeline interface for therapy session management.
 * Only accessible to authenticated users.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SessionTimelineContent } from "@/components/features/therapeutic-journey/SessionTimelineContent";

/**
 * Session Timeline Page Component
 *
 * Handles authentication and renders session timeline interface.
 * Redirects unauthenticated users to login page.
 * Note: SessionTimelineContent handles its own layout internally.
 */
export default async function SessionTimelinePage() {
  // Check authentication server-side
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect("/login");
  }

  return (
    <SessionTimelineContent
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role || "user",
        image: session.user.image,
      }}
      impersonation={session.impersonation ?? undefined}
    />
  );
}
