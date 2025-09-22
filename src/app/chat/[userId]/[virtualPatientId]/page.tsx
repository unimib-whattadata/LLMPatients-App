"use client";
import { Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { ChatBubble, ChatBubbleMessage } from "~/components/ui/chat-bubble";
import { ChatMessageList } from "~/components/ui/chat-message-list";
import { FormControl, FormField, FormItem, Form } from "~/components/ui/form";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { useSidebar } from "~/components/ui/sidebar";
import z from "zod";
import { cn } from "~/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "~/components/ui/textarea";
import { useChat } from "~/hooks/use-chat";
import { useParams } from "next/navigation";

export default function Page() {
  const { open, isMobile } = useSidebar();
  const params = useParams();
  const userId = params.userId as string;
  const virtualPatientId = params.virtualPatientId as string;
  // const { sendMessage, isGenerating } = useChat({
  //   userId,
  //   virtualPatientId,
  // });

  const messages_mock: {
    id: number;
    message: string;
    sender: "user" | "bot";
    isLoading?: boolean;
  }[] = [
    {
      id: 1,
      message:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      sender: "user",
    },
    {
      id: 2,
      message:
        "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      sender: "bot",
    },
    {
      id: 3,
      message:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      sender: "user",
    },
    {
      id: 4,
      message:
        "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      sender: "bot",
    },
    {
      id: 5,
      message:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      sender: "user",
    },
    {
      id: 6,
      message:
        "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      sender: "bot",
    },
    {
      id: 7,
      message:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      sender: "user",
    },
    {
      id: 8,
      message:
        "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      sender: "bot",
    },
  ];

  const formSchema = z.object({
    message: z.string().min(1, {
      message: "Text message must be at least 1 character",
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    form.reset({ message: "" });
    console.log(data);
  }

  return (
    <div
      className={cn(
        "grid h-screen w-full grid-rows-[auto_1fr_auto] p-2",
        open && !isMobile ? "ml-54" : "",
      )}
    >
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-3">
          <SidebarTrigger className="cursor-pointer" />
        </div>
      </header>
      <div className="overflow-auto p-4">
        <ChatMessageList className="no-scrollbar h-full">
          {messages_mock.map((message) => {
            const variant = message.sender === "user" ? "sent" : "received";
            return (
              <ChatBubble key={message.id} variant={variant}>
                <ChatBubbleMessage
                  isLoading={message.isLoading}
                  className={message.sender === "user" ? "bg-sky-400" : ""}
                >
                  {message.message}
                </ChatBubbleMessage>
              </ChatBubble>
            );
          })}
        </ChatMessageList>
      </div>
      <footer className="flex h-16 shrink-0 items-center gap-2 p-20">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="bg-background focus-within:ring-ring relative m-4 mt-1 flex flex-1 overflow-hidden rounded-lg border focus-within:ring-1"
            x-chunk="dashboard-03-chunk-1"
          >
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Textarea
                      id="message"
                      placeholder="Type your message here..."
                      className="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              size="sm"
              className="text-gray-40 mr-3 ml-auto gap-1.5 self-center bg-transparent"
            >
              <Send size={24} />
            </Button>
          </form>
        </Form>
      </footer>
    </div>
  );
}
