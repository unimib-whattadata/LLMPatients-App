function getErrorCause(error: unknown): unknown {
  if (typeof error === "object" && error !== null && "cause" in error) {
    return (error as { cause?: unknown }).cause;
  }

  return undefined;
}

function collectDbMessages(
  error: unknown,
  messages = new Set<string>(),
): Set<string> {
  // Drizzle wraps driver errors, so we walk the full cause chain and keep the
  // combined messages available to the higher-level mappers.
  if (error instanceof Error) {
    messages.add(error.message);
  } else {
    messages.add(String(error));
  }

  const cause = getErrorCause(error);
  if (cause !== undefined && cause !== error) {
    collectDbMessages(cause, messages);
  }

  return messages;
}

function collectDbCodes(
  error: unknown,
  codes = new Set<string>(),
): Set<string> {
  // Database-specific codes may also live in nested causes.
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    codes.add((error as { code: string }).code);
  }

  const cause = getErrorCause(error);
  if (cause !== undefined && cause !== error) {
    collectDbCodes(cause, codes);
  }

  return codes;
}

const POSTGRES_UNIQUE_VIOLATION = "23505";
const POSTGRES_RETRYABLE_ERROR_CODES = new Set(["40001", "40P01", "55P03"]);
const RETRYABLE_POSTGRES_MESSAGE_FRAGMENTS = [
  "could not serialize access",
  "deadlock detected",
  "could not obtain lock",
] as const;

export function getDbErrorMessage(error: unknown): string {
  return Array.from(collectDbMessages(error)).join(" | ");
}

export function getDbErrorCode(error: unknown): string | undefined {
  return Array.from(collectDbCodes(error))[0];
}

export function isUniqueConstraintError(
  error: unknown,
  fieldName?: string,
): boolean {
  const message = getDbErrorMessage(error).toLowerCase();
  const code = getDbErrorCode(error);
  const normalizedField = fieldName?.toLowerCase();

  const matchesUniqueViolation =
    code === POSTGRES_UNIQUE_VIOLATION ||
    message.includes("unique constraint") ||
    message.includes("duplicate key") ||
    message.includes("is not unique");

  if (!matchesUniqueViolation) {
    return false;
  }

  if (!normalizedField) {
    return true;
  }

  return message.includes(normalizedField);
}

export function isDatabaseLockedError(error: unknown): boolean {
  const message = getDbErrorMessage(error).toLowerCase();
  const code = getDbErrorCode(error);

  return (
    (code ? POSTGRES_RETRYABLE_ERROR_CODES.has(code) : false) ||
    RETRYABLE_POSTGRES_MESSAGE_FRAGMENTS.some((fragment) =>
      message.includes(fragment),
    )
  );
}

export function isSchemaOutOfDateError(error: unknown): boolean {
  const message = getDbErrorMessage(error).toLowerCase();
  const code = getDbErrorCode(error);

  return (
    code === "42P01" ||
    code === "42703" ||
    message.includes("no such table") ||
    message.includes("no such column") ||
    message.includes("has no column named") ||
    message.includes("relation") && message.includes("does not exist") ||
    message.includes("column") && message.includes("does not exist")
  );
}

type RetryOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
};

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function withDatabaseLockRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 8;
  const initialDelayMs = options.initialDelayMs ?? 50;

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;

      // PostgreSQL can fail transiently on serialization conflicts or locks.
      // Retry only those cases and let every other error fail fast.
      if (!isDatabaseLockedError(error) || attempt >= maxAttempts) {
        throw error;
      }

      await sleep(initialDelayMs * attempt);
    }
  }
}
