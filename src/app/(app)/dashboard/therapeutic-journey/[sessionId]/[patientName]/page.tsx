
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SessionTimelineContent } from "./_components/SessionTimelineContent";

export default async function SessionTimelinePage() {
  
  const session = await auth();

  
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
