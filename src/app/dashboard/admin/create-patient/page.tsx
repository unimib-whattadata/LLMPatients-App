/**
 * Admin Create Patient Page
 * 
 * Interface for creating new patient cases and medical scenarios
 * for student simulations. Accessible only to admin users.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { CreatePatientContent } from "./_components/CreatePatientContent";

/**
 * Create Patient Page Component
 * Handles authentication, role verification, and renders patient creation interface
 */
export default async function CreatePatientPage() {
  // Check authentication and role
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect("/login");
  }

  // Ensure user has admin role
  if (session.user.role !== "admin") {
    redirect("/dashboard/user");
  }

  return (
    <SharedLayout 
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role,
        image: session.user.image,
      }}
      impersonation={(session as any).impersonation ?? undefined}
      layoutType="dashboard"
      currentPage="/dashboard/admin/create-patient"
    >
      <CreatePatientContent />
    </SharedLayout>
  );
}