import Link from "next/link";
import { HydrateClient } from "~/trpc/server";
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";

export default async function Home() {
  const session = await auth();
  
  // Main home page content
  const homeContent = (
    <>
      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-content">
          <h1 className="text-heading-1 mb-4 text-white">Simula. Valuta. Impara.</h1>
          <p className="text-body-lg mb-6 max-w-2xl text-white">
            Esplora scenari medici realistici dove puoi praticare diagnosi e sviluppare
            competenze cliniche in un ambiente sicuro e controllato.
          </p>
          <Link
            href="#"
            className="btn btn-primary btn-lg"
          >
            Inizia subito
          </Link>
        </div>
      </section>

        {/* Features Section */}
        <section className="home-features">
          <div className="home-features-content">
            <h2 className="text-heading-2 text-center mb-12">Il tuo percorso formativo, passo dopo passo</h2>
            <div className="home-features-grid">
              {/* Feature 1 */}
              <div className="home-feature-card">
                <div className="home-feature-card-icon">
                  <span className="text-3xl">📝</span>
                </div>
                <h3 className="text-heading-3 mb-4">Simulazione realistica</h3>
                <p className="text-body text-gray-600">
                  Entra in un ambiente virtuale dove puoi interagire
                  con pazienti e situazioni cliniche realistiche.
                  Sviluppa le tue competenze diagnostiche e
                  terapeutiche attraverso simulazioni avanzate che
                  rispecchiano fedelmente la realtà medica.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="home-feature-card">
                <div className="home-feature-card-icon">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-heading-3 mb-4">Valutazione automatica e strutturata</h3>
                <p className="text-body text-gray-600">
                  Il sistema di valutazione registra ogni
                  azione e decisione, fornendo un feedback
                  immediato e dettagliato.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="home-feature-card">
                <div className="home-feature-card-icon">
                  <span className="text-3xl">📈</span>
                </div>
                <h3 className="text-heading-3 mb-4">Report e riflessione guidata</h3>
                <p className="text-body text-gray-600">
                  Trova le attuali metriche originali e
                  approfondisci i tuoi raggiungimenti.
                </p>
              </div>
            </div>
          </div>
        </section>
    </>
  );

  // If user is authenticated, use SharedLayout
  if (session?.user) {
    return (
      <HydrateClient>
        <SharedLayout
          user={{
            id: session.user.id,
            name: session.user.name ?? null,
            email: session.user.email ?? "",
            role: session.user.role,
            image: session.user.image ?? null,
          }}
          impersonation={(session as any).impersonation ?? undefined}
          layoutType="home"
        >
          {homeContent}
        </SharedLayout>
      </HydrateClient>
    );
  }

  // If user is not authenticated, show simplified layout
  return (
    <HydrateClient>
      <div className="min-h-screen bg-gray-50">
        {/* Header for non-authenticated users */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-800 rounded"></div>
                </div>
                <span className="ml-2 text-lg font-medium text-gray-900">ePatient</span>
              </div>
              <nav className="hidden md:flex space-x-8">
                <Link href="#" className="link-secondary hover:text-gray-700">Home</Link>
                <Link href="#" className="link-secondary hover:text-gray-700">Chi siamo</Link>
                <Link href="/esplora-pazienti" className="link-secondary hover:text-gray-700">Esplora pazienti</Link>
                <Link href="#" className="link-secondary hover:text-gray-700">News</Link>
              </nav>
              <div className="flex items-center space-x-4">
                <Link href="/login" className="btn btn-primary btn-sm">
                  Accedi
                </Link>
                <Link href="/register" className="text-sm text-gray-600 hover:text-gray-900">
                  Registrati
                </Link>
              </div>
            </div>
          </div>
        </header>

        {homeContent}

        {/* Simplified footer */}
        <footer className="bg-gray-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-gray-400">
              © 2024 ePatient. Tutti i diritti riservati.
            </p>
          </div>
        </footer>
      </div>
    </HydrateClient>
  );
}
