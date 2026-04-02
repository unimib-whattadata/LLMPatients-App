"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Check, Loader2, LogOut, XCircle } from "lucide-react";
import { useLogout } from "~/hooks/useLogout";

export default function SignoutPage() {
  const router = useRouter();
  const hasStartedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const { clearError, errorMessage, isLoggingOut, logout } = useLogout();

  const runLogout = useCallback(async () => {
    clearError();
    setStatus("loading");

    const result = await logout({
      callbackUrl: "/",
      redirect: false,
    });

    if (!result.ok) {
      setStatus("error");
      return;
    }

    setStatus("success");

    const redirectTarget = result.url ?? "/";
    window.setTimeout(() => {
      router.replace(redirectTarget);
    }, 1500);
  }, [clearError, logout, router]);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    void runLogout();
  }, [runLogout]);

  return (
    <div className="min-h-screen flex">
      { }
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-green/10 to-primary-violet/10 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-primary-green mb-6">
            Goodbye!
          </h1>
          <p className="text-xl text-text-secondary leading-relaxed">
            Thanks for using LLMPatients. We are closing your session securely.
          </p>
          <div className="mt-8 flex items-center justify-center space-x-4 text-sm text-text-tertiary">
            <span>•</span>
            <span>Secure sign-out</span>
            <span>•</span>
            <span>Data protected</span>
            <span>•</span>
            <span>See you soon</span>
          </div>
        </div>
      </div>

      { }
      <div className="w-full lg:w-1/2 bg-[var(--color-navbar-dark)] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center">
            { }
            <div className="mb-6">
              <div className="bg-primary-green/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <LogOut className="h-8 w-8 text-primary-green" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Signing out
              </h1>
              <p className="text-text-secondary">
                You are about to be signed out
              </p>
            </div>

            { }
            <div className="space-y-4">
              {status === "loading" && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-green" aria-hidden="true" />
                  </div>
                  <p className="text-text-secondary">
                    {isLoggingOut ? "Signing out..." : "Preparing sign-out..."}
                  </p>
                </div>
              )}

              {status === "success" && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-primary-green/20 flex h-8 w-8 items-center justify-center rounded-full">
                      <Check className="h-5 w-5 text-primary-green" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="text-text-primary font-medium">
                    Signed out successfully
                  </p>
                  <p className="text-text-secondary text-sm">
                    You will be redirected to the homepage...
                  </p>
                </div>
              )}

              {status === "error" && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-error/20 flex h-8 w-8 items-center justify-center rounded-full">
                      <XCircle className="h-5 w-5 text-error" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="text-text-primary font-medium">
                    Sign-out error
                  </p>
                  <p className="text-text-secondary text-sm">
                    {errorMessage || "Unable to sign out right now."}
                  </p>
                  <p className="text-text-tertiary text-xs">
                    Your session is still active until the sign-out request succeeds.
                  </p>
                  <Button
                    onClick={() => void runLogout()}
                    variant="outline"
                    className="w-full"
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? "Retrying..." : "Retry Sign Out"}
                  </Button>
                </div>
              )}
            </div>

            { }
            <div className="mt-8 pt-6">
              <Button
                onClick={() => router.push("/")}
                className="w-full bg-primary-green hover:bg-primary-green/90 text-text-inverse font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
