import type { Metadata } from "next";
import Link from "next/link";
import { SharedLayout } from "~/components/layout/SharedLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy describing how LLMPatients collects and uses personal data.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <SharedLayout
      user={undefined}
      impersonation={undefined}
      layoutType="home"
      currentPage="/privacy"
    >
      <main className="section-container py-12" aria-label="Privacy policy">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            This page is a template and should be reviewed and customized
            before production use.
          </p>
          <nav aria-label="Legal pages" className="text-sm text-muted-foreground">
            <Link href="/terms" className="underline underline-offset-4">
              Terms and Conditions
            </Link>
            <span className="mx-2">•</span>
            <Link href="/cookies" className="underline underline-offset-4">
              Cookie Settings
            </Link>
          </nav>
        </header>

        <section className="mt-10 space-y-6 text-sm leading-6 text-foreground">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">1. Data we collect</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Account information (e.g., name, email address, authentication
                credentials).
              </li>
              <li>
                Usage data (e.g., session activity, feature usage, device and
                browser information).
              </li>
              <li>
                Content you submit when using the platform (e.g., text inputs in
                simulations).
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">
              2. How we use your data
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Provide, maintain, and improve the service.</li>
              <li>Authenticate users and protect accounts.</li>
              <li>Monitor reliability, security, and performance.</li>
              <li>Respond to support requests.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">3. Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell personal data. We may share data with service
              providers that help us operate the platform (e.g., hosting,
              authentication) and only as necessary to provide the service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">4. Retention</h2>
            <p className="text-muted-foreground">
              We retain personal data for as long as necessary to provide the
              service and meet legal obligations. Retention periods should be
              defined based on your operational and legal requirements.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">5. Security</h2>
            <p className="text-muted-foreground">
              We implement reasonable technical and organizational measures to
              protect personal data, including access controls and encryption
              where appropriate.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">6. Your rights</h2>
            <p className="text-muted-foreground">
              Depending on your location, you may have rights such as access,
              correction, deletion, and portability. To submit a request,
              contact{" "}
              <a
                className="underline underline-offset-4"
                href="mailto:info@whattadata.it"
              >
                info@whattadata.it
              </a>
              .
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">7. Changes</h2>
            <p className="text-muted-foreground">
              This policy may be updated from time to time. When changes are
              made, the updated version will be posted on this page.
            </p>
          </div>
        </section>
      </main>
    </SharedLayout>
  );
}

