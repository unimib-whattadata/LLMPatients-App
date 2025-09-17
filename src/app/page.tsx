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
          <h1 className="text-heading-1 text-white">Simula. Valuta. Impara.</h1>
          <p className="text-body-lg text-white max-w-2xl mx-auto">
            Esplora scenari medici realistici dove puoi praticare diagnosi e sviluppare
            competenze cliniche in un ambiente sicuro e controllato.
          </p>
          <Link href="#" className="btn btn-primary btn-lg mt-8">
            Scopri il percorso
          </Link>
        </div>
      </section>

      {/* The Process Section */}
      <section className="home-process">
        <div className="home-process-content">
          <h2 className="text-heading-2 text-center mb-16">Il tuo percorso formativo, passo dopo passo</h2>
          <div className="home-process-timeline">
            {/* Step 1 */}
            <div className="home-process-step">
              <div className="home-process-step-indicator left">
                <div className="home-process-step-circle bg-green-500">1</div>
              </div>
              <div className="home-process-step-content right">
                <h3 className="text-heading-3 mb-4">Innovazione didattica</h3>
                <p className="text-body">
                  Entra in un ambiente virtuale dove puoi interagire con pazienti e situazioni cliniche realistiche.
                </p>
              </div>
            </div>
            {/* Step 2 */}
            <div className="home-process-step">
              <div className="home-process-step-content left">
                <h3 className="text-heading-3 mb-4">Valutazione automatica</h3>
                <p className="text-body">
                  Il sistema di valutazione registra ogni azione e decisione, fornendo un feedback immediato e dettagliato.
                </p>
              </div>
              <div className="home-process-step-indicator right">
                <div className="home-process-step-circle bg-yellow-500">2</div>
              </div>
            </div>
            {/* Step 3 */}
            <div className="home-process-step">
              <div className="home-process-step-indicator left">
                <div className="home-process-step-circle bg-purple-500">3</div>
              </div>
              <div className="home-process-step-content right">
                <h3 className="text-heading-3 mb-4">Report e riflessione</h3>
                <p className="text-body">
                  Trova le attuali metriche originali e approfondisci i tuoi raggiungimenti.
                </p>
              </div>
            </div>
          </div>
          <div className="text-center mt-16">
            <Link href="#" className="btn btn-primary btn-lg">
              Scopri di più
            </Link>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="home-courses">
        <div className="home-courses-content">
          <h2 className="text-heading-2 text-center mb-12">Corsi</h2>
          <div className="home-courses-grid">
            {/* Course Card 1 */}
            <div className="course-card">
              <div className="course-card-image">
                <img src="/placeholder.jpg" alt="Corso di Prova" />
              </div>
              <div className="course-card-content">
                <h3 className="text-heading-4 mb-2">Corso di Prova</h3>
                <div className="course-card-meta">
                  <span>10 Moduli</span>
                  <span>5 Ore</span>
                </div>
                <p className="text-body-sm text-gray-600 my-4">
                  Una breve descrizione del corso.
                </p>
                <Link href="#" className="btn btn-outline btn-sm">
                  Scopri il corso
                </Link>
              </div>
            </div>
            {/* Course Card 2 */}
            <div className="course-card">
              <div className="course-card-image">
                <img src="/placeholder.jpg" alt="Corso di Prova" />
              </div>
              <div className="course-card-content">
                <h3 className="text-heading-4 mb-2">Corso di Prova</h3>
                <div className="course-card-meta">
                  <span>10 Moduli</span>
                  <span>5 Ore</span>
                </div>
                <p className="text-body-sm text-gray-600 my-4">
                  Una breve descrizione del corso.
                </p>
                <Link href="#" className="btn btn-outline btn-sm">
                  Scopri il corso
                </Link>
              </div>
            </div>
          </div>
          <div className="text-center mt-12">
            <Link href="#" className="btn btn-primary btn-lg">
              Vedi tutti i corsi
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="home-testimonials">
        <div className="home-testimonials-content">
          <h2 className="text-heading-2 text-center mb-12">Dicono di noi</h2>
          <div className="home-testimonials-grid">
            {/* Testimonial 1 */}
            <div className="testimonial-card">
              <div className="testimonial-card-author">
                <img src="/placeholder.jpg" alt="Author" className="testimonial-card-avatar" />
                <div>
                  <p className="font-bold">Nome Cognome</p>
                  <p className="text-sm text-gray-500">Azienda</p>
                </div>
              </div>
              <p className="text-body mt-4">"Una testimonianza sul corso."</p>
            </div>
            {/* Testimonial 2 */}
            <div className="testimonial-card">
              <div className="testimonial-card-author">
                <img src="/placeholder.jpg" alt="Author" className="testimonial-card-avatar" />
                <div>
                  <p className="font-bold">Nome Cognome</p>
                  <p className="text-sm text-gray-500">Azienda</p>
                </div>
              </div>
              <p className="text-body mt-4">"Una testimonianza sul corso."</p>
            </div>
          </div>
          <div className="text-center mt-12">
            <Link href="#" className="btn btn-primary btn-lg">
              Vedi tutti
            </Link>
          </div>
        </div>
      </section>

      {/* QR Code Section */}
      <section className="home-qr">
        <div className="home-qr-content">
          <div className="home-qr-code">
            <img src="/placeholder.jpg" alt="QR Code" />
            <p className="mt-4 text-center">Scarica l'app</p>
          </div>
          <div className="home-qr-text">
            <h2 className="text-heading-2 mb-4">Inizia una simulazione</h2>
            <p className="text-body">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="home-footer">
        <div className="home-footer-content">
          <div className="home-footer-column">
            <h3 className="text-lg font-semibold mb-4">Rimani aggiornato</h3>
            <p className="text-sm text-gray-400 mb-4">
              Iscriviti alla nostra newsletter.
            </p>
            <div className="flex">
              <input type="email" placeholder="La tua email" className="input-field rounded-r-none" />
              <button className="btn btn-primary rounded-l-none">Iscriviti</button>
            </div>
          </div>
          <div className="home-footer-column">
            <h3 className="text-lg font-semibold mb-4">Azienda</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="link-secondary">Chi siamo</Link></li>
              <li><Link href="#" className="link-secondary">News</Link></li>
              <li><Link href="#" className="link-secondary">Contatti</Link></li>
            </ul>
          </div>
          <div className="home-footer-column">
            <h3 className="text-lg font-semibold mb-4">Risorse</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="link-secondary">FAQ</Link></li>
              <li><Link href="#" className="link-secondary">Privacy Policy</Link></li>
              <li><Link href="#" className="link-secondary">Termini e condizioni</Link></li>
            </ul>
          </div>
          <div className="home-footer-column">
            <h3 className="text-lg font-semibold mb-4">Contatti</h3>
            <div className="text-sm text-gray-400 space-y-2">
              <p>ePatient</p>
              <p>epatient@email.com</p>
            </div>
            <div className="flex space-x-4 mt-4">
              <Link href="#" className="link-secondary"><span className="sr-only">Facebook</span></Link>
              <Link href="#" className="link-secondary"><span className="sr-only">Instagram</span></Link>
              <Link href="#" className="link-secondary"><span className="sr-only">LinkedIn</span></Link>
            </div>
          </div>
        </div>
        <div className="home-sub-footer">
          <p className="text-sm text-gray-500">&copy; 2024 ePatient. Tutti i diritti riservati.</p>
        </div>
      </footer>
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
