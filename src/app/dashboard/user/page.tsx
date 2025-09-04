/**
 * User Dashboard Page
 * 
 * Main user dashboard for regular users displaying personal information,
 * progress tracking, and user-specific functionality.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { DashboardLayout } from "../_components/DashboardLayout";
import { UserContent } from "./_components/UserContent";

/**
 * User Dashboard Page Component
 * Handles authentication and renders user interface
 */
export default async function UserDashboardPage() {
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
        name: session.user.name,
        email: session.user.email!,
        role: session.user.role || "user",
        image: session.user.image,
      }}
      currentPage="/dashboard/user"
    >
      <UserContent />
    </DashboardLayout>
  );
}