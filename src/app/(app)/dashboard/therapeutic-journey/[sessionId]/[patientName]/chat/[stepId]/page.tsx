import { ChatContent } from "./_components/ChatContent";
import { requireAppSession, toAppUser } from "~/server/auth/session";

export default async function ChatPage() {
  const session = await requireAppSession();

  return (
    <ChatContent
      user={toAppUser(session.user)}
      impersonation={session.impersonation ?? undefined}
    />
  );
}
