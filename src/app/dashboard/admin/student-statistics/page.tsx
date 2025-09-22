/**
 * Admin Student Statistics Page
 * 
 * Interface for viewing aggregate student performance statistics
 * and analytics across all clinical simulations. Accessible only to admin users.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { StudentStatisticsContent } from "@/components/features/dashboard/StudentStatisticsContent";

/**
 * Student Statistics Page Component
 * Handles authentication, role verification, and renders student statistics interface
 */
export default async function StudentStatisticsPage() {
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
      currentPage="/dashboard/admin/student-statistics"
    >
      <StudentStatisticsContent />
    </SharedLayout>
  );
}