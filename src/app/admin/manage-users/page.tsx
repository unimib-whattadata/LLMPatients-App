/**
 * Admin User Management Page
 *
 * Special admin-only page for managing users with the following features:
 * - View all users in a searchable table
 * - Create new users with role assignment
 * - Update user profiles and roles
 * - Delete users (except self)
 * - Access control with development bypass
 *
 * Access Control:
 * - Production: Only admin role users can access
 * - Development: Special access with ?specialKey=DavideIsTesting query parameter
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { ManageUsersContent } from "~/components/features/admin/ManageUsersContent";

/**
 * User Management Page Component
 * Handles authentication, role verification, and renders user management interface
 */
export default async function AdminUserManagementPage() {
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
      impersonation={session.impersonation ?? undefined}
      layoutType="dashboard"
      currentPage="/admin/manage-users"
    >
      <ManageUsersContent />
    </SharedLayout>
  );
}
