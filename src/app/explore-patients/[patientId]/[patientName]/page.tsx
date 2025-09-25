import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { PatientDetailContent } from "@/components/features/explore-patients/PatientDetailContent";

/**
 * Patient Detail Page
 * 
 * Server-side rendered page for viewing individual patient details
 * This page is publicly accessible without authentication
 */
export default async function PatientDetailPage() {
  // Get session if available, but don't require authentication
  const session = await auth();

  return (
    <SharedLayout
      user={session?.user ? {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role || "user",
        image: session.user.image,
      } : undefined}
      impersonation={session?.impersonation ?? undefined}
      layoutType="home"
      currentPage="/explore-patients"
    >
      <PatientDetailContent />
    </SharedLayout>
  );
}