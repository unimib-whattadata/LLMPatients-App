
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";


export const dynamic = 'force-dynamic';

function DashboardLoadingComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Caricamento dashboard...</p>
      </div>
    </div>
  );
}

async function DashboardRouter() {
  try {
    
    let session = await auth();

    
    if (!session && typeof window !== "undefined") {
      console.log("Dashboard: Initial session null, retrying...");
      await new Promise((resolve) => setTimeout(resolve, 100));
      session = await auth();
    }

    
    if (!session?.user?.id || !session?.user?.email) {
      console.log("Dashboard: Invalid session detected", {
        hasSession: !!session,
        hasUserId: !!session?.user?.id,
        hasUserEmail: !!session?.user?.email,
        sessionUser: session?.user,
      });
      redirect("/login?error=session-invalid&from=dashboard");
    }

    
    console.log("Dashboard: Valid session found", {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionType: "JWT",
      timestamp: new Date().toISOString(),
    });

    
    const userRole = session.user.role ?? "user";

    
    console.log(
      `Dashboard access: User ${session.user.email} (ID: ${session.user.id}) with role: ${userRole}`,
    );

    
    if (!userRole || (userRole !== "admin" && userRole !== "user")) {
      console.warn(
        `Dashboard access: Invalid user role '${String(userRole)}', defaulting to 'user'`,
      );
      redirect("/dashboard/therapeutic-journey?role=default");
    }

    
    if (userRole === "admin") {
      console.log("Redirecting admin user to therapeutic journey");
      redirect("/dashboard/therapeutic-journey?auth=jwt");
    } else {
      console.log("Redirecting user to therapeutic journey");
      redirect("/dashboard/therapeutic-journey?auth=jwt");
    }
  } catch (error) {
    
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      
      throw error;
    }

    
    console.error("Dashboard routing error:", {
      error: error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    
    redirect("/login?error=session-error&from=dashboard");
  }

  
  return null;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingComponent />}>
      <DashboardRouter />
    </Suspense>
  );
}
