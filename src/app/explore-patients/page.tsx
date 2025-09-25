import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { PatientGridWrapper } from "@/components/features/explore-patients/PatientGridWrapper";
import { HydrateClient } from "~/trpc/server";

/**
 * Esplora Pazienti Page
 * Enhanced main page for exploring virtual patients with improved styling
 */
export default async function EsploraPazientiPage() {
  const session = await auth();

  // Create a mock user for unauthenticated users
  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role || "user",
        image: session.user.image,
      }
    : undefined;

  return (
    <HydrateClient>
      <SharedLayout
        user={user}
        impersonation={undefined}
        layoutType="home"
        currentPage="/explore-patients"
      >
        <div className="patients-page">
          <main className="patients-main" role="main" aria-label="Catalogo pazienti virtuali">
            <section 
              className="patients-hero" 
              role="banner"
              aria-labelledby="patients-title"
            >
              <div className="section-container">
                <header>
                  <h1 id="patients-title">ePatients</h1>
                  <p id="patients-description" aria-describedby="patients-title">
                    Un catalogo di pazienti virtuali progettato per allenare
                    empatia clinica, gestione emotiva e decisioni terapeutiche in
                    ambienti sicuri.
                  </p>
                </header>
              </div>
            </section>

            <section 
              className="patients-grid-section" 
              role="region"
              aria-labelledby="patients-title"
              aria-describedby="patients-description"
            >
              <div className="section-container">
                <PatientGridWrapper />
              </div>
            </section>
          </main>
        </div>
      </SharedLayout>
    </HydrateClient>
  );
}
