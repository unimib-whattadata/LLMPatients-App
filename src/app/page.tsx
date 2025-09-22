import { HydrateClient } from "~/trpc/server";
import { auth } from "~/server/auth";
import { SharedLayout } from "@/components/layout/SharedLayout";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
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
    >
      <div className="home-footer-main">
        <div className="section-container">
          <div className="home-footer-grid">
            <div className="home-footer-brand">
              <img
                src="/images/logo.png"
                alt="LLMPatient Logo"
                className="home-footer-brand-logo"
                itemProp="logo"
              />
              <div>
                <p className="home-footer-brand-name" itemProp="name">
                  LLMPatient
                </p>
                <p className="home-footer-brand-caption" itemProp="description">
                  Un progetto dedicato alla formazione e alla valutazione delle
                  competenze cliniche.
                </p>
              </div>
            </div>

            <div className="home-footer-column">
              <h3>Contatti</h3>
              <ul itemScope itemType="https://schema.org/Person">
                <li itemProp="email">marco.cremaschi@unimib.it</li>
                <meta itemProp="name" content="Marco Cremaschi" />
                <meta itemProp="jobTitle" content="Ricercatore" />
                <meta
                  itemProp="affiliation"
                  content="Università degli Studi di Milano-Bicocca"
                />
              </ul>
            </div>
          </div>

          <div className="home-footer-bottom">
            <p>Copyright 2025 Whattadata S.r.l. Tutti i diritti riservati.</p>
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
    <main
      className="home-page"
      itemScope
      itemType="https://schema.org/WebApplication"
    >
      <section
        className="home-hero"
        itemScope
        itemType="https://schema.org/SoftwareApplication"
      >
        <div className="home-hero-inner">
          <h1 className="home-hero-title" itemProp="name">
            Simula. Valuta. Impara.
          </h1>
          <p className="home-hero-subtitle" itemProp="description">
            Uno strumento per l&apos;addestramento alla psicoterapia, progettato
            per studenti universitari e tutor clinici.
          </p>
          <div className="home-hero-actions">
            <Link href="#" className="btn btn-primary" itemProp="url">
              Scopri il progetto
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
      >
        <div className="section-container">
          <h2 className="section-heading" itemProp="name">
            Il tuo percorso formativo, passo dopo passo
          </h2>
          <meta
            itemProp="description"
            content="Processo formativo per l'addestramento alla psicoterapia con pazienti virtuali"
          />
          <ol className="home-process-list" role="list" itemProp="step">
            {processSteps.map((step, index) => (
              <li
                key={step.title}
                className="home-process-item"
                role="listitem"
                itemScope
                itemType="https://schema.org/HowToStep"
                itemProp="itemListElement"
              >
                <div className="home-process-text">
                  <h3 itemProp="name">{step.title}</h3>
                  <p itemProp="text">{step.description}</p>
                </div>

                <div
                  className={`home-process-number home-process-number--${index + 1}`}
                  itemProp="position"
                >
                  {index + 1}
                </div>
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
