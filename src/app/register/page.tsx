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
    <div className="min-h-screen bg-gray-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-800 flex-col justify-center px-12">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold text-white mb-8">Nome Brand</h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Unisciti alla nostra piattaforma di allenamento con pazienti virtuali. Inizia la tua esperienza qui.
          </p>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-gray-700 rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">Registrazione</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Global Error Message */}
              {error && (
                <div className="text-sm text-red-400 text-center bg-red-900/20 border border-red-700 rounded-md p-3">
                  {error}
                </div>
              )}

              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
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
                  className={`w-full px-4 py-3 bg-white rounded-md border ${
                    nameError ? 'border-red-500' : 'border-gray-300'
                  } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent`}
                  placeholder="Il tuo nome completo"
                  aria-describedby={nameError ? "name-error" : undefined}
                  aria-invalid={!!nameError}
                />
                {nameError && (
                  <p id="name-error" className="mt-1 text-sm text-red-400" role="alert">
                    {nameError}
                  </p>
                )}
              </div>

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
                  className={`w-full px-4 py-3 bg-white rounded-md border ${
                    passwordError ? 'border-red-500' : 'border-gray-300'
                  } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent`}
                  placeholder="La tua password"
                  aria-describedby={passwordError ? "password-error" : undefined}
                  aria-invalid={!!passwordError}
                />
                {passwordError && (
                  <p id="password-error" className="mt-1 text-sm text-red-400" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
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
                  className={`w-full px-4 py-3 bg-white rounded-md border ${
                    confirmPasswordError ? 'border-red-500' : 'border-gray-300'
                  } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent`}
                  placeholder="Conferma la tua password"
                  aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
                  aria-invalid={!!confirmPasswordError}
                />
                {confirmPasswordError && (
                  <p id="confirm-password-error" className="mt-1 text-sm text-red-400" role="alert">
                    {confirmPasswordError}
                  </p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div>
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
                    className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded bg-white mt-1"
                  />
                  <label htmlFor="accept-terms" className="ml-2 text-sm text-gray-300">
                    Accetto i{" "}
                    <Link href="/terms" className="text-green-500 hover:text-green-400 transition-colors duration-200">
                      termini e condizioni
                    </Link>{" "}
                    e la{" "}
                    <Link href="/privacy" className="text-green-500 hover:text-green-400 transition-colors duration-200">
                      privacy policy
                    </Link>
                  </label>
                </div>
                {termsError && (
                  <p className="mt-1 text-sm text-red-400" role="alert">
                    {termsError}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 ${
                  isLoading ? "cursor-wait opacity-50" : ""
                }`}
                aria-label="Registra il tuo account"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registrazione in corso...
                  </div>
                ) : (
                  "Registrati"
                )}
              </button>

              {/* Login Link */}
              <div className="text-center mt-4">
                <span className="text-gray-400 text-sm">Hai già un account? </span>
                <Link href="/login" className="text-green-500 hover:text-green-400 text-sm font-medium transition-colors duration-200">
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