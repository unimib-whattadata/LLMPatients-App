import { createLogger } from "~/lib/logger";

const logger = createLogger("Json");

type JsonParseOptions<T> = {
  fallback: T;
  context?: string;
  logFailures?: boolean;
};

export function parseJsonOr<T>(
  value: string | null | undefined,
  options: JsonParseOptions<T>,
): T {
  if (!value) {
    return options.fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    if (options.logFailures !== false) {
      logger.warn("Unable to parse JSON text", {
        context: options.context ?? "unspecified",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return options.fallback;
  }
}

export function parseJsonRecord(
  value: string | null | undefined,
): Record<string, unknown> | null {
  const parsed = parseJsonOr<unknown>(value, {
    fallback: null,
    context: "record",
    logFailures: false,
  });

  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
}

export function parseStringArray(value: string | null | undefined): string[] {
  const parsed = parseJsonOr<unknown>(value, {
    fallback: [],
    context: "string-array",
    logFailures: false,
  });

  return Array.isArray(parsed)
    ? parsed.filter((entry): entry is string => typeof entry === "string")
    : [];
}
