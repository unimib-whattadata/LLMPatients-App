import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { USER_ROLES, type UserRole } from "~/server/db/contracts";
import {
  comprehensiveUserValidation,
  createValidationConfig,
  validateUserByEmailForAuth,
  validateUserById,
} from "~/server/auth/user-validation";
import { cleanupImpersonationForSignOutToken } from "~/server/impersonation/service";

const ONE_DAY_IN_SECONDS = 24 * 60 * 60;
const THIRTY_DAYS_IN_SECONDS = 30 * ONE_DAY_IN_SECONDS;

function getSessionLifetimeMs(rememberMe: boolean): number {
  return (rememberMe ? THIRTY_DAYS_IN_SECONDS : ONE_DAY_IN_SECONDS) * 1000;
}

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

const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" &&
  (USER_ROLES as readonly string[]).includes(value);

type TokenUserPayload = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  isActive: boolean;
};

type AuthSession = DefaultSession & {
  user: {
    id: string;
    role: UserRole;
    isActive: boolean;
  } & DefaultSession["user"];
};

function getStringField(
  candidate: unknown,
  field: string,
): string | null | undefined {
  if (
    typeof candidate === "object" &&
    candidate !== null &&
    field in candidate
  ) {
    const value = (candidate as Record<string, unknown>)[field];
    if (typeof value === "string") {
      return value;
    }
    if (value === null || value === undefined) {
      return value;
    }
  }

  return undefined;
}

function hasTokenUserPayload(
  candidate: unknown,
): candidate is TokenUserPayload {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    typeof getStringField(candidate, "id") === "string" &&
    typeof getStringField(candidate, "email") === "string" &&
    isUserRole((candidate as Record<string, unknown>).role) &&
    typeof (candidate as Record<string, unknown>).isActive === "boolean"
  );
}

async function resolveTokenUserPayload(
  candidate: unknown,
): Promise<TokenUserPayload | null> {
  if (hasTokenUserPayload(candidate)) {
    return {
      id: candidate.id,
      email: candidate.email,
      name: candidate.name ?? null,
      image: candidate.image ?? null,
      role: candidate.role,
      isActive: candidate.isActive,
    };
  }

  const userId = getStringField(candidate, "id");
  if (!userId) {
    return null;
  }

  const validation = await validateUserById(
    userId,
    createValidationConfig({ timeout: 2000, retries: 0 }),
  );

  if (!validation.isValid || !validation.user) {
    return null;
  }

  return {
    id: validation.user.id,
    email: validation.user.email,
    name: validation.user.name,
    image: validation.user.image,
    role: validation.user.role,
    isActive: validation.user.isActive,
  };
}

function applyUserToToken(
  token: Record<string, unknown>,
  user: TokenUserPayload,
  validatedAt = Date.now(),
) {
  token.id = user.id;
  token.role = user.role;
  token.email = user.email;
  token.name = user.name ?? undefined;
  token.image = user.image ?? undefined;
  token.isActive = user.isActive;
  token.lastValidated = validatedAt;
}

function applyTokenToSession(
  session: AuthSession,
  token: Record<string, unknown>,
) {
  session.user.id = (token.id as string) ?? "";
  session.user.role = (token.role as UserRole) ?? "user";
  session.user.email = (token.email as string) ?? "";
  session.user.name = (token.name as string | null | undefined) ?? null;
  session.user.image = (token.image as string | null | undefined) ?? null;
  session.user.isActive = token.isActive === false ? false : true;
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      isActive: boolean;
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
    role: UserRole;
    isActive?: boolean;
  }
}

declare module "next-auth" {
  interface JWT {
    id?: string;
    role?: UserRole;
    email?: string;
    name?: string;
    image?: string;
    isActive?: boolean;
    lastValidated?: number;
    accessToken?: string;
    provider?: string;
    rememberMe?: boolean;
    sessionExpiresAt?: number;

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
          const validation = await validateUserByEmailForAuth(
            credentials.email as string,
            createValidationConfig({ timeout: 3000, retries: 0 }),
          );

          if (!validation.isValid || !validation.user) {
            return null;
          }

          const user = validation.user;
          if (!user.passwordHash || !user.isActive) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash,
          );

          if (!isValidPassword) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            isActive: user.isActive,
            rememberMe:
              credentials.rememberMe === "true" ||
              credentials.rememberMe === true,
          };
        } catch {
          return null;
        }
      },
    }),
    DiscordProvider,
  ],

  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt" as const,
    maxAge: THIRTY_DAYS_IN_SECONDS,
    updateAge: ONE_DAY_IN_SECONDS,
  },

  jwt: {
    maxAge: THIRTY_DAYS_IN_SECONDS,
  },

  pages: {
    signIn: "/login",
    signOut: "/signout",
    error: "/login",
  },

  callbacks: {
    jwt: async ({ token, user, account, trigger }) => {
      if (user?.id) {
        const tokenUser = await resolveTokenUserPayload(user);
        if (!tokenUser) {
          return null;
        }

        applyUserToToken(token as Record<string, unknown>, tokenUser);

        const rememberMe = extractRememberMe(user);
        token.rememberMe = rememberMe;
        token.sessionExpiresAt = Date.now() + getSessionLifetimeMs(rememberMe);
      }

      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }

      if (token.id) {
        const currentTime = Date.now();
        if (
          typeof token.sessionExpiresAt === "number" &&
          currentTime >= token.sessionExpiresAt
        ) {
          return null;
        }

        const lastValidated = (token.lastValidated as number | undefined) ?? 0;
        const validationInterval = 5 * 60 * 1000;
        const shouldValidate =
          trigger === "update" ||
          currentTime - lastValidated > validationInterval;

        if (shouldValidate) {
          try {
            const validation = await comprehensiveUserValidation(
              token.id as string,
              token.role as string | undefined,
              createValidationConfig({
                timeout: trigger === "update" ? 3000 : 2000,
                retries: trigger === "update" ? 1 : 0,
              }),
            );

            if (!validation.isValid || !validation.user) {
              if (
                validation.errors.some(
                  (error) =>
                    error.includes("not found") || error.includes("inactive"),
                )
              ) {
                return null;
              }

              return token;
            }

            applyUserToToken(
              token as Record<string, unknown>,
              validation.user,
              currentTime,
            );
          } catch {
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

      applyTokenToSession(session as AuthSession, token);
      if (typeof token.sessionExpiresAt === "number") {
        (session as unknown as Record<string, unknown>).expires = new Date(
          token.sessionExpiresAt,
        ).toISOString();
      }

      if (
        token.impersonation &&
        typeof token.impersonation === "object" &&
        "isActive" in token.impersonation &&
        token.impersonation.isActive
      ) {
        const impersonation = token.impersonation as Record<string, unknown>;
        session.user.id = (impersonation.targetUserId as string) || "";
        session.user.email = (impersonation.targetUserEmail as string) || "";
        session.user.name = (impersonation.targetUserName as string) || "";
        session.user.role = "user";
        session.user.isActive = true;

        session.impersonation = {
          isImpersonating: true,
          originalAdminId: (impersonation.originalAdminId as string) || "",
          targetUserId: (impersonation.targetUserId as string) || "",
          targetUserEmail: (impersonation.targetUserEmail as string) || "",
          targetUserName: (impersonation.targetUserName as string) || "",
          startedAt: new Date(
            typeof impersonation.startedAt === "number"
              ? impersonation.startedAt
              : Date.now(),
          ),
          sessionId: (impersonation.sessionId as string) || "",
        };
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
      credentials: _credentials,
    }) {
      if (account?.provider === "credentials") {
        return true;
      }

      if (user?.id) {
        try {
          const validation = await validateUserById(
            user.id,
            createValidationConfig({ timeout: 2000, retries: 0 }),
          );

          if (!validation.isValid || !validation.user?.isActive) {
            return false;
          }

          const mutableUser = user as typeof user & {
            role?: UserRole;
            isActive?: boolean;
            email?: string | null;
            name?: string | null;
            image?: string | null;
          };

          mutableUser.role = validation.user.role;
          mutableUser.isActive = validation.user.isActive;
          mutableUser.email = validation.user.email;
          mutableUser.name = validation.user.name;
          mutableUser.image = validation.user.image;

          return true;
        } catch {
          return false;
        }
      }

      return true;
    },
  },

  events: {
    async signOut(message) {
      if ("token" in message) {
        await cleanupImpersonationForSignOutToken(message.token);
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig;
