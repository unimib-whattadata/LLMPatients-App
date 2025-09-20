"use client";

import React, { useState, useMemo, useCallback } from "react";
import { api } from "~/trpc/react";
import { MetricCardSkeleton, SectionSkeleton, ListItemSkeleton, ActionCardSkeleton } from "~/components/ui/Skeleton";

export const UserContent = React.memo(function UserContent() {
  const [selectedSection, setSelectedSection] = useState<"overview" | "profile" | "activities">("overview");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = api.dashboard.getUserProfile.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  
  const { data: activities, isLoading: activitiesLoading } = api.dashboard.getUserActivity.useQuery({ limit: 20 }, {
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

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
  const handleProfileSubmit = useCallback(async (e: React.FormEvent) => {
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
  }, [profileForm.name, profileForm.email, updateProfile]);

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

  // Memoize expensive calculations
  const lastActivity = useMemo(() => activities?.[0], [activities]);
  const simulationsCompleted = useMemo(
    () => activities?.filter((activity) => activity.type === "simulation").length ?? 0,
    [activities]
  );

  // Memoize navigation items
  const navItems = useMemo(() => [
    { key: "overview" as const, label: "[HOME] Panoramica" },
    { key: "profile" as const, label: "Il Mio Profilo" },
    { key: "activities" as const, label: "[ACTIVITY] La Mia Attivita" },
  ], []);

  // Memoize section change handler
  const handleSectionChange = useCallback((section: typeof selectedSection) => {
    setSelectedSection(section);
  }, []);

  // Memoize profile edit handlers
  const handleEditProfile = useCallback(() => {
    setIsEditingProfile(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditingProfile(false);
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-stack">
        <div className="dashboard-pill-nav" role="tablist" aria-label="Sezioni dashboard">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selectedSection === item.key}
              className={`dashboard-pill-nav__button ${selectedSection === item.key ? "is-active" : ""}`}
              onClick={() => handleSectionChange(item.key)}
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
                  onClick={handleEditProfile}
                  className="btn btn-outline btn-sm"
                >
                  Modifica
                </button>
              )}
            </div>

            {profileLoading ? (
              <SectionSkeleton />
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
                    onClick={handleCancelEdit}
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
              <div className="space-y-4" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <ListItemSkeleton key={i} />
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
});
