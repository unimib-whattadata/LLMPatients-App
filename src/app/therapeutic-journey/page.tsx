"use client";

import { SharedLayout } from "@/components/layout/SharedLayout";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type UserRole = "admin" | "user";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  image?: string | null;
};

import type { ImpersonationContext } from "~/types";
import { api } from "~/trpc/react";

type Session = {
  user?: User;
  impersonation?: ImpersonationContext | undefined;
};

function TherapeuticJourneyContent() {
  const [session, setSession] = useState<Session | null>(null);

  // Session management
  useEffect(() => {
    const getSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = (await response.json()) as Session;
        if (data.user) {
          setSession(data);
        } else {
          window.location.href = "/login";
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        window.location.href = "/login";
      }
    };
    void getSession();
  }, []);

  const {
    data: allTherapySessions,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = api.therapySessions.getAllForUser.useQuery(
    undefined,
    { enabled: Boolean(session?.user?.id) },
  );

  // User data - must be before early return to maintain hook order
  const user = session?.user ? {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email,
    role: session.user.role || "user",
    image: session.user.image,
  } : null;

  const impersonation: ImpersonationContext | undefined =
    session?.impersonation;

  // Loading state
  if (!session?.user || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SharedLayout
      user={user}
      impersonation={impersonation}
      layoutType="dashboard"
      currentPage="/therapeutic-journey"
    >
      <div className="dashboard-panel-stack">
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <h1 className="dashboard-section__title">
                I tuoi percorsi terapeutici
              </h1>
              <p className="dashboard-section__description">
                Seleziona un paziente per continuare il tuo percorso terapeutico o inizia una nuova simulazione.
              </p>
            </div>
          </div>

          {sessionsLoading ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <p className="text-lg text-text-secondary">Caricamento delle sessioni...</p>
            </div>
          ) : sessionsError ? (
            <div className="dashboard-panel-stack">
              <section className="dashboard-section">
                <div className="dashboard-section__header">
                  <div>
                    <h1 className="dashboard-section__title">
                      Errore nel caricamento
                    </h1>
                    <p className="dashboard-section__description">
                      Non è stato possibile caricare le tue sessioni terapeutiche.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          ) : !allTherapySessions || allTherapySessions.length === 0 ? (
            <div className="dashboard-panel-stack">
              <section className="dashboard-section">
                <div className="dashboard-section__header">
                  <div>
                    <h1 className="dashboard-section__title">
                      Nessuna sessione avviata
                    </h1>
                    <p className="dashboard-section__description">
                      Non hai ancora avviato nessuna sessione terapeutica. Vai alla pagina &quot;Esplora Pazienti&quot; per iniziare.
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/explore-patients"
                        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md font-medium transition-colors inline-block"
                      >
                        Esplora Pazienti
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allTherapySessions.map((therapySession) => (
                <Link
                  key={therapySession.id}
                  href={`/therapeutic-journey/${therapySession.patientId}`}
                  className="bg-background-secondary rounded-lg p-6 hover:bg-background-tertiary transition-colors cursor-pointer block"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                      {therapySession.patient.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        {therapySession.patient.name}
                      </h3>
                      <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                        {therapySession.patient.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-tertiary">
                          Sessione {therapySession.sessionNumber}/11
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          therapySession.patient.difficulty === 1 
                            ? 'bg-green-100 text-green-800' 
                            : therapySession.patient.difficulty === 2 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {therapySession.patient.difficulty === 1 ? 'Facile' : 
                           therapySession.patient.difficulty === 2 ? 'Medio' : 'Difficile'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </SharedLayout>
  );
}

export default function TherapeuticJourneyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <TherapeuticJourneyContent />
    </Suspense>
  );
}
