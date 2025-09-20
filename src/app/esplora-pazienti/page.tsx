"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { SiteMenu } from "~/components/navigation/SiteMenu";
import { PatientGrid } from "./_components/PatientGrid";

/**
 * Esplora Pazienti Page
 * Enhanced main page for exploring virtual patients with improved styling
 */
export default function EsploraPazientiPage() {
  const { data: patients, isLoading, error } = api.patients.getExplorationPatients.useQuery();

  return (
    <div className="patients-page">
      <SiteMenu
        variant="dark"
        brand={{ name: "LLMPatient", href: "/", logoSrc: "/images/logo.png", logoAlt: "LLMPatient" }}
        links={[
          { label: "Home", href: "/" },
          { label: "Chi siamo", href: "/chi-siamo" },
          { label: "Esplora pazienti", href: "/esplora-pazienti" },
          { label: "News", href: "/news" },
        ]}
        rightSlot={
          <Link href="/login" className="btn btn-primary btn-sm">
            Accedi
          </Link>
        }
        mobileSlot={
          <div className="site-menu__mobile-buttons">
            <Link href="/login" className="btn btn-primary btn-sm">
              Accedi
            </Link>
          </div>
        }
      />

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
