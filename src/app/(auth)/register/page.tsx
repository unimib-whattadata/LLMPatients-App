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
      .min(2, "Il nome deve avere almeno 2 caratteri")
      .max(50, "Il nome deve avere meno di 50 caratteri"),
    email: z
      .string()
      .trim()
      .email("Inserisci un'email valida"),
    password: z
      .string()
      .min(8, "La password deve contenere almeno 8 caratteri")
      .regex(/[A-Z]/, "La password deve contenere una lettera maiuscola")
      .regex(/[a-z]/, "La password deve contenere una lettera minuscola")
      .regex(/\d/, "La password deve contenere un numero")
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        "La password deve contenere un carattere speciale",
      ),
    confirmPassword: z.string().min(1, "Conferma password obbligatoria"),
    acceptTerms: z
      .boolean()
      .refine((value) => value === true, {
        message: "Devi accettare i termini e le condizioni",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Le password non corrispondono",
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * Register Page Component
 *
 * Handles user registration with comprehensive validation.
 * Redirects authenticated users to home page.
 */
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
          data?.error || "Registrazione fallita. Riprova più tardi.",
        );
        return;
      }

      router.push("/login?message=Registrazione avvenuta con successo! Accedi.");
    } catch {
      setServerError(
        "Si è verificato un errore inatteso. Riprova più tardi.",
      );
    }
  });

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
                    <FormLabel htmlFor="name">Nome completo</FormLabel>
                    <FormControl>
                      <Input
                        id="name"
                        autoComplete="name"
                        placeholder="Il tuo nome completo"
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
                          autoComplete="new-password"
                          placeholder="Crea una password sicura"
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="confirm-password">Conferma password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Conferma la tua password"
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
                              ? "Nascondi conferma password"
                              : "Mostra conferma password"
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
                        Accetto i
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-green hover:text-primary-green/80 transition-colors mx-1"
                        >
                          termini e condizioni
                        </a>
                        della piattaforma e la
                        <Link
                          href="/privacy"
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
                aria-label="Registra il tuo account"
              >
                {isSubmitting ? "Registrazione in corso..." : "Registrati"}
              </Button>

              <div className="text-center text-sm text-text-secondary">
                Hai già un account?
                <Link
                  href="/login"
                  className="text-primary-green hover:text-primary-green/80 transition-colors ml-1"
                >
                  Accedi qui
                </Link>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
