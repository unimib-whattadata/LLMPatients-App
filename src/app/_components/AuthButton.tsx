"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/**
 * Dynamic Authentication Button Component
 * 
 * This component displays different buttons based on the user's authentication state:
 * - If authenticated: Shows "Area Personale" link to dashboard
 * - If not authenticated: Shows "Accedi" link to login page
 * - Handles loading states with a skeleton loader
 */
export default function AuthButton() {
  const { data: session, status, update } = useSession();
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [forceUpdate, setForceUpdate] = useState(0);

  // Debug session information in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const info = `Status: ${status}, Session: ${session ? 'exists' : 'null'}, User: ${session?.user?.email || 'none'}`;
      setDebugInfo(info);
      console.log('AuthButton - Session State:', {
        status,
        session: session,
        user: session?.user,
        timestamp: new Date().toISOString()
      });
    }
  }, [session, status]);

  // Force session update mechanism
  const handleForceUpdate = async () => {
    console.log('AuthButton - Forcing session update...');
    await update();
    setForceUpdate(prev => prev + 1);
  };

  // Show loading skeleton while session is being fetched
  if (status === "loading") {
    return (
      <div className="btn btn-primary btn-md animate-pulse" title={debugInfo}>
        <div className="h-4 w-16 bg-gray-300 rounded"></div>
        {process.env.NODE_ENV === 'development' && (
          <span className="ml-2 text-xs opacity-70">Loading...</span>
        )}
      </div>
    );
  }

  // Show Area Personale if user is authenticated
  if (session?.user) {
    return (
      <div className="flex items-center space-x-2">
        <Link
          href="/dashboard"
          className="btn btn-primary btn-md"
          title={debugInfo}
        >
          Area Personale
        </Link>
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleForceUpdate}
            className="text-xs bg-gray-200 px-2 py-1 rounded"
            title="Force session refresh"
          >
            🔄
          </button>
        )}
      </div>
    );
  }

  // Show login button if not authenticated
  return (
    <div className="flex items-center space-x-2">
      <Link
        href="/login"
        className="btn btn-primary btn-md"
        title={debugInfo}
      >
        Accedi
      </Link>
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={handleForceUpdate}
          className="text-xs bg-gray-200 px-2 py-1 rounded"
          title="Force session check"
        >
          🔄
        </button>
      )}
    </div>
  );
}