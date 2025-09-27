"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "~/components/ui/navigation-menu";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { getNavItems as getNavigationItems } from "./navigationUtils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "~/lib/utils";

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
  layoutType,
  currentPage = "",
}: ShadcnNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    if (isDesktop) {
      setMobileMenuOpen(false);
    }
  }, [isDesktop]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Get navigation items based on user role and impersonation status
  const navItems = user ? getNavigationItems(user, impersonation) : [];

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

  // Navigation items for home page
  const homeNavItems = [
    { label: "Esplora pazienti", href: "/explore-patients", icon: UserGroupIcon },
  ];

  // Get current navigation items
  const currentNavItems = layoutType === "dashboard" ? navItems : homeNavItems;

  // Render user menu
  const renderUserMenu = () => {
    if (!displayUser) return null;

    return (
      <div className="flex items-center space-x-2">
        <span className="hidden max-w-32 truncate text-sm font-medium text-muted-foreground md:inline">
          {displayUser.name ?? displayUser.email}
        </span>
        <Badge variant={displayUser.role === "admin" ? "default" : "secondary"}>
          {displayUser.role === "admin" ? "Admin" : "User"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          title="Esci"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // Render auth buttons for non-authenticated users
  const renderAuthButtons = () => (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="sm" asChild>
        <Link href="/login">Accedi</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/register">Registrati</Link>
      </Button>
    </div>
  );

  // Render mobile menu
  const renderMobileMenu = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} id="mobile-navigation-sheet">
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden">
          <Bars3Icon className="h-5 w-5" />
          <span className="sr-only">Apri menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <div className="flex flex-col space-y-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Image
              src="/images/logo.png"
              alt="LLMPatient"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-lg font-bold">LLMPatient</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-2">
            {currentNavItems.map((item) => {
              const isActive = currentPage === item.href || pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          {displayUser && (
            <div className="border-t pt-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={displayUser.image || ""} />
                  <AvatarFallback>
                    {(displayUser.name ?? displayUser.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex-col">
                  <p className="text-sm font-medium">
                    {displayUser.name ?? "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {displayUser.email}
                  </p>
                </div>
                <Badge variant={displayUser.role === "admin" ? "default" : "secondary"}>
                  {displayUser.role === "admin" ? "Admin" : "User"}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="mt-3 w-full"
              >
                <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                Esci
              </Button>
            </div>
          )}

          {/* Auth Buttons for non-authenticated users */}
          {!displayUser && (
            <div className="border-t pt-4">
              <div className="flex flex-col space-y-2">
                <Button variant="outline" asChild>
                  <Link href="/login">Accedi</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Registrati</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header 
      className="sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ backgroundColor: 'var(--color-navbar-dark)' }}
    >
      <div className="container flex h-16 items-center justify-between px-4">
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


        {/* Right side - User menu or Auth buttons */}
        <div className="flex items-center space-x-2">
          {displayUser ? renderUserMenu() : renderAuthButtons()}
          {renderMobileMenu()}
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
