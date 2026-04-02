"use client";

import { useCallback, useState } from "react";
import { signOut, useSession } from "next-auth/react";

import { createLogger } from "~/lib/logger";
import { api } from "~/trpc/react";

const logger = createLogger("Logout");

interface LogoutOptions {
  callbackUrl?: string;
  redirect?: boolean;
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

function isAlreadyClosedImpersonationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /no active impersonation session found/i.test(error.message)
  );
}

function extractSignOutUrl(response: unknown): string | null {
  if (
    typeof response === "object" &&
    response !== null &&
    "url" in response &&
    typeof (response as { url?: unknown }).url === "string"
  ) {
    return (response as { url: string }).url;
  }

  return null;
}

export function useLogout() {
  const { data: session } = useSession();
  const endImpersonation = api.impersonation.endImpersonation.useMutation();
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
        if (session?.impersonation?.isImpersonating) {
          try {
            await endImpersonation.mutateAsync({});
          } catch (error) {
            if (isAlreadyClosedImpersonationError(error)) {
              logger.warn("Impersonation already closed before logout");
            } else {
              // The auth sign-out event performs the same cleanup on the server,
              // so a client-side failure should not block the logout itself.
              logger.warn(
                "Failed to close impersonation before logout, relying on sign-out cleanup",
                error,
              );
            }
          }
        }

        const callbackUrl = options.callbackUrl ?? "/";
        if (options.redirect === false) {
          const response = await signOut({
            callbackUrl,
            redirect: false,
          });

          return {
            ok: true,
            url: extractSignOutUrl(response),
          };
        }

        await signOut({
          callbackUrl,
          redirect: true,
        });

        return {
          ok: true,
          url: null,
        };
      } catch (error) {
        logger.error("Logout failed", error);

        setErrorMessage("Unable to sign out right now. Please retry.");

        return {
          ok: false,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      } finally {
        setIsLoggingOut(false);
      }
    },
    [endImpersonation, isLoggingOut, session],
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
