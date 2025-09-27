/**
 * Home Page
 *
 * Main landing page for the ePatients application.
 * Displays marketing content, features overview, and call-to-action sections.
 *
 * @description Server-side rendered page that handles authentication redirects
 * and renders the marketing homepage. Redirects authenticated users to dashboard.
 */

import { HydrateClient } from "~/trpc/server";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Home Page Component
 *
 * Handles authentication redirects and renders marketing homepage.
 * Redirects authenticated users to dashboard.
 */
export default async function Home() {
  // Check authentication server-side
  const session = await auth();

  // Redirect authenticated users to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  const processSteps = [
    {
      title: "Simulazione realistica",
      description:
        "Entra in un ambiente virtuale dove puoi interagire con pazienti simulati. Ogni colloquio e costruito per ricreare fedelmente le dinamiche di una seduta clinica, con particolare attenzione agli aspetti relazionali, comunicativi ed emotivi.",
    },
    {
      title: "Valutazione automatica e strutturata",
      description:
        "Al termine di ogni simulazione riceverai una valutazione automatizzata basata sui criteri clinici validati. Il sistema analizza la tua performance in termini di empatia, uso delle tecniche, aderenza al setting e qualita delle domande.",
    },
    {
      title: "Report e riflessione guidata",
      description:
        "Tutte le attivita vengono registrate e trasformate in report chiari e accessibili, che permettono di osservare l'andamento delle tue competenze nel tempo e di identificare le aree di miglioramento.",
    },
  ];

  const marketingFooter = (
    <footer
      className="home-footer"
      itemScope
      itemType="https://schema.org/Organization"
      role="contentinfo"
      aria-label="Informazioni di contatto e link utili"
    >
      <div className="home-footer-main">
        <div className="section-container">
          <div className="home-footer-grid">
            <div className="home-footer-brand">
              <img
                src="/images/logo.png"
                alt="ePatients Logo"
                className="home-footer-brand-logo"
                itemProp="logo"
                width="48"
                height="48"
                loading="lazy"
              />
              <div>
                <p className="home-footer-brand-name" itemProp="name">
                  ePatients
                </p>
                <p className="home-footer-brand-caption" itemProp="description">
                  Un progetto dedicato alla formazione e alla valutazione delle
                  competenze cliniche.
                </p>
              </div>
            </div>

            <div className="home-footer-column">
              <h3 id="footer-contacts">Contatti</h3>
              <address
                itemScope
                itemType="https://schema.org/Person"
                aria-labelledby="footer-contacts"
              >
                <p>
                  <span itemProp="name">Marco Cremaschi</span>
                  <br />
                  <span itemProp="jobTitle">Ricercatore</span>
                  <br />
                  <span itemProp="affiliation">
                    Università degli Studi di Milano-Bicocca
                  </span>
                </p>
                <p>
                  <a
                    href="mailto:llmpatient@unimib.it"
                    itemProp="email"
                    aria-label="Invia email a Marco Cremaschi"
                  >
                    llmpatient@unimib.it
                  </a>
                </p>
              </address>
            </div>
          </div>

          <div className="home-footer-bottom">
            <nav
              className="home-footer-links"
              role="navigation"
              aria-label="Link utili"
            >
              <Link href="/privacy" aria-label="Leggi la privacy policy">
                Privacy Policy
              </Link>
              <Link href="/terms" aria-label="Leggi i termini e condizioni">
                Termini e condizioni
              </Link>
              <Link
                href="/cookies"
                aria-label="Gestisci le impostazioni cookie"
              >
                Impostazioni cookie
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );

  const homeContent = (
    <main
      className="home-page"
      itemScope
      itemType="https://schema.org/WebApplication"
      role="main"
      aria-label="Contenuto principale"
    >
      <section
        className="home-hero"
        itemScope
        itemType="https://schema.org/SoftwareApplication"
        role="banner"
        aria-labelledby="hero-title"
      >
        <div className="home-hero-inner">
          <h1
            id="hero-title"
            className="home-hero-title"
            itemProp="name"
            aria-describedby="hero-description"
          >
            Simula. Valuta. Impara.
          </h1>
          <p
            id="hero-description"
            className="home-hero-subtitle"
            itemProp="description"
            role="complementary"
            aria-label="Descrizione della piattaforma"
          >
            Uno strumento per l&apos;addestramento alla psicoterapia, progettato
            per studenti universitari e tutor clinici.
          </p>
          <div
            className="home-hero-actions"
            role="group"
            aria-label="Azioni principali"
          >
            <Link
              href="/register"
              className="btn btn-primary"
              aria-describedby="hero-description"
            >
              Inizia subito
            </Link>
            <Link
              href="/explore-patients"
              className="btn btn-outline"
              aria-label="Esplora i pazienti virtuali disponibili"
            >
              Esplora pazienti
            </Link>
          </div>
          <meta
            itemProp="applicationCategory"
            content="EducationalApplication"
          />
          <meta itemProp="operatingSystem" content="Web Browser" />
          <meta
            itemProp="offers"
            itemScope
            itemType="https://schema.org/Offer"
            content="Free"
          />
        </div>
      </section>

      <section
        className="home-process section-spacing"
        itemScope
        itemType="https://schema.org/HowTo"
        role="region"
        aria-labelledby="process-heading"
      >
        <div className="section-container">
          <header>
            <h2
              id="process-heading"
              className="section-heading"
              itemProp="name"
              aria-describedby="process-description"
            >
              Il tuo percorso formativo, passo dopo passo
            </h2>
            <meta
              id="process-description"
              itemProp="description"
              content="Processo formativo per l'addestramento alla psicoterapia con pazienti virtuali"
            />
          </header>

          <ol
            className="home-process-list"
            role="list"
            itemProp="step"
            aria-label="Passaggi del processo formativo"
          >
            {processSteps.map((step, index) => (
              <li
                key={step.title}
                className="home-process-item"
                role="listitem"
                itemScope
                itemType="https://schema.org/HowToStep"
                itemProp="itemListElement"
                aria-labelledby={`step-${index + 1}-title`}
                aria-describedby={`step-${index + 1}-description`}
              >
                <div className="home-process-text">
                  <h3
                    id={`step-${index + 1}-title`}
                    itemProp="name"
                    aria-level={3}
                  >
                    {step.title}
                  </h3>
                  <p
                    id={`step-${index + 1}-description`}
                    itemProp="text"
                    role="complementary"
                  >
                    {step.description}
                  </p>
                </div>

                <div
                  className={`home-process-number home-process-number--${index + 1}`}
                  itemProp="position"
                  aria-label={`Passaggio ${index + 1}`}
                  role="img"
                >
                  {index + 1}
                </div>
              </li>
            ))}
          </ol>

          <footer className="home-process-cta" role="complementary">
            <Link
              href="/register"
              className="btn btn-primary"
              aria-describedby="process-description"
            >
              Inizia subito
            </Link>
          </footer>
        </div>
      </section>
    </main>
  );

  return (
    <HydrateClient>
      <SharedLayout
        user={undefined}
        impersonation={undefined}
        layoutType="home"
        currentPage="/"
      >
        <div className="home-landing">
          {homeContent}
          {marketingFooter}
        </div>
      </SharedLayout>
    </HydrateClient>
  );
}
