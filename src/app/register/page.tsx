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
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "~/components/ui/button";

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
    <div className="unified-auth-container">
      <div className="unified-auth-form-wrapper">
        <h2 className="unified-auth-form-title">Registrazione</h2>
        <p className="unified-auth-form-subtitle">
          Unisciti alla nostra piattaforma di allenamento con pazienti virtuali
        </p>
          <form onSubmit={handleSubmit}>
            {/* Global Error Message */}
            {error && (
              <div className="unified-form-error">
                <XMarkIcon className="unified-form-error-icon" />
                <div className="unified-form-error-text">{error}</div>
              </div>
            )}

            {/* Name Field */}
            <div className="unified-form-group">
              <label htmlFor="name" className="unified-form-label">
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
                className={`unified-form-input ${nameError ? "unified-form-input-error" : ""}`}
                placeholder="Il tuo nome completo"
                aria-describedby={nameError ? "name-error" : undefined}
                aria-invalid={!!nameError}
              />
              {nameError && (
                <div
                  id="name-error"
                  className="unified-form-error"
                  role="alert"
                >
                  <XMarkIcon className="unified-form-error-icon" />
                  <div className="unified-form-error-text">{nameError}</div>
                </div>
              )}
            </div>

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
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                onBlur={() => validateEmail(email)}
                className={`unified-form-input ${emailError ? "unified-form-input-error" : ""}`}
                placeholder="La tua e-mail"
                aria-describedby={emailError ? "email-error" : undefined}
                aria-invalid={!!emailError}
              />
              {emailError && (
                <div
                  id="email-error"
                  className="unified-form-error"
                  role="alert"
                >
                  <XMarkIcon className="unified-form-error-icon" />
                  <div className="unified-form-error-text">{emailError}</div>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="unified-form-group">
              <label htmlFor="password" className="unified-form-label">
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
                className={`unified-form-input ${passwordError ? "unified-form-input-error" : ""}`}
                placeholder="La tua password"
                aria-describedby={
                  passwordError ? "password-error" : undefined
                }
                aria-invalid={!!passwordError}
              />
              {passwordError && (
                <div
                  id="password-error"
                  className="unified-form-error"
                  role="alert"
                >
                  <XMarkIcon className="unified-form-error-icon" />
                  <div className="unified-form-error-text">{passwordError}</div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="unified-form-group">
              <label htmlFor="confirmPassword" className="unified-form-label">
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
                className={`unified-form-input ${confirmPasswordError ? "unified-form-input-error" : ""}`}
                placeholder="Conferma la tua password"
                aria-describedby={
                  confirmPasswordError ? "confirm-password-error" : undefined
                }
                aria-invalid={!!confirmPasswordError}
              />
              {confirmPasswordError && (
                <div
                  id="confirm-password-error"
                  className="unified-form-error"
                  role="alert"
                >
                  <XMarkIcon className="unified-form-error-icon" />
                  <div className="unified-form-error-text">{confirmPasswordError}</div>
                </div>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="unified-form-group">
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
                  className="unified-form-checkbox mt-1"
                />
                <label
                  htmlFor="accept-terms"
                  className="unified-form-text-muted ml-2 text-sm"
                >
                  Accetto i{" "}
                  <Link href="/terms" className="unified-form-link">
                    termini e condizioni
                  </Link>{" "}
                  e la{" "}
                  <Link href="/privacy" className="unified-form-link">
                    privacy policy
                  </Link>
                </label>
              </div>
              {termsError && (
                <div
                  className="unified-form-error"
                  role="alert"
                >
                  <XMarkIcon className="unified-form-error-icon" />
                  <div className="unified-form-error-text">{termsError}</div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="unified-form-submit"
              aria-label="Registra il tuo account"
            >
              {isLoading ? (
                <>
                  <div className="unified-form-spinner"></div>
                  Registrazione in corso...
                </>
              ) : (
                "Registrati"
              )}
            </button>

            {/* Login Link */}
            <div className="unified-form-actions unified-form-actions-center">
              <div className="unified-form-actions-row">
                <span className="unified-form-text-muted text-sm">
                  Hai gia un account?{" "}
                </span>
                <Link href="/login" className="unified-form-link text-sm">
                  Accedi qui
                </Link>
              </div>
            </div>
          </form>
      </div>
    </div>
  );
}
