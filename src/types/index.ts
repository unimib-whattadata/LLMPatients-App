
import type { ComponentType, ReactNode } from "react";

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "user";
  image?: string | null;
}

export interface ImpersonationContext {
  isImpersonating: boolean;
  originalAdminId: string;
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string | null;
  startedAt: Date;
  sessionId: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export type { Patient } from "../server/api/routers/patients";
export type { TherapySession } from "../server/api/routers/therapy-sessions";


export type { ReactNode };
