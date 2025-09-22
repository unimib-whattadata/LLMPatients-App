"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

/**
 * Custom Signout Page
 * 
 * This page provides a styled signout experience that matches the site's design.
 * It handles the signout process and shows appropriate loading/error states.
 */
export default function SignoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSignout = async () => {
      try {
        setStatus('loading');
        
        // Perform signout with callback to homepage
        await signOut({ 
          callbackUrl: '/',
          redirect: false // Handle redirect manually
        });
        
        setStatus('success');
        
        // Redirect to homepage after a brief delay
        setTimeout(() => {
          router.push('/');
        }, 1500);
        
      } catch (err) {
        console.error('Signout error:', err);
        setError('Si è verificato un errore durante il logout. Verrai reindirizzato alla homepage.');
        setStatus('error');
        
        // Redirect to homepage even on error
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    };

    handleSignout();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-surface-secondary rounded-lg p-8 text-center">
          {/* Logo/Brand */}
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-500/20 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-primary-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Logout in corso
            </h1>
            <p className="text-text-secondary">
              Stai per essere disconnesso dal sistema
            </p>
          </div>

          {/* Status Content */}
          <div className="space-y-4">
            {status === 'loading' && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
                <p className="text-text-secondary">
                  Disconnessione in corso...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-8 h-8 bg-success-500/20 rounded-full flex items-center justify-center">
                    <svg 
                      className="w-5 h-5 text-success-500" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
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

            {status === 'error' && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-8 h-8 bg-error-500/20 rounded-full flex items-center justify-center">
                    <svg 
                      className="w-5 h-5 text-error-500" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M6 18L18 6M6 6l12 12" 
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-text-primary font-medium">
                  Errore durante il logout
                </p>
                <p className="text-text-secondary text-sm">
                  {error || 'Si è verificato un errore imprevisto.'}
                </p>
                <p className="text-text-muted text-xs">
                  Verrai comunque reindirizzato alla homepage...
                </p>
              </div>
            )}
          </div>

          {/* Manual redirect button */}
          <div className="mt-8 pt-6">
            <button
              onClick={() => router.push('/')}
              className="btn btn-primary btn-md w-full"
            >
              Vai alla Homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
