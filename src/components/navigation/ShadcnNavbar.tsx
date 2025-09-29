"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import {
  LogOut,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

/**
 * User interface for navigation context
 */
interface User {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "user";
  image?: string | null;
}

/**
 * Impersonation context for admin users
 */
interface ImpersonationContext {
  isImpersonating: boolean;
  originalAdminId: string;
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string | null;
  startedAt: Date;
  sessionId: string;
}

/**
 * Navigation item structure
 */
interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

type LayoutType = "dashboard" | "home";

interface ShadcnNavbarProps {
  user?: User;
  impersonation?: ImpersonationContext;
  layoutType: LayoutType;
  currentPage?: string;
}

/**
 * ShadcnNavbar Component
 *
 * Modern navigation component using shadcn/ui NavigationMenu.
 * Provides responsive navigation with mobile support, user authentication, and admin features.
 */
export function ShadcnNavbar({
  user,
  impersonation,
  layoutType: _layoutType,
  currentPage: _currentPage = "",
}: ShadcnNavbarProps) {


  // Determine display user (impersonated or actual)
  const displayUser = impersonation?.isImpersonating
    ? {
        id: impersonation.targetUserId,
        name: impersonation.targetUserName,
        email: impersonation.targetUserEmail,
        role: "user" as const,
      }
    : user;

  // Handle logout
  const handleLogout = async () => {
    try {
      const callbackUrl =
        typeof window !== "undefined" ? window.location.origin : "/";
      await signOut({ callbackUrl });
    } catch (error) {
      console.error("Logout error:", error);
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  };



  // Render user menu
  const renderUserMenu = () => {
    if (!displayUser) return null;

    return (
      <div className="flex items-center space-x-2">
        <span className="hidden max-w-32 truncate text-sm font-medium text-muted-foreground md:inline">
          {displayUser.name ?? displayUser.email}
        </span>
        <Badge variant={displayUser.role === "admin" ? "admin" : "user"}>
          {displayUser.role === "admin" ? "Admin" : "User"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          title="Esci"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // Render auth buttons for non-authenticated users
  const renderAuthButtons = () => (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        asChild
        className="border-2 border-[var(--color-primary-yellow)] bg-[var(--color-navbar-dark)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary-yellow)] hover:text-[var(--color-text-inverse)]"
      >
        <Link href="/login">Accedi</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/register">Registrati</Link>
      </Button>
    </div>
  );


  return (
    <header 
      className="navbar-background sticky top-0 z-50 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex h-16 items-center px-4 w-full">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/images/logo.png"
              alt="LLMPatient"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="hidden text-lg font-bold sm:inline-block">
              LLMPatient
            </span>
          </Link>
        </div>

        {/* Spacer to push right content to the right */}
        <div className="flex-1" />

        {/* Right side - User menu or Auth buttons */}
        <div className="flex items-center space-x-2">
          {displayUser ? renderUserMenu() : renderAuthButtons()}
        </div>
      </div>
    </header>
  );
}

// Export types
export type {
  User,
  ImpersonationContext,
  NavItem,
  LayoutType,
};
