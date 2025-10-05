
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { PatientDetailContent } from "./_components/PatientDetailContent";

export default async function PatientDetailPage() {
  
  const session = await auth();

  return (
    <SharedLayout
      user={
        session?.user
          ? {
              id: session.user.id,
              name: session.user.name ?? null,
              email: session.user.email!,
              role: session.user.role || "user",
              image: session.user.image,
            }
          : undefined
      }
      impersonation={session?.impersonation ?? undefined}
      layoutType="home"
      currentPage="/explore-patients"
    >
      <PatientDetailContent />
    </SharedLayout>
  );
}
