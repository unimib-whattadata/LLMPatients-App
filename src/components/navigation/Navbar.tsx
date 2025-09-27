"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bars3Icon,
  XMarkIcon,
  Bars3BottomLeftIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { getNavItems as getNavigationItems } from "./navigationUtils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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

/**
 * Navigation section containing multiple items
 */
interface NavSection {
  title: string;
  items: NavItem[];
}

type AdminViewMode = "admin" | "user";
type LayoutType = "dashboard" | "home";

interface NavbarProps {
  user?: User;
  impersonation?: ImpersonationContext;
  layoutType: LayoutType;
  currentPage?: string;
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
  showSidebar?: boolean;
}

/**
 * Navbar Component
 *
 * Unified navigation component that handles all navigation across different page types.
 * Provides responsive navigation with mobile support, user authentication, and admin features.
 *
 * Features:
 * - Responsive mobile navigation with hamburger menu
 * - User authentication state display
 * - Admin impersonation functionality
 * - Dynamic navigation items based on user role
 * - Sidebar toggle for dashboard layouts
 * - Breadcrumb navigation
 *
 * @param user - Current user information
 * @param impersonation - Impersonation context for admin users
 * @param layoutType - Layout type ("dashboard" or "home")
 * @param currentPage - Current page identifier
 * @param onSidebarToggle - Callback for sidebar toggle
 * @param sidebarCollapsed - Whether sidebar is collapsed
 * @param showSidebar - Whether to show sidebar toggle
 * @returns JSX element containing the navigation bar
 */
export function Navbar({
  user,
  impersonation,
  layoutType,
  currentPage = "",
  onSidebarToggle,
  sidebarCollapsed = false,
  showSidebar = false,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
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
      // Fallback: redirect manually if signOut fails
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  };

  // Render dashboard header
  const renderDashboardHeader = () => (
    <header className="dashboard-header">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left section: Menu toggle + Logo */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-text-primary hover:text-text-primary/80 hover:bg-text-primary/10 focus:ring-text-primary/20 rounded-md p-2 focus:ring-2 focus:outline-none lg:hidden"
              aria-label="Toggle mobile menu"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="h-5 w-5" />
              ) : (
                <Bars3Icon className="h-5 w-5" />
              )}
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="focus:ring-text-primary/20 flex items-center rounded-md focus:ring-2 focus:outline-none"
            >
              <img
                src="/images/logo.png"
                alt="LLMPatient Logo"
                className="h-8 w-8 rounded-lg"
              />
              <span className="text-text-primary ml-2 hidden text-lg font-bold sm:inline">
                LLMPatient
              </span>
            </Link>
          </div>

          {/* Right section: User info + Controls */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* User name - hidden on mobile */}
            {displayUser && (
              <span className="text-text-primary/90 hidden max-w-32 truncate text-sm font-medium md:inline">
                {displayUser.name ?? displayUser.email}
              </span>
            )}

            {/* Role badge */}
            {displayUser && (
              <span
                className={`pill pill--sm ${
                  displayUser.role === "admin"
                    ? "site-menu__role-badge site-menu__role-badge--admin"
                    : "site-menu__role-badge site-menu__role-badge--user"
                }`}
              >
                <span className="hidden sm:inline">
                  {displayUser.role === "admin" ? "Admin" : "User"}
                </span>
                <span className="sm:hidden">
                  {displayUser.role === "admin" ? "A" : "U"}
                </span>
              </span>
            )}

            {/* Logout button */}
            {displayUser && (
              <button
                onClick={handleLogout}
                className="btn btn-ghost btn-sm"
                title="Esci"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="bg-background-secondary fixed top-16 right-0 left-0 z-50 max-h-96 overflow-y-auto">
            <nav
              className="px-4 py-6"
              role="navigation"
              aria-label="Mobile navigation"
            >
              <div className="space-y-1" role="list">
                {navItems.map((item, index) => {
                  const isActive =
                    currentPage === item.href || pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`focus:ring-text-primary/20 flex items-center rounded-md px-3 py-3 text-base font-medium focus:ring-2 focus:outline-none ${
                        isActive
                          ? "bg-accent-600 text-text-primary"
                          : "text-text-secondary hover:bg-background-tertiary hover:text-text-primary"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                      role="listitem"
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {/* Mobile user info */}
              {displayUser && (
                <div
                  className="mt-6 pt-6"
                  role="contentinfo"
                  aria-label="User information"
                >
                  <div className="flex items-center px-3">
                    <div className="flex-shrink-0">
                      <div
                        className="bg-background-tertiary flex h-8 w-8 items-center justify-center rounded-full"
                        role="img"
                        aria-label={`${displayUser.name ?? "User"} avatar`}
                      >
                        <span
                          className="text-text-primary text-sm font-medium"
                          aria-hidden="true"
                        >
                          {(displayUser.name ?? displayUser.email)
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-text-primary text-base font-medium">
                        {displayUser.name ?? "User"}
                      </div>
                      <div className="text-text-tertiary text-sm">
                        {displayUser.email}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );

  // Render home page header
  const renderHomeHeader = () => {
    const menuLinks = [
      { label: "Home", href: "/" },
      { label: "Esplora pazienti", href: "/explore-patients" },
    ];

    const roleLabel = displayUser?.role === "admin" ? "Admin" : "Utente";
    const badgeClass =
      displayUser?.role === "admin"
        ? "pill pill--sm site-menu__role-badge site-menu__role-badge--admin"
        : "pill pill--sm site-menu__role-badge site-menu__role-badge--user";

    const desktopActions = displayUser ? (
      <div className="site-menu__auth-block">
        <span className="text-text-secondary hidden max-w-[9rem] truncate text-sm md:inline">
          {displayUser.name ?? displayUser.email}
        </span>
        <span className={`${badgeClass} hidden md:inline-flex`}>
          {roleLabel}
        </span>
        <Link
          href="/dashboard"
          className="btn btn-primary btn-sm hidden md:inline-flex"
        >
          Area personale
        </Link>
        <button
          onClick={handleLogout}
          className="site-menu__logout-btn hidden md:inline-flex"
        >
          Esci
        </button>
      </div>
    ) : (
      <div className="site-menu__auth-block">
        <Link
          href="/login"
          className="btn btn-outline btn-sm hidden md:inline-flex"
        >
          Accedi
        </Link>
        <Link
          href="/register"
          className="btn btn-primary btn-sm hidden md:inline-flex"
        >
          Registrati
        </Link>
      </div>
    );

    const mobileActions = displayUser ? (
      <div className="site-menu__mobile-user">
        <div className="site-menu__mobile-user-info">
          <div className="site-menu__mobile-avatar" aria-hidden="true">
            {(displayUser.name ?? displayUser.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="site-menu__mobile-name">
              {displayUser.name ?? "Utente"}
            </p>
            <p className="site-menu__mobile-email">{displayUser.email}</p>
          </div>
        </div>
        <span className={badgeClass}>{roleLabel}</span>
        <div className="site-menu__mobile-buttons">
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            Area personale
          </Link>
          <button
            onClick={handleLogout}
            className="site-menu__logout-btn site-menu__logout-btn--block"
          >
            Esci
          </button>
        </div>
      </div>
    ) : (
      <div className="site-menu__mobile-buttons">
        <Link href="/login" className="btn btn-outline btn-sm">
          Accedi
        </Link>
        <Link href="/register" className="btn btn-primary btn-sm">
          Registrati
        </Link>
      </div>
    );

    return (
      <header
        className={`site-menu site-menu--light ${mobileMenuOpen ? "site-menu--open" : ""}`}
      >
        <div className="site-menu__inner w-full px-4 sm:px-6 lg:px-8">
          <div className="site-menu__brand">
            <Link
              href="/"
              className="site-menu__brand-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <img
                src="/images/logo.png"
                alt="LLMPatient"
                className="site-menu__brand-logo"
              />
              <span className="site-menu__brand-name">LLMPatient</span>
            </Link>
          </div>

          <nav
            className="site-menu__nav"
            id="site-navigation"
            aria-label="Navigazione principale"
          >
            <ul className="site-menu__nav-list" role="list">
              {menuLinks.map((link, index) => (
                <li key={`${link.href}-${index}`} role="listitem">
                  <Link
                    href={link.href}
                    className={`site-menu__link ${pathname === link.href ? "is-active" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={pathname === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-menu__right">{desktopActions}</div>

          <button
            type="button"
            className="site-menu__mobile-toggle"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Chiudi il menu" : "Apri il menu"}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            <span className="sr-only">
              {mobileMenuOpen ? "Chiudi il menu" : "Apri il menu"}
            </span>
            <svg
              className="site-menu__mobile-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>

        <div className="site-menu__mobile" hidden={!mobileMenuOpen}>
          <div className="section-container">
            <ul className="site-menu__mobile-list" role="list">
              {menuLinks.map((link, index) => (
                <li key={`${link.href}-${index}`} role="listitem">
                  <Link
                    href={link.href}
                    className={`site-menu__link ${pathname === link.href ? "is-active" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={pathname === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="site-menu__mobile-extra">{mobileActions}</div>
          </div>
        </div>
      </header>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="header-container">
        <div role="banner">
          {layoutType === "dashboard"
            ? renderDashboardHeader()
            : renderHomeHeader()}
        </div>
      </div>
    </>
  );
}

// Export types and utilities
export type {
  User,
  ImpersonationContext,
  NavItem,
  NavSection,
  AdminViewMode,
  LayoutType,
};
