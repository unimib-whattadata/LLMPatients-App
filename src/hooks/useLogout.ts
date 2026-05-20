"use client";

import { useCallback, useState } from "react";

interface LogoutOptions {
  callbackUrl?: string;
}

interface LogoutSuccessResult {
  ok: true;
  url: string | null;
}

interface LogoutFailureResult {
  ok: false;
  error: Error;
}

type LogoutResult = LogoutSuccessResult | LogoutFailureResult;

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const logout = useCallback(
    async (options: LogoutOptions = {}): Promise<LogoutResult> => {
      if (isLoggingOut) {
        return {
          ok: false,
          error: new Error("Logout already in progress"),
        };
      }

      setIsLoggingOut(true);
      setErrorMessage(null);

      try {
        const callbackUrl = options.callbackUrl ?? "/";
        const signoutUrl = new URL("/signout", window.location.origin);
        signoutUrl.searchParams.set("callbackUrl", callbackUrl);
        window.location.assign(signoutUrl.toString());

        return {
          ok: true,
          url: callbackUrl,
        };
      } catch (error) {
        setErrorMessage("Unable to sign out right now. Please retry.");

        return {
          ok: false,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      } finally {
        setIsLoggingOut(false);
      }
    },
    [isLoggingOut],
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    clearError,
    errorMessage,
    isLoggingOut,
    logout,
  };
}
