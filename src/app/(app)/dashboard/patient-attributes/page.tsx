
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { PatientDetailsContent } from "./_components/PatientDetailsContent";

export default async function PatientAttributesPage() {
  
  const session = await auth();

  
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
      layoutType="dashboard"
      currentPage="/dashboard/patient-attributes"
    >
      <PatientDetailsContent />
    </SharedLayout>
  );
}
