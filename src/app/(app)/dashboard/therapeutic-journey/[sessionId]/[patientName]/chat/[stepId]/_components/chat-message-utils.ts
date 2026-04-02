import type { ChatMessage } from "./chat-types";

export interface QuestionAnswerRow {
  question: string;
  answer: string;
}

export function extractAndRemoveParentheses(text: string): {
  cleanedText: string;
  extractedText: string | null;
} {
  const parenthesesRegex = /\(([^)]+)\)/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = parenthesesRegex.exec(text)) !== null) {
    if (match[1]) {
      matches.push(match[1]);
    }
  }

  return {
    cleanedText: text.replace(parenthesesRegex, "").trim(),
    extractedText: matches.length > 0 ? matches.join(" ") : null,
  };
}

export function buildQuestionAnswerRows(
  messages: ChatMessage[],
): QuestionAnswerRow[] {
  const rows: QuestionAnswerRow[] = [];
  let pendingQuestion: string | null = null;

  messages.forEach((message) => {
    const normalizedContent = message.content.trim();
    if (!normalizedContent) return;

    if (message.sender === "user") {
      if (pendingQuestion) {
        rows.push({
          question: pendingQuestion,
          answer: "",
        });
      }
      pendingQuestion = normalizedContent;
      return;
    }

    if (pendingQuestion) {
      rows.push({
        question: pendingQuestion,
        answer: normalizedContent,
      });
      pendingQuestion = null;
      return;
    }

    rows.push({
      question: "",
      answer: normalizedContent,
    });
  });

  if (pendingQuestion) {
    rows.push({
      question: pendingQuestion,
      answer: "",
    });
  }

  return rows;
}
