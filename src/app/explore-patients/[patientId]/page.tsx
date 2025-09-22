"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  PatientAvatar,
  PatientTags,
} from "@/components/features/explore-patients";
import { api } from "~/trpc/react";

const SECTION_BASE = "bg-background-secondary rounded-lg";
const SECTION = `${SECTION_BASE} p-6`;
const SECTION_WITH_OVERFLOW = `${SECTION_BASE} overflow-hidden`;
const BREADCRUMB_NAV =
  "flex flex-wrap items-center gap-2 text-sm text-text-tertiary mb-4";
const HEADING_CLASS = "text-xl font-semibold text-text-primary mb-4";
const CTA_BUTTON = "flex-1 font-medium py-3 px-6 rounded-md text-center";
const DIFFICULTY_BADGES: Record<string, string> = {
  Facile: "pill pill--lg pill--primary",
  Medio: "pill pill--lg pill--secondary",
  Difficile: "pill pill--lg pill--accent",
};

function getDifficultyClass(value: string) {
  return DIFFICULTY_BADGES[value] ?? "pill pill--lg pill--muted";
}

function normalizeParam(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return (value[0] as string) ?? null;
  }
  return null;
}

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = normalizeParam(
    (params as Record<string, unknown>).patientId,
  );

  const {
    data: patient,
    isLoading,
    error,
  } = api.patients.getPatientById.useQuery(
    { id: patientId ?? "" },
    { enabled: Boolean(patientId) },
  );

  if (isLoading) {
    return <PatientDetailSkeleton />;
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
    { label: patient.name },
  ];

  const infoItems = [
    { label: "Eta", value: `${patient.age} anni` },
    { label: "Genere", value: patient.gender, capitalize: true },
    { label: "Condizione", value: patient.condition },
    { label: "Durata stimata", value: `${patient.estimatedDuration} minuti` },
  ];

  return (
    <div className="bg-background-primary min-h-screen">
      <header className="bg-background-secondary">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className={BREADCRUMB_NAV}>
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.label} className="flex items-center gap-2">
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-text-primary">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-text-primary">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && <span>&gt;</span>}
              </span>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-text-primary text-3xl font-bold">
              {patient.name}
            </h1>
            <span className={getDifficultyClass(patient.difficulty)}>
              {patient.difficulty}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <aside className="lg:col-span-1">
            <div className={SECTION_WITH_OVERFLOW}>
              <PatientAvatar
                name={patient.name}
                avatarUrl={patient.avatarUrl}
                avatarType={patient.avatarType}
              />
              <div className="p-6">
                <ul className="space-y-4">
                  {infoItems.map((item) => (
                    <li key={item.label}>
                      <p className="text-text-tertiary mb-1 text-sm">
                        {item.label}
                      </p>
                      <p
                        className={`text-text-primary font-medium${item.capitalize ? "capitalize" : ""}`}
                      >
                        {item.value}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          <section className="space-y-6 lg:col-span-2">
            <article className={SECTION}>
              <h2 className={HEADING_CLASS}>Storia del paziente</h2>
              <p className="text-text-secondary leading-relaxed">
                {patient.background}
              </p>
            </article>

            <article className={SECTION}>
              <h2 className={HEADING_CLASS}>Obiettivi di apprendimento</h2>
              <ul className="space-y-3">
                {patient.objectives.map((objective, index) => (
                  <li
                    key={`${objective}-${index}`}
                    className="flex items-start gap-3"
                  >
                    <span className="text-primary-300 mt-1">•</span>
                    <span className="text-text-secondary">{objective}</span>
                  </li>
                ))}
              </ul>
            </article>

            {(patient.tags?.length ?? 0) > 0 && (
              <article className={SECTION}>
                <h2 className={HEADING_CLASS}>Caratteristiche cliniche</h2>
                <PatientTags tags={patient.tags} />
              </article>
            )}

            <article className={SECTION}>
              <h2 className={HEADING_CLASS}>Inizia la simulazione</h2>
              <p className="text-text-secondary mb-6">
                Sei pronto a iniziare l&apos;interazione con {patient.name}? La
                simulazione ti permette di mettere in pratica le tue competenze
                cliniche in un ambiente sicuro e controllato.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  className={`${CTA_BUTTON} bg-primary-600 hover:bg-primary-700 text-text-primary`}
                >
                  Inizia simulazione
                </button>
                <Link
                  href="/explore-patients"
                  className={`${CTA_BUTTON} bg-background-tertiary hover:bg-background-secondary text-text-primary`}
                >
                  &lt;- Torna all&apos;esplorazione
                </Link>
              </div>
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

function PatientDetailSkeleton() {
  return (
    <div className="bg-background-primary min-h-screen">
      <header className="bg-background-secondary">
        <div className="mx-auto max-w-4xl space-y-3 px-4 py-6 sm:px-6 lg:px-8">
          <div className="bg-background-tertiary h-4 w-64 rounded" />
          <div className="bg-background-tertiary h-8 w-48 rounded" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <aside className="lg:col-span-1">
            <div className={`${SECTION_WITH_OVERFLOW}`}>
              <div className="bg-background-tertiary h-48 w-full" />
              <div className="space-y-4 p-6">
                <div className="bg-background-tertiary h-4 w-20 rounded" />
                <div className="bg-background-tertiary h-6 w-32 rounded" />
                <div className="bg-background-tertiary h-4 w-20 rounded" />
                <div className="bg-background-tertiary h-6 w-24 rounded" />
              </div>
            </div>
          </aside>

          <section className="space-y-6 lg:col-span-2">
            <div className={`${SECTION}`}>
              <div className="bg-background-tertiary mb-4 h-6 w-48 rounded" />
              <div className="space-y-2">
                <div className="bg-background-tertiary h-4 w-full rounded" />
                <div className="bg-background-tertiary h-4 w-4/5 rounded" />
                <div className="bg-background-tertiary h-4 w-3/5 rounded" />
              </div>
            </div>

            <div className={`${SECTION}`}>
              <div className="bg-background-tertiary mb-4 h-6 w-56 rounded" />
              <div className="space-y-3">
                <div className="bg-background-tertiary h-4 w-full rounded" />
                <div className="bg-background-tertiary h-4 w-5/6 rounded" />
                <div className="bg-background-tertiary h-4 w-4/5 rounded" />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
