import { type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

interface AuthLayoutProps {
    children: ReactNode;
    brandTitle: string;
    brandSubtitle: string;
    brandFeatures?: string[];
}

export function AuthLayout({
    children,
    brandTitle,
    brandSubtitle,
    brandFeatures = [],
}: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex text-foreground">
            {/* Brand Section */}
            <div className="hidden lg:flex lg:w-1/2 bg-muted/30 items-center justify-center p-12 relative overflow-hidden">
                {/* Background gradient effects - Subtle */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-background to-secondary/5 z-0" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl z-0" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl z-0" />

                <div className="max-w-md text-center relative z-10">
                    <div className="mb-8 flex justify-center">
                        <div className="p-4 bg-background/50 rounded-2xl border border-border/50 shadow-sm backdrop-blur-sm">
                            <Image
                                src="/images/logo.png"
                                alt="LLMPatients Logo"
                                width={80}
                                height={80}
                                className="mx-auto"
                                priority
                            />
                        </div>
                    </div>

                    <h1 className="text-4xl font-bold text-primary mb-6 tracking-tight">
                        {brandTitle}
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        {brandSubtitle}
                    </p>

                    {brandFeatures.length > 0 && (
                        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                            {brandFeatures.map((feature, index) => (
                                <div key={index} className="flex items-center">
                                    {index > 0 && <span className="mx-2 text-primary/20">•</span>}
                                    <span className="px-2 py-1 bg-background/50 rounded-full border border-border/50">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Form Section */}
            <div className="w-full lg:w-1/2 bg-background flex items-center justify-center p-6 sm:p-12 relative">
                {/* Mobile Logo */}
                <div className="absolute top-6 left-6 lg:hidden">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/images/logo.png"
                            alt="Logo"
                            width={32}
                            height={32}
                            className="rounded-lg"
                        />
                        <span className="font-bold text-lg">LLMPatients</span>
                    </Link>
                </div>

                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                    <footer
                        className="pt-2 text-center text-xs text-muted-foreground"
                        aria-label="Legal links"
                    >
                        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                            <Link
                                href="/privacy"
                                className="underline underline-offset-4 hover:text-foreground transition-colors"
                            >
                                Privacy Policy
                            </Link>
                            <span aria-hidden="true">•</span>
                            <Link
                                href="/terms"
                                className="underline underline-offset-4 hover:text-foreground transition-colors"
                            >
                                Terms and Conditions
                            </Link>
                            <span aria-hidden="true">•</span>
                            <Link
                                href="/cookies"
                                className="underline underline-offset-4 hover:text-foreground transition-colors"
                            >
                                Cookie Settings
                            </Link>
                        </nav>
                    </footer>
                </div>
            </div>
        </div>
    );
}
