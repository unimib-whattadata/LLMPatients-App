"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ClockIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";

import {
  PatientAvatar,
} from "@/components/features/explore-patients";
import { Breadcrumb, PatientDetailLoading } from "@/components/ui";
import { api } from "~/trpc/react";
import { getDifficultyIconClass, getDifficultyLabel, getDifficultyAccessibleText } from "~/lib/constants/difficulty";
import { createPatientSlug } from "~/lib/utils/slugify";

const SECTION_WITH_OVERFLOW = "bg-background-secondary rounded-lg overflow-hidden";
const SECTION = "bg-background-secondary rounded-lg p-6";

function normalizeParam(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return (value[0] as string) ?? null;
  }
  return null;
}

export function PatientDetailContent() {
  const params = useParams();

  const getDifficultyIcon = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return "•";
      case 2:
        return "••";
      case 3:
        return "•••";
      default:
        return "•";
    }
  };
  const patientId = normalizeParam(
    (params as Record<string, unknown>).patientId,
  );
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const { data: session } = useSession();

  const {
    data: patient,
    isLoading,
    error,
  } = api.patients.getPatientById.useQuery(
    { id: patientId ?? "" },
    { enabled: Boolean(patientId) },
  );

  const startTherapySession = api.therapySessions.start.useMutation({
    onSuccess: (startedSession) => {
      setActionError(null);
      if (startedSession && patient) {
        const patientSlug = createPatientSlug(patient.name);
        router.push(`/dashboard/therapeutic-journey/${startedSession.patientId}/${patientSlug}`);
      }
    },
    onError: (mutationError) => {
      if (mutationError?.data?.code === "UNAUTHORIZED") {
        const target = encodeURIComponent(
          `/explore-patients/${patientId ?? ""}/${createPatientSlug(patient?.name ?? "")}`,
        );
        router.push(`/login?callbackUrl=${target}`);
        return;
      }
      setActionError(
        mutationError.message ||
          "Non è stato possibile avviare la sessione terapeutica.",
      );
    },
  });

  if (isLoading) {
    return <PatientDetailLoading />;
  }

  if (error || !patient) {
    return (
      <div className="bg-background-primary flex min-h-screen items-center justify-center px-4">
        <NotFoundCard
          title="Paziente non trovato"
          description="Il paziente richiesto non e disponibile o non esiste."
        />
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Esplora Pazienti", href: "/explore-patients" },
    { label: patient.name, isActive: true },
  ];

  let details: {
    demographic_sociocultural_information?: {
      age?: string;
      gender?: string;
    };
    psychological_profile_and_cognitive_functioning?: {
      current_and_past_psychiatric_diagnoses?: string;
    };
  } = {};

  try {
    details = JSON.parse(patient.details) as typeof details;
  } catch (error) {
    console.error('Failed to parse patient details:', error);
    // Fallback to empty object to prevent crashes
    details = {};
  }
  const infoItems = [
    { label: "Eta", value: `${details.demographic_sociocultural_information?.age || 'N/A'} anni` },
    { label: "Genere", value: details.demographic_sociocultural_information?.gender || 'N/A', capitalize: true },
    { label: "Condizione", value: details.psychological_profile_and_cognitive_functioning?.current_and_past_psychiatric_diagnoses || 'N/A' },
    { label: "Durata stimata", value: `${patient.estimatedDuration} minuti` },
  ];

  return (
    <div className="bg-background-primary min-h-screen">
      <header className="bg-background-secondary">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Breadcrumb items={breadcrumbs} />

        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <aside className="lg:col-span-1">
            <div className="bg-background-secondary rounded-lg overflow-hidden">
              <PatientAvatar
                name={patient.name}
                avatarUrl={patient.avatarUrl}
                avatarType={patient.avatarType}
                isDetailPage={true}
              />
              <div className="p-4 sm:p-6">
                {/* Patient Info Header */}
                <header className="patient-card-header">
                  <h1 className="patient-card-title text-xl sm:text-2xl">
                    {patient.name}
                  </h1>
                  <span className="patient-card-age text-sm sm:text-base">
                    {details.demographic_sociocultural_information?.age || "N/A"} anni
                  </span>
                </header>

                {/* Description */}
                <p className="patient-card-condition text-sm sm:text-base mt-3">
                  {patient.smallDescription}
                </p>

                {/* Metadata */}
                <div className="patient-card-metadata mt-4">
                  <div className="patient-card-difficulty">
                    <span
                      className={getDifficultyIconClass(patient.difficulty)}
                      aria-label={getDifficultyAccessibleText(patient.difficulty)}
                      role="img"
                    >
                      {getDifficultyIcon(patient.difficulty)}
                    </span>
                    <span className="text-sm">{getDifficultyLabel(patient.difficulty)}</span>
                  </div>
                  <div className="patient-card-duration">
                    <ClockIcon
                      className="patient-card-duration-icon w-4 h-4"
                      aria-hidden="true"
                    />
                    <span className="text-sm">{patient.estimatedDuration} min</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-4 sm:space-y-6 lg:col-span-2">
            <article className="bg-background-secondary rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-3 sm:mb-4">Storia del paziente</h2>
              <p className="patient-card-background text-sm sm:text-base leading-relaxed">
                {patient.background}
              </p>
            </article>

            <article className="bg-background-secondary rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-3 sm:mb-4">Obiettivi di apprendimento</h2>
              <div className="patient-card-objectives">
                <ul className="patient-card-objective-list space-y-2">
                  {patient.objectives.map((objective, index) => (
                    <li key={index} className="patient-card-objective-item">
                      <span className="patient-card-objective-bullet">-</span>
                      <span className="patient-card-objective-text text-sm sm:text-base">
                        {objective}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="bg-background-secondary rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-3 sm:mb-4">Inizia la simulazione</h2>
              {session ? (
                <>
                  <p className="text-text-secondary mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                    Sei pronto a iniziare l&apos;interazione con {patient.name}? La
                    simulazione ti permette di mettere in pratica le tue competenze
                    cliniche in un ambiente sicuro e controllato.
                  </p>
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <button
                      type="button"
                      className="patient-card-button w-full text-center py-3 sm:py-4 text-sm sm:text-base"
                      onClick={() => {
                        if (!patient) return;
                        setActionError(null);
                        void startTherapySession.mutate({ patientId: patient.id });
                      }}
                      disabled={startTherapySession.isPending}
                      aria-disabled={startTherapySession.isPending}
                    >
                      {startTherapySession.isPending
                        ? "Avvio in corso..."
                        : "Inizia simulazione"}
                    </button>
                  </div>
                  {actionError && (
                    <p className="text-sm text-red-500 mt-3 sm:mt-4">{actionError}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-text-secondary mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                    Per iniziare l&apos;interazione con {patient.name} e accedere alla
                    simulazione terapeutica, è necessario effettuare l&apos;accesso.
                    La simulazione ti permetterà di mettere in pratica le tue competenze
                    cliniche in un ambiente sicuro e controllato.
                  </p>
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(`/explore-patients/${patientId}/${createPatientSlug(patient.name)}`)}`}
                      className="patient-card-button text-center py-3 sm:py-4 text-sm sm:text-base"
                    >
                      Accedi per iniziare la simulazione
                    </Link>
                    <Link
                      href="/register"
                      className="patient-card-button text-center bg-background-tertiary text-text-primary hover:bg-background-quaternary py-3 sm:py-4 text-sm sm:text-base"
                    >
                      Registrati
                    </Link>
                  </div>
                </>
              )}
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}

function NotFoundCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-md text-center">
      <div className="bg-accent-900/40 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" />
      <h1 className="text-text-primary mb-2 text-2xl font-bold">{title}</h1>
      <p className="text-text-tertiary mb-6">{description}</p>
        <Link
          href="/explore-patients"
          className="bg-primary-600 text-text-primary hover:bg-primary-700 inline-flex items-center justify-center rounded-md px-5 py-2"
        >
        Torna all&apos;esplorazione
      </Link>
    </div>
  );
}

