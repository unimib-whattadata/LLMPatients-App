import Link from "next/link";
import { HydrateClient } from "~/trpc/server";
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";

export default async function Home() {
  const session = await auth();

  const processSteps = [
    {
      title: "Simulazione realistica",
      description:
        "Entra in un ambiente virtuale dove puoi interagire con pazienti simulati. Ogni colloquio è costruito per ricreare fedelmente le dinamiche di una seduta clinica, con particolare attenzione agli aspetti relazionali, comunicativi ed emotivi.",
      align: "left" as const,
    },
    {
      title: "Valutazione automatica e strutturata",
      description:
        "Al termine di ogni simulazione riceverai una valutazione automatizzata basata sui criteri clinici validati. Il sistema analizza la tua performance in termini di empatia, uso delle tecniche, aderenza al setting e qualità delle domande.",
      align: "right" as const,
    },
    {
      title: "Report e riflessione guidata",
      description:
        "Tutte le attività vengono registrate e trasformate in report chiari e accessibili, che permettono di osservare l'andamento delle tue competenze nel tempo e di identificare le aree di miglioramento.",
      align: "left" as const,
    },
  ];


  const marketingFooter = (
    <footer className="home-footer">
      <div className="home-footer-main">
        <div className="section-container">
          <div className="home-footer-grid">
            <div className="home-footer-brand">
              <img 
                src="/images/logo.png" 
                alt="LLMPatient Logo" 
                className="home-footer-brand-logo"
              />
              <div>
                <p className="home-footer-brand-name">LLMPatient</p>
                <p className="home-footer-brand-caption">
                  Un progetto dedicato alla formazione e alla valutazione delle competenze cliniche.
                </p>
              </div>
            </div>

            <div className="home-footer-column">
              <h3>Collegamenti rapidi</h3>
              <ul>
                <li>
                  <Link href="/esplora-pazienti">Esplora pazienti</Link>
                </li>
                <li>
                  <Link href="#">News</Link>
                </li>
                <li>
                  <Link href="#">FAQ</Link>
                </li>
              </ul>
            </div>

            <div className="home-footer-column">
              <h3>Contatti</h3>
                <ul>
                  <li>LLMPatient</li>
                <li>email@example.com</li>
                <li>+39 02 0000000</li>
              </ul>
              <div className="home-footer-social">
                <Link href="#" aria-label="Visita la nostra pagina Facebook">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88V15.47H7.9v-3.1h2.54V9.79c0-2.5 1.5-3.88 3.8-3.88 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.62.77-1.62 1.56v1.88h2.76l-.44 3.1h-2.32v6.41C18.34 21.12 22 16.99 22 12z" />
                  </svg>
                </Link>
                <Link href="#" aria-label="Visita il nostro profilo Instagram">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V7c0-1.66 1.34-3 3-3h10zm-5 3.5A5.5 5.5 0 0011.5 16.5 5.5 5.5 0 1012 7.5zm0 2A3.5 3.5 0 1112 15a3.5 3.5 0 010-7zm5.75-.88a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </Link>
                <Link href="#" aria-label="Visita la nostra pagina LinkedIn">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.45 20.45h-3.55v-5.58c0-1.33-.03-3.03-1.85-3.03-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.48-.91 1.64-1.86 3.37-1.86 3.6 0 4.26 2.37 4.26 5.45v6.3zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          <div className="home-footer-bottom">
            <p>© 2025 LLMPatient. Tutti i diritti riservati.</p>
            <div className="home-footer-links">
              <Link href="#">Privacy Policy</Link>
              <Link href="#">Termini e condizioni</Link>
              <Link href="#">Impostazioni cookie</Link>
            </div>
            <div className="home-footer-languages" role="group" aria-label="Seleziona la lingua">
              <button type="button" className="active">
                IT
              </button>
              <button type="button">EN</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );

  const homeContent = (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-inner">
          <h1 className="home-hero-title">Simula. Valuta. Impara.</h1>
          <p className="home-hero-subtitle">
            Uno strumento per l'addestramento alla psicoterapia, progettato per studenti universitari e tutor clinici.
          </p>
          <div className="home-hero-actions">
            <Link href="#" className="btn btn-primary">
              Scopri il progetto
            </Link>
          </div>
        </div>
      </section>

      <section className="home-process section-spacing">
        <div className="section-container">
          <h2 className="section-heading">Il tuo percorso formativo, passo dopo passo</h2>
          <ol className="home-process-list" role="list">
            {processSteps.map((step, index) => (
              <li
                key={step.title}
                className={`home-process-item home-process-item--${step.align}`}
                role="listitem"
              >
                {step.align === "left" ? (
                  <div className="home-process-text">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                ) : (
                  <div className="home-process-text home-process-text--empty" aria-hidden="true" />
                )}

                <div className="home-process-timeline" aria-hidden="true">
                  <div className={`home-process-number home-process-number--${index + 1}`}>
                    {index + 1}
                  </div>
                  {index < processSteps.length - 1 && <span className="home-process-line" />}
                </div>

                {step.align === "right" ? (
                  <div className="home-process-text">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                ) : (
                  <div className="home-process-text home-process-text--empty" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
          <div className="home-process-cta">
            <Link href="/register" className="btn btn-primary">
              Inizia subito
            </Link>
          </div>
        </div>
      </section>

    </main>
  );

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

  return (
    <HydrateClient>
      <div className="home-landing">
        <header className="home-topbar">
          <div className="section-container">
            <div className="home-topbar-inner">
              <div className="home-brand">
                <img 
                  src="/images/logo.png" 
                  alt="LLMPatient Logo" 
                  className="home-brand-logo"
                />
                <span>LLMPatient</span>
              </div>
              <nav className="home-nav" aria-label="Navigazione principale">
                <Link href="#" className="active">
                  Home
                </Link>
                <Link href="/esplora-pazienti">Esplora pazienti</Link>
                <Link href="#">News</Link>
              </nav>
              <div className="home-nav-actions">
                <Link href="/login" className="btn btn-primary btn-sm">
                  Accedi
                </Link>
              </div>
            </div>
          </div>
        </header>

        {homeContent}

        {marketingFooter}
      </div>
    </HydrateClient>
  );
}
