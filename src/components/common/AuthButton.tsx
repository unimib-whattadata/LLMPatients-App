"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { createLogger } from "~/lib/logger";

const logger = createLogger("AuthButton");

export default function AuthButton() {
  const { data: session, status } = useSession({
    required: false,
    onUnauthenticated() {
      logger.debug("User is not authenticated");
    },
  });

  
  const isAuthenticated = useCallback(() => {
    return !!(
      session?.user?.id &&
      session?.user?.email &&
      status === "authenticated"
    );
  }, [session, status]);

  
  const handleLogout = useCallback(async () => {
    try {
      
      const callbackUrl =
        typeof window !== "undefined" ? window.location.origin : "/";
      await signOut({ callbackUrl });
    } catch (error) {
      logger.error("Logout failed", error);
      
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  }, []);

  
  if (status === "loading") {
    return (
      <Button disabled aria-hidden="true">
        <Skeleton variant="text" className="h-4 w-16" />
      </Button>
    );
  }

  
  if (isAuthenticated()) {
    return (
      <div className="flex items-center space-x-2">
        <Button asChild>
          <Link href="/dashboard">
            Area Personale
          </Link>
        </Button>
        <Button
          onClick={handleLogout}
          variant="ghost"
          title="Logout"
        >
          Esci
        </Button>
      </div>
    );
  }

  
  return (
    <Button
      asChild
      variant="outline"
      className="border-2 border-[var(--color-primary-yellow)] bg-[var(--color-navbar-dark)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary-yellow)] hover:text-[var(--color-text-inverse)]"
    >
      <Link href="/login">
        Accedi
      </Link>
    </Button>
  );
}
