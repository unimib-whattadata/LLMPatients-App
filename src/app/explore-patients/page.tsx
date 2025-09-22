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
        layoutType="home"
        currentPage="/explore-patients"
      >
        <div className="patients-page">
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
                <PatientGridWrapper />
              </div>
            </section>
          </main>
        </div>
      </SharedLayout>
    </HydrateClient>
  );
}
