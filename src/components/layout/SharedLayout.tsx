"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "~/components/navigation/Navbar";
import { getNavItems } from "~/components/navigation/navigationUtils";
import { ChevronLeftIcon, MagnifyingGlassIcon, HomeIcon } from "@heroicons/react/24/outline";

import type { User, ImpersonationContext, AdminViewMode } from "~/components/navigation/Navbar";

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
  currentPage = "" 
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
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector('.sidebar-container');
      const toggleButton = document.querySelector('[aria-label*="sidebar"]');
      
      if (mobileSidebarOpen && 
          sidebar && 
          !sidebar.contains(event.target as Node) && 
          toggleButton && 
          !toggleButton.contains(event.target as Node)) {
        setMobileSidebarOpen(false);
      }
    };

    if (mobileSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileSidebarOpen]);

  // Configure layout based on type
  const layoutConfig: LayoutConfig = {
    showSidebar: layoutType === "dashboard",
    showFooter: layoutType === "home",
    headerStyle: layoutType,
    containerClass: layoutType === "dashboard" ? "dashboard-container" : "min-h-screen bg-background-primary",
  };

  // Get navigation items for sidebar
  const navItems = getNavItems(user, impersonation);

  // Determine display user (impersonated or actual)
  const displayUser = impersonation?.isImpersonating ? {
    id: impersonation.targetUserId,
    name: impersonation.targetUserName,
    email: impersonation.targetUserEmail,
    role: "user" as const,
  } : user;


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
        <div className={`${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-text-primary" id="sidebar-heading">
                {impersonation?.isImpersonating 
                  ? "Area Personale" 
                  : user?.role === "admin"
                    ? "Amministrazione" 
                    : "Area Personale"
                }
              </h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`${sidebarCollapsed ? 'p-2 bg-gray-800 border border-gray-600' : 'p-1.5'} rounded-md text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 hidden lg:block`}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
              aria-controls="sidebar-navigation"
            >
              <ChevronLeftIcon className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav 
          className={`flex-1 ${sidebarCollapsed ? 'px-2 py-4' : 'px-4 py-6'} space-y-2`}
          id="sidebar-navigation"
          aria-labelledby="sidebar-heading"
          role="navigation"
        >
          {/* Navigation Section Label */}
          {!sidebarCollapsed && (
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-4" role="heading" aria-level={3}>
              {impersonation?.isImpersonating 
                ? "Sessione Impersonificata" 
                : user?.role === "admin"
                  ? "Funzioni Amministratore" 
                  : "Le Tue Attivita"
              }
            </p>
          )}
          
          {/* Navigation Items */}
            <ul className="nav-list" role="list">
            {navItems.map((item, index) => {
              const isActive = currentPage === item.href || pathname === item.href;
              return (
                <li key={item.href} role="listitem">
                  <div className="relative group">
                    <Link
                      href={item.href}
                      className={`nav-item ${isActive ? "active" : ""}`}
                      title={sidebarCollapsed ? item.label : undefined}
                      aria-current={isActive ? "page" : undefined}
                      aria-describedby={sidebarCollapsed ? `tooltip-${index}` : undefined}
                    >
                      <item.icon className="w-5 h-5 mr-3 flex-shrink-0" aria-hidden="true" />
                      {!sidebarCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                    
                    {/* Tooltip for collapsed state */}
                    {sidebarCollapsed && (
                      <div 
                        id={`tooltip-${index}`}
                        className="absolute left-16 top-1/2 transform -translate-y-1/2 z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap"
                        role="tooltip"
                        aria-hidden="true"
                      >
                        {item.label}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          
          {/* Quick Actions Section */}
          {!sidebarCollapsed && (
            <div className="mt-8 pt-6">
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3" role="heading" aria-level={3}>
                Azioni Rapide
              </p>
              <div className="space-y-2" role="list">
                <Link
                  href="/explore-patients"
                  className="flex items-center px-3 py-2 text-sm text-text-tertiary hover:text-text-primary hover:bg-background-tertiary rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  role="listitem"
                >
                  <MagnifyingGlassIcon className="w-4 h-4 mr-3" aria-hidden="true" />
                  Esplora Pazienti
                </Link>
                <Link
                  href="/"
                  className="flex items-center px-3 py-2 text-sm text-text-tertiary hover:text-text-primary hover:bg-background-tertiary rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  role="listitem"
                >
                  <HomeIcon className="w-4 h-4 mr-3" aria-hidden="true" />
                  Torna alla Home
                </Link>
              </div>
            </div>
          )}
        </nav>
        
        {/* User Info Footer */}
        {!sidebarCollapsed && (
          <div className="p-4 bg-background-secondary" role="contentinfo" aria-label="User information">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div 
                  className="w-8 h-8 bg-background-tertiary rounded-full flex items-center justify-center"
                  role="img"
                  aria-label={`${displayUser?.name || 'User'} avatar`}
                >
                  <span className="text-text-primary text-sm font-medium" aria-hidden="true">
                    {(displayUser?.name || displayUser?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {displayUser?.name || 'User'}
                </p>
                <p className="text-xs text-text-tertiary truncate">{displayUser?.email}</p>
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
        onFocus={(e) => e.currentTarget.style.top = '6px'}
        onBlur={(e) => e.currentTarget.style.top = '-40px'}
      >
        Vai al contenuto principale
      </a>
      {layoutConfig.showSidebar && (
        <a 
          href="#sidebar-navigation" 
          className="skip-link"
          onFocus={(e) => e.currentTarget.style.top = '6px'}
          onBlur={(e) => e.currentTarget.style.top = '-40px'}
        >
          Vai alla navigazione laterale
        </a>
      )}
      <a 
        href="#site-navigation" 
        className="skip-link"
        onFocus={(e) => e.currentTarget.style.top = '6px'}
        onBlur={(e) => e.currentTarget.style.top = '-40px'}
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
      <div className={`main-container ${layoutConfig.showSidebar ? "dashboard-layout" : "home-layout"}`}>
        {/* Sidebar */}
        {layoutConfig.showSidebar && (
          <div className={`sidebar-container ${mobileSidebarOpen ? "mobile-open" : ""}`}>
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
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
