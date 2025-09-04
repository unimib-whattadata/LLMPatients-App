"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const router = useRouter();
  const { data: session, status } = useSession();

  // Check if user is already authenticated
  useEffect(() => {
    if (status !== "loading" && session) {
      router.push("/");
    }
  }, [session, status, router]);

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  // Password validation
  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError("Password is required");
      return false;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else if (result?.ok) {
        router.push("/");
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
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
          <div className="bg-gray-700 rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">Login</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Global Error Message */}
              {error && (
                <div className="text-sm text-red-400 text-center bg-red-900/20 border border-red-700 rounded-md p-3">
                  {error}
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
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  className={`w-full px-4 py-3 bg-white rounded-md border ${
                    emailError ? 'border-red-500' : 'border-gray-300'
                  } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent`}
                  placeholder="La tua e-mail"
                  aria-describedby={emailError ? "email-error" : undefined}
                  aria-invalid={!!emailError}
                />
                {emailError && (
                  <p id="email-error" className="mt-1 text-sm text-red-400" role="alert">
                    {emailError}
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
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) validatePassword(e.target.value);
                    }}
                    onBlur={() => validatePassword(password)}
                    className={`w-full px-4 py-3 bg-white rounded-md border ${
                      passwordError ? 'border-red-500' : 'border-gray-300'
                    } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent pr-12`}
                    placeholder="La tua password"
                    aria-describedby={passwordError ? "password-error" : undefined}
                    aria-invalid={!!passwordError}
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
                {passwordError && (
                  <p id="password-error" className="mt-1 text-sm text-red-400" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded bg-white"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-300">
                  Ricordami al prossimo accesso
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 ${
                  isLoading ? "cursor-wait opacity-50" : ""
                }`}
                aria-label="Accedi al tuo account"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Accesso in corso...
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
        </div>
      </div>
    </div>
  );
}