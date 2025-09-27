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
import { DashboardLoading } from "~/components/ui";

/**
 * Loading component for dashboard routing
 */
function DashboardLoadingComponent() {
  return <DashboardLoading />;
}

/**
 * Dashboard routing logic with enhanced JWT session handling
 */
async function DashboardRouter() {
  try {
    // Enhanced session retrieval with retry mechanism for JWT tokens
    let session = await auth();

    // Retry mechanism for session retrieval (important for JWT token validation)
    if (!session && typeof window !== "undefined") {
      console.log("Dashboard: Initial session null, retrying...");
      await new Promise((resolve) => setTimeout(resolve, 100));
      session = await auth();
    }

    // Comprehensive authentication check with detailed logging
    if (!session?.user?.id || !session?.user?.email) {
      console.log("Dashboard: Invalid session detected", {
        hasSession: !!session,
        hasUserId: !!session?.user?.id,
        hasUserEmail: !!session?.user?.email,
        sessionUser: session?.user,
      });
      redirect("/login?error=session-invalid&from=dashboard");
    }

    // Additional JWT token validation logging
    console.log("Dashboard: Valid session found", {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionType: "JWT",
      timestamp: new Date().toISOString(),
    });

    // Get user role with proper type safety and fallback
    const userRole = session.user.role ?? "user";

    // Enhanced logging for debugging
    console.log(
      `Dashboard access: User ${session.user.email} (ID: ${session.user.id}) with role: ${userRole}`,
    );

    // Validate role value with comprehensive checking
    if (!userRole || (userRole !== "admin" && userRole !== "user")) {
      console.warn(
        `Dashboard access: Invalid user role '${String(userRole)}', defaulting to 'user'`,
      );
      redirect("/dashboard/user?role=default");
    }

    // Role-based routing with enhanced logging
    if (userRole === "admin") {
      console.log("Redirecting admin user to admin dashboard");
      redirect("/dashboard/admin?auth=jwt");
    } else {
      console.log("Redirecting user to user dashboard");
      redirect("/dashboard/user?auth=jwt");
    }
  } catch (error) {
    // Handle redirect errors (normal flow) vs actual errors
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      // This is a normal redirect - re-throw it to let Next.js handle it
      throw error;
    }

    // Log actual errors (not redirects) with more detail
    console.error("Dashboard routing error:", {
      error: error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // For genuine errors, redirect to login with error parameter
    redirect("/login?error=session-error&from=dashboard");
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
    <Suspense fallback={<DashboardLoadingComponent />}>
      <DashboardRouter />
    </Suspense>
  );
}
