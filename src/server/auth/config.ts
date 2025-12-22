import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { users } from "~/server/db/tables";
import {
  validateUserById,
  validateUserByEmail,
  comprehensiveUserValidation,
  createValidationConfig,
} from "~/server/auth/user-validation";

const extractRememberMe = (candidate: unknown): boolean => {
  if (
    typeof candidate === "object" &&
    candidate !== null &&
    "rememberMe" in candidate
  ) {
    const value = (candidate as { rememberMe?: unknown }).rememberMe;
    if (typeof value === "boolean") {
      return value;
    }
  }

  return false;
};

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "admin" | "user"; 
      
    } & DefaultSession["user"];
    
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
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: "admin" | "user"; 
    
  }
}


declare module "next-auth" {
  interface JWT {
    
    id?: string;
    role?: string;
    email?: string;
    name?: string;
    image?: string;
    lastValidated?: number;
    accessToken?: string;
    provider?: string;
    maxAge?: number; 
    rememberMe?: boolean; 

    
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

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "boolean" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const userValidation = await validateUserByEmail(
            credentials.email as string,
            createValidationConfig({ timeout: 5000, retries: 2 }),
          );

          if (!userValidation.isValid || !userValidation.user) {
            return null;
          }

          const user = userValidation.user;

          
          const fullUserResults = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email as string))
            .limit(1);

          if (fullUserResults.length === 0) {
            return null;
          }

          const fullUser = fullUserResults[0]!;

          
          if (!fullUser.password) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            fullUser.password as string,
          );

          if (!isValidPassword) {
            return null;
          }

          
          const comprehensiveValidation = await comprehensiveUserValidation(
            user.id,
            user.role,
            createValidationConfig({ timeout: 3000, retries: 1 }),
          );

          if (
            !comprehensiveValidation.isValid ||
            !comprehensiveValidation.accountActive
          ) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role as "admin" | "user",
            rememberMe:
              credentials.rememberMe === "true" ||
              credentials.rememberMe === true,
          };
        } catch (error) {
          return null;
        }
      },
    }),
    DiscordProvider,
      ],

  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  
  ...(process.env.NODE_ENV === "production" && {
    
    basePath: "/api/auth",
    
    useSecureCookies: true,
  }),

  
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
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
      name:
        process.env.NODE_ENV === "production"
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
      name:
        process.env.NODE_ENV === "production"
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

  
  

  
  session: {
    strategy: "jwt" as const, 
    maxAge: 30 * 24 * 60 * 60, 
    updateAge: 24 * 60 * 60, 
  },

  
  jwt: {
    maxAge: 30 * 24 * 60 * 60, 
  },

  
  pages: {
    signIn: "/login",
    signOut: "/signout", 
    error: "/login", 
  },

  callbacks: {
    
    jwt: async ({ token, user, account, trigger }) => {
      if (user?.id) {
        const validation = await validateUserById(
          user.id,
          createValidationConfig({ timeout: 3000 }),
        );

        if (!validation.isValid || !validation.user) {
          return null; 
        }

        
        token.id = validation.user.id;
        token.role = validation.user.role;
        token.email = validation.user.email;
        token.name = validation.user.name ?? undefined;
        token.image = validation.user.image ?? undefined;
        token.lastValidated = Date.now(); 

        
        const rememberMe = extractRememberMe(user);
        token.rememberMe = rememberMe;
        if (rememberMe) {
          
          token.maxAge = 30 * 24 * 60 * 60; 
        } else {
          
          token.maxAge = 24 * 60 * 60; 
        }

      }

      
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;

        
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
          }
        }
      }

      
      if (token.id) {
        const currentTime = Date.now();
        const lastValidated = token.lastValidated ?? 0;
        const validationInterval = 5 * 60 * 1000; 
        const shouldValidate =
          trigger === "update" ||
          currentTime - ((lastValidated as number) ?? 0) > validationInterval;

        if (shouldValidate) {
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
              if (
                validation.errors.some((error) => error.includes("not found"))
              ) {
                return null; 
              }
              return token;
            }

            if (!validation.accountActive) {
              return null;
            }

            token.role = validation.user.role;
            token.email = validation.user.email;
            token.name = validation.user.name ?? undefined;
            token.image = validation.user.image ?? undefined;
            token.lastValidated = currentTime;
          } catch (error) {
            token.lastValidated = currentTime - validationInterval / 2; 
          }
        }
      }

      return token;
    },

    
    session: async ({ session, token }) => {
      if (!token || !session.user) {
        return session;
      }

      
      const currentTime = Date.now();
      const lastValidated = token.lastValidated ?? 0;
      const validationAge = currentTime - ((lastValidated as number) ?? 0);
      const maxValidationAge = 10 * 60 * 1000; 

      
      if (validationAge > maxValidationAge) {
        try {
          const validation = await validateUserById(
            (token.id as string) ?? "",
            createValidationConfig({ timeout: 2000, retries: 1 }),
          );

          if (!validation.isValid || !validation.user) {
            if (validation.error?.includes("not found")) {
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
          } else {
            session.user.id = validation.user.id;
            session.user.role =
              (validation.user.role as "admin" | "user") || "user";
            session.user.email = validation.user.email;
            session.user.name = validation.user.name ?? undefined;
            session.user.image = validation.user.image;
          }
        } catch (error) {
          // Silent catch
        }
      } else {
        
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as "admin" | "user") || "user";
        session.user.email = (token.email as string) ?? "";
        session.user.name = (token.name as string) ?? "";
        session.user.image = (token.image as string) ?? "";
      }

      
      if (
        token.impersonation &&
        typeof token.impersonation === "object" &&
        "isActive" in token.impersonation &&
        token.impersonation.isActive
      ) {
        const impersonation = token.impersonation as Record<string, unknown>;
        if (impersonation && typeof impersonation === "object") {
          session.user.id = (impersonation.targetUserId as string) || "";
          session.user.email = (impersonation.targetUserEmail as string) || "";
          session.user.name = (impersonation.targetUserName as string) || "";
          session.user.role = "user"; 

          
          session.impersonation = {
            isImpersonating: true,
            originalAdminId: (impersonation.originalAdminId as string) || "",
            targetUserId: (impersonation.targetUserId as string) || "",
            targetUserEmail: (impersonation.targetUserEmail as string) || "",
            targetUserName: (impersonation.targetUserName as string) || "",
            startedAt: new Date(
              (impersonation.startedAt as string) || new Date(),
            ),
            sessionId: (impersonation.sessionId as string) || "",
          };
        }
      } else {
        session.impersonation = undefined;
      }

      return session;
    },

    
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

    
    async signIn({
      user,
      account,
      profile: _profile,
      email: _email,
      credentials,
    }) {
      if (account?.provider === "credentials") {
        return true; 
      }

      if (user?.id) {
        try {
          const validation = await validateUserById(
            user.id,
            createValidationConfig({ timeout: 3000, retries: 2 }),
          );

          if (!validation.isValid) {
            return false;
          }

          return true;
        } catch (error) {
          return false;
        }
      }

      return true;
    },
  },

  events: {},

  
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig;
