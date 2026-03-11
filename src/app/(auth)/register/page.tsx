
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import Link from "next/link";
import { Eye, X } from "lucide-react";
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

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must have at least 2 characters")
      .max(50, "Name must have fewer than 50 characters"),
    email: z
      .string()
      .trim()
      .email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/\d/, "Password must contain a number")
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        "Password must contain a special character",
      ),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
    acceptTerms: z
      .boolean()
      .refine((value) => value === true, {
        message: "You must accept terms and conditions",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

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
  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = form.handleSubmit(async (values) => {
    setServerError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setServerError(
          data?.error || "Registration failed. Try again later.",
        );
        return;
      }

      router.push("/login?message=Registration completed successfully! Sign in.");
    } catch {
      setServerError(
        "An unexpected error occurred. Try again later.",
      );
    }
  });

  return (
    <div className="min-h-screen flex">
      {}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-green/10 to-primary-violet/10 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-primary-green mb-6">
            Join LLMPatients
          </h1>
          <p className="text-xl text-text-secondary leading-relaxed">
            Start your medical learning journey with interactive simulations and intelligent virtual patients.
          </p>
          <div className="mt-8 flex items-center justify-center space-x-4 text-sm text-text-tertiary">
            <span>•</span>
            <span>Advanced training</span>
            <span>•</span>
            <span>Realistic simulations</span>
            <span>•</span>
            <span>Progress tracking</span>
          </div>
        </div>
      </div>

      {}
      <div className="w-full lg:w-1/2 bg-[var(--color-navbar-dark)] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Sign up</h2>
          <p className="text-text-secondary mb-8">
            Join our virtual patient training platform
          </p>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {serverError && (
                <div className="bg-error/20 border border-error/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <X className="h-4 w-4 text-error mr-2" />
                    <div className="text-error">{serverError}</div>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="name">Full name</FormLabel>
                    <FormControl>
                      <Input
                        id="name"
                        autoComplete="name"
                        placeholder="Your full name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="Your email"
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
                          autoComplete="new-password"
                          placeholder="Create a secure password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="confirm-password">Confirm password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Confirm your password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={
                            showConfirmPassword
                              ? "Hide password confirmation"
                              : "Show password confirmation"
                          }
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
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          id="terms"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="terms"
                        className="text-sm font-normal text-text-secondary"
                      >
                        I accept the
                        <Link
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-green hover:text-primary-green/80 transition-colors mx-1"
                        >
                          terms and conditions
                        </Link>
                        of the platform and the
                        <Link
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-green hover:text-primary-green/80 transition-colors ml-1"
                        >
                          privacy policy
                        </Link>
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                aria-label="Register your account"
              >
                {isSubmitting ? "Registering..." : "Sign up"}
              </Button>

              <div className="text-center text-sm text-text-secondary">
                Already have an account?
                <Link
                  href="/login"
                  className="text-primary-green hover:text-primary-green/80 transition-colors ml-1"
                >
                  Sign in here
                </Link>
              </div>

              <div
                className="pt-4 text-center text-xs text-text-tertiary"
                aria-label="Legal links"
              >
                <Link
                  href="/privacy"
                  className="underline underline-offset-4 hover:text-text-secondary transition-colors"
                >
                  Privacy Policy
                </Link>
                <span className="mx-2" aria-hidden="true">
                  •
                </span>
                <Link
                  href="/terms"
                  className="underline underline-offset-4 hover:text-text-secondary transition-colors"
                >
                  Terms and Conditions
                </Link>
                <span className="mx-2" aria-hidden="true">
                  •
                </span>
                <Link
                  href="/cookies"
                  className="underline underline-offset-4 hover:text-text-secondary transition-colors"
                >
                  Cookie Settings
                </Link>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
