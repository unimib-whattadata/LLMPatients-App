/**
 * Admin Dashboard Page
 * 
 * Main admin dashboard displaying system overview, user management,
 * and administrative tools. Accessible only to users with admin role.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { DashboardLayout } from "../_components/DashboardLayout";
import { AdminContent } from "./_components/AdminContent";

/**
 * Admin Dashboard Page Component
 * Handles authentication, role verification, and renders admin interface
 */
export default async function AdminDashboardPage() {
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
      currentPage="/dashboard/admin"
    >
      <AdminContent />
    </DashboardLayout>
  );
}