import { createLogger } from "~/lib/logger";
import type { PatientEmotion } from "./types";

const baseLogger = createLogger("PatientResponseGenerator");

// Enhanced ANSI color codes with better contrast
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  // Enhanced colors with better visibility
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
} as const;

export const LOG_CONFIG = {
  PREFIXES: {
    PATIENT_GENERATOR: "🎯 [PATIENT RESPONSE GENERATOR]",
    MOCK_AI: "🤖 [MOCK AI]",
    REAL_AI: "🌐 [REAL AI]",
  },
  MAX_MESSAGE_LENGTH: 100,
  MAX_CONVERSATION_HISTORY: 5,
} as const;

export class PatientResponseLogger {
  private static readonly EMOTION_COLORS: Record<PatientEmotion, keyof typeof COLORS> = {
    SEEKING: "brightCyan",
    RAGE: "brightRed",
    FEAR: "magenta",
    CARE: "brightGreen",
    LUST: "brightMagenta",
    PANIC_GRIEF: "blue",
    SADNESS: "blue",
    PLAY: "brightYellow",
    base: "gray",
  };

  // Centralized log output - allows easy switching to different logger in future
  private static log(message: string): void {
    console.log(message);
  }

  private static logError(message: string, error?: unknown): void {
    console.error(message);
    if (error !== undefined) {
      if (error instanceof Error) {
        baseLogger.error(message, error);
      } else {
        baseLogger.error(`${message} | Extra: ${JSON.stringify(error)}`);
      }
    } else {
      baseLogger.error(message);
    }
  }

  private static logWarn(message: string): void {
    console.warn(message);
    baseLogger.warn(message);
  }

  private static formatTime(date: Date = new Date()): string {
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  private static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  private static colorize(text: string, color: keyof typeof COLORS): string {
    return `${COLORS[color]}${text}${COLORS.reset}`;
  }

  private static truncateMessage(
    message: string,
    maxLength: number = LOG_CONFIG.MAX_MESSAGE_LENGTH,
  ): string {
    return message.length > maxLength
      ? message.substring(0, maxLength) + "..."
      : message;
  }

  private static shortenRequestId(requestId: string): string {
    return requestId.split("_").pop()?.substring(0, 8) || requestId;
  }

  private static getDurationColor(duration: number, thresholds: { slow: number; medium: number }): keyof typeof COLORS {
    if (duration > thresholds.slow) return "brightYellow";
    if (duration > thresholds.medium) return "white";
    return "brightGreen";
  }

  private static createBadge(text: string, color: keyof typeof COLORS): string {
    return `${this.colorize("▌", color)}${this.colorize(` ${text} `, "bright")}${this.colorize("▌", color)}`;
  }

  // Service call logging
  static logServiceCall(
    prefix: string,
    method: string,
    requestId: string,
    data: {
      patientInfo?: { id?: string; name?: string; age?: number; gender?: string };
      sessionInfo?: { sessionId?: string; stepId?: number; userMessage?: string };
      url?: string;
      payload?: unknown;
    },
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    
    // Header line
    this.log(
      `${this.colorize(prefix, "brightCyan")} ${this.colorize("▶", "brightBlue")} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );
    
    // Details section
    const details: string[] = [];
    
    if (data.patientInfo) {
      const { name, id, age, gender } = data.patientInfo;
      const patientInfo = age && gender 
        ? `${this.colorize(name || id || "N/A", "white")} ${this.colorize(`(${age}yo, ${gender})`, "gray")}`
        : this.colorize(name || id || "N/A", "white");
      details.push(`  ${this.colorize("👤", "dim")} ${this.colorize("Patient:", "dim")} ${patientInfo}`);
    }
    
    if (data.sessionInfo) {
      const { sessionId, stepId, userMessage } = data.sessionInfo;
      const sessionInfo = stepId 
        ? `${this.colorize(sessionId?.substring(0, 8) || "N/A", "white")} ${this.colorize(`│ Step: ${stepId}`, "gray")}`
        : this.colorize(sessionId?.substring(0, 8) || "N/A", "white");
      details.push(`  ${this.colorize("💬", "dim")} ${this.colorize("Session:", "dim")} ${sessionInfo}`);
      
      if (userMessage) {
        details.push(`  ${this.colorize("📝", "dim")} ${this.colorize("Message:", "dim")} ${this.colorize(this.truncateMessage(userMessage, 75), "white")}`);
      }
    }
    
    if (data.url) {
      details.push(`  ${this.colorize("🔗", "dim")} ${this.colorize("URL:", "dim")} ${this.colorize(data.url, "brightBlue")}`);
    }

    if (data.payload !== undefined) {
      details.push(`  ${this.colorize("📦", "dim")} ${this.colorize("Payload:", "dim")} ${this.colorize(JSON.stringify(data.payload), "white")}`);
    }
    
    if (details.length > 0) {
      details.forEach(detail => this.log(detail));
    }
  }

  // Service response logging
  static logServiceResponse(
    prefix: string,
    method: string,
    requestId: string,
    duration: number,
    response: {
      message?: string;
      emotion?: PatientEmotion;
      topic?: string;
      reasoning_time?: number;
      status?: string;
      code?: string;
      external_patient_id?: string;
    },
    status: "success" | "error" | "warning" = "success",
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    const statusIcon = status === "success" ? "✓" : status === "error" ? "✗" : "⚠";
    const statusColor = status === "success" ? "brightGreen" : status === "error" ? "brightRed" : "brightYellow";
    const durationColor = this.getDurationColor(duration, { slow: 3000, medium: 1000 });
    const durationBadge = this.createBadge(this.formatDuration(duration), durationColor);
    
    // Header line with status and duration
    this.log(
      `${this.colorize(prefix, "brightCyan")} ${this.colorize(statusIcon, statusColor)} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${durationBadge} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );
    
    // Response details
    const details: string[] = [];
    
    if (response.message) {
      details.push(`  ${this.colorize("💭", "dim")} ${this.colorize("Response:", "dim")} ${this.colorize(this.truncateMessage(response.message, 75), "white")}`);
    }
    
    if (response.emotion) {
      const emotionColor = this.EMOTION_COLORS[response.emotion] || "white";
      const emotionBadge = this.createBadge(response.emotion, emotionColor);
      const extraInfo: string[] = [];
      
      if (response.topic) {
        extraInfo.push(this.colorize(`Topic: ${response.topic}`, "brightCyan"));
      }
      if (response.reasoning_time !== undefined) {
        extraInfo.push(this.colorize(`Reasoning: ${response.reasoning_time}s`, "gray"));
      }
      
      const extraInfoStr = extraInfo.length > 0 ? ` ${this.colorize("│", "gray")} ${extraInfo.join(` ${this.colorize("│", "gray")} `)}` : "";
      details.push(`  ${this.colorize("😊", "dim")} ${this.colorize("Emotion:", "dim")} ${emotionBadge}${extraInfoStr}`);
    } else {
      // If no emotion, show topic and reasoning separately
      if (response.topic) {
        details.push(`  ${this.colorize("🏷️", "dim")} ${this.colorize("Topic:", "dim")} ${this.colorize(response.topic, "brightCyan")}`);
      }
      if (response.reasoning_time !== undefined) {
        details.push(`  ${this.colorize("⏱️", "dim")} ${this.colorize("Reasoning:", "dim")} ${this.colorize(`${response.reasoning_time}s`, "gray")}`);
      }
    }

    if (response.status) {
      const statusColor = response.status === "success" ? "brightGreen" : "brightRed";
      const statusBadge = this.createBadge(response.status.toUpperCase(), statusColor);
      const codeInfo = response.code ? ` ${this.colorize(`(${response.code})`, "gray")}` : "";
      details.push(`  ${this.colorize("📊", "dim")} ${this.colorize("Status:", "dim")} ${statusBadge}${codeInfo}`);
    }

    if (response.external_patient_id) {
      details.push(`  ${this.colorize("🆔", "dim")} ${this.colorize("External ID:", "dim")} ${this.colorize(response.external_patient_id, "brightCyan")}`);
    }

    if (details.length > 0) {
      details.forEach(detail => this.log(detail));
    }
  }

  // Service error logging
  static logServiceError(
    prefix: string,
    method: string,
    requestId: string,
    duration: number,
    error: unknown,
    url?: string,
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const durationBadge = this.createBadge(this.formatDuration(duration), "brightRed");
    
    // Header line
    this.logError(
      `${this.colorize(prefix, "brightCyan")} ${this.colorize("✗", "brightRed")} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${durationBadge} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );
    
    // Error details
    this.logError(
      `  ${this.colorize("❌", "brightRed")} ${this.colorize("Error:", "brightRed")} ${this.colorize(errorMessage, "white")}`,
      error
    );
    
    if (url) {
      this.logError(
        `  ${this.colorize("🔗", "dim")} ${this.colorize("URL:", "dim")} ${this.colorize(url, "brightRed")}`
      );
    }
    
    if (error instanceof Error && error.stack) {
      const stackLines = error.stack.split("\n").slice(1, 10);
      stackLines.forEach((line) => {
        this.logError(`  ${this.colorize("  └─", "gray")} ${this.colorize(line.trim(), "gray")}`);
      });
    }
  }

  // Generator method call logging
  static logGeneratorCall(
    method: string,
    requestId: string,
    serviceType: "REAL" | "MOCK",
    data: {
      patientInfo?: { name?: string; age?: number; gender?: string };
      sessionId?: string;
      stepId?: number;
      userMessage?: string;
      conversationHistoryLength?: number;
      externalPatientId?: string;
    },
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    const serviceColor = serviceType === "REAL" ? "brightGreen" : "brightYellow";
    const serviceBadge = this.createBadge(serviceType, serviceColor);
    
    // Header line
    this.log(
      `${this.colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "brightCyan")} ${this.colorize("▶", "brightBlue")} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${serviceBadge} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );
    
    // Details section
    const details: string[] = [];
    
    if (data.patientInfo) {
      const { name, age, gender } = data.patientInfo;
      const patientInfo = age && gender 
        ? `${this.colorize(name || "N/A", "white")} ${this.colorize(`(${age}yo, ${gender})`, "gray")}`
        : this.colorize(name || "N/A", "white");
      details.push(`  ${this.colorize("👤", "dim")} ${this.colorize("Patient:", "dim")} ${patientInfo}`);
    }
    
    if (data.sessionId) {
      const sessionInfo = data.stepId 
        ? `${this.colorize(data.sessionId.substring(0, 8), "white")} ${this.colorize(`│ Step: ${data.stepId}`, "gray")}`
        : this.colorize(data.sessionId.substring(0, 8), "white");
      details.push(`  ${this.colorize("💬", "dim")} ${this.colorize("Session:", "dim")} ${sessionInfo}`);
    }
    
    if (data.userMessage) {
      details.push(`  ${this.colorize("📝", "dim")} ${this.colorize("Message:", "dim")} ${this.colorize(this.truncateMessage(data.userMessage, 75), "white")}`);
    }
    
    if (data.conversationHistoryLength && data.conversationHistoryLength > 0) {
      details.push(`  ${this.colorize("📚", "dim")} ${this.colorize("History:", "dim")} ${this.colorize(`${data.conversationHistoryLength} messages`, "gray")}`);
    }

    if (data.externalPatientId) {
      details.push(`  ${this.colorize("🆔", "dim")} ${this.colorize("External ID:", "dim")} ${this.colorize(data.externalPatientId.substring(0, 16), "white")}`);
    }

    if (details.length > 0) {
      details.forEach(detail => this.log(detail));
    }
  }

  // Generator method response logging
  static logGeneratorResponse(
    method: string,
    requestId: string,
    duration: number,
    response: {
      message?: string;
      emotion?: PatientEmotion;
      topic?: string;
      reasoning_time?: number;
      status?: string;
      code?: string;
      external_patient_id?: string;
    },
    status: "success" | "error" | "warning" = "success",
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    const statusIcon = status === "success" ? "✓" : status === "error" ? "✗" : "⚠";
    const statusColor = status === "success" ? "brightGreen" : status === "error" ? "brightRed" : "brightYellow";
    const durationColor = this.getDurationColor(duration, { slow: 3000, medium: 1000 });
    const durationBadge = this.createBadge(this.formatDuration(duration), durationColor);
    
    // Header line with status and duration
    this.log(
      `${this.colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "brightCyan")} ${this.colorize(statusIcon, statusColor)} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${durationBadge} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );
    
    // Response details
    const details: string[] = [];
    
    if (response.message) {
      details.push(`  ${this.colorize("💭", "dim")} ${this.colorize("Response:", "dim")} ${this.colorize(this.truncateMessage(response.message, 75), "white")}`);
    }
    
    if (response.emotion) {
      const emotionColor = this.EMOTION_COLORS[response.emotion] || "white";
      const emotionBadge = this.createBadge(response.emotion, emotionColor);
      const extraInfo: string[] = [];
      
      if (response.topic) {
        extraInfo.push(this.colorize(`Topic: ${response.topic}`, "brightCyan"));
      }
      if (response.reasoning_time !== undefined) {
        extraInfo.push(this.colorize(`Reasoning: ${response.reasoning_time}s`, "gray"));
      }
      
      const extraInfoStr = extraInfo.length > 0 ? ` ${this.colorize("│", "gray")} ${extraInfo.join(` ${this.colorize("│", "gray")} `)}` : "";
      details.push(`  ${this.colorize("😊", "dim")} ${this.colorize("Emotion:", "dim")} ${emotionBadge}${extraInfoStr}`);
    } else {
      // If no emotion, show topic and reasoning separately
      if (response.topic) {
        details.push(`  ${this.colorize("🏷️", "dim")} ${this.colorize("Topic:", "dim")} ${this.colorize(response.topic, "brightCyan")}`);
      }
      if (response.reasoning_time !== undefined) {
        details.push(`  ${this.colorize("⏱️", "dim")} ${this.colorize("Reasoning:", "dim")} ${this.colorize(`${response.reasoning_time}s`, "gray")}`);
      }
    }
    
    if (response.status) {
      const statusColor = response.status === "success" ? "brightGreen" : "brightRed";
      const statusBadge = this.createBadge(response.status.toUpperCase(), statusColor);
      const codeInfo = response.code ? ` ${this.colorize(`(${response.code})`, "gray")}` : "";
      details.push(`  ${this.colorize("📊", "dim")} ${this.colorize("Status:", "dim")} ${statusBadge}${codeInfo}`);
    }

    if (response.external_patient_id) {
      details.push(`  ${this.colorize("🆔", "dim")} ${this.colorize("External ID:", "dim")} ${this.colorize(response.external_patient_id, "brightCyan")}`);
    }

    if (details.length > 0) {
      details.forEach(detail => this.log(detail));
    }
  }

  // Generator error logging with fallback info
  static logGeneratorError(
    method: string,
    requestId: string,
    duration: number,
    error: unknown,
    fallbackType?: string,
  ): void {
    const time = this.formatTime();
    const shortId = this.shortenRequestId(requestId);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const durationBadge = this.createBadge(this.formatDuration(duration), "brightYellow");
    const fallbackBadge = fallbackType ? ` ${this.createBadge("FALLBACK", "brightYellow")}` : "";
    
    // Header line
    this.logError(
      `${this.colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "brightCyan")} ${this.colorize("⚠", "brightYellow")} ${this.colorize(method, "bright")} ${this.colorize(`[${shortId}]`, "gray")} ${durationBadge}${fallbackBadge} ${this.colorize("│", "gray")} ${this.colorize(time, "dim")}`
    );

    // Error details
    this.logError(
      `  ${this.colorize("❌", "brightRed")} ${this.colorize("Error:", "brightRed")} ${this.colorize(errorMessage, "white")}`,
      error
    );

    if (fallbackType) {
      this.logError(
        `  ${this.colorize("🔄", "brightYellow")} ${this.colorize("Fallback:", "brightYellow")} ${this.colorize(fallbackType, "white")}`
      );
    }

    if (error instanceof Error && error.stack) {
      const stackLines = error.stack.split("\n").slice(1, 10);
      stackLines.forEach((line) => {
        this.logError(`  ${this.colorize("  └─", "gray")} ${this.colorize(line.trim(), "gray")}`);
      });
    }
  }

  // Specialized logging methods
  static logRandomization(
    patientName: string,
    responseCount: number,
    selectedIndex: number,
    emotion?: PatientEmotion,
    topic?: string,
  ): void {
    const emotionBadge = emotion ? ` ${this.createBadge(emotion, this.EMOTION_COLORS[emotion] || "white")}` : "";
    const topicBadge = topic ? ` ${this.createBadge(topic, "brightBlue")}` : "";
    const countBadge = this.createBadge(`${responseCount} responses`, "gray");
    const indexBadge = this.createBadge(`#${selectedIndex}`, "brightCyan");
    
    this.log(
      `${this.colorize("🎲", "brightMagenta")} ${this.colorize("[RANDOMIZATION]", "brightMagenta")} ${this.colorize(patientName, "white")} ${countBadge} ${this.colorize("→", "gray")} ${indexBadge}${emotionBadge}${topicBadge}`
    );
  }

  static logCacheCleanup(message: string): void {
    this.log(
      `${this.colorize("🧹", "brightYellow")} ${this.colorize("[CACHE]", "brightYellow")} ${this.colorize(message, "dim")}`
    );
  }

  static logWarning(message: string): void {
    const warningBadge = this.createBadge("WARNING", "brightYellow");
    this.logWarn(
      `${this.colorize(LOG_CONFIG.PREFIXES.PATIENT_GENERATOR, "brightCyan")} ${warningBadge} ${this.colorize(message, "white")}`
    );
  }
}
