/**
 * User Simulations Page
 * 
 * Interface for accessing and managing personal clinical simulations.
 * Shows available simulations, in-progress cases, and completed scenarios.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { DashboardLayout } from "../../_components/DashboardLayout";
import { MySimulationsContent } from "./_components/MySimulationsContent";

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
    <DashboardLayout 
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role || "user",
        image: session.user.image,
      }}
      currentPage="/dashboard/user/simulations"
    >
      <MySimulationsContent />
    </DashboardLayout>
  );
}