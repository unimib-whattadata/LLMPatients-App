/**
 * Create Patient Page
 *
 * Admin interface for creating new virtual patients and clinical scenarios.
 * Provides a comprehensive form for adding patient details, medical history,
 * and learning objectives for clinical training simulations.
 *
 * @description Server-side rendered page that requires admin authentication
 * and renders the patient creation interface.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { CreatePatientContent } from "~/components/features/dashboard/CreatePatientContent";

/**
 * Create Patient Page Component
 *
 * Handles admin authentication and renders patient creation interface.
 * Redirects non-admin users to the dashboard.
 */
export default async function CreatePatientPage() {
  // Require authentication
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  // Require admin role
  if (session.user.role !== "admin") {
    redirect("/dashboard");
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
      impersonation={session?.impersonation ?? undefined}
      layoutType="dashboard"
      currentPage="/dashboard/create-patient"
    >
      <CreatePatientContent />
    </SharedLayout>
  );
}
