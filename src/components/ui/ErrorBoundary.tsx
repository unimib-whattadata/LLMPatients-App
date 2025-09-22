/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree
 */

"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="dashboard-empty-state">
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Qualcosa è andato storto
          </h3>
          <p className="text-text-secondary mb-4">
            Si è verificato un errore imprevisto. Riprova più tardi.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="btn btn-primary"
          >
            Riprova
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
