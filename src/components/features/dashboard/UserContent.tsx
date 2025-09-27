"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { api } from "~/trpc/react";
import { useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Loader2 } from "lucide-react";

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
    <div className="dashboard-page">
      <Tabs value={selectedSection} onValueChange={(value) => setSelectedSection(value as "overview" | "profile" | "activities")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="profile">Profilo</TabsTrigger>
          <TabsTrigger value="activities">Attività</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="dashboard-stack">
          <section className="dashboard-section" aria-labelledby="user-overview">
            <div className="dashboard-section__header">
              <div>
                <h2 id="user-overview" className="dashboard-section__title">
                  Panoramica
                </h2>
                <p className="dashboard-section__description">
                  Qui trovi un riepilogo rapido del tuo profilo, delle attività
                  e delle simulazioni disponibili per continuare il tuo percorso
                  formativo.
                </p>
              </div>
            </div>
            
            <div className="dashboard-action-grid">
              <div className="dashboard-action-card">
                <div className="dashboard-action-card-content">
                  <div className="dashboard-action-card-main">
                    <div className="dashboard-action-card__badge pill bg-[var(--color-primary-green)] text-white">
                      Profilo
                    </div>
                    <h3 className="dashboard-action-card__title">
                      Mantieni aggiornate le tue informazioni
                    </h3>
                    <p className="dashboard-action-card__description">
                      Modifica nome, email e preferenze per ricevere suggerimenti
                      più pertinenti.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="dashboard-action-card">
                <div className="dashboard-action-card-content">
                  <div className="dashboard-action-card-main">
                    <div className="dashboard-action-card__badge pill bg-[var(--color-primary-violet)] text-white">
                      Simulazioni
                    </div>
                    <h3 className="dashboard-action-card__title">
                      Accedi alle sessioni attive
                    </h3>
                    <p className="dashboard-action-card__description">
                      Prosegui con le simulazioni in corso o esplora nuovi scenari
                      clinici.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="dashboard-action-card">
                <div className="dashboard-action-card-content">
                  <div className="dashboard-action-card-main">
                    <div className="dashboard-action-card__badge pill bg-[var(--color-primary-yellow)] text-white">
                      Progressi
                    </div>
                    <h3 className="dashboard-action-card__title">
                      Analizza la tua evoluzione
                    </h3>
                    <p className="dashboard-action-card__description">
                      Consulta le valutazioni ricevute e monitora la crescita delle
                      tue competenze.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-metric-grid" aria-label="Indicatori rapidi">
              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__value">{activities?.length ?? 0}</span>
                <span className="dashboard-metric-card__label">
                  Attività registrate
                </span>
              </div>
              
              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__value">{simulationsCompleted}</span>
                <span className="dashboard-metric-card__label">
                  Simulazioni completate
                </span>
              </div>
              
              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__value">
                  {profile?.role === "admin" ? "Admin" : "Utente"}
                </span>
                <span className="dashboard-metric-card__label">
                  Ruolo account
                </span>
              </div>
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="user-recent-activities">
            <div className="dashboard-section__header">
              <div>
                <h2 id="user-recent-activities" className="dashboard-section__title">
                  Attività Recenti
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
                <p>Le tue attività appariranno qui appena inizierai ad utilizzare
                  la piattaforma.</p>
              </div>
            )}
          </section>
        </TabsContent>
        
        <TabsContent value="profile" className="dashboard-stack">
          {profileLoading ? (
            <section className="dashboard-section" aria-labelledby="user-profile-loading">
              <div className="dashboard-section__header">
                <div className="bg-background-tertiary h-6 w-32 animate-pulse rounded-md" />
                <div className="bg-background-tertiary h-4 w-48 animate-pulse rounded-md mt-2" />
              </div>
              <div className="dashboard-panel">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="bg-background-tertiary h-4 w-16 animate-pulse rounded-md" />
                    <div className="bg-background-tertiary h-10 w-full animate-pulse rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <div className="bg-background-tertiary h-4 w-16 animate-pulse rounded-md" />
                    <div className="bg-background-tertiary h-10 w-full animate-pulse rounded-md" />
                  </div>
                  <div className="bg-background-tertiary h-10 w-20 animate-pulse rounded-md" />
                </div>
              </div>
            </section>
          ) : (
            <section className="dashboard-section" aria-labelledby="user-profile">
              <div className="dashboard-section__header">
                <div>
                  <h2 id="user-profile" className="dashboard-section__title">
                    Profilo Utente
                  </h2>
                  <p className="dashboard-section__description">
                    Gestisci le informazioni del tuo account
                  </p>
                </div>
              </div>
              <div className="dashboard-panel">
                {isEditingProfile ? (
                  <form onSubmit={handleProfileSubmit} className="form-container">
                    <div className="form-group">
                      <Label htmlFor="name" className="label">Nome</Label>
                      <Input
                        id="name"
                        className="input-field"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({...prev, name: e.target.value}))}
                      />
                    </div>
                    <div className="form-group">
                      <Label htmlFor="email" className="label">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        className="input-field"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({...prev, email: e.target.value}))}
                      />
                    </div>
                    <div className="form-actions">
                      <Button
                        type="submit"
                        className="btn btn-primary"
                        disabled={updateProfile.isPending}
                      >
                        {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {updateProfile.isPending ? "Salvando..." : "Salva"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="btn btn-outline"
                        onClick={handleCancelEdit}
                      >
                        Annulla
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="dashboard-panel-stack">
                    <div className="dashboard-panel">
                      <div className="space-y-4">
                        <div>
                          <Label className="label">Nome</Label>
                          <p className="text-sm text-muted-foreground">{profile?.name || "Non specificato"}</p>
                        </div>
                        <div>
                          <Label className="label">Email</Label>
                          <p className="text-sm text-muted-foreground">{profile?.email || "Non specificato"}</p>
                        </div>
                        <div>
                          <Label className="label">Ruolo</Label>
                          <span className="pill dashboard-chip">
                            {profile?.role === "admin" ? "Admin" : "Utente"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="form-actions">
                      <Button 
                        onClick={handleEditProfile}
                        className="btn btn-primary"
                      >
                        Modifica Profilo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </TabsContent>
        
        <TabsContent value="activities" className="dashboard-stack">
          <section className="dashboard-section" aria-labelledby="user-activities">
            <div className="dashboard-section__header">
              <div>
                <h2 id="user-activities" className="dashboard-section__title">
                  Attività Recenti
                </h2>
                <p className="dashboard-section__description">
                  Cronologia delle tue attività sulla piattaforma
                </p>
              </div>
            </div>
            {activitiesLoading ? (
              <div className="dashboard-panel-stack">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="dashboard-panel">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="bg-background-tertiary h-4 w-32 animate-pulse rounded-md" />
                        <div className="bg-background-tertiary h-3 w-24 animate-pulse rounded-md" />
                      </div>
                      <div className="bg-background-tertiary h-3 w-20 animate-pulse rounded-md" />
                    </div>
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
                <p>Le tue attività verranno registrate automaticamente mentre
                  utilizzi llmpatient.</p>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
});