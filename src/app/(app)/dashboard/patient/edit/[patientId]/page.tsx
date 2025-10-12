import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { EditPatientContent } from "./_components/EditPatientContent";

interface EditPatientPageProps {
  params: {
    patientId: string;
  };
}

export default async function EditPatientPage({ params }: EditPatientPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

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
      currentPage="/dashboard/patient"
    >
      <EditPatientContent patientId={params.patientId} />
    </SharedLayout>
  );
}
