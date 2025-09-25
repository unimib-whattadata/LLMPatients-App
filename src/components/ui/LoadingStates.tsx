/**
 * Loading States Component
 * 
 * Provides common loading states for different page types and contexts
 */

import { LoadingSpinner } from "./LoadingSpinner";
import { LoadingCard } from "./LoadingCard";

interface PageLoadingProps {
  /**
   * Loading message
   */
  message?: string;
  
  /**
   * Whether to use full screen layout
   */
  fullScreen?: boolean;
}

/**
 * Standard page loading state
 */
export function PageLoading({ 
  message = "Loading page...", 
  fullScreen = true 
}: PageLoadingProps) {
  return (
    <LoadingSpinner 
      message={message}
      fullScreen={fullScreen}
      size="lg"
      variant="primary"
    />
  );
}

/**
 * Dashboard loading state
 */
export function DashboardLoading({ 
  message = "Loading dashboard..." 
}: PageLoadingProps) {
  return (
    <LoadingSpinner 
      message={message}
      fullScreen={true}
      size="lg"
      variant="primary"
    />
  );
}

/**
 * Patient grid loading state
 */
export function PatientGridLoading() {
  return <LoadingCard count={6} showAvatar={true} textLines={3} showButton={true} />;
}

/**
 * Patient detail loading state
 */
export function PatientDetailLoading({ 
  message = "Loading patient details..." 
}: PageLoadingProps) {
  return (
    <LoadingSpinner 
      message={message}
      fullScreen={true}
      size="lg"
      variant="primary"
    />
  );
}

/**
 * Session loading state
 */
export function SessionLoading({ 
  message = "Loading session timeline..." 
}: PageLoadingProps) {
  return (
    <LoadingSpinner 
      message={message}
      fullScreen={true}
      size="lg"
      variant="primary"
    />
  );
}

/**
 * Authentication loading state
 */
export function AuthLoading({ 
  message = "Loading..." 
}: PageLoadingProps) {
  return (
    <LoadingSpinner 
      message={message}
      fullScreen={true}
      size="lg"
      variant="primary"
    />
  );
}

/**
 * Admin content loading state
 */
export function AdminLoading({ 
  message = "Loading..." 
}: PageLoadingProps) {
  return (
    <LoadingSpinner 
      message={message}
      fullScreen={true}
      size="lg"
      variant="primary"
    />
  );
}
