import type { Metadata } from "next";
import Link from "next/link";
import { SharedLayout } from "~/components/layout/SharedLayout";

export const metadata: Metadata = {
  title: "Cookie Settings",
  description:
    "Information about cookies used by LLMPatients and how to manage them.",
  alternates: {
    canonical: "/cookies",
  },
};

export default function CookiesPage() {
  return (
    <SharedLayout
      user={undefined}
      impersonation={undefined}
      layoutType="home"
      currentPage="/cookies"
    >
      <main className="section-container py-12" aria-label="Cookie settings">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Cookie Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            LLMPatients currently uses only strictly necessary cookies for
            authentication and security. If optional cookies are introduced in
            the future (e.g., analytics), this page can be extended with consent
            controls.
          </p>
          <nav aria-label="Legal pages" className="text-sm text-muted-foreground">
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            <span className="mx-2">•</span>
            <Link href="/terms" className="underline underline-offset-4">
              Terms and Conditions
            </Link>
          </nav>
        </header>

        <section className="mt-10 space-y-6 text-sm leading-6 text-foreground">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">1. Necessary cookies</h2>
            <p className="text-muted-foreground">
              These cookies are required to sign in, keep you authenticated, and
              protect the platform from abuse.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Authentication session cookie (e.g.,{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  next-auth.session-token
                </code>{" "}
                or{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  __Secure-next-auth.session-token
                </code>
                )
              </li>
              <li>
                Callback URL cookie (e.g.,{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  next-auth.callback-url
                </code>
                )
              </li>
              <li>
                CSRF protection cookie (e.g.,{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  next-auth.csrf-token
                </code>{" "}
                or{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  __Host-next-auth.csrf-token
                </code>
                )
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">2. How to manage cookies</h2>
            <p className="text-muted-foreground">
              You can manage cookies through your browser settings. Blocking
              strictly necessary cookies may prevent you from signing in or
              using the platform reliably.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">3. Contact</h2>
            <p className="text-muted-foreground">
              For questions about cookies, contact{" "}
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

