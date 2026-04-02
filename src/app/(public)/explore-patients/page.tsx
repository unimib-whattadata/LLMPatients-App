
import { SharedLayout } from "~/components/layout/SharedLayout";
import { PatientGridWrapper } from "./_components/PatientGridWrapper";
import { HydrateClient } from "~/trpc/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { getAppSession, getLayoutSessionProps } from "~/server/auth/session";

export default async function ExplorePatientsPage() {
  const session = await getAppSession();
  const { user, impersonation } = getLayoutSessionProps(session);

  return (
    <HydrateClient>
      <SharedLayout
        user={user}
        impersonation={impersonation}
        layoutType="home"
        currentPage="/explore-patients"
      >
        <div className="patients-page">
          <main
            className="patients-main"
            role="main"
            aria-label="Virtual patient catalog"
          >
            <section
              className="patients-hero"
              role="banner"
              aria-labelledby="patients-title"
            >
              <div className="section-container">
                {}
                {user && (
                  <div className="mb-6">
                    <Button asChild variant="ghost" size="sm" className="gap-2">
                      <Link href="/dashboard/therapeutic-journey">
                        <ArrowLeft className="h-4 w-4" />
                        Back to therapeutic journey
                      </Link>
                    </Button>
                  </div>
                )}
                <header>
                  <h1 id="patients-title">Patients</h1>
                  <p
                    id="patients-description"
                    aria-describedby="patients-title"
                  >
                    A catalog of virtual patients designed to train clinical
                    empathy, emotional regulation, and therapeutic decision-making
                    in safe environments.
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
