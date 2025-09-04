/**
 * Admin Dashboard Content Component
 * 
 * Contains the main admin dashboard interface with:
 * - System statistics overview
 * - User management section  
 * - Recent activity feed
 * - Administrative actions
 */

"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

/**
 * AdminContent Component
 * Main content area for admin dashboard with statistics and management tools
 */
export function AdminContent() {
  const [selectedSection, setSelectedSection] = useState<"overview" | "users" | "activities">("overview");

  // Fetch system statistics
  const { data: stats, isLoading: statsLoading } = api.dashboard.getSystemStats.useQuery();
  
  // Fetch all users for management
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = api.dashboard.getAllUsers.useQuery();

  // User role update mutation
  const updateUserRole = api.dashboard.updateUserRole.useMutation({
    onSuccess: () => {
      void refetchUsers();
    },
  });

  /**
   * Handle role change for user
   */
  const handleRoleChange = async (userId: string, newRole: "admin" | "user") => {
    try {
      await updateUserRole.mutateAsync({ userId, role: newRole });
    } catch (error) {
      console.error("Failed to update user role:", error);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (timestamp: Date | number) => {
    const date = typeof timestamp === "number" ? new Date(timestamp * 1000) : timestamp;
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-heading-1 mb-2">Dashboard Amministratore</h1>
        <p className="text-body text-gray-600">
          Panoramica del sistema e gestione utenti
        </p>
      </div>

      {/* Section Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setSelectedSection("overview")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedSection === "overview"
              ? "bg-red-100 text-red-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          📊 Panoramica
        </button>
        <button
          onClick={() => setSelectedSection("users")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedSection === "users"
              ? "bg-red-100 text-red-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          👥 Gestione Utenti
        </button>
        <button
          onClick={() => setSelectedSection("activities")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedSection === "activities"
              ? "bg-red-100 text-red-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          📋 Attività Recenti
        </button>
      </div>

      {/* Overview Section */}
      {selectedSection === "overview" && (
        <div>
          <h2 className="text-heading-2 mb-6">Statistiche del Sistema</h2>
          
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="dashboard-stat-card animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-number">{stats?.totalUsers ?? 0}</div>
                <div className="dashboard-stat-label">Utenti Totali</div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-number">{stats?.activeUsers ?? 0}</div>
                <div className="dashboard-stat-label">Utenti Attivi (30gg)</div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-number">{stats?.adminUsers ?? 0}</div>
                <div className="dashboard-stat-label">Amministratori</div>
              </div>
            </div>
          )}

          {/* Recent Activities */}
          <div className="dashboard-card mt-8">
            <h3 className="dashboard-card-title">Attività Recenti</h3>
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="dashboard-activity-item">
                    <div className="dashboard-activity-icon">
                      {activity.type === "login" && "🔐"}
                      {activity.type === "profile_update" && "👤"}
                      {activity.type === "role_update" && "⚡"}
                      {activity.type === "dashboard_view" && "👁️"}
                    </div>
                    <div className="dashboard-activity-content">
                      <div className="dashboard-activity-title">
                        {activity.userName} ha {activity.type === "login" && "effettuato l'accesso"}
                        {activity.type === "profile_update" && "aggiornato il profilo"}
                        {activity.type === "role_update" && "modificato un ruolo utente"}
                        {activity.type === "dashboard_view" && "visualizzato la dashboard"}
                      </div>
                      <div className="dashboard-activity-time">
                        {formatDate(activity.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-state-icon">📋</div>
                <div className="dashboard-empty-state-title">Nessuna Attività</div>
                <div className="dashboard-empty-state-description">
                  Le attività recenti verranno visualizzate qui
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Management Section */}
      {selectedSection === "users" && (
        <div>
          <h2 className="text-heading-2 mb-6">Gestione Utenti</h2>
          
          <div className="dashboard-card">
            <h3 className="dashboard-card-title">Tutti gli Utenti</h3>
            
            {usersLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4 w-full"></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded mb-2"></div>
                ))}
              </div>
            ) : users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Ruolo</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name || "Nome non disponibile"}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`dashboard-badge ${
                            user.role === "admin" ? "dashboard-badge-admin" : "dashboard-badge-user"
                          }`}>
                            {user.role === "admin" ? "Admin" : "Utente"}
                          </span>
                        </td>
                        <td>
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as "admin" | "user")}
                            disabled={updateUserRole.isPending}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="user">Utente</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-state-icon">👥</div>
                <div className="dashboard-empty-state-title">Nessun Utente</div>
                <div className="dashboard-empty-state-description">
                  Non ci sono utenti registrati nel sistema
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activities Section */}
      {selectedSection === "activities" && (
        <div>
          <h2 className="text-heading-2 mb-6">Registro Attività</h2>
          
          <div className="dashboard-card">
            <h3 className="dashboard-card-title">Tutte le Attività</h3>
            
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="dashboard-activity-icon">
                          {activity.type === "login" && "🔐"}
                          {activity.type === "profile_update" && "👤"}
                          {activity.type === "role_update" && "⚡"}
                          {activity.type === "dashboard_view" && "👁️"}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {activity.userName}
                          </div>
                          <div className="text-sm text-gray-600">
                            Tipo: {activity.type}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(activity.createdAt)}
                      </div>
                    </div>
                    {activity.metadata && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <pre>{JSON.stringify(activity.metadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-state-icon">📋</div>
                <div className="dashboard-empty-state-title">Nessuna Attività</div>
                <div className="dashboard-empty-state-description">
                  Il registro delle attività è vuoto
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}