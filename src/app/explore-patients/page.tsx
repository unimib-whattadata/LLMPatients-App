/**
 * Explore Patients Page
 *
 * Main public interface for exploring virtual patients and clinical scenarios.
 * Displays a catalog of available virtual patients for clinical training.
 *
 * @description Server-side rendered page that handles optional authentication
 * and renders the patient exploration interface. Accessible to both
 * authenticated and unauthenticated users.
 */

import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import { PatientGridWrapper } from "@/components/features/explore-patients/PatientGridWrapper";
import { HydrateClient } from "~/trpc/server";

/**
 * Explore Patients Page Component
 *
 * Handles optional authentication and renders patient exploration interface.
 * Works for both authenticated and unauthenticated users.
 */
export default async function ExplorePatientsPage() {
  // Get session if available, but don't require authentication
  const session = await auth();

  // Create user object for authenticated users, undefined for unauthenticated
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
        impersonation={session?.impersonation ?? undefined}
        layoutType="home"
        currentPage="/explore-patients"
      >
        <div className="patients-page">
          <main
            className="patients-main"
            role="main"
            aria-label="Catalogo pazienti virtuali"
          >
            <section
              className="patients-hero"
              role="banner"
              aria-labelledby="patients-title"
            >
              <div className="section-container">
                <header>
                  <h1 id="patients-title">I pazienti</h1>
                  <p
                    id="patients-description"
                    aria-describedby="patients-title"
                  >
                    Un catalogo di pazienti virtuali progettato per allenare
                    empatia clinica, gestione emotiva e decisioni terapeutiche
                    in ambienti sicuri.
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
