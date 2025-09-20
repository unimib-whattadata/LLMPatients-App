"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { PatientGrid } from "./_components/PatientGrid";

/**
 * Esplora Pazienti Page
 * Enhanced main page for exploring virtual patients with improved styling
 */
export default function EsploraPazientiPage() {
  const { data: patients, isLoading, error } = api.patients.getExplorationPatients.useQuery();

  return (
    <div className="patients-page">
      <header className="patients-topbar">
        <div className="section-container patients-topbar-inner">
          <div className="patients-brand">
            <div className="patients-brand-mark" aria-hidden="true" />
            <span>LLMPatient</span>
          </div>
          <nav className="patients-nav" aria-label="Navigazione principale">
            <Link href="/">Home</Link>
            <Link href="#">Chi siamo</Link>
            <Link href="/esplora-pazienti" className="active" aria-current="page">
              Esplora pazienti
            </Link>
            <Link href="#">News</Link>
            <Link href="/login">Area personale</Link>
          </nav>
        </div>
      </header>

      <main className="patients-main">
        <section className="patients-hero">
          <div className="section-container">
            <h1>ePatients</h1>
            <p>
              Un catalogo di pazienti virtuali progettato per allenare empatia clinica, gestione emotiva e decisioni terapeutiche in ambienti sicuri.
            </p>
          </div>
        </section>

        <section className="patients-grid-section">
          <div className="section-container">
            <PatientGrid
              patients={patients || []}
              isLoading={isLoading}
              error={error?.message || null}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
