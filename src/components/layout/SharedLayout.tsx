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

import { useState } from "react";
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
    <div className="flex items-center space-x-2">
      <span className="text-xs text-white/70">Vista:</span>
      <button
        onClick={() => onModeChange(currentMode === "admin" ? "user" : "admin")}
        className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-md transition-colors duration-200 border border-white/20"
        title={`Passa alla vista ${currentMode === "admin" ? "utente" : "admin"}`}
      >
        {currentMode === "admin" ? "👤 Utente" : "🔧 Admin"}
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
    <div className="bg-orange-600 border-l-4 border-orange-800 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-white text-lg">👤</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">
              Stai impersonando: <strong>{impersonation.targetUserName || impersonation.targetUserEmail}</strong>
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
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>("admin");
  const router = useRouter();
  const pathname = usePathname();

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
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-md text-white hover:text-gray-200 hover:bg-white/10 md:hidden transition-colors duration-200"
                >
                  <span className="sr-only">Toggle sidebar</span>
                  ☰
                </button>
                <Link href="/" className="flex items-center ml-4 md:ml-0">
                  <div className="w-8 h-8 bg-white/20 rounded-lg backdrop-blur-sm"></div>
                  <span className="ml-2 text-lg font-bold text-white">ePatient</span>
                </Link>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-white/90 font-medium">
                  {displayUser.name || displayUser.email}
                </span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  displayUser.role === "admin" 
                    ? "bg-red-500/20 text-red-100 border border-red-400/30" 
                    : "bg-blue-500/20 text-blue-100 border border-blue-400/30"
                }`}>
                  {displayUser.role === "admin" ? "Admin" : "Utente"}
                  {impersonation?.isImpersonating && " (Impersonificato)"}
                  {user.role === "admin" && !impersonation?.isImpersonating && adminViewMode === "user" && " (Vista Utente)"}
                </span>
                {/* Admin Role Switch Button - only show for admins not being impersonated */}
                {user.role === "admin" && !impersonation?.isImpersonating && (
                  <AdminRoleSwitch 
                    currentMode={adminViewMode} 
                    onModeChange={setAdminViewMode} 
                  />
                )}
                <button
                  onClick={() => {
                    // Handle logout with proper callback URL
                    const callbackUrl = typeof window !== 'undefined' ? window.location.origin : '/';
                    window.location.href = `/api/auth/signout?callbackUrl=${encodeURIComponent(callbackUrl)}`;
                  }}
                  className="text-sm text-white/80 hover:text-white transition-colors duration-200 px-3 py-1 rounded-md hover:bg-white/10"
                >
                  Esci
                </button>
              </div>
            </div>
          </div>
        </header>
      );
    } else {
      // Home page header
      return (
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-800 rounded"></div>
                </div>
                <span className="ml-2 text-lg font-medium text-gray-900">ePatient</span>
              </div>
              <nav className="hidden md:flex space-x-8">
                <Link href="#" className="link-secondary hover:text-gray-700">Home</Link>
                <Link href="#" className="link-secondary hover:text-gray-700">Chi siamo</Link>
                <Link href="#" className="link-secondary hover:text-gray-700">Esplora platform</Link>
                <Link href="#" className="link-secondary hover:text-gray-700">News</Link>
              </nav>
              <div className="flex items-center space-x-4">
                {user && (
                  <>
                    <span className="text-sm text-gray-700 font-medium">
                      {displayUser.name || displayUser.email}
                    </span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      displayUser.role === "admin" 
                        ? "bg-red-100 text-red-800 border border-red-200" 
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}>
                      {displayUser.role === "admin" ? "Admin" : "Utente"}
                      {impersonation?.isImpersonating && " (Impersonificato)"}
                    </span>
                    <Link
                      href="/dashboard"
                      className="btn btn-primary btn-sm"
                    >
                      Area Personale
                    </Link>
                    <button
                      onClick={() => {
                        // Handle logout with proper callback URL
                        const callbackUrl = typeof window !== 'undefined' ? window.location.origin : '/';
                        window.location.href = `/api/auth/signout?callbackUrl=${encodeURIComponent(callbackUrl)}`;
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                    >
                      Esci
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
      <aside className={`dashboard-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <nav className="mt-8">
          <div className="px-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              {impersonation?.isImpersonating 
                ? "Area Personale (Impersonificata)" 
                : user.role === "admin" && adminViewMode === "admin"
                  ? "Amministrazione" 
                  : "Area Personale"
              }
            </p>
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = currentPage === item.href || pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                        isActive
                          ? (user.role === "admin" && adminViewMode === "admin" && !impersonation?.isImpersonating)
                            ? "admin-nav-item active"
                            : "user-nav-item active"
                          : (user.role === "admin" && adminViewMode === "admin" && !impersonation?.isImpersonating)
                          ? "admin-nav-item"
                          : "user-nav-item"
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {!sidebarCollapsed && item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </aside>
    );
  };

  // Render footer for home layout
  const renderFooter = () => {
    if (!layoutConfig.showFooter) return null;

    return (
      <footer className="bg-gray-900 text-white">
        {/* Newsletter Section */}
        <div className="bg-gray-700 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-body-sm text-white">
                Vuoi ricevere aggiornamenti sui progetti e ricerche gratuite?
                <br />
                Iscriviti alla nostra newsletter.
              </p>
            </div>
            <div className="flex">
              <input
                type="email"
                placeholder="Il tuo indirizzo email"
                className="input-field rounded-r-none"
              />
              <button className="btn btn-primary rounded-l-none">
                Iscriviti
              </button>
            </div>
          </div>
        </div>

        {/* Main Footer */}
        <div className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Logo and Info */}
              <div className="col-span-2">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-white rounded"></div>
                  <div className="ml-4">
                    <p className="text-body-sm text-white">
                      Progetto sviluppato in collaborazione con l&apos;Università degli Studi di
                      Milano-Bicocca
                    </p>
                    <p className="text-body-sm text-white">
                      Dipartimento di Informatica, Sistemistica e Comunicazione
                    </p>
                    <p className="text-body-sm text-white">
                      Dipartimento di Medicina e Chirurgia
                    </p>
                  </div>
                </div>
              </div>

              {/* Collegamenti rapidi */}
              <div>
                <h3 className="text-body font-semibold mb-4 text-white">Collegamenti rapidi</h3>
                <ul className="space-y-2 text-body-sm">
                  <li><Link href="#" className="link-secondary hover:text-gray-300">Chi siamo</Link></li>
                  <li><Link href="#" className="link-secondary hover:text-gray-300">News</Link></li>
                  <li><Link href="#" className="link-secondary hover:text-gray-300">Esplora platform</Link></li>
                  <li><Link href="#" className="link-secondary hover:text-gray-300">Contatti</Link></li>
                </ul>
              </div>

              {/* Contatti */}
              <div>
                <h3 className="text-body font-semibold mb-4 text-white">Contatti</h3>
                <div className="space-y-2 text-body-sm text-white">
                  <p>ePatient</p>
                  <p>epatient@email.com</p>
                  <div className="flex space-x-4 mt-4">
                    {/* Social Media Icons */}
                    <Link href="#" className="hover:text-gray-300">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                      </svg>
                    </Link>
                    <Link href="#" className="hover:text-gray-300">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                      </svg>
                    </Link>
                    <Link href="#" className="hover:text-gray-300">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </Link>
                    <Link href="#" className="hover:text-gray-300">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.888-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.357-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom section */}
            <div className="mt-8 pt-8 border-t border-gray-600">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-body-sm text-gray-400">
                  © 2024 ePatient. Tutti i diritti riservati.
                </p>
                <div className="flex space-x-6 text-body-sm text-gray-400 mt-4 md:mt-0">
                  <Link href="#" className="link-secondary hover:text-gray-300">Privacy Policy</Link>
                  <Link href="#" className="link-secondary hover:text-gray-300">Termini e condizioni</Link>
                  <Link href="#" className="link-secondary hover:text-gray-300">Informazioni cookie</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  };

  return (
    <div className={layoutConfig.containerClass}>
      {/* Impersonation Banner */}
      {impersonation?.isImpersonating && (
        <ImpersonationBanner
          impersonation={impersonation}
          onExitImpersonation={handleExitImpersonation}
          isExiting={exitImpersonationMutation.isPending}
        />
      )}

      {/* Header */}
      {renderHeader()}

      <div className={layoutConfig.showSidebar ? "flex" : ""}>
        {/* Sidebar */}
        {renderSidebar()}

        {/* Main Content */}
        <main className={layoutConfig.showSidebar ? "dashboard-main" : ""}>
          {children}
        </main>
      </div>

      {/* Footer */}
      {renderFooter()}
    </div>
  );
}