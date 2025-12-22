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
      await new Promise((resolve) => setTimeout(resolve, 100));
      session = await auth();
    }

    if (!session?.user?.id || !session?.user?.email) {
      redirect("/login?error=session-invalid&from=dashboard");
    }

    const userRole = session.user.role ?? "user";

    if (!userRole || (userRole !== "admin" && userRole !== "user")) {
      redirect("/dashboard/therapeutic-journey?role=default");
    }

    if (userRole === "admin") {
      redirect("/dashboard/therapeutic-journey?auth=jwt");
    } else {
      redirect("/dashboard/therapeutic-journey?auth=jwt");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

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
