import { useState, useCallback } from "react";
import { api } from "~/trpc/react";

type UseChatOptions = {
  userId: string;
  virtualPatientId: string;
};

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

export function useChat({ userId, virtualPatientId }: UseChatOptions) {
  const utils = api.useUtils();
  const [isGenerating, setIsGenerating] = useState(false);

  const chatQuery = api.chat.getOrCreate.useQuery(
    { userId, virtualPatientId },
    {
      enabled: !!userId && !!virtualPatientId,
    },
  );

  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      utils.chat.getOrCreate.invalidate();
    },
  });

  const sendMessage = useCallback(
    async (content: string) => {
      if (!chatQuery.data) return;
      const chatId = chatQuery.data.id;

      // utente invia messaggio
      await sendMessageMutation.mutateAsync({
        chatId,
        senderId: userId,
        content,
      });

      // bot "sta scrivendo..."
      setIsGenerating(true);

      // Simulazione risposta bot
      return new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            await sendMessageMutation.mutateAsync({
              chatId,
              senderId: virtualPatientId,
              content: "Risposta generata dal bot 🤖",
            });
          } finally {
            setIsGenerating(false);
            resolve();
          }
        }, 1500);
      });
    },
    [chatQuery.data, sendMessageMutation, userId, virtualPatientId],
  );

  return {
    chat: chatQuery.data,
    messages: chatQuery.data?.messages,
    isGenerating,
    sendMessage,
  };
}
