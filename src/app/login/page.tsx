"use client";

import { signIn, getSession } from "next-auth/react";
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

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (session) {
        router.push("/");
      }
    };
    checkAuth();
  }, [router]);

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
    <div className="login-container">
      <div className="login-header">
        <div className="text-center">
          <h1 className="text-heading-1 text-green-600 mb-2">ePatient</h1>
          <p className="text-body-sm text-gray-600">Healthcare Management Platform</p>
        </div>
        <h2 className="login-title">Sign in to your account</h2>
        <p className="text-body-sm text-center text-gray-600">
          Or{" "}
          <Link href="/register" className="link-primary transition-colors duration-200">
            create a new account
          </Link>
        </p>
      </div>

      <div className="login-card">
        <div className="login-form">
          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Global Error Message */}
            {error && (
              <div className="text-body-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="label label-required">
                Email address
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
                className={emailError ? "input-field-error" : "input-field"}
                placeholder="Enter your email"
                aria-describedby={emailError ? "email-error" : undefined}
                aria-invalid={!!emailError}
              />
              {emailError && (
                <p id="email-error" className="error-message" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="label label-required">
                Password
              </label>
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
                className={passwordError ? "input-field-error" : "input-field"}
                placeholder="Enter your password"
                aria-describedby={passwordError ? "password-error" : undefined}
                aria-invalid={!!passwordError}
              />
              {passwordError && (
                <p id="password-error" className="error-message" role="alert">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="checkbox-field"
                />
                <label htmlFor="remember-me" className="ml-2 text-body-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <Link href="/forgot-password" className="link-primary transition-colors duration-200 text-body-sm">
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`form-submit-btn ${
                  isLoading ? "cursor-wait relative" : ""
                }`}
                aria-label="Sign in to your account"
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner" />
                    <span className="sr-only">Signing in...</span>
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-body-sm text-gray-600">
          <p>
            By signing in, you agree to our{" "}
            <Link href="/terms" className="link-primary transition-colors duration-200">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="link-primary transition-colors duration-200">
              Privacy Policy
            </Link>
          </p>
          <p className="mt-2">
            &copy; 2024 ePatient. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}