
"use client";

import { Component } from "react";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { createLogger } from "~/lib/logger";

const logger = createLogger("ErrorBoundary");

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
  
  componentDidCatch(error: Error, errorInfo: any) {
    logger.error("React error boundary caught an error", { error: error.message, componentStack: errorInfo?.componentStack?.substring(0, 200) });
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
