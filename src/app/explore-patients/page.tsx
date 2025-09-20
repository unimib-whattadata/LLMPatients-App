import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { PatientGridWrapper } from "./_components/PatientGridWrapper";
import { HydrateClient } from "~/trpc/server";

/**
 * Esplora Pazienti Page
 * Enhanced main page for exploring virtual patients with improved styling
 */
export default async function EsploraPazientiPage() {
  const session = await auth();
  
  // Create a mock user for unauthenticated users
  const user = session?.user ? {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email!,
    role: (session.user.role as "admin" | "user") || "user",
    image: session.user.image,
  } : undefined;

  return (
    <HydrateClient>
      <SharedLayout
        user={user}
        impersonation={undefined}
        layoutType="dashboard"
        currentPage="/explore-patients"
      >
        <div className="dashboard-page">
          <section className="dashboard-page__hero">
            <div className="dashboard-page__hero-content">
              <span className="dashboard-page__hero-eyebrow">Esplora Pazienti</span>
              <h1 className="dashboard-page__hero-title">ePatients</h1>
              <p className="dashboard-page__hero-subtitle">
                Un catalogo di pazienti virtuali progettato per allenare empatia clinica, gestione emotiva e decisioni terapeutiche in ambienti sicuri.
              </p>
            </div>
          </section>

          <div className="dashboard-stack">
            <section className="dashboard-section">
              <div className="dashboard-section__header">
                <div>
                  <h2 className="dashboard-section__title">Catalogo Pazienti Virtuali</h2>
                  <p className="dashboard-section__description">
                    Scegli un paziente per iniziare una simulazione clinica e sviluppare le tue competenze pratiche
                  </p>
                </div>
              </div>

              <PatientGridWrapper />
            </section>
          </div>
        </div>
      </SharedLayout>
    </HydrateClient>
  );
}
