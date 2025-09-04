/**
 * Main Dashboard Route
 * 
 * This route serves as the entry point for the dashboard system.
 * It performs role-based routing to direct users to appropriate dashboards:
 * - Admin users -> /dashboard/admin
 * - Regular users -> /dashboard/user
 * 
 * Includes authentication check and role verification.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

/**
 * Dashboard page component with role-based routing
 * 
 * This component:
 * 1. Checks if user is authenticated
 * 2. Determines user role from session
 * 3. Redirects to appropriate dashboard based on role
 * 4. Provides fallback handling for edge cases
 */
export default async function DashboardPage() {
  // Get current session to check authentication and role
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect("/login");
  }

  // Get user role from session (with fallback to 'user')
  const userRole = session.user.role || "user";

  // Redirect based on user role
  if (userRole === "admin") {
    // Redirect admin users to admin dashboard
    redirect("/dashboard/admin");
  } else {
    // Redirect regular users to user dashboard
    redirect("/dashboard/user");
  }

  // This return should never be reached due to redirects,
  // but is included for TypeScript/React compliance
  return null;
}
