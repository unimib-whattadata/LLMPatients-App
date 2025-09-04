/**
 * User Progress Page
 * 
 * Interface for viewing personal learning progress, achievements,
 * and skill development tracking across clinical simulations.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { DashboardLayout } from "../../_components/DashboardLayout";
import { MyProgressContent } from "./_components/MyProgressContent";

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
    <DashboardLayout 
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role || "user",
        image: session.user.image,
      }}
      currentPage="/dashboard/user/progress"
    >
      <MyProgressContent />
    </DashboardLayout>
  );
}