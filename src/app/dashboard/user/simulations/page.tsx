/**
 * User Simulations Page
 *
 * Interface for accessing and managing personal clinical simulations.
 * Shows available simulations, in-progress cases, and completed scenarios.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { MySimulationsContent } from "@/components/features/dashboard/MySimulationsContent";

/**
 * My Simulations Page Component
 * Handles authentication and renders user simulation interface
 */
export default async function MySimulationsPage() {
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
      currentPage="/dashboard/user/simulations"
    >
      <MySimulationsContent />
    </SharedLayout>
  );
}
