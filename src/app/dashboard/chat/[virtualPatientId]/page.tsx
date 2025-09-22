"use client";

import { Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { ChatBubble, ChatBubbleMessage } from "~/components/ui/chat-bubble";
import { ChatMessageList } from "~/components/ui/chat-message-list";
import { FormControl, FormField, FormItem, Form } from "~/components/ui/form";
import { Textarea } from "~/components/ui/textarea";
import { useChat } from "~/hooks/use-chat";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { SharedLayout } from "@/components/layout/SharedLayout";

const formSchema = z.object({
  message: z.string().min(1, {
    message: "Text message must be at least 1 character",
  }),
});

function ChatContent() {
  const { data: session } = useSession();
  const params = useParams();
  const virtualPatientId = params.virtualPatientId as string;
  const userId = session?.user?.id;

  const { chat, messages, isGenerating, sendMessage } = useChat({
    userId: userId || "",
    virtualPatientId,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  function onSubmit(data: z.infer<typeof formSchema>) {
    if (!userId) return;
    
    setIsLoading(true);
    sendMessage(data.message)
      .then(() => {
        form.reset({ message: "" });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  return (
    <div className="dashboard-main">
      <div className="dashboard-card">
        <div className="dashboard-card-title">
          Chat con Paziente Virtuale
        </div>
        
        <div className="flex flex-col h-[600px] border border-border-primary rounded-lg overflow-hidden">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-auto p-4 bg-surface-secondary">
            <ChatMessageList className="h-full">
              {messages?.map((message) => {
                const variant = message.senderId === userId ? "sent" : "received";
                return (
                  <ChatBubble key={message.id} variant={variant}>
                    <ChatBubbleMessage
                      isLoading={message.senderId === virtualPatientId && isGenerating}
                      className={message.senderId === userId ? "bg-primary-500 text-white" : "bg-surface-tertiary"}
                    >
                      {message.content}
                    </ChatBubbleMessage>
                  </ChatBubble>
                );
              })}
              {isGenerating && (
                <ChatBubble variant="received">
                  <ChatBubbleMessage isLoading={true}>
                    Il paziente sta scrivendo...
                  </ChatBubbleMessage>
                </ChatBubble>
              )}
            </ChatMessageList>
          </div>

          {/* Chat Input Area */}
          <div className="border-t border-border-primary p-4 bg-surface-primary">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex gap-2 items-end"
              >
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Textarea
                          id="message"
                          placeholder="Scrivi il tuo messaggio qui..."
                          className="min-h-12 resize-none border-border-primary focus:ring-primary-500"
                          disabled={isLoading || isGenerating}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading || isGenerating}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2"
                >
                  <Send size={20} />
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { data: session, status } = useSession();

  // Show loading state while session is loading
  if (status === "loading") {
    return (
      <div className="dashboard-main">
        <div className="dashboard-card">
          <div className="text-center">
            <div className="rounded-full h-12 w-12 border-b-2 border-success-600 mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="dashboard-main">
        <div className="dashboard-card">
          <div className="text-center">
            <p className="text-text-secondary">Please log in to access the chat.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SharedLayout
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role,
        image: session.user.image,
      }}
      impersonation={session.impersonation ?? undefined}
      layoutType="dashboard"
      currentPage="/dashboard/chat"
    >
      <ChatContent />
    </SharedLayout>
  );
}
