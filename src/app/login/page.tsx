"use client";

import { signIn, useSession, getSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckIcon, EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/components/ui/ToastProvider";

// Define the consolidated login state interface
interface LoginState {
  phase: 'loading' | 'login' | 'authenticating' | 'success' | 'redirecting';
  email: string;
  password: string;
  rememberMe: boolean;
  error: string;
  emailError: string;
  passwordError: string;
  redirectCountdown: number;
  isNavigating: boolean;
  sessionRetries: number;
}

export default function LoginPage() {
  // Consolidated state management with JWT session tracking
  const [loginState, setLoginState] = useState<LoginState>({
    phase: 'loading',
    email: '',
    password: '',
    rememberMe: false,
    error: '',
    emailError: '',
    passwordError: '',
    redirectCountdown: 3,
    isNavigating: false,
    sessionRetries: 0
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { showSuccess, showError } = useToast();
  
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  // Deferred navigation function to prevent router updates during render
  const navigate = useCallback((url: string, delay: number = 100) => {
    if (loginState.isNavigating) return; // Prevent multiple navigation calls
    
    setLoginState(prev => ({ ...prev, isNavigating: true }));
    
    setTimeout(() => {
      router.push(url);
    }, delay);
  }, [router, loginState.isNavigating]);
  
  // Consolidated navigation and state management controller
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let countdownInterval: NodeJS.Timeout;
    
    const handleNavigation = () => {
      // Handle URL error parameters
      const urlError = searchParams.get('error');
      if (urlError && loginState.phase === 'loading') {
        let errorMessage = "An authentication error occurred. Please try again.";
        
        switch (urlError) {
          case 'CredentialsSignin':
            errorMessage = "Invalid email or password. Please check your credentials.";
            break;
          case 'OAuthAccountNotLinked':
            errorMessage = "This email is already associated with another account.";
            break;
          case 'EmailNotVerified':
            errorMessage = "Please verify your email address before signing in.";
            break;
          default:
            errorMessage = "An unexpected error occurred during sign in.";
        }
        
        showError("Login Failed", errorMessage);
        setLoginState(prev => ({ ...prev, phase: 'login', error: errorMessage }));
        return;
      }
      
      // Handle session-based navigation
      if (status === "loading") {
        // Keep in loading state
        return;
      }
      
      if (status === "authenticated" && session && loginState.phase !== 'redirecting') {
        // User is already authenticated, navigate to callback
        setLoginState(prev => ({ ...prev, phase: 'redirecting' }));
        navigate(callbackUrl, 0);
        return;
      }
      
      if (status === "unauthenticated" && loginState.phase === 'loading') {
        // No session, show login form
        setLoginState(prev => ({ ...prev, phase: 'login' }));
        return;
      }
      
      // Handle success redirect countdown
      if (loginState.phase === 'success' && loginState.redirectCountdown > 0) {
        countdownInterval = setInterval(() => {
          setLoginState(prev => {
            if (prev.redirectCountdown <= 1) {
              clearInterval(countdownInterval);
              navigate(callbackUrl);
              return { ...prev, phase: 'redirecting', redirectCountdown: 0 };
            }
            return { ...prev, redirectCountdown: prev.redirectCountdown - 1 };
          });
        }, 1000);
      }
    };
    
    // Defer navigation logic to next tick to avoid render conflicts
    timeoutId = setTimeout(handleNavigation, 0);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [session, status, searchParams, showError, navigate, callbackUrl, loginState.phase, loginState.redirectCountdown]);

  // Email validation with state update
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setLoginState(prev => ({ ...prev, emailError: "Email is required" }));
      return false;
    }
    if (!emailRegex.test(email)) {
      setLoginState(prev => ({ ...prev, emailError: "Please enter a valid email address" }));
      return false;
    }
    setLoginState(prev => ({ ...prev, emailError: "" }));
    return true;
  };

  // Password validation with state update
  const validatePassword = (password: string): boolean => {
    if (!password) {
      setLoginState(prev => ({ ...prev, passwordError: "Password is required" }));
      return false;
    }
    if (password.length < 6) {
      setLoginState(prev => ({ ...prev, passwordError: "Password must be at least 6 characters" }));
      return false;
    }
    setLoginState(prev => ({ ...prev, passwordError: "" }));
    return true;
  };

  // Handle form submission with enhanced JWT session verification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if already navigating
    if (loginState.isNavigating || loginState.phase === 'redirecting') {
      return;
    }
    
    setLoginState(prev => ({ ...prev, error: "", sessionRetries: 0 }));
    
    // Validate inputs
    const isEmailValid = validateEmail(loginState.email);
    const isPasswordValid = validatePassword(loginState.password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoginState(prev => ({ ...prev, phase: 'authenticating' }));
    
    try {
      console.log('Login: Attempting authentication with credentials...');
      
      const result = await signIn("credentials", {
        email: loginState.email,
        password: loginState.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        console.error('Login: Authentication failed:', result.error);
        const errorMsg = "Invalid email or password. Please try again.";
        setLoginState(prev => ({ ...prev, phase: 'login', error: errorMsg }));
        showError("Login Failed", "Please check your credentials and try again.");
      } else if (result?.ok) {
        console.log('Login: Authentication successful, verifying JWT session...');
        
        // Wait for JWT session to be established
        let sessionEstablished = false;
        let retryCount = 0;
        const maxRetries = 5;
        
        while (!sessionEstablished && retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1))); // Progressive delay
          
          try {
            const freshSession = await getSession();
            console.log(`Login: Session check attempt ${retryCount + 1}:`, {
              hasSession: !!freshSession,
              userId: freshSession?.user?.id,
              email: freshSession?.user?.email,
              role: (freshSession?.user as any)?.role
            });
            
            if (freshSession?.user?.id && freshSession?.user?.email) {
              sessionEstablished = true;
              console.log('Login: JWT session successfully established');
              
              // Show success message and start countdown
              showSuccess(
                "Login Successful!", 
                `Welcome back! Redirecting you to your dashboard in ${loginState.redirectCountdown} seconds...`,
                { duration: 3000 }
              );
              
              setLoginState(prev => ({ 
                ...prev, 
                phase: 'success',
                redirectCountdown: 3,
                sessionRetries: retryCount + 1
              }));
            } else {
              retryCount++;
              console.warn(`Login: Session not yet available (attempt ${retryCount}/${maxRetries})`);
            }
          } catch (error) {
            retryCount++;
            console.error(`Login: Session verification error (attempt ${retryCount}/${maxRetries}):`, error);
          }
        }
        
        if (!sessionEstablished) {
          console.error('Login: Failed to establish JWT session after authentication');
          const errorMsg = "Authentication succeeded but session creation failed. Please try logging in again.";
          setLoginState(prev => ({ 
            ...prev, 
            phase: 'login', 
            error: errorMsg,
            sessionRetries: maxRetries
          }));
          showError("Session Error", "Please try logging in again. If the problem persists, contact support.");
        }
      }
    } catch (error) {
      console.error('Login: Unexpected error during authentication:', error);
      const errorMsg = "An unexpected error occurred. Please try again.";
      setLoginState(prev => ({ ...prev, phase: 'login', error: errorMsg }));
      showError("Network Error", "Unable to connect to the server. Please check your internet connection.");
    }
  };

  return (
    <div className="auth-container">
      {/* Left Side - Branding */}
      <div className="auth-brand-section">
        <div className="auth-brand-content">
          <h1 className="auth-brand-title">LLMPatient</h1>
          <p className="auth-brand-subtitle">
            Un ambiente sicuro per allenarti con pazienti virtuali. Inizia da qui.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="auth-form-section">
        <div className="auth-form-container">
          {/* Success State - Show redirect countdown */}
          {(loginState.phase === 'success' || loginState.phase === 'redirecting') ? (
            <div className="auth-form-card text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-accent-success rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckIcon className="w-8 h-8 text-text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Login Successful!</h2>
                <p className="text-text-secondary mb-6">
                  Welcome back! You're being redirected to your dashboard.
                </p>
                
                <div className="message message-success message-large mb-6">
                  <div className="message-icon">
                    <div className="rounded-full h-5 w-5 border-b-2 border-accent-success"></div>
                  </div>
                  <div className="message-content">
                    <div className="message-text">
                      Redirecting in {loginState.redirectCountdown} second{loginState.redirectCountdown !== 1 ? 's' : ''}...
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => !loginState.isNavigating && navigate(callbackUrl)}
                  disabled={loginState.isNavigating}
                  className="btn btn-primary btn-sm"
                >
                  {loginState.isNavigating ? 'Redirecting...' : 'Go Now'}
                </button>
              </div>
            </div>
          ) : (
            /* Normal Login Form */
            <div className="auth-form-card">
              <h2 className="auth-form-title">Login</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
              {/* Global Error Message */}
              {loginState.error && (
                <div className="message message-error message-large">
                  <div className="message-icon">
                    <XMarkIcon className="w-5 h-5" />
                  </div>
                  <div className="message-content">
                    <div className="message-text">
                      {loginState.error}
                    </div>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="auth-input-group">
                <label htmlFor="email" className="auth-label">
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={loginState.email}
                  onChange={(e) => {
                    setLoginState(prev => ({ ...prev, email: e.target.value }));
                    if (loginState.emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(loginState.email)}
                  className={`auth-input ${
                    loginState.emailError ? 'auth-input-error' : ''
                  }`}
                  placeholder="La tua e-mail"
                  aria-describedby={loginState.emailError ? "email-error" : undefined}
                  aria-invalid={!!loginState.emailError}
                />
                {loginState.emailError && (
                  <div id="email-error" className="message message-error message-inline" role="alert">
                    <div className="message-icon">
                      <XMarkIcon className="w-4 h-4" />
                    </div>
                    <div className="message-content">
                      <div className="message-text">
                        {loginState.emailError}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="auth-input-group">
                <label htmlFor="password" className="auth-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={loginState.password}
                    onChange={(e) => {
                      setLoginState(prev => ({ ...prev, password: e.target.value }));
                      if (loginState.passwordError) validatePassword(e.target.value);
                    }}
                    onBlur={() => validatePassword(loginState.password)}
                    className={`auth-input ${
                      loginState.passwordError ? 'auth-input-error' : ''
                    } pr-12`}
                    placeholder="La tua password"
                    aria-describedby={loginState.passwordError ? "password-error" : undefined}
                    aria-invalid={!!loginState.passwordError}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => {
                      const input = document.getElementById('password') as HTMLInputElement;
                      if (input.type === 'password') {
                        input.type = 'text';
                      } else {
                        input.type = 'password';
                      }
                    }}
                  >
                    <EyeIcon className="w-5 h-5 text-text-tertiary" />
                  </button>
                </div>
                {loginState.passwordError && (
                  <div id="password-error" className="message message-error message-inline" role="alert">
                    <div className="message-icon">
                      <XMarkIcon className="w-4 h-4" />
                    </div>
                    <div className="message-content">
                      <div className="message-text">
                        {loginState.passwordError}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={loginState.rememberMe}
                  onChange={(e) => setLoginState(prev => ({ ...prev, rememberMe: e.target.checked }))}
                  className="auth-checkbox"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-text-secondary">
                  Ricordami al prossimo accesso
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={['authenticating', 'redirecting'].includes(loginState.phase) || loginState.isNavigating}
                className="auth-submit-btn"
                aria-label="Accedi al tuo account"
              >
                {loginState.phase === 'authenticating' ? (
                  <>
                    <div className="auth-spinner"></div>
                    Accesso in corso...
                  </>
                ) : (loginState.isNavigating || ['redirecting'].includes(loginState.phase)) ? (
                  <>
                    <div className="auth-spinner"></div>
                    Reindirizzamento...
                  </>
                ) : (
                  "Accedi"
                )}
              </button>

              {/* Register Link */}
              <div className="text-center mt-4">
                <span className="auth-text-muted text-sm">o </span>
                <Link href="/register" className="auth-link text-sm">
                  registrati
                </Link>
                <span className="auth-text-muted text-sm"> subito</span>
              </div>

              <div className="auth-divider"></div>

              {/* Forgot Password */}
              <div className="text-center">
                <Link href="/forgot-password" className="auth-text-muted hover:text-text-secondary text-sm">
                  Hai dimenticato la password?
                </Link>
              </div>
            </form>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
