import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "~/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
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
  }

  interface User {
    role: "admin" | "user"; // Add role to user type
    // ...other properties
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
          return null;
        }

        try {
          // Query user by email
          const userResults = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email as string))
            .limit(1);

          if (userResults.length === 0) {
            return null;
          }

          const user = userResults[0]!;

          // Verify password
          if (!user.password) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValidPassword) {
            return null;
          }

          // Return user object for session creation (including role)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: (user.role as "admin" | "user") || "user", // Include role with fallback to 'user'
          };
        } catch (error) {
          console.error("Auth error:", error);
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
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as any, // Type assertion to handle NextAuth v5 beta compatibility
  
  // Enhanced session configuration
  session: {
    strategy: "database" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // 24 hours - update session every 24 hours
  },
  
  // Enhanced cookie configuration for better session persistence
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? process.env.AUTH_COOKIE_DOMAIN : undefined,
      }
    }
  },
  
  // Enhanced pages configuration
  pages: {
    signIn: '/login',
    error: '/login', // Redirect errors to login page
  },
  
  callbacks: {
    // Include user role in session for role-based access control
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        role: (user as any).role || "user", // Include role in session
      },
    }),
    // Ensure role is available when user is retrieved
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || "user";
      }
      return token;
    },
    // Enhanced redirect callback for better UX
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  
  // Enhanced events for debugging
  events: {
    async signIn(message) {
      console.log('User signed in:', message.user.email);
    },
    async session(message) {
      console.log('Session accessed:', message.session?.user?.email);
    },
  },
  
  // Enable debug in development
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;
