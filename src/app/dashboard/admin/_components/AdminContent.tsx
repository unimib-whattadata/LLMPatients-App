"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { api } from "~/trpc/react";
import { useRouter, useSearchParams } from "next/navigation";
import { MetricCardSkeleton, SectionSkeleton, ListItemSkeleton, TableSkeleton } from "~/components/ui/Skeleton";
import { UsersIcon } from "@heroicons/react/24/outline";

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
          <div className="bg-warning-50 rounded-md p-3 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-secondary-400"></span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-warning-600">
                  Attenzione - Azione Amministrativa
                </h3>
                <div className="mt-2 text-sm text-warning-600">
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
                  ? "bg-error-50 text-error-600" 
                  : "bg-accent-100 text-accent-600"
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
            className="w-full px-3 py-2 rounded-md bg-background-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-secondary-500"
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
            className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary bg-background-tertiary rounded-md hover:bg-background-secondary focus:outline-none focus:ring-2 focus:ring-border-hover focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-text-primary bg-secondary-600 rounded-md hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
  const searchParams = useSearchParams();

  // Handle URL parameter for section
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && (section === 'overview' || section === 'users' || section === 'activities')) {
      setSelectedSection(section);
    }
  }, [searchParams]);

  // Fetch system statistics with optimized caching
  const { data: stats, isLoading: statsLoading } = api.dashboard.getSystemStats.useQuery(undefined, {
    staleTime: 2 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  
  // Fetch all users for management with optimized caching
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = api.dashboard.getAllUsers.useQuery(undefined, {
    staleTime: 1 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

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

  // Memoize expensive calculations
  const recentActivities = useMemo(() => stats?.recentActivities ?? [], [stats?.recentActivities]);

  const navItems = useMemo(() => [
    { key: "overview" as const, label: "Panoramica" },
    { key: "users" as const, label: "[USERS] Gestione Utenti" },
    { key: "activities" as const, label: "[ACTIVITY] Registro Attivita" },
  ], []);

  // Memoize section change handler
  const handleSectionChange = useCallback((section: typeof selectedSection) => {
    setSelectedSection(section);
    // Update URL with section parameter
    const params = new URLSearchParams(searchParams.toString());
    if (section === 'overview') {
      params.delete('section');
    } else {
      params.set('section', section);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/dashboard/admin${newUrl}`, { scroll: false });
  }, [searchParams, router]);

  return (
    <div className="dashboard-panel-stack">
        {selectedSection === "overview" && (
          <div className="dashboard-panel-stack">
            <section className="dashboard-section" aria-labelledby="admin-overview-stats">
              <div className="dashboard-section__header">
                <div>
                  <h2 id="admin-overview-stats" className="dashboard-section__title">Stato della piattaforma</h2>
                  <p className="dashboard-section__description">
                    Un riepilogo sui volumi di utilizzo e sull'attivita recente per mantenere il sistema sotto controllo.
                  </p>
                </div>
              </div>

              {statsLoading ? (
                <div className="dashboard-metric-grid" aria-hidden="true">
                  {[1, 2, 3].map((i) => (
                    <MetricCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="dashboard-metric-grid">
                  <div className="dashboard-metric-card">
                    <span className="dashboard-metric-card__label">Utenti totali</span>
                    <span className="dashboard-metric-card__value">{stats?.totalUsers ?? 0}</span>
                  </div>
                  <div className="dashboard-metric-card">
                    <span className="dashboard-metric-card__label">Utenti attivi (30 giorni)</span>
                    <span className="dashboard-metric-card__value">{stats?.activeUsers ?? 0}</span>
                  </div>
                  <div className="dashboard-metric-card">
                    <span className="dashboard-metric-card__label">Amministratori</span>
                    <span className="dashboard-metric-card__value">{stats?.adminUsers ?? 0}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="dashboard-section" aria-labelledby="admin-recent-activity">
              <div className="dashboard-section__header">
                <div>
                  <h2 id="admin-recent-activity" className="dashboard-section__title">Attivita recenti</h2>
                  <p className="dashboard-section__description">
                    Ultime azioni effettuate dagli utenti. Utilizza queste informazioni per individuare rapidamente bisogni
                    di supporto o anomalie.
                  </p>
                </div>
              </div>

              {recentActivities.length > 0 ? (
                <div className="dashboard-list" role="list">
                  {recentActivities.slice(0, 6).map((activity) => (
                    <div key={activity.id} className="dashboard-list__item" role="listitem">
                      <div>
                        <div className="dashboard-activity-title">
                          {activity.userName} · {activity.type}
                        </div>
                        <div className="dashboard-activity-meta">{new Date(activity.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span className="pill dashboard-chip" aria-hidden="true">{activity.type}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty-state">
                  <div className="dashboard-empty-state__icon">[ACTIVITY]</div>
                  <p>Nessuna attivita recente disponibile.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {selectedSection === "users" && (
          <section className="dashboard-section" aria-labelledby="admin-user-management">
            <div className="dashboard-section__header">
              <div>
                <h2 id="admin-user-management" className="dashboard-section__title">Gestione utenti</h2>
                <p className="dashboard-section__description">
                  Aggiorna i ruoli oppure impersonifica un account per fornire assistenza mirata.
                </p>
              </div>
            </div>

            {usersLoading ? (
              <TableSkeleton rows={3} />
            ) : users && users.length > 0 ? (
              <div className="overflow-hidden rounded-xl">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Ruolo</th>
                      <th>Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="text-xs text-text-tertiary">{user.id}</td>
                        <td>{user.name || "Senza nome"}</td>
                        <td>{user.email}</td>
                        <td>
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as "admin" | "user")}
                            disabled={updateUserRole.isPending}
                            className="text-sm bg-background-secondary rounded px-2 py-1"
                          >
                            <option value="user">Utente</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleImpersonateUser(user)}
                              disabled={user.role === "admin" || startImpersonation.isPending}
                              className={`btn btn-sm ${
                                user.role === "admin"
                                  ? "btn-ghost cursor-not-allowed opacity-60"
                                  : "btn-secondary"
                              }`}
                              title={user.role === "admin" ? "Non e possibile impersonificare un admin" : "Impersonifica questo utente"}
                            >
                              {startImpersonation.isPending ? "..." : "Impersonifica"}
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
                <div className="dashboard-empty-state__icon">[USERS]</div>
                <p>Non sono ancora stati registrati utenti sulla piattaforma.</p>
              </div>
            )}
          </section>
        )}

        {selectedSection === "activities" && (
          <section className="dashboard-section" aria-labelledby="admin-activity-log">
            <div className="dashboard-section__header">
              <div>
                <h2 id="admin-activity-log" className="dashboard-section__title">Registro attivita</h2>
                <p className="dashboard-section__description">
                  Visione dettagliata di ogni evento registrato per audit e tracciamento.
                </p>
              </div>
            </div>

            {recentActivities.length > 0 ? (
              <div className="dashboard-panel-stack">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="dashboard-panel">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="dashboard-activity-title">
                          {activity.userName} · {activity.type}
                        </div>
                        <div className="dashboard-activity-meta">Tipo: {activity.type}</div>
                      </div>
                      <div className="dashboard-activity-meta">{new Date(activity.createdAt).toLocaleDateString()}</div>
                    </div>
                    {activity.metadata && (
                      <div className="dashboard-activity-meta bg-background-secondary p-3 rounded-md">
                        <pre>{JSON.stringify(activity.metadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-state__icon">[ACTIVITY]</div>
                <p>Non e stata ancora registrata alcuna attivita recente.</p>
              </div>
            )}
          </section>
        )}

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
