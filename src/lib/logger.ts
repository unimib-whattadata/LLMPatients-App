type LogLevel = "debug" | "info" | "warn" | "error";

type ConsoleMethod = "debug" | "info" | "warn" | "error" | "log";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Emoji per ogni livello di log
const LEVEL_EMOJI: Record<LogLevel, string> = {
  debug: "🔍",
  info: "📘",
  warn: "⚠️",
  error: "❌",
};

// Colori ANSI per il terminale
const ANSI_COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  // Foreground colors
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
} as const;

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: ANSI_COLORS.cyan,
  info: ANSI_COLORS.blue,
  warn: ANSI_COLORS.yellow,
  error: ANSI_COLORS.red,
};

// Controlla se siamo in ambiente Node.js (server-side)
const isServer = typeof window === "undefined";

const DEFAULT_LEVEL: LogLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) ||
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "warn" : "debug");

function shouldLog(level: LogLevel): boolean {
  const currentLevel = LEVEL_PRIORITY[DEFAULT_LEVEL] ?? LEVEL_PRIORITY.debug;
  return LEVEL_PRIORITY[level] >= currentLevel;
}

function mapToConsoleMethod(level: LogLevel): ConsoleMethod {
  if (level === "debug") return "debug";
  if (level === "info") return "info";
  return level;
}

function normalizeMeta(meta?: unknown): Record<string, unknown> | undefined {
  if (meta === undefined) return undefined;

  if (meta instanceof Error) {
    return {
      error: {
        name: meta.name,
        message: meta.message,
        stack: meta.stack,
      },
    };
  }

  if (typeof meta === "object" && meta !== null) {
    return meta as Record<string, unknown>;
  }

  return { detail: meta };
}

function formatPrefix(level: LogLevel, namespace: string): string {
  const emoji = LEVEL_EMOJI[level];
  const color = LEVEL_COLOR[level];

  if (isServer) {
    // Terminale: usa colori ANSI
    return `${emoji} ${color}[${namespace}]${ANSI_COLORS.reset}`;
  } else {
    // Browser: solo emoji (i colori ANSI non funzionano nella console del browser)
    return `${emoji} [${namespace}]`;
  }
}

export interface Logger {
  debug: (message: string, meta?: unknown) => void;
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
  child: (context: Record<string, unknown>) => Logger;
}

function createLogFunction(
  namespace: string,
  baseContext: Record<string, unknown>,
  level: LogLevel,
): (message: string, meta?: unknown) => void {
  return (message, meta) => {
    if (!shouldLog(level) || typeof console === "undefined") return;

    const consoleMethod = mapToConsoleMethod(level);
    const normalizedMeta = normalizeMeta(meta);
    const mergedContext = normalizedMeta
      ? { ...baseContext, ...normalizedMeta }
      : baseContext;
    const hasContext = Object.keys(mergedContext).length > 0;
    const prefix = formatPrefix(level, namespace);

    if (hasContext) {
      // Use structured logging-friendly format where available.
      (console[consoleMethod] ?? console.log).call(
        console,
        `${prefix} ${message}`,
        mergedContext,
      );
    } else {
      (console[consoleMethod] ?? console.log).call(
        console,
        `${prefix} ${message}`,
      );
    }
  };
}

export function createLogger(
  namespace: string,
  baseContext: Record<string, unknown> = {},
): Logger {
  return {
    debug: createLogFunction(namespace, baseContext, "debug"),
    info: createLogFunction(namespace, baseContext, "info"),
    warn: createLogFunction(namespace, baseContext, "warn"),
    error: createLogFunction(namespace, baseContext, "error"),
    child: (context: Record<string, unknown>) =>
      createLogger(namespace, { ...baseContext, ...context }),
  };
}
