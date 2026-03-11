"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bug, X } from "lucide-react";
import { createLogger } from "~/lib/logger";

const logger = createLogger("SessionDebug");

interface SessionDebugProps {
  enabled?: boolean;
}

interface SessionDebugInfo {
  status: string;
  sessionData: Record<string, unknown> | null;
  cookieInfo: string[];
  clientTimestamp: string;
  userAgent: string;
}

function SessionDebug({ enabled = false }: SessionDebugProps) {
  const { data: session, status, update } = useSession();
  const [debugInfo, setDebugInfo] = useState<SessionDebugInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const updateDebugInfo = () => {
      const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
      const authCookies = cookies.filter(
        (cookie) =>
          cookie.includes("next-auth") ||
          cookie.includes("__Secure-next-auth") ||
          cookie.includes("session"),
      );

      setDebugInfo({
        status,
        sessionData: session as Record<string, unknown> | null,
        cookieInfo:
          authCookies.length > 0 ? authCookies : ["No auth cookies found"],
        clientTimestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
    };

    updateDebugInfo();

    
    const interval = setInterval(updateDebugInfo, 2000);

    return () => clearInterval(interval);
  }, [enabled, session, status]);

  if (!enabled || !debugInfo) return null;

  return (
    <>
      {}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-accent-600 text-text-primary hover:bg-accent-700 fixed bottom-4 left-4 z-50 rounded-full p-3"
        title="Toggle Session Debug Info"
      >
        <Bug className="h-5 w-5" aria-hidden="true" />
      </button>

      {}
      {isVisible && (
        <div className="bg-background-secondary/95 text-text-secondary fixed bottom-20 left-4 z-50 max-h-96 max-w-lg overflow-auto rounded-lg p-4 font-mono text-xs">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-text-primary font-bold">Session Debug Info</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-text-tertiary hover:text-text-primary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close panel</span>
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-secondary-300">Status:</span>
              <span
                className={`ml-2 ${
                  status === "authenticated"
                    ? "text-success-500"
                    : status === "loading"
                      ? "text-warning-500"
                      : "text-error-500"
                }`}
              >
                {status}
              </span>
            </div>

            <div>
              <span className="text-secondary-300">Session Data:</span>
              <pre className="bg-background-tertiary mt-1 overflow-x-auto rounded p-2 text-xs">
                {JSON.stringify(debugInfo.sessionData, null, 2) || "null"}
              </pre>
            </div>

            <div>
              <span className="text-secondary-300">Auth Cookies:</span>
              <div className="mt-1 space-y-1">
                {debugInfo.cookieInfo.map((cookie, index) => (
                  <div key={index} className="text-xs break-all">
                    {cookie}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-secondary-300">Last Updated:</span>
              <span className="ml-2">{debugInfo.clientTimestamp}</span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  void update();
                  logger.debug("Session update triggered manually");
                }}
                className="bg-accent-600 text-text-primary hover:bg-accent-700 rounded px-3 py-1 text-xs"
              >
                Force Session Update
              </button>
            </div>

            <div>
              <button
                onClick={() => {
                  logger.info("Session debug info logged to console", { status, hasSession: !!session });
                }}
                className="bg-success-600 text-text-primary hover:bg-success-700 ml-2 rounded px-3 py-1 text-xs"
              >
                Log to Console
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SessionDebug;
