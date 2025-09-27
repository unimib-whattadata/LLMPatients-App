/**
 * User Dashboard Page
 *
 * Main user dashboard for regular users displaying personal information,
 * progress tracking, and user-specific functionality.
 *
 * @description Server-side rendered page that handles authentication,
 * role verification, and renders the user dashboard interface.
 * Only accessible to authenticated users with 'user' role.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { UserContent } from "@/components/features/dashboard/UserContent";

/**
 * User Dashboard Page Component
 *
 * Handles authentication, role verification, and renders user interface.
 * Redirects unauthenticated users to login page.
 */
export default async function UserDashboardPage() {
  // Check authentication server-side
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect("/login");
  }

  // Admin users now use the same user dashboard

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
      currentPage="/dashboard/user"
    >
      <UserContent />
    </SharedLayout>
  );
}
