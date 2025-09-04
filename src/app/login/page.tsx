"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
}

export default function LoginPage() {
  // Consolidated state management
  const [loginState, setLoginState] = useState<LoginState>({
    phase: 'loading',
    email: '',
    password: '',
    rememberMe: false,
    error: '',
    emailError: '',
    passwordError: '',
    redirectCountdown: 3,
    isNavigating: false
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

  // Handle form submission with navigation guards
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if already navigating
    if (loginState.isNavigating || loginState.phase === 'redirecting') {
      return;
    }
    
    setLoginState(prev => ({ ...prev, error: "" }));
    
    // Validate inputs
    const isEmailValid = validateEmail(loginState.email);
    const isPasswordValid = validatePassword(loginState.password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoginState(prev => ({ ...prev, phase: 'authenticating' }));
    
    try {
      const result = await signIn("credentials", {
        email: loginState.email,
        password: loginState.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        const errorMsg = "Invalid email or password. Please try again.";
        setLoginState(prev => ({ ...prev, phase: 'login', error: errorMsg }));
        showError("Login Failed", "Please check your credentials and try again.");
      } else if (result?.ok) {
        // Show success message and start countdown
        showSuccess(
          "Login Successful!", 
          `Welcome back! Redirecting you to your dashboard in ${loginState.redirectCountdown} seconds...`,
          { duration: 3000 }
        );
        
        setLoginState(prev => ({ 
          ...prev, 
          phase: 'success',
          redirectCountdown: 3
        }));
      }
    } catch (error) {
      const errorMsg = "An unexpected error occurred. Please try again.";
      setLoginState(prev => ({ ...prev, phase: 'login', error: errorMsg }));
      showError("Network Error", "Unable to connect to the server. Please check your internet connection.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-800 flex-col justify-center px-12">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold text-white mb-8">Nome Brand</h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Un ambiente sicuro per allenarti con pazienti virtuali. Inizia da qui.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Success State - Show redirect countdown */}
          {(loginState.phase === 'success' || loginState.phase === 'redirecting') ? (
            <div className="bg-gray-700 rounded-lg shadow-xl p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Login Successful!</h2>
                <p className="text-gray-300 mb-6">
                  Welcome back! You're being redirected to your dashboard.
                </p>
                
                <div className="bg-gray-600 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                    <span className="text-white">
                      Redirecting in {loginState.redirectCountdown} second{loginState.redirectCountdown !== 1 ? 's' : ''}...
                    </span>
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
            <div className="bg-gray-700 rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">Login</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
              {/* Global Error Message */}
              {loginState.error && (
                <div className="text-sm text-red-400 text-center bg-red-900/20 border border-red-700 rounded-md p-3">
                  {loginState.error}
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
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
                  className={`w-full px-4 py-3 bg-white rounded-md border ${
                    loginState.emailError ? 'border-red-500' : 'border-gray-300'
                  } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent`}
                  placeholder="La tua e-mail"
                  aria-describedby={loginState.emailError ? "email-error" : undefined}
                  aria-invalid={!!loginState.emailError}
                />
                {loginState.emailError && (
                  <p id="email-error" className="mt-1 text-sm text-red-400" role="alert">
                    {loginState.emailError}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
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
                    className={`w-full px-4 py-3 bg-white rounded-md border ${
                      loginState.passwordError ? 'border-red-500' : 'border-gray-300'
                    } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent pr-12`}
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
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                {loginState.passwordError && (
                  <p id="password-error" className="mt-1 text-sm text-red-400" role="alert">
                    {loginState.passwordError}
                  </p>
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
                  className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded bg-white"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-300">
                  Ricordami al prossimo accesso
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={['authenticating', 'redirecting'].includes(loginState.phase) || loginState.isNavigating}
                className={`w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 ${
                  (['authenticating', 'redirecting'].includes(loginState.phase) || loginState.isNavigating) ? "cursor-wait opacity-50" : ""
                }`}
                aria-label="Accedi al tuo account"
              >
                {loginState.phase === 'authenticating' ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Accesso in corso...
                  </div>
                ) : (loginState.isNavigating || ['redirecting'].includes(loginState.phase)) ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Reindirizzamento...
                  </div>
                ) : (
                  "Accedi"
                )}
              </button>

              {/* Register Link */}
              <div className="text-center mt-4">
                <span className="text-gray-400 text-sm">o </span>
                <Link href="/register" className="text-green-500 hover:text-green-400 text-sm font-medium transition-colors duration-200">
                  registrati
                </Link>
                <span className="text-gray-400 text-sm"> subito</span>
              </div>

              <div className="border-t border-gray-600 my-6"></div>

              {/* Forgot Password */}
              <div className="text-center">
                <Link href="/forgot-password" className="text-gray-400 hover:text-gray-300 text-sm transition-colors duration-200">
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