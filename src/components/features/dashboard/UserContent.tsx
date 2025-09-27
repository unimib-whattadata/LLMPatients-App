"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { api } from "~/trpc/react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Skeleton } from "~/components/ui/skeleton";
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
    <div className="space-y-6">
      <Tabs value={selectedSection} onValueChange={(value) => setSelectedSection(value as "overview" | "profile" | "activities")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="profile">Profilo</TabsTrigger>
          <TabsTrigger value="activities">Attività</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Panoramica</CardTitle>
              <CardDescription>
                Qui trovi un riepilogo rapido del tuo profilo, delle attività
                e delle simulazioni disponibili per continuare il tuo percorso
                formativo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <Badge variant="secondary" className="w-fit bg-[#8B9769] text-white">
                      Profilo
                    </Badge>
                    <CardTitle className="text-lg">
                      Mantieni aggiornate le tue informazioni
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Modifica nome, email e preferenze per ricevere suggerimenti
                      più pertinenti.
                    </CardDescription>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <Badge variant="secondary" className="w-fit">
                      Simulazioni
                    </Badge>
                    <CardTitle className="text-lg">
                      Accedi alle sessioni attive
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Prosegui con le simulazioni in corso o esplora nuovi scenari
                      clinici.
                    </CardDescription>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <Badge variant="secondary" className="w-fit bg-[#C69A39] text-white">
                      Progressi
                    </Badge>
                    <CardTitle className="text-lg">
                      Analizza la tua evoluzione
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Consulta le valutazioni ricevute e monitora la crescita delle
                      tue competenze.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-3" aria-label="Indicatori rapidi">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{activities?.length ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Attività registrate
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{simulationsCompleted}</div>
                    <p className="text-xs text-muted-foreground">
                      Simulazioni completate
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {profile?.role === "admin" ? "Admin" : "Utente"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ruolo account
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attività Recenti</CardTitle>
              <CardDescription>
                Una selezione delle ultime azioni registrate mentre utilizzi
                la piattaforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities && activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.slice(0, 5).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {getActivityDisplayName(activity.type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {activity.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Le tue attività appariranno qui appena inizierai ad utilizzare
                    la piattaforma.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="profile" className="space-y-6">
          {profileLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-20" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Profilo Utente</CardTitle>
                <CardDescription>
                  Gestisci le informazioni del tuo account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingProfile ? (
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({...prev, name: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({...prev, email: e.target.value}))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={updateProfile.isPending}
                      >
                        {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {updateProfile.isPending ? "Salvando..." : "Salva"}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancelEdit}>
                        Annulla
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <p className="text-sm text-muted-foreground">{profile?.name || "Non specificato"}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm text-muted-foreground">{profile?.email || "Non specificato"}</p>
                    </div>
                    <div>
                      <Label>Ruolo</Label>
                      <Badge variant="secondary">{profile?.role === "admin" ? "Admin" : "Utente"}</Badge>
                    </div>
                    <Button onClick={handleEditProfile}>
                      Modifica Profilo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attività Recenti</CardTitle>
              <CardDescription>
                Cronologia delle tue attività sulla piattaforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <Card key={activity.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {getActivityDisplayName(activity.type)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Tipo: {activity.type}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>
                      {activity.metadata && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <pre>{JSON.stringify(activity.metadata, null, 2)}</pre>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Le tue attività verranno registrate automaticamente mentre
                    utilizzi llmpatient.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});