/**
 * Admin Dashboard Content Component
 * 
 * Contains the main admin dashboard interface with:
 * - System statistics overview
 * - User management section with impersonation
 * - Recent activity feed
 * - Administrative actions
 */

"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

// Modal component interfaces
interface ImpersonationModalProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  isLoading: boolean;
}

/**
 * Impersonation Confirmation Modal
 * Shows user details and allows admin to confirm impersonation
 */
function ImpersonationModal({ user, isOpen, onClose, onConfirm, isLoading }: ImpersonationModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-background-secondary rounded-lg max-w-md w-full p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Conferma Impersonificazione
          </h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-secondary-400"></span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-secondary-800">
                  Attenzione - Azione Amministrativa
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Stai per impersonificare l'utente. Tutte le azioni saranno registrate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-text-primary mb-2">Dettagli Utente:</h4>
          <div className="bg-background-secondary rounded-md p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Nome:</span>
              <span className="text-sm font-medium">{user.name || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Email:</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Ruolo:</span>
              <span className={`text-sm px-2 py-1 rounded ${
                user.role === "admin" 
                  ? "bg-red-100 text-red-800" 
                  : "bg-accent-100 text-blue-800"
              }`}>
                {user.role === "admin" ? "Admin" : "Utente"}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="reason" className="block text-sm font-medium text-text-secondary mb-2">
            Motivo (opzionale):
          </label>
          <textarea
            id="reason"
            rows={3}
            className="w-full px-3 py-2 border border-border-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Inserisci il motivo dell'impersonificazione (es. supporto utente, test funzionalita...)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary bg-background-tertiary border border-border-secondary rounded-md hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-text-primary bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? "Impersonificando..." : "Conferma Impersonificazione"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * AdminContent Component
 * Main content area for admin dashboard with statistics, user management, and impersonation tools
 */
export function AdminContent() {
  const [selectedSection, setSelectedSection] = useState<"overview" | "users" | "activities">("overview");
  const [impersonationModal, setImpersonationModal] = useState<{
    isOpen: boolean;
    user: { id: string; name: string | null; email: string; role: string } | null;
  }>({ isOpen: false, user: null });
  
  const router = useRouter();

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

  // Impersonation mutation
  const startImpersonation = api.impersonation.startImpersonation.useMutation({
    onSuccess: (data) => {
      console.log("Impersonation started successfully:", data);
      setImpersonationModal({ isOpen: false, user: null });
      // Redirect to user dashboard to see the impersonated view
      router.push("/dashboard/user");
      router.refresh(); // Force refresh to update session
    },
    onError: (error) => {
      console.error("Failed to start impersonation:", error);
      alert(`Errore nell'avviare l'impersonificazione: ${error.message}`);
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
   * Handle impersonation request
   */
  const handleImpersonateUser = (user: { id: string; name: string | null; email: string; role: string }) => {
    // Prevent impersonating admins
    if (user.role === "admin") {
      alert("Non e possibile impersonificare un altro amministratore.");
      return;
    }
    
    setImpersonationModal({ isOpen: true, user });
  };

  /**
   * Confirm impersonation
   */
  const handleConfirmImpersonation = (reason?: string) => {
    if (!impersonationModal.user) return;
    
    startImpersonation.mutate({
      targetUserId: impersonationModal.user.id,
      reason,
      ipAddress: undefined, // Could be populated from client if needed
      userAgent: navigator.userAgent,
    });
  };

  /**
   * Close impersonation modal
   */
  const handleCloseImpersonationModal = () => {
    if (startImpersonation.isPending) return; // Prevent closing during loading
    setImpersonationModal({ isOpen: false, user: null });
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
      {/* Welcome Section */}
      <div className="dashboard-welcome-section">
        <h1 className="dashboard-welcome-title">Benvenuto, Amministratore</h1>
        <p className="dashboard-welcome-subtitle">
          Gestisci il sistema e monitora le attivita degli utenti dalla tua dashboard
        </p>
      </div>

      {/* Section Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setSelectedSection("overview")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedSection === "overview"
              ? "bg-red-100 text-red-700"
              : "text-text-tertiary hover:text-text-secondary hover:bg-background-tertiary"
          }`}
        >
          Panoramica
        </button>
        <button
          onClick={() => setSelectedSection("users")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedSection === "users"
              ? "bg-red-100 text-red-700"
              : "text-text-tertiary hover:text-text-secondary hover:bg-background-tertiary"
          }`}
        >
          [USERS] Gestione Utenti
        </button>
        <button
          onClick={() => setSelectedSection("activities")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedSection === "activities"
              ? "bg-red-100 text-red-700"
              : "text-text-tertiary hover:text-text-secondary hover:bg-background-tertiary"
          }`}
        >
          [ACTIVITY] Attivita Recenti
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
                  <div className="h-8 bg-background-tertiary rounded mb-2"></div>
                  <div className="h-4 bg-background-tertiary rounded w-3/4 mx-auto"></div>
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
            <h3 className="dashboard-card-title">Attivita Recenti</h3>
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="dashboard-activity-item">
                    <div className="dashboard-activity-icon">
                      {activity.type === "login" && ""}
                      {activity.type === "profile_update" && ""}
                      {activity.type === "role_update" && "[UPDATE]"}
                      {activity.type === "dashboard_view" && ""}
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
                <div className="dashboard-empty-state-icon">[ACTIVITY]</div>
                <div className="dashboard-empty-state-title">Nessuna Attivita</div>
                <div className="dashboard-empty-state-description">
                  Le attivita recenti verranno visualizzate qui
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
                <div className="h-4 bg-background-tertiary rounded mb-4 w-full"></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-background-tertiary rounded mb-2"></div>
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
                      <th>Gestione Ruolo</th>
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
                            className="text-sm border border-border-secondary rounded px-2 py-1"
                          >
                            <option value="user">Utente</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleImpersonateUser(user)}
                              disabled={user.role === "admin" || startImpersonation.isPending}
                              className={`px-3 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                                user.role === "admin"
                                  ? "bg-background-tertiary text-text-tertiary cursor-not-allowed"
                                  : "bg-orange-100 text-orange-700 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                              }`}
                              title={user.role === "admin" ? "Non e possibile impersonificare un admin" : "Impersonifica questo utente"}
                            >
                              {startImpersonation.isPending ? "..." : " Impersonifica"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-state-icon">[USERS]</div>
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
          <h2 className="text-heading-2 mb-6">Registro Attivita</h2>
          
          <div className="dashboard-card">
            <h3 className="dashboard-card-title">Tutte le Attivita</h3>
            
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="border border-border-primary rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="dashboard-activity-icon">
                          {activity.type === "login" && ""}
                          {activity.type === "profile_update" && ""}
                          {activity.type === "role_update" && "[UPDATE]"}
                          {activity.type === "dashboard_view" && ""}
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">
                            {activity.userName}
                          </div>
                          <div className="text-sm text-text-secondary">
                            Tipo: {activity.type}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-text-tertiary">
                        {formatDate(activity.createdAt)}
                      </div>
                    </div>
                    {activity.metadata && (
                      <div className="mt-2 text-xs text-text-tertiary bg-background-secondary p-2 rounded">
                        <pre>{JSON.stringify(activity.metadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-state-icon">[ACTIVITY]</div>
                <div className="dashboard-empty-state-title">Nessuna Attivita</div>
                <div className="dashboard-empty-state-description">
                  Il registro delle attivita e vuoto
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Impersonation Modal */}
      <ImpersonationModal
        user={impersonationModal.user!}
        isOpen={impersonationModal.isOpen}
        onClose={handleCloseImpersonationModal}
        onConfirm={handleConfirmImpersonation}
        isLoading={startImpersonation.isPending}
      />
    </div>
  );
}