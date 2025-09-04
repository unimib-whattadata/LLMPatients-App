"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

/**
 * Dynamic Authentication Button Component
 * 
 * This component displays different buttons based on the user's authentication state:
 * - If authenticated: Shows "Area Personale" link to dashboard
 * - If not authenticated: Shows "Accedi" link to login page
 * - Handles loading states with a skeleton loader
 */
export default function AuthButton() {
  const { data: session, status } = useSession();

  // Show loading skeleton while session is being fetched
  if (status === "loading") {
    return (
      <div className="btn btn-primary btn-md animate-pulse">
        <div className="h-4 w-16 bg-gray-300 rounded"></div>
      </div>
    );
  }

  // Show Area Personale if user is authenticated
  if (session?.user) {
    return (
      <Link
        href="/dashboard"
        className="btn btn-primary btn-md"
      >
        Area Personale
      </Link>
    );
  }

  // Show login button if not authenticated
  return (
    <Link
      href="/login"
      className="btn btn-primary btn-md"
    >
      Accedi
    </Link>
  );
}