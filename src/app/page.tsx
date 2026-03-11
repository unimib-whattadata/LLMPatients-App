
import { HydrateClient } from "~/trpc/server";
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Button } from "~/components/ui/button";

export default async function Home() {
  
  const session = await auth();

  
  if (session?.user) {
    redirect("/dashboard");
  }

  const processSteps = [
    {
      title: "Lifelike clinical simulations",
      description:
        "Practice in realistic therapeutic scenarios with virtual patients that react to your choices. Each session is designed to train alliance-building, communication, and emotional attunement.",
    },
    {
      title: "Structured, evidence-based feedback",
      description:
        "At the end of each simulation, you receive a clear assessment based on validated criteria. The platform evaluates empathy, interviewing quality, technique use, and respect for therapeutic setting.",
    },
    {
      title: "Progress tracking and guided reflection",
      description:
        "Each practice is transformed into actionable reports so you can monitor growth over time, identify recurring gaps, and focus your next training sessions.",
    },
  ];

  const marketingFooter = (
    <footer
      className="home-footer"
      itemScope
      itemType="https://schema.org/Organization"
      role="contentinfo"
      aria-label="Contact details and useful links"
    >
      <div className="home-footer-main">
        <div className="section-container">
          <div className="home-footer-grid">
            <div className="home-footer-brand">
              <Image
                src="/images/logo.webp"
                alt="LLMPatients Logo"
                className="home-footer-brand-logo image-auto-size"
                itemProp="logo"
                width={48}
                height={48}
                priority={false}
              />
              <div>
                <p className="home-footer-brand-name" itemProp="name">
                  LLMPatients
                </p>
                <p className="home-footer-brand-caption" itemProp="description">
                  Platform for psychotherapy simulation, assessment, and
                  reflective learning.
                </p>
              </div>
            </div>

            <div className="home-footer-column">
              <h3 id="footer-contacts">Contact</h3>
              <p>
                <a
                  href="mailto:info@whattadata.it"
                  aria-label="Send email"
                >
                  info@whattadata.it
                </a>
              </p>
            </div>
          </div>

          <div className="home-footer-bottom">
            <nav
              className="home-footer-links"
              role="navigation"
              aria-label="Useful links"
            >
              <Link href="/privacy" aria-label="Read privacy policy">
                Privacy Policy
              </Link>
              <Link href="/terms" aria-label="Read terms and conditions">
                Terms and Conditions
              </Link>
              <Link
                href="/cookies"
                aria-label="Manage cookie settings"
              >
                Cookie Settings
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
      aria-label="Main content"
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
            Train Clinical Skills with AI Patients
          </h1>
          <p
            id="hero-description"
            className="home-hero-subtitle"
            itemProp="description"
            role="complementary"
            aria-label="Platform description"
          >
            LLMPatients helps psychotherapy students and clinical tutors run
            realistic simulations, receive structured feedback, and accelerate
            reflective learning.
          </p>
          <div
            className="flex flex-col sm:flex-row gap-4 mt-8"
            role="group"
            aria-label="Main actions"
          >
            <Button asChild size="lg" className="font-semibold">
              <Link
                href="/register"
                aria-describedby="hero-description"
              >
                Create account
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-[var(--color-primary-yellow)] bg-[var(--color-navbar-dark)] text-[var(--color-text-primary)] transition-[background-color,color,border-color] hover:bg-[var(--color-primary-yellow)] hover:text-[var(--color-text-inverse)] font-semibold"
            >
              <Link
                href="/explore-patients"
                aria-label="Explore available patient scenarios"
              >
                Explore scenarios
              </Link>
            </Button>
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
              How your training path works
            </h2>
            <meta
              id="process-description"
              itemProp="description"
              content="A step-by-step workflow for psychotherapy training with virtual patients"
            />
          </header>

          <ol
            className="home-process-list"
            role="list"
            itemProp="step"
            aria-label="Learning process steps"
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
                  aria-label={`Step ${index + 1}`}
                  role="img"
                >
                  {index + 1}
                </div>
              </li>
            ))}
          </ol>

          <footer className="home-process-cta" role="complementary">
            <Button asChild size="lg" className="font-semibold">
              <Link
                href="/register"
                aria-describedby="process-description"
              >
                Start training
              </Link>
            </Button>
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
