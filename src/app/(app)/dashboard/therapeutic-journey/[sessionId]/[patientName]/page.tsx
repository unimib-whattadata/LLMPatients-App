import { SessionTimelineContent } from "./_components/SessionTimelineContent";
import { requireAppSession, toAppUser } from "~/server/auth/session";

export default async function SessionTimelinePage() {
  const session = await requireAppSession();

  return (
    <SessionTimelineContent
      user={toAppUser(session.user)}
      impersonation={session.impersonation ?? undefined}
    />
  );
}
