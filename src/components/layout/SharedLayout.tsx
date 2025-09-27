"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShadcnNavbar, getNavSections } from "@/components/navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";

import type { User, ImpersonationContext, NavItem } from "~/types";

/**
 * Configuration for layout behavior
 */
interface LayoutConfig {
  showSidebar: boolean;
  showFooter: boolean;
  headerStyle: "dashboard" | "home";
  containerClass: string;
}

/**
 * Props for the SharedLayout component
 */
interface SharedLayoutProps {
  children: React.ReactNode;
  user?: User;
  impersonation?: ImpersonationContext;
  layoutType: "dashboard" | "home";
  currentPage?: string;
}

/**
 * SharedLayout Component
 *
 * Main layout wrapper that provides consistent structure across the application.
 * Adapts its appearance and behavior based on the layout type and user context.
 *
 * Features:
 * - Responsive navigation with sidebar
 * - User authentication state handling
 * - Impersonation support for admin users
 * - Dynamic page titles and breadcrumbs
 * - Consistent styling across different page types
 *
 * @param children - Page content to be rendered
 * @param user - Current user information
 * @param impersonation - Impersonation context for admin users
 * @param layoutType - Layout style ("dashboard" or "home")
 * @param currentPage - Current page identifier for navigation
 * @returns JSX element containing the complete page layout
 */
export function SharedLayout({
  children,
  user,
  impersonation,
  layoutType,
  currentPage = "",
}: SharedLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [isDesktop]);

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector(".sidebar-container");
      const toggleButton = document.querySelector('[aria-label*="sidebar"]');

      if (
        mobileSidebarOpen &&
        sidebar &&
        !sidebar.contains(event.target as Node) &&
        toggleButton &&
        !toggleButton.contains(event.target as Node)
      ) {
        setMobileSidebarOpen(false);
      }
    };

    if (mobileSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [mobileSidebarOpen]);

  // Configure layout based on type
  const layoutConfig: LayoutConfig = {
    showSidebar: layoutType === "dashboard",
    showFooter: layoutType === "home",
    headerStyle: layoutType,
    containerClass:
      layoutType === "dashboard"
        ? "dashboard-container"
        : "min-h-screen bg-background-primary",
  };

  // Get navigation sections for sidebar
  const navSections = getNavSections(user, impersonation);

  // Determine display user (impersonated or actual)
  const displayUser = impersonation?.isImpersonating
    ? {
        id: impersonation.targetUserId,
        name: impersonation.targetUserName,
        email: impersonation.targetUserEmail,
        role: "user" as const,
      }
    : user;

  // Render sidebar for dashboard layout
  const renderSidebar = () => {
    if (!layoutConfig.showSidebar) return null;

    return (
      <aside
        className="dashboard-sidebar"
        role="complementary"
        aria-label="Dashboard navigation"
      >
        {/* Navigation */}
        <nav
          className="flex-1 space-y-2 px-4 py-6"
          id="sidebar-navigation"
          role="navigation"
        >
          {/* Navigation Section Label */}
          {impersonation?.isImpersonating && (
            <p
              className="text-text-tertiary mb-4 text-xs font-semibold tracking-wider uppercase"
              role="heading"
              aria-level={3}
            >
              Sessione Impersonificata
            </p>
          )}

          {/* Navigation Sections */}
          {navSections.map((section, sectionIndex) => (
            <div key={section.title} className={sectionIndex > 0 ? "mt-6" : ""}>
              <h3
                className="text-text-tertiary mb-3 px-3 text-xs font-semibold tracking-wider uppercase"
                role="heading"
                aria-level={3}
              >
                {section.title}
              </h3>
              <ul className="nav-list" role="list">
                {section.items.map((item: NavItem) => {
                  const isActive =
                    currentPage === item.href || pathname === item.href;
                  return (
                    <li key={item.href} role="listitem">
                      <Link
                        href={item.href}
                        className={`nav-item ${isActive ? "active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon
                          className="mr-3 h-5 w-5 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Info Footer */}
        <div
          className="bg-background-secondary p-4"
          role="contentinfo"
          aria-label="User information"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className="bg-background-tertiary flex h-8 w-8 items-center justify-center rounded-full"
                role="img"
                aria-label={`${displayUser?.name ?? "User"} avatar`}
              >
                <span
                  className="text-text-primary text-sm font-medium"
                  aria-hidden="true"
                >
                  {(displayUser?.name ?? displayUser?.email ?? "U")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-text-primary truncate text-sm font-medium">
                {displayUser?.name ?? "User"}
              </p>
              <p className="text-text-tertiary truncate text-xs">
                {displayUser?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>
    );
  };

  return (
    <div className={`layout-container ${layoutConfig.containerClass}`}>
      
      {/* Skip Navigation Links */}
      <a
        href="#main-content"
        className="skip-link"
        onFocus={(e) => (e.currentTarget.style.top = "6px")}
        onBlur={(e) => (e.currentTarget.style.top = "-40px")}
      >
        Vai al contenuto principale
      </a>
      {layoutConfig.showSidebar && (
        <a
          href="#sidebar-navigation"
          className="skip-link"
          onFocus={(e) => (e.currentTarget.style.top = "6px")}
          onBlur={(e) => (e.currentTarget.style.top = "-40px")}
        >
          Vai alla navigazione laterale
        </a>
      )}
      <a
        href="#site-navigation"
        className="skip-link"
        onFocus={(e) => (e.currentTarget.style.top = "6px")}
        onBlur={(e) => (e.currentTarget.style.top = "-40px")}
      >
        Vai al menu principale
      </a>

      {/* Shadcn Navbar */}
      <ShadcnNavbar
        user={user}
        impersonation={impersonation}
        layoutType={layoutType}
        currentPage={currentPage}
      />

      {/* Main Layout */}
      <div
        className={`main-container ${layoutConfig.showSidebar ? "dashboard-layout" : "home-layout"}`}
      >
        {/* Sidebar */}
        {layoutConfig.showSidebar && (
          <div
            className={`sidebar-container ${mobileSidebarOpen ? "mobile-open" : ""}`}
          >
            {renderSidebar()}
          </div>
        )}

        {/* Main Content */}
        <main
          id="main-content"
          className={`content-container ${layoutConfig.showSidebar ? "with-sidebar" : "full-width"}`}
          role="main"
          aria-label="Main content"
          tabIndex={-1}
        >
          <div className="content-wrapper">{children}</div>
        </main>
      </div>
    </div>
  );
}
