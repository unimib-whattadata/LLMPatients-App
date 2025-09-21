"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { PatientAvatar } from "../_components/PatientAvatar";
import { PatientTags } from "../_components/PatientTags";
import { api } from "~/trpc/react";

const SECTION_BASE = "bg-background-secondary rounded-lg";
const SECTION = `${SECTION_BASE} p-6`;
const SECTION_WITH_OVERFLOW = `${SECTION_BASE} overflow-hidden`;
const BREADCRUMB_NAV = "flex flex-wrap items-center gap-2 text-sm text-text-tertiary mb-4";
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
    return value[0] ?? null;
  }
  return null;
}

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = normalizeParam((params as Record<string, unknown>).patientId);

  const {
    data: patient,
    isLoading,
    error,
  } = api.patients.getPatientById.useQuery({ id: patientId ?? "" }, { enabled: Boolean(patientId) });

  if (isLoading) {
    return <PatientDetailSkeleton />;
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center px-4">
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
    <div className="min-h-screen bg-background-primary">
      <header className="bg-background-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            <h1 className="text-3xl font-bold text-text-primary">{patient.name}</h1>
            <span className={getDifficultyClass(patient.difficulty)}>
              {patient.difficulty}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1">
            <div className={SECTION_WITH_OVERFLOW}>
              <PatientAvatar name={patient.name} avatarUrl={patient.avatarUrl} avatarType={patient.avatarType} />
              <div className="p-6">
                <ul className="space-y-4">
                  {infoItems.map((item) => (
                    <li key={item.label}>
                      <p className="text-sm text-text-tertiary mb-1">{item.label}</p>
                      <p
                        className={`text-text-primary font-medium${item.capitalize ? " capitalize" : ""}`}
                      >
                        {item.value}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          <section className="lg:col-span-2 space-y-6">
            <article className={SECTION}>
              <h2 className={HEADING_CLASS}>Storia del paziente</h2>
              <p className="text-text-secondary leading-relaxed">{patient.background}</p>
            </article>

            <article className={SECTION}>
              <h2 className={HEADING_CLASS}>Obiettivi di apprendimento</h2>
              <ul className="space-y-3">
                {patient.objectives.map((objective, index) => (
                  <li key={`${objective}-${index}`} className="flex items-start gap-3">
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
                Sei pronto a iniziare l'interazione con {patient.name}? La simulazione ti permette di mettere in pratica
                le tue competenze cliniche in un ambiente sicuro e controllato.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className={`${CTA_BUTTON} bg-primary-600 hover:bg-primary-700 text-text-primary`}>
                  Inizia simulazione
                </button>
                <Link
                  href="/explore-patients"
                  className={`${CTA_BUTTON} bg-background-tertiary hover:bg-background-secondary text-text-primary`}
                >
                  &lt;- Torna all'esplorazione
                </Link>
              </div>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}

function NotFoundCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center max-w-md">
      <div className="w-16 h-16 bg-accent-900/40 rounded-full flex items-center justify-center mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-text-primary mb-2">{title}</h1>
      <p className="text-text-tertiary mb-6">{description}</p>
      <Link href="/explore-patients" className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-primary-600 text-text-primary hover:bg-primary-700">
        Torna all'esplorazione
      </Link>
    </div>
  );
}

function PatientDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background-primary">
      <header className="bg-background-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-3">
          <div className="h-4 w-64 bg-background-tertiary rounded" />
          <div className="h-8 w-48 bg-background-tertiary rounded" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1">
            <div className={`${SECTION_WITH_OVERFLOW}`}>
              <div className="w-full h-48 bg-background-tertiary" />
              <div className="p-6 space-y-4">
                <div className="h-4 w-20 bg-background-tertiary rounded" />
                <div className="h-6 w-32 bg-background-tertiary rounded" />
                <div className="h-4 w-20 bg-background-tertiary rounded" />
                <div className="h-6 w-24 bg-background-tertiary rounded" />
              </div>
            </div>
          </aside>

          <section className="lg:col-span-2 space-y-6">
            <div className={`${SECTION}`}>
              <div className="h-6 w-48 bg-background-tertiary rounded mb-4" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-background-tertiary rounded" />
                <div className="h-4 w-4/5 bg-background-tertiary rounded" />
                <div className="h-4 w-3/5 bg-background-tertiary rounded" />
              </div>
            </div>

            <div className={`${SECTION}`}>
              <div className="h-6 w-56 bg-background-tertiary rounded mb-4" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-background-tertiary rounded" />
                <div className="h-4 w-5/6 bg-background-tertiary rounded" />
                <div className="h-4 w-4/5 bg-background-tertiary rounded" />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
