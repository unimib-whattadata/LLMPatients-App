"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

/**
 * Dynamic Authentication Button Component
 * 
 * This component displays different buttons based on the user's authentication state:
 * - If authenticated: Shows "Area Personale" link to dashboard
 * - If not authenticated: Shows "Accedi" link to login page
 * - Handles loading states with a skeleton loader
 * - Implements proper session validation and automatic refresh
 */
export default function AuthButton() {
  const { data: session, status, update } = useSession();
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Enhanced session validation
  const isAuthenticated = useCallback(() => {
    return !!session?.user?.id && !!session?.user?.email;
  }, [session]);

  // Debug session information in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const info = `Status: ${status}, Session: ${session ? 'exists' : 'null'}, User: ${session?.user?.email || 'none'}, Role: ${(session?.user as any)?.role || 'none'}`;
      setDebugInfo(info);
      console.log('AuthButton - Session State:', {
        status,
        session: session,
        user: session?.user,
        isAuthenticated: isAuthenticated(),
        timestamp: new Date().toISOString()
      });
    }
  }, [session, status, isAuthenticated]);

  // Automatic session refresh on window focus
  useEffect(() => {
    const handleFocus = async () => {
      if (status !== 'loading' && !isRefreshing) {
        console.log('AuthButton - Window focused, refreshing session...');
        setIsRefreshing(true);
        try {
          await update();
        } catch (error) {
          console.error('AuthButton - Session refresh failed:', error);
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [status, update, isRefreshing]);

  // Force session update mechanism
  const handleForceUpdate = async () => {
    console.log('AuthButton - Forcing session update...');
    setIsRefreshing(true);
    try {
      await update();
    } catch (error) {
      console.error('AuthButton - Force update failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show loading skeleton while session is being fetched or refreshing
  if (status === "loading" || isRefreshing) {
    return (
      <div className="btn btn-primary btn-md animate-pulse" title={debugInfo}>
        <div className="h-4 w-16 bg-gray-300 rounded"></div>
        {process.env.NODE_ENV === 'development' && (
          <span className="ml-2 text-xs opacity-70">
            {isRefreshing ? 'Refreshing...' : 'Loading...'}
          </span>
        )}
      </div>
    );
  }

  // Show Area Personale if user is authenticated with proper validation
  if (isAuthenticated()) {
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
            className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
            title="Force session refresh"
            disabled={isRefreshing}
          >
            {isRefreshing ? '⏳' : '🔄'}
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
          className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
          title="Force session check"
          disabled={isRefreshing}
        >
          {isRefreshing ? '⏳' : '🔄'}
        </button>
      )}
    </div>
  );
}