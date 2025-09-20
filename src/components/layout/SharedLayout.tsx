/**
 * Shared Layout Component
 * 
 * Provides a unified layout structure for both dashboard and home page
 * Features:
 * - Responsive header with navigation
 * - Impersonation status banner
 * - Role-based navigation menus
 * - Sidebar for dashboard pages
 * - Footer for home page
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api } from "~/trpc/react";

// Admin view mode type
type AdminViewMode = "admin" | "user";

// Layout configuration types
interface LayoutConfig {
  showSidebar: boolean;
  showFooter: boolean;
  headerStyle: "dashboard" | "home";
  containerClass: string;
}

// User interface for type safety
interface User {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "user";
  image?: string | null;
}

// Impersonation context interface
interface ImpersonationContext {
  isImpersonating: boolean;
  originalAdminId: string;
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string | null;
  startedAt: Date;
  sessionId: string;
}

// Main props interface
interface SharedLayoutProps {
  children: React.ReactNode;
  user: User;
  impersonation?: ImpersonationContext;
  layoutType: "dashboard" | "home";
  currentPage?: string;
}

// Navigation item interface
interface NavItem {
  label: string;
  href: string;
  icon: string;
}

/**
 * Admin Role Switch Button Component
 * Allows admins to switch between admin and user view modes
 */
interface AdminRoleSwitchProps {
  currentMode: AdminViewMode;
  onModeChange: (mode: AdminViewMode) => void;
}

function AdminRoleSwitch({ currentMode, onModeChange }: AdminRoleSwitchProps) {
  return (
    <div className="flex items-center space-x-1 sm:space-x-2">
      <span className="text-xs text-white/70 hidden sm:inline">Vista:</span>
      <button
        onClick={() => onModeChange(currentMode === "admin" ? "user" : "admin")}
        className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-md transition-colors duration-200 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
        title={`Passa alla vista ${currentMode === "admin" ? "utente" : "admin"}`}
      >
        <span className="hidden sm:inline">
          {currentMode === "admin" ? "👤 Utente" : "🔧 Admin"}
        </span>
        <span className="sm:hidden">
          {currentMode === "admin" ? "👤" : "🔧"}
        </span>
      </button>
    </div>
  );
}

/**
 * Impersonation Banner Component
 * Shows when user is being impersonated with exit functionality
 */
interface ImpersonationBannerProps {
  impersonation: ImpersonationContext;
  onExitImpersonation: () => void;
  isExiting: boolean;
}

function ImpersonationBanner({ 
  impersonation, 
  onExitImpersonation, 
  isExiting 
}: ImpersonationBannerProps) {
  const duration = Math.floor((Date.now() - impersonation.startedAt.getTime()) / 1000 / 60);
  
  return (
    <div className="bg-orange-600 border-l-4 border-orange-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-white text-lg">👤</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">
              Stai impersonando: <strong>{impersonation.targetUserName ?? impersonation.targetUserEmail}</strong>
            </p>
            <p className="text-xs text-orange-100">
              Sessione attiva da {duration} minuti • ID Sessione: {impersonation.sessionId.slice(0, 8)}...
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={onExitImpersonation}
            disabled={isExiting}
            className="bg-white text-orange-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isExiting ? "Uscendo..." : "Esci dall'impersonificazione"}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>("admin");
  const router = useRouter();
  const pathname = usePathname();

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        setSidebarCollapsed(true);
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

  // Configure layout based on type
  const layoutConfig: LayoutConfig = {
    showSidebar: layoutType === "dashboard",
    showFooter: layoutType === "home",
    headerStyle: layoutType,
    containerClass: layoutType === "dashboard" ? "dashboard-container" : "min-h-screen bg-gray-50",
  };

  // Exit impersonation mutation
  const exitImpersonationMutation = api.impersonation.endImpersonation.useMutation({
    onSuccess: () => {
      console.log("Impersonation ended successfully");
      // Redirect to admin dashboard
      router.push("/dashboard/admin");
      router.refresh(); // Force refresh to update session
    },
    onError: (error) => {
      console.error("Failed to exit impersonation:", error);
      // Still try to redirect in case of API error
      router.push("/dashboard/admin");
      router.refresh();
    },
  });

  // Handle exit impersonation
  const handleExitImpersonation = () => {
    console.log("Exiting impersonation session:", impersonation?.sessionId);
    exitImpersonationMutation.mutate({
      ipAddress: undefined, // Could be populated from client if needed
      userAgent: navigator.userAgent,
    });
  };

  // Get navigation items based on user role and impersonation status
  const getNavItems = (): NavItem[] => {
    // If impersonating, always show user navigation
    if (impersonation?.isImpersonating) {
      return [
        { label: "Le mie simulazioni", href: "/dashboard/user/simulations", icon: "🎯" },
        { label: "Le mie valutazioni", href: "/dashboard/user/evaluations", icon: "📝" },
        { label: "I miei progressi", href: "/dashboard/user/progress", icon: "📈" },
      ];
    }

    // For admins, show navigation based on current view mode
    if (user.role === "admin") {
      if (adminViewMode === "user") {
        // Admin viewing as user - show user navigation
        return [
          { label: "Le mie simulazioni", href: "/dashboard/user/simulations", icon: "🎯" },
          { label: "Le mie valutazioni", href: "/dashboard/user/evaluations", icon: "📝" },
          { label: "I miei progressi", href: "/dashboard/user/progress", icon: "📈" },
        ];
      } else {
        // Admin viewing as admin - show admin navigation
        return [
          { label: "Crea nuovo paziente", href: "/dashboard/admin/create-patient", icon: "🩺" },
          { label: "Valutazioni studenti", href: "/dashboard/admin/student-evaluations", icon: "📝" },
          { label: "Statistiche studenti", href: "/dashboard/admin/student-statistics", icon: "📊" },
        ];
      }
    } else {
      // Regular user - show user navigation
      return [
        { label: "Le mie simulazioni", href: "/dashboard/user/simulations", icon: "🎯" },
        { label: "Le mie valutazioni", href: "/dashboard/user/evaluations", icon: "📝" },
        { label: "I miei progressi", href: "/dashboard/user/progress", icon: "📈" },
      ];
    }
  };

  const navItems = getNavItems();

  // Determine display user (impersonated or actual)
  const displayUser = impersonation?.isImpersonating ? {
    id: impersonation.targetUserId,
    name: impersonation.targetUserName,
    email: impersonation.targetUserEmail,
    role: "user" as const,
  } : user;

  // Render header based on layout type
  const renderHeader = () => {
    if (layoutConfig.headerStyle === "dashboard") {
      return (
        <header className="dashboard-header">
          <div className="layout-container px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left section: Menu toggle + Logo */}
              <div className="flex items-center space-x-4">
                {/* Mobile menu toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-md text-white hover:text-gray-200 hover:bg-white/10 lg:hidden transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                  aria-label="Toggle mobile menu"
                >
                  <span className="sr-only">Open main menu</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
                
                {/* Desktop sidebar toggle */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-md text-white hover:text-gray-200 hover:bg-white/10 hidden lg:block transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                  aria-label="Toggle sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8M4 18h16" />
                  </svg>
                </button>
                
                {/* Logo */}
                <Link href="/" className="flex items-center focus:outline-none focus:ring-2 focus:ring-white/20 rounded-md">
                  <img 
                    src="/images/logo.png" 
                    alt="LLMPatient Logo" 
                    className="w-8 h-8 rounded-lg"
                  />
                  <span className="ml-2 text-lg font-bold text-white hidden sm:inline">LLMPatient</span>
                </Link>
              </div>
              
              {/* Right section: User info + Controls */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* User name - hidden on mobile */}
                <span className="text-sm text-white/90 font-medium hidden md:inline truncate max-w-32">
                  {displayUser.name ?? displayUser.email}
                </span>
                
                {/* Role badge */}
                <span className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-200 ${
                  displayUser.role === "admin" 
                    ? "bg-red-500/20 text-red-100 border border-red-400/30" 
                    : "bg-blue-500/20 text-blue-100 border border-blue-400/30"
                }`}>
                  <span className="hidden sm:inline">
                    {displayUser.role === "admin" ? "Admin" : "Utente"}
                    {impersonation?.isImpersonating && " (Impersonificato)"}
                    {user.role === "admin" && !impersonation?.isImpersonating && adminViewMode === "user" && " (Vista Utente)"}
                  </span>
                  <span className="sm:hidden">
                    {displayUser.role === "admin" ? "A" : "U"}
                  </span>
                </span>
                
                {/* Admin Role Switch Button - only show for admins not being impersonated */}
                {user.role === "admin" && !impersonation?.isImpersonating && (
                  <AdminRoleSwitch 
                    currentMode={adminViewMode} 
                    onModeChange={setAdminViewMode} 
                  />
                )}
                
                {/* Logout button */}
                <button
                  onClick={() => {
                    const callbackUrl = typeof window !== 'undefined' ? window.location.origin : '/';
                    window.location.href = `/api/auth/signout?callbackUrl=${encodeURIComponent(callbackUrl)}`;
                  }}
                  className="text-sm text-white/80 hover:text-white transition-colors duration-200 px-2 sm:px-3 py-1 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                  title="Logout"
                >
                  <span className="hidden sm:inline">Esci</span>
                  <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
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
              <div className="fixed top-16 left-0 right-0 z-50 bg-gray-800 border-t border-gray-700 max-h-96 overflow-y-auto">
                <nav className="px-4 py-6" role="navigation" aria-label="Mobile navigation">
                  <div className="space-y-1" role="list">
                    {navItems.map((item, index) => {
                      const isActive = currentPage === item.href || pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center px-3 py-3 text-base font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 ${
                            isActive
                              ? (user.role === "admin" && adminViewMode === "admin" && !impersonation?.isImpersonating)
                                ? "bg-red-600 text-white"
                                : "bg-blue-600 text-white"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white"
                          }`}
                          onClick={() => setMobileMenuOpen(false)}
                          role="listitem"
                          aria-current={isActive ? "page" : undefined}
                        >
                          <span className="mr-3 text-lg" aria-hidden="true">{item.icon}</span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                  
                  {/* Mobile user info */}
                  <div className="mt-6 pt-6 border-t border-gray-700" role="contentinfo" aria-label="User information">
                    <div className="flex items-center px-3">
                      <div className="flex-shrink-0">
                        <div 
                          className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center"
                          role="img"
                          aria-label={`${displayUser.name || 'User'} avatar`}
                        >
                          <span className="text-white text-sm font-medium" aria-hidden="true">
                            {(displayUser.name ?? displayUser.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-base font-medium text-white">
                          {displayUser.name ?? 'User'}
                        </div>
                        <div className="text-sm text-gray-400">{displayUser.email}</div>
                      </div>
                    </div>
                  </div>
                </nav>
              </div>
            </div>
          )}
        </header>
      );
    } else {
      // Home page header with improved responsive navigation
      return (
        <header className="bg-white border-b border-gray-200">
          <div className="layout-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center">
                <Link href="/" className="flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md">
                  <img 
                    src="/images/logo.png" 
                    alt="LLMPatient Logo" 
                    className="w-8 h-8"
                  />
                  <span className="ml-2 text-lg font-medium text-gray-900">LLMPatient</span>
                </Link>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-8">
                <Link href="/" className="link-secondary hover:text-gray-700 px-3 py-2 rounded-md transition-colors duration-200">Home</Link>
                <Link href="/esplora-pazienti" className="link-secondary hover:text-gray-700 px-3 py-2 rounded-md transition-colors duration-200">Esplora pazienti</Link>
                <Link href="#" className="link-secondary hover:text-gray-700 px-3 py-2 rounded-md transition-colors duration-200">News</Link>
              </nav>
              
              {/* User controls */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {user && (
                  <>
                    <span className="text-sm text-gray-700 font-medium hidden sm:inline truncate max-w-32">
                      {displayUser.name || displayUser.email}
                    </span>
                    <span className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-full ${
                      displayUser.role === "admin" 
                        ? "bg-red-100 text-red-800 border border-red-200" 
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}>
                      <span className="hidden sm:inline">
                        {displayUser.role === "admin" ? "Admin" : "Utente"}
                        {impersonation?.isImpersonating && " (Impersonificato)"}
                      </span>
                      <span className="sm:hidden">
                        {displayUser.role === "admin" ? "A" : "U"}
                      </span>
                    </span>
                    <Link
                      href="/dashboard"
                      className="btn btn-primary btn-sm hidden sm:inline-flex"
                    >
                      Area Personale
                    </Link>
                    <Link
                      href="/dashboard"
                      className="btn btn-primary btn-sm sm:hidden p-2"
                      title="Area Personale"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => {
                        const callbackUrl = typeof window !== 'undefined' ? window.location.origin : '/';
                        window.location.href = `/api/auth/signout?callbackUrl=${encodeURIComponent(callbackUrl)}`;
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      title="Logout"
                    >
                      <span className="hidden sm:inline">Esci</span>
                      <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
      );
    }
  };

  // Render sidebar for dashboard layout
  const renderSidebar = () => {
    if (!layoutConfig.showSidebar) return null;

    return (
      <aside 
        className={`dashboard-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`}
        role="complementary"
        aria-label="Dashboard navigation"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-gray-800" id="sidebar-heading">
                {impersonation?.isImpersonating 
                  ? "Area Personale" 
                  : user.role === "admin" && adminViewMode === "admin"
                    ? "Amministrazione" 
                    : "Area Personale"
                }
              </h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 hidden lg:block"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
              aria-controls="sidebar-navigation"
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav 
          className="flex-1 px-4 py-6 space-y-2" 
          id="sidebar-navigation"
          aria-labelledby="sidebar-heading"
          role="navigation"
        >
          {/* Navigation Section Label */}
          {!sidebarCollapsed && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4" role="heading" aria-level={3}>
              {impersonation?.isImpersonating 
                ? "Sessione Impersonificata" 
                : user.role === "admin" && adminViewMode === "admin"
                  ? "Funzioni Amministratore" 
                  : "Le Tue Attività"
              }
            </p>
          )}
          
          {/* Navigation Items */}
          <ul className="space-y-1" role="list">
            {navItems.map((item, index) => {
              const isActive = currentPage === item.href || pathname === item.href;
              return (
                <li key={item.href} role="listitem">
                  <Link
                    href={item.href}
                    className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      isActive
                        ? (user.role === "admin" && adminViewMode === "admin" && !impersonation?.isImpersonating)
                          ? "admin-nav-item active"
                          : "user-nav-item active"
                        : (user.role === "admin" && adminViewMode === "admin" && !impersonation?.isImpersonating)
                        ? "admin-nav-item"
                        : "user-nav-item"
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    aria-describedby={sidebarCollapsed ? `tooltip-${index}` : undefined}
                  >
                    <span className="mr-3 text-lg flex-shrink-0" aria-hidden="true">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {/* Active indicator */}
                    {isActive && (
                      <span 
                        className="ml-auto w-2 h-2 rounded-full bg-current opacity-75 flex-shrink-0" 
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                  
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div 
                      id={`tooltip-${index}`}
                      className="absolute left-16 top-0 z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap"
                      role="tooltip"
                      aria-hidden="true"
                    >
                      {item.label}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          
          {/* Quick Actions Section */}
          {!sidebarCollapsed && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" role="heading" aria-level={3}>
                Azioni Rapide
              </p>
              <div className="space-y-2" role="list">
                <Link
                  href="/esplora-pazienti"
                  className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  role="listitem"
                >
                  <span className="mr-3" aria-hidden="true">🔍</span>
                  Esplora Pazienti
                </Link>
                <Link
                  href="/"
                  className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  role="listitem"
                >
                  <span className="mr-3" aria-hidden="true">🏠</span>
                  Torna alla Home
                </Link>
              </div>
            </div>
          )}
        </nav>
        
        {/* User Info Footer */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-200 bg-gray-50" role="contentinfo" aria-label="User information">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div 
                  className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center"
                  role="img"
                  aria-label={`${displayUser.name || 'User'} avatar`}
                >
                  <span className="text-gray-700 text-sm font-medium" aria-hidden="true">
                    {(displayUser.name || displayUser.email).charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {displayUser.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{displayUser.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  };

  // Render footer for home layout
  const renderFooter = () => {
    if (!layoutConfig.showFooter) return null;

    return (
      <footer className="home-footer">
        <div className="home-footer-newsletter">
          <div className="section-container">
            <div className="home-footer-newsletter-inner">
              <div className="home-footer-newsletter-copy">
                <h2>Vuoi ricevere aggiornamenti sul progetto e risorse gratuite?</h2>
                <p>Iscriviti alla nostra newsletter.</p>
              </div>
              <form className="home-footer-newsletter-form">
                <label htmlFor="newsletter-email-footer" className="sr-only">
                  Inserisci la tua email
                </label>
                <input
                  id="newsletter-email-footer"
                  type="email"
                  name="email"
                  placeholder="La tua e-mail"
                  autoComplete="email"
                />
                <button type="submit">Iscriviti</button>
              </form>
            </div>
          </div>
        </div>

        <div className="home-footer-main">
          <div className="section-container">
            <div className="home-footer-grid">
              <div className="home-footer-brand">
                <div className="home-brand-mark" aria-hidden="true" />
                <div>
                  <p className="home-footer-brand-name">LLMPatient</p>
                  <p className="home-footer-brand-caption">
                    Un progetto dedicato alla formazione e alla valutazione delle competenze cliniche.
                  </p>
                </div>
              </div>

              <div className="home-footer-column">
                <h3>Collegamenti rapidi</h3>
                <ul>
                  <li>
                    <Link href="/esplora-pazienti">Esplora pazienti</Link>
                  </li>
                  <li>
                    <Link href="#">News</Link>
                  </li>
                  <li>
                    <Link href="#">FAQ</Link>
                  </li>
                </ul>
              </div>

              <div className="home-footer-column">
                <h3>Contatti</h3>
                <ul>
                  <li>LLMPatient</li>
                  <li>email@example.com</li>
                  <li>+39 02 0000000</li>
                </ul>
                <div className="home-footer-social">
                  <Link href="#" aria-label="Visita la nostra pagina Facebook">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88V15.47H7.9v-3.1h2.54V9.79c0-2.5 1.5-3.88 3.8-3.88 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.62.77-1.62 1.56v1.88h2.76l-.44 3.1h-2.32v6.41C18.34 21.12 22 16.99 22 12z" />
                    </svg>
                  </Link>
                  <Link href="#" aria-label="Visita il nostro profilo Instagram">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V7c0-1.66 1.34-3 3-3h10zm-5 3.5A5.5 5.5 0 0011.5 16.5 5.5 5.5 0 1012 7.5zm0 2A3.5 3.5 0 1112 15a3.5 3.5 0 010-7zm5.75-.88a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </Link>
                  <Link href="#" aria-label="Visita la nostra pagina LinkedIn">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20.45 20.45h-3.55v-5.58c0-1.33-.03-3.03-1.85-3.03-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.48-.91 1.64-1.86 3.37-1.86 3.6 0 4.26 2.37 4.26 5.45v6.3zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="home-footer-bottom">
              <p>© {new Date().getFullYear()} LLMPatient. Tutti i diritti riservati.</p>
              <div className="home-footer-links">
                <Link href="#">Privacy Policy</Link>
                <Link href="#">Termini e condizioni</Link>
                <Link href="#">Impostazioni cookie</Link>
              </div>
              <div className="home-footer-languages" role="group" aria-label="Seleziona la lingua">
                <button type="button" className="active">
                  IT
                </button>
                <button type="button">EN</button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  };

  return (
    <div className={`layout-container ${layoutConfig.containerClass}`}>
      {/* Skip Navigation Link */}
      <a 
        href="#main-content" 
        className="skip-link"
        onFocus={(e) => e.currentTarget.style.top = '6px'}
        onBlur={(e) => e.currentTarget.style.top = '-40px'}
      >
        Skip to main content
      </a>
      
      {/* Impersonation Banner */}
      {impersonation?.isImpersonating && (
        <div role="banner" aria-label="Impersonation notification">
          <ImpersonationBanner
            impersonation={impersonation}
            onExitImpersonation={handleExitImpersonation}
            isExiting={exitImpersonationMutation.isPending}
          />
        </div>
      )}

      {/* Header */}
      <div className="header-container">
        <div role="banner">
          {renderHeader()}
        </div>
      </div>

      {/* Main Layout */}
      <div className={`main-container ${layoutConfig.showSidebar ? "dashboard-layout" : "home-layout"}`}>
        {/* Sidebar */}
        {layoutConfig.showSidebar && (
          <div className="sidebar-container">
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

      {/* Footer */}
      {layoutConfig.showFooter && (
        <div className="footer-container">
          <footer role="contentinfo" aria-label="Site footer">
            {renderFooter()}
          </footer>
        </div>
      )}
    </div>
  );
}
