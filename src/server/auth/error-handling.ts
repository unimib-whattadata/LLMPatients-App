/**
 * Enhanced error handling utilities for JWT authentication with database validation
 * Provides comprehensive error management for authentication flows
 */

export enum AuthErrorType {
  // Database errors
  DATABASE_CONNECTION = 'DATABASE_CONNECTION',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  DATABASE_QUERY_FAILED = 'DATABASE_QUERY_FAILED',
  
  // User validation errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_INVALID = 'SESSION_INVALID',
  
  // System errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: string;
  timestamp: string;
  userId?: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Creates a structured authentication error
 */
export function createAuthError(
  type: AuthErrorType,
  message: string,
  details?: string,
  userId?: string,
  retryable = false,
  severity: AuthError['severity'] = 'medium'
): AuthError {
  return {
    type,
    message,
    details,
    timestamp: new Date().toISOString(),
    userId,
    retryable,
    severity
  };
}

/**
 * Handles database connection errors with appropriate retry logic
 */
export function handleDatabaseError(error: Error, userId?: string): AuthError {
  const errorMessage = error.message.toLowerCase();
  
  // Determine error type based on error message
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return createAuthError(
      AuthErrorType.DATABASE_TIMEOUT,
      'Database query timed out',
      error.message,
      userId,
      true, // Retryable
      'medium'
    );
  }
  
  if (errorMessage.includes('connection') || errorMessage.includes('connect')) {
    return createAuthError(
      AuthErrorType.DATABASE_CONNECTION,
      'Database connection failed',
      error.message,
      userId,
      true, // Retryable
      'high'
    );
  }
  
  // General database query error
  return createAuthError(
    AuthErrorType.DATABASE_QUERY_FAILED,
    'Database query failed',
    error.message,
    userId,
    false, // Not retryable by default
    'medium'
  );
}

/**
 * Handles user validation errors
 */
export function handleUserValidationError(
  validationResult: { isValid: boolean; error?: string },
  userId?: string
): AuthError {
  const errorMessage = validationResult.error?.toLowerCase() ?? '';
  
  if (errorMessage.includes('not found')) {
    return createAuthError(
      AuthErrorType.USER_NOT_FOUND,
      'User not found in database',
      validationResult.error,
      userId,
      false, // Not retryable
      'high'
    );
  }
  
  if (errorMessage.includes('deactivated') || errorMessage.includes('inactive')) {
    return createAuthError(
      AuthErrorType.USER_DEACTIVATED,
      'User account is deactivated',
      validationResult.error,
      userId,
      false, // Not retryable
      'medium'
    );
  }
  
  // General validation error
  return createAuthError(
    AuthErrorType.DATABASE_QUERY_FAILED,
    'User validation failed',
    validationResult.error,
    userId,
    true, // May be retryable
    'medium'
  );
}

/**
 * Handles authentication credential errors
 */
export function handleCredentialsError(message: string, userId?: string): AuthError {
  return createAuthError(
    AuthErrorType.INVALID_CREDENTIALS,
    'Invalid authentication credentials',
    message,
    userId,
    false, // Credentials errors are not retryable
    'low'
  );
}

/**
 * Handles JWT token errors
 */
export function handleTokenError(message: string, userId?: string, isExpired = false): AuthError {
  const errorType = isExpired ? AuthErrorType.TOKEN_EXPIRED : AuthErrorType.TOKEN_INVALID;
  const errorMessage = isExpired ? 'JWT token has expired' : 'JWT token is invalid';
  
  return createAuthError(
    errorType,
    errorMessage,
    message,
    userId,
    isExpired, // Expired tokens can be retryable (new login), invalid tokens cannot
    isExpired ? 'low' : 'medium'
  );
}

/**
 * Handles session validation errors
 */
export function handleSessionError(message: string, userId?: string): AuthError {
  return createAuthError(
    AuthErrorType.SESSION_INVALID,
    'Session validation failed',
    message,
    userId,
    true, // Session errors are often retryable
    'medium'
  );
}

/**
 * Logs authentication errors with appropriate level and structured data
 */
export function logAuthError(error: AuthError, context?: Record<string, unknown>): void {
  const logData = {
    ...error,
    context: context ?? {},
    environment: process.env.NODE_ENV || 'unknown'
  };
  
  switch (error.severity) {
    case 'critical':
      console.error('🚨 CRITICAL AUTH ERROR:', logData);
      break;
    case 'high':
      console.error('❌ HIGH SEVERITY AUTH ERROR:', logData);
      break;
    case 'medium':
      console.warn('⚠️ MEDIUM SEVERITY AUTH ERROR:', logData);
      break;
    case 'low':
      console.info('ℹ️ LOW SEVERITY AUTH ERROR:', logData);
      break;
    default:
      console.log('📝 AUTH ERROR:', logData);
  }
}

/**
 * Determines if an error should trigger a retry based on its type and context
 */
export function shouldRetryOperation(error: AuthError, attemptCount: number, maxAttempts = 3): boolean {
  if (attemptCount >= maxAttempts) {
    return false;
  }
  
  if (!error.retryable) {
    return false;
  }
  
  // Special retry logic for different error types
  switch (error.type) {
    case AuthErrorType.DATABASE_TIMEOUT:
    case AuthErrorType.DATABASE_CONNECTION:
      return attemptCount < 3; // More aggressive retry for DB issues
    
    case AuthErrorType.DATABASE_QUERY_FAILED:
      return attemptCount < 2; // Limited retry for query failures
    
    case AuthErrorType.SESSION_INVALID:
      return attemptCount < 2; // Allow session retry
    
    default:
      return attemptCount < 1; // Single retry for other retryable errors
  }
}

/**
 * Calculates appropriate delay for retry attempts with exponential backoff
 */
export function calculateRetryDelay(attemptCount: number, baseDelay = 1000): number {
  const maxDelay = 10000; // 10 seconds max
  const delay = baseDelay * Math.pow(2, attemptCount - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Enhanced error handler that combines error creation, logging, and retry logic
 */
export async function handleAuthErrorWithRetry<T>(
  operation: () => Promise<T>,
  errorHandler: (error: Error) => AuthError,
  maxAttempts = 3,
  context?: Record<string, unknown>
): Promise<{ success: boolean; result?: T; error?: AuthError }> {
  let lastError: AuthError | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      // If we had previous errors but this attempt succeeded, log recovery
      if (lastError && attempt > 1) {
        console.log('✅ Auth operation recovered after retry:', {
          attempt,
          previousError: lastError.type,
          context
        });
      }
      
      return { success: true, result };
    } catch (error) {
      const authError = errorHandler(error instanceof Error ? error : new Error(String(error)));
      lastError = authError;
      
      // Log the error with attempt context
      logAuthError(authError, { ...context, attempt, maxAttempts });
      
      // Check if we should retry
      if (shouldRetryOperation(authError, attempt, maxAttempts)) {
        const delay = calculateRetryDelay(attempt);
        console.log(`🔄 Retrying auth operation in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // No more retries, return final error
      break;
    }
  }
  
  return { success: false, error: lastError };
}

/**
 * Creates user-friendly error messages for different auth error types
 */
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

/**
 * Error recovery strategies for different error types
 */
export interface ErrorRecoveryStrategy {
  shouldInvalidateToken: boolean;
  shouldRedirectToLogin: boolean;
  shouldShowToast: boolean;
  retryAfterMs?: number;
  fallbackAction?: 'useCache' | 'useStaleData' | 'failSafe';
}

export function getErrorRecoveryStrategy(error: AuthError): ErrorRecoveryStrategy {
  switch (error.type) {
    case AuthErrorType.USER_NOT_FOUND:
    case AuthErrorType.USER_DEACTIVATED:
      return {
        shouldInvalidateToken: true,
        shouldRedirectToLogin: true,
        shouldShowToast: true
      };
    
    case AuthErrorType.TOKEN_EXPIRED:
    case AuthErrorType.TOKEN_INVALID:
      return {
        shouldInvalidateToken: true,
        shouldRedirectToLogin: true,
        shouldShowToast: true
      };
    
    case AuthErrorType.DATABASE_CONNECTION:
    case AuthErrorType.DATABASE_TIMEOUT:
      return {
        shouldInvalidateToken: false,
        shouldRedirectToLogin: false,
        shouldShowToast: true,
        retryAfterMs: 5000,
        fallbackAction: 'useStaleData'
      };
    
    case AuthErrorType.SESSION_INVALID:
      return {
        shouldInvalidateToken: false,
        shouldRedirectToLogin: false,
        shouldShowToast: false,
        retryAfterMs: 1000,
        fallbackAction: 'useCache'
      };
    
    default:
      return {
        shouldInvalidateToken: false,
        shouldRedirectToLogin: false,
        shouldShowToast: true,
        fallbackAction: 'failSafe'
      };
  }
}