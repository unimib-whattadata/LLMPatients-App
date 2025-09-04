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
        { label: "Crea nuovo paziente", href: "/dashboard/admin/create-patient", icon: "🩺" },
        { label: "Valutazioni studenti", href: "/dashboard/admin/student-evaluations", icon: "📝" },
        { label: "Statistiche studenti", href: "/dashboard/admin/student-statistics", icon: "📊" },
      ];
    } else {
      return [
        { label: "Le mie simulazioni", href: "/dashboard/user/simulations", icon: "🎯" },
        { label: "Le mie valutazioni", href: "/dashboard/user/evaluations", icon: "📝" },
        { label: "I miei progressi", href: "/dashboard/user/progress", icon: "📈" },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="dashboard-container">
      {/* Header */}
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
                {user.name || user.email}
              </span>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                user.role === "admin" 
                  ? "bg-red-500/20 text-red-100 border border-red-400/30" 
                  : "bg-blue-500/20 text-blue-100 border border-blue-400/30"
              }`}>
                {user.role === "admin" ? "Admin" : "Utente"}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-white/80 hover:text-white transition-colors duration-200 px-3 py-1 rounded-md hover:bg-white/10"
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
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                          isActive
                            ? user.role === "admin"
                              ? "admin-nav-item active"
                              : "user-nav-item active"
                            : user.role === "admin"
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

        {/* Main Content */}
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </div>
  );
}