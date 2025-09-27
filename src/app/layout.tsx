import "~/styles/globals.css";

import { type Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "~/trpc/react";
import { ToastProvider } from "@/components/ui/ToastProvider";
import SessionDebugWrapper from "@/components/debug/SessionDebugWrapper";

const isDev = process.env.NODE_ENV === "development";

export const metadata: Metadata = {
  title: {
    default: "ePatients - Piattaforma di Simulazione Medica",
    template: "%s | ePatients"
  },
  description: "Piattaforma avanzata di simulazione medica per la formazione sanitaria. Addestramento alla psicoterapia con pazienti virtuali per studenti universitari e tutor clinici.",
  keywords: [
    "simulazione medica",
    "formazione sanitaria", 
    "psicoterapia",
    "pazienti virtuali",
    "educazione medica",
    "training clinico",
    "simulazione psicologica"
  ],
  authors: [{ name: "Marco Cremaschi", url: "https://unimib.it" }],
  creator: "Università degli Studi di Milano-Bicocca",
  publisher: "Università degli Studi di Milano-Bicocca",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://epatients.unimib.it"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: "https://epatients.unimib.it",
    siteName: "ePatients",
    title: "ePatients - Piattaforma di Simulazione Medica",
    description: "Piattaforma avanzata di simulazione medica per la formazione sanitaria. Addestramento alla psicoterapia con pazienti virtuali.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "ePatients - Piattaforma di Simulazione Medica",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ePatients - Piattaforma di Simulazione Medica",
    description: "Piattaforma avanzata di simulazione medica per la formazione sanitaria.",
    images: ["/images/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  category: "education",
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${inter.variable}`}>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/images/logo.png" as="image" type="image/png" />
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="" />
        <meta name="msapplication-TileColor" content="" />
        
        {/* Viewport optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        
        {/* Performance hints */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body suppressHydrationWarning={true} className="antialiased">
        <SessionProvider>
          <TRPCReactProvider>
            <ToastProvider>
              {children}
              {isDev ? <SessionDebugWrapper enabled /> : null}
            </ToastProvider>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
