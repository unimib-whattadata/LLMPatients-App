"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { api } from "~/trpc/react";
import { useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Skeleton } from "~/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  emailVerified: Date | null;
  image: string | null;
};

type UserActivity = {
  id: number;
  type: string;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
};

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Il nome deve contenere almeno 2 caratteri")
    .max(50, "Il nome deve contenere meno di 50 caratteri"),
  email: z
    .string()
    .trim()
    .email("Inserisci un'email valida"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const UserContent = React.memo(function UserContent() {
  const [selectedSection, setSelectedSection] = useState<
    "overview" | "profile" | "activities"
  >("overview");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const searchParams = useSearchParams();

  
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

  
  const typedProfile = profile as UserProfile | undefined;
  const typedActivities = activities as UserActivity[] | undefined;

  
  const updateProfile = api.dashboard.updateProfile.useMutation({
    onSuccess: () => {
      setIsEditingProfile(false);
      void refetchProfile();
    },
  });

    React.useEffect(() => {
    if (typedProfile && !isEditingProfile) {
      profileForm.reset({
        name: typedProfile.name ?? "",
        email: typedProfile.email ?? "",
      });
    }
  }, [typedProfile, isEditingProfile, profileForm]);

  
  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
      });
      setIsEditingProfile(false);
    } catch (error) {
      // Silent catch
    }
  });

  
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

  
  const simulationsCompleted = useMemo(
    () =>
      typedActivities?.filter((activity) => activity.type === "simulation")
        .length ?? 0,
    [typedActivities],
  );

  
  const handleEditProfile = useCallback(() => {
    setIsEditingProfile(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditingProfile(false);
  }, []);

  return (
    <div className="dashboard-panel-stack">
      <Tabs
        value={selectedSection}
        onValueChange={(value) =>
          setSelectedSection(value as "overview" | "profile" | "activities")
        }
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="profile">Profilo</TabsTrigger>
          <TabsTrigger value="activities">Attività</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <section
            className="dashboard-section"
            aria-labelledby="user-overview"
          >
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
                    <div className="dashboard-action-card__badge pill bg-primary-green text-white">
                      Profilo
                    </div>
                    <h3 className="dashboard-action-card__title">
                      Mantieni aggiornate le tue informazioni
                    </h3>
                    <p className="dashboard-action-card__description">
                      Modifica nome, email e preferenze per ricevere
                      suggerimenti più pertinenti.
                    </p>
                  </div>
                </div>
              </div>

              <div className="dashboard-action-card">
                <div className="dashboard-action-card-content">
                  <div className="dashboard-action-card-main">
                    <div className="dashboard-action-card__badge pill bg-primary-violet text-white">
                      Simulazioni
                    </div>
                    <h3 className="dashboard-action-card__title">
                      Accedi alle sessioni attive
                    </h3>
                    <p className="dashboard-action-card__description">
                      Prosegui con le simulazioni in corso o esplora nuovi
                      scenari clinici.
                    </p>
                  </div>
                </div>
              </div>

              <div className="dashboard-action-card">
                <div className="dashboard-action-card-content">
                  <div className="dashboard-action-card-main">
                    <div className="dashboard-action-card__badge pill bg-primary-yellow text-white">
                      Progressi
                    </div>
                    <h3 className="dashboard-action-card__title">
                      Analizza la tua evoluzione
                    </h3>
                    <p className="dashboard-action-card__description">
                      Consulta le valutazioni ricevute e monitora la crescita
                      delle tue competenze.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="dashboard-metric-grid"
              aria-label="Indicatori rapidi"
            >
              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__value">
                  {typedActivities?.length ?? 0}
                </span>
                <span className="dashboard-metric-card__label">
                  Attività registrate
                </span>
              </div>

              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__value">
                  {simulationsCompleted}
                </span>
                <span className="dashboard-metric-card__label">
                  Simulazioni completate
                </span>
              </div>

              <div className="dashboard-metric-card">
                <span className="dashboard-metric-card__value">
                  {typedProfile?.role === "admin" ? "Admin" : "Utente"}
                </span>
                <span className="dashboard-metric-card__label">
                  Ruolo account
                </span>
              </div>
            </div>
          </section>

          <section
            className="dashboard-section"
            aria-labelledby="user-recent-activities"
          >
            <div className="dashboard-section__header">
              <div>
                <h2
                  id="user-recent-activities"
                  className="dashboard-section__title"
                >
                  Attività Recenti
                </h2>
                <p className="dashboard-section__description">
                  Una selezione delle ultime azioni registrate mentre utilizzi
                  la piattaforma.
                </p>
              </div>
            </div>

            {typedActivities && typedActivities.length > 0 ? (
              <div className="dashboard-list" role="list">
                {typedActivities.slice(0, 5).map((activity) => (
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
                  Le tue attività appariranno qui appena inizierai ad utilizzare
                  la piattaforma.
                </p>
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          {profileLoading ? (
            <section
              className="dashboard-section"
              aria-labelledby="user-profile-loading"
            >
              <div className="dashboard-section__header">
                <Skeleton variant="text" className="h-6 w-32" />
                <Skeleton variant="text" className="mt-2 h-4 w-48" />
              </div>
              <div className="dashboard-panel">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton variant="text" className="h-4 w-16" />
                    <Skeleton variant="text" className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton variant="text" className="h-4 w-16" />
                    <Skeleton variant="text" className="h-10 w-full" />
                  </div>
                  <Skeleton variant="button" className="h-10 w-20" />
                </div>
              </div>
            </section>
          ) : (
            <section
              className="dashboard-section"
              aria-labelledby="user-profile"
            >
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
                  <Form {...profileForm}>
                    <form
                      onSubmit={handleProfileSubmit}
                      className="space-y-4"
                    >
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          isLoading={updateProfile.isPending}
                          disabled={updateProfile.isPending}
                        >
                          {updateProfile.isPending ? "Salvando..." : "Salva"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Annulla
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="dashboard-panel-stack">
                    <div className="dashboard-panel">
                      <div className="space-y-4">
                        <div>
                          <Label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                            Nome
                          </Label>
                          <p className="text-muted-foreground text-sm">
                            {typedProfile?.name || "Non specificato"}
                          </p>
                        </div>
                        <div>
                          <Label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                            Email
                          </Label>
                          <p className="text-muted-foreground text-sm">
                            {typedProfile?.email || "Non specificato"}
                          </p>
                        </div>
                        <div>
                          <Label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                            Ruolo
                          </Label>
                          <span className="pill dashboard-chip">
                            {typedProfile?.role === "admin"
                              ? "Admin"
                              : "Utente"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="form-actions">
                      <Button onClick={handleEditProfile}>
                        Modifica Profilo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <section
            className="dashboard-section"
            aria-labelledby="user-activities"
          >
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
                        <Skeleton variant="text" className="h-4 w-32" />
                        <Skeleton variant="text" className="h-3 w-24" />
                      </div>
                      <Skeleton variant="text" className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : typedActivities && typedActivities.length > 0 ? (
              <div className="dashboard-panel-stack">
                {typedActivities.map((activity) => (
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
                  Le tue attività verranno registrate automaticamente mentre
                  utilizzi llmpatient.
                </p>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
});
