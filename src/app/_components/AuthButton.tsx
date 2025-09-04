"use client";

import Link from "next/link";
import { useSession, getSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

/**
 * Dynamic Authentication Button Component
 * 
 * This component displays different buttons based on the user's authentication state:
 * - If authenticated: Shows "Area Personale" link to dashboard
 * - If not authenticated: Shows "Accedi" link to login page
 * - Handles loading states with a skeleton loader
 * - Implements proper JWT session validation and automatic refresh
 */
export default function AuthButton() {
  const { data: session, status, update } = useSession({
    required: false,
    onUnauthenticated() {
      console.log('AuthButton: User not authenticated');
    }
  });
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionRetries, setSessionRetries] = useState(0);
  const MAX_RETRIES = 3;

  // Enhanced session validation with comprehensive checks
  const isAuthenticated = useCallback(() => {
    const isValid = !!(session?.user?.id && session?.user?.email && status === "authenticated");
    console.log('AuthButton - Session validation:', {
      hasSession: !!session,
      hasUserId: !!session?.user?.id,
      hasUserEmail: !!session?.user?.email,
      status,
      isValid,
      userRole: (session?.user as any)?.role
    });
    return isValid;
  }, [session, status]);

  // Force session refresh mechanism with retry logic
  const refreshSession = useCallback(async () => {
    if (isRefreshing || sessionRetries >= MAX_RETRIES) return;
    
    console.log('AuthButton - Refreshing session, attempt:', sessionRetries + 1);
    setIsRefreshing(true);
    
    try {
      await update();
      
      // Verify session after refresh
      const freshSession = await getSession();
      console.log('AuthButton - Fresh session retrieved:', {
        hasSession: !!freshSession,
        userId: freshSession?.user?.id,
        email: freshSession?.user?.email,
        role: (freshSession?.user as any)?.role
      });
      
      if (!freshSession) {
        console.warn('AuthButton - Session refresh failed, no session returned');
        setSessionRetries(prev => prev + 1);
      } else {
        setSessionRetries(0); // Reset retries on success
      }
    } catch (error) {
      console.error('AuthButton - Session refresh failed:', error);
      setSessionRetries(prev => prev + 1);
    } finally {
      setIsRefreshing(false);
    }
  }, [update, isRefreshing, sessionRetries]);

  // Debug session information in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const info = `Status: ${status}, Session: ${session ? 'exists' : 'null'}, User: ${session?.user?.email || 'none'}, Role: ${(session?.user as any)?.role || 'none'}, Retries: ${sessionRetries}`;
      setDebugInfo(info);
      console.log('AuthButton - Session State Update:', {
        status,
        session: session,
        user: session?.user,
        isAuthenticated: isAuthenticated(),
        sessionRetries,
        timestamp: new Date().toISOString()
      });
    }
  }, [session, status, isAuthenticated, sessionRetries]);

  // Automatic session refresh on window focus with retry logic
  useEffect(() => {
    const handleFocus = async () => {
      if (status !== 'loading' && !isRefreshing && sessionRetries < MAX_RETRIES) {
        console.log('AuthButton - Window focused, checking session...');
        
        // Only refresh if we don't have a valid session
        if (!isAuthenticated() && status === 'unauthenticated') {
          await refreshSession();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [status, isRefreshing, sessionRetries, isAuthenticated, refreshSession]);

  // Auto-retry mechanism for failed sessions
  useEffect(() => {
    if (status === 'unauthenticated' && sessionRetries > 0 && sessionRetries < MAX_RETRIES) {
      const retryTimeout = setTimeout(() => {
        console.log('AuthButton - Auto-retrying session retrieval...');
        refreshSession();
      }, 1000 * sessionRetries); // Exponential backoff
      
      return () => clearTimeout(retryTimeout);
    }
  }, [status, sessionRetries, refreshSession]);

  // Force session update mechanism
  const handleForceUpdate = async () => {
    console.log('AuthButton - Manual session refresh requested...');
    setSessionRetries(0); // Reset retries for manual refresh
    await refreshSession();
  };

  // Show loading skeleton while session is being fetched or refreshing
  if (status === "loading" || isRefreshing) {
    return (
      <div className="btn btn-primary btn-md animate-pulse" title={debugInfo}>
        <div className="h-4 w-16 bg-gray-300 rounded"></div>
        {process.env.NODE_ENV === 'development' && (
          <span className="ml-2 text-xs opacity-70">
            {isRefreshing ? `Refreshing (${sessionRetries + 1}/${MAX_RETRIES})...` : 'Loading...'}
          </span>
        )}
      </div>
    );
  }

  // Show retry option if max retries reached
  if (sessionRetries >= MAX_RETRIES && status === 'unauthenticated') {
    return (
      <div className="flex items-center space-x-2">
        <Link
          href="/login"
          className="btn btn-primary btn-md"
          title={`${debugInfo} - Max retries reached`}
        >
          Accedi
        </Link>
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleForceUpdate}
            className="text-xs bg-red-200 px-2 py-1 rounded hover:bg-red-300"
            title="Retry session (max retries reached)"
          >
            🔄
          </button>
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
            className="text-xs bg-green-200 px-2 py-1 rounded hover:bg-green-300"
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