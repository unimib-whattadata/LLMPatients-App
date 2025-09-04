/**
 * Admin Create Patient Page
 * 
 * Interface for creating new patient cases and medical scenarios
 * for student simulations. Accessible only to admin users.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { DashboardLayout } from "../../_components/DashboardLayout";
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
    <DashboardLayout 
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role,
        image: session.user.image,
      }}
      currentPage="/dashboard/admin/create-patient"
    >
      <CreatePatientContent />
    </DashboardLayout>
  );
}