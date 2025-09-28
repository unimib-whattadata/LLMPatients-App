/**
 * Register Page
 *
 * User registration interface for creating new accounts.
 * Provides comprehensive form validation and account creation.
 *
 * @description Client-side rendered page that handles user registration,
 * form validation, and account creation. Includes comprehensive validation
 * for all registration fields and terms acceptance.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import Link from "next/link";
import { X } from "lucide-react";

/**
 * Register Page Component
 *
 * Handles user registration with comprehensive validation.
 * Redirects authenticated users to home page.
 */
export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [termsError, setTermsError] = useState("");
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (session) {
        router.push("/");
      }
    };
    void checkAuth();
  }, [router]);

  // Name validation
  const validateName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (name.trim().length < 2) {
      setNameError("Name must be at least 2 characters");
      return false;
    }
    if (name.trim().length > 50) {
      setNameError("Name must be less than 50 characters");
      return false;
    }
    setNameError("");
    return true;
  };

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
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
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setPasswordError(
        "Password must contain uppercase, lowercase, number, and special character",
      );
      return false;
    }

    setPasswordError("");
    return true;
  };

  // Confirm password validation
  const validateConfirmPassword = (confirmPassword: string): boolean => {
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      return false;
    }
    if (confirmPassword !== password) {
      setConfirmPasswordError("Passwords do not match");
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  // Terms validation
  const validateTerms = (accepted: boolean): boolean => {
    if (!accepted) {
      setTermsError("You must accept the terms and conditions");
      return false;
    }
    setTermsError("");
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate all inputs
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
    const isTermsValid = validateTerms(acceptTerms);

    if (
      !isNameValid ||
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid ||
      !isTermsValid
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data?.error || "Registration failed. Please try again.");
        return;
      }

      // Registration successful, redirect to login
      router.push("/login?message=Registration successful! Please log in.");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Welcome Message */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-green/10 to-primary-violet/10 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-primary-green mb-6">
            Unisciti a LLMPatient
          </h1>
          <p className="text-xl text-text-secondary leading-relaxed">
            Inizia il tuo percorso di apprendimento medico con simulazioni interattive e pazienti virtuali intelligenti.
          </p>
          <div className="mt-8 flex items-center justify-center space-x-4 text-sm text-text-tertiary">
            <span>•</span>
            <span>Formazione avanzata</span>
            <span>•</span>
            <span>Simulazioni realistiche</span>
            <span>•</span>
            <span>Progressi tracciati</span>
          </div>
        </div>
      </div>

      {/* Right Section - Registration Form with Navbar Color */}
      <div className="w-full lg:w-1/2 bg-[var(--color-navbar-dark)] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Registrazione</h2>
          <p className="text-text-secondary mb-8">
            Unisciti alla nostra piattaforma di allenamento con pazienti virtuali
          </p>
          <form onSubmit={handleSubmit}>
            {/* Global Error Message */}
            {error && (
              <div className="bg-error/20 border border-error/30 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <X className="h-4 w-4 text-error mr-2" />
                  <div className="text-error">{error}</div>
                </div>
              </div>
            )}

            {/* Name Field */}
            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">
                Nome completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) validateName(e.target.value);
                }}
                onBlur={() => validateName(name)}
                className={`w-full px-4 py-3 bg-surface-primary border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent transition-colors ${
                  nameError 
                    ? "border-error" 
                    : "border-border-primary hover:border-border-focus"
                }`}
                placeholder="Il tuo nome completo"
                aria-describedby={nameError ? "name-error" : undefined}
                aria-invalid={!!nameError}
              />
              {nameError && (
                <div
                  id="name-error"
                  className="mt-2 flex items-center text-error text-sm"
                  role="alert"
                >
                  <X className="h-4 w-4 mr-1" />
                  {nameError}
                </div>
              )}
            </div>

            {/* Email Field */}
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
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
                className={`w-full px-4 py-3 bg-surface-primary border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent transition-colors ${
                  emailError 
                    ? "border-error" 
                    : "border-border-primary hover:border-border-focus"
                }`}
                placeholder="La tua e-mail"
                aria-describedby={emailError ? "email-error" : undefined}
                aria-invalid={!!emailError}
              />
              {emailError && (
                <div
                  id="email-error"
                  className="mt-2 flex items-center text-error text-sm"
                  role="alert"
                >
                  <X className="h-4 w-4 mr-1" />
                  {emailError}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) validatePassword(e.target.value);
                  if (confirmPassword && confirmPasswordError) {
                    validateConfirmPassword(confirmPassword);
                  }
                }}
                onBlur={() => validatePassword(password)}
                className={`w-full px-4 py-3 bg-surface-primary border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent transition-colors ${
                  passwordError 
                    ? "border-error" 
                    : "border-border-primary hover:border-border-focus"
                }`}
                placeholder="La tua password"
                aria-describedby={
                  passwordError ? "password-error" : undefined
                }
                aria-invalid={!!passwordError}
              />
              {passwordError && (
                <div
                  id="password-error"
                  className="mt-2 flex items-center text-error text-sm"
                  role="alert"
                >
                  <X className="h-4 w-4 mr-1" />
                  {passwordError}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2">
                Conferma password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError)
                    validateConfirmPassword(e.target.value);
                }}
                onBlur={() => validateConfirmPassword(confirmPassword)}
                className={`w-full px-4 py-3 bg-surface-primary border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent transition-colors ${
                  confirmPasswordError 
                    ? "border-error" 
                    : "border-border-primary hover:border-border-focus"
                }`}
                placeholder="Conferma la tua password"
                aria-describedby={
                  confirmPasswordError ? "confirm-password-error" : undefined
                }
                aria-invalid={!!confirmPasswordError}
              />
              {confirmPasswordError && (
                <div
                  id="confirm-password-error"
                  className="mt-2 flex items-center text-error text-sm"
                  role="alert"
                >
                  <X className="h-4 w-4 mr-1" />
                  {confirmPasswordError}
                </div>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="mb-6">
              <div className="flex items-start">
                <input
                  id="accept-terms"
                  name="accept-terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => {
                    setAcceptTerms(e.target.checked);
                    if (termsError) validateTerms(e.target.checked);
                  }}
                  className="h-4 w-4 text-primary-green bg-surface-primary border-border-primary rounded focus:ring-primary-green focus:ring-2 mt-1"
                />
                <label
                  htmlFor="accept-terms"
                  className="ml-2 text-sm text-text-secondary"
                >
                  Accetto i{" "}
                  <Link href="/terms" className="text-primary-green hover:text-primary-green/80 transition-colors">
                    termini e condizioni
                  </Link>{" "}
                  e la{" "}
                  <Link href="/privacy" className="text-primary-green hover:text-primary-green/80 transition-colors">
                    privacy policy
                  </Link>
                </label>
              </div>
              {termsError && (
                <div
                  className="mt-2 flex items-center text-error text-sm"
                  role="alert"
                >
                  <X className="h-4 w-4 mr-1" />
                  {termsError}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-green hover:bg-primary-green/90 disabled:bg-primary-green/50 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              aria-label="Registra il tuo account"
            >
              {isLoading && <div className="unified-form-spinner mr-2"></div>}
              {isLoading ? "Registrazione in corso..." : "Registrati"}
            </button>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <div className="text-sm text-text-secondary">
                <span>Hai già un account? </span>
                <Link href="/login" className="text-primary-green hover:text-primary-green/80 transition-colors">
                  Accedi qui
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
