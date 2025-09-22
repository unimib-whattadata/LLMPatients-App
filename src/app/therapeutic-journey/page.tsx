import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { TherapeuticJourneyContent } from "@/components/features/therapeutic-journey/TherapeuticJourneyContent";

/**
 * Therapeutic Journey Page
 * 
 * Server-side rendered page for therapeutic journey management
 */
export default async function TherapeuticJourneyPage() {
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
      layoutType="dashboard"
      currentPage="/therapeutic-journey"
    >
      <TherapeuticJourneyContent />
    </SharedLayout>
  );
}