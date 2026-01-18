"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShadcnNavbar, getNavSections } from "~/components/navigation";
import { useMediaQuery } from "~/hooks/useMediaQuery";
import { cn } from "~/lib/utils";

import type { User, ImpersonationContext, NavItem } from "~/types";

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
  disablePadding?: boolean;
}

export function SharedLayout({
  children,
  user,
  impersonation,
  layoutType,
  currentPage = "",
  disablePadding = false,
}: SharedLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [isDesktop]);


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


  const layoutConfig: LayoutConfig = {
    showSidebar: layoutType === "dashboard",
    showFooter: layoutType === "home",
    headerStyle: layoutType,
    containerClass:
      layoutType === "dashboard"
        ? "dashboard-container"
        : "min-h-screen bg-background-primary",
  };


  const navSections = getNavSections(user, impersonation);


  const displayUser = impersonation?.isImpersonating
    ? {
      id: impersonation.targetUserId,
      name: impersonation.targetUserName,
      email: impersonation.targetUserEmail,
      role: "user" as const,
    }
    : user;


  const renderSidebar = () => {
    if (!layoutConfig.showSidebar) return null;

    return (
      <aside
        className={cn(
          "fixed left-0 top-16 z-30 flex h-[calc(100vh-4rem)] w-64 flex-col border-r border-border bg-card py-4 transition-transform duration-300 lg:translate-x-0",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="complementary"
        aria-label="Dashboard navigation"
        id="sidebar-navigation"
      >
        { }
        <nav
          className="flex-1 space-y-6 overflow-y-auto px-4 py-2"
          role="navigation"
        >
          { }
          {impersonation?.isImpersonating && (
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              role="heading"
              aria-level={3}
            >
              Sessione Impersonificata
            </p>
          )}

          { }
          {navSections.map((section, sectionIndex) => (
            <div key={section.title}>
              <h3
                className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                role="heading"
                aria-level={3}
              >
                {section.title}
              </h3>
              <ul className="space-y-1" role="list">
                {section.items.map((item: NavItem) => {
                  const isActive =
                    currentPage === item.href || pathname === item.href;
                  return (
                    <li key={item.href} role="listitem">
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon
                          className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")}
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

        { }
        <div
          className="border-t border-border bg-card p-4"
          role="contentinfo"
          aria-label="User information"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
                role="img"
                aria-label={`${displayUser?.name ?? "User"} avatar`}
              >
                <span
                  className="text-sm font-medium text-foreground"
                  aria-hidden="true"
                >
                  {(displayUser?.name ?? displayUser?.email ?? "U")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {displayUser?.name ?? "User"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {displayUser?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>
    );
  };

  return (
    <div className={cn("min-h-screen bg-background font-sans antialiased", layoutConfig.containerClass)}>

      { }
      <ShadcnNavbar
        user={user}
        impersonation={impersonation}
        layoutType={layoutType}
        currentPage={currentPage}
      />

      { }
      <div className="flex flex-1">
        { }
        {/* Mobile sidebar overlay */}
        {layoutConfig.showSidebar && mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {layoutConfig.showSidebar && renderSidebar()}

        { }
        <main
          id="main-content"
          className={cn(
            "flex-1 transition-all duration-300",
            layoutConfig.showSidebar ? "lg:ml-64" : "w-full",
            layoutConfig.showSidebar && !disablePadding && "p-8"
          )}
          role="main"
          aria-label="Main content"
          tabIndex={-1}
        >
          {layoutType === "dashboard" && !disablePadding ? (
            <div className="mx-auto w-full max-w-7xl space-y-8">
              {children}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
