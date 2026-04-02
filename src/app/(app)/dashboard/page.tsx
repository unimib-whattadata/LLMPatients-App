import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { DashboardPanel } from "~/components/dashboard/ui";
import { requireAppSession } from "~/server/auth/session";

export const dynamic = 'force-dynamic';

function DashboardLoadingComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <DashboardPanel className="w-full max-w-xl space-y-5">
        <div className="space-y-2">
          <Skeleton variant="heading" className="h-8 w-48" />
          <Skeleton variant="text" className="h-4 w-full max-w-sm" />
        </div>
        <div className="space-y-3">
          <Skeleton variant="text" className="h-4 w-full" />
          <Skeleton variant="text" className="h-4 w-5/6" />
          <Skeleton variant="button" className="h-10 w-40" />
        </div>
      </DashboardPanel>
    </div>
  );
}

async function DashboardRouter() {
  try {
    const session = await requireAppSession(
      "/login?error=session-invalid&from=dashboard",
    );

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
