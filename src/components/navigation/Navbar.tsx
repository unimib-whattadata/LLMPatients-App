"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api } from "~/trpc/react";
import { 
  Bars3Icon, 
  XMarkIcon, 
  Bars3BottomLeftIcon, 
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  UserPlusIcon,
  PlayIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  HomeIcon
} from "@heroicons/react/24/outline";
import { getNavItems as getNavigationItems } from "./navigationUtils";

// Types
interface User {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "user";
  image?: string | null;
}

interface ImpersonationContext {
  isImpersonating: boolean;
  originalAdminId: string;
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string | null;
  startedAt: Date;
  sessionId: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
 * Unified Navbar Component
 * Handles all navigation across different page types
 */
export function Navbar({ 
  user, 
  impersonation, 
  layoutType, 
  currentPage = "",
  onSidebarToggle,
  sidebarCollapsed = false,
  showSidebar = false
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        setMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Get navigation items based on user role and impersonation status
  const navItems = user ? getNavigationItems(user, impersonation) : [];

  // Determine display user (impersonated or actual)
  const displayUser = impersonation?.isImpersonating ? {
    id: impersonation.targetUserId,
    name: impersonation.targetUserName,
    email: impersonation.targetUserEmail,
    role: "user" as const,
  } : user;

  // Handle logout
  const handleLogout = () => {
    const callbackUrl = typeof window !== 'undefined' ? window.location.origin : '/';
    window.location.href = `/api/auth/signout?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  // Render dashboard header
  const renderDashboardHeader = () => (
    <header className="dashboard-header">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left section: Menu toggle + Logo */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-text-primary hover:text-text-primary/80 hover:bg-text-primary/10 lg:hidden transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-text-primary/20"
              aria-label="Toggle mobile menu"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>
            
            {/* Desktop sidebar toggle */}
            {showSidebar && (
              <button
                onClick={onSidebarToggle}
                className="p-2 rounded-md text-text-primary hover:text-text-primary/80 hover:bg-text-primary/10 hidden lg:block transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-text-primary/20"
                aria-label="Toggle sidebar"
              >
                <Bars3BottomLeftIcon className="w-5 h-5" />
              </button>
            )}
            
            {/* Logo */}
            <Link href="/" className="flex items-center focus:outline-none focus:ring-2 focus:ring-text-primary/20 rounded-md">
              <img 
                src="/images/logo.png" 
                alt="LLMPatient Logo" 
                className="w-8 h-8 rounded-lg"
              />
              <span className="ml-2 text-lg font-bold text-text-primary hidden sm:inline">LLMPatient</span>
            </Link>
          </div>
          
          {/* Right section: User info + Controls */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* User name - hidden on mobile */}
            {displayUser && (
              <span className="text-sm text-text-primary/90 font-medium hidden md:inline truncate max-w-32">
                {displayUser.name ?? displayUser.email}
              </span>
            )}
            
            {/* Role badge */}
            {displayUser && (
              <span className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-200 ${
                displayUser.role === "admin" 
                  ? "bg-secondary-500/20 text-secondary-100 border border-secondary-400/40" 
                  : "bg-accent-500/20 text-accent-100 border border-accent-400/30"
              }`}>
                <span className="hidden sm:inline">
                  {displayUser.role === "admin" ? "Admin" : "Utente"}
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
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation menu">
          <div 
            className="fixed inset-0 z-50 bg-black/50" 
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed top-16 left-0 right-0 z-50 bg-background-secondary border-t border-border-secondary max-h-96 overflow-y-auto">
            <nav className="px-4 py-6" role="navigation" aria-label="Mobile navigation">
              <div className="space-y-1" role="list">
                {navItems.map((item, index) => {
                  const isActive = currentPage === item.href || pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center px-3 py-3 text-base font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-text-primary/20 ${
                        isActive
                          ? "bg-accent-600 text-text-primary"
                          : "text-text-secondary hover:bg-background-tertiary hover:text-text-primary"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                      role="listitem"
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="w-5 h-5 mr-3" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              
              {/* Mobile user info */}
              {displayUser && (
                <div className="mt-6 pt-6 border-t border-border-secondary" role="contentinfo" aria-label="User information">
                  <div className="flex items-center px-3">
                    <div className="flex-shrink-0">
                      <div 
                        className="w-8 h-8 bg-background-tertiary rounded-full flex items-center justify-center"
                        role="img"
                        aria-label={`${displayUser.name || 'User'} avatar`}
                      >
                        <span className="text-text-primary text-sm font-medium" aria-hidden="true">
                          {(displayUser.name ?? displayUser.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-text-primary">
                        {displayUser.name ?? 'User'}
                      </div>
                      <div className="text-sm text-text-tertiary">{displayUser.email}</div>
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
    const badgeClass = displayUser?.role === "admin"
      ? "site-menu__role-badge site-menu__role-badge--admin"
      : "site-menu__role-badge site-menu__role-badge--user";

    const desktopActions = displayUser ? (
      <div className="site-menu__auth-block">
        <span className="hidden md:inline text-sm text-text-secondary truncate max-w-[9rem]">
          {displayUser.name ?? displayUser.email}
        </span>
        <span className={`${badgeClass} hidden md:inline-flex`}>
          {roleLabel}
        </span>
        <Link href="/dashboard" className="btn btn-primary btn-sm hidden md:inline-flex">
          Area personale
        </Link>
        <button onClick={handleLogout} className="site-menu__logout-btn hidden md:inline-flex">
          Esci
        </button>
      </div>
    ) : (
      <div className="site-menu__auth-block">
        <Link href="/login" className="btn btn-outline btn-sm hidden md:inline-flex">
          Accedi
        </Link>
        <Link href="/register" className="btn btn-primary btn-sm hidden md:inline-flex">
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
            <p className="site-menu__mobile-name">{displayUser.name ?? "Utente"}</p>
            <p className="site-menu__mobile-email">{displayUser.email}</p>
          </div>
        </div>
        <span className={badgeClass}>{roleLabel}</span>
        <div className="site-menu__mobile-buttons">
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            Area personale
          </Link>
          <button onClick={handleLogout} className="site-menu__logout-btn site-menu__logout-btn--block">
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
      <header className={`site-menu site-menu--light ${mobileMenuOpen ? "site-menu--open" : ""}`}>
        <div className="site-menu__inner section-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="site-menu__brand">
            <Link href="/" className="site-menu__brand-link" onClick={() => setMobileMenuOpen(false)}>
              <img src="/images/logo.png" alt="LLMPatient" className="site-menu__brand-logo" />
              <span className="site-menu__brand-name">LLMPatient</span>
            </Link>
          </div>

          <nav className="site-menu__nav" aria-label="Navigazione principale">
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
            <span className="sr-only">{mobileMenuOpen ? "Chiudi il menu" : "Apri il menu"}</span>
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
          {layoutType === "dashboard" ? renderDashboardHeader() : renderHomeHeader()}
        </div>
      </div>
    </>
  );
}

// Export types and utilities
export type { User, ImpersonationContext, NavItem, AdminViewMode, LayoutType };
