"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { createLogger } from "~/lib/logger";
import type { User, ImpersonationContext } from "~/types";

const logger = createLogger("ShadcnNavbar");

type LayoutType = "dashboard" | "home";

interface ShadcnNavbarProps {
  user?: User;
  impersonation?: ImpersonationContext;
  layoutType: LayoutType;
  currentPage?: string;
}

export function ShadcnNavbar({
  user,
  impersonation,
  layoutType: _layoutType,
  currentPage: _currentPage = "",
}: ShadcnNavbarProps) {


  const displayUser = impersonation?.isImpersonating
    ? {
      id: impersonation.targetUserId,
      name: impersonation.targetUserName,
      email: impersonation.targetUserEmail,
      role: "user" as const,
    }
    : user;


  const handleLogout = async () => {
    try {
      const callbackUrl =
        typeof window !== "undefined" ? window.location.origin : "/";
      await signOut({ callbackUrl });
    } catch (error) {
      logger.error("Logout failed", error);
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  };




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
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  };


  const renderAuthButtons = () => (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        asChild
        className="border-2 border-accent bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Link href="/login">Sign in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/register">Sign up</Link>
      </Button>
    </div>
  );


  return (
    <header
      className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/50"
    >
      <div className="flex h-16 items-center px-4 w-full">
        { }
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/images/logo.png"
              alt="LLMPatients"
              width={32}
              height={32}
              className="rounded-lg"
              style={{ width: 32, height: 32 }}
            />
            <span className="hidden text-lg font-bold sm:inline-block">
              LLMPatients
            </span>
          </Link>
        </div>

        { }
        <div className="flex-1" />

        { }
        <div className="flex items-center space-x-2">
          {displayUser ? renderUserMenu() : renderAuthButtons()}
        </div>
      </div>
    </header>
  );
}
