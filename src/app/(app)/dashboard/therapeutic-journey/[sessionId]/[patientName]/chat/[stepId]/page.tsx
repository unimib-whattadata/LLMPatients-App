
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { ChatContent } from "./_components/ChatContent";

export default async function ChatPage() {
  
  const session = await auth();

  
  if (!session || !session.user) {
    redirect("/login");
  }

  return (
    <ChatContent
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
