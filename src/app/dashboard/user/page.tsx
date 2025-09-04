/**
 * User Dashboard Page
 * 
 * Main user dashboard for regular users displaying personal information,
 * progress tracking, and user-specific functionality.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

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

  // Redirect to the main user function - simulations
  redirect("/dashboard/user/simulations");
}