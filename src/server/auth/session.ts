import type { Session } from "next-auth";
import { redirect } from "next/navigation";

import type { ImpersonationContext, User } from "~/types";

import { auth } from "./index";

export type AuthenticatedAppSession = Session & {
  user: NonNullable<Session["user"]> & {
    id: string;
    email: string;
    role: User["role"];
  };
  impersonation?: ImpersonationContext;
};

type SessionUserInput = {
  id: string;
  email: string;
  name?: string | null;
  role?: User["role"];
  image?: string | null;
};

export async function getAppSession() {
  return auth();
}

export async function requireAppSession(
  redirectTo = "/login",
): Promise<AuthenticatedAppSession> {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    redirect(redirectTo);
  }

  return session as AuthenticatedAppSession;
}

export function toAppUser(user: SessionUserInput): User {
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email,
    role: user.role ?? "user",
    image: user.image ?? null,
  };
}

export function getLayoutSessionProps(session?: Session | null): {
  user?: User;
  impersonation?: ImpersonationContext;
} {
  if (!session?.user?.id || !session.user.email) {
    return {
      user: undefined,
      impersonation: session?.impersonation ?? undefined,
    };
  }

  return {
    user: toAppUser({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      image: session.user.image,
    }),
    impersonation: session.impersonation ?? undefined,
  };
}
