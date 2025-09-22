import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { ChatContent } from "@/components/features/therapeutic-journey/ChatContent";

/**
 * Chat Page for Virtual Patient Interaction
 * 
 * Server-side rendered page for chatting with virtual patients during therapy sessions
 */
export default async function ChatPage() {
  // Check authentication server-side
  const session = await auth();

  // Redirect to login if not authenticated
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
