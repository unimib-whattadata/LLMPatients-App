/**
 * Shared Dashboard Layout Component
 * 
 * Provides consistent layout structure for both admin and user dashboards
 * Features responsive sidebar navigation and main content area
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Dashboard layout props interface
interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: "admin" | "user";
    image?: string | null;
  };
  currentPage: string;
}

// Navigation item interface
interface NavItem {
  label: string;
  href: string;
  icon: string;
}

/**
 * Dashboard Layout Component
 * Shared layout wrapper for admin and user dashboards
 */
export function DashboardLayout({ children, user, currentPage }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

  // Define navigation items based on user role
  const getNavItems = (): NavItem[] => {
    if (user.role === "admin") {
      return [
        { label: "Dashboard", href: "/dashboard/admin", icon: "🏠" },
        { label: "Gestione Utenti", href: "/dashboard/admin/users", icon: "👥" },
        { label: "Statistiche", href: "/dashboard/admin/stats", icon: "📊" },
        { label: "Impostazioni", href: "/dashboard/admin/settings", icon: "⚙️" },
      ];
    } else {
      return [
        { label: "Dashboard", href: "/dashboard/user", icon: "🏠" },
        { label: "Il Mio Profilo", href: "/dashboard/user/profile", icon: "👤" },
        { label: "Progresso", href: "/dashboard/user/progress", icon: "📈" },
        { label: "Simulazioni", href: "/dashboard/user/simulations", icon: "🎯" },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 md:hidden"
              >
                <span className="sr-only">Toggle sidebar</span>
                ☰
              </button>
              <Link href="/" className="flex items-center ml-4 md:ml-0">
                <div className="w-8 h-8 bg-gray-800 rounded"></div>
                <span className="ml-2 text-lg font-medium text-gray-900">ePatient</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.name || user.email}
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                user.role === "admin" 
                  ? "bg-red-100 text-red-800" 
                  : "bg-blue-100 text-blue-800"
              }`}>
                {user.role === "admin" ? "Admin" : "Utente"}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Esci
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          <nav className="mt-8">
            <div className="px-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                {user.role === "admin" ? "Amministrazione" : "Area Personale"}
              </p>
              <ul className="space-y-2">
                {navItems.map((item) => {
                  const isActive = currentPage === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? user.role === "admin"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                            : "text-gray-700 hover:bg-gray-100"
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

        {/* Main Content */}
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </div>
  );
}