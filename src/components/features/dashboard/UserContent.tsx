"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { api } from "~/trpc/react";
import { useSearchParams } from "next/navigation";

export const UserContent = React.memo(function UserContent() {
  const [selectedSection, setSelectedSection] = useState<
    "overview" | "profile" | "activities"
  >("overview");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });

  const searchParams = useSearchParams();

  // Handle URL parameter for section
  useEffect(() => {
    const section = searchParams.get("section");
    if (
      section &&
      (section === "overview" ||
        section === "profile" ||
        section === "activities")
    ) {
      setSelectedSection(section);
    }
  }, [searchParams]);

  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = api.dashboard.getUserProfile.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data: activities, isLoading: activitiesLoading } =
    api.dashboard.getUserActivity.useQuery(
      { limit: 20 },
      {
        staleTime: 2 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    );

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
  const handleProfileSubmit = useCallback(
    async (e: React.FormEvent) => {
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
    },
    [profileForm.name, profileForm.email, updateProfile],
  );

  /**
   * Record dashboard view activity
   */
  React.useEffect(() => {
    void recordActivity.mutateAsync({
      activityType: "dashboard_view",
      metadata: { section: selectedSection },
    });
  }, [selectedSection, recordActivity]);

  /**
   * Format date for display
   */
  const formatDate = (timestamp: Date | number) => {
    const date =
      typeof timestamp === "number" ? new Date(timestamp * 1000) : timestamp;
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Get activity type display name
   */
  const getActivityDisplayName = (type: string) => {
    switch (type) {
      case "login":
        return "Accesso effettuato";
      case "profile_update":
        return "Profilo aggiornato";
      case "dashboard_view":
        return "Dashboard visualizzata";
      case "simulation":
        return "Simulazione completata";
      default:
        return type;
    }
  };

  // Memoize expensive calculations
  const simulationsCompleted = useMemo(
    () =>
      activities?.filter((activity) => activity.type === "simulation").length ??
      0,
    [activities],
  );



  // Memoize profile edit handlers
  const handleEditProfile = useCallback(() => {
    setIsEditingProfile(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditingProfile(false);
  }, []);

  return (
    <div className="dashboard-panel-stack">
      {selectedSection === "overview" && (
        <div className="dashboard-panel-stack">
          <section className="dashboard-section">
            <div className="dashboard-section__header">
              <div>
                <h2 className="dashboard-section__title">Panoramica</h2>
                <p className="dashboard-section__description">
                  Qui trovi un riepilogo rapido del tuo profilo, delle attivita
                  e delle simulazioni disponibili per continuare il tuo percorso
                  formativo.
                </p>
              </div>
            </div>

            <div className="dashboard-action-grid">
              <div className="dashboard-action-card">
                <span className="pill pill--sm dashboard-action-card__badge">
                  Profilo
                </span>
                <p className="dashboard-action-card__title">
                  Mantieni aggiornate le tue informazioni
                </p>
                <p className="dashboard-action-card__description">
                  Modifica nome, email e preferenze per ricevere suggerimenti
                  piu pertinenti.
                </p>
              </div>
              <div className="dashboard-action-card">
                <span className="pill pill--sm dashboard-action-card__badge">
                  Simulazioni
                </span>
                <p className="dashboard-action-card__title">
                  Accedi alle sessioni attive
                </p>
                <p className="dashboard-action-card__description">
                  Prosegui con le simulazioni in corso o esplora nuovi scenari
                  clinici.
                </p>
              </div>
              <div className="dashboard-action-card">
                <span className="pill pill--sm dashboard-action-card__badge">
                  Progressi
                </span>
                <p className="dashboard-action-card__title">
                  Analizza la tua evoluzione
                </p>
                <p className="dashboard-action-card__description">
                  Consulta le valutazioni ricevute e monitora la crescita delle
                  tue competenze.
                </p>
              </div>
            </div>

            <div
              className="dashboard-metric-grid"
              aria-label="Indicatori rapidi"
            >
              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__label">
                  Attivita registrate
                </span>
                <span className="dashboard-metric-card__value">
                  {activities?.length ?? 0}
                </span>
              </div>
              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__label">
                  Simulazioni completate
                </span>
                <span className="dashboard-metric-card__value">
                  {simulationsCompleted}
                </span>
              </div>
              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__label">
                  Ruolo account
                </span>
                <span className="dashboard-metric-card__value">
                  {profile?.role === "admin" ? "Admin" : "Utente"}
                </span>
              </div>
            </div>
          </section>

          <section
            className="dashboard-section"
            aria-labelledby="dashboard-recent-activity"
          >
            <div className="dashboard-section__header">
              <div>
                <h2
                  id="dashboard-recent-activity"
                  className="dashboard-section__title"
                >
                  Attivita recenti
                </h2>
                <p className="dashboard-section__description">
                  Una selezione delle ultime azioni registrate mentre utilizzi
                  la piattaforma.
                </p>
              </div>
            </div>

            {activities && activities.length > 0 ? (
              <div className="dashboard-list" role="list">
                {activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="dashboard-list__item"
                    role="listitem"
                  >
                    <div>
                      <div className="dashboard-activity-title">
                        {getActivityDisplayName(activity.type)}
                      </div>
                      <div className="dashboard-activity-meta">
                        {formatDate(activity.createdAt)}
                      </div>
                    </div>
                    <span className="pill dashboard-chip" aria-hidden="true">
                      {activity.type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-state__icon">[ACTIVITY]</div>
                <p>
                  Le tue attivita appariranno qui appena inizierai ad utilizzare
                  la piattaforma.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {selectedSection === "profile" && (
        <section
          className="dashboard-section"
          aria-labelledby="dashboard-profile"
        >
          <div className="dashboard-section__header">
            <div>
              <h2 id="dashboard-profile" className="dashboard-section__title">
                Il mio profilo
              </h2>
              <p className="dashboard-section__description">
                Gestisci le informazioni principali del tuo account per
                mantenere aggiornati i dati di contatto e le preferenze.
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
            <div className="dashboard-section">
              <div className="dashboard-section__header">
                <div>
                  <div className="bg-background-tertiary mb-2 h-6 w-48 animate-pulse rounded-md" />
                  <div className="bg-background-tertiary h-4 w-96 animate-pulse rounded-md" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-background-tertiary h-20 w-full animate-pulse rounded-md" />
                <div className="bg-background-tertiary h-20 w-full animate-pulse rounded-md" />
                <div className="bg-background-tertiary h-20 w-full animate-pulse rounded-md" />
              </div>
            </div>
          ) : isEditingProfile ? (
            <form
              onSubmit={handleProfileSubmit}
              className="dashboard-panel"
              aria-live="polite"
            >
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="profile-name">
                  Nome
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="auth-input"
                  placeholder="Il tuo nome"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label" htmlFor="profile-email">
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="auth-input"
                  placeholder="La tua email"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="auth-submit-btn"
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
                <div className="bg-background-secondary rounded-md p-3">
                  {profile?.name || "Nome non disponibile"}
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <div className="bg-background-secondary rounded-md p-3">
                  {profile?.email || "Email non disponibile"}
                </div>
              </div>

              <div>
                <label className="label">Ruolo</label>
                <div className="bg-background-secondary rounded-md p-3">
                  <span
                    className={`pill pill--sm dashboard-badge ${
                      profile?.role === "admin"
                        ? "dashboard-badge-admin"
                        : "dashboard-badge-user"
                    }`}
                  >
                    {profile?.role === "admin" ? "Amministratore" : "Utente"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {selectedSection === "activities" && (
        <section
          className="dashboard-section"
          aria-labelledby="dashboard-activity-log"
        >
          <div className="dashboard-section__header">
            <div>
              <h2
                id="dashboard-activity-log"
                className="dashboard-section__title"
              >
                Cronologia attivita
              </h2>
              <p className="dashboard-section__description">
                Tutte le azioni registrate recentemente sul tuo account, incluse
                simulazioni e modifiche al profilo.
              </p>
            </div>
          </div>

          {activitiesLoading ? (
            <div className="space-y-4" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="dashboard-list__item">
                  <div className="flex-1">
                    <div className="bg-background-tertiary mb-2 h-4 w-32 animate-pulse rounded-md" />
                    <div className="bg-background-tertiary h-3 w-24 animate-pulse rounded-md" />
                  </div>
                  <div className="bg-background-tertiary h-6 w-16 animate-pulse rounded-full" />
                </div>
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
                      <div className="dashboard-activity-meta">
                        Tipo: {activity.type}
                      </div>
                    </div>
                    <div className="dashboard-activity-meta">
                      {formatDate(activity.createdAt)}
                    </div>
                  </div>
                  {activity.metadata && (
                    <div className="dashboard-activity-meta bg-background-secondary rounded-md p-3">
                      <pre>{JSON.stringify(activity.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-state__icon">[ACTIVITY]</div>
              <p>
                Le tue attivita verranno registrate automaticamente mentre
                utilizzi ePatient.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
});
