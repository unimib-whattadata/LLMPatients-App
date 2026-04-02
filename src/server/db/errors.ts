function getErrorCause(error: unknown): unknown {
  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error
  ) {
    return (error as { cause?: unknown }).cause;
  }

  return undefined;
}

function collectDbMessages(error: unknown, messages = new Set<string>()): Set<string> {
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

function collectDbCodes(error: unknown, codes = new Set<string>()): Set<string> {
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
    code === "23505" ||
    code === "SQLITE_CONSTRAINT_UNIQUE" ||
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
    code === "SQLITE_BUSY" ||
    message.includes("database is locked") ||
    message.includes("sqlite_busy")
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

      // SQLite can briefly lock the file during concurrent writes. We retry
      // only that transient case and let every other error fail fast.
      if (!isDatabaseLockedError(error) || attempt >= maxAttempts) {
        throw error;
      }

      await sleep(initialDelayMs * attempt);
    }
  }
}
