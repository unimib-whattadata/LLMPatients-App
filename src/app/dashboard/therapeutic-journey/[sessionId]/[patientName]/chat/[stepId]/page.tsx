/**
 * Chat Page for Virtual Patient Interaction
 *
 * Interface for real-time chat interaction with virtual patients during therapy sessions.
 * Provides conversational interface for clinical simulation and training.
 * 
 * @description Server-side rendered page that handles authentication
 * and renders the chat interface for virtual patient interaction.
 * Only accessible to authenticated users.
 */

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { ChatContent } from "@/components/features/therapeutic-journey/ChatContent";

/**
 * Chat Page Component
 * 
 * Handles authentication and renders chat interface for virtual patient interaction.
 * Redirects unauthenticated users to login page.
 * Note: ChatContent handles its own layout internally.
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
