/**
 * User Dashboard Page
 * 
 * Main user dashboard for regular users displaying personal information,
 * progress tracking, and user-specific functionality.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { UserContent } from "@/components/features/dashboard/UserContent";

/**
 * User Dashboard Page Component
 * Handles authentication and renders user interface
 */
export default async function UserDashboardPage() {
  // Check authentication
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
        role: session.user.role,
        image: session.user.image,
      }}
      impersonation={(session as any).impersonation ?? undefined}
      layoutType="dashboard"
      currentPage="/dashboard/user"
    >
      <UserContent />
    </SharedLayout>
  );
}