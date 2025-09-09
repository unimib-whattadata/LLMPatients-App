/**
 * User Dashboard Content Component
 * 
 * Contains the main user dashboard interface with:
 * - Personal profile information
 * - Activity history and progress tracking
 * - User-specific actions and settings
 */

"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";

/**
 * UserContent Component
 * Main content area for user dashboard with profile and activity sections
 */
export function UserContent() {
  const [selectedSection, setSelectedSection] = useState<"overview" | "profile" | "activities">("overview");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });

  // Fetch user profile data
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = api.dashboard.getUserProfile.useQuery();
  
  // Fetch user activities
  const { data: activities, isLoading: activitiesLoading } = api.dashboard.getUserActivity.useQuery({ limit: 20 });

  // Profile update mutation
  const updateProfile = api.dashboard.updateProfile.useMutation({
    onSuccess: () => {
      setIsEditingProfile(false);
      void refetchProfile();
    },
  });

  // Record activity mutation
  const recordActivity = api.dashboard.recordActivity.useMutation();

  /**
   * Initialize profile form when profile data loads
   */
  React.useEffect(() => {
    if (profile && !isEditingProfile) {
      setProfileForm({
        name: profile.name || "",
        email: profile.email || "",
      });
    }
  }, [profile, isEditingProfile]);

  /**
   * Handle profile form submission
   */
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim() || !profileForm.email.trim()) return;

    try {
      await updateProfile.mutateAsync({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  /**
   * Record dashboard view activity
   */
  React.useEffect(() => {
    void recordActivity.mutateAsync({
      activityType: "dashboard_view",
      metadata: { section: selectedSection },
    });
  }, [selectedSection]);

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

  /**
   * Get activity type display name
   */
  const getActivityDisplayName = (type: string) => {
    switch (type) {
      case "login": return "Accesso effettuato";
      case "profile_update": return "Profilo aggiornato";
      case "dashboard_view": return "Dashboard visualizzata";
      case "simulation": return "Simulazione completata";
      default: return type;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Welcome Section */}
      <div className="dashboard-welcome-section">
        <h1 className="dashboard-welcome-title">Benvenuto nella tua Area Personale</h1>
        <p className="dashboard-welcome-subtitle">
          Ciao {profile?.name ?? "Utente"}! Gestisci il tuo profilo e monitora la tua attività
        </p>
      </div>

      {/* Section Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setSelectedSection("overview")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedSection === "overview"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          🏠 Panoramica
        </button>
        <button
          onClick={() => setSelectedSection("profile")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedSection === "profile"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          👤 Il Mio Profilo
        </button>
        <button
          onClick={() => setSelectedSection("activities")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedSection === "activities"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          📋 La Mia Attività
        </button>
      </div>

      {/* Overview Section */}
      {selectedSection === "overview" && (
        <div>
          <h2 className="text-heading-2 mb-6">Panoramica</h2>
          
          {/* Welcome Card */}
          <div className="dashboard-card mb-6">
            <h3 className="dashboard-card-title">Benvenuto/a nella tua Area Personale</h3>
            <p className="text-body text-gray-600 mb-4">
              Da qui puoi gestire il tuo profilo, visualizzare la tua attività recente e accedere 
              alle funzionalità della piattaforma ePatient.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">👤</div>
                <h4 className="font-semibold text-gray-900 mb-1">Profilo</h4>
                <p className="text-sm text-gray-600">Aggiorna le tue informazioni personali</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🎯</div>
                <h4 className="font-semibold text-gray-900 mb-1">Simulazioni</h4>
                <p className="text-sm text-gray-600">Accedi alle simulazioni mediche</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">📈</div>
                <h4 className="font-semibold text-gray-900 mb-1">Progresso</h4>
                <p className="text-sm text-gray-600">Monitora i tuoi risultati</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-number">{activities?.length ?? 0}</div>
              <div className="dashboard-stat-label">Attività Registrate</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-number">
                {profile?.role === "admin" ? "Admin" : "Utente"}
              </div>
              <div className="dashboard-stat-label">Ruolo Account</div>
            </div>
          </div>

          {/* Recent Activities Summary */}
          <div className="dashboard-card mt-6">
            <h3 className="dashboard-card-title">Attività Recenti</h3>
            {activities && activities.length > 0 ? (
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="dashboard-activity-item">
                    <div className="dashboard-activity-icon">
                      {activity.type === "login" && "🔐"}
                      {activity.type === "profile_update" && "👤"}
                      {activity.type === "dashboard_view" && "👁️"}
                      {activity.type === "simulation" && "🎯"}
                    </div>
                    <div className="dashboard-activity-content">
                      <div className="dashboard-activity-title">
                        {getActivityDisplayName(activity.type)}
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
                  Le tue attività verranno visualizzate qui
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Section */}
      {selectedSection === "profile" && (
        <div>
          <h2 className="text-heading-2 mb-6">Il Mio Profilo</h2>
          
          <div className="dashboard-card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="dashboard-card-title">Informazioni Personali</h3>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="btn btn-outline btn-sm"
                >
                  ✏️ Modifica
                </button>
              )}
            </div>

            {profileLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ) : isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="form-group">
                  <label className="label">Nome</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="Il tuo nome"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    className="input-field"
                    placeholder="La tua email"
                    required
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={updateProfile.isPending}
                    className="btn btn-primary btn-sm"
                  >
                    {updateProfile.isPending ? "Salvando..." : "💾 Salva"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    ❌ Annulla
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label">Nome</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    {profile?.name || "Nome non disponibile"}
                  </div>
                </div>
                
                <div>
                  <label className="label">Email</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    {profile?.email || "Email non disponibile"}
                  </div>
                </div>

                <div>
                  <label className="label">Ruolo</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <span className={`dashboard-badge ${
                      profile?.role === "admin" ? "dashboard-badge-admin" : "dashboard-badge-user"
                    }`}>
                      {profile?.role === "admin" ? "Amministratore" : "Utente"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activities Section */}
      {selectedSection === "activities" && (
        <div>
          <h2 className="text-heading-2 mb-6">La Mia Attività</h2>
          
          <div className="dashboard-card">
            <h3 className="dashboard-card-title">Cronologia Attività</h3>
            
            {activitiesLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="dashboard-activity-icon">
                          {activity.type === "login" && "🔐"}
                          {activity.type === "profile_update" && "👤"}
                          {activity.type === "dashboard_view" && "👁️"}
                          {activity.type === "simulation" && "🎯"}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {getActivityDisplayName(activity.type)}
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
                  Le tue attività verranno registrate automaticamente
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}