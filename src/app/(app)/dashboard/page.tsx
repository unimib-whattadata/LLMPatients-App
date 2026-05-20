import { redirect } from "next/navigation";
import { requireAppSession } from "~/server/auth/session";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
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
