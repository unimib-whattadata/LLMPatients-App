
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { TherapeuticJourneyContent } from "./_components/TherapeuticJourneyContent";

export default async function TherapeuticJourneyPage() {
  
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
      currentPage="/dashboard/therapeutic-journey"
    >
      <TherapeuticJourneyContent />
    </SharedLayout>
  );
}
