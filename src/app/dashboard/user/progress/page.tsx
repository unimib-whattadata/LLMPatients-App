/**
 * User Progress Page
 *
 * Interface for viewing personal learning progress, achievements,
 * and skill development tracking across clinical simulations.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { MyProgressContent } from "@/components/features/dashboard/MyProgressContent";

/**
 * My Progress Page Component
 * Handles authentication and renders user progress interface
 */
export default async function MyProgressPage() {
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
        role: session.user.role || "user",
        image: session.user.image,
      }}
      impersonation={session.impersonation ?? undefined}
      layoutType="dashboard"
      currentPage="/dashboard/user/progress"
    >
      <MyProgressContent />
    </SharedLayout>
  );
}
