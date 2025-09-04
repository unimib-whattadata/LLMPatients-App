/**
 * Main Dashboard Route
 * 
 * This route serves as the entry point for the dashboard system.
 * It performs role-based routing to direct users to appropriate dashboards:
 * - Admin users -> /dashboard/admin
 * - Regular users -> /dashboard/user
 * 
 * Includes authentication check and role verification with enhanced error handling.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { Suspense } from "react";

/**
 * Loading component for dashboard routing
 */
function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}

/**
 * Dashboard routing logic with enhanced session handling
 */
async function DashboardRouter() {
  try {
    // Get current session with enhanced error handling
    const session = await auth();

    // Comprehensive authentication check
    if (!session?.user?.id) {
      console.log("Dashboard access denied: No valid session found");
      redirect("/login?from=dashboard");
    }

    // Validate session user data
    if (!session.user.email) {
      console.warn("Dashboard access: User session missing email");
      redirect("/login?error=session-invalid");
    }

    // Get user role with proper type safety and fallback
    const userRole = session.user.role ?? "user";
    
    // Enhanced logging for debugging
    console.log(`Dashboard access: User ${session.user.email} (ID: ${session.user.id}) with role: ${userRole}`);

    // Validate role value
    if (!userRole || (userRole !== "admin" && userRole !== "user")) {
      console.warn(`Dashboard access: Invalid user role '${String(userRole)}', defaulting to 'user'`);
      redirect("/dashboard/user");
    }

    // Role-based routing with logging
    if (userRole === "admin") {
      console.log("Redirecting admin user to admin dashboard");
      redirect("/dashboard/admin");
    } else {
      console.log("Redirecting user to user dashboard");
      redirect("/dashboard/user");
    }
  } catch (error) {
    // Only catch non-redirect errors
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      // This is a normal redirect - re-throw it to let Next.js handle it
      throw error;
    }
    
    // Log actual errors (not redirects)
    console.error("Actual error in dashboard routing:", error);
    
    // For genuine errors, redirect to login with error parameter
    redirect("/login?error=dashboard-error");
  }

  // Fallback return (should never be reached)
  return null;
}

/**
 * Dashboard page component with role-based routing
 * 
 * This component:
 * 1. Checks if user is authenticated
 * 2. Determines user role from session
 * 3. Redirects to appropriate dashboard based on role
 * 4. Provides loading states during routing
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardRouter />
    </Suspense>
  );
}
