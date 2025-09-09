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
      <section className="relative h-96 bg-cover bg-center" style={{
        backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI0MDAiIHZpZXdCb3g9IjAgMCAxMjAwIDQwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjNEE1NTY4Ii8+Cjx0ZXh0IHg9IjYwMCIgeT0iMjAwIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SGVhbHRoY2FyZSBJbWFnZTwvdGV4dD4KPC9zdmc+')"
      }}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white">
            <h1 className="text-heading-1 mb-4 text-white">Simula. Valuta. Impara.</h1>
            <p className="text-body-lg mb-6 max-w-2xl text-white">
              Esplora scenari medici realistici dove puoi praticare diagnosi e sviluppare
              competenze cliniche in un ambiente sicuro e controllato.
            </p>
            <Link
              href="#"
              className="btn btn-primary btn-lg inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Scopri il progetto
            </Link>
          </div>
        </div>
      </section>

        {/* Features Section */}
        <section className="py-16 bg-gray-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-heading-2 text-center mb-12 text-white">Il tuo percorso formativo, passo dopo passo</h2>
            
            <div className="space-y-16">
              {/* Feature 1 */}
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 mb-8 md:mb-0">
                  <h3 className="text-heading-3 mb-4 text-white">Simulazione realistica</h3>
                  <p className="text-body text-gray-300">
                    Entra in un ambiente virtuale dove puoi interagire
                    con pazienti e situazioni cliniche realistiche.
                    Sviluppa le tue competenze diagnostiche e
                    terapeutiche attraverso simulazioni avanzate che
                    rispecchiano fedelmente la realtà medica.
                  </p>
                </div>
                <div className="md:w-1/2 flex justify-center">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-2xl font-bold">
                    1
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col md:flex-row-reverse items-center">
                <div className="md:w-1/2 mb-8 md:mb-0">
                  <h3 className="text-heading-3 mb-4 text-white">Valutazione automatica e strutturata</h3>
                  <p className="text-body text-gray-300">
                    Il sistema di valutazione registra ogni
                    azione e decisione, fornendo un feedback
                    immediato e dettagliato.
                  </p>
                </div>
                <div className="md:w-1/2 flex justify-center">
                  <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center text-2xl font-bold">
                    2
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 mb-8 md:mb-0">
                  <h3 className="text-heading-3 mb-4 text-white">Report e riflessione guidata</h3>
                  <p className="text-body text-gray-300">
                    Trova le attuali metriche originali e
                    approfondisci i tuoi raggiungimenti.
                  </p>
                </div>
                <div className="md:w-1/2 flex justify-center">
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-2xl font-bold">
                    3
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link
                href="#"
                className="btn btn-primary btn-lg"
              >
                Inizia subito
              </Link>
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
