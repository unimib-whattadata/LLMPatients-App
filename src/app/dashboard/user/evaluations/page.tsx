/**
 * User Evaluations Page
 * 
 * Interface for viewing personal evaluation results and feedback
 * from completed clinical simulations and assessments.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { DashboardLayout } from "../../_components/DashboardLayout";
import { MyEvaluationsContent } from "./_components/MyEvaluationsContent";

/**
 * My Evaluations Page Component
 * Handles authentication and renders user evaluations interface
 */
export default async function MyEvaluationsPage() {
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
      currentPage="/dashboard/user/evaluations"
    >
      <MyEvaluationsContent />
    </DashboardLayout>
  );
}