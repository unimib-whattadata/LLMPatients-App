"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Clock } from "lucide-react";
import { useSession } from "next-auth/react";

import { PatientAvatar } from "~/components/features/explore-patients";
import { Breadcrumb, Alert, AlertDescription, AlertTitle } from "~/components/ui";
import { PatientDetailSkeleton } from "~/components/ui/skeleton-variants";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  getDifficultyIconClass,
  getDifficultyAccessibleText,
  getDifficultyIcon,
  type DifficultyLevel,
} from "~/lib/constants/difficulty";
import { createPatientSlug } from "~/lib/utils/slugify";
import { createLogger } from "~/lib/logger";

const logger = createLogger("PatientDetail");

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

  const initializePatientMutation = api.chat.initializePatient.useMutation();

  const startTherapySession = api.therapySessions.start.useMutation({
    onSuccess: async (startedSession) => {
      setActionError(null);
      if (startedSession && patient) {

        if (!patient.externalPatientId) {
          try {
            const initResponse = await initializePatientMutation.mutateAsync({
              patientInfo: {
                id: patient.id,
                name: patient.name,
                age: patient.age,
                gender: patient.gender || "not specified",
                diagnosis: patient.diagnosis || "Not specified",
                difficulty: patient.difficulty,
                psychologicalProfile: patient.psychologicalProfile || patient.background,
                background: patient.background,
                currentMedications: patient.currentMedications || [],
                therapyGoals: patient.objectives,
                previousSessions: patient.previousSessions || 0,
              },
              sessionId: startedSession.id,
            });

            // Check whether initialization failed
            if (initResponse.status !== "success" || !initResponse.external_patient_id) {
              setActionError(
                initResponse.message ||
                "Error while initializing the patient in the external system. The therapeutic journey cannot be started."
              );
              return; // Block redirect
            }
          } catch (error) {
            logger.error("Patient initialization failed", error);
            setActionError(
              error instanceof Error
                ? error.message
                : "Error while initializing the patient in the external system. The therapeutic journey cannot be started."
            );
            return; // Block redirect
          }
        }

        const patientSlug = createPatientSlug(patient.name);
        router.push(
          `/dashboard/therapeutic-journey/${startedSession.patientId}/${patientSlug}`,
        );
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
        "Unable to start the therapeutic session.",
      );
    },
  });

  if (isLoading) {
    return <PatientDetailSkeleton />;
  }

  if (error || !patient) {
    return (
      <div className="bg-background-primary flex min-h-screen items-center justify-center px-4">
        <NotFoundCard
          title="Patient not found"
          description="The requested patient is not available or does not exist."
        />
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Explore Patients", href: "/explore-patients" },
    { label: patient.name, isActive: true },
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
            <div className="bg-background-secondary overflow-hidden rounded-lg">
              <PatientAvatar
                name={patient.name}
                avatarUrl={patient.avatarUrl}
                isDetailPage={true}
              />
              <div className="p-4 sm:p-6">
                { }
                <header className="patient-card-header">
                  <h1 className="patient-card-title text-xl sm:text-2xl">
                    {patient.name}
                  </h1>
                  <span className="patient-card-age text-sm sm:text-base">
                    {patient.age} years
                  </span>
                </header>

                { }

                { }
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-sm">
                      Difficulty:
                    </span>
                    <div className="patient-card-difficulty">
                      <span
                        className={getDifficultyIconClass(
                          patient.difficulty as DifficultyLevel,
                        )}
                        aria-label={getDifficultyAccessibleText(
                          patient.difficulty as DifficultyLevel,
                        )}
                        role="img"
                      >
                        {getDifficultyIcon(patient.difficulty as DifficultyLevel)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-sm">
                      Estimated duration:
                    </span>
                    <div className="flex items-center space-x-1 text-sm text-primary-yellow">
                      <Clock
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      <span className="text-text-tertiary text-sm">
                        {patient.estimatedDuration} min
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-4 sm:space-y-6 lg:col-span-2">
            <article className="bg-background-secondary rounded-lg p-4 sm:p-6">
              <h2 className="text-text-primary mb-3 text-lg font-semibold sm:mb-4 sm:text-xl">
                Description
              </h2>
              <p className="patient-card-condition text-sm leading-relaxed sm:text-base">
                {patient.smallDescription}
              </p>
            </article>

            <article className="bg-background-secondary rounded-lg p-4 sm:p-6">
              <h2 className="text-text-primary mb-3 text-lg font-semibold sm:mb-4 sm:text-xl">
                Learning objectives
              </h2>
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
              <h2 className="text-text-primary mb-3 text-lg font-semibold sm:mb-4 sm:text-xl">
                Start simulation
              </h2>
              {session ? (
                <>
                  <p className="text-text-secondary mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
                    Are you ready to start interacting with {patient.name}?
                    This simulation lets you practice your clinical skills in a
                    safe and controlled environment.
                  </p>
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <Button
                      type="button"
                      className="patient-card-button w-full py-3 text-center text-sm sm:py-4 sm:text-base"
                      onClick={() => {
                        if (!patient) return;
                        setActionError(null);
                        void startTherapySession.mutate({
                          patientId: patient.id,
                        });
                      }}
                      disabled={startTherapySession.isPending}
                      aria-disabled={startTherapySession.isPending}
                      isLoading={startTherapySession.isPending}
                    >
                      Start simulation
                    </Button>
                  </div>
                  {actionError && (
                    <Alert variant="destructive" className="mt-3 sm:mt-4">
                      <AlertTitle>Initialization error</AlertTitle>
                      <AlertDescription>{actionError}</AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <>
                  <p className="text-text-secondary mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
                    To start interacting with {patient.name} and access the
                    therapeutic simulation, you need to sign in first. The
                    simulation lets you practice your clinical skills in a safe
                    and controlled environment.
                  </p>
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(`/explore-patients/${patientId}/${createPatientSlug(patient.name)}`)}`}
                      className="patient-card-button py-3 text-center text-sm sm:py-4 sm:text-base"
                    >
                      Sign in to start the simulation
                    </Link>
                    <Link
                      href="/register"
                      className="patient-card-button bg-background-tertiary text-text-primary hover:bg-background-quaternary py-3 text-center text-sm sm:py-4 sm:text-base"
                    >
                      Sign up
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
        Back to exploration
      </Link>
    </div>
  );
}
