/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree
 */

"use client";

import { Component } from "react";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="dashboard-empty-state">
            <h3 className="text-text-primary mb-2 text-lg font-medium">
              Qualcosa è andato storto
            </h3>
            <p className="text-text-secondary mb-4">
              Si è verificato un errore imprevisto. Riprova più tardi.
            </p>
            <Button
              onClick={() =>
                this.setState({ hasError: false, error: undefined })
              }
              variant="primary"
              size="default"
            >
              Riprova
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
