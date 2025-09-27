/**
 * Login Page
 *
 * Authentication interface for user login with email and password.
 * Provides form validation, error handling, and session management.
 *
 * @description Client-side rendered page that handles user authentication,
 * form validation, and redirects. Includes comprehensive error handling
 * and session verification with JWT token support.
 */

"use client";

import { signIn, useSession, getSession } from "next-auth/react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckIcon, EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/components/common/ToastProvider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Separator } from "~/components/ui/separator";
import { Loader2 } from "lucide-react";

// Define the consolidated login state interface
interface LoginState {
  phase: "loading" | "login" | "authenticating" | "success" | "redirecting";
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

function LoginPageComponent() {
  // Consolidated state management with JWT session tracking
  const [loginState, setLoginState] = useState<LoginState>({
    phase: "loading",
    email: "",
    password: "",
    rememberMe: false,
    error: "",
    emailError: "",
    passwordError: "",
    redirectCountdown: 3,
    isNavigating: false,
    sessionRetries: 0,
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { showSuccess, showError } = useToast();

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Deferred navigation function to prevent router updates during render
  const navigate = useCallback(
    (url: string, delay: number = 100) => {
      if (loginState.isNavigating) return; // Prevent multiple navigation calls

      setLoginState((prev) => ({ ...prev, isNavigating: true }));

      setTimeout(() => {
        router.push(url);
      }, delay);
    },
    [router, loginState.isNavigating],
  );

  // Consolidated navigation and state management controller
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;

    const handleNavigation = () => {
      // Handle URL error parameters
      const urlError = searchParams.get("error");
      if (urlError && loginState.phase === "loading") {
        let errorMessage =
          "An authentication error occurred. Please try again.";

        switch (urlError) {
          case "CredentialsSignin":
            errorMessage =
              "Invalid email or password. Please check your credentials.";
            break;
          case "OAuthAccountNotLinked":
            errorMessage =
              "This email is already associated with another account.";
            break;
          case "EmailNotVerified":
            errorMessage =
              "Please verify your email address before signing in.";
            break;
          default:
            errorMessage = "An unexpected error occurred during sign in.";
        }

        showError("Login Failed", errorMessage);
        setLoginState((prev) => ({
          ...prev,
          phase: "login",
          error: errorMessage,
        }));
        return;
      }

      // Handle session-based navigation
      if (status === "loading") {
        // Keep in loading state
        return;
      }

      if (
        status === "authenticated" &&
        session &&
        loginState.phase !== "redirecting"
      ) {
        // User is already authenticated, navigate to callback
        setLoginState((prev) => ({ ...prev, phase: "redirecting" }));
        navigate(callbackUrl, 0);
        return;
      }

      if (status === "unauthenticated" && loginState.phase === "loading") {
        // No session, show login form
        setLoginState((prev) => ({ ...prev, phase: "login" }));
        return;
      }

      // Handle success redirect countdown
      if (loginState.phase === "success" && loginState.redirectCountdown > 0) {
        countdownInterval = setInterval(() => {
          setLoginState((prev) => {
            if (prev.redirectCountdown <= 1) {
              clearInterval(countdownInterval);
              navigate(callbackUrl);
              return { ...prev, phase: "redirecting", redirectCountdown: 0 };
            }
            return { ...prev, redirectCountdown: prev.redirectCountdown - 1 };
          });
        }, 1000);
      }
    };

    // Defer navigation logic to next tick to avoid render conflicts
    const timeoutId = setTimeout(handleNavigation, 0);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [
    session,
    status,
    searchParams,
    showError,
    navigate,
    callbackUrl,
    loginState.phase,
    loginState.redirectCountdown,
  ]);

  // Email validation with state update
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setLoginState((prev) => ({ ...prev, emailError: "Email is required" }));
      return false;
    }
    if (!emailRegex.test(email)) {
      setLoginState((prev) => ({
        ...prev,
        emailError: "Please enter a valid email address",
      }));
      return false;
    }
    setLoginState((prev) => ({ ...prev, emailError: "" }));
    return true;
  };

  // Password validation with state update
  const validatePassword = (password: string): boolean => {
    if (!password) {
      setLoginState((prev) => ({
        ...prev,
        passwordError: "Password is required",
      }));
      return false;
    }
    if (password.length < 6) {
      setLoginState((prev) => ({
        ...prev,
        passwordError: "Password must be at least 6 characters",
      }));
      return false;
    }
    setLoginState((prev) => ({ ...prev, passwordError: "" }));
    return true;
  };

  // Handle form submission with enhanced JWT session verification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission if already navigating
    if (loginState.isNavigating || loginState.phase === "redirecting") {
      return;
    }

    setLoginState((prev) => ({ ...prev, error: "", sessionRetries: 0 }));

    // Validate inputs
    const isEmailValid = validateEmail(loginState.email);
    const isPasswordValid = validatePassword(loginState.password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoginState((prev) => ({ ...prev, phase: "authenticating" }));

    try {
      console.log("Login: Attempting authentication with credentials...");

      const result = await signIn("credentials", {
        email: loginState.email,
        password: loginState.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        console.error("Login: Authentication failed:", result.error);
        const errorMsg = "Invalid email or password. Please try again.";
        setLoginState((prev) => ({ ...prev, phase: "login", error: errorMsg }));
        showError(
          "Login Failed",
          "Please check your credentials and try again.",
        );
      } else if (result?.ok) {
        console.log(
          "Login: Authentication successful, verifying JWT session...",
        );

        // Wait for JWT session to be established
        let sessionEstablished = false;
        let retryCount = 0;
        const maxRetries = 5;

        while (!sessionEstablished && retryCount < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 200 * (retryCount + 1)),
          ); // Progressive delay

          try {
            const freshSession = await getSession();
            console.log(`Login: Session check attempt ${retryCount + 1}:`, {
              hasSession: !!freshSession,
              userId: freshSession?.user?.id,
              email: freshSession?.user?.email,
              role: freshSession?.user?.role,
            });

            if (freshSession?.user?.id && freshSession?.user?.email) {
              sessionEstablished = true;
              console.log("Login: JWT session successfully established");

              // Show success message and start countdown
              showSuccess(
                "Login Successful!",
                `Welcome back! Redirecting you to your dashboard in ${loginState.redirectCountdown} seconds...`,
                { duration: 3000 },
              );

              setLoginState((prev) => ({
                ...prev,
                phase: "success",
                redirectCountdown: 3,
                sessionRetries: retryCount + 1,
              }));
            } else {
              retryCount++;
              console.warn(
                `Login: Session not yet available (attempt ${retryCount}/${maxRetries})`,
              );
            }
          } catch (error) {
            retryCount++;
            console.error(
              `Login: Session verification error (attempt ${retryCount}/${maxRetries}):`,
              error,
            );
          }
        }

        if (!sessionEstablished) {
          console.error(
            "Login: Failed to establish JWT session after authentication",
          );
          const errorMsg =
            "Authentication succeeded but session creation failed. Please try logging in again.";
          setLoginState((prev) => ({
            ...prev,
            phase: "login",
            error: errorMsg,
            sessionRetries: maxRetries,
          }));
          showError(
            "Session Error",
            "Please try logging in again. If the problem persists, contact support.",
          );
        }
      }
    } catch (error) {
      console.error("Login: Unexpected error during authentication:", error);
      const errorMsg = "An unexpected error occurred. Please try again.";
      setLoginState((prev) => ({ ...prev, phase: "login", error: errorMsg }));
      showError(
        "Network Error",
        "Unable to connect to the server. Please check your internet connection.",
      );
    }
  };

  return (
    <div className="unified-auth-container">
      <div className="unified-auth-form-wrapper">
          {/* Success State - Show redirect countdown */}
          {loginState.phase === "success" ||
          loginState.phase === "redirecting" ? (
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckIcon className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="unified-auth-form-title mb-2">
                  Login Successful!
                </h2>
                <p className="unified-auth-form-subtitle mb-6">
                  Welcome back! You&apos;re being redirected to your dashboard.
                </p>

                <div className="unified-form-error mb-6">
                  <div className="unified-form-error-text">
                    Redirecting in {loginState.redirectCountdown} second
                    {loginState.redirectCountdown !== 1 ? "s" : ""}...
                  </div>
                </div>

                <button
                  onClick={() =>
                    !loginState.isNavigating && navigate(callbackUrl)
                  }
                  disabled={loginState.isNavigating}
                  className="unified-form-submit"
                >
                  {loginState.isNavigating && <div className="unified-form-spinner"></div>}
                  {loginState.isNavigating ? "Redirecting..." : "Go Now"}
                </button>
              </div>
            </div>
          ) : (
            /* Normal Login Form */
            <div>
              <h2 className="unified-auth-form-title">Login</h2>
              <p className="unified-auth-form-subtitle">
                Accedi al tuo account per continuare
              </p>
              <form onSubmit={handleSubmit}>
                {/* Global Error Message */}
                {loginState.error && (
                  <div className="unified-form-error">
                    <XMarkIcon className="unified-form-error-icon" />
                    <div className="unified-form-error-text">{loginState.error}</div>
                  </div>
                )}

                {/* Email Field */}
                <div className="unified-form-group">
                  <label htmlFor="email" className="unified-form-label">
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
                      setLoginState((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }));
                      if (loginState.emailError) validateEmail(e.target.value);
                    }}
                    onBlur={() => validateEmail(loginState.email)}
                    placeholder="La tua e-mail"
                    aria-describedby={
                      loginState.emailError ? "email-error" : undefined
                    }
                    aria-invalid={!!loginState.emailError}
                    className={`unified-form-input ${loginState.emailError ? "unified-form-input-error" : ""}`}
                  />
                  {loginState.emailError && (
                    <div
                      id="email-error"
                      className="unified-form-error"
                      role="alert"
                    >
                      <XMarkIcon className="unified-form-error-icon" />
                      <div className="unified-form-error-text">{loginState.emailError}</div>
                    </div>
                  )}
                </div>

                {/* Password Field */}
                <div className="unified-form-group">
                  <label htmlFor="password" className="unified-form-label">
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
                        setLoginState((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }));
                        if (loginState.passwordError)
                          validatePassword(e.target.value);
                      }}
                      onBlur={() => validatePassword(loginState.password)}
                      placeholder="La tua password"
                      aria-describedby={
                        loginState.passwordError ? "password-error" : undefined
                      }
                      aria-invalid={!!loginState.passwordError}
                      className={`unified-form-input pr-12 ${loginState.passwordError ? "unified-form-input-error" : ""}`}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => {
                        const input = document.getElementById(
                          "password",
                        ) as HTMLInputElement;
                        if (input.type === "password") {
                          input.type = "text";
                        } else {
                          input.type = "password";
                        }
                      }}
                    >
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  {loginState.passwordError && (
                    <div
                      id="password-error"
                      className="unified-form-error"
                      role="alert"
                    >
                      <XMarkIcon className="unified-form-error-icon" />
                      <div className="unified-form-error-text">{loginState.passwordError}</div>
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
                    onChange={(e) =>
                      setLoginState((prev) => ({
                        ...prev,
                        rememberMe: e.target.checked,
                      }))
                    }
                    className="unified-form-checkbox"
                  />
                  <label
                    htmlFor="remember-me"
                    className="unified-form-text-muted ml-2 text-sm"
                  >
                    Ricordami al prossimo accesso
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    ["authenticating", "redirecting"].includes(
                      loginState.phase,
                    ) || loginState.isNavigating
                  }
                  className="unified-form-submit"
                  aria-label="Accedi al tuo account"
                >
                  {(["authenticating", "redirecting"].includes(loginState.phase) || loginState.isNavigating) && 
                    <div className="unified-form-spinner"></div>
                  }
                  {(() => {
                    const phase = loginState.phase as LoginState["phase"];
                    if (phase === "authenticating") return "Accesso in corso...";
                    if (loginState.isNavigating) return "Reindirizzamento...";
                    if (phase === "redirecting") return "Reindirizzamento...";
                    return "Accedi";
                  })()}
                </button>

                {/* Register Link */}
                <div className="unified-form-actions unified-form-actions-center">
                  <div className="unified-form-actions-row">
                    <span className="unified-form-text-muted text-sm">o </span>
                    <Link href="/register" className="unified-form-link text-sm">
                      registrati
                    </Link>
                    <span className="unified-form-text-muted text-sm"> subito</span>
                  </div>
                </div>

                <hr className="unified-form-divider" />

                {/* Forgot Password */}
                <div className="unified-form-actions unified-form-actions-center">
                  <Link href="/forgot-password" className="unified-form-link text-sm">
                    Hai dimenticato la password?
                  </Link>
                </div>
              </form>
            </div>
          )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    }>
      <LoginPageComponent />
    </Suspense>
  );
}
