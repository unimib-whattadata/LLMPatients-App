import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import {
  users,
} from "~/server/db/schema";
import {
  validateUserById,
  validateUserByEmail,
  comprehensiveUserValidation,
  createValidationConfig,
} from "~/server/auth/user-validation";

/**
 * Module augmentation for `next-auth` types
 *
 * Extends the default NextAuth types to include custom properties for our application.
 * Adds role-based access control and impersonation functionality to the session object.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "admin" | "user"; // Add role to session type
      // ...other properties
    } & DefaultSession["user"];
    // Add impersonation context to session
    impersonation?: {
      isImpersonating: boolean;
      originalAdminId: string;
      targetUserId: string;
      targetUserEmail: string;
      targetUserName: string | null;
      startedAt: Date;
      sessionId: string;
    };
  }

  interface User {
    role: "admin" | "user"; // Add role to user type
    // ...other properties
  }
}

// Extend JWT token to include impersonation context
declare module "next-auth" {
  interface JWT {
    // Existing fields
    id?: string;
    role?: string;
    email?: string;
    name?: string;
    image?: string;
    lastValidated?: number;
    accessToken?: string;
    provider?: string;

    // Impersonation fields
    impersonation?: {
      originalAdminId: string;
      targetUserId: string;
      targetUserEmail: string;
      targetUserName: string | null;
      isActive: boolean;
      sessionId: string;
      startedAt: number;
    };
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          if (process.env.NODE_ENV === "development") {
            if (process.env.NODE_ENV === "development") {
            console.warn("Credentials authorize - Missing email or password");
          }
          }
          return null;
        }

        try {
          if (process.env.NODE_ENV === "development") {
            if (process.env.NODE_ENV === "development") {
            console.log(
              "Credentials authorize - Validating user:",
              credentials.email,
            );
          }
          }

          // Use enhanced validation function
          const userValidation = await validateUserByEmail(
            credentials.email as string,
            createValidationConfig({ timeout: 5000, retries: 2 }),
          );

          if (!userValidation.isValid || !userValidation.user) {
            if (process.env.NODE_ENV === "development") {
              if (process.env.NODE_ENV === "development") {
            console.warn(
                "Credentials authorize - User validation failed:",
                userValidation.error,
              );
          }
            }
            return null;
          }

          const user = userValidation.user;

          // Get the full user record including password for verification
          const fullUserResults = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email as string))
            .limit(1);

          if (fullUserResults.length === 0) {
            if (process.env.NODE_ENV === "development") {
              if (process.env.NODE_ENV === "development") {
            console.warn(
                "Credentials authorize - User not found in password verification query",
              );
          }
            }
            return null;
          }

          const fullUser = fullUserResults[0]!;

          // Verify password
          if (!fullUser.password) {
            if (process.env.NODE_ENV === "development") {
              if (process.env.NODE_ENV === "development") {
            console.warn("Credentials authorize - User has no password set");
          }
            }
            return null;
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            fullUser.password,
          );

          if (!isValidPassword) {
            if (process.env.NODE_ENV === "development") {
              if (process.env.NODE_ENV === "development") {
            console.warn(
                "Credentials authorize - Invalid password for user:",
                credentials.email,
              );
          }
            }
            return null;
          }

          // Perform comprehensive validation before returning user
          const comprehensiveValidation = await comprehensiveUserValidation(
            user.id,
            user.role,
            createValidationConfig({ timeout: 3000, retries: 1 }),
          );

          if (
            !comprehensiveValidation.isValid ||
            !comprehensiveValidation.accountActive
          ) {
            if (process.env.NODE_ENV === "development") {
              if (process.env.NODE_ENV === "development") {
            console.error(
                "Credentials authorize - Comprehensive validation failed:",
                comprehensiveValidation.errors,
              );
          }
            }
            return null;
          }

          if (process.env.NODE_ENV === "development") {
            if (process.env.NODE_ENV === "development") {
            console.log("Credentials authorize - Authentication successful:", {
              userId: user.id,
              email: user.email,
              role: user.role,
            });
          }
          }

          // Return validated user object for session creation
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role as "admin" | "user",
          };
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Credentials authorize - Unexpected error:", error);
          }
          return null;
        }
      },
    }),
    DiscordProvider,
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],

  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  
  // CSRF protection configuration
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.callback-url" 
        : "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Host-next-auth.csrf-token" 
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  // Note: Adapter is removed when using JWT strategy
  // adapter: DrizzleAdapter(db, {...}) - Only used with database strategy

  // Enhanced session configuration with JWT strategy
  session: {
    strategy: "jwt" as const, // Primary strategy: JWT
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours - update session every 24 hours
  },

  // JWT configuration for NextAuth v5
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },


  // Enhanced pages configuration
  pages: {
    signIn: "/login",
    signOut: "/signout", // Custom styled signout page
    error: "/login", // Redirect errors to login page
  },

  callbacks: {
    // Enhanced JWT callback with comprehensive database validation
    jwt: async ({ token, user, account, trigger }) => {
      if (process.env.NODE_ENV === "development") {
            console.log(
        "JWT callback - Enhanced database validation - Trigger:",
        trigger,
        "User:",
        user?.email,
        "Token exists:",
        !!token,
      );
          }

      // Initial sign in - populate token with validated user data
      if (user?.id) {
        // Validate user exists in database during initial sign-in
        const validation = await validateUserById(
          user.id,
          createValidationConfig({ timeout: 3000 }),
        );

        if (!validation.isValid || !validation.user) {
          if (process.env.NODE_ENV === "development") {
            console.error(
            "JWT callback - User validation failed during sign-in:",
            validation.error,
          );
          }
          return null; // Reject token creation if user validation fails
        }

        // Populate token with validated database data
        token.id = validation.user.id;
        token.role = validation.user.role;
        token.email = validation.user.email;
        token.name = validation.user.name ?? undefined;
        token.image = validation.user.image ?? undefined;
        token.lastValidated = Date.now(); // Track when we last validated against DB

        if (process.env.NODE_ENV === "development") console.log(
          "JWT callback - Initial sign in with DB validation successful:",
          {
            id: token.id,
            email: token.email,
            role: token.role,
            validated: new Date((token.lastValidated as number) ?? Date.now()).toISOString(),
          },
        );
      }

      // Handle account linking with validation
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        if (process.env.NODE_ENV === "development") {
            console.log("JWT callback - Account linked:", account.provider);
          }

        // Re-validate user data when account is linked
        if (token.id) {
          const validation = await validateUserById(
            token.id as string,
            createValidationConfig({ timeout: 3000 }),
          );
          if (validation.isValid && validation.user) {
            token.role = validation.user.role;
            token.email = validation.user.email;
            token.name = validation.user.name ?? undefined;
            token.image = validation.user.image ?? undefined;
            token.lastValidated = Date.now();
            if (process.env.NODE_ENV === "development") {
            console.log(
              "JWT callback - User data refreshed after account linking",
            );
          }
          }
        }
      }

      // Enhanced token refresh with comprehensive database validation
      if (token.id) {
        const currentTime = Date.now();
        const lastValidated = token.lastValidated ?? 0;
        const validationInterval = 5 * 60 * 1000; // 5 minutes
        const shouldValidate =
          trigger === "update" ||
          (currentTime - ((lastValidated as number) ?? 0)) > validationInterval;

        if (shouldValidate) {
          if (process.env.NODE_ENV === "development") {
            console.log(
            "JWT callback - Performing comprehensive database validation...",
          );
          }

          try {
            const validation = await comprehensiveUserValidation(
              token.id as string,
              token.role as string,
              createValidationConfig({
                timeout: trigger === "update" ? 5000 : 3000,
                retries: trigger === "update" ? 3 : 2,
              }),
            );

            if (!validation.isValid || !validation.user) {
              if (process.env.NODE_ENV === "development") {
            console.error(
                "JWT callback - Comprehensive validation failed:",
                validation.errors,
              );
          }

              // Check if user was deleted
              if (
                validation.errors.some((error) => error.includes("not found"))
              ) {
                if (process.env.NODE_ENV === "development") {
            console.warn(
                  "JWT callback - User no longer exists, invalidating token",
                );
          }
                return null; // User was deleted, invalidate token
              }

              // For other errors, continue with existing token but log warning
              if (process.env.NODE_ENV === "development") console.warn(
                "JWT callback - Database validation errors (continuing with existing token):",
                validation.errors,
              );
              return token;
            }

            // Check for account deactivation
            if (!validation.accountActive) {
              if (process.env.NODE_ENV === "development") {
            console.warn(
                "JWT callback - User account is not active, invalidating token",
              );
          }
              return null;
            }

            // Update token with latest database data
            const wasRoleChanged = validation.roleChanged;
            token.role = validation.user.role;
            token.email = validation.user.email;
            token.name = validation.user.name ?? undefined;
            token.image = validation.user.image ?? undefined;
            token.lastValidated = currentTime;

            if (wasRoleChanged) {
              if (process.env.NODE_ENV === "development") console.log(
                "JWT callback - Role change detected and updated in token:",
                {
                  userId: token.id,
                  newRole: token.role,
                  previousValidation: new Date((lastValidated as number) ?? 0).toISOString(),
                },
              );
            } else {
              if (process.env.NODE_ENV === "development") console.log(
                "JWT callback - Token refreshed with current DB data:",
                {
                  id: token.id,
                  email: token.email,
                  role: token.role,
                  validated: new Date(currentTime).toISOString(),
                },
              );
            }
          } catch (error) {
            if (process.env.NODE_ENV === "development") {
            console.error(
              "JWT callback - Error during comprehensive validation:",
              error,
            );
          }

            // On database errors, continue with existing token but mark as needing validation
            token.lastValidated = currentTime - validationInterval / 2; // Retry sooner
            if (process.env.NODE_ENV === "development") {
            console.warn(
              "JWT callback - Continuing with existing token due to database error",
            );
          }
          }
        }
      }

      return token;
    },

    // Enhanced session callback with database cross-validation and impersonation support
    session: async ({ session, token }) => {
      if (process.env.NODE_ENV === "development") console.log(
        "Session callback - Enhanced DB validation with impersonation - Creating session for token:",
        {
          tokenId: token?.id,
          tokenEmail: token?.email,
          tokenRole: token?.role,
          isImpersonating: !!(token?.impersonation && typeof token.impersonation === 'object' && 'isActive' in token.impersonation && token.impersonation.isActive),
          impersonationTarget: (token?.impersonation && typeof token.impersonation === 'object' && 'targetUserEmail' in token.impersonation) ? token.impersonation.targetUserEmail : undefined,
          lastValidated: token?.lastValidated
            ? new Date((token.lastValidated as number) ?? 0).toISOString()
            : "never",
        },
      );

      if (!token || !session.user) {
        if (process.env.NODE_ENV === "development") {
            console.warn("Session callback - Missing token or session.user:", {
          hasToken: !!token,
          hasSessionUser: !!session.user,
        });
          }
        return session;
      }

      // Check if token validation is recent enough
      const currentTime = Date.now();
      const lastValidated = token.lastValidated ?? 0;
      const validationAge = currentTime - ((lastValidated as number) ?? 0);
      const maxValidationAge = 10 * 60 * 1000; // 10 minutes

      // Perform additional database validation for stale tokens or critical operations
      if (validationAge > maxValidationAge) {
        if (process.env.NODE_ENV === "development") {
            console.log(
          "Session callback - Token validation is stale, performing fresh database check...",
        );
          }

        try {
          const validation = await validateUserById(
            (token.id as string) ?? "",
            createValidationConfig({ timeout: 2000, retries: 1 }),
          );

          if (!validation.isValid || !validation.user) {
            if (process.env.NODE_ENV === "development") {
            console.error(
              "Session callback - Fresh database validation failed:",
              validation.error,
            );
          }

            // If user was deleted or deactivated, return empty session to force logout
            if (validation.error?.includes("not found")) {
              if (process.env.NODE_ENV === "development") {
            console.warn(
                "Session callback - User no longer exists, invalidating session",
              );
          }
              // Return session with empty user to trigger logout
              return {
                ...session,
                user: {
                  id: "",
                  email: "",
                  name: "",
                  image: "",
                  role: "user" as const,
                },
              };
            }

            // For other errors, log warning but continue with token data
            if (process.env.NODE_ENV === "development") {
            console.warn(
              "Session callback - Database error during validation, using token data",
            );
          }
          } else {
            // Use fresh database data for session
            if (process.env.NODE_ENV === "development") {
            console.log(
              "Session callback - Using fresh database data for session",
            );
          }
            session.user.id = validation.user.id;
            session.user.role =
              (validation.user.role as "admin" | "user") || "user";
            session.user.email = validation.user.email;
            session.user.name = validation.user.name ?? undefined;
            session.user.image = validation.user.image;

            if (process.env.NODE_ENV === "development") {
            console.log(
              "Session callback - Session created with fresh DB data:",
              {
                userId: session.user.id,
                email: session.user.email,
                role: session.user.role,
              },
            );
          }

            // Continue to impersonation logic below
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error(
            "Session callback - Error during fresh database validation:",
            error,
          );
          }
          // Fall through to use token data
        }
      } else {
        // Use token data for session (validation was recent)
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as "admin" | "user") || "user";
        session.user.email = (token.email as string) ?? "";
        session.user.name = (token.name as string) ?? "";
        session.user.image = (token.image as string) ?? "";
      }

      // Handle impersonation context
      if (token.impersonation && typeof token.impersonation === 'object' && 'isActive' in token.impersonation && token.impersonation.isActive) {
        if (process.env.NODE_ENV === "development") {
            console.log(
          "Session callback - Active impersonation detected, setting up impersonated session",
        );
          }

        // Override user details with impersonated user
        const impersonation = token.impersonation as Record<string, unknown>;
        if (impersonation && typeof impersonation === 'object') {
          session.user.id = (impersonation.targetUserId as string) || '';
          session.user.email = (impersonation.targetUserEmail as string) || '';
          session.user.name = (impersonation.targetUserName as string) || '';
          session.user.role = "user"; // Impersonated sessions always have user role

          // Add impersonation context to session
          session.impersonation = {
            isImpersonating: true,
            originalAdminId: (impersonation.originalAdminId as string) || '',
            targetUserId: (impersonation.targetUserId as string) || '',
            targetUserEmail: (impersonation.targetUserEmail as string) || '',
            targetUserName: (impersonation.targetUserName as string) || '',
            startedAt: new Date((impersonation.startedAt as string) || new Date()),
            sessionId: (impersonation.sessionId as string) || '',
          };
        }

        if (process.env.NODE_ENV === "development") {
            console.log("Session callback - Impersonated session created:", {
          originalAdminId: session.impersonation?.originalAdminId,
          impersonatedUserId: session.user.id,
          impersonatedUserEmail: session.user.email,
          sessionId: session.impersonation?.sessionId,
        });
          }
      } else {
        // No impersonation active
        session.impersonation = undefined;

        if (process.env.NODE_ENV === "development") console.log("Session callback - Normal session created:", {
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role,
          tokenAge:
            validationAge > 0
              ? `${Math.round(validationAge / 1000)}s`
              : "fresh",
        });
      }

      return session;
    },

    // Enhanced redirect callback with validation logging
    async redirect({ url, baseUrl }) {
      if (process.env.NODE_ENV === "development") console.log("NextAuth redirect callback (enhanced):", { url, baseUrl });

      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

    // Enhanced signIn callback with database validation
    async signIn({ user, account, profile: _profile, email: _email, credentials }) {
      if (process.env.NODE_ENV === "development") {
            console.log("SignIn callback - Enhanced validation:", {
        userId: user?.id,
        userEmail: user?.email,
        accountProvider: account?.provider,
        hasCredentials: !!credentials,
      });
          }

      // For credentials provider, additional validation is handled in authorize function
      if (account?.provider === "credentials") {
        return true; // Already validated in authorize function
      }

      // For OAuth providers, validate user exists and is active
      if (user?.id) {
        try {
          const validation = await validateUserById(
            user.id,
            createValidationConfig({ timeout: 3000, retries: 2 }),
          );

          if (!validation.isValid) {
            if (process.env.NODE_ENV === "development") {
            console.error(
              "SignIn callback - User validation failed for OAuth:",
              validation.error,
            );
          }
            return false;
          }

          if (process.env.NODE_ENV === "development") {
            console.log("SignIn callback - OAuth user validation successful");
          }
          return true;
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error(
            "SignIn callback - Error validating OAuth user:",
            error,
          );
          }
          return false;
        }
      }

      return true;
    },
  },

  // Enhanced events with database validation logging
  events: {
    async signIn(message) {
      if (process.env.NODE_ENV === "development") console.log("NextAuth signIn event (enhanced):", {
        user: message.user.email,
        userId: message.user.id,
        account: message.account?.provider,
        profile: message.profile?.email,
        isNewUser: message.isNewUser,
      });

      // Log database validation status if available
      if (message.user.id) {
        try {
          const validation = await validateUserById(
            message.user.id,
            createValidationConfig({ timeout: 1000, retries: 1 }),
          );
          if (process.env.NODE_ENV === "development") {
            console.log("SignIn event - DB validation status:", {
            isValid: validation.isValid,
            userRole: validation.user?.role,
            error: validation.error,
          });
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.warn("SignIn event - Could not validate against DB:", error);
          }
        }
      }
    },

    async session(message) {
      if (process.env.NODE_ENV === "development") console.log("NextAuth session event (enhanced):", {
        user: message.session?.user?.email,
        userId: message.session?.user?.id,
        role: (message.session?.user as { role?: string })?.role,
        sessionExists: !!message.session,
      });
    },

    async signOut(_message) {
      if (process.env.NODE_ENV === "development") console.log("NextAuth signOut event (enhanced):", {
        timestamp: new Date().toISOString(),
      });
    },

    async updateUser(_message) {
      if (process.env.NODE_ENV === "development") console.log("NextAuth updateUser event:", {
        timestamp: new Date().toISOString(),
      });
    },
  },

  // Enable debug in development
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig;
