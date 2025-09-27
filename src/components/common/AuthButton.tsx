"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

/**
 * Dynamic Authentication Button Component
 *
 * This component displays different buttons based on the user's authentication state:
 * - If authenticated: Shows "Area Personale" link to dashboard and logout button
 * - If not authenticated: Shows "Accedi" link to login page
 * - Handles loading states with a loading indicator
 */
export default function AuthButton() {
  const { data: session, status } = useSession({
    required: false,
    onUnauthenticated() {
      console.log("AuthButton: User not authenticated");
    },
  });

  // Session validation
  const isAuthenticated = useCallback(() => {
    return !!(
      session?.user?.id &&
      session?.user?.email &&
      status === "authenticated"
    );
  }, [session, status]);

  // Logout handler with proper callback URL
  const handleLogout = useCallback(async () => {
    try {
      // Use window.location.origin to ensure proper redirect to homepage
      const callbackUrl =
        typeof window !== "undefined" ? window.location.origin : "/";
      await signOut({ callbackUrl });
    } catch (error) {
      console.error("AuthButton - Logout failed:", error);
      // Fallback: redirect manually if signOut fails
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  }, []);

  // Show loading state while session is being fetched
  if (status === "loading") {
    return (
      <Button variant="primary" size="default" disabled aria-hidden="true">
        <Skeleton variant="text" className="h-4 w-16" />
      </Button>
    );
  }

  // Show Area Personale and logout if user is authenticated
  if (isAuthenticated()) {
    return (
      <div className="flex items-center space-x-2">
        <Button asChild variant="primary" size="default">
          <Link href="/dashboard">
            Area Personale
          </Link>
        </Button>
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="default"
          title="Logout"
        >
          Esci
        </Button>
      </div>
    );
  }

  // Show login button if not authenticated
  return (
    <Button asChild variant="primary" size="default">
      <Link href="/login">
        Accedi
      </Link>
    </Button>
  );
}
