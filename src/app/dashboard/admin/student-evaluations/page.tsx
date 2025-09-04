/**
 * Admin Student Evaluations Page
 * 
 * Interface for viewing and managing student evaluation results
 * across all clinical simulations. Accessible only to admin users.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { DashboardLayout } from "../../_components/DashboardLayout";
import { StudentEvaluationsContent } from "./_components/StudentEvaluationsContent";

/**
 * Student Evaluations Page Component
 * Handles authentication, role verification, and renders student evaluations interface
 */
export default async function StudentEvaluationsPage() {
  // Check authentication and role
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect("/login");
  }

  // Ensure user has admin role
  if (session.user.role !== "admin") {
    redirect("/dashboard/user");
  }

  return (
    <DashboardLayout 
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role,
        image: session.user.image,
      }}
      currentPage="/dashboard/admin/student-evaluations"
    >
      <StudentEvaluationsContent />
    </DashboardLayout>
  );
}