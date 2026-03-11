"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { TherapySessionCard } from "./TherapySessionCard";
import { TherapySessionFilters } from "./TherapySessionFilters";
import { TherapySessionMetrics } from "./TherapySessionMetrics";

import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { DashboardSection, DashboardPanel, DashboardMetricCard } from "~/components/dashboard/ui";

type TherapySessionWithPatient = {
  id: string;
  userId: string;
  patientId: string;
  sessionNumber: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  completedStepsCount: number;
  patient: {
    id: string;
    name: string;
    smallDescription: string;
    difficulty: number;
    estimatedDuration: number;
    avatarUrl: string | null;
  };
};

export function TherapeuticJourneyContent() {

  const [filter, setFilter] = useState<string>("all");
  const [isClient, setIsClient] = useState(false);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    data: allTherapySessions,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = api.therapySessions.getAllForUser.useQuery();


  const typedAllTherapySessions = allTherapySessions as
    | TherapySessionWithPatient[]
    | undefined;

  const getSessionStatus = useCallback(
    (therapySession: TherapySessionWithPatient) => {

      if (therapySession.isCompleted) return "completed";


      if (therapySession.sessionNumber === 1) return "started";
      return "in-progress";
    },
    [],
  );

  const filteredSessions = useMemo(() => {
    if (!typedAllTherapySessions) return [];
    if (filter === "all") return typedAllTherapySessions;

    return typedAllTherapySessions.filter((session) => {
      const status = getSessionStatus(session);
      return status === filter;
    });
  }, [typedAllTherapySessions, filter, getSessionStatus]);

  const metrics = useMemo(() => {
    if (!typedAllTherapySessions)
      return { startedOrInProgress: 0, completed: 0, averageProgress: 0 };

    const startedOrInProgress = typedAllTherapySessions.filter(
      (s) => {
        const status = getSessionStatus(s);
        return status === "started" || status === "in-progress";
      },
    ).length;
    const completed = typedAllTherapySessions.filter(
      (s) => getSessionStatus(s) === "completed",
    ).length;
    const averageProgress = Math.max(0, Math.min(100, Math.round(
      typedAllTherapySessions.reduce(
        (acc, session) => acc + (session.completedStepsCount / 11) * 100,
        0,
      ) / typedAllTherapySessions.length,
    )));

    return { startedOrInProgress, completed, averageProgress };
  }, [typedAllTherapySessions, getSessionStatus]);

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);

  return (
    <div className="space-y-8">
      <DashboardSection
        title="Your therapeutic journeys"
        description="Select a patient to continue your therapeutic journey or start a new simulation."
      >
        {!isClient ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <DashboardMetricCard
                key={i}
                value={<Skeleton className="h-8 w-16" />}
                label={<Skeleton className="h-4 w-20" />}
              />
            ))}
          </div>
        ) : sessionsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <DashboardMetricCard
                key={i}
                value={<Skeleton className="h-8 w-16" />}
                label={<Skeleton className="h-4 w-20" />}
              />
            ))}
          </div>
        ) : typedAllTherapySessions && typedAllTherapySessions.length > 0 ? (
          <TherapySessionMetrics
            startedOrInProgress={metrics.startedOrInProgress}
            completed={metrics.completed}
            averageProgress={metrics.averageProgress}
          />
        ) : null}
      </DashboardSection>

      { }
      <DashboardSection
        title="Therapeutic Journeys"
        description="Your ongoing therapeutic sessions"
      >
        <TherapySessionFilters
          activeFilter={filter}
          onFilterChange={handleFilterChange}
        />

        {!isClient ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <DashboardPanel key={index} className="p-4 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-10 w-full mt-4" />
              </DashboardPanel>
            ))}
          </div>
        ) : sessionsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <DashboardPanel key={index} className="p-4 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-10 w-full mt-4" />
              </DashboardPanel>
            ))}
          </div>
        ) : sessionsError ? (
          <DashboardPanel className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
            <h3 className="text-foreground mb-2 text-lg font-medium">
              Loading error
            </h3>
            <p className="text-muted-foreground">
              Unable to load your therapeutic sessions.
            </p>
          </DashboardPanel>
        ) : !typedAllTherapySessions || typedAllTherapySessions.length === 0 ? (
          <DashboardPanel className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
            <h3 className="text-foreground mb-2 text-2xl font-bold">
              No session started
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              You have not started any therapeutic session yet. Go to the
              &quot;Explore Patients&quot; page to begin.
            </p>
            <Button asChild size="lg" className="bg-primary-green hover:bg-primary-green/90 text-text-inverse">
              <Link href="/explore-patients">Explore Patients</Link>
            </Button>
          </DashboardPanel>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            role="list"
            aria-label={`Grid of ${filteredSessions.length} therapeutic sessions`}
          >
            {filteredSessions.map((therapySession) => (
              <TherapySessionCard
                key={therapySession.id}
                therapySession={therapySession}
                getSessionStatus={getSessionStatus}
              />
            ))}
          </div>
        )}

        {filteredSessions.length === 0 &&
          typedAllTherapySessions &&
          typedAllTherapySessions.length > 0 && (
            <DashboardPanel className="col-span-1 md:col-span-3 min-h-[200px] flex flex-col items-center justify-center p-8 text-center bg-transparent border-dashed">
              <h3 className="text-foreground mb-2 text-lg font-medium">
                No sessions found
              </h3>
              <p className="text-muted-foreground">
                Adjust filters to see more sessions
              </p>
            </DashboardPanel>
          )}

      </DashboardSection>
    </div>
  )
}

