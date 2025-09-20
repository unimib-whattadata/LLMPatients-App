import { HydrateClient } from "~/trpc/server";
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import Link from "next/link";
import { SiteMenu } from "~/components/navigation/SiteMenu";

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
              </ul>
            </div>

            <div className="home-footer-column">
              <h3>Contatti</h3>
                <ul>
                  <li>marco.cremaschi@unimib.it</li>
                </ul>
            </div>
          </div>

          <div className="home-footer-bottom">
            <p>© 2025 Whattadata. Tutti i diritti riservati.</p>
            <div className="home-footer-links">
              <Link href="#">Privacy Policy</Link>
              <Link href="#">Termini e condizioni</Link>
              <Link href="#">Impostazioni cookie</Link>
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
        <SiteMenu
          variant="dark"
          brand={{ name: "LLMPatient", href: "/", logoSrc: "/images/logo.png", logoAlt: "LLMPatient" }}
          links={[
            { label: "Home", href: "/" },
            { label: "Esplora pazienti", href: "/esplora-pazienti" },
          ]}
          rightSlot={
            <Link href="/login" className="btn btn-primary btn-sm">
              Accedi
            </Link>
          }
          mobileSlot={
            <div className="site-menu__mobile-buttons">
              <Link href="/login" className="btn btn-primary btn-sm">
                Accedi
              </Link>
            </div>
          }
        />

        {homeContent}

        {marketingFooter}
      </div>
    </HydrateClient>
  );
}
