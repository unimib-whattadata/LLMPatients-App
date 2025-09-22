"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar, getNavSections } from "@/components/navigation";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";

import type {
  User,
  ImpersonationContext,
  AdminViewMode,
  NavItem,
} from "~/types";

interface LayoutConfig {
  showSidebar: boolean;
  showFooter: boolean;
  headerStyle: "dashboard" | "home";
  containerClass: string;
}

interface SharedLayoutProps {
  children: React.ReactNode;
  user?: User;
  impersonation?: ImpersonationContext;
  layoutType: "dashboard" | "home";
  currentPage?: string;
}

/**
 * Shared Layout Component
 * Main layout wrapper that adapts to different page types
 */
export function SharedLayout({
  children,
  user,
  impersonation,
  layoutType,
  currentPage = "",
}: SharedLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>("admin");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        setSidebarCollapsed(true);
        setMobileSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        className={`dashboard-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
        role="complementary"
        aria-label="Dashboard navigation"
      >
        {/* Sidebar Header */}
        <div className={`${sidebarCollapsed ? "p-2" : "p-4"}`}>
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2
                className="text-text-primary text-lg font-semibold"
                id="sidebar-heading"
              >
                {impersonation?.isImpersonating
                  ? "Area Personale"
                  : user?.role === "admin"
                    ? "Amministrazione"
                    : "Area Personale"}
              </h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`${sidebarCollapsed ? "bg-background-tertiary border-border-primary border p-2" : "p-1.5"} text-text-tertiary hover:text-text-primary hover:bg-background-tertiary focus:ring-primary-500 hidden rounded-md focus:ring-2 focus:outline-none lg:block`}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              aria-expanded={!sidebarCollapsed}
              aria-controls="sidebar-navigation"
            >
              <ChevronLeftIcon
                className={`h-4 w-4 ${sidebarCollapsed ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className={`flex-1 ${sidebarCollapsed ? "px-2 py-4" : "px-4 py-6"} space-y-2`}
          id="sidebar-navigation"
          aria-labelledby="sidebar-heading"
          role="navigation"
        >
          {/* Navigation Section Label */}
          {!sidebarCollapsed && impersonation?.isImpersonating && (
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
              {!sidebarCollapsed && (
                <h3
                  className="text-text-tertiary mb-3 px-3 text-xs font-semibold tracking-wider uppercase"
                  role="heading"
                  aria-level={3}
                >
                  {section.title}
                </h3>
              )}
              <ul className="nav-list" role="list">
                {section.items.map((item: NavItem, itemIndex: number) => {
                  const isActive =
                    currentPage === item.href || pathname === item.href;
                  const globalIndex =
                    navSections
                      .slice(0, sectionIndex)
                      .reduce((acc, s) => acc + s.items.length, 0) + itemIndex;
                  return (
                    <li key={item.href} role="listitem">
                      <div className="group relative">
                        <Link
                          href={item.href}
                          className={`nav-item ${isActive ? "active" : ""}`}
                          title={sidebarCollapsed ? item.label : undefined}
                          aria-current={isActive ? "page" : undefined}
                          aria-describedby={
                            sidebarCollapsed
                              ? `tooltip-${globalIndex}`
                              : undefined
                          }
                        >
                          <item.icon
                            className="mr-3 h-5 w-5 flex-shrink-0"
                            aria-hidden="true"
                          />
                          {!sidebarCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </Link>

                        {/* Tooltip for collapsed state */}
                        {sidebarCollapsed && (
                          <div
                            id={`tooltip-${globalIndex}`}
                            className="bg-background-primary pointer-events-none absolute top-1/2 left-16 z-50 -translate-y-1/2 transform rounded-lg px-3 py-2 text-sm whitespace-nowrap text-white opacity-0 shadow-lg group-hover:opacity-100"
                            role="tooltip"
                            aria-hidden="true"
                          >
                            {item.label}
                            <div className="bg-background-primary absolute top-1/2 left-0 h-2 w-2 -translate-x-1 -translate-y-1/2 rotate-45 transform"></div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Info Footer */}
        {!sidebarCollapsed && (
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
        )}
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

      {/* Unified Navbar */}
      <Navbar
        user={user}
        impersonation={impersonation}
        layoutType={layoutType}
        currentPage={currentPage}
        onSidebarToggle={() => {
          const isMobile = window.innerWidth < 1024;
          if (isMobile) {
            setMobileSidebarOpen(!mobileSidebarOpen);
          } else {
            setSidebarCollapsed(!sidebarCollapsed);
          }
        }}
        sidebarCollapsed={sidebarCollapsed}
        showSidebar={layoutConfig.showSidebar}
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
            <nav role="navigation" aria-label="Main navigation">
              {renderSidebar()}
            </nav>
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
