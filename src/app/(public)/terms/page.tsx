import type { Metadata } from "next";
import Link from "next/link";
import { SharedLayout } from "~/components/layout/SharedLayout";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Terms and conditions for using the LLMPatients platform.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <SharedLayout
      user={undefined}
      impersonation={undefined}
      layoutType="home"
      currentPage="/terms"
    >
      <main className="section-container py-12" aria-label="Terms and conditions">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Terms and Conditions
          </h1>
          <p className="text-sm text-muted-foreground">
            This page is a template and should be reviewed and customized
            before production use.
          </p>
          <nav aria-label="Legal pages" className="text-sm text-muted-foreground">
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            <span className="mx-2">•</span>
            <Link href="/cookies" className="underline underline-offset-4">
              Cookie Settings
            </Link>
          </nav>
        </header>

        <section className="mt-10 space-y-6 text-sm leading-6 text-foreground">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">1. Service description</h2>
            <p className="text-muted-foreground">
              LLMPatients provides interactive simulations for educational
              purposes. The service does not provide medical advice and is not
              intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">2. Accounts and access</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">3. Acceptable use</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Do not misuse the service or attempt to disrupt it.</li>
              <li>
                Do not upload or share content that is unlawful, harmful, or
                violates third-party rights.
              </li>
              <li>
                Do not attempt to extract, reverse engineer, or scrape
                confidential model prompts or protected content.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">
              4. Intellectual property
            </h2>
            <p className="text-muted-foreground">
              The platform, including its UI, content, and software, is
              protected by applicable intellectual property laws. You receive a
              limited, non-exclusive, non-transferable right to use the service
              in accordance with these terms.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">
              5. Disclaimers and limitation of liability
            </h2>
            <p className="text-muted-foreground">
              The service is provided on an “as is” and “as available” basis. To
              the maximum extent permitted by law, LLMPatients disclaims all
              warranties and will not be liable for indirect, incidental,
              special, consequential, or punitive damages.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">6. Changes</h2>
            <p className="text-muted-foreground">
              These terms may be updated from time to time. When changes are
              made, the updated version will be posted on this page.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">7. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these terms, contact{" "}
              <a
                className="underline underline-offset-4"
                href="mailto:info@whattadata.it"
              >
                info@whattadata.it
              </a>
              .
            </p>
          </div>
        </section>
      </main>
    </SharedLayout>
  );
}

