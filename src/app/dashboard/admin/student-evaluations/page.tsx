/**
 * Admin Student Evaluations Page
 *
 * Interface for viewing and managing student evaluation results
 * across all clinical simulations. Accessible only to admin users.
 * 
 * @description Server-side rendered page that handles authentication,
 * role verification, and renders the student evaluations interface.
 * Only accessible to authenticated users with 'admin' role.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { StudentEvaluationsContent } from "@/components/features/dashboard/StudentEvaluationsContent";

/**
 * Student Evaluations Page Component
 * 
 * Handles authentication, role verification, and renders student evaluations interface.
 * Redirects unauthenticated users to login page and non-admin users to user dashboard.
 */
export default async function StudentEvaluationsPage() {
  // Check authentication server-side
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
    <SharedLayout
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role,
        image: session.user.image,
      }}
      impersonation={session.impersonation ?? undefined}
      layoutType="dashboard"
      currentPage="/dashboard/admin/student-evaluations"
    >
      <StudentEvaluationsContent />
    </SharedLayout>
  );
}
