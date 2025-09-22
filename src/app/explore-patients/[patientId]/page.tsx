import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { PatientDetailContent } from "@/components/features/explore-patients/PatientDetailContent";

/**
 * Patient Detail Page
 * 
 * Server-side rendered page for viewing individual patient details
 */
export default async function PatientDetailPage() {
  // Check authentication server-side
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect("/login");
  }

  return (
    <SharedLayout
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role || "user",
        image: session.user.image,
      }}
      impersonation={session.impersonation ?? undefined}
      layoutType="home"
      currentPage="/explore-patients"
    >
      <PatientDetailContent />
    </SharedLayout>
  );
}