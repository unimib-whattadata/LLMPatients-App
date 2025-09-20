"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import Link from "next/link";

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
      setPasswordError("Password must contain uppercase, lowercase, number, and special character");
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
    
    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isTermsValid) {
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

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      // Registration successful, redirect to login
      router.push("/login?message=Registration successful! Please log in.");
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Side - Branding */}
      <div className="auth-brand-section">
        <div className="auth-brand-content">
          <h1 className="auth-brand-title">LLMPatient</h1>
          <p className="auth-brand-subtitle">
            Unisciti alla nostra piattaforma di allenamento con pazienti virtuali. Inizia la tua esperienza qui.
          </p>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="auth-form-section">
        <div className="auth-form-container">
          <div className="auth-form-card">
            <h2 className="auth-form-title">Registrazione</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Global Error Message */}
              {error && (
                <div className="auth-global-error">
                  {error}
                </div>
              )}

              {/* Name Field */}
              <div className="auth-input-group">
                <label htmlFor="name" className="auth-label">
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
                  className={`auth-input ${nameError ? 'auth-input-error' : ''}`}
                  placeholder="Il tuo nome completo"
                  aria-describedby={nameError ? "name-error" : undefined}
                  aria-invalid={!!nameError}
                />
                {nameError && (
                  <p id="name-error" className="auth-error-message" role="alert">
                    {nameError}
                  </p>
                )}
              </div>

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
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  className={`auth-input ${emailError ? 'auth-input-error' : ''}`}
                  placeholder="La tua e-mail"
                  aria-describedby={emailError ? "email-error" : undefined}
                  aria-invalid={!!emailError}
                />
                {emailError && (
                  <p id="email-error" className="auth-error-message" role="alert">
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="auth-input-group">
                <label htmlFor="password" className="auth-label">
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
                  className={`auth-input ${passwordError ? 'auth-input-error' : ''}`}
                  placeholder="La tua password"
                  aria-describedby={passwordError ? "password-error" : undefined}
                  aria-invalid={!!passwordError}
                />
                {passwordError && (
                  <p id="password-error" className="auth-error-message" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="auth-input-group">
                <label htmlFor="confirmPassword" className="auth-label">
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
                    if (confirmPasswordError) validateConfirmPassword(e.target.value);
                  }}
                  onBlur={() => validateConfirmPassword(confirmPassword)}
                  className={`auth-input ${confirmPasswordError ? 'auth-input-error' : ''}`}
                  placeholder="Conferma la tua password"
                  aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
                  aria-invalid={!!confirmPasswordError}
                />
                {confirmPasswordError && (
                  <p id="confirm-password-error" className="auth-error-message" role="alert">
                    {confirmPasswordError}
                  </p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="auth-input-group">
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
                    className="auth-checkbox mt-1"
                  />
                  <label htmlFor="accept-terms" className="ml-2 text-sm text-text-secondary">
                    Accetto i{" "}
                    <Link href="/terms" className="auth-link">
                      termini e condizioni
                    </Link>{" "}
                    e la{" "}
                    <Link href="/privacy" className="auth-link">
                      privacy policy
                    </Link>
                  </label>
                </div>
                {termsError && (
                  <p className="auth-error-message" role="alert">
                    {termsError}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-btn"
                aria-label="Registra il tuo account"
              >
                {isLoading ? (
                  <>
                    <div className="auth-spinner"></div>
                    Registrazione in corso...
                  </>
                ) : (
                  "Registrati"
                )}
              </button>

              {/* Login Link */}
              <div className="text-center mt-4">
                <span className="auth-text-muted text-sm">Hai gia un account? </span>
                <Link href="/login" className="auth-link text-sm">
                  Accedi qui
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
