
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { PatientGridWrapper } from "./_components/PatientGridWrapper";
import { HydrateClient } from "~/trpc/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";

export default async function ExplorePatientsPage() {
  
  const session = await auth();

  
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
