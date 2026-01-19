"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Check, Loader2, LogOut, XCircle } from "lucide-react";
import { createLogger } from "~/lib/logger";

const logger = createLogger("Signout");

export default function SignoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSignout = async () => {
      try {
        setStatus("loading");


        await signOut({
          callbackUrl: "/",
          redirect: false,
        });

        setStatus("success");


        setTimeout(() => {
          router.push("/");
        }, 1500);
      } catch (err) {
        logger.error("Signout failed", err);
        setError(
          "Si è verificato un errore durante il logout. Verrai reindirizzato alla homepage.",
        );
        setStatus("error");


        setTimeout(() => {
          router.push("/");
        }, 3000);
      }
    };

    void handleSignout();
  }, [router]);

  return (
    <div className="min-h-screen flex">
      { }
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-green/10 to-primary-violet/10 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-primary-green mb-6">
            Arrivederci!
          </h1>
          <p className="text-xl text-text-secondary leading-relaxed">
            Grazie per aver utilizzato LLMPatient. La tua sessione è stata terminata in sicurezza.
          </p>
          <div className="mt-8 flex items-center justify-center space-x-4 text-sm text-text-tertiary">
            <span>•</span>
            <span>Sessione terminata</span>
            <span>•</span>
            <span>Dati protetti</span>
            <span>•</span>
            <span>Arrivederci a presto</span>
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
                Logout in corso
              </h1>
              <p className="text-text-secondary">
                Stai per essere disconnesso dal sistema
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
                    Disconnessione in corso...
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
                    Logout completato con successo
                  </p>
                  <p className="text-text-secondary text-sm">
                    Verrai reindirizzato alla homepage...
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
                    Errore durante il logout
                  </p>
                  <p className="text-text-secondary text-sm">
                    {error || "Si è verificato un errore imprevisto."}
                  </p>
                  <p className="text-text-tertiary text-xs">
                    Verrai comunque reindirizzato alla homepage...
                  </p>
                </div>
              )}
            </div>

            { }
            <div className="mt-8 pt-6">
              <Button
                onClick={() => router.push("/")}
                className="w-full bg-primary-green hover:bg-primary-green/90 text-text-inverse font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                Vai alla Homepage
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
