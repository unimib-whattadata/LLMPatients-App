
export enum AuthErrorType {
  
  DATABASE_CONNECTION = "DATABASE_CONNECTION",
  DATABASE_TIMEOUT = "DATABASE_TIMEOUT",
  DATABASE_QUERY_FAILED = "DATABASE_QUERY_FAILED",

  
  USER_NOT_FOUND = "USER_NOT_FOUND",
  USER_DEACTIVATED = "USER_DEACTIVATED",
  USER_ROLE_CHANGED = "USER_ROLE_CHANGED",

  
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_INVALID = "TOKEN_INVALID",
  SESSION_INVALID = "SESSION_INVALID",

  
  NETWORK_ERROR = "NETWORK_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: string;
  timestamp: string;
  userId?: string;
  retryable: boolean;
  severity: "low" | "medium" | "high" | "critical";
}

export function createAuthError(
  type: AuthErrorType,
  message: string,
  details?: string,
  userId?: string,
  retryable = false,
  severity: AuthError["severity"] = "medium",
): AuthError {
  return {
    type,
    message,
    details,
    timestamp: new Date().toISOString(),
    userId,
    retryable,
    severity,
  };
}

export function handleDatabaseError(error: Error, userId?: string): AuthError {
  const errorMessage = error.message.toLowerCase();

  
  if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
    return createAuthError(
      AuthErrorType.DATABASE_TIMEOUT,
      "Database query timed out",
      error.message,
      userId,
      true, 
      "medium",
    );
  }

  if (errorMessage.includes("connection") || errorMessage.includes("connect")) {
    return createAuthError(
      AuthErrorType.DATABASE_CONNECTION,
      "Database connection failed",
      error.message,
      userId,
      true, 
      "high",
    );
  }

  
  return createAuthError(
    AuthErrorType.DATABASE_QUERY_FAILED,
    "Database query failed",
    error.message,
    userId,
    false, 
    "medium",
  );
}

export function handleUserValidationError(
  validationResult: { isValid: boolean; error?: string },
  userId?: string,
): AuthError {
  const errorMessage = validationResult.error?.toLowerCase() ?? "";

  if (errorMessage.includes("not found")) {
    return createAuthError(
      AuthErrorType.USER_NOT_FOUND,
      "User not found in database",
      validationResult.error,
      userId,
      false, 
      "high",
    );
  }

  if (
    errorMessage.includes("deactivated") ||
    errorMessage.includes("inactive")
  ) {
    return createAuthError(
      AuthErrorType.USER_DEACTIVATED,
      "User account is deactivated",
      validationResult.error,
      userId,
      false, 
      "medium",
    );
  }

  
  return createAuthError(
    AuthErrorType.DATABASE_QUERY_FAILED,
    "User validation failed",
    validationResult.error,
    userId,
    true, 
    "medium",
  );
}

export function handleCredentialsError(
  message: string,
  userId?: string,
): AuthError {
  return createAuthError(
    AuthErrorType.INVALID_CREDENTIALS,
    "Invalid authentication credentials",
    message,
    userId,
    false, 
    "low",
  );
}

export function handleTokenError(
  message: string,
  userId?: string,
  isExpired = false,
): AuthError {
  const errorType = isExpired
    ? AuthErrorType.TOKEN_EXPIRED
    : AuthErrorType.TOKEN_INVALID;
  const errorMessage = isExpired
    ? "JWT token has expired"
    : "JWT token is invalid";

  return createAuthError(
    errorType,
    errorMessage,
    message,
    userId,
    isExpired, 
    isExpired ? "low" : "medium",
  );
}

export function handleSessionError(
  message: string,
  userId?: string,
): AuthError {
  return createAuthError(
    AuthErrorType.SESSION_INVALID,
    "Session validation failed",
    message,
    userId,
    true, 
    "medium",
  );
}

export function logAuthError(
  error: AuthError,
  context?: Record<string, unknown>,
): void {
  const logData = {
    ...error,
    context: context ?? {},
    environment: process.env.NODE_ENV || "unknown",
  };

  switch (error.severity) {
    case "critical":
      console.error("🚨 CRITICAL AUTH ERROR:", logData);
      break;
    case "high":
      console.error("[HIGH SEVERITY] AUTH ERROR:", logData);
      break;
    case "medium":
      console.warn(" MEDIUM SEVERITY AUTH ERROR:", logData);
      break;
    case "low":
      console.info(" LOW SEVERITY AUTH ERROR:", logData);
      break;
    default:
      console.log("AUTH ERROR:", logData);
  }
}

export function shouldRetryOperation(
  error: AuthError,
  attemptCount: number,
  maxAttempts = 3,
): boolean {
  if (attemptCount >= maxAttempts) {
    return false;
  }

  if (!error.retryable) {
    return false;
  }

  
  switch (error.type) {
    case AuthErrorType.DATABASE_TIMEOUT:
    case AuthErrorType.DATABASE_CONNECTION:
      return attemptCount < 3; 

    case AuthErrorType.DATABASE_QUERY_FAILED:
      return attemptCount < 2; 

    case AuthErrorType.SESSION_INVALID:
      return attemptCount < 2; 

    default:
      return attemptCount < 1; 
  }
}

export function calculateRetryDelay(
  attemptCount: number,
  baseDelay = 1000,
): number {
  const maxDelay = 10000; 
  const delay = baseDelay * Math.pow(2, attemptCount - 1);
  return Math.min(delay, maxDelay);
}

export async function handleAuthErrorWithRetry<T>(
  operation: () => Promise<T>,
  errorHandler: (error: Error) => AuthError,
  maxAttempts = 3,
  context?: Record<string, unknown>,
): Promise<{ success: boolean; result?: T; error?: AuthError }> {
  let lastError: AuthError | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();

      
      if (lastError && attempt > 1) {
        console.log("[RECOVERY] Auth operation recovered after retry:", {
          attempt,
          previousError: lastError.type,
          context,
        });
      }

      return { success: true, result };
    } catch (error) {
      const authError = errorHandler(
        error instanceof Error ? error : new Error(String(error)),
      );
      lastError = authError;

      
      logAuthError(authError, { ...context, attempt, maxAttempts });

      
      if (shouldRetryOperation(authError, attempt, maxAttempts)) {
        const delay = calculateRetryDelay(attempt);
        console.log(
          `🔄 Retrying auth operation in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      
      break;
    }
  }

  return { success: false, error: lastError };
}

export function getUserFriendlyErrorMessage(error: AuthError): string {
  switch (error.type) {
    case AuthErrorType.DATABASE_CONNECTION:
    case AuthErrorType.DATABASE_TIMEOUT:
      return "We're experiencing technical difficulties. Please try again in a moment.";

    case AuthErrorType.USER_NOT_FOUND:
      return "Account not found. Please check your credentials or register for a new account.";

    case AuthErrorType.USER_DEACTIVATED:
      return "Your account has been deactivated. Please contact support for assistance.";

    case AuthErrorType.INVALID_CREDENTIALS:
      return "Invalid email or password. Please check your credentials and try again.";

    case AuthErrorType.TOKEN_EXPIRED:
      return "Your session has expired. Please log in again.";

    case AuthErrorType.TOKEN_INVALID:
    case AuthErrorType.SESSION_INVALID:
      return "Your session is invalid. Please log in again.";

    case AuthErrorType.USER_ROLE_CHANGED:
      return "Your account permissions have been updated. Please log in again to continue.";

    default:
      return "An unexpected error occurred. Please try again or contact support if the problem persists.";
  }
}

export interface ErrorRecoveryStrategy {
  shouldInvalidateToken: boolean;
  shouldRedirectToLogin: boolean;
  shouldShowToast: boolean;
  retryAfterMs?: number;
  fallbackAction?: "useCache" | "useStaleData" | "failSafe";
}

export function getErrorRecoveryStrategy(
  error: AuthError,
): ErrorRecoveryStrategy {
  switch (error.type) {
    case AuthErrorType.USER_NOT_FOUND:
    case AuthErrorType.USER_DEACTIVATED:
      return {
        shouldInvalidateToken: true,
        shouldRedirectToLogin: true,
        shouldShowToast: true,
      };

    case AuthErrorType.TOKEN_EXPIRED:
    case AuthErrorType.TOKEN_INVALID:
      return {
        shouldInvalidateToken: true,
        shouldRedirectToLogin: true,
        shouldShowToast: true,
      };

    case AuthErrorType.DATABASE_CONNECTION:
    case AuthErrorType.DATABASE_TIMEOUT:
      return {
        shouldInvalidateToken: false,
        shouldRedirectToLogin: false,
        shouldShowToast: true,
        retryAfterMs: 5000,
        fallbackAction: "useStaleData",
      };

    case AuthErrorType.SESSION_INVALID:
      return {
        shouldInvalidateToken: false,
        shouldRedirectToLogin: false,
        shouldShowToast: false,
        retryAfterMs: 1000,
        fallbackAction: "useCache",
      };

    default:
      return {
        shouldInvalidateToken: false,
        shouldRedirectToLogin: false,
        shouldShowToast: true,
        fallbackAction: "failSafe",
      };
  }
}
