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
import { Check, Eye, X } from "lucide-react";
import { useToast } from "~/components/common/ToastProvider";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";

// Define the consolidated login state interface
interface LoginState {
  phase: "loading" | "login" | "authenticating" | "success" | "redirecting";
  error: string;
  redirectCountdown: number;
  isNavigating: boolean;
  sessionRetries: number;
}

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email è obbligatoria")
    .email("Inserisci un'email valida"),
  password: z
    .string()
    .min(6, "La password deve contenere almeno 6 caratteri"),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageComponent() {
  // Consolidated state management with JWT session tracking
  const [loginState, setLoginState] = useState<LoginState>({
    phase: "loading",
    error: "",
    redirectCountdown: 3,
    isNavigating: false,
    sessionRetries: 0,
  });
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { showSuccess, showError } = useToast();

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard/therapeutic-journey";

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

  const handleLoginSubmit = async (values: LoginFormValues) => {
    if (loginState.isNavigating || loginState.phase === "redirecting") {
      return;
    }

    setLoginState((prev) => ({
      ...prev,
      error: "",
      sessionRetries: 0,
      phase: "authenticating",
    }));

    try {
      console.log("Login: Attempting authentication with credentials...");

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        console.error("Login: Authentication failed:", result.error);
        const errorMsg = "Invalid email or password. Please try again.";
        form.setError("password", { message: errorMsg });
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
              const redirectSeconds = 3;
              showSuccess(
                "Login Successful!",
                `Welcome back! Redirecting you to your dashboard in ${redirectSeconds} seconds...`,
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

  const isProcessing =
    loginState.phase === "authenticating" ||
    loginState.phase === "redirecting" ||
    loginState.isNavigating;

  const submitLabel =
    loginState.phase === "authenticating"
      ? "Accesso in corso..."
      : loginState.isNavigating || loginState.phase === "redirecting"
        ? "Reindirizzamento..."
        : "Accedi";

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Inspirational Message */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-green/10 to-primary-violet/10 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-primary-green mb-6">
            Benvenuto in LLMPatient
          </h1>
          <p className="text-xl text-text-secondary leading-relaxed">
            La piattaforma che rivoluziona l&apos;apprendimento medico attraverso simulazioni interattive con pazienti virtuali intelligenti.
          </p>
          <div className="mt-8 flex items-center justify-center space-x-4 text-sm text-text-tertiary">
            <span>•</span>
            <span>Simulazioni realistiche</span>
            <span>•</span>
            <span>Apprendimento personalizzato</span>
            <span>•</span>
            <span>Feedback immediato</span>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form with Navbar Color */}
      <div className="w-full lg:w-1/2 bg-[var(--color-navbar-dark)] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Success State - Show redirect countdown */}
          {loginState.phase === "success" ||
          loginState.phase === "redirecting" ? (
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Login Successful!
                </h2>
                <p className="text-text-secondary mb-6">
                  Welcome back! You&apos;re being redirected to your dashboard.
                </p>

                <div className="bg-primary-green/20 border border-primary-green/30 rounded-lg p-4 mb-6">
                  <div className="text-primary-green">
                    Redirecting in {loginState.redirectCountdown} second
                    {loginState.redirectCountdown !== 1 ? "s" : ""}...
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={loginState.isNavigating}
                  isLoading={loginState.isNavigating}
                  onClick={() => {
                    if (!loginState.isNavigating) navigate(callbackUrl);
                  }}
                >
                  {loginState.isNavigating ? "Redirecting..." : "Go Now"}
                </Button>
              </div>
            </div>
          ) : (
            /* Normal Login Form */
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Login</h2>
              <p className="text-text-secondary mb-8">
                Accedi al tuo account per continuare
              </p>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleLoginSubmit)}
                  className="space-y-6"
                >
                  {loginState.error && (
                    <div className="bg-error/20 border border-error/30 rounded-lg p-4">
                      <div className="flex items-center">
                        <X className="h-4 w-4 text-error mr-2" />
                        <div className="text-error">{loginState.error}</div>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="email">E-mail</FormLabel>
                        <FormControl>
                          <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="La tua e-mail"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="password">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              autoComplete="current-password"
                              placeholder="La tua password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary"
                              onClick={() => setShowPassword((prev) => !prev)}
                              aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              id="remember-me"
                              checked={field.value}
                              onCheckedChange={(checked) => field.onChange(checked === true)}
                            />
                          </FormControl>
                          <FormLabel
                            htmlFor="remember-me"
                            className="text-sm text-text-secondary font-normal"
                          >
                            Ricordami al prossimo accesso
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isProcessing}
                    isLoading={isProcessing}
                    aria-label="Accedi al tuo account"
                  >
                    {submitLabel}
                  </Button>

                  <div className="text-center text-sm text-text-secondary">
                    <span>o </span>
                    <Link
                      href="/register"
                      className="text-primary-green hover:text-primary-green/80 transition-colors"
                    >
                      registrati
                    </Link>
                    <span> subito</span>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>
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
