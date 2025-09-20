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

  const lastActivity = activities?.[0];
  const simulationsCompleted = activities?.filter((activity) => activity.type === "simulation").length ?? 0;

  const navItems: Array<{ key: typeof selectedSection; label: string }> = [
    { key: "overview", label: "[HOME] Panoramica" },
    { key: "profile", label: "Il Mio Profilo" },
    { key: "activities", label: "[ACTIVITY] La Mia Attivita" },
  ];

  return (
    <div className="dashboard-page">
      <section className="dashboard-page__hero">
        <div className="dashboard-page__hero-content">
          <span className="dashboard-page__hero-eyebrow">Area personale</span>
          <h1 className="dashboard-page__hero-title">
            Ciao {profile?.name ?? "Utente"}, bentornato/a su ePatient
          </h1>
          <p className="dashboard-page__hero-subtitle">
            Gestisci il tuo profilo, tieni traccia delle simulazioni completate e monitora le
            attivita registrate durante il tuo percorso formativo.
          </p>

          <div className="dashboard-page__hero-meta">
            <span className="dashboard-chip" aria-label="Tipo di account">
              <span aria-hidden="true">👤</span>
              <span>{profile?.role === "admin" ? "Account amministratore" : "Account utente"}</span>
            </span>
            <span className="dashboard-chip" aria-label="Ultima attivita registrata">
              <span aria-hidden="true">🕒</span>
              <span>
                {lastActivity
                  ? `Ultima attivita ${formatDate(lastActivity.createdAt)}`
                  : "In attesa della prima attivita"}
              </span>
            </span>
          </div>
        </div>
      </section>

      <div className="dashboard-stack">
        <div className="dashboard-pill-nav" role="tablist" aria-label="Sezioni dashboard">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selectedSection === item.key}
              className={`dashboard-pill-nav__button ${selectedSection === item.key ? "is-active" : ""}`}
              onClick={() => setSelectedSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {selectedSection === "overview" && (
          <div className="dashboard-panel-stack">
            <section className="dashboard-section">
              <div className="dashboard-section__header">
                <div>
                  <h2 className="dashboard-section__title">Panoramica</h2>
                  <p className="dashboard-section__description">
                    Qui trovi un riepilogo rapido del tuo profilo, delle attivita e delle simulazioni
                    disponibili per continuare il tuo percorso formativo.
                  </p>
                </div>
              </div>

              <div className="dashboard-action-grid">
                <div className="dashboard-action-card">
                  <span className="dashboard-action-card__badge">Profilo</span>
                  <p className="dashboard-action-card__title">Mantieni aggiornate le tue informazioni</p>
                  <p className="dashboard-action-card__description">
                    Modifica nome, email e preferenze per ricevere suggerimenti piu pertinenti.
                  </p>
                </div>
                <div className="dashboard-action-card">
                  <span className="dashboard-action-card__badge">Simulazioni</span>
                  <p className="dashboard-action-card__title">Accedi alle sessioni attive</p>
                  <p className="dashboard-action-card__description">
                    Prosegui con le simulazioni in corso o esplora nuovi scenari clinici.
                  </p>
                </div>
                <div className="dashboard-action-card">
                  <span className="dashboard-action-card__badge">Progressi</span>
                  <p className="dashboard-action-card__title">Analizza la tua evoluzione</p>
                  <p className="dashboard-action-card__description">
                    Consulta le valutazioni ricevute e monitora la crescita delle tue competenze.
                  </p>
                </div>
              </div>

              <div className="dashboard-metric-grid" aria-label="Indicatori rapidi">
                <div className="dashboard-metric-card">
                  <span className="dashboard-metric-card__label">Attivita registrate</span>
                  <span className="dashboard-metric-card__value">{activities?.length ?? 0}</span>
                </div>
                <div className="dashboard-metric-card">
                  <span className="dashboard-metric-card__label">Simulazioni completate</span>
                  <span className="dashboard-metric-card__value">{simulationsCompleted}</span>
                </div>
                <div className="dashboard-metric-card">
                  <span className="dashboard-metric-card__label">Ruolo account</span>
                  <span className="dashboard-metric-card__value">
                    {profile?.role === "admin" ? "Admin" : "Utente"}
                  </span>
                </div>
              </div>
            </section>

            <section className="dashboard-section" aria-labelledby="dashboard-recent-activity">
              <div className="dashboard-section__header">
                <div>
                  <h2 id="dashboard-recent-activity" className="dashboard-section__title">
                    Attivita recenti
                  </h2>
                  <p className="dashboard-section__description">
                    Una selezione delle ultime azioni registrate mentre utilizzi la piattaforma.
                  </p>
                </div>
              </div>

              {activities && activities.length > 0 ? (
                <div className="dashboard-list" role="list">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="dashboard-list__item" role="listitem">
                      <div>
                        <div className="dashboard-activity-title">
                          {getActivityDisplayName(activity.type)}
                        </div>
                        <div className="dashboard-activity-meta">
                          {formatDate(activity.createdAt)}
                        </div>
                      </div>
                      <span className="dashboard-chip" aria-hidden="true">
                        {activity.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty-state">
                  <div className="dashboard-empty-state__icon">[ACTIVITY]</div>
                  <p>Le tue attivita appariranno qui appena inizierai ad utilizzare la piattaforma.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {selectedSection === "profile" && (
          <section className="dashboard-section" aria-labelledby="dashboard-profile">
            <div className="dashboard-section__header">
              <div>
                <h2 id="dashboard-profile" className="dashboard-section__title">
                  Il mio profilo
                </h2>
                <p className="dashboard-section__description">
                  Gestisci le informazioni principali del tuo account per mantenere aggiornati i dati di
                  contatto e le preferenze.
                </p>
              </div>
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="btn btn-outline btn-sm"
                >
                  Modifica
                </button>
              )}
            </div>

            {profileLoading ? (
              <div className="animate-pulse space-y-4" aria-hidden="true">
                <div className="h-4 bg-background-tertiary rounded w-1/4"></div>
                <div className="h-10 bg-background-tertiary rounded"></div>
                <div className="h-4 bg-background-tertiary rounded w-1/4"></div>
                <div className="h-10 bg-background-tertiary rounded"></div>
              </div>
            ) : isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} className="dashboard-panel" aria-live="polite">
                <div className="form-group">
                  <label className="label" htmlFor="profile-name">Nome</label>
                  <input
                    id="profile-name"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="Il tuo nome"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="profile-email">Email</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="input-field"
                    placeholder="La tua email"
                    required
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={updateProfile.isPending}
                    className="btn btn-primary btn-sm"
                  >
                    {updateProfile.isPending ? "Salvando..." : "[SAVE] Salva"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    [CANCEL] Annulla
                  </button>
                </div>
              </form>
            ) : (
              <div className="dashboard-panel">
                <div>
                  <label className="label">Nome</label>
                  <div className="p-3 bg-background-secondary border border-border-primary rounded-md">
                    {profile?.name || "Nome non disponibile"}
                  </div>
                </div>

                <div>
                  <label className="label">Email</label>
                  <div className="p-3 bg-background-secondary border border-border-primary rounded-md">
                    {profile?.email || "Email non disponibile"}
                  </div>
                </div>

                <div>
                  <label className="label">Ruolo</label>
                  <div className="p-3 bg-background-secondary border border-border-primary rounded-md">
                    <span className={`dashboard-badge ${
                      profile?.role === "admin" ? "dashboard-badge-admin" : "dashboard-badge-user"
                    }`}>
                      {profile?.role === "admin" ? "Amministratore" : "Utente"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {selectedSection === "activities" && (
          <section className="dashboard-section" aria-labelledby="dashboard-activity-log">
            <div className="dashboard-section__header">
              <div>
                <h2 id="dashboard-activity-log" className="dashboard-section__title">
                  Cronologia attivita
                </h2>
                <p className="dashboard-section__description">
                  Tutte le azioni registrate recentemente sul tuo account, incluse simulazioni e modifiche
                  al profilo.
                </p>
              </div>
            </div>

            {activitiesLoading ? (
              <div className="animate-pulse space-y-4" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-background-tertiary rounded"></div>
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="dashboard-panel-stack">
                {activities.map((activity) => (
                  <div key={activity.id} className="dashboard-panel">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="dashboard-activity-title">
                          {getActivityDisplayName(activity.type)}
                        </div>
                        <div className="dashboard-activity-meta">Tipo: {activity.type}</div>
                      </div>
                      <div className="dashboard-activity-meta">{formatDate(activity.createdAt)}</div>
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
                <p>Le tue attivita verranno registrate automaticamente mentre utilizzi ePatient.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
