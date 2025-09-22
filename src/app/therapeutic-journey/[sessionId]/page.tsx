import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SessionTimelineContent } from "@/components/features/therapeutic-journey/SessionTimelineContent";

/**
 * Session Timeline Page
 * 
 * Server-side rendered page for viewing therapy session timeline
 */
export default async function SessionTimelinePage() {
  // Check authentication server-side
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect("/login");
  }

  return (
    <SessionTimelineContent
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role || "user",
        image: session.user.image,
      }}
      impersonation={session.impersonation ?? undefined}
    />
  );
}
